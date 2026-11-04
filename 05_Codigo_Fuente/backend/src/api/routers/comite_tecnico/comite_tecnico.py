# src/api/routers/comite_tecnico.py
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from src.database import get_db
from src.models.usuarios import Usuario
from src.models.propuestas import Propuesta
from src.models.catalogos import Modalidades
from src.models.convocatorias import EstadosPropuesta
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.evaluaciones import Evaluaciones, EstadosEvaluacion, DetalleEvaluacion
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta
from src.models.escuelas import Escuela
from src.models.catalogos import Modalidades
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion 
from src.utils.dependencias import obtener_usuario_actual
from src.utils.s3_client import obtener_url_documento
from src.api.schemas.comite_tecnico.ia_schemas import AnalisisIARequest
from src.api.schemas.comite_tecnico.evaluacion import EnviarEvaluacionRequest, RespuestaEvaluacionSchema
from src.services.comite_tecnico.ia_service import analizar_documento_completo
from src.services.comite_tecnico.rubricas_data import obtener_rubrica, calcular_minimo_productos

router = APIRouter(prefix="/api/comite-tecnico", tags=["Comité Técnico"])

# ============================================================================
# SCHEMAS (Validación de datos de entrada)
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
        # Ajusta estos códigos según lo que veas en tu BD
        # Ejemplo: si tus estados son "ENVIADA", "EN_REVISION", "SUBSANACION"
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
        tipos_requeridos_ids = [1, 2, 3, 5]  # Ajusta según tus tiposDocumento

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
    """
    TC-5.1.3: El asistente solicita subsanación de documentos faltantes.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    # 1. Cambiar estado de la propuesta a "Subsanación Pendiente" 
    # (Ajusta "SUBSANACION" al código real que tengas en tu tabla EstadosPropuesta)
    estado_subsanacion = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta == "SUBSANACION"
    ).first()
    
    if estado_subsanacion:
        propuesta.estadoId = estado_subsanacion.estadoPropuestaId
        
    # 2. Crear el registro de subsanación
    # NOTA: Usamos 'gestoraVIEId' para almacenar el ID del Asistente que hace la solicitud, 
    # ya que es el campo de usuario disponible en tu modelo Subsanaciones.
    nueva_subsanacion = Subsanaciones(
        propuestaId=propuesta_id,
        gestoraVIEId=usuario.usuarioId, 
        comentarioGestora=solicitud.detalle,
        estadoSubsanacionId=1, # Asumiendo que 1 = "Pendiente de respuesta del investigador"
        fechaSolicitud=datetime.now(timezone.utc)
    )
    
    db.add(nueva_subsanacion)
    db.commit()
    db.refresh(nueva_subsanacion)
    
    # TODO: Aquí iría la llamada a tu servicio de notificaciones por correo
    
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
    """
    TC-5.1.4: El asistente aprueba que la documentación está completa.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    # Cambiar estado a "En Evaluación" o "Asignada" para que el coordinador la vea
    estado_evaluacion = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta.in_(["EN_EVALUACION", "ASIGNADA"])
    ).first()
    
    if estado_evaluacion:
        propuesta.estadoId = estado_evaluacion.estadoPropuestaId
        db.commit()
        
    return {"message": "Completitud aprobada. Propuesta enviada al Coordinador."}


@router.post("/asistente/{propuesta_id}/asignar-evaluadores")
def asignar_evaluadores(propuesta_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    # TODO: Implementar lógica real de asignación
    return {"message": f"Evaluadores asignados a propuesta {propuesta_id}", "propuestaId": propuesta_id}


@router.get("/asistente/propuestas-asignadas")
def propuestas_asignadas(
    evaluador: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    try:
        propuesta_ids_con_eval = [row[0] for row in db.query(Evaluaciones.propuestaId).distinct().all()]
        if not propuesta_ids_con_eval:
            return {"items": [], "total": 0}
        
        query = db.query(Propuesta).filter(Propuesta.propuestaId.in_(propuesta_ids_con_eval))
        if busqueda:
            query = query.filter(Propuesta.titulo.ilike(f"%{busqueda}%") | Propuesta.codigoPropuesta.ilike(f"%{busqueda}%"))
        
        propuestas = query.all()
        items = []
        for p in propuestas:
            evaluadores_query = db.query(Usuario).join(Evaluaciones, Evaluaciones.evaluadorId == Usuario.usuarioId).filter(Evaluaciones.propuestaId == p.propuestaId).all()
            evaluadores_nombres = [f"{u.nombreUsuario} {u.apellido1Usuario}" for u in evaluadores_query]
            
            ultima_evaluacion = db.query(Evaluaciones).filter(Evaluaciones.propuestaId == p.propuestaId).order_by(Evaluaciones.fechaEvaluacion.desc()).first()
            estado_eval = "Pendiente"
            if ultima_evaluacion and ultima_evaluacion.estadoEvaluacionId:
                estado_obj = db.query(EstadosEvaluacion).filter(EstadosEvaluacion.estadoEvaluacionId == ultima_evaluacion.estadoEvaluacionId).first()
                estado_eval = estado_obj.nombreEstadoEvaluacion if estado_obj else "Pendiente"
            
            items.append({
                "propuestaId": p.propuestaId,
                "codigoPropuesta": p.codigoPropuesta,
                "titulo": p.titulo,
                "evaluadores": ", ".join(evaluadores_nombres) if evaluadores_nombres else "Sin asignar",
                "totalEvaluadores": len(evaluadores_nombres),
                "fechaAsignacion": p.fechaCreacion.isoformat() if p.fechaCreacion else None,
                "estado": estado_eval
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
        evaluaciones = db.query(Evaluaciones).filter(Evaluaciones.evaluadorId == usuario.usuarioId).all()
        if not evaluaciones:
            return {"propuestas": [], "total": 0}
        
        propuestas_data = []
        for ev in evaluaciones:
            propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == ev.propuestaId).first()
            if not propuesta:
                continue
            
            estado_eval = "Pendiente"
            if ev.estadoEvaluacionId:
                estado_obj = db.query(EstadosEvaluacion).filter(EstadosEvaluacion.estadoEvaluacionId == ev.estadoEvaluacionId).first()
                estado_eval = estado_obj.nombreEstadoEvaluacion if estado_obj else "Pendiente"
            
            propuestas_data.append({
                "evaluacionId": ev.evaluacionId,
                "propuestaId": propuesta.propuestaId,
                "codigoPropuesta": propuesta.codigoPropuesta,
                "titulo": propuesta.titulo,
                "fechaAsignacion": ev.fechaEvaluacion.isoformat() if ev.fechaEvaluacion else None,
                "estado": estado_eval,
                "calificacion": float(ev.calificacion) if ev.calificacion else None
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
        evaluacion = db.query(Evaluaciones).filter(Evaluaciones.propuestaId == propuesta_id, Evaluaciones.evaluadorId == usuario.usuarioId).first()
        if not evaluacion:
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


@router.post("/evaluador/{propuesta_id}/guardar-borrador")
def guardar_borrador(propuesta_id: int, data: dict, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        evaluacion = db.query(Evaluaciones).filter(Evaluaciones.propuestaId == propuesta_id, Evaluaciones.evaluadorId == usuario.usuarioId).first()
        if not evaluacion:
            raise HTTPException(status_code=404, detail="Evaluación no encontrada")
        
        if "calificacionFinal" in data:
            evaluacion.calificacion = data["calificacionFinal"]
        evaluacion.fechaEvaluacion = datetime.now(timezone.utc)
        db.commit()
        
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
        evaluacion = db.query(Evaluaciones).filter(Evaluaciones.propuestaId == propuesta_id, Evaluaciones.evaluadorId == usuario.usuarioId).first()
        if not evaluacion:
            raise HTTPException(status_code=404, detail="Evaluación no encontrada")
        
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


@router.post(
    "/evaluaciones/{propuesta_id}", 
    response_model=RespuestaEvaluacionSchema,
    status_code=status.HTTP_201_CREATED
)
def guardar_evaluacion(
    propuesta_id: int, 
    request: EnviarEvaluacionRequest, 
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)  # ← AGREGAR ESTO
):
    """Guarda la evaluación final y sus detalles usando el ORM."""
    try:
        # 1. Verificar que el evaluador tenga asignada la propuesta
        evaluacion_existente = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.evaluadorId == usuario.usuarioId
        ).first()
        
        if not evaluacion_existente:
            raise HTTPException(
                status_code=403, 
                detail="No tiene asignada esta propuesta para evaluación"
            )
        
        # 2. Verificar que no haya enviado ya la evaluación
        if evaluacion_existente.estadoEvaluacionId:
            estado_actual = db.query(EstadosEvaluacion).filter(
                EstadosEvaluacion.estadoEvaluacionId == evaluacion_existente.estadoEvaluacionId
            ).first()
            if estado_actual and estado_actual.nombreEstadoEvaluacion == "Completada":
                raise HTTPException(
                    status_code=400, 
                    detail="Esta evaluación ya fue enviada y no puede modificarse"
                )
        
        # 3. Actualizar la evaluación existente (NO crear una nueva)
        evaluacion_existente.calificacion = request.calificacionFinal
        evaluacion_existente.tipoRecomendacionId = 1 if request.recomienda else 2
        evaluacion_existente.observaciones = request.observaciones or ""
        evaluacion_existente.fechaEvaluacion = datetime.now(timezone.utc)
        
        # 4. Marcar como completada
        estado_completada = db.query(EstadosEvaluacion).filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Completada"
        ).first()
        if estado_completada:
            evaluacion_existente.estadoEvaluacionId = estado_completada.estadoEvaluacionId
        
        # 5. Eliminar detalles anteriores si existen
        db.query(DetalleEvaluacion).filter(
            DetalleEvaluacion.evaluacionId == evaluacion_existente.evaluacionId
        ).delete()
        
        # 6. Crear los nuevos detalles
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error al guardar la evaluación: {str(e)}"
        )

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


@router.post("/coordinador/{propuesta_id}/emitir-dictamen")
def emitir_dictamen(propuesta_id: int, data: dict, db: Session = Depends(get_db), usuario: Usuario = Depends(obtener_usuario_actual)):
    try:
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        contenido = data.get("contenido", "")
        recomienda = data.get("recomienda", False)
        if not contenido:
            raise HTTPException(status_code=400, detail="El contenido del dictamen es obligatorio")
        
        # TODO: Aquí deberías cambiar el estado de la propuesta a "APROBADA_COMITE" o "RECHAZADA_COMITE"
        
        return {
            "message": f"Dictamen emitido {'recomendando' if recomienda else 'no recomendando'} la propuesta",
            "propuestaId": propuesta_id,
            "codigoPropuesta": propuesta.codigoPropuesta,
            "recomienda": recomienda,
            "contenido": contenido[:100] + "..." if len(contenido) > 100 else contenido
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en emitir_dictamen: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


# ============================================================================
# ASISTENTE DE IA
# ============================================================================
from src.api.schemas.comite_tecnico.ia_schemas import (
    AnalisisIARequest, 
    AnalisisIAResponse,
    AnalisisDocumentoIARequest,
    AnalisisDocumentoIAResponse,
    SeccionResultado,
    CriterioResultado
)

@router.post("/ia/analizar-documento/{propuesta_id}", response_model=AnalisisDocumentoIAResponse)
def analizar_documento_completo_ia(
    propuesta_id: int,
    request: AnalisisDocumentoIARequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Analiza el documento completo usando tu ia_service.py (Ollama).
    Recibe la modalidad y los nombres de los criterios por sección (listas de strings).
    """
    try:
        print(f"🤖 Iniciando análisis con Ollama para propuesta {propuesta_id}")
        print(f"📋 Modalidad recibida: {request.tipoModalidad}")
        print(f"📊 Secciones a evaluar: {list(request.criteriosPorSeccion.keys())}")
        
        # Llamar directamente a tu servicio, que ya está perfectamente diseñado para esto
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
    """
    Obtiene el expediente completo.
    - MiembroComiteTecnico y DirectorEscuela: solo si tienen evaluación asignada
    - CoordinadorComiteTecnico y AsistenteComiteTecnico: acceso libre
    """
    try:
        # 1. Verificar rol del usuario
        rol_usuario = usuario.rol if hasattr(usuario, 'rol') else None
        
        # Si no tenemos el rol directamente, buscarlo en la tabla de roles
        if not rol_usuario:
            from src.models.roles import UsuarioRol
            rol_asignado = db.query(UsuarioRol).filter(
                UsuarioRol.usuarioId == usuario.usuarioId
            ).first()
            if rol_asignado:
                from src.models.roles import RolesSistema
                rol_obj = db.query(RolesSistema).filter(
                    RolesSistema.rolId == rol_asignado.rolId
                ).first()
                rol_usuario = rol_obj.nombreRol if rol_obj else None
        
        # 2. Definir roles que requieren evaluación asignada
        roles_que_requieren_evaluacion = ['MiembroComiteTecnico', 'DirectorEscuela']
        requiere_evaluacion_asignada = rol_usuario in roles_que_requieren_evaluacion
        
        # 3. Si requiere evaluación, verificar que esté asignada
        if requiere_evaluacion_asignada:
            evaluacion = db.query(Evaluaciones).filter(
                Evaluaciones.propuestaId == propuesta_id,
                Evaluaciones.evaluadorId == usuario.usuarioId
            ).first()
            
            if not evaluacion:
                raise HTTPException(
                    status_code=403, 
                    detail="No tiene asignada esta propuesta para evaluación"
                )
        
        # 4. Obtener la propuesta
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        # 5. Obtener datos relacionados
        investigador = db.query(Usuario).filter(Usuario.usuarioId == propuesta.investigadorCoordId).first()
        escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.escuelaId).first()
        modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.modalidadId).first()
        
        # 6. Obtener estado de la propuesta
        estado_propuesta = None
        if propuesta.estadoId:
            estado_propuesta = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.estadoPropuestaId == propuesta.estadoId
            ).first()
        
        # 7. Obtener documentos
        documentos = db.query(PropuestaDocumentos).filter(
            PropuestaDocumentos.propuestaId == propuesta_id,
            PropuestaDocumentos.activo == True
        ).all()
        
        documentos_data = []
        for doc in documentos:
            tipo_doc = db.query(TiposDocumento).filter(
                TiposDocumento.tipoDocumentoId == doc.tipoDocumentoId
            ).first()
            documentos_data.append({
                "documentoId": doc.documentoId,
                "tipoDocumentoId": doc.tipoDocumentoId,
                "nombreTipo": tipo_doc.nombreTipoDocumento if tipo_doc else f"Tipo {doc.tipoDocumentoId}",
                "nombreArchivo": doc.nombreArchivo or f"Documento_{doc.tipoDocumentoId}",
                "urlDescarga": obtener_url_documento(doc.rutaArchivo) if hasattr(doc, 'rutaArchivo') and doc.rutaArchivo else None
            })
        
        # 8. Obtener integrantes del equipo
                # ... (código anterior del endpoint se mantiene igual) ...
        
        # 8. Obtener integrantes del equipo
        integrantes = db.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id
        ).all()
        
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
        
        # 9. VERIFICAR SI EL USUARIO YA EVALUÓ ESTA PROPUESTA
        ya_evaluado = False
        if rol_usuario in ['MiembroComiteTecnico', 'DirectorEscuela']:
            eval_existente = db.query(Evaluaciones).filter(
                Evaluaciones.propuestaId == propuesta_id,
                Evaluaciones.evaluadorId == usuario.usuarioId
            ).first()
            
            if eval_existente and eval_existente.estadoEvaluacionId:
                estado_eval = db.query(EstadosEvaluacion).filter(
                    EstadosEvaluacion.estadoEvaluacionId == eval_existente.estadoEvaluacionId
                ).first()
                if estado_eval and estado_eval.nombreEstadoEvaluacion == "Completada":
                    ya_evaluado = True

        # 10. Calcular presupuesto total
        presupuesto_total = getattr(propuesta, 'presupuestoSolicitado', 0) or 0
        
        # 11. Armar respuesta
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
            "yaEvaluado": ya_evaluado  # <-- NUEVO CAMPO
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en obtener_expediente_completo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")