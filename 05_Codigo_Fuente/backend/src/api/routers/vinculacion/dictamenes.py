from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.models.usuarios import Usuario
from src.utils.dependencias import obtener_usuario_activo, requerir_rol
from src.api.schemas.vinculacion.dictamenes import (
    PropuestaVinculacionResumen,
    PropuestaVinculacionDetalle,
    TipoDictamenResponse,
    DictamenCreate,
    DictamenResponse
)
from src.services.vinculacion.vinculacion_service import (
    listar_propuestas_para_vinculacion,
    obtener_propuesta_visor_vinculacion,
    listar_tipos_dictamen,
    crear_dictamen_vinculacion,
    obtener_dictamen_por_propuesta,
    listar_dictamenes_vinculacion
)

router = APIRouter(
    prefix="/vinculacion",
    tags=["Módulo 2: Vinculación (Evaluación Temprana de PI y TRL)"]
)


@router.get(
    "/propuestas",
    response_model=List[PropuestaVinculacionResumen],
    summary="Listar propuestas para evaluación de Vinculación",
    description="Retorna las propuestas enviadas para análisis de Propiedad Intelectual, TRL e innovación."
)
def listar_propuestas(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return listar_propuestas_para_vinculacion(db=db)


@router.get(
    "/propuestas/{propuesta_id}",
    response_model=PropuestaVinculacionDetalle,
    summary="Expediente de propuesta para visor de Vinculación",
    description="Retorna el resumen técnico, TRL actual vs proyectado, metodología y declaraciones de PI."
)
def consultar_propuesta_vinculacion(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_propuesta_visor_vinculacion(db=db, propuesta_id=propuesta_id)


@router.get(
    "/tipos-dictamen",
    response_model=List[TipoDictamenResponse],
    summary="Listar tipos de dictamen disponibles",
    description="Retorna los tipos de dictámenes técnicos registrados en el sistema."
)
def obtener_tipos_dictamen(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return listar_tipos_dictamen(db=db)


@router.post(
    "/dictamenes",
    response_model=DictamenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir Dictamen Técnico de Vinculación",
    description="Registra formalmente el dictamen técnico de vinculación para una propuesta."
)
def registrar_dictamen(
    datos: DictamenCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return crear_dictamen_vinculacion(
        db=db,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )


@router.get(
    "/propuestas/{propuesta_id}/dictamen",
    response_model=DictamenResponse,
    summary="Consultar dictamen emitido de una propuesta",
    description="Retorna el dictamen de vinculación asociado a la propuesta especificada."
)
def consultar_dictamen(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_dictamen_por_propuesta(db=db, propuesta_id=propuesta_id)


@router.get(
    "/dictamenes",
    response_model=List[DictamenResponse],
    summary="Listar todos los dictámenes emitidos",
    description="Retorna la lista de dictámenes técnicos emitidos por el Centro de Vinculación."
)
def listar_dictamenes(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return listar_dictamenes_vinculacion(db=db)

