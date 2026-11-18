"""
archivos.py
===========
Router FastAPI con lógica UPSERT UNIVERSAL para el Form-04.
No usa DELETEs masivos. Busca el registro por su clave natural:
- Si existe: actualiza los campos.
- Si no existe: lo crea.
Esto garantiza idempotencia total sin violar restricciones UNIQUE.
"""
import hashlib
import re
from datetime import datetime, timezone, date
from typing import Optional

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

    # 4. OBJETIVOS_ESPECIFICOS (UPSERT por propuestaId + numeroObjetivo)
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
    sesion.flush() # Para asegurar IDs de objetivos

    # 5. INTEGRANTES_EQUIPO_PROPUESTA (UPSERT por propuestaId + usuarioId)
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

    # 6. COLABORADORES_EXTERNOS (UPSERT por propuestaId + idOrcid o nombre)
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

    # 7. PRESUPUESTO_PROPUESTA (UPSERT por propuestaId + rubroId + anioEjecucion)
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

    # 8. FINANCIAMIENTO_EXTERNO (UPSERT por propuestaId + tipoFinanciamientoId + anio)
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

    # 9. ASPECTOS_ETICOS (UPSERT 1:1 por propuestaId)
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

    # 10. PRODUCTOS_ACADEMICOS (UPSERT por propuestaId + tipoProducto + descripcion)
    # Nota: Para listas donde el usuario puede desmarcar ítems, el DELETE es a veces más limpio, 
    # pero aquí aplicamos UPSERT estricto como se solicitó.
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

    # 11. DICTAMENES (UPSERT por propuestaId + numeroOficio)
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

    # 12. REFERENCIAS BIBLIOGRÁFICAS (UPSERT robusto por DOI o Título+Año)
    for ref in datos.get("referencias", []):
        # 12a. Normalizar DOI: si es cadena vacía o solo espacios, tratar como None
        doi = ref.get("doi")
        doi = doi.strip() if isinstance(doi, str) else doi
        if not doi:
            doi = None
            
        titulo = (ref.get("titulo") or "")[:500]
        anio = ref.get("anio") or 0
        
        # Buscar fuente existente por DOI (si existe)
        fuente = None
        if doi:
            fuente = sesion.query(FuentesBibliograficas).filter(FuentesBibliograficas.doi == doi).first()
        
        # Fallback: si no hay DOI o no se encontró, buscar por Título y Año para evitar duplicados
        if not fuente and titulo:
            fuente = sesion.query(FuentesBibliograficas).filter(
                FuentesBibliograficas.titulo.ilike(f"%{titulo[:100]}%"),
                FuentesBibliograficas.anioPublicacion == anio
            ).first()

        if fuente:
            # UPDATE: Actualizar campos faltantes si es necesario
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
            # INSERT: Crear nueva fuente solo si no existe
            fuente = FuentesBibliograficas(
                doi=doi,
                titulo=titulo,
                anioPublicacion=anio,
                revistaFuente=(ref.get("revista_fuente") or "")[:200] or None,
                esIndexadaWoSScopus=bool(ref.get("es_indexada_wos_scopus")),
                creadoEn=ahora
            )
            sesion.add(fuente)
            sesion.flush() # Necesario para obtener fuente.fuenteId
        
        # 12b. Autores — deduplicar por nombre
        for orden, nombre_autor in enumerate(ref.get("autores", []), start=1):
            if not nombre_autor:
                continue
                
            autor = sesion.query(Autores).filter(Autores.nombreCompleto.ilike(nombre_autor)).first()
            if not autor:
                autor = Autores(nombreCompleto=nombre_autor[:150], creadoEn=ahora)
                sesion.add(autor)
                sesion.flush()
            
            # 12c. AutorFuente (UPSERT)
            existe_af = sesion.query(AutorFuente).filter(
                AutorFuente.autorId == autor.autorId,
                AutorFuente.fuenteId == fuente.fuenteId
            ).first()
            
            if not existe_af:
                sesion.add(AutorFuente(
                    autorId=autor.autorId,
                    fuenteId=fuente.fuenteId,
                    ordenAutoria=orden,
                    creadoEn=ahora
                ))

        # 12d. PropuestaReferencia (UPSERT)
        existe_pr = sesion.query(PropuestaReferencia).filter(
            PropuestaReferencia.propuestaId == propuesta_id,
            PropuestaReferencia.fuenteId == fuente.fuenteId
        ).first()
        
        if not existe_pr:
            sesion.add(PropuestaReferencia(
                propuestaId=propuesta_id,
                fuenteId=fuente.fuenteId,
                ordenReferencia=ref.get("numero", 0),
                creadoEn=ahora
            ))
# ============================================================================
# PERSISTENCIA FORM-05: Plan de Acción y Riesgos (UPSERT)
# ============================================================================

def _persistir_datos_form05(sesion: Session, propuesta_id: int, datos: dict, usuario_actual: Usuario) -> None:
    """Persiste el Form-05 con lógica UPSERT. Vincula actividades a objetivos existentes."""
    from src.models.propuesta_plan import Actividades, Riesgos, MedidasMitigacion
    from src.models.propuesta_plan import ObjetivosEspecificos, ParticipantesActividad, TiposResponsabilidad

    ahora = datetime.now(timezone.utc)
    
    # 1. Cargar objetivos de la propuesta para poder vincular las actividades
    objs_db = sesion.query(ObjetivosEspecificos).filter(
        ObjetivosEspecificos.propuestaId == propuesta_id
    ).all()

    def _resolver_objetivo_id(texto_objetivo: str) -> Optional[int]:
        if not texto_objetivo:
            return objs_db[0].objetivoEspecificoId if objs_db else None
        
        # Intentar extraer número: "OE1", "Objetivo 2", etc.
        m = re.search(r"(?:OE|Objetivo)\s*(\d+)", texto_objetivo, re.IGNORECASE)
        if m:
            num = int(m.group(1))
            for o in objs_db:
                if o.numeroObjetivo == num:
                    return o.objetivoEspecificoId
        
        # Fallback: coincidencia parcial de texto
        texto_l = texto_objetivo.lower()[:50]
        for o in objs_db:
            if texto_l and texto_l in (o.descripcion or "").lower():
                return o.objetivoEspecificoId
                
        return objs_db[0].objetivoEspecifico if objs_db else None

    # Obtener propuesta para calcular año real de ejecución
    propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    anio_base = propuesta.fechaInicio.year if propuesta and propuesta.fechaInicio else 2027

    # 2. UPSERT Actividades, Riesgos, Medidas y Participantes
    for act in datos.get("actividades", []):
        if not act.get("descripcion"):
            continue
            
        obj_id = _resolver_objetivo_id(act.get("objetivo", ""))
        if not obj_id:
            continue # Sin objetivo no se puede vincular (FK obligatoria)

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
            sesion.flush() # Necesario para obtener actividad_db.actividadId

        # UPSERT Riesgos asociados a esta actividad
        for rg in datos.get("riesgos", []):
            if rg.get("actividad_index") != datos["actividades"].index(act):
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
            for med in datos.get("medidas_mitigacion", []):
                if med.get("riesgo_index") != datos["riesgos"].index(rg):
                    continue
                
                medida_db = sesion.query(MedidasMitigacion).filter(
                    MedidasMitigacion.riesgoId == riesgo_db.riesgoId,
                    MedidasMitigacion.descripcionMedida.ilike(f"%{med['descripcion'][:80]}%")
                ).first()

                if medida_db:
                    medida_db.esPermisoEtico = med.get("es_permiso_etico", False)
                    medida_db.usuarioAuditoriaId = usuario_actual.usuarioId
                    medida_db.ultimaAuditoria = ahora
                else:
                    # Intentar resolver el responsable a un usuario real
                    resp_usuario = None
                    if med.get("responsable"):
                        partes = med["responsable"].split(maxsplit=1)
                        resp_usuario = sesion.query(Usuario).filter(
                            Usuario.nombreUsuario.ilike(partes[0])
                        ).first()

                    sesion.add(MedidasMitigacion(
                        riesgoId=riesgo_db.riesgoId,
                        descripcionMedida=med["descripcion"],
                        usuarioResponsableId=resp_usuario.usuarioId if resp_usuario else usuario_actual.usuarioId,
                        esPermisoEtico=med.get("es_permiso_etico", False),
                        creadoEn=ahora,
                        usuarioAuditoriaId=usuario_actual.usuarioId,
                        ultimaAuditoria=ahora,
                    ))

        # UPSERT Participantes de la actividad
        tipo_resp = sesion.query(TiposResponsabilidad).filter(
            TiposResponsabilidad.nombreTipoResponsabilidad.ilike("%investigador%")
        ).first() or sesion.query(TiposResponsabilidad).first()

        if act.get("participantes") and tipo_resp:
            for nombre in [p.strip() for p in act["participantes"].split(",") if p.strip()]:
                partes = nombre.split(maxsplit=1)
                usuario = sesion.query(Usuario).filter(Usuario.nombreUsuario.ilike(partes[0])).first()
                if not usuario:
                    continue
                
                existe = sesion.query(ParticipantesActividad).filter(
                    ParticipantesActividad.actividadId == actividad_db.actividadId,
                    ParticipantesActividad.usuarioId == usuario.usuarioId,
                    ParticipantesActividad.tipoResponsabilidadId == tipo_resp.tipoResponsabilidadId,
                ).first()
                
                if not existe:
                    sesion.add(ParticipantesActividad(
                        actividadId=actividad_db.actividadId,
                        usuarioId=usuario.usuarioId,
                        tipoResponsabilidadId=tipo_resp.tipoResponsabilidadId,
                        creadoEn=ahora,
                        usuarioAuditoriaId=usuario_actual.usuarioId,
                        ultimaAuditoria=ahora,
                    ))


# ============================================================================
# PERSISTENCIA FORM-06: Presupuesto Operativo (UPSERT)
# ============================================================================

def _persistir_datos_form06(sesion: Session, propuesta_id: int, datos: dict, usuario_actual: Usuario) -> None:
    """Persiste el Form-06 con lógica UPSERT por (propuestaId, rubroId, anioEjecucion)."""
    ahora = datetime.now(timezone.utc)

    def _resolver_rubro(categoria: str, detalle: str) -> Optional[RubrosPropuesta]:
        texto = f"{categoria or ''} {detalle or ''}".lower()
        if "beca" in texto or "asistente" in texto or "estudiante" in texto:
            return _lookup_rubro(sesion, "Becas")
        if "equipo" in texto or "duradero" in texto or "computador" in texto or "mobiliario" in texto:
            return _lookup_rubro(sesion, "Bienes Duraderos")
        if "material" in texto or "reactivo" in texto or "suministro" in texto or "oficina" in texto:
            return _lookup_rubro(sesion, "Materiales")
        
        # Fallback: intentar buscar por el nombre de la categoría exacta
        rubro = _lookup_rubro(sesion, categoria) if categoria else None
        return rubro or _lookup_rubro(sesion, "Servicios") # Default a Servicios si no se encuentra

    # 1. UPSERT Partidas Presupuestarias
    for p in datos.get("partidas", []):
        monto = float(p.get("monto", 0) or 0)
        if monto <= 0:
            continue
            
        rubro = _resolver_rubro(p.get("categoria", ""), p.get("detalle", ""))
        if not rubro:
            print(f"⚠️ Rubro no encontrado para: {p.get('categoria', '')} / {p.get('detalle', '')[:40]}")
            continue

        es_duradero = "duradero" in (p.get("categoria", "") + p.get("detalle", "")).lower() \
                      or "equipo" in (p.get("categoria", "") + p.get("detalle", "")).lower()

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
        else:
            sesion.add(PresupuestoPropuesta(
                propuestaId=propuesta_id,
                rubroId=rubro.rubroId,
                montoSolicitado=monto,
                anioEjecucion=p["anio"],
                esDuradero=es_duradero,
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))

    # 2. Actualizar el montoTotal de la propuesta con el GRAN TOTAL del resumen
    gran_total = float(datos.get("gran_total", 0) or 0)
    if gran_total > 0:
        propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if propuesta:
            propuesta.montoTotal = gran_total
            propuesta.usuarioAuditoriaId = usuario_actual.usuarioId
            propuesta.ultimaAuditoria = ahora

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
    tipo_doc = sesion.query(TiposDocumento).filter(TiposDocumento.tipoDocumentoId == tipo_documento_id, TiposDocumento.activo == True).first()
    if not tipo_doc:
        raise HTTPException(status_code=400, detail="El tipo de documento especificado no es válido o está inactivo.")

    # 2. Leer y procesar archivo
    contenido = await archivo.read()
    tamanio_bytes = len(contenido)
    checksum = hashlib.sha256(contenido).hexdigest()
    ruta_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"

    # 3. Subir a S3
    print(f"📤 Subiendo archivo a S3: {ruta_s3}")
    try:
        s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=ruta_s3, Body=contenido, ContentType=archivo.content_type or "application/octet-stream")
        print(f"✅ Archivo subido a S3 exitosamente.")
    except Exception as e:
        print(f"❌ ERROR al subir a S3: {e}")
        raise HTTPException(status_code=500, detail=f"Fallo al subir a Supabase Storage: {str(e)}")

    # 4. Preparar registro en PropuestaDocumentos
    documento_existente = sesion.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == propuesta_id, PropuestaDocumentos.tipoDocumentoId == tipo_documento_id, PropuestaDocumentos.activo == True).first()
    
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
            propuestaId=propuesta_id, tipoDocumentoId=tipo_documento_id, rutaArchivo=ruta_s3, nombreArchivo=archivo.filename,
            tamanioBytes=tamanio_bytes, checksum=checksum, usuarioCargaId=usuario_actual.usuarioId, activo=True,
            usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=datetime.now(timezone.utc),
        )
        sesion.add(documento_a_retornar)

    # ✅ FLUSH SEGURO: Marca el objeto como persistente en la sesión ANTES de intentar el parseo.
    # Esto evita el "InvalidRequestError" si el parseo falla y hacemos rollback.
    sesion.flush()

    # 5. Parsear y persistir con UPSERT
    parseo_ok = False
    parseo_errores = []

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
                _persistir_datos_form05(sesion, propuesta_id, datos, usuario_actual)
            elif es_form06:
                print(f"🔍 Detectado Form-06 (.xlsx). Iniciando parseo y UPSERT...")
                from src.services.form06_parser import parsear_form06_xlsx
                datos = parsear_form06_xlsx(contenido)
                _persistir_datos_form06(sesion, propuesta_id, datos, usuario_actual)

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
        # Documento normal (PDF, imagen, etc.) — solo guardar el registro
        sesion.commit()

    # ✅ Ahora el objeto es definitivamente persistente y seguro de refrescar.
    sesion.refresh(documento_a_retornar)

    mensaje_base = "Archivo guardado exitosamente en Supabase y registrado en la base de datos"
    if documento_existente:
        mensaje_base += " (Se actualizó el registro existente)."
    if parseo_ok:
        mensaje_base += " (Datos del Form-04 extraídos y persistidos con lógica UPSERT en todas las tablas del esquema SGPI)."
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
    }