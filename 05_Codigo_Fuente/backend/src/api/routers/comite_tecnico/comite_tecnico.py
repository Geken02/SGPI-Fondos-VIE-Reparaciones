# src/api/routers/comite_tecnico.py
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from collections import defaultdict 

from src.database import get_db
from src.models.usuarios import Usuario
from src.models.propuestas import Propuesta
from src.models.catalogos import Modalidades
from src.models.convocatorias import EstadosPropuesta
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.evaluaciones import Evaluaciones, EstadosEvaluacion, DetalleEvaluacion
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta
from src.models.escuelas import Escuela
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion 
from src.models.asignaciones_comite import AsignacionComite
from src.models.dictamenes import Dictamenes

from src.utils.dependencias import obtener_usuario_actual
from src.utils.s3_client import obtener_url_documento
from src.api.schemas.comite_tecnico.ia_schemas import AnalisisIARequest, AnalisisDocumentoIARequest, AnalisisDocumentoIAResponse
from src.api.schemas.comite_tecnico.evaluacion import EnviarEvaluacionRequest, RespuestaEvaluacionSchema
from src.services.comite_tecnico.ia_service import analizar_documento_completo
from src.services.comite_tecnico.rubricas_data import obtener_rubrica, calcular_minimo_productos

router = APIRouter(prefix="/api/comite-tecnico", tags=["Comité Técnico"])

# ============================================================================
# ✅ NUEVO: Constantes para los campos NOT NULL de la tabla evaluaciones
# ⚠️ IMPORTANTE: Ajusta estos valores según tu base de datos real.
# Ejecuta en Supabase: SELECT * FROM "tiposevaluacion"; SELECT * FROM "estadosevaluacion";
# ============================================================================
DEFAULT_TIPO_EVALUACION_ID = 2        # ID del tipo de evaluación (ej: "Evaluación de Comité")
DEFAULT_ESTADO_BORRADOR_ID = 1        # ID del estado "En Progreso" o "Borrador"
DEFAULT_ESTADO_COMPLETADA_ID = 3      # ID del estado "Completada" o "Enviada"

# ============================================================================
# SCHEMAS
# ============================================================================
class SubsanacionRequest(BaseModel):
    detalle: str
    documentosFaltantes: Dict[str, bool]

# ============================================================================
# ASISTENTE DEL COMITÉ TÉCNICO
# ============================================================================
@router.get("/asistente/bandeja-completitud")
def bandeja_completitud(
    convocatoria_id: Optional[int] = Query(None),
    escuela_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    try:
        codigos_estado_comite = ["ENVIADA", "EN_REVISION", "SUBSANACION", "EN_COMITE"]
        estados_comite = db.query(EstadosPropuesta).filter(
            EstadosPropuesta.codigoEstadoPropuesta.in_(codigos_estado_comite)
        ).all()
        
        if not estados_comite:
            return {"propuestas": [], "estadisticas": {"total": 0, "completas": 0, "incompletas": 0}}
        
        estado_ids = [e.estadoPropuestaId for e in estados_comite]
        query = db.query(Propuesta).filter(Propuesta.estadoId.in_(estado_ids))

        if convocatoria_id:
            query = query.filter(Propuesta.convocatoriaId == convocatoria_id)
        if escuela_id:
            query = query.filter(Propuesta.escuelaId == escuela_id)

        propuestas = query.all()
        tipos_requeridos_ids = [1, 2, 3, 5]

        propuestas_data = []
        total = len(propuestas)
        completas = 0
        incompletas = 0

        for prop in propuestas:
            investigador = db.query(Usuario).filter(Usuario.usuarioId == prop.investigadorCoordId).first()
            escuela = db.query(Escuela).filter(Escuela.escuelaId == prop.escuelaId).first()
            documentos = db.query(PropuestaDocumentos).filter(
                PropuestaDocumentos.propuestaId == prop.propuestaId,
                PropuestaDocumentos.activo == True
            ).all()

            documentos_presentes = {doc.tipoDocumentoId for doc in documentos}
            es_completa = all(tipo in documentos_presentes for tipo in tipos_requeridos_ids)
            
            if es_completa:
                completas += 1
            else:
                incompletas += 1

            propuestas_data.append({
                "propuestaId": prop.propuestaId,
                "codigoPropuesta": prop.codigoPropuesta or f"FVIE-{prop.propuestaId}",
                "titulo": prop.titulo,
                "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "Sin asignar",
                "escuela": escuela.nombreEscuela if escuela else "Sin escuela",
                "fechaEnvio": prop.fechaEnvio.isoformat() if prop.fechaEnvio else None,
                "esCompleta": es_completa,
                "documentosFaltantes": [t for t in tipos_requeridos_ids if t not in documentos_presentes],
                "estado": "Completa" if es_completa else "Incompleta"
            })

        return {
            "propuestas": propuestas_data,
            "estadisticas": {"total": total, "completas": completas, "incompletas": incompletas}
        }
    except Exception as e:
        print(f"ERROR en bandeja_completitud: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.post("/asistente/{propuesta_id}/solicitar-subsanacion", status_code=status.HTTP_201_CREATED)
def solicitar_subsanacion(
    propuesta_id: int,
    solicitud: SubsanacionRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    estado_subsanacion = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta == "SUBSANACION"
    ).first()
    
    if estado_subsanacion:
        propuesta.estadoId = estado_subsanacion.estadoPropuestaId
        
    nueva_subsanacion = Subsanaciones(
        propuestaId=propuesta_id,
        gestoraVIEId=usuario.usuarioId, 
        comentarioGestora=solicitud.detalle,
        estadoSubsanacionId=1,
        fechaSolicitud=datetime.now(timezone.utc)
    )
    
    db.add(nueva_subsanacion)
    db.commit()
    db.refresh(nueva_subsanacion)
    
    return {
        "message": "Solicitud de subsanación enviada correctamente",
        "subsanacionId": nueva_subsanacion.subsanacionId,
        "propuestaId": propuesta_id
    }

@router.post("/asistente/{propuesta_id}/aprobar-completitud")
def aprobar_completitud(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    estado_evaluacion = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta.in_(["EN_EVALUACION", "ASIGNADA"])
    ).first()
    
    if estado_evaluacion:
        propuesta.estadoId = estado_evaluacion.estadoPropuestaId
        db.commit()
        
    return {"message": "Completitud aprobada. Propuesta enviada al Coordinador."}

@router.get("/propuestas-asignadas")
def propuestas_asignadas(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint inteligente que adapta la respuesta según el rol:
    - Asistente/Coordinador: Ve TODAS las propuestas del comité
    - Evaluador: Ve SOLO sus asignaciones
    """
    try:
        # 1. Detectar el rol del usuario
        from src.models.roles import UsuarioRol, RolesSistema
        
        rol_usuario = None
        rol_asignado = db.query(UsuarioRol).filter(
            UsuarioRol.usuarioId == usuario.usuarioId,
            UsuarioRol.activo == True
        ).first()
        
        if rol_asignado:
            rol_obj = db.query(RolesSistema).filter(
                RolesSistema.rolId == rol_asignado.rolId
            ).first()
            rol_usuario = rol_obj.nombreRol if rol_obj else None
        
        # 2. Definir roles que pueden ver TODAS las propuestas (gestores)
        roles_gestores = [
            'AsistenteComiteTecnico',
            'CoordinadorComiteTecnico',
            'SuperAdministrador',
            'Administrador'
        ]
        
        es_gestor = rol_usuario in roles_gestores
        
        # 3. Filtrar según el rol
        if es_gestor:
            # GESTOR: Ver TODAS las propuestas en estados del comité
            codigos_estado_comite = ["ENVIADA", "EN_REVISION", "SUBSANACION", "EN_COMITE", "EN_EVALUACION", "ASIGNADA"]
            estados_comite = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.codigoEstadoPropuesta.in_(codigos_estado_comite)
            ).all()
            
            if not estados_comite:
                return {"items": [], "total": 0}
                
            estado_ids = [e.estadoPropuestaId for e in estados_comite]
            query = db.query(Propuesta).filter(Propuesta.estadoId.in_(estado_ids))
            
        else:
            # EVALUADOR: Ver SOLO sus asignaciones activas
            asignaciones = db.query(AsignacionComite).filter(
                AsignacionComite.evaluadorId == usuario.usuarioId,
                AsignacionComite.activo == True
            ).all()
            
            if not asignaciones:
                return {"items": [], "total": 0}
            
            propuesta_ids = [asig.propuestaId for asig in asignaciones]
            query = db.query(Propuesta).filter(Propuesta.propuestaId.in_(propuesta_ids))
        
        # 4. Aplicar búsqueda si existe
        if busqueda:
            query = query.filter(Propuesta.titulo.ilike(f"%{busqueda}%") | Propuesta.codigoPropuesta.ilike(f"%{busqueda}%"))
        
        propuestas = query.all()
        items = []
        
        for p in propuestas:
            # 1. Buscar asignaciones de esta propuesta
            asignaciones_propuesta = db.query(AsignacionComite).filter(
                AsignacionComite.propuestaId == p.propuestaId,
                AsignacionComite.activo == True
            ).all()
            
            evaluadores_nombres = []
            for asig in asignaciones_propuesta:
                evaluador = db.query(Usuario).filter(Usuario.usuarioId == asig.evaluadorId).first()
                if evaluador:
                    evaluadores_nombres.append(f"{evaluador.nombreUsuario} {evaluador.apellido1Usuario}")
            
            total_asignadas = len(asignaciones_propuesta)
            
            # 2. Determinar el estado para la UI (esto es lo que controla el botón del frontend)
            if es_gestor:
                if total_asignadas == 0:
                    estado_eval = "Pendiente de asignación"
                else:
                    evaluaciones_completadas = db.query(Evaluaciones).join(EstadosEvaluacion).filter(
                        Evaluaciones.propuestaId == p.propuestaId,
                        # Usamos ilike para que funcione sin importar si se llama "Completada", "Evaluación Completada", etc.
                        EstadosEvaluacion.nombreEstadoEvaluacion.ilike("%completada%") 
                    ).count()
                    
                    # Si el número de evaluaciones completadas es igual al total de evaluadores asignados
                    if evaluaciones_completadas == total_asignadas:
                        estado_eval = "Completada"  # ← Esto hace que aparezca el botón en el frontend
                    elif evaluaciones_completadas > 0:
                        estado_eval = "En progreso"
                    else:
                        estado_eval = "Pendiente de evaluación"
            else:
                # Para el Evaluador: mostrar SU estado personal
                evaluacion = db.query(Evaluaciones).filter(
                    Evaluaciones.propuestaId == p.propuestaId,
                    Evaluaciones.evaluadorId == usuario.usuarioId
                ).first()
                
                estado_eval = "Pendiente de evaluación"
                if evaluacion and evaluacion.estadoEvaluacionId:
                    estado_obj = db.query(EstadosEvaluacion).filter(
                        EstadosEvaluacion.estadoEvaluacionId == evaluacion.estadoEvaluacionId
                    ).first()
                    if estado_obj:
                        estado_eval = estado_obj.nombreEstadoEvaluacion
            
            items.append({
                "propuestaId": p.propuestaId,
                "codigoPropuesta": p.codigoPropuesta,
                "titulo": p.titulo,
                "evaluadores": ", ".join(evaluadores_nombres) if evaluadores_nombres else "Sin asignar",
                "totalEvaluadores": total_asignadas,
                "fechaAsignacion": p.fechaCreacion.isoformat() if p.fechaCreacion else None,
                "estado": estado_eval  # ← El frontend usará este valor para mostrar el botón
            })
        
        return {"items": items, "total": len(items)}
    except Exception as e:
        print(f"ERROR en propuestas_asignadas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    
# ============================================================================
# PROFESOR EVALUADOR
# ============================================================================

@router.get("/evaluador/bandeja-evaluacion") 
def bandeja_evaluacion(db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Buscar asignaciones activas para este evaluador
        asignaciones = db.query(AsignacionComite).filter(
            AsignacionComite.evaluadorId == usuario.usuarioId,
            AsignacionComite.activo == True
        ).all()
        
        if not asignaciones:
            return {"propuestas": [], "total": 0}
        
        propuestas_data = []
        for asig in asignaciones:
            propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == asig.propuestaId).first()
            if not propuesta:
                continue
            
            # 2. Verificar si ya existe una evaluación para esta asignación
            evaluacion = db.query(Evaluaciones).filter(
                Evaluaciones.propuestaId == propuesta.propuestaId,
                Evaluaciones.evaluadorId == usuario.usuarioId
            ).first()
            
            estado_eval = "Pendiente"
            calificacion = None
            if evaluacion and evaluacion.estadoEvaluacionId:
                estado_obj = db.query(EstadosEvaluacion).filter(EstadosEvaluacion.estadoEvaluacionId == evaluacion.estadoEvaluacionId).first()
                estado_eval = estado_obj.nombreEstadoEvaluacion if estado_obj else "Pendiente"
                calificacion = float(evaluacion.calificacion) if evaluacion.calificacion else None
            
            propuestas_data.append({
                "evaluacionId": evaluacion.evaluacionId if evaluacion else None,
                "propuestaId": propuesta.propuestaId,
                "codigoPropuesta": propuesta.codigoPropuesta,
                "titulo": propuesta.titulo,
                "fechaAsignacion": asig.fechaAsignacion.isoformat() if asig.fechaAsignacion else None,
                "estado": estado_eval,
                "calificacion": calificacion,
                "comentariosAsignacion": asig.comentarios
            })
        return {"propuestas": propuestas_data, "total": len(propuestas_data)}
    except Exception as e:
        print(f"ERROR en bandeja_evaluacion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/evaluador/rubrica/{propuesta_id}")
def obtener_estructura_rubrica(propuesta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.modalidadId).first()
        tipo_rubrica = "basica_aplicada"
        
        if modalidad:
            nombre_modalidad = modalidad.nombreModalidad.lower()
            if "fortalecimiento" in nombre_modalidad:
                tipo_rubrica = "fortalecimiento"
            elif "desarrollo" in nombre_modalidad or "tecnológico" in nombre_modalidad:
                tipo_rubrica = "desarrollo_tecnologico"
        
        estructura_rubrica = obtener_rubrica(tipo_rubrica)
        integrantes = db.query(IntegrantesEquipoPropuesta).filter(IntegrantesEquipoPropuesta.propuestaId == propuesta_id).all()
        horas_totales = sum(integrante.horasSemanales for integrante in integrantes)
        minimo_productos = calcular_minimo_productos(tipo_rubrica, horas_totales)
        
        return {
            "propuestaId": propuesta_id,
            "codigoPropuesta": propuesta.codigoPropuesta,
            "titulo": propuesta.titulo,
            "modalidad": modalidad.nombreModalidad if modalidad else "No especificada",
            "tipoRubrica": tipo_rubrica,
            "nombreRubrica": estructura_rubrica["nombre"],
            "horasSemanalesTotales": float(horas_totales),
            "minimoProductosRequeridos": minimo_productos,
            "estructuraRubrica": estructura_rubrica,
            "escalaResultados": {"recomienda": "≥ 0.70", "noRecomienda": "< 0.70"}
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"ERROR en obtener_estructura_rubrica: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/evaluador/{propuesta_id}/documentos")
def obtener_documentos_propuesta(propuesta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        # Verificar que el evaluador tenga asignada esta propuesta
        asignacion = db.query(AsignacionComite).filter(
            AsignacionComite.propuestaId == propuesta_id,
            AsignacionComite.evaluadorId == usuario.usuarioId,
            AsignacionComite.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(status_code=403, detail="No tiene asignada esta propuesta")
        
        documentos = db.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == propuesta_id, PropuestaDocumentos.activo == True).all()
        documentos_data = [{
            "documentoId": doc.documentoId, 
            "tipoDocumentoId": doc.tipoDocumentoId, 
            "nombreArchivo": doc.nombreArchivo or f"Documento_{doc.tipoDocumentoId}", 
            "urlDescarga": obtener_url_documento(doc.rutaArchivo)
        } for doc in documentos]
        
        return {"propuestaId": propuesta_id, "documentos": documentos_data, "total": len(documentos_data)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en obtener_documentos_propuesta: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# CORREGIDO: Ahora incluye tipoEvaluacionId y estadoEvaluacionId al crear
@router.post("/evaluador/{propuesta_id}/guardar-borrador")
def guardar_borrador(propuesta_id: int, data: dict, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        # 1. Verificar asignación
        asignacion = db.query(AsignacionComite).filter(
            AsignacionComite.propuestaId == propuesta_id,
            AsignacionComite.evaluadorId == usuario.usuarioId,
            AsignacionComite.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(status_code=403, detail="No tiene asignada esta propuesta")
        
        # 2. Buscar o crear evaluación
        evaluacion = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.evaluadorId == usuario.usuarioId
        ).first()
        
        if not evaluacion:
            evaluacion = Evaluaciones(
                propuestaId=propuesta_id,
                evaluadorId=usuario.usuarioId,
                tipoEvaluacionId=DEFAULT_TIPO_EVALUACION_ID,
                estadoEvaluacionId=DEFAULT_ESTADO_BORRADOR_ID,
                fechaEvaluacion=datetime.now(timezone.utc),
                calificacion=0.0,
                usuarioAuditoriaId=usuario.usuarioId,
                ultimaAuditoria=datetime.now(timezone.utc)
            )
            db.add(evaluacion)
            db.flush()  # Para obtener el ID antes del commit
        
        if "calificacionFinal" in data:
            evaluacion.calificacion = data["calificacionFinal"]
            
        db.commit()
        db.refresh(evaluacion)
        
        return {"message": "Borrador guardado correctamente", "evaluacionId": evaluacion.evaluacionId, "propuestaId": propuesta_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"ERROR en guardar_borrador: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.post("/evaluador/{propuesta_id}/enviar-evaluacion")
def enviar_evaluacion(propuesta_id: int, data: dict, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        asignacion = db.query(AsignacionComite).filter(
            AsignacionComite.propuestaId == propuesta_id,
            AsignacionComite.evaluadorId == usuario.usuarioId,
            AsignacionComite.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(status_code=403, detail="No tiene asignada esta propuesta")
        
        evaluacion = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.evaluadorId == usuario.usuarioId
        ).first()
        
        if not evaluacion:
            raise HTTPException(status_code=404, detail="No existe un registro de evaluación para esta asignación")
        
        if "calificacionFinal" in data:
            evaluacion.calificacion = data["calificacionFinal"]
        
        estado_completada = db.query(EstadosEvaluacion).filter(EstadosEvaluacion.nombreEstadoEvaluacion == "Completada").first()
        if estado_completada:
            evaluacion.estadoEvaluacionId = estado_completada.estadoEvaluacionId
        
        evaluacion.fechaEvaluacion = datetime.now(timezone.utc)
        db.commit()
        
        return {
            "message": "Evaluación enviada correctamente", 
            "evaluacionId": evaluacion.evaluacionId, 
            "propuestaId": propuesta_id, 
            "calificacion": evaluacion.calificacion, 
            "recomienda": data.get("recomienda", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"ERROR en enviar_evaluacion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# CORREGIDO: Ahora incluye tipoEvaluacionId y estadoEvaluacionId al crear
@router.post("/evaluaciones/{propuesta_id}", response_model=RespuestaEvaluacionSchema, status_code=status.HTTP_201_CREATED)
def guardar_evaluacion(
    propuesta_id: int, 
    request: EnviarEvaluacionRequest, 
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    try:
        # 1. Verificar asignación primero (más robusto)
        asignacion = db.query(AsignacionComite).filter(
            AsignacionComite.propuestaId == propuesta_id,
            AsignacionComite.evaluadorId == usuario.usuarioId,
            AsignacionComite.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(status_code=403, detail="No tiene asignada esta propuesta para evaluación")

        # 2. Verificar que no haya enviado ya la evaluación
        evaluacion_existente = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.evaluadorId == usuario.usuarioId
        ).first()
        
        if evaluacion_existente and evaluacion_existente.estadoEvaluacionId:
            estado_actual = db.query(EstadosEvaluacion).filter(
                EstadosEvaluacion.estadoEvaluacionId == evaluacion_existente.estadoEvaluacionId
            ).first()
            if estado_actual and estado_actual.nombreEstadoEvaluacion == "Completada":
                raise HTTPException(status_code=400, detail="Esta evaluación ya fue enviada y no puede modificarse")
        
        # 3. Crear o actualizar la evaluación
        if not evaluacion_existente:
           
            evaluacion_existente = Evaluaciones(
                propuestaId=propuesta_id,
                evaluadorId=usuario.usuarioId,
                tipoEvaluacionId=DEFAULT_TIPO_EVALUACION_ID,     
                estadoEvaluacionId=DEFAULT_ESTADO_BORRADOR_ID, 
                fechaEvaluacion=datetime.now(timezone.utc),
                calificacion=0.0,
                usuarioAuditoriaId=usuario.usuarioId,
                ultimaAuditoria=datetime.now(timezone.utc)
            )
            db.add(evaluacion_existente)
            db.flush() # Para obtener el ID
        
        evaluacion_existente.calificacion = request.calificacionFinal
        evaluacion_existente.tipoRecomendacionId = 1 if request.recomienda else 2
        evaluacion_existente.observaciones = request.observaciones or ""
        evaluacion_existente.fechaEvaluacion = datetime.now(timezone.utc)
        
        estado_completada = db.query(EstadosEvaluacion).filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Completada"
        ).first()
        if estado_completada:
            evaluacion_existente.estadoEvaluacionId = estado_completada.estadoEvaluacionId
        
        db.query(DetalleEvaluacion).filter(
            DetalleEvaluacion.evaluacionId == evaluacion_existente.evaluacionId
        ).delete()
        
        for detalle in request.detalles:
            nuevo_detalle = DetalleEvaluacion(
                evaluacionId=evaluacion_existente.evaluacionId,
                criterioId=detalle.criterioId,
                puntajeObtenido=detalle.puntaje,
                justificacion=detalle.justificacion
            )
            db.add(nuevo_detalle)
        
        db.commit()
        db.refresh(evaluacion_existente)
        
        return RespuestaEvaluacionSchema(
            success=True,
            evaluacionId=evaluacion_existente.evaluacionId,
            message="Evaluación guardada correctamente en la base de datos."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error guardando evaluación: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al guardar la evaluación: {str(e)}")


# ============================================================================
# COORDINADOR
# ============================================================================
# ============================================================================
# COORDINADOR
# ============================================================================

@router.get("/coordinador/consolidar/{propuesta_id}")
def consolidar_evaluaciones(propuesta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        evaluaciones = db.query(Evaluaciones).filter(Evaluaciones.propuestaId == propuesta_id).all()
        if not evaluaciones:
            return {
                "propuestaId": propuesta_id, 
                "codigoPropuesta": propuesta.codigoPropuesta, 
                "titulo": propuesta.titulo, 
                "evaluaciones": [], 
                "totalEvaluadores": 0, 
                "calificacionFinal": 0, 
                "recomendacion": "Sin evaluaciones"
            }
        
        calificaciones = [ev.calificacion for ev in evaluaciones if ev.calificacion is not None]
        calificacion_final = sum(calificaciones) / len(calificaciones) if calificaciones else 0
        recomienda = calificacion_final >= 0.70
        
        evaluaciones_data = []
        for ev in evaluaciones:
            evaluador = db.query(Usuario).filter(Usuario.usuarioId == ev.evaluadorId).first()
            evaluaciones_data.append({
                "evaluacionId": ev.evaluacionId,
                "evaluador": f"{evaluador.nombreUsuario} {evaluador.apellido1Usuario}" if evaluador else "Desconocido",
                "calificacion": float(ev.calificacion) if ev.calificacion else 0,
                "fechaEvaluacion": ev.fechaEvaluacion.isoformat() if ev.fechaEvaluacion else None
            })
        
        return {
            "propuestaId": propuesta_id,
            "codigoPropuesta": propuesta.codigoPropuesta,
            "titulo": propuesta.titulo,
            "evaluaciones": evaluaciones_data,
            "totalEvaluadores": len(evaluaciones),
            "calificacionFinal": round(calificacion_final, 2),
            "recomendacion": "RECOMIENDA" if recomienda else "NO RECOMIENDA"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en consolidar_evaluaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.post("/coordinador/{propuesta_id}/emitir-dictamen", status_code=status.HTTP_201_CREATED)
def emitir_dictamen(
    propuesta_id: int, 
    data: dict, 
    db: Session = Depends(get_db), 
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    El coordinador emite el dictamen final:
    1. Crea el registro en la tabla dictamenes
    2. Cambia el estado de la propuesta a EN_CONSEJO
    3. Devuelve confirmación
    """
    try:
        # 1. Validar que la propuesta existe
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        # 2. Extraer y validar datos
        contenido = data.get("contenido", "").strip()
        observaciones = data.get("observaciones", "").strip()
        recomienda = data.get("recomienda", False)
        
        if not contenido:
            raise HTTPException(status_code=400, detail="El contenido del dictamen es obligatorio")
        
        # 3. Verificar que NO exista ya un dictamen para esta propuesta
        dictamen_existente = db.query(Dictamenes).filter(
            Dictamenes.propuestaId == propuesta_id
        ).first()
        
        if dictamen_existente:
            raise HTTPException(
                status_code=400, 
                detail="Ya existe un dictamen emitido para esta propuesta. No se puede emitir un nuevo dictamen."
            )
        
        # 4. Combinar contenido con observaciones
        texto_final = contenido
        if observaciones:
            texto_final += f"\n\n--- OBSERVACIONES ADICIONALES ---\n{observaciones}"
        
        # 5. Determinar el tipo de dictamen (ajusta los IDs según tu tabla tiposdictamen)
        # Ejecuta: SELECT "tipodictamenid", "nombretipodictamen" FROM "tiposdictamen";
        tipo_dictamen_id = 1 if recomienda else 2  # ⚠️ AJUSTA ESTOS IDs
        
        # 6. Crear el registro en la tabla dictamenes
        nuevo_dictamen = Dictamenes(
            propuestaId=propuesta_id,
            tipoDictamenId=tipo_dictamen_id,
            contenido=texto_final,
            usuarioRemitenteId=usuario.usuarioId,
            fechaEmision=datetime.now(timezone.utc),
            creadoEn=datetime.now(timezone.utc),
            usuarioAuditoriaId=usuario.usuarioId,
            ultimaAuditoria=datetime.now(timezone.utc)
        )
        db.add(nuevo_dictamen)
        
        # 7. ✅ CRÍTICO: Cambiar el estado de la propuesta a EN_CONSEJO
        estado_consejo = db.query(EstadosPropuesta).filter(
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CONSEJO"
        ).first()
        
        if estado_consejo:
            propuesta.estadoId = estado_consejo.estadoPropuestaId
        else:
            print("⚠️ ADVERTENCIA: No se encontró el estado 'EN_CONSEJO' en la base de datos")
        
        # 8. Confirmar cambios
        db.commit()
        db.refresh(nuevo_dictamen)
        
        return {
            "success": True,
            "message": f"Dictamen emitido exitosamente: {'RECOMIENDA' if recomienda else 'NO RECOMIENDA'}",
            "dictamenId": nuevo_dictamen.dictamenId,
            "propuestaId": propuesta_id,
            "codigoPropuesta": propuesta.codigoPropuesta,
            "recomienda": recomienda,
            "nuevoEstado": "EN_CONSEJO"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR en emitir_dictamen: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al emitir dictamen: {str(e)}")


@router.get("/propuestas-asignadas")
def propuestas_asignadas(
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint inteligente que adapta la respuesta según el rol.
    NUEVO: Verifica si ya existe un dictamen para desactivar el botón.
    """
    try:
        # 1. Detectar el rol del usuario
        from src.models.roles import UsuarioRol, RolesSistema
        
        rol_usuario = None
        rol_asignado = db.query(UsuarioRol).filter(
            UsuarioRol.usuarioId == usuario.usuarioId,
            UsuarioRol.activo == True
        ).first()
        
        if rol_asignado:
            rol_obj = db.query(RolesSistema).filter(
                RolesSistema.rolId == rol_asignado.rolId
            ).first()
            rol_usuario = rol_obj.nombreRol if rol_obj else None
        
        # 2. Definir roles que pueden ver TODAS las propuestas (gestores)
        roles_gestores = [
            'AsistenteComiteTecnico',
            'CoordinadorComiteTecnico',
            'SuperAdministrador',
            'Administrador'
        ]
        
        es_gestor = rol_usuario in roles_gestores
        
        # 3. Filtrar según el rol
        if es_gestor:
            codigos_estado_comite = ["ENVIADA", "EN_REVISION", "SUBSANACION", "EN_COMITE", "EN_EVALUACION", "ASIGNADA"]
            estados_comite = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.codigoEstadoPropuesta.in_(codigos_estado_comite)
            ).all()
            
            if not estados_comite:
                return {"items": [], "total": 0}
                
            estado_ids = [e.estadoPropuestaId for e in estados_comite]
            query = db.query(Propuesta).filter(Propuesta.estadoId.in_(estado_ids))
            
        else:
            asignaciones = db.query(AsignacionComite).filter(
                AsignacionComite.evaluadorId == usuario.usuarioId,
                AsignacionComite.activo == True
            ).all()
            
            if not asignaciones:
                return {"items": [], "total": 0}
            
            propuesta_ids = [asig.propuestaId for asig in asignaciones]
            query = db.query(Propuesta).filter(Propuesta.propuestaId.in_(propuesta_ids))
        
        # 4. Aplicar búsqueda si existe
        if busqueda:
            query = query.filter(Propuesta.titulo.ilike(f"%{busqueda}%") | Propuesta.codigoPropuesta.ilike(f"%{busqueda}%"))
        
        propuestas = query.all()
        items = []
        
        for p in propuestas:
            # 5. Buscar asignaciones de esta propuesta
            asignaciones_propuesta = db.query(AsignacionComite).filter(
                AsignacionComite.propuestaId == p.propuestaId,
                AsignacionComite.activo == True
            ).all()
            
            evaluadores_nombres = []
            for asig in asignaciones_propuesta:
                evaluador = db.query(Usuario).filter(Usuario.usuarioId == asig.evaluadorId).first()
                if evaluador:
                    evaluadores_nombres.append(f"{evaluador.nombreUsuario} {evaluador.apellido1Usuario}")
            
            total_asignadas = len(asignaciones_propuesta)
            
            # 🐛 LOGS DE DEBUG - AGREGA ESTO:
            print(f"\n{'='*60}")
            print(f"🔍 Procesando propuesta {p.propuestaId} ({p.codigoPropuesta})")
            print(f"📊 Total asignaciones: {total_asignadas}")
            
            # Verificar si existe dictamen
            try:
                dictamen_existente = db.query(Dictamenes).filter(
                    Dictamenes.propuestaId == p.propuestaId
                ).first()
                
                ya_tiene_dictamen = dictamen_existente is not None
                
                print(f"📝 Dictamen existente: {dictamen_existente}")
                print(f"✅ Ya tiene dictamen: {ya_tiene_dictamen}")
                
                if ya_tiene_dictamen:
                    print(f"🎯 Estado asignado: 'Dictamen Emitido'")
            except Exception as e:
                print(f"❌ ERROR al consultar dictamenes: {str(e)}")
                ya_tiene_dictamen = False
                print(f"⚠️ Estado por error: 'Completada' (fallback)")
            
            # 7. Determinar el estado para la UI
            if es_gestor:
                if total_asignadas == 0:
                    estado_eval = "Pendiente de asignación"
                elif ya_tiene_dictamen:
                    estado_eval = "Dictamen Emitido"
                else:
                    # Contar evaluaciones completadas
                    evaluaciones_completadas = db.query(Evaluaciones).join(EstadosEvaluacion).filter(
                        Evaluaciones.propuestaId == p.propuestaId,
                        EstadosEvaluacion.nombreEstadoEvaluacion.ilike("%completada%")
                    ).count()
                    
                    print(f"📈 Evaluaciones completadas: {evaluaciones_completadas}/{total_asignadas}")
                    
                    if evaluaciones_completadas == total_asignadas:
                        estado_eval = "Completada"
                        print(f"🎯 Estado asignado: 'Completada'")
                    elif evaluaciones_completadas > 0:
                        estado_eval = "En progreso"
                        print(f"🎯 Estado asignado: 'En progreso'")
                    else:
                        estado_eval = "Pendiente de evaluación"
                        print(f"🎯 Estado asignado: 'Pendiente de evaluación'")
            else:
                # Para el Evaluador: mostrar SU estado personal
                evaluacion = db.query(Evaluaciones).filter(
                    Evaluaciones.propuestaId == p.propuestaId,
                    Evaluaciones.evaluadorId == usuario.usuarioId
                ).first()
                
                estado_eval = "Pendiente de evaluación"
                if evaluacion and evaluacion.estadoEvaluacionId:
                    estado_obj = db.query(EstadosEvaluacion).filter(
                        EstadosEvaluacion.estadoEvaluacionId == evaluacion.estadoEvaluacionId
                    ).first()
                    if estado_obj:
                        estado_eval = estado_obj.nombreEstadoEvaluacion
            
            items.append({
                "propuestaId": p.propuestaId,
                "codigoPropuesta": p.codigoPropuesta,
                "titulo": p.titulo,
                "evaluadores": ", ".join(evaluadores_nombres) if evaluadores_nombres else "Sin asignar",
                "totalEvaluadores": total_asignadas,
                "fechaAsignacion": p.fechaCreacion.isoformat() if p.fechaCreacion else None,
                "estado": estado_eval,
                "yaTieneDictamen": ya_tiene_dictamen
            })
            print(f"{'='*60}\n")
        
        return {"items": items, "total": len(items)}
    except Exception as e:
        print(f"ERROR en propuestas_asignadas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    
# ============================================================================
# ASISTENTE DE IA
# ============================================================================
@router.post("/ia/analizar-documento/{propuesta_id}", response_model=AnalisisDocumentoIAResponse)
def analizar_documento_completo_ia(
    propuesta_id: int,
    request: AnalisisDocumentoIARequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    try:
        print(f"🤖 Iniciando análisis con Cloudflare AI para propuesta {propuesta_id}")
        resultado = analizar_documento_completo(
            propuesta_id=propuesta_id,
            tipo_modalidad=request.tipoModalidad,
            criterios_reales_por_seccion=request.criteriosPorSeccion
        )
        
        if "error" in resultado:
            raise HTTPException(status_code=500, detail=resultado["error"])
        
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR en analizar_documento_completo_ia: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al analizar documento: {str(e)}")

    
@router.get("/evaluador/expediente/{propuesta_id}")
def obtener_expediente_completo(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    try:
        rol_usuario = usuario.rol if hasattr(usuario, 'rol') else None
        
        if not rol_usuario:
            from src.models.roles import UsuarioRol, RolesSistema
            rol_asignado = db.query(UsuarioRol).filter(UsuarioRol.usuarioId == usuario.usuarioId).first()
            if rol_asignado:
                rol_obj = db.query(RolesSistema).filter(RolesSistema.rolId == rol_asignado.rolId).first()
                rol_usuario = rol_obj.nombreRol if rol_obj else None
        
        roles_que_requieren_evaluacion = ['MiembroComiteTecnico', 'DirectorEscuela']
        requiere_evaluacion_asignada = rol_usuario in roles_que_requieren_evaluacion
        
        # 3. ✅ NUEVO: Si requiere evaluación, verificar que esté ASIGNADO en la nueva tabla
        if requiere_evaluacion_asignada:
            asignacion = db.query(AsignacionComite).filter(
                AsignacionComite.propuestaId == propuesta_id,
                AsignacionComite.evaluadorId == usuario.usuarioId,
                AsignacionComite.activo == True
            ).first()
            
            if not asignacion:
                raise HTTPException(status_code=403, detail="No tiene asignada esta propuesta para evaluación")
        
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        investigador = db.query(Usuario).filter(Usuario.usuarioId == propuesta.investigadorCoordId).first()
        escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.escuelaId).first()
        modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.modalidadId).first()
        
        estado_propuesta = None
        if propuesta.estadoId:
            estado_propuesta = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == propuesta.estadoId).first()
        
        documentos = db.query(PropuestaDocumentos).filter(
            PropuestaDocumentos.propuestaId == propuesta_id,
            PropuestaDocumentos.activo == True
        ).all()
        
        documentos_data = []
        for doc in documentos:
            tipo_doc = db.query(TiposDocumento).filter(TiposDocumento.tipoDocumentoId == doc.tipoDocumentoId).first()
            documentos_data.append({
                "documentoId": doc.documentoId,
                "tipoDocumentoId": doc.tipoDocumentoId,
                "nombreTipo": tipo_doc.nombreTipoDocumento if tipo_doc else f"Tipo {doc.tipoDocumentoId}",
                "nombreArchivo": doc.nombreArchivo or f"Documento_{doc.tipoDocumentoId}",
                "urlDescarga": obtener_url_documento(doc.rutaArchivo) if hasattr(doc, 'rutaArchivo') and doc.rutaArchivo else None
            })
        
        integrantes = db.query(IntegrantesEquipoPropuesta).filter(IntegrantesEquipoPropuesta.propuestaId == propuesta_id).all()
        
        integrantes_data = []
        total_horas = 0
        for intg in integrantes:
            usuario_intg = db.query(Usuario).filter(Usuario.usuarioId == intg.usuarioId).first()
            horas = float(intg.horasSemanales) if hasattr(intg, 'horasSemanales') and intg.horasSemanales else 0
            total_horas += horas
            
            es_coordinador = (intg.usuarioId == propuesta.investigadorCoordId)
            
            integrantes_data.append({
                "usuarioId": intg.usuarioId,
                "nombre": f"{usuario_intg.nombreUsuario} {usuario_intg.apellido1Usuario}" if usuario_intg else "Desconocido",
                "esCoordinador": es_coordinador,
                "rol": "Coordinador" if es_coordinador else "Investigador",
                "horasSemanales": horas
            })
        
        ya_evaluado = False
        if rol_usuario in ['MiembroComiteTecnico', 'DirectorEscuela']:
            eval_existente = db.query(Evaluaciones).filter(
                Evaluaciones.propuestaId == propuesta_id,
                Evaluaciones.evaluadorId == usuario.usuarioId
            ).first()
            
            if eval_existente and eval_existente.estadoEvaluacionId:
                estado_eval = db.query(EstadosEvaluacion).filter(EstadosEvaluacion.estadoEvaluacionId == eval_existente.estadoEvaluacionId).first()
                if estado_eval and estado_eval.nombreEstadoEvaluacion == "Completada":
                    ya_evaluado = True

        presupuesto_total = getattr(propuesta, 'presupuestoSolicitado', 0) or 0
        
        return {
            "propuestaId": propuesta.propuestaId,
            "codigoPropuesta": propuesta.codigoPropuesta or f"FVIE-{propuesta.propuestaId}",
            "titulo": propuesta.titulo,
            "resumen": getattr(propuesta, 'resumen', ''),
            "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "Sin asignar",
            "investigadorCoordId": propuesta.investigadorCoordId,
            "escuela": escuela.nombreEscuela if escuela else "Sin escuela",
            "modalidad": modalidad.nombreModalidad if modalidad else "No especificada",
            "periodo": "2027-2028",
            "presupuestoSolicitado": presupuesto_total,
            "totalHorasSemanales": total_horas,
            "estado": estado_propuesta.nombreEstadoPropuesta if estado_propuesta else "Desconocido",
            "fechaEnvio": propuesta.fechaEnvio.isoformat() if getattr(propuesta, 'fechaEnvio', None) else None,
            "documentos": documentos_data,
            "integrantes": integrantes_data,
            "totalIntegrantes": len(integrantes_data),
            "yaEvaluado": ya_evaluado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en obtener_expediente_completo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")