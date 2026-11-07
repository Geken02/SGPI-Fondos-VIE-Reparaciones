# src/api/routers/comite_tecnico/asignacion.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuestas import Propuesta
from src.models.asignaciones_comite import AsignacionComite  
router = APIRouter(prefix="/api/comite-tecnico", tags=["Asignación"])

class AsignarEvaluadorRequest(BaseModel):
    propuestaId: int
    evaluadorId: int
    comentarios: Optional[str] = None

@router.post("/asignar-evaluador")
def asignar_evaluador(
    datos: AsignarEvaluadorRequest,
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Asigna una propuesta a un evaluador del comité técnico
    """
    # 1. Validar que la propuesta existe
    propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == datos.propuestaId).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    # 2. Validar que el evaluador existe
    evaluador = sesion.query(Usuario).filter(
        Usuario.usuarioId == datos.evaluadorId,
        Usuario.activo == True
    ).first()
    
    if not evaluador:
        raise HTTPException(status_code=404, detail="Evaluador no encontrado")
    
    # 3. Verificar que no exista una asignación activa para esta propuesta
    asignacion_existente = sesion.query(AsignacionComite).filter(
        AsignacionComite.propuestaId == datos.propuestaId,
        AsignacionComite.activo == True
    ).first()
    
    if asignacion_existente:
        raise HTTPException(status_code=400, detail="La propuesta ya está asignada a un evaluador")
    
    # 4. Crear la asignación
    nueva_asignacion = AsignacionComite(
        propuestaId=datos.propuestaId,
        evaluadorId=datos.evaluadorId,
        asignadoPorId=usuario_actual.usuarioId,
        fechaAsignacion=datetime.now(timezone.utc),
        comentarios=datos.comentarios,
        activo=True,
        usuarioAuditoriaId=usuario_actual.usuarioId,
        ultimaAuditoria=datetime.now(timezone.utc)
    )
    
    sesion.add(nueva_asignacion)
    sesion.commit()
    sesion.refresh(nueva_asignacion)
    
    return {
        "mensaje": "Propuesta asignada exitosamente",
        "asignacionId": nueva_asignacion.asignacionId,
        "propuestaId": datos.propuestaId,
        "evaluadorId": datos.evaluadorId
    }

@router.get("/evaluadores-disponibles")
def listar_evaluadores_disponibles(
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Lista los evaluadores disponibles (miembros del comité técnico activos)
    """
    evaluadores = sesion.query(Usuario).filter(
        Usuario.activo == True
    ).all()
    
    return [
        {
            "usuarioId": e.usuarioId,
            "nombre": f"{e.nombre} {e.apellidos}" if hasattr(e, 'apellidos') else e.nombre,
            "correo": e.correo,
            "escuela": e.escuela.nombre if hasattr(e, 'escuela') and e.escuela else None
        }
        for e in evaluadores
    ]

@router.get("/propuestas-asignadas/{evaluador_id}")
def listar_propuestas_asignadas(
    evaluador_id: int,
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Lista todas las propuestas asignadas a un evaluador específico
    """
    asignaciones = sesion.query(AsignacionComite).join(Propuesta).filter(
        AsignacionComite.evaluadorId == evaluador_id,
        AsignacionComite.activo == True,
        Propuesta.activo == True
    ).all()
    
    return [
        {
            "asignacionId": a.asignacionId,
            "propuestaId": a.propuestaId,
            "codigoPropuesta": a.propuesta.codigoPropuesta,
            "titulo": a.propuesta.titulo,
            "fechaAsignacion": a.fechaAsignacion,
            "comentarios": a.comentarios,
            "estado": a.propuesta.estado
        }
        for a in asignaciones
    ]