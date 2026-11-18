"""
propuesta_import.py
===================
Endpoint robusto con lógica UPSERT completa para importar el Form-04.
1. Sube a S3
2. Registra en PropuestaDocumentos (con flush seguro)
3. Persiste en TODAS las tablas del esquema SGPI usando UPSERT (evita UniqueViolation)
"""
import hashlib
import re
import traceback
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.propuesta_plan import ObjetivosEspecificos
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta, RolesEquipo, ColaboradoresExternos
from src.models.presupuesto import PresupuestoPropuesta, FinanciamientoExterno, TiposFinanciamiento, RubrosPropuesta
from src.models.aspectos_eticos import AspectosEticos, EntesRegulatorios, EstadosAval
from src.models.productos_academicos import ProductosAcademicos, TiposProductosAcademicos
from src.models.dictamenes import Dictamenes
from src.models.bibliografia import FuentesBibliograficas, Autores, AutorFuente, PropuestaReferencia
from src.models.catalogos import Modalidades, TiposHora, TiposInnovacion
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.services.form04_parser import parsear_form04_docx
from src.utils.s3_client import s3_client, S3_BUCKET_NAME, obtener_url_documento

router = APIRouter(prefix="/api/propuestas", tags=["Importación de Formularios"])


# ============================================================================
# HELPERS DE LOOKUP
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
# PERSISTENCIA COMPLETA DEL FORM-04 CON UPSERT
# ============================================================================

def _persistir_datos_form04(sesion: Session, propuesta_id: int, datos: dict, usuario_actual: Usuario) -> None:
    ahora = datetime.now(timezone.utc)

    # 0. LIMPIEZA SELECTIVA (Solo para tablas 1:N sin restricción UNIQUE compuesta que cause conflicto)
    sesion.query(ObjetivosEspecificos).filter(ObjetivosEspecificos.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(ColaboradoresExternos).filter(ColaboradoresExternos.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(PresupuestoPropuesta).filter(PresupuestoPropuesta.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(FinanciamientoExterno).filter(FinanciamientoExterno.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(AspectosEticos).filter(AspectosEticos.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(ProductosAcademicos).filter(ProductosAcademicos.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(PropuestaReferencia).filter(PropuestaReferencia.propuestaId == propuesta_id).delete(synchronize_session=False)
    sesion.query(Dictamenes).filter(Dictamenes.propuestaId == propuesta_id).delete(synchronize_session=False)
    # NOTA: NO borramos IntegrantesEquipoPropuesta aquí para permitir el UPSERT seguro abajo.

    # 1. PROPUESTA
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

    # 2. PROPUESTA_CONTENIDO (UPSERT)
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

    # 3. PROPUESTA_DECLARACIONES (UPSERT)
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

    # 4. OBJETIVOS_ESPECIFICOS (Recreación segura tras DELETE)
    for oe in datos.get("objetivos_especificos", []):
        sesion.add(ObjetivosEspecificos(propuestaId=propuesta_id, numeroObjetivo=oe["numero"], descripcion=oe["descripcion"], creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))
    sesion.flush()

    # 5. INTEGRANTES_EQUIPO_PROPUESTA (✅ UPSERT REAL PARA EVITAR UniqueViolation)
    for inv in datos.get("investigadores_tec", []):
        usuario = _obtener_o_crear_usuario_por_orcid(sesion, inv["nombre"], inv.get("orcid", ""), inv.get("instancia", ""))
        if not usuario: continue
        
        rol_equipo = _lookup_rol_equipo(sesion, inv.get("rol", ""))
        
        # Sumar horas de todos los tipos para este investigador
        total_horas = 0.0
        tipo_hora_principal_id = None
        
        for th in inv.get("horas", []):
            tipo_hora = _lookup_tipo_hora(sesion, th["tipo_hora"])
            if tipo_hora:
                total_horas += float(th["horas"])
                if tipo_hora_principal_id is None:
                    tipo_hora_principal_id = tipo_hora.tipoHoraId
        
        if not tipo_hora_principal_id: continue

        # BUSCAR si el usuario ya está asignado a esta propuesta
        integrante = sesion.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
            IntegrantesEquipoPropuesta.usuarioId == usuario.usuarioId
        ).first()

        if integrante:
            # ✅ UPDATE
            integrante.tipoHoraId = tipo_hora_principal_id
            integrante.horasSemanales = total_horas
            integrante.rolEquipoId = rol_equipo.rolEquipoId if rol_equipo else integrante.rolEquipoId
            integrante.orcid = inv.get("orcid", "") or integrante.orcid
            integrante.usuarioAuditoriaId = usuario_actual.usuarioId
            integrante.ultimaAuditoria = ahora
        else:
            # ✅ INSERT
            sesion.add(IntegrantesEquipoPropuesta(
                propuestaId=propuesta_id,
                usuarioId=usuario.usuarioId,
                tipoHoraId=tipo_hora_principal_id,
                horasSemanales=total_horas,
                rolEquipoId=rol_equipo.rolEquipoId if rol_equipo else None,
                orcid=inv.get("orcid", ""),
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))

    # 6. COLABORADORES_EXTERNOS (Recreación segura)
    for col in datos.get("colaboradores_externos", []):
        sesion.add(ColaboradoresExternos(propuestaId=propuesta_id, nombreColaborador=col.get("nombre", ""), apellido1Colaborador=col.get("apellido1"), apellido2Colaborador=col.get("apellido2"), idOrcid=col.get("orcid"), institucionEmpresa=col.get("institucion", ""), creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 7. PRESUPUESTO_PROPUESTA (Recreación segura)
    rubro_operativo = _lookup_rubro(sesion, "operativo") or _lookup_rubro(sesion, "Presupuesto operativo")
    rubro_duradero = _lookup_rubro(sesion, "bienes duraderos") or _lookup_rubro(sesion, "duradero")
    for p in datos.get("presupuesto_anual", []):
        anio = p["ano"]
        if p.get("operativo", 0) > 0 and rubro_operativo:
            sesion.add(PresupuestoPropuesta(propuestaId=propuesta_id, rubroId=rubro_operativo.rubroId, montoSolicitado=p["operativo"], anioEjecucion=anio, esDuradero=False, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))
        if p.get("duradero", 0) > 0 and rubro_duradero:
            sesion.add(PresupuestoPropuesta(propuestaId=propuesta_id, rubroId=rubro_duradero.rubroId, montoSolicitado=p["duradero"], anioEjecucion=anio, esDuradero=True, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 8. FINANCIAMIENTO_EXTERNO (Recreación segura)
    fa = datos.get("financiamiento_adicional", {})
    for cat_nombre, entry in [("externo", fa.get("externo", {})), ("contrapartida", fa.get("contrapartida", {})), ("cofinanciamiento", fa.get("cofinanciamiento", {}))]:
        if not entry: continue
        tipo_fin = _lookup_tipo_financiamiento(sesion, cat_nombre)
        if not tipo_fin: continue
        for idx, anio_label in enumerate(["ano1", "ano2", "ano3"], start=1):
            monto = entry.get(anio_label, 0.0)
            if monto <= 0: continue
            anio_ejec = (propuesta.fechaInicio.year + idx - 1) if propuesta.fechaInicio else (2027 + idx - 1)
            sesion.add(FinanciamientoExterno(propuestaId=propuesta_id, tipoFinanciamientoId=tipo_fin.tipoFinanciamientoId, anio=anio_ejec, monto=monto, numeroOficio=entry.get("oficio"), creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 9. ASPECTOS_ETICOS (Recreación segura)
    ae = datos.get("aspectos_eticos", {})
    sesion.add(AspectosEticos(propuestaId=propuesta_id, involucraSeresHumanos=bool(ae.get("seres_humanos")), involucraBiodiversidad=bool(ae.get("biodiversidad")), involucraAnimales=bool(ae.get("animales")), involucraTerritoriosIndigenas=bool(ae.get("comunidades_indigenas")), justificacionExencion=ae.get("justificacion_exencion"), enteRegulatorioId=_lookup_ente_regulatorio(sesion, ae.get("ente_regulatorio", "")).enteRegulatorioId if _lookup_ente_regulatorio(sesion, ae.get("ente_regulatorio", "")) else None, estadoAvalId=_lookup_estado_aval(sesion, "Pendiente").estadoAvalId, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 10. PRODUCTOS_ACADEMICOS (Recreación segura)
    objs_db = sesion.query(ObjetivosEspecificos).filter(ObjetivosEspecificos.propuestaId == propuesta_id).all()
    def _resolver_objetivo_id(texto_oe: str) -> Optional[int]:
        if not texto_oe: return None
        nums = [int(m.group(1)) for m in re.finditer(r"OE\s*(\d+)", texto_oe, re.IGNORECASE)]
        if not nums: return None
        for oe_db in objs_db:
            if oe_db.numeroObjetivo == nums[0]: return oe_db.objetivoEspecificoId
        return None

    comp = datos.get("compromisos", {})
    for prod in comp.get("productos_basica", []) + comp.get("productos_desarrollo", []):
        tipo_prod = _lookup_tipo_producto(sesion, prod["opcion"])
        if tipo_prod:
            sesion.add(ProductosAcademicos(propuestaId=propuesta_id, tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId, objetivoEspecificoId=_resolver_objetivo_id(prod.get("objetivo", "")), descripcion=prod["opcion"][:300], cantidadComprometida=prod.get("cantidad", 1), esPropiedadIndustrial=False, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))
    
    for activo in comp.get("activos_propiedad_industrial", []):
        tipo_prod = _lookup_tipo_producto(sesion, activo["tipo_activo"])
        if tipo_prod:
            sesion.add(ProductosAcademicos(propuestaId=propuesta_id, tipoProductoAcademicoId=tipo_prod.tipoProductoAcademicoId, objetivoEspecificoId=_resolver_objetivo_id(activo.get("consecutivo", "")), descripcion=activo["tipo_activo"][:300], cantidadComprometida=1, esPropiedadIndustrial=True, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 11. DICTAMENES (Recreación segura)
    oficio_dict = s1.get("potencial_pi", {}).get("oficio_dictamen", "")
    if oficio_dict:
        sesion.add(Dictamenes(propuestaId=propuesta_id, numeroOficio=oficio_dict, fechaEmision=ahora, contenido=f"Dictamen del Centro de Vinculación: {oficio_dict}. Generado automáticamente desde el Form-04.", usuarioRemitenteId=usuario_actual.usuarioId, creadoEn=ahora, usuarioAuditoriaId=usuario_actual.usuarioId, ultimaAuditoria=ahora))

    # 12. REFERENCIAS BIBLIOGRÁFICAS (UPSERT por DOI/Nombre)
    for ref in datos.get("referencias", []):
        fuente = sesion.query(FuentesBibliograficas).filter(FuentesBibliograficas.doi == ref.get("doi")).first() if ref.get("doi") else None
        if not fuente:
            fuente = FuentesBibliograficas(doi=ref.get("doi"), titulo=ref["titulo"][:500], anioPublicacion=ref.get("anio") or 0, revistaFuente=(ref.get("revista_fuente") or "")[:200] or None, esIndexadaWoSScopus=bool(ref.get("es_indexada_wos_scopus")), creadoEn=ahora)
            sesion.add(fuente)
            sesion.flush()
        
        for orden, nombre_autor in enumerate(ref.get("autores", []), start=1):
            autor = sesion.query(Autores).filter(Autores.nombreCompleto.ilike(nombre_autor)).first()
            if not autor:
                autor = Autores(nombreCompleto=nombre_autor[:150], creadoEn=ahora)
                sesion.add(autor)
                sesion.flush()
            if not sesion.query(AutorFuente).filter(AutorFuente.autorId == autor.autorId, AutorFuente.fuenteId == fuente.fuenteId).first():
                sesion.add(AutorFuente(autorId=autor.autorId, fuenteId=fuente.fuenteId, ordenAutoria=orden, creadoEn=ahora))
        
        if not sesion.query(PropuestaReferencia).filter(PropuestaReferencia.propuestaId == propuesta_id, PropuestaReferencia.fuenteId == fuente.fuenteId).first():
            sesion.add(PropuestaReferencia(propuestaId=propuesta_id, fuenteId=fuente.fuenteId, ordenReferencia=ref.get("numero", 0), creadoEn=ahora))


# ============================================================================
# ENDPOINT PRINCIPAL CON MANEJO DE TRANSACCIONES SEGURO
# ============================================================================

@router.post("/{propuesta_id}/importar-form04")
async def importar_form04(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    print(f"\n🔍 DEBUG: Iniciando importación Form-04 robusta para propuesta_id={propuesta_id}")
    
    if not archivo.filename.lower().endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx del Form-04 oficial")
    
    try:
        contenido = await archivo.read()
        tamanio_bytes = len(contenido)
        checksum = hashlib.sha256(contenido).hexdigest()
        ruta_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"

        # 1. Subir a S3
        print(f"📤 Subiendo archivo a S3: {ruta_s3}")
        s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=ruta_s3, Body=contenido, ContentType=archivo.content_type or "application/octet-stream")

        # 2. Registrar en PropuestaDocumentos
        documento_existente = sesion.query(PropuestaDocumentos).filter(
            PropuestaDocumentos.propuestaId == propuesta_id, 
            PropuestaDocumentos.tipoDocumentoId == 1, 
            PropuestaDocumentos.activo == True
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
                propuestaId=propuesta_id,
                tipoDocumentoId=1,
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

        # ✅ FLUSH: Hace el INSERT/UPDATE en la BD y obtiene el ID, pero NO hace commit aún.
        # Esto asegura que el objeto sea "persistent" en la sesión, evitando InvalidRequestError.
        sesion.flush()

        # 3. Parsear y Persistir en TODAS las tablas
        parseo_ok = False
        parseo_errores = []
        try:
            print("🔍 Parseando Form-04...")
            datos = parsear_form04_docx(contenido)
            _persistir_datos_form04(sesion, propuesta_id, datos, usuario_actual)
            
            # Si todo sale bien, hacemos commit de TODO (documento + datos parseados)
            sesion.commit()
            parseo_ok = True
            print("✅ Form-04 parseado y persistido en todas las tablas.")
            
        except HTTPException:
            sesion.rollback()
            raise
        except Exception as e:
            sesion.rollback()
            parseo_errores.append(str(e))
            print(f"❌ Error al persistir Form-04: {e}")
            
            # ✅ RECUPERACIÓN: Como el rollback eliminó todo, volvemos a agregar el documento
            # y lo guardamos solo él, para no perder el archivo subido a S3.
            print("💾 Guardando solo el registro del archivo en la BD (sin los datos parseados)...")
            sesion.add(documento_a_retornar)
            sesion.commit()

        # ✅ Ahora el objeto es definitivamente persistente y seguro de refrescar.
        sesion.refresh(documento_a_retornar)

        mensaje_base = "Form-04 importado y guardado exitosamente en la base de datos y S3"
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
            "form04_parseado": parseo_ok,
            "form04_errores": parseo_errores,
            "datos_extraidos": {"secciones_completadas": len([k for k, v in datos.items() if v]) if parseo_ok else 0}
        }

    except HTTPException:
        print(f"❌ HTTPException: {traceback.format_exc()}")
        raise
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
        sesion.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar el documento: {type(e).__name__}: {str(e)}")