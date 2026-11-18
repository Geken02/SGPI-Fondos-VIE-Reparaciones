"""
archivos.py
===========
Router FastAPI que recibe un archivo (típicamente el Form-04.docx), lo sube
a Supabase Storage, registra la entrada en PropuestaDocumentos y —si es un
Form-04— invoca al parser y persiste TODOS los datos en las tablas del
esquema SGPI.

Tablas que actualiza cuando el archivo es un Form-04 (.docx, tipo_documento_id=1):

  • Propuestas                          — título, fechas, modalidad, TRL, monto total
  • PropuestaContenido                  — resumen, abstract, problema, objetivos, estado del arte,
                                          metodología, hoja de ruta, estrategia divulgación
  • PropuestaDeclaraciones              — flags booleanos, tipoInnovacionId, acepta resguardo
  • ObjetivosEspecificos                — una fila por objetivo (1..N)
  • IntegrantesEquipoPropuesta          — investigadores TEC (lookup/creación de Usuario)
  • ColaboradoresExternos               — colaboradores externos
  • PresupuestoPropuesta                — una fila por año × rubro (operativo / duradero)
  • FinanciamientoExterno               — financiamiento adicional por año × tipo
  • AspectosEticos                      — flags + justificación exención + ente regulatorio
  • ProductosAcademicos                 — una fila por producto marcado (incluye activos PI)
  • Dictamenes                          — registro del dictamen VINC-XXX-YYYY (si hay PI)
  • FuentesBibliograficas + Autores     — referencias bibliográficas (deduplicación por DOI)
  • AutorFuente                         — relación autor ↔ fuente (orden de autoría)
  • PropuestaReferencia                 — relación propuesta ↔ fuente (orden de cita)

El router es idempotente: si se vuelve a cargar el mismo Form-04, los registros
existentes se eliminan y se recrean (transacción) — así no quedan duplicados.
"""

import hashlib
import re
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text

# --- BD y autenticación ---
from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario

# --- Modelos de documento ---
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento

# --- Modelo central de propuestas ---
from src.models.propuestas import Propuesta

from src.models.aspectos_eticos import EstadosAval

# --- Contenido y declaraciones (1:1 con Propuestas) ---
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones

# --- Catálogos ---
from src.models.catalogos import (
    Modalidades, TiposHora, TiposInnovacion, NivelesTrl
)
# --- Modelos relacionados ---
from src.models.propuesta_plan import ObjetivosEspecificos
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta, RolesEquipo
from src.models.propuesta_equipo import ColaboradoresExternos
from src.models.presupuesto import PresupuestoPropuesta
from src.models.presupuesto import FinanciamientoExterno, TiposFinanciamiento, EntidadesEmisoras, RubrosPropuesta
from src.models.aspectos_eticos import AspectosEticos, EntesRegulatorios
from src.models.productos_academicos import ProductosAcademicos, TiposProductosAcademicos
from src.models.dictamenes import Dictamenes
from src.models.bibliografia import (
    FuentesBibliograficas, Autores, AutorFuente, PropuestaReferencia,
)

# --- Parser del Form-04 ---
from src.services.form04_parser import parsear_form04_docx

# --- Cliente S3/Supabase ---
from src.utils.s3_client import s3_client, S3_BUCKET_NAME, obtener_url_documento


router = APIRouter(prefix="/api/propuestas", tags=["Archivos"])


# ============================================================================
# Helpers de lookup para catálogos y usuarios
# ============================================================================

def _lookup_modalidad(sesion: Session, nombre: str):
    """Busca Modalidades por nombre parcial (case-insensitive)."""
    if not nombre:
        return None
    return sesion.query(Modalidades).filter(
        Modalidades.nombreModalidad.ilike(f"%{nombre}%"),
        Modalidades.activo == True,
    ).first()


def _lookup_tipo_hora(sesion: Session, codigo: str):
    """Busca TiposHora por código exacto (VIE, REC, VIE-Centro, etc.)."""
    if not codigo:
        return None
    # Normalizar el código del .docx: "VIE-Centro" -> "VIE-Centro"
    codigo_norm = codigo.strip()
    return sesion.query(TiposHora).filter(
        (TiposHora.codigoTipo.ilike(codigo_norm)) |
        (TiposHora.codigoTipo.ilike(f"%{codigo_norm}%")),
        TiposHora.activo == True,
    ).first()


def _lookup_rol_equipo(sesion: Session, nombre: str):
    """Busca RolesEquipo por nombre parcial."""
    if not nombre:
        return None
    return sesion.query(RolesEquipo).filter(
        RolesEquipo.nombreRol.ilike(f"%{nombre}%"),
        RolesEquipo.activo == True,
    ).first()


def _lookup_tipo_innovacion(sesion: Session, nombre: str):
    """Busca TiposInnovacion por nombre parcial ('de Producto', 'de Proceso')."""
    if not nombre:
        return None
    return sesion.query(TiposInnovacion).filter(
        TiposInnovacion.nombreTipoInnovacion.ilike(f"%{nombre}%"),
        TiposInnovacion.activo == True,
    ).first()


def _lookup_tipo_financiamiento(sesion: Session, nombre: str):
    """Busca TiposFinanciamiento por nombre parcial."""
    if not nombre:
        return None
    return sesion.query(TiposFinanciamiento).filter(
        TiposFinanciamiento.nombreTipoFinanciamiento.ilike(f"%{nombre}%"),
        TiposFinanciamiento.activo == True,
    ).first()


def _lookup_ente_regulatorio(sesion: Session, codigo: str):
    """Busca EntesRegulatorios por código corto (CEC, CONAGEBIO, CICUA/COBAB, Otro)."""
    if not codigo:
        return None
    mapping = {
        "CEC": "Comité Ético Científico",
        "CONAGEBIO": "CONAGEBIO",
        "CICUA/COBAB": "CICUA",
        "Otro": "Otro",
    }
    nombre_buscar = mapping.get(codigo, codigo)
    return sesion.query(EntesRegulatorios).filter(
        EntesRegulatorios.nombreEnteRegulatorio.ilike(f"%{nombre_buscar}%"),
        EntesRegulatorios.activo == True,
    ).first()


def _lookup_estado_aval(sesion: Session, nombre: str = "Pendiente"):
    """Busca EstadosAval por nombre. Default: 'Pendiente'."""
    return sesion.query(EstadosAval).filter(
        EstadosAval.nombreEstadoAval.ilike(f"%{nombre}%"),
        EstadosAval.activo == True,
    ).first()


def _lookup_tipo_producto(sesion: Session, texto: str):
    """
    Busca TiposProductoAcademico a partir del texto de la opción marcada.
    Realiza una búsqueda heurística por palabras clave.
    """
    if not texto:
        return None
    t = texto.lower()
    # Mapeo heurístico de palabras clave -> nombre esperado en el catálogo.
    # Ajustar los nombres exactos a los que use el sistema en producción.
    if "patente" in t or "modelo de utilidad" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Patente%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "diseño industrial" in t or "dibujo" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Diseño%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "software" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Software%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "secreto" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Secreto%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "obtención vegetal" in t or "obtencion vegetal" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Vegetal%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "denominación de origen" in t or "indicación geográfica" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Denominación%Origen%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "circuito" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Circuito%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "artículo" in t or "articulo" in t:
        # Distinguir entre WoS/Scopus y SciELO/Redalyc/ESCI/DOAJ
        if "web of science" in t or "scopus" in t:
            return sesion.query(TiposProductosAcademicos).filter(
                TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Artículo%WoS%"),
                TiposProductosAcademicos.activo == True,
            ).first()
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Artículo%SciELO%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "libro" in t or "capítulo" in t or "capitulo" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Libro%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    if "norma" in t:
        return sesion.query(TiposProductosAcademicos).filter(
            TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Norma%"),
            TiposProductosAcademicos.activo == True,
        ).first()
    return None


def _lookup_rubro(sesion: Session, nombre: str):
    """Busca RubrosPropuesta por nombre parcial."""
    if not nombre:
        return None
    return sesion.query(RubrosPropuesta).filter(
        RubrosPropuesta.nombreRubro.ilike(f"%{nombre}%"),
        RubrosPropuesta.activo == True,
    ).first()


def _obtener_o_crear_usuario_por_orcid(
    sesion: Session, nombre_completo: str, orcid: str, instancia: str = ""
) -> Optional[Usuario]:
    """
    Busca un Usuario por ORCID o por nombre+apellidos.
    Si no existe y hay ORCID, crea un Usuario mínimo (sin contraseña, sin correo)
    para que sirva como FK.  El usuario administrador podrá completar los datos.
    """
    if not nombre_completo:
        return None

    # 1. Buscar por ORCID en IntegrantesEquipoPropuesta existentes
    if orcid:
        integrante_existente = sesion.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.orcid == orcid
        ).first()
        if integrante_existente:
            return sesion.query(Usuario).filter(
                Usuario.usuarioId == integrante_existente.usuarioId
            ).first()

    # 2. Buscar por nombre y apellidos
    partes = nombre_completo.split(maxsplit=1)
    nombre_pila = partes[0] if partes else nombre_completo
    apellidos = partes[1] if len(partes) > 1 else ""
    ap_tokens = apellidos.split()
    apellido1 = ap_tokens[0] if ap_tokens else ""
    apellido2 = " ".join(ap_tokens[1:]) if len(ap_tokens) > 1 else None

    usuario = sesion.query(Usuario).filter(
        Usuario.nombreUsuario.ilike(nombre_pila),
        Usuario.apellido1Usuario.ilike(apellido1) if apellido1 else True,
        Usuario.activo == True,
    ).first()
    if usuario:
        return usuario

    # 3. Crear usuario mínimo si tenemos ORCID (sin ORCID no podemos asegurar trazabilidad)
    if not orcid:
        return None

    correo_autogenerado = f"{orcid.replace('-', '')}@orcid-pendiente.tec.ac.cr"
    nuevo = Usuario(
        correoInstitucional=correo_autogenerado,
        nombreUsuario=nombre_pila,
        apellido1Usuario=apellido1,
        apellido2Usuario=apellido2,
        activo=True,
        fechaCreacion=datetime.now(timezone.utc),
    )
    sesion.add(nuevo)
    sesion.flush()  # Necesario para obtener usuarioId
    return nuevo


# ============================================================================
# Persistencia del Form-04 parseado
# ============================================================================

def _persistir_datos_form04(
    sesion: Session,
    propuesta_id: int,
    datos: dict,
    usuario_actual: Usuario,
) -> None:
    """
    Recibe el dict devuelto por parsear_form04_docx() y persiste TODOS los
    datos en las tablas del esquema SGPI.  Es idempotente: primero elimina los
    registros hijos existentes y luego los recrea.
    """
    ahora = datetime.now(timezone.utc)

    # ------------------------------------------------------------------
    # 0. LIMPIEZA — elimina registros hijos previos (idempotencia)
    # ------------------------------------------------------------------
    sesion.query(ObjetivosEspecificos).filter(
        ObjetivosEspecificos.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(PresupuestoPropuesta).filter(
        PresupuestoPropuesta.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(FinanciamientoExterno).filter(
        FinanciamientoExterno.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(AspectosEticos).filter(
        AspectosEticos.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(ProductosAcademicos).filter(
        ProductosAcademicos.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(PropuestaReferencia).filter(
        PropuestaReferencia.propuestaId == propuesta_id
    ).delete(synchronize_session=False)
    sesion.query(Dictamenes).filter(
        Dictamenes.propuestaId == propuesta_id
    ).delete(synchronize_session=False)

    # ------------------------------------------------------------------
    # 1. PROPUESTAS — actualizar campos básicos
    # ------------------------------------------------------------------
    propuesta = sesion.query(Propuesta).filter(
        Propuesta.propuestaId == propuesta_id
    ).first()
    if not propuesta:
        raise HTTPException(
            status_code=404,
            detail=f"No existe la propuesta {propuesta_id}",
        )

    if datos.get("titulo"):
        propuesta.titulo = datos["titulo"]

    # Fechas — el .docx trae solo el año ("2027", "2029")
    if datos.get("fecha_inicio"):
        try:
            propuesta.fechaInicio = date(int(datos["fecha_inicio"]), 1, 1)
        except (ValueError, TypeError):
            pass
    if datos.get("fecha_fin"):
        try:
            propuesta.fechaFinalizacion = date(int(datos["fecha_fin"]), 12, 31)
        except (ValueError, TypeError):
            pass

    # Modalidad
    mod_obj = _lookup_modalidad(sesion, datos.get("modalidad", ""))
    if mod_obj:
        propuesta.modalidadId = mod_obj.modalidadId

    # TRL esperado
    trl = datos.get("seccion1", {}).get("trl")
    if trl:
        propuesta.nivelTrlEsperado = trl

    # Monto total
    if datos.get("monto_total_proyecto"):
        propuesta.montoTotal = datos["monto_total_proyecto"]

    propuesta.ultimaAuditoria = ahora
    propuesta.usuarioAuditoriaId = usuario_actual.usuarioId

    # ------------------------------------------------------------------
    # 2. PROPUESTA_CONTENIDO — textos largos (1:1 con Propuestas)
    # ------------------------------------------------------------------
    contenido_db = sesion.query(PropuestaContenido).filter(
        PropuestaContenido.propuestaId == propuesta_id
    ).first()
    if not contenido_db:
        contenido_db = PropuestaContenido(propuestaId=propuesta_id)
        sesion.add(contenido_db)

    if datos.get("resumen"):
        contenido_db.resumen = datos["resumen"]
    if datos.get("palabras_clave"):
        contenido_db.palabrasClave = datos["palabras_clave"]
    if datos.get("abstract"):
        contenido_db.abstract = datos["abstract"]
    if datos.get("problema_investigacion"):
        contenido_db.problemaInvestigacion = datos["problema_investigacion"]
    if datos.get("objetivo_general"):
        contenido_db.objetivoGeneral = datos["objetivo_general"]
    if datos.get("objetivos_especificos"):
        # Guardar los objetivos como texto separado por '; ' en esta tabla 1:1
        # (además se crean filas individuales en ObjetivosEspecificos abajo)
        objetivos_str = ";\n".join(
    f"{o['numero']}. {o['descripcion']}"
    for o in datos["objetivos_especificos"]
    )
    contenido_db.objetivosEspecificos = objetivos_str

    if datos.get("estado_arte"):
        contenido_db.estadoArte = datos["estado_arte"]
    if datos.get("metodologia"):
        contenido_db.metodologia = datos["metodologia"]
    # Estrategia de divulgación — concatenar las 4 subsecciones
    div = datos.get("divulgacion", {})
    partes_div = []
    if div.get("cientifica"):
        partes_div.append(f"a. Divulgación científica/técnica:\n{div['cientifica']}")
    if div.get("canales_institucionales"):
        partes_div.append(f"b. Canales Institucionales:\n{div['canales_institucionales']}")
    if div.get("socializacion"):
        partes_div.append(f"c. Eventos de Socialización:\n{div['socializacion']}")
    if div.get("medios_masivos"):
        partes_div.append(f"d. Medios Masivos:\n{div['medios_masivos']}")
    if partes_div:
        contenido_db.estrategiaDivulgacion = "\n\n".join(partes_div)
    if datos.get("hoja_ruta"):
        contenido_db.hojaRuta = datos["hoja_ruta"]
    contenido_db.ultimaAuditoria = ahora
    contenido_db.usuarioAuditoriaId = usuario_actual.usuarioId

    # ------------------------------------------------------------------
    # 3. PROPUESTA_DECLARACIONES — flags booleanos (1:1 con Propuestas)
    # ------------------------------------------------------------------
    decl_db = sesion.query(PropuestaDeclaraciones).filter(
        PropuestaDeclaraciones.propuestaId == propuesta_id
    ).first()
    if not decl_db:
        decl_db = PropuestaDeclaraciones(propuestaId=propuesta_id)
        sesion.add(decl_db)

    s1 = datos.get("seccion1", {})
    decl_db.tieneFinanciamientoPrevio = bool(s1.get("otras_fuentes", {}).get("aplica"))
    decl_db.tieneContinuidadProyecto = bool(s1.get("vinculacion_tecnica", {}).get("aplica"))
    decl_db.requiereInstrumentoJuridico = bool(s1.get("instrumento_juridico", {}).get("aplica"))
    decl_db.tieneBasePosgrado = s1.get("base_posgrado", {}).get("aplica", "No") != "No"
    decl_db.tieneInformacionConfidencial = bool(s1.get("info_confidencial", {}).get("aplica"))
    decl_db.tienePotencialPI = bool(s1.get("potencial_pi", {}).get("aplica"))
    decl_db.poseeInnovacion = bool(s1.get("posee_innovacion", {}).get("aplica"))

    # Tipo de innovación
    if s1.get("posee_innovacion", {}).get("tipo"):
        ti_obj = _lookup_tipo_innovacion(sesion, s1["posee_innovacion"]["tipo"])
        if ti_obj:
            decl_db.tipoInnovacionId = ti_obj.tipoInnovacionId

    decl_db.aceptaResguardoRepositorio = bool(datos.get("resguardo", {}).get("resguardo_compromiso"))
    decl_db.aceptaDeclaracionJurada = bool(datos.get("firma", {}).get("firmado_digital"))

    # Fecha de firma (extraída del texto de la firma digital)
    fecha_firma_str = datos.get("firma", {}).get("fecha_firma", "")
    if fecha_firma_str:
        try:
            # Formato esperado: "21/09/2026 09:47:22"
            decl_db.fechaFirmaDeclaracion = datetime.strptime(
                fecha_firma_str.split()[0], "%d/%m/%Y"
            )
        except (ValueError, IndexError):
            pass

    decl_db.ultimaAuditoria = ahora
    decl_db.usuarioAuditoriaId = usuario_actual.usuarioId

    # ------------------------------------------------------------------
    # 4. OBJETIVOS_ESPECIFICOS — una fila por objetivo
    # ------------------------------------------------------------------
    for oe in datos.get("objetivos_especificos", []):
        nuevo_oe = ObjetivosEspecificos(
            propuestaId=propuesta_id,
            numeroObjetivo=oe["numero"],
            descripcion=oe["descripcion"],
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        )
        sesion.add(nuevo_oe)
    sesion.flush()  # Para obtener los IDs generados

    # ------------------------------------------------------------------
    # 5. INTEGRANTES_EQUIPO_PROPUESTA — investigadores TEC
    # ------------------------------------------------------------------
    for inv in datos.get("investigadores_tec", []):
        usuario = _obtener_o_crear_usuario_por_orcid(
            sesion, inv["nombre"], inv.get("orcid", ""), inv.get("instancia", "")
        )
        if not usuario:
            # Sin usuario identificable, no podemos insertar (FK obligatoria)
            print(f"⚠️  No se pudo identificar/crear usuario para: {inv['nombre']}")
            continue

        rol_equipo = _lookup_rol_equipo(sesion, inv.get("rol", ""))

        # El .docx permite múltiples tipos de hora por investigador
        # (ej. "4 VIE-Centro / 4 REC").  Creamos una fila por tipo de hora.
        for th in inv.get("horas", []):
            tipo_hora = _lookup_tipo_hora(sesion, th["tipo_hora"])
            if not tipo_hora:
                print(f"⚠️  Tipo de hora no encontrado: {th['tipo_hora']}")
                continue
            nuevo_integrante = IntegrantesEquipoPropuesta(
                propuestaId=propuesta_id,
                usuarioId=usuario.usuarioId,
                tipoHoraId=tipo_hora.tipoHoraId,
                horasSemanales=th["horas"],
                rolEquipoId=rol_equipo.rolEquipoId if rol_equipo else None,
                orcid=inv.get("orcid", ""),
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            )
            sesion.add(nuevo_integrante)

    # ------------------------------------------------------------------
    # 6. COLABORADORES_EXTERNOS — una fila por colaborador
    # ------------------------------------------------------------------
    for col in datos.get("colaboradores_externos", []):
        nuevo_col = ColaboradoresExternos(
            propuestaId=propuesta_id,
            nombreColaborador=col.get("nombre", ""),
            apellido1Colaborador=col.get("apellido1") or None,
            apellido2Colaborador=col.get("apellido2") or None,
            idOrcid=col.get("orcid") or None,
            institucionEmpresa=col.get("institucion", ""),
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        )
        sesion.add(nuevo_col)

    # ------------------------------------------------------------------
    # 7. PRESUPUESTO_PROPUESTA — una fila por año × rubro
    # ------------------------------------------------------------------
    rubro_operativo = _lookup_rubro(sesion, "operativo") or _lookup_rubro(sesion, "Presupuesto operativo")
    rubro_duradero = _lookup_rubro(sesion, "bienes duraderos") or _lookup_rubro(sesion, "duradero")

    for p in datos.get("presupuesto_anual", []):
        anio = p["ano"]
        if p.get("operativo", 0) > 0 and rubro_operativo:
            sesion.add(PresupuestoPropuesta(
                propuestaId=propuesta_id,
                rubroId=rubro_operativo.rubroId,
                montoSolicitado=p["operativo"],
                anioEjecucion=anio,
                esDuradero=False,
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))
        if p.get("duradero", 0) > 0 and rubro_duradero:
            sesion.add(PresupuestoPropuesta(
                propuestaId=propuesta_id,
                rubroId=rubro_duradero.rubroId,
                montoSolicitado=p["duradero"],
                anioEjecucion=anio,
                esDuradero=True,
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))

    # ------------------------------------------------------------------
    # 8. FINANCIAMIENTO_EXTERNO — financiamiento adicional
    # ------------------------------------------------------------------
    fa = datos.get("financiamiento_adicional", {})
    # Mapear las 3 categorías del .docx a TiposFinanciamiento
    categorias = [
        ("externo", fa.get("externo", {})),
        ("contrapartida", fa.get("contrapartida", {})),
        ("cofinanciamiento", fa.get("cofinanciamiento", {})),
    ]
    for cat_nombre, entry in categorias:
        if not entry:
            continue
        tipo_fin = _lookup_tipo_financiamiento(sesion, cat_nombre)
        if not tipo_fin:
            print(f"⚠️  Tipo de financiamiento no encontrado: {cat_nombre}")
            continue
        for idx, anio_label in enumerate(["ano1", "ano2", "ano3"], start=1):
            monto = entry.get(anio_label, 0.0)
            if monto <= 0:
                continue
            # Calcular el año real de ejecución (Año 1 = 2027 si la propuesta inicia en 2027)
            anio_ejec = None
            if propuesta.fechaInicio:
                anio_ejec = propuesta.fechaInicio.year + idx - 1
            else:
                anio_ejec = 2027 + idx - 1  # fallback
            sesion.add(FinanciamientoExterno(
                propuestaId=propuesta_id,
                tipoFinanciamientoId=tipo_fin.tipoFinanciamientoId,
                anio=anio_ejec,
                monto=monto,
                numeroOficio=entry.get("oficio") or None,
                entidadEmisoraId=None,  # No se especifica en el .docx
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))

    # ------------------------------------------------------------------
    # 9. ASPECTOS_ETICOS — flags + justificación + ente regulatorio
    # ------------------------------------------------------------------
    ae = datos.get("aspectos_eticos", {})
    ente_obj = _lookup_ente_regulatorio(sesion, ae.get("ente_regulatorio", ""))
    estado_aval_obj = _lookup_estado_aval(sesion, "Pendiente")

    nuevo_ae = AspectosEticos(
        propuestaId=propuesta_id,
        involucraSeresHumanos=bool(ae.get("seres_humanos")),
        involucraBiodiversidad=bool(ae.get("biodiversidad")),
        involucraAnimales=bool(ae.get("animales")),
        involucraTerritoriosIndigenas=bool(ae.get("comunidades_indigenas")),
        justificacionExencion=ae.get("justificacion_exencion") or None,
        enteRegulatorioId=ente_obj.enteRegulatorioId if ente_obj else None,
        estadoAvalId=estado_aval_obj.estadoAvalId if estado_aval_obj else None,
        creadoEn=ahora,
        usuarioAuditoriaId=usuario_actual.usuarioId,
        ultimaAuditoria=ahora,
    )
    sesion.add(nuevo_ae)

    # ------------------------------------------------------------------
    # 10. PRODUCTOS_ACADEMICOS — productos marcados en Cuadros 7, 9 y 10
    # ------------------------------------------------------------------
    # Recuperar los ObjetivosEspecificos recién creados para asociarlos.
    objs_db = sesion.query(ObjetivosEspecificos).filter(
        ObjetivosEspecificos.propuestaId == propuesta_id
    ).all()

    def _resolver_objetivo_id(texto_oe: str) -> Optional[int]:
        """Convierte 'OE4 y OE7' o 'OE1, OE2' en lista de IDs de objetivos."""
        if not texto_oe:
            return None
        nums = []
        for m in re.finditer(r"OE\s*(\d+)", texto_oe, re.IGNORECASE):
            nums.append(int(m.group(1)))
        # Retornar el primer match como FK (la relación N:M real se puede
        # modelar con tabla intermedia, pero el schema usa una sola FK).
        if not nums:
            return None
        for oe_db in objs_db:
            if oe_db.numeroObjetivo == nums[0]:
                return oe_db.objetivoEspecificoId
        return None

    comp = datos.get("compromisos", {})

    # 10a. Productos básica (Cuadro 7)
    for prod in comp.get("productos_basica", []):
        tipo_prod = _lookup_tipo_producto(sesion, prod["opcion"])
        if not tipo_prod:
            print(f"⚠️  Tipo de producto no encontrado: {prod['opcion'][:60]}")
            continue
        sesion.add(ProductosAcademicos(
            propuestaId=propuesta_id,
            tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId,
            objetivoEspecificoId=_resolver_objetivo_id(prod.get("objetivo", "")),
            descripcion=prod["opcion"][:300],
            cantidadComprometida=prod.get("cantidad", 1),
            esPropiedadIndustrial=False,
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        ))

    # 10b. Activos de propiedad industrial (Cuadro 9) — son PI
    for activo in comp.get("activos_propiedad_industrial", []):
        tipo_prod = _lookup_tipo_producto(sesion, activo["tipo_activo"])
        if not tipo_prod:
            print(f"⚠️  Tipo de activo PI no encontrado: {activo['tipo_activo']}")
            continue
        sesion.add(ProductosAcademicos(
            propuestaId=propuesta_id,
            tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId,
            objetivoEspecificoId=_resolver_objetivo_id(activo.get("consecutivo", "")),
            descripcion=activo["tipo_activo"][:300],
            cantidadComprometida=1,
            esPropiedadIndustrial=True,
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        ))

    # 10c. Productos desarrollo tecnológico (Cuadro 10)
    for prod in comp.get("productos_desarrollo", []):
        tipo_prod = _lookup_tipo_producto(sesion, prod["opcion"])
        if not tipo_prod:
            print(f"⚠️  Tipo de producto no encontrado: {prod['opcion'][:60]}")
            continue
        sesion.add(ProductosAcademicos(
            propuestaId=propuesta_id,
            tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId,
            objetivoEspecificoId=_resolver_objetivo_id(prod.get("objetivo", "")),
            descripcion=prod["opcion"][:300],
            cantidadComprometida=prod.get("cantidad", 1),
            esPropiedadIndustrial=False,
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        ))

    # ------------------------------------------------------------------
    # 11. DICTAMENES — si hay potencial PI con oficio VINC-XXX-YYYY
    # ------------------------------------------------------------------
    oficio_dict = s1.get("potencial_pi", {}).get("oficio_dictamen", "")
    if oficio_dict:
        sesion.add(Dictamenes(
            propuestaId=propuesta_id,
            numeroOficio=oficio_dict,
            fechaEmision=ahora,
            contenido=f"Dictamen del Centro de Vinculación: {oficio_dict}. "
                      f"Generado automáticamente desde el Form-04.",
            usuarioRemitenteId=usuario_actual.usuarioId,
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        ))

    # ------------------------------------------------------------------
    # 12. REFERENCIAS BIBLIOGRÁFICAS — Fuentes + Autores + AutorFuente + PropuestaReferencia
    # ------------------------------------------------------------------
    for ref in datos.get("referencias", []):
        # 12a. FuentesBibliograficas — deduplicar por DOI
        fuente = None
        if ref.get("doi"):
            fuente = sesion.query(FuentesBibliograficas).filter(
                FuentesBibliograficas.doi == ref["doi"]
            ).first()
        if not fuente:
            fuente = FuentesBibliograficas(
                doi=ref.get("doi") or None,
                titulo=ref["titulo"][:500],
                anioPublicacion=ref.get("anio") or 0,
                revistaFuente=ref.get("revista_fuente")[:200] or None if ref.get("revista_fuente") else None,
                esIndexadaWoSScopus=bool(ref.get("es_indexada_wos_scopus")),
                creadoEn=ahora,
            )
            sesion.add(fuente)
            sesion.flush()

        # 12b. Autores — deduplicar por ORCID (no hay ORCID en las refs, se usa nombre)
        for orden, nombre_autor in enumerate(ref.get("autores", []), start=1):
            autor = sesion.query(Autores).filter(
                Autores.nombreCompleto.ilike(nombre_autor)
            ).first()
            if not autor:
                autor = Autores(
                    nombreCompleto=nombre_autor[:150],
                    creadoEn=ahora,
                )
                sesion.add(autor)
                sesion.flush()
            # 12c. AutorFuente
            existe_af = sesion.query(AutorFuente).filter(
                AutorFuente.autorId == autor.autorId,
                AutorFuente.fuenteId == fuente.fuenteId,
            ).first()
            if not existe_af:
                sesion.add(AutorFuente(
                    autorId=autor.autorId,
                    fuenteId=fuente.fuenteId,
                    ordenAutoria=orden,
                    creadoEn=ahora,
                ))

        # 12d. PropuestaReferencia — relación propuesta-fuente
        existe_pr = sesion.query(PropuestaReferencia).filter(
            PropuestaReferencia.propuestaId == propuesta_id,
            PropuestaReferencia.fuenteId == fuente.fuenteId,
        ).first()
        if not existe_pr:
            sesion.add(PropuestaReferencia(
                propuestaId=propuesta_id,
                fuenteId=fuente.fuenteId,
                ordenReferencia=ref.get("numero", 0),
                creadoEn=ahora,
            ))


# ============================================================================
# Endpoint principal
# ============================================================================

@router.post("/{propuesta_id}/archivos")
async def guardar_archivo_propuesta(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    tipo_documento_id: int = Form(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db),
):
    """
    Recibe un archivo, lo sube a Supabase Storage y actualiza PropuestaDocumentos.
    S3 sobrescribe automáticamente si la ruta es la misma, evitando duplicados.

    Si el archivo es un Form-04 (.docx con tipo_documento_id=1), se parsea
    automáticamente y TODOS los datos se persisten en las tablas del esquema SGPI.
    """
    # 1. Validar que el tipo de documento existe y está activo
    tipo_doc = sesion.query(TiposDocumento).filter(
        TiposDocumento.tipoDocumentoId == tipo_documento_id,
        TiposDocumento.activo == True,
    ).first()
    if not tipo_doc:
        raise HTTPException(
            status_code=400,
            detail="El tipo de documento especificado no es válido o está inactivo.",
        )

    # 2. Leer el contenido del archivo en memoria
    contenido = await archivo.read()
    tamanio_bytes = len(contenido)

    # 3. Calcular checksum (SHA-256)
    checksum = hashlib.sha256(contenido).hexdigest()

    # 4. Verificar si ya existe un documento activo del mismo tipo
    documento_existente = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.tipoDocumentoId == tipo_documento_id,
        PropuestaDocumentos.activo == True,
    ).first()

    # Si existe y el checksum es idéntico, no hacemos nada
    if documento_existente and documento_existente.checksum == checksum:
        return {
            "mensaje": "El archivo es idéntico al ya registrado. No se realizaron cambios.",
            "documentoId": documento_existente.documentoId,
            "nombre": documento_existente.nombreArchivo,
            "ruta": documento_existente.rutaArchivo,
            "urlDescarga": obtener_url_documento(documento_existente.rutaArchivo),
            "tamanioBytes": documento_existente.tamanioBytes,
            "checksum": checksum,
            "reemplazado": False,
        }

    # 5. Definir ruta en Supabase Storage (S3 sobrescribe si ya existe)
    ruta_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"

    # 6. Subir a S3
    print(f"📤 Subiendo archivo a S3: {ruta_s3}")
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=ruta_s3,
            Body=contenido,
            ContentType=archivo.content_type or "application/octet-stream",
        )
        print(f"✅ Archivo subido a S3 exitosamente.")
    except Exception as e:
        print(f"❌ ERROR al subir a S3: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fallo al subir a Supabase Storage: {str(e)}",
        )

    # 7. Actualizar o crear el registro en PropuestaDocumentos
    if documento_existente:
        print(f"🔄 Actualizando documento existente en BD (ID: {documento_existente.documentoId})")
        documento_existente.rutaArchivo = ruta_s3
        documento_existente.nombreArchivo = archivo.filename
        documento_existente.tamanioBytes = tamanio_bytes
        documento_existente.checksum = checksum
        documento_existente.usuarioCargaId = usuario_actual.usuarioId
        documento_existente.fechaCarga = datetime.now(timezone.utc)
        documento_existente.usuarioAuditoriaId = usuario_actual.usuarioId
        documento_existente.ultimaAuditoria = datetime.now(timezone.utc)
        documento_a_retornar = documento_existente
    else:
        print(f"🆕 Creando nuevo registro de documento en BD")
        documento_a_retornar = PropuestaDocumentos(
            propuestaId=propuesta_id,
            tipoDocumentoId=tipo_documento_id,
            rutaArchivo=ruta_s3,
            nombreArchivo=archivo.filename,
            tamanioBytes=tamanio_bytes,
            checksum=checksum,
            usuarioCargaId=usuario_actual.usuarioId,
            activo=True,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=datetime.now(timezone.utc),
        )
        sesion.add(documento_a_retornar)

    # 8. Si es Form-04 (.docx), parsear y persistir en TODAS las tablas
    parseo_ok = False
    parseo_errores = []
    if tipo_documento_id == 1 and archivo.filename.lower().endswith(".docx"):
        try:
            print(f"🔍 Detectado Form-04 (.docx). Iniciando parseo...")
            datos = parsear_form04_docx(contenido)

            # Persistir dentro de una transacción atómica
            try:
                _persistir_datos_form04(sesion, propuesta_id, datos, usuario_actual)
                sesion.commit()
                parseo_ok = True
                print("✅ Form-04 parseado y persistido en todas las tablas.")
            except HTTPException:
                sesion.rollback()
                raise
            except Exception as e:
                sesion.rollback()
                parseo_errores.append(str(e))
                print(f"❌ Error al persistir: {e}")
                # El documento ya se subió a S3, pero la persistencia falló.
                # Hacemos commit solo del PropuestaDocumentos para no perder el registro.

        except Exception as e:
            parseo_errores.append(f"Error de parseo: {str(e)}")
            print(f"⚠️  ADVERTENCIA: No se pudo parsear el Form-04. Error: {e}")

    # 9. Confirmar cambios pendientes (si no se hizo commit en el bloque Form-04)
    if not parseo_ok:
        sesion.commit()
    sesion.refresh(documento_a_retornar)

    mensaje_base = "Archivo guardado exitosamente en Supabase y registrado en la base de datos"
    if documento_existente:
        mensaje_base += " (Se actualizó el registro existente)."
    if parseo_ok:
        mensaje_base += (
            " (Datos del Form-04 extraídos y persistidos en TODAS las tablas: "
            "Propuestas, PropuestaContenido, PropuestaDeclaraciones, "
            "ObjetivosEspecificos, IntegrantesEquipoPropuesta, "
            "ColaboradoresExternos, PresupuestoPropuesta, FinanciamientoExterno, "
            "AspectosEticos, ProductosAcademicos, Dictamenes, "
            "FuentesBibliograficas, Autores, AutorFuente, PropuestaReferencia)."
        )
    if parseo_errores:
        mensaje_base += f" Errores de parseo: {parseo_errores}"

    return {
        "mensaje": mensaje_base,
        "documentoId": documento_a_retornar.documentoId,
        "nombre": documento_a_retornar.nombreArchivo,
        "ruta": documento_a_retornar.rutaArchivo,
        "urlDescarga": obtener_url_documento(documento_a_retornar.rutaArchivo),
        "tamanioBytes": documento_a_retornar.tamanioBytes,
        "checksum": documento_a_retornar.checksum,
        "reemplazado": documento_existente is not None,
        "form04_parseado": parseo_ok,
        "form04_errores": parseo_errores,
    }
