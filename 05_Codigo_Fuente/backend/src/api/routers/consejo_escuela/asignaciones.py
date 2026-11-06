
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.usuarios import Usuario
from src.services.consejo_escuela import asignaciones_service
from src.api.schemas.consejo_escuela.asignaciones import (
    AsignacionConsejoCrear,
)
from src.utils.dependencias import requerir_rol


router = APIRouter(
    prefix="/consejo-escuela/asignaciones",
    tags=["Consejo de Escuela - Asignaciones"],
)


ROLES_CONSULTA = [
    "AsistenteConsejoEscuela",
    "ConsejoProfesores",
    "DirectorEscuela",
]

ROL_ASISTENTE = ["AsistenteConsejoEscuela"]


def convertir_error(error: ValueError):
    mensaje = str(error)

    if "no existe" in mensaje.lower():
        codigo = status.HTTP_404_NOT_FOUND
    elif "asignación" in mensaje.lower():
        codigo = status.HTTP_409_CONFLICT
    else:
        codigo = status.HTTP_400_BAD_REQUEST

    raise HTTPException(
        status_code=codigo,
        detail=mensaje,
    )


@router.get(
    "/miembros",
    dependencies=[Depends(requerir_rol(ROL_ASISTENTE))],
)
def listar_miembros_consejo(
    db: Session = Depends(get_db),
):
    """
    Lista los usuarios activos que tienen el rol ConsejoProfesores.
    """
    return asignaciones_service.listar_miembros_consejo(db)


@router.get(
    "/propuesta/{propuesta_id}",
    dependencies=[Depends(requerir_rol(ROLES_CONSULTA))],
)
def listar_asignaciones(
    propuesta_id: int,
    db: Session = Depends(get_db),
):
    """
    Consulta los miembros asignados a una propuesta.
    """
    try:
        return asignaciones_service.listar_asignaciones_propuesta(
            db,
            propuesta_id,
        )
    except ValueError as error:
        convertir_error(error)


@router.post(
    "/propuesta/{propuesta_id}",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_rol(ROL_ASISTENTE))],
)
def asignar_miembros(
    propuesta_id: int,
    datos: AsignacionConsejoCrear,
    usuario_actual: Usuario = Depends(
        requerir_rol(ROL_ASISTENTE)
    ),
    db: Session = Depends(get_db),
):
    """
    Asigna miembros del Consejo de Profesores a una propuesta.
    """
    try:
        return asignaciones_service.asignar_miembros_propuesta(
            db=db,
            propuesta_id=propuesta_id,
            usuario_ids=datos.usuarioIds,
            asignado_por_id=usuario_actual.usuarioId,
        )
    except ValueError as error:
        convertir_error(error)


@router.delete(
    "/propuesta/{propuesta_id}/miembro/{usuario_id}",
    dependencies=[Depends(requerir_rol(ROL_ASISTENTE))],
)
def quitar_miembro(
    propuesta_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
):
    """
    Desactiva la asignación de un miembro a una propuesta.
    """
    try:
        return asignaciones_service.quitar_asignacion(
            db,
            propuesta_id,
            usuario_id,
        )
    except ValueError as error:
        convertir_error(error)
