from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.consejo_escuela import propuestas_service
from src.services.consejo_escuela.propuestas import (
    PropuestaConsejoRespuesta,
)
from src.utils.dependencias import requerir_rol


router = APIRouter(
    prefix="/consejo-escuela/propuestas",
    tags=["Consejo de Escuela - Propuestas"],
)


ROLES_CONSULTA = [
    "AsistenteConsejoEscuela",
    "ConsejoProfesores",
    "DirectorEscuela",
]


@router.get(
    "/",
    response_model=list[PropuestaConsejoRespuesta],
    dependencies=[Depends(requerir_rol(ROLES_CONSULTA))],
)
def listar_propuestas_en_consejo(db: Session = Depends(get_db)):
    return propuestas_service.listar_propuestas_en_consejo(db)


@router.get(
    "/{propuesta_id}",
    response_model=PropuestaConsejoRespuesta,
    dependencies=[Depends(requerir_rol(ROLES_CONSULTA))],
)
def obtener_propuesta_en_consejo(
    propuesta_id: int,
    db: Session = Depends(get_db),
):
    propuesta = propuestas_service.obtener_propuesta_en_consejo(
        db,
        propuesta_id,
    )

    if propuesta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "La propuesta no existe o no se encuentra "
                "en la etapa de Consejo de Escuela."
            ),
        )

    return propuesta