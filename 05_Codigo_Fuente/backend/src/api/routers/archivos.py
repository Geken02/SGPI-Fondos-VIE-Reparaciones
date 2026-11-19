"""
archivos.py
===========
Router FastAPI con lógica UPSERT UNIVERSAL para los tres formularios:
  - Form-04 (.docx)  → propuesta, contenido, declaraciones, equipo, presupuesto,
                       aspectos éticos, productos académicos, referencias, etc.
  - Form-05 (.xlsx)  → actividades, riesgos, medidas de mitigación,
                       participantes (con lookup de iniciales → usuarioId).
  - Form-06 (.xlsx)  → presupuesto detallado por rubro y año.

No usa DELETEs masivos. Busca el registro por su clave natural:
- Si existe: actualiza los campos.
- Si no existe: lo crea.
Esto garantiza idempotencia total sin violar restricciones UNIQUE.

CORRECCIONES FORM-05:
  - Construye un cache {iniciales → usuarioId} desde equipo_map del parser.
  - Lookup en IntegrantesEquipoPropuesta → Usuarios → ColaboradoresExternos.
  - Usa participantes_lista (estructurada con regex) en lugar del string crudo.
  - Devuelve advertencias para iniciales no resueltas (ej. "GAS").
  - Fix typo: objetivoEspecifico → objetivoEspecificoId.
"""
import hashlib
import re
import unicodedata
import os
from datetime import datetime, timezone, date
from typing import Optional, Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

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
from src.models.catalogos import Modalidades, TiposHora, TiposInnovacion, NivelesTrl

# --- Modelos relacionados ---
from src.models.propuesta_plan import ObjetivosEspecificos
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta, RolesEquipo, ColaboradoresExternos
from src.models.presupuesto import PresupuestoPropuesta, FinanciamientoExterno, TiposFinanciamiento, RubrosPropuesta
from src.models.aspectos_eticos import AspectosEticos, EntesRegulatorios
from src.models.productos_academicos import ProductosAcademicos, TiposProductosAcademicos
from src.models.dictamenes import Dictamenes
from src.models.bibliografia import FuentesBibliograficas, Autores, AutorFuente, PropuestaReferencia

# --- Parser del Form-04 ---
from src.services.form04_parser import parsear_form04_docx

# --- Cliente S3/Supabase ---
from src.utils.s3_client import s3_client, S3_BUCKET_NAME, obtener_url_documento

router = APIRouter(prefix="/api/propuestas", tags=["Archivos"])


def _sanitizar_nombre_archivo(nombre: str) -> str:
    """Convierte un nombre de archivo en uno seguro para S3/Supabase Storage."""
    if not nombre:
        return "archivo"
    texto_normalizado = unicodedata.normalize("NFKD", nombre)
    texto_sin_acentos = "".join(
        c for c in texto_normalizado if not unicodedata.category(c).startswith("M")
    )
    texto_seguro = re.sub(r"[\s\-]+", "_", texto_sin_acentos)
    texto_seguro = re.sub(r"[^a-zA-Z0-9._\-]", "", texto_seguro)
    texto_seguro = re.sub(r"_+", "_", texto_seguro).strip("._-")
    if not texto_seguro:
        texto_seguro = "archivo"
    if len(texto_seguro) > 200:
        _, ext = os.path.splitext(nombre)
        texto_seguro = texto_seguro[:200 - len(ext)] + ext
    return texto_seguro


# ============================================================================
# Helpers de lookup
# ============================================================================

def _lookup_modalidad(sesion: Session, nombre: str):
    if not nombre: return None
    return sesion.query(Modalidades).filter(Modalidades.nombreModalidad.ilike(f"%{nombre}%"), Modalidades.activo == True).first()

def _lookup_tipo_hora(sesion: Session, codigo: str):
    if not codigo: return None
    return sesion.query(TiposHora).filter((TiposHora.codigoTipo.ilike(codigo.strip())) | (TiposHora.codigoTipo.ilike(f"%{codigo.strip()}%")), TiposHora.activo == True).first()

def _lookup_rol_equipo(sesion: Session, nombre: str):
    if not nombre: return None
    return sesion.query(RolesEquipo).filter(RolesEquipo.nombreRol.ilike(f"%{nombre}%"), RolesEquipo.activo == True).first()

def _lookup_tipo_innovacion(sesion: Session, nombre: str):
    if not nombre: return None
    return sesion.query(TiposInnovacion).filter(TiposInnovacion.nombreTipoInnovacion.ilike(f"%{nombre}%"), TiposInnovacion.activo == True).first()

def _lookup_tipo_financiamiento(sesion: Session, nombre: str):
    if not nombre: return None
    return sesion.query(TiposFinanciamiento).filter(TiposFinanciamiento.nombreTipoFinanciamiento.ilike(f"%{nombre}%"), TiposFinanciamiento.activo == True).first()

def _lookup_ente_regulatorio(sesion: Session, codigo: str):
    if not codigo: return None
    mapping = {"CEC": "Comité Ético Científico", "CONAGEBIO": "CONAGEBIO", "CICUA/COBAB": "CICUA", "Otro": "Otro"}
    return sesion.query(EntesRegulatorios).filter(EntesRegulatorios.nombreEnteRegulatorio.ilike(f"%{mapping.get(codigo, codigo)}%"), EntesRegulatorios.activo == True).first()

def _lookup_estado_aval(sesion: Session, nombre: str = "Pendiente"):
    return sesion.query(EstadosAval).filter(EstadosAval.nombreEstadoAval.ilike(f"%{nombre}%"), EstadosAval.activo == True).first()

def _lookup_tipo_producto(sesion: Session, texto: str):
    if not texto: return None
    t = texto.lower()
    if "patente" in t or "modelo de utilidad" in t:
        return sesion.query(TiposProductosAcademicos).filter(TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Patente%"), TiposProductosAcademicos.activo == True).first()
    if "software" in t:
        return sesion.query(TiposProductosAcademicos).filter(TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Software%"), TiposProductosAcademicos.activo == True).first()
    if "artículo" in t or "articulo" in t:
        filtro = "%Artículo%WoS%" if ("web of science" in t or "scopus" in t) else "%Artículo%SciELO%"
        return sesion.query(TiposProductosAcademicos).filter(TiposProductosAcademicos.nombreTipoProductoAcademico.ilike(filtro), TiposProductosAcademicos.activo == True).first()
    if "libro" in t or "capítulo" in t or "capitulo" in t:
        return sesion.query(TiposProductosAcademicos).filter(TiposProductosAcademicos.nombreTipoProductoAcademico.ilike("%Libro%"), TiposProductosAcademicos.activo == True).first()
    return None

def _lookup_rubro(sesion: Session, nombre: str):
    if not nombre: return None
    return sesion.query(RubrosPropuesta).filter(RubrosPropuesta.nombreRubro.ilike(f"%{nombre}%"), RubrosPropuesta.activo == True).first()

def _obtener_o_crear_usuario_por_orcid(sesion: Session, nombre_completo: str, orcid: str, instancia: str = "") -> Optional[Usuario]:
    if not nombre_completo: return None
    if orcid:
        integrante = sesion.query(IntegrantesEquipoPropuesta).filter(IntegrantesEquipoPropuesta.orcid == orcid).first()
        if integrante:
            return sesion.query(Usuario).filter(Usuario.usuarioId == integrante.usuarioId).first()
    partes = nombre_completo.split(maxsplit=1)
    nombre_pila = partes[0] if partes else nombre_completo
    apellidos = partes[1] if len(partes) > 1 else ""
    ap_tokens = apellidos.split()
    apellido1 = ap_tokens[0] if ap_tokens else ""
    apellido2 = " ".join(ap_tokens[1:]) if len(ap_tokens) > 1 else None
    usuario = sesion.query(Usuario).filter(Usuario.nombreUsuario.ilike(nombre_pila), Usuario.apellido1Usuario.ilike(apellido1) if apellido1 else True, Usuario.activo == True).first()
    if usuario: return usuario
    if not orcid: return None
    nuevo = Usuario(correoInstitucional=f"{orcid.replace('-', '')}@orcid-pendiente.tec.ac.cr", nombreUsuario=nombre_pila, apellido1Usuario=apellido1, apellido2Usuario=apellido2, activo=True, fechaCreacion=datetime.now(timezone.utc))
    sesion.add(nuevo)
    sesion.flush()
    return nuevo


# ============================================================================
# HELPERS PARA FORM-05: Comparar NOMBRES (no iniciales) con regex
# ============================================================================
# Estrategia simple:
#   1. Extraer de la BD: nombre, apellido1, apellido2 (de Usuarios y
#      ColaboradoresExternos).
#   2. Convertir esos 3 campos en una HILERA de texto normalizada:
#        "Mario" + "Chacón" + "Rivas" → "mario chacon rivas"
#   3. El parser ya nos da equipo_map = {"MChR": "Mario Chacón Rivas", ...}
#      desde la tabla de equipo del Excel.
#   4. Para cada {iniciales → nombre_excel} del equipo_map, buscar en la BD
#      un usuario cuyo nombre (ya convertido a hilera) coincida con el
#      nombre del Excel usando regex flexible.
#   5. El cache final es {iniciales → usuarioId} — lookup directo, sin regex
#      en cada actividad.
# ============================================================================

def _nombre_a_hilera(
    nombre: str,
    apellido1: str = "",
    apellido2: str = "",
) -> str:
    """
    Convierte los campos de la BD en una HILERA de texto normalizada:
      - Concatena nombre + apellido1 + apellido2
      - Quita acentos (Chacón → Chacon)
      - Convierte a minúsculas
      - Colapsa espacios múltiples

    Ejemplo:
      nombre="Mario", apellido1="Chacón", apellido2="Rivas"
      → "mario chacon rivas"
    """
    partes: List[str] = []
    if nombre:
        partes.extend([p for p in str(nombre).split() if p])
    if apellido1:
        partes.extend([p for p in str(apellido1).split() if p])
    if apellido2:
        partes.extend([p for p in str(apellido2).split() if p])
    hilera = " ".join(partes)
    # Quitar acentos
    norm = unicodedata.normalize("NFKD", hilera.lower())
    sin_acentos = "".join(c for c in norm if not unicodedata.category(c).startswith("M"))
    return " ".join(sin_acentos.split())


def _nombres_coinciden_regex(nombre_a: str, nombre_b: str) -> bool:
    """
    Compara dos hileras de nombres normalizadas usando regex.

    Devuelve True si:
      1. Son exactamente iguales, o
      2. Una es substring de la otra (ej: "mario chacon" está dentro de
         "mario chacon rivas"), o
      3. Los tokens de A aparecen EN ORDEN dentro de B (con caracteres
         opcionales entre ellos), o viceversa.
         Ej: "mario rivas" → regex "mario.*rivas" → matchea "mario chacon rivas"

    Esto permite que el nombre del Excel coincida con el de la BD aunque
    falten apellidos intermedios o haya pequeñas diferencias.
    """
    if not nombre_a or not nombre_b:
        return False
    if nombre_a == nombre_b:
        return True
    # Substring directo
    if nombre_a in nombre_b or nombre_b in nombre_a:
        return True
    # Regex: tokens de A en orden dentro de B
    tokens_a = [t for t in nombre_a.split() if t]
    if tokens_a:
        patron = ".*".join(re.escape(t) for t in tokens_a)
        if re.match(f"^{patron}$", nombre_b):
            return True
    # Regex inverso: tokens de B en orden dentro de A
    tokens_b = [t for t in nombre_b.split() if t]
    if tokens_b:
        patron = ".*".join(re.escape(t) for t in tokens_b)
        if re.match(f"^{patron}$", nombre_a):
            return True
    return False


def _construir_cache_iniciales(
    sesion: Session,
    propuesta_id: int,
    equipo_map: Dict[str, str],
) -> Dict[str, Dict[str, Any]]:
    """
    Construye el cache {iniciales → info_usuario} comparando NOMBRES.

    Flujo:
      1. Extrae de la BD todos los Usuarios y ColaboradoresExternos, y para
         cada uno convierte (nombre + apellido1 + apellido2) en una hilera.
      2. Para cada par {iniciales → nombre_excel} del equipo_map del parser,
         busca en la BD un usuario/collaborator cuyo nombre coincida con
         nombre_excel usando regex.
      3. El cache final mapea las INICIALES del Excel directamente al
         usuarioId encontrado.

    Devuelve:
        {
          "MChR": {"usuarioId": 4, "nombre": "Mario Chacón Rivas", "origen": "Usuarios"},
          "YL":   {"usuarioId": 5, "nombre": "Yuen Law",            "origen": "Usuarios"},
          "NPR":  {"usuarioId": None, "colaboradorId": 7,           "origen": "ColaboradoresExternos"},
          "PCD":  {"usuarioId": None, "origen": "NoEncontrado"},
          ...
        }
    """
    cache: Dict[str, Dict[str, Any]] = {}

    # 1. Cargar usuarios de la BD y convertir cada uno en una hilera
    usuarios_db: List[Dict[str, Any]] = []
    for u in sesion.query(Usuario).filter(Usuario.activo == True).all():
        nombre_full = f"{u.nombreUsuario or ''} {u.apellido1Usuario or ''} {u.apellido2Usuario or ''}".strip()
        usuarios_db.append({
            "usuarioId": u.usuarioId,
            "nombre_original": nombre_full,
            "hilera": _nombre_a_hilera(u.nombreUsuario, u.apellido1Usuario, u.apellido2Usuario),
        })

    # 2. Cargar colaboradores externos de la propuesta
    colaboradores_db: List[Dict[str, Any]] = []
    for c in sesion.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id
    ).all():
        nombre_full = f"{c.nombreColaborador or ''} {c.apellido1Colaborador or ''} {c.apellido2Colaborador or ''}".strip()
        colaboradores_db.append({
            "colaboradorId": c.colaboradorId,
            "nombre_original": nombre_full,
            "hilera": _nombre_a_hilera(c.nombreColaborador, c.apellido1Colaborador, c.apellido2Colaborador),
        })

    # 3. Para cada {iniciales → nombre_excel} del equipo_map, buscar coincidencia por NOMBRE
    for iniciales, nombre_excel in equipo_map.items():
        hilera_excel = _nombre_a_hilera(nombre_excel)

        # 3a. Buscar en Usuarios
        usuario_match = None
        for u in usuarios_db:
            if _nombres_coinciden_regex(hilera_excel, u["hilera"]):
                usuario_match = u
                break

        if usuario_match:
            cache[iniciales] = {
                "usuarioId": usuario_match["usuarioId"],
                "nombre": usuario_match["nombre_original"],
                "origen": "Usuarios",
            }
            continue

        # 3b. Buscar en ColaboradoresExternos
        col_match = None
        for c in colaboradores_db:
            if _nombres_coinciden_regex(hilera_excel, c["hilera"]):
                col_match = c
                break

        if col_match:
            cache[iniciales] = {
                "usuarioId": None,
                "colaboradorId": col_match["colaboradorId"],
                "nombre": col_match["nombre_original"],
                "origen": "ColaboradoresExternos",
            }
            continue

        # 3c. No encontrado en ninguna tabla
        cache[iniciales] = {
            "usuarioId": None,
            "nombre": nombre_excel,
            "origen": "NoEncontrado",
        }

    return cache


def _resolver_iniciales_con_regex(
    iniciales: str,
    cache: Dict[str, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Lookup directo en el cache por las iniciales del Excel.

    El cache ya fue construido comparando NOMBRES con regex en
    _construir_cache_iniciales, así que aquí solo hacemos un lookup exacto
    por las iniciales.  Esta función se mantiene como punto único de
    acceso para que, si en el futuro se quiere añadir lógica adicional
    (fallback por nombre, etc.), basta cambiarla aquí.
    """
    if not iniciales or not cache:
        return None
    return cache.get(iniciales.upper().strip())


# ============================================================================
# PERSISTENCIA UNIVERSAL CON UPSERT (Sin DELETEs masivos)
# ============================================================================

def _persistir_datos_form04(sesion: Session, propuesta_id: int, datos: dict, usuario_actual: Usuario) -> None:
    ahora = datetime.now(timezone.utc)

    # 1. PROPUESTA (Update directo)
    propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail=f"No existe la propuesta {propuesta_id}")

    if datos.get("titulo"): propuesta.titulo = datos["titulo"]
    if datos.get("fecha_inicio"):
        try: propuesta.fechaInicio = date(int(datos["fecha_inicio"]), 1, 1)
        except (ValueError, TypeError): pass
    if datos.get("fecha_fin"):
        try: propuesta.fechaFinalizacion = date(int(datos["fecha_fin"]), 12, 31)
        except (ValueError, TypeError): pass

    mod_obj = _lookup_modalidad(sesion, datos.get("modalidad", ""))
    if mod_obj: propuesta.modalidadId = mod_obj.modalidadId

    trl = datos.get("seccion1", {}).get("trl")
    if trl: propuesta.nivelTrlEsperado = int(trl)
    if datos.get("monto_total_proyecto"): propuesta.montoTotal = datos["monto_total_proyecto"]

    propuesta.ultimaAuditoria = ahora
    propuesta.usuarioAuditoriaId = usuario_actual.usuarioId

    # 2. PROPUESTA_CONTENIDO (UPSERT 1:1)
    contenido_db = sesion.query(PropuestaContenido).filter(PropuestaContenido.propuestaId == propuesta_id).first()
    if not contenido_db:
        contenido_db = PropuestaContenido(propuestaId=propuesta_id)
        sesion.add(contenido_db)

    for campo_parser, campo_modelo in [("resumen", "resumen"), ("palabras_clave", "palabrasClave"), ("abstract", "abstract"), ("problema_investigacion", "problemaInvestigacion"), ("objetivo_general", "objetivoGeneral"), ("estado_arte", "estadoArte"), ("metodologia", "metodologia"), ("hoja_ruta", "hojaRuta")]:
        if datos.get(campo_parser) and hasattr(contenido_db, campo_modelo):
            setattr(contenido_db, campo_modelo, datos[campo_parser])

    if datos.get("objetivos_especificos"):
        contenido_db.objetivosEspecificos = ";\n".join(f"{o['numero']}. {o['descripcion']}" for o in datos["objetivos_especificos"])

    div = datos.get("divulgacion", {})
    partes_div = [f"{k}: {v}" for k, v in div.items() if v]
    if partes_div and hasattr(contenido_db, "estrategiaDivulgacion"):
        contenido_db.estrategiaDivulgacion = "\n\n".join(partes_div)

    contenido_db.ultimaAuditoria = ahora
    contenido_db.usuarioAuditoriaId = usuario_actual.usuarioId

    # 3. PROPUESTA_DECLARACIONES (UPSERT 1:1)
    decl_db = sesion.query(PropuestaDeclaraciones).filter(PropuestaDeclaraciones.propuestaId == propuesta_id).first()
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

    if s1.get("posee_innovacion", {}).get("tipo"):
        ti_obj = _lookup_tipo_innovacion(sesion, s1["posee_innovacion"]["tipo"])
        if ti_obj: decl_db.tipoInnovacionId = ti_obj.tipoInnovacionId

    decl_db.aceptaResguardoRepositorio = bool(datos.get("resguardo", {}).get("resguardo_compromiso"))
    decl_db.aceptaDeclaracionJurada = bool(datos.get("firma", {}).get("firmado_digital"))
    decl_db.ultimaAuditoria = ahora
    decl_db.usuarioAuditoriaId = usuario_actual.usuarioId

    # 4. OBJETIVOS_ESPECIFICOS
    for oe in datos.get("objetivos_especificos", []):
        obj_db = sesion.query(ObjetivosEspecificos).filter(
            ObjetivosEspecificos.propuestaId == propuesta_id,
            ObjetivosEspecificos.numeroObjetivo == oe["numero"]
        ).first()
        if obj_db:
            obj_db.descripcion = oe["descripcion"]
            obj_db.usuarioAuditoriaId = usuario_actual.usuarioId
            obj_db.ultimaAuditoria = ahora
        else:
            sesion.add(ObjetivosEspecificos(
                propuestaId=propuesta_id, numeroObjetivo=oe["numero"], descripcion=oe["descripcion"],
                creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora
            ))
    sesion.flush()

    # 5. INTEGRANTES_EQUIPO_PROPUESTA
    for inv in datos.get("investigadores_tec", []):
        usuario = _obtener_o_crear_usuario_por_orcid(sesion, inv["nombre"], inv.get("orcid", ""), inv.get("instancia", ""))
        if not usuario: continue
        rol_equipo = _lookup_rol_equipo(sesion, inv.get("rol", ""))
        total_horas = 0.0
        tipo_hora_principal_id = None
        for th in inv.get("horas", []):
            tipo_hora = _lookup_tipo_hora(sesion, th["tipo_hora"])
            if tipo_hora:
                total_horas += float(th["horas"])
                if tipo_hora_principal_id is None:
                    tipo_hora_principal_id = tipo_hora.tipoHoraId
        if not tipo_hora_principal_id: continue
        integrante = sesion.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
            IntegrantesEquipoPropuesta.usuarioId == usuario.usuarioId
        ).first()
        if integrante:
            integrante.tipoHoraId = tipo_hora_principal_id
            integrante.horasSemanales = total_horas
            integrante.rolEquipoId = rol_equipo.rolEquipoId if rol_equipo else integrante.rolEquipoId
            integrante.orcid = inv.get("orcid", "") or integrante.orcid
            integrante.usuarioAuditoriaId = usuario_actual.usuarioId
            integrante.ultimaAuditoria = ahora
        else:
            sesion.add(IntegrantesEquipoPropuesta(
                propuestaId=propuesta_id, usuarioId=usuario.usuarioId, tipoHoraId=tipo_hora_principal_id,
                horasSemanales=total_horas, rolEquipoId=rol_equipo.rolEquipoId if rol_equipo else None,
                orcid=inv.get("orcid", ""), creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora
            ))

    # 6. COLABORADORES_EXTERNOS
    for col in datos.get("colaboradores_externos", []):
        query_col = sesion.query(ColaboradoresExternos).filter(ColaboradoresExternos.propuestaId == propuesta_id)
        if col.get("orcid"):
            col_db = query_col.filter(ColaboradoresExternos.idOrcid == col["orcid"]).first()
        else:
            col_db = query_col.filter(ColaboradoresExternos.nombreColaborador == col.get("nombre", "")).first()
        if col_db:
            col_db.nombreColaborador = col.get("nombre", "")
            col_db.apellido1Colaborador = col.get("apellido1") or col_db.apellido1Colaborador
            col_db.apellido2Colaborador = col.get("apellido2") or col_db.apellido2Colaborador
            col_db.idOrcid = col.get("orcid") or col_db.idOrcid
            col_db.institucionEmpresa = col.get("institucion", "") or col_db.institucionEmpresa
            col_db.usuarioAuditoriaId = usuario_actual.usuarioId
            col_db.ultimaAuditoria = ahora
        else:
            sesion.add(ColaboradoresExternos(
                propuestaId=propuesta_id, nombreColaborador=col.get("nombre", ""), apellido1Colaborador=col.get("apellido1"),
                apellido2Colaborador=col.get("apellido2"), idOrcid=col.get("orcid"), institucionEmpresa=col.get("institucion", ""),
                creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora
            ))

    # 7. PRESUPUESTO_PROPUESTA
    rubro_operativo = _lookup_rubro(sesion, "operativo") or _lookup_rubro(sesion, "Presupuesto operativo")
    rubro_duradero = _lookup_rubro(sesion, "bienes duraderos") or _lookup_rubro(sesion, "duradero")
    for p in datos.get("presupuesto_anual", []):
        anio = p["ano"]
        if p.get("operativo", 0) > 0 and rubro_operativo:
            pres_db = sesion.query(PresupuestoPropuesta).filter(PresupuestoPropuesta.propuestaId == propuesta_id, PresupuestoPropuesta.rubroId == rubro_operativo.rubroId, PresupuestoPropuesta.anioEjecucion == anio).first()
            if pres_db:
                pres_db.montoSolicitado = p["operativo"]
                pres_db.usuarioAuditoriaId = usuario_actual.usuarioId
                pres_db.ultimaAuditoria = ahora
            else:
                sesion.add(PresupuestoPropuesta(propuestaId=propuesta_id, rubroId=rubro_operativo.rubroId, montoSolicitado=p["operativo"], anioEjecucion=anio, esDuradero=False, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))
        if p.get("duradero", 0) > 0 and rubro_duradero:
            pres_db = sesion.query(PresupuestoPropuesta).filter(PresupuestoPropuesta.propuestaId == propuesta_id, PresupuestoPropuesta.rubroId == rubro_duradero.rubroId, PresupuestoPropuesta.anioEjecucion == anio).first()
            if pres_db:
                pres_db.montoSolicitado = p["duradero"]
                pres_db.usuarioAuditoriaId = usuario_actual.usuarioId
                pres_db.ultimaAuditoria = ahora
            else:
                sesion.add(PresupuestoPropuesta(propuestaId=propuesta_id, rubroId=rubro_duradero.rubroId, montoSolicitado=p["duradero"], anioEjecucion=anio, esDuradero=True, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 8. FINANCIAMIENTO_EXTERNO
    fa = datos.get("financiamiento_adicional", {})
    for cat_nombre, entry in [("externo", fa.get("externo", {})), ("contrapartida", fa.get("contrapartida", {})), ("cofinanciamiento", fa.get("cofinanciamiento", {}))]:
        if not entry: continue
        tipo_fin = _lookup_tipo_financiamiento(sesion, cat_nombre)
        if not tipo_fin: continue
        for idx, anio_label in enumerate(["ano1", "ano2", "ano3"], start=1):
            monto = entry.get(anio_label, 0.0)
            if monto <= 0: continue
            anio_ejec = (propuesta.fechaInicio.year + idx - 1) if propuesta.fechaInicio else (2027 + idx - 1)
            fin_db = sesion.query(FinanciamientoExterno).filter(FinanciamientoExterno.propuestaId == propuesta_id, FinanciamientoExterno.tipoFinanciamientoId == tipo_fin.tipoFinanciamientoId, FinanciamientoExterno.anio == anio_ejec).first()
            if fin_db:
                fin_db.monto = monto
                fin_db.numeroOficio = entry.get("oficio") or fin_db.numeroOficio
                fin_db.usuarioAuditoriaId = usuario_actual.usuarioId
                fin_db.ultimaAuditoria = ahora
            else:
                sesion.add(FinanciamientoExterno(propuestaId=propuesta_id, tipoFinanciamientoId=tipo_fin.tipoFinanciamientoId, anio=anio_ejec, monto=monto, numeroOficio=entry.get("oficio"), creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 9. ASPECTOS_ETICOS
    ae = datos.get("aspectos_eticos", {})
    ae_db = sesion.query(AspectosEticos).filter(AspectosEticos.propuestaId == propuesta_id).first()
    if not ae_db:
        ae_db = AspectosEticos(propuestaId=propuesta_id)
        sesion.add(ae_db)
    ae_db.involucraSeresHumanos = bool(ae.get("seres_humanos"))
    ae_db.involucraBiodiversidad = bool(ae.get("biodiversidad"))
    ae_db.involucraAnimales = bool(ae.get("animales"))
    ae_db.involucraTerritoriosIndigenas = bool(ae.get("comunidades_indigenas"))
    ae_db.justificacionExencion = ae.get("justificacion_exencion") or None
    ente_obj = _lookup_ente_regulatorio(sesion, ae.get("ente_regulatorio", ""))
    ae_db.enteRegulatorioId = ente_obj.enteRegulatorioId if ente_obj else None
    estado_aval_obj = _lookup_estado_aval(sesion, "Pendiente")
    ae_db.estadoAvalId = estado_aval_obj.estadoAvalId if estado_aval_obj else None
    ae_db.usuarioAuditoriaId = usuario_actual.usuarioId
    ae_db.ultimaAuditoria = ahora

    # 10. PRODUCTOS_ACADEMICOS
    objs_db = sesion.query(ObjetivosEspecificos).filter(ObjetivosEspecificos.propuestaId == propuesta_id).all()
    def _resolver_objetivo_id(texto_oe: str) -> Optional[int]:
        if not texto_oe: return None
        nums = [int(m.group(1)) for m in re.finditer(r"OE\s*(\d+)", texto_oe, re.IGNORECASE)]
        if not nums: return None
        for oe_db in objs_db:
            if oe_db.numeroObjetivo == nums[0]: return oe_db.objetivoEspecificoId
        return None

    comp = datos.get("compromisos", {})
    productos_a_procesar = []
    for prod in comp.get("productos_basica", []) + comp.get("productos_desarrollo", []):
        productos_a_procesar.append((prod["opcion"], prod.get("objetivo", ""), prod.get("cantidad", 1), False))
    for activo in comp.get("activos_propiedad_industrial", []):
        productos_a_procesar.append((activo["tipo_activo"], activo.get("consecutivo", ""), 1, True))

    for opcion, obj_txt, cantidad, es_pi in productos_a_procesar:
        tipo_prod = _lookup_tipo_producto(sesion, opcion)
        if not tipo_prod: continue
        obj_id = _resolver_objetivo_id(obj_txt)
        prod_db = sesion.query(ProductosAcademicos).filter(
            ProductosAcademicos.propuestaId == propuesta_id,
            ProductosAcademicos.tipoProductoAcademicoId == tipo_prod.tipoProductoAcademicoId,
            ProductosAcademicos.descripcion.ilike(f"%{opcion[:50]}%")
        ).first()
        if prod_db:
            prod_db.cantidadComprometida = cantidad
            prod_db.esPropiedadIndustrial = es_pi
            prod_db.objetivoEspecificoId = obj_id or prod_db.objetivoEspecificoId
            prod_db.usuarioAuditoriaId = usuario_actual.usuarioId
            prod_db.ultimaAuditoria = ahora
        else:
            sesion.add(ProductosAcademicos(
                propuestaId=propuesta_id, tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId,
                objetivoEspecificoId=obj_id, descripcion=opcion[:300], cantidadComprometida=cantidad,
                esPropiedadIndustrial=es_pi, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora
            ))

    # 11. DICTAMENES
    oficio_dict = s1.get("potencial_pi", {}).get("oficio_dictamen", "")
    if oficio_dict:
        dict_db = sesion.query(Dictamenes).filter(Dictamenes.propuestaId == propuesta_id, Dictamenes.numeroOficio == oficio_dict).first()
        if dict_db:
            dict_db.contenido = f"Dictamen del Centro de Vinculación: {oficio_dict}. Generado automáticamente desde el Form-04."
            dict_db.usuarioAuditoriaId = usuario_actual.usuarioId
            dict_db.ultimaAuditoria = ahora
        else:
            sesion.add(Dictamenes(
                propuestaId=propuesta_id, numeroOficio=oficio_dict, fechaEmision=ahora,
                contenido=f"Dictamen del Centro de Vinculación: {oficio_dict}. Generado automáticamente desde el Form-04.",
                usuarioRemitenteId=usuario_actual.usuarioId, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora
            ))

    # 12. REFERENCIAS BIBLIOGRÁFICAS
    for ref in datos.get("referencias", []):
        doi = ref.get("doi")
        doi = doi.strip() if isinstance(doi, str) else doi
        if not doi:
            doi = None
        titulo = (ref.get("titulo") or "")[:500]
        anio = ref.get("anio") or 0
        fuente = None
        if doi:
            fuente = sesion.query(FuentesBibliograficas).filter(FuentesBibliograficas.doi == doi).first()
        if not fuente and titulo:
            fuente = sesion.query(FuentesBibliograficas).filter(
                FuentesBibliograficas.titulo.ilike(f"%{titulo[:100]}%"),
                FuentesBibliograficas.anioPublicacion == anio
            ).first()
        if fuente:
            if doi and not fuente.doi:
                fuente.doi = doi
            if titulo and not fuente.titulo:
                fuente.titulo = titulo
            if anio and not fuente.anioPublicacion:
                fuente.anioPublicacion = anio
            revista = (ref.get("revista_fuente") or "")[:200] or None
            if revista and not fuente.revistaFuente:
                fuente.revistaFuente = revista
            fuente.esIndexadaWoSScopus = bool(ref.get("es_indexada_wos_scopus")) or fuente.esIndexadaWoSScopus
        else:
            fuente = FuentesBibliograficas(
                doi=doi, titulo=titulo, anioPublicacion=anio,
                revistaFuente=(ref.get("revista_fuente") or "")[:200] or None,
                esIndexadaWoSScopus=bool(ref.get("es_indexada_wos_scopus")),
                creadoEn=ahora
            )
            sesion.add(fuente)
            sesion.flush()
        for orden, nombre_autor in enumerate(ref.get("autores", []), start=1):
            if not nombre_autor: continue
            autor = sesion.query(Autores).filter(Autores.nombreCompleto.ilike(nombre_autor)).first()
            if not autor:
                autor = Autores(nombreCompleto=nombre_autor[:150], creadoEn=ahora)
                sesion.add(autor)
                sesion.flush()
            existe_af = sesion.query(AutorFuente).filter(
                AutorFuente.autorId == autor.autorId,
                AutorFuente.fuenteId == fuente.fuenteId
            ).first()
            if not existe_af:
                sesion.add(AutorFuente(
                    autorId=autor.autorId, fuenteId=fuente.fuenteId,
                    ordenAutoria=orden, creadoEn=ahora
                ))
        existe_pr = sesion.query(PropuestaReferencia).filter(
            PropuestaReferencia.propuestaId == propuesta_id,
            PropuestaReferencia.fuenteId == fuente.fuenteId
        ).first()
        if not existe_pr:
            sesion.add(PropuestaReferencia(
                propuestaId=propuesta_id, fuenteId=fuente.fuenteId,
                ordenReferencia=ref.get("numero", 0), creadoEn=ahora
            ))


# ============================================================================
# PERSISTENCIA FORM-05: Plan de Acción y Riesgos (UPSERT)
# ============================================================================

def _persistir_datos_form05(
    sesion: Session,
    propuesta_id: int,
    datos: dict,
    usuario_actual: Usuario,
) -> List[Dict[str, Any]]:
    """
    Persiste el Form-05 con lógica UPSERT. Vincula actividades a objetivos
    existentes.  Usa el cache de iniciales → usuarioId construido desde
    equipo_map (devuelto por el parser) para resolver participantes y
    responsables a IDs reales de Usuario.

    Devuelve una lista de advertencias sobre iniciales no resueltas
    (ej. "GAS" no aparece en la tabla de equipo del Excel).
    """
    from src.models.propuesta_plan import (
        Actividades, Riesgos, MedidasMitigacion,
        ParticipantesActividad, TiposResponsabilidad,
    )

    ahora = datetime.now(timezone.utc)
    advertencias: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # 1. CONSTRUIR CACHE: {iniciales_excel → usuarioId} comparando NOMBRES
    # ------------------------------------------------------------------
    equipo_map = datos.get("equipo_map", {})
    print(f"👥 Construyendo cache comparando NOMBRES del Excel vs BD...")
    print(f"   Equipo en Excel: {len(equipo_map)} personas")
    cache_iniciales = _construir_cache_iniciales(sesion, propuesta_id, equipo_map)

    # Reportar en logs el resultado del matching por nombre
    for ini, info in cache_iniciales.items():
        uid = info.get("usuarioId")
        nombre_bd = info.get("nombre", "")
        origen = info.get("origen", "NoEncontrado")
        if uid:
            print(f"   ✓ {ini:6s} → usuarioId={uid}  "
                  f"(Excel='{equipo_map.get(ini, '')}' ↔ BD='{nombre_bd}')")
        elif info.get("colaboradorId"):
            print(f"   ⚠️ {ini:6s} → SIN usuarioId, colaboradorId={info['colaboradorId']}  "
                  f"(Excel='{equipo_map.get(ini, '')}' ↔ BD='{nombre_bd}')")
            advertencias.append({
                "tipo": "participante_sin_usuario",
                "iniciales": ini,
                "nombre": equipo_map.get(ini, ""),
                "origen": origen,
                "mensaje": (
                    f"No se encontró un Usuario en la BD para '{equipo_map.get(ini, '')}'. "
                    f"Sí se encontró como ColaboradorExterno (id={info['colaboradorId']})."
                ),
            })
        else:
            print(f"   ⚠️ {ini:6s} → NO ENCONTRADO en BD  "
                  f"(Excel='{equipo_map.get(ini, '')}')")
            advertencias.append({
                "tipo": "participante_sin_usuario",
                "iniciales": ini,
                "nombre": equipo_map.get(ini, ""),
                "origen": origen,
                "mensaje": (
                    f"No se encontró usuario en la BD para '{equipo_map.get(ini, '')}' "
                    f"(iniciales '{ini}')."
                ),
            })

    # Reportar también las iniciales completamente desconocidas (como GAS)
    for ini in datos.get("iniciales_desconocidas", []):
        advertencias.append({
            "tipo": "inicial_desconocida",
            "iniciales": ini,
            "mensaje": (
                f"Las iniciales '{ini}' aparecen en el Excel pero no están "
                "en la tabla de equipo. Verifique si es un miembro nuevo."
            ),
        })

    # ------------------------------------------------------------------
    # 2. Cargar objetivos y propuesta
    # ------------------------------------------------------------------
    objs_db = sesion.query(ObjetivosEspecificos).filter(
        ObjetivosEspecificos.propuestaId == propuesta_id
    ).all()

    def _resolver_objetivo_id(texto_objetivo: str) -> Optional[int]:
        if not texto_objetivo:
            return objs_db[0].objetivoEspecificoId if objs_db else None
        m = re.search(r"(?:OE|Objetivo)\s*(\d+)", texto_objetivo, re.IGNORECASE)
        if m:
            num = int(m.group(1))
            for o in objs_db:
                if o.numeroObjetivo == num:
                    return o.objetivoEspecificoId
        texto_l = texto_objetivo.lower()[:50]
        for o in objs_db:
            if texto_l and texto_l in (o.descripcion or "").lower():
                return o.objetivoEspecificoId
        # FIX: antes era objs_db[0].objetivoEspecifico (attribute no existe)
        return objs_db[0].objetivoEspecificoId if objs_db else None

    propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    anio_base = propuesta.fechaInicio.year if propuesta and propuesta.fechaInicio else 2027

    # Pre-cargar TiposResponsabilidad
    tipo_resp_investigador = sesion.query(TiposResponsabilidad).filter(
        TiposResponsabilidad.nombreTipoResponsabilidad.ilike("%investigador%")
    ).first()
    tipo_resp_default = tipo_resp_investigador or sesion.query(TiposResponsabilidad).first()

    # Mapping del campo "responsabilidad" del Excel → TipoResponsabilidad específico
    def _resolver_tipo_responsabilidad(valor_excel: str):
        if not valor_excel or not tipo_resp_default:
            return tipo_resp_default
        v = valor_excel.lower().strip()
        for keyword in ["ejecuta", "supervisa", "participa"]:
            if keyword in v:
                tr = sesion.query(TiposResponsabilidad).filter(
                    TiposResponsabilidad.nombreTipoResponsabilidad.ilike(f"%{keyword}%"),
                ).first()
                if tr:
                    return tr
        return tipo_resp_default

    # ------------------------------------------------------------------
    # 3. UPSERT Actividades, Riesgos, Medidas y Participantes
    # ------------------------------------------------------------------
    # Iteramos con enumerate para tener índices confiables
    for act_idx, act in enumerate(datos.get("actividades", [])):
        if not act.get("descripcion"):
            continue

        obj_id = _resolver_objetivo_id(act.get("objetivo", ""))
        if not obj_id:
            continue

        anio_ejec = anio_base + (act.get("anio_ejecucion", 1) - 1)

        # UPSERT Actividad
        actividad_db = sesion.query(Actividades).filter(
            Actividades.propuestaId == propuesta_id,
            Actividades.objetivoEspecificoId == obj_id,
            Actividades.descripcionActividad.ilike(f"%{act['descripcion'][:80]}%")
        ).first()

        if actividad_db:
            actividad_db.resultadoEsperado = act.get("resultado_esperado", "") or actividad_db.resultadoEsperado
            actividad_db.mesInicio = act.get("mes_inicio") or actividad_db.mesInicio
            actividad_db.duracionMeses = act.get("duracion_meses") or actividad_db.duracionMeses
            actividad_db.anioEjecucion = anio_ejec
            actividad_db.usuarioAuditoriaId = usuario_actual.usuarioId
            actividad_db.ultimaAuditoria = ahora
        else:
            actividad_db = Actividades(
                propuestaId=propuesta_id,
                objetivoEspecificoId=obj_id,
                descripcionActividad=act["descripcion"],
                resultadoEsperado=act.get("resultado_esperado", "") or "N/A",
                mesInicio=act.get("mes_inicio") or 1,
                duracionMeses=act.get("duracion_meses") or 1,
                anioEjecucion=anio_ejec,
                esGira="gira" in act["descripcion"].lower(),
                esPasantia="pasantía" in act["descripcion"].lower() or "pasantia" in act["descripcion"].lower(),
                requiereInformeAvance=False,
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            )
            sesion.add(actividad_db)
            sesion.flush()

        # Tipo de responsabilidad para esta actividad
        tipo_resp_act = _resolver_tipo_responsabilidad(act.get("responsabilidad", ""))

        # ------------------------------------------------------------------
        # UPSERT Participantes (USANDO participantes_lista + cache_iniciales)
        # ------------------------------------------------------------------
        # El parser nuevo devuelve participantes_lista como:
        #   [{"iniciales": "MChR", "nombre": "Mario Chacón Rivas"}, ...]
        # En lugar del string crudo "MChR, YL" que se usaba antes.
        participantes_lista = act.get("participantes_lista", [])
        if not participantes_lista and act.get("participantes"):
            # Back-compat: si el parser viejo devolvió solo el string, intentar
            # parsearlo con regex básico (MChR, A1, etc.)
            raw = act.get("participantes", "")
            for token in [t.strip() for t in raw.split(",") if t.strip()]:
                participantes_lista.append({"iniciales": token.upper(), "nombre": ""})

        if participantes_lista and tipo_resp_act:
            for p in participantes_lista:
                ini = p.get("iniciales", "").upper()
                if not ini:
                    continue
                # Lookup directo en el cache (que ya se construyó comparando
                # NOMBRES con regex arriba, en _construir_cache_iniciales).
                info = _resolver_iniciales_con_regex(ini, cache_iniciales)
                usuario_id = info["usuarioId"] if info else None

                if not usuario_id:
                    # Ya reportado arriba al construir el cache; aquí solo saltamos.
                    continue

                existe = sesion.query(ParticipantesActividad).filter(
                    ParticipantesActividad.actividadId == actividad_db.actividadId,
                    ParticipantesActividad.usuarioId == usuario_id,
                    ParticipantesActividad.tipoResponsabilidadId == tipo_resp_act.tipoResponsabilidadId,
                ).first()

                if not existe:
                    sesion.add(ParticipantesActividad(
                        actividadId=actividad_db.actividadId,
                        usuarioId=usuario_id,
                        tipoResponsabilidadId=tipo_resp_act.tipoResponsabilidadId,
                        creadoEn=ahora,
                        usuarioAuditoriaId=usuario_actual.usuarioId,
                        ultimaAuditoria=ahora,
                    ))

        # ------------------------------------------------------------------
        # UPSERT Riesgos asociados a esta actividad
        # ------------------------------------------------------------------
        # FIX: usar enumerate() en lugar de datos["actividades"].index(act)
        for rg_idx, rg in enumerate(datos.get("riesgos", [])):
            if rg.get("actividad_index") != act_idx:
                continue

            riesgo_db = sesion.query(Riesgos).filter(
                Riesgos.actividadId == actividad_db.actividadId,
                Riesgos.descripcionRiesgo.ilike(f"%{rg['descripcion'][:80]}%")
            ).first()

            if not riesgo_db:
                riesgo_db = Riesgos(
                    actividadId=actividad_db.actividadId,
                    descripcionRiesgo=rg["descripcion"],
                    probabilidad=rg.get("probabilidad"),
                    impacto=rg.get("impacto"),
                    creadoEn=ahora,
                    usuarioAuditoriaId=usuario_actual.usuarioId,
                    ultimaAuditoria=ahora,
                )
                sesion.add(riesgo_db)
                sesion.flush()

            # UPSERT Medidas de mitigación asociadas a este riesgo
            # FIX: usar enumerate() en lugar de datos["riesgos"].index(rg)
            for med_idx, med in enumerate(datos.get("medidas_mitigacion", [])):
                if med.get("riesgo_index") != rg_idx:
                    continue

                medida_db = sesion.query(MedidasMitigacion).filter(
                    MedidasMitigacion.riesgoId == riesgo_db.riesgoId,
                    MedidasMitigacion.descripcionMedida.ilike(f"%{med['descripcion'][:80]}%")
                ).first()

                # Resolver responsable usando el cache de iniciales
                # El parser nuevo devuelve responsable_lista:
                #   [{"iniciales": "MChR", "nombre": "Mario Chacón Rivas"}, ...]
                responsable_lista = med.get("responsable_lista", [])
                if not responsable_lista and med.get("responsable"):
                    raw = med.get("responsable", "")
                    for token in [t.strip() for t in raw.split(",") if t.strip()]:
                        responsable_lista.append({"iniciales": token.upper(), "nombre": ""})

                # Tomar el primer responsable con usuarioId conocido
                # (resolver las iniciales con regex contra el cache)
                usuario_resp_id = None
                for r in responsable_lista:
                    ini = r.get("iniciales", "").upper()
                    if not ini:
                        continue
                    info = _resolver_iniciales_con_regex(ini, cache_iniciales)
                    if info and info.get("usuarioId"):
                        usuario_resp_id = info["usuarioId"]
                        break
                # Fallback al usuario actual si no se pudo resolver
                if not usuario_resp_id:
                    usuario_resp_id = usuario_actual.usuarioId

                if medida_db:
                    medida_db.esPermisoEtico = med.get("es_permiso_etico", False)
                    medida_db.usuarioResponsableId = usuario_resp_id
                    medida_db.usuarioAuditoriaId = usuario_actual.usuarioId
                    medida_db.ultimaAuditoria = ahora
                else:
                    sesion.add(MedidasMitigacion(
                        riesgoId=riesgo_db.riesgoId,
                        descripcionMedida=med["descripcion"],
                        usuarioResponsableId=usuario_resp_id,
                        esPermisoEtico=med.get("es_permiso_etico", False),
                        creadoEn=ahora,
                        usuarioAuditoriaId=usuario_actual.usuarioId,
                        ultimaAuditoria=ahora,
                    ))

    return advertencias


# ============================================================================
# PERSISTENCIA FORM-06: Presupuesto Operativo (UPSERT)
# ============================================================================

def _persistir_datos_form06(
    sesion: Session,
    propuesta_id: int,
    datos: dict,
    usuario_actual: Usuario,
) -> Dict[str, Any]:
    """
    Persiste el Form-06 con lógica UPSERT por (propuestaId, rubroId, anioEjecucion).

    APAÑO: antes de insertar las partidas, asegura que TODOS los rubros
    referenciados en el Excel existan en la tabla RubrosPropuesta.  Si un
    rubro (identificado por su código OG del Form-06, ej. "1-04-99-01") no
    existe en la BD, lo INSERTA automáticamente con su nombre y sección.
    Esto permite que el presupuesto se persista con rubros específicos en
    lugar de caer en un rubro genérico como "Servicios".

    Devuelve un dict con estadísticas para que el endpoint lo incluya en
    la respuesta HTTP:
        {
          "rubros_creados": 4,
          "rubros_existentes": 0,
          "partidas_creadas": 12,
          "partidas_actualizadas": 0,
          "gran_total": 15000000.00,
        }
    """
    ahora = datetime.now(timezone.utc)
    stats: Dict[str, Any] = {
        "rubros_creados": 0,
        "rubros_existentes": 0,
        "partidas_creadas": 0,
        "partidas_actualizadas": 0,
        "gran_total": 0.0,
    }

    # ------------------------------------------------------------------
    # 1. APAÑO: Asegurar que los rubros existan en RubrosPropuesta
    # ------------------------------------------------------------------
    # Construir un cache {og_code → rubroId} que se usará al insertar las
    # partidas.  Para cada rubro único que aparece en el Excel:
    #   a) Buscar si ya existe por nombreRubro (coincidencia con el Detalle del Excel).
    #   b) Si no existe, INSERTARLO con su código OG + nombre + sección.
    rubros_cache: Dict[str, RubrosPropuesta] = {}  # {og_code: objeto RubrosPropuesta}

    rubros_encontrados = datos.get("rubros_encontrados", [])
    if rubros_encontrados:
        print(f"💰 Asegurando {len(rubros_encontrados)} rubros en RubrosPropuesta...")

    for rubro_info in rubros_encontrados:
        og_code = rubro_info.get("og", "")
        nombre = rubro_info.get("nombre", "")
        seccion = rubro_info.get("seccion", "")
        es_dura = rubro_info.get("es_duradero", False)

        if not og_code or not nombre:
            continue

        # a) Buscar por nombre exacto (case-insensitive) en RubrosPropuesta
        rubro_db = sesion.query(RubrosPropuesta).filter(
            RubrosPropuesta.nombreRubro.ilike(nombre),
            RubrosPropuesta.activo == True,
        ).first()

        if rubro_db:
            rubros_cache[og_code] = rubro_db
            stats["rubros_existentes"] += 1
            print(f"   ✓ Rubro existente: '{nombre}' (id={rubro_db.rubroId})")
            continue

        # b) No existe → INSERTARLO
        # Descripción compuesta: "OG {código} — {sección}" para que se
        # pueda buscar por OG también en el futuro.
        descripcion = f"OG {og_code} — {seccion}" if seccion else f"OG {og_code}"

        nuevo_rubro = RubrosPropuesta(
            nombreRubro=nombre,
            descripcionRubro=descripcion,
            activo=True,
            creadoEn=ahora,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=ahora,
        )
        sesion.add(nuevo_rubro)
        sesion.flush()  # Necesario para obtener rubroId
        rubros_cache[og_code] = nuevo_rubro
        stats["rubros_creados"] += 1
        print(f"   🆕 Rubro creado: '{nombre}' (id={nuevo_rubro.rubroId}, OG={og_code})")

    # ------------------------------------------------------------------
    # 2. UPSERT Partidas Presupuestarias (usando el cache de rubros)
    # ------------------------------------------------------------------
    # Mapeo fallback para partidas que no tengan OG (caso de un Excel
    # mal formateado) — se usa el resolver antiguo por keywords.
    def _resolver_rubro_generico(categoria: str, detalle: str) -> Optional[RubrosPropuesta]:
        texto = f"{categoria or ''} {detalle or ''}".lower()
        if "beca" in texto or "asistente" in texto or "estudiante" in texto:
            return _lookup_rubro(sesion, "Becas")
        if "equipo" in texto or "duradero" in texto or "computador" in texto or "mobiliario" in texto:
            return _lookup_rubro(sesion, "Bienes Duraderos")
        if "material" in texto or "reactivo" in texto or "suministro" in texto or "oficina" in texto:
            return _lookup_rubro(sesion, "Materiales")
        rubro = _lookup_rubro(sesion, categoria) if categoria else None
        return rubro or _lookup_rubro(sesion, "Servicios")

    for p in datos.get("partidas", []):
        monto = float(p.get("monto", 0) or 0)
        if monto <= 0:
            continue

        # Resolver el rubro: preferir el cache por OG code, fallback al genérico
        og_code = p.get("og", "")
        rubro = rubros_cache.get(og_code) if og_code else None
        if not rubro:
            rubro = _resolver_rubro_generico(p.get("categoria", ""), p.get("detalle", ""))

        if not rubro:
            print(f"⚠️ Rubro no encontrado para: OG={og_code} / {p.get('categoria', '')[:40]}")
            continue

        # El parser Form-06 ya devuelve es_duradero calculado desde el código OG
        es_duradero = p.get("es_duradero", False)

        pres_db = sesion.query(PresupuestoPropuesta).filter(
            PresupuestoPropuesta.propuestaId == propuesta_id,
            PresupuestoPropuesta.rubroId == rubro.rubroId,
            PresupuestoPropuesta.anioEjecucion == p["anio"],
        ).first()

        if pres_db:
            pres_db.montoSolicitado = monto
            pres_db.esDuradero = es_duradero
            pres_db.usuarioAuditoriaId = usuario_actual.usuarioId
            pres_db.ultimaAuditoria = ahora
            stats["partidas_actualizadas"] += 1
        else:
            sesion.add(PresupuestoPropuesta(
                propuestaId=propuesta_id, rubroId=rubro.rubroId,
                montoSolicitado=monto, anioEjecucion=p["anio"], esDuradero=es_duradero,
                creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora,
            ))
            stats["partidas_creadas"] += 1

    # ------------------------------------------------------------------
    # 3. Actualizar montoTotal de la propuesta con el GRAN TOTAL del Excel
    # ------------------------------------------------------------------
    gran_total = float(datos.get("gran_total", 0) or 0)
    stats["gran_total"] = gran_total
    if gran_total > 0:
        propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if propuesta:
            propuesta.montoTotal = gran_total
            propuesta.usuarioAuditoriaId = usuario_actual.usuarioId
            propuesta.ultimaAuditoria = ahora

    print(f"💰 Form-06 persistido: {stats['rubros_creados']} rubros nuevos, "
          f"{stats['rubros_existentes']} existentes, "
          f"{stats['partidas_creadas']} partidas creadas, "
          f"{stats['partidas_actualizadas']} actualizadas, "
          f"gran_total=₡{gran_total:,.2f}")

    return stats


# ============================================================================
# ENDPOINT PRINCIPAL CON MANEJO DE TRANSACCIONES SEGURO
# ============================================================================

@router.post("/{propuesta_id}/archivos")
async def guardar_archivo_propuesta(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    tipo_documento_id: int = Form(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db),
):
    # 1. Validar tipo de documento
    tipo_doc = sesion.query(TiposDocumento).filter(
        TiposDocumento.tipoDocumentoId == tipo_documento_id,
        TiposDocumento.activo == True,
    ).first()
    if not tipo_doc:
        raise HTTPException(status_code=400, detail="El tipo de documento especificado no es válido o está inactivo.")

    # 2. Leer y procesar archivo
    contenido = await archivo.read()
    tamanio_bytes = len(contenido)
    checksum = hashlib.sha256(contenido).hexdigest()
    nombre_seguro = _sanitizar_nombre_archivo(archivo.filename)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    ruta_s3 = f"propuestas/{propuesta_id}/{timestamp}_{nombre_seguro}"
    print(f"📝 Nombre original: {archivo.filename}")
    print(f"📝 Nombre sanitizado para S3: {nombre_seguro}")

    # 3. Subir a S3
    print(f"📤 Subiendo archivo a S3: {ruta_s3}")
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME, Key=ruta_s3, Body=contenido,
            ContentType=archivo.content_type or "application/octet-stream",
        )
        print(f"✅ Archivo subido a S3 exitosamente.")
    except Exception as e:
        print(f"❌ ERROR al subir a S3: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo al subir a Supabase Storage: {str(e)}")

    # 4. Preparar registro en PropuestaDocumentos
    documento_existente = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.tipoDocumentoId == tipo_documento_id,
        PropuestaDocumentos.activo == True,
    ).first()

    if documento_existente:
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
        documento_a_retornar = PropuestaDocumentos(
            propuestaId=propuesta_id, tipoDocumentoId=tipo_documento_id, rutaArchivo=ruta_s3,
            nombreArchivo=archivo.filename, tamanioBytes=tamanio_bytes, checksum=checksum,
            usuarioCargaId=usuario_actual.usuarioId, activo=True,
            usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=datetime.now(timezone.utc),
        )
        sesion.add(documento_a_retornar)

    sesion.flush()  # FLUSH SEGURO antes del parseo

    # 5. Parsear y persistir con UPSERT
    parseo_ok = False
    parseo_errores = []
    advertencias_form05 = []   # advertencias del Form-05 (iniciales no resueltas)
    stats_form06: Dict[str, Any] = {}   # stats del Form-06 (rubros creados, partidas, etc.)

    es_form04 = tipo_documento_id == 1 and archivo.filename.lower().endswith(".docx")
    es_form05 = tipo_documento_id == 2 and archivo.filename.lower().endswith(".xlsx")
    es_form06 = tipo_documento_id == 3 and archivo.filename.lower().endswith(".xlsx")

    if es_form04 or es_form05 or es_form06:
        try:
            if es_form04:
                print(f"🔍 Detectado Form-04 (.docx). Iniciando parseo y UPSERT...")
                from src.services.form04_parser import parsear_form04_docx
                datos = parsear_form04_docx(contenido)
                _persistir_datos_form04(sesion, propuesta_id, datos, usuario_actual)
            elif es_form05:
                print(f"🔍 Detectado Form-05 (.xlsx). Iniciando parseo y UPSERT...")
                from src.services.form05_parser import parsear_form05_xlsx
                datos = parsear_form05_xlsx(contenido)
                # _persistir_datos_form05 ahora devuelve lista de advertencias
                advertencias_form05 = _persistir_datos_form05(
                    sesion, propuesta_id, datos, usuario_actual
                )
                if advertencias_form05:
                    print(f"⚠️  {len(advertencias_form05)} advertencias de Form-05:")
                    for adv in advertencias_form05:
                        print(f"     - [{adv['tipo']}] {adv.get('mensaje', '')}")
            elif es_form06:
                print(f"🔍 Detectado Form-06 (.xlsx). Iniciando parseo y UPSERT...")
                from src.services.form06_parser import parsear_form06_xlsx
                datos = parsear_form06_xlsx(contenido)
                # _persistir_datos_form06 ahora devuelve stats (rubros creados, etc.)
                stats_form06 = _persistir_datos_form06(
                    sesion, propuesta_id, datos, usuario_actual
                )

            sesion.commit()
            parseo_ok = True
            print("✅ Documento parseado y persistido con UPSERT.")

        except HTTPException:
            sesion.rollback()
            raise
        except Exception as e:
            sesion.rollback()
            parseo_errores.append(str(e))
            print(f"❌ Error al persistir: {e}")
            print("💾 Guardando solo el registro del archivo en la BD...")
            sesion.add(documento_a_retornar)
            sesion.commit()
    else:
        sesion.commit()

    sesion.refresh(documento_a_retornar)

    mensaje_base = "Archivo guardado exitosamente en Supabase y registrado en la base de datos"
    if documento_existente:
        mensaje_base += " (Se actualizó el registro existente)."
    if parseo_ok:
        mensaje_base += " (Datos extraídos y persistidos con lógica UPSERT en todas las tablas del esquema SGPI)."
    if parseo_errores:
        mensaje_base += f" ⚠️ El archivo se guardó, pero hubo errores al extraer algunos datos: {parseo_errores}"

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
        # advertencias del Form-05 sobre participantes no resueltos
        "advertencias_form05": advertencias_form05,
        # stats del Form-06: rubros creados automáticamente, partidas, gran_total
        "stats_form06": stats_form06,
    }