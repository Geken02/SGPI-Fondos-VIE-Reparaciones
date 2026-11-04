
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.api.schemas.consejo_escuela.acuerdos import (
    AcuerdoCrear,
    AcuerdoActualizar,
    AcuerdoRespuesta,
)
from src.services.consejo_escuela import acuerdo_service


router = APIRouter(
    prefix="/consejo-escuela/acuerdos",
    tags=["Consejo de Escuela - Acuerdos"],
)


@router.get("/", response_model=list[AcuerdoRespuesta])
def listar_acuerdos(db: Session = Depends(get_db)):
    return acuerdo_service.listar_acuerdos(db)


@router.get("/{acuerdo_id}", response_model=AcuerdoRespuesta)
def obtener_acuerdo(acuerdo_id: int, db: Session = Depends(get_db)):
    acuerdo = acuerdo_service.obtener_acuerdo(db, acuerdo_id)

    if not acuerdo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontr├│ el acuerdo.",
        )

    return acuerdo


@router.post(
    "/",
    response_model=AcuerdoRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_acuerdo(
    datos: AcuerdoCrear,
    db: Session = Depends(get_db),
):
    try:
        return acuerdo_service.crear_acuerdo(db, datos)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.patch("/{acuerdo_id}", response_model=AcuerdoRespuesta)
def actualizar_acuerdo(
    acuerdo_id: int,
    datos: AcuerdoActualizar,
    db: Session = Depends(get_db),
):
    try:
        return acuerdo_service.actualizar_acuerdo(
            db,
            acuerdo_id,
            datos,
        )
    except ValueError as error:
        codigo = (
            status.HTTP_404_NOT_FOUND
            if str(error) == "El acuerdo indicado no existe."
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=codigo,
            detail=str(error),
        ) from error