
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.usuarios import Usuario
from src.services.consejo_escuela import votaciones_service
from src.services.consejo_escuela.votaciones import (
    VotacionCrear,
    VotoCrear,
    VotoRespuesta,
    ResultadoVotacionRegistrar,
    VotacionRespuesta,
)
from src.utils.dependencias import requerir_rol


router = APIRouter(
    prefix="/consejo-escuela/votaciones",
    tags=["Consejo de Escuela - Votaciones"],
)


def convertir_error(error: ValueError):
    mensaje = str(error)

    if "no existe" in mensaje:
        codigo = status.HTTP_404_NOT_FOUND
    elif any(
        texto in mensaje
        for texto in (
            "ya tiene una votación",
            "ya registró un voto",
            "votación cerrada",
            "votación ya está cerrada",
            "todavía no tiene votos",
        )
    ):
        codigo = status.HTTP_409_CONFLICT
    else:
        codigo = status.HTTP_400_BAD_REQUEST

    raise HTTPException(status_code=codigo, detail=mensaje) from error


@router.get(
    "/",
    response_model=list[VotacionRespuesta],
    dependencies=[
        Depends(
            requerir_rol(
                [
                    "AsistenteConsejoEscuela",
                    "ConsejoProfesores",
                    "DirectorEscuela",
                ]
            )
        )
    ],
)
def listar_votaciones(db: Session = Depends(get_db)):
    return votaciones_service.listar_votaciones(db)


@router.get(
    "/{votacion_id}",
    response_model=VotacionRespuesta,
    dependencies=[
        Depends(
            requerir_rol(
                [
                    "AsistenteConsejoEscuela",
                    "ConsejoProfesores",
                    "DirectorEscuela",
                ]
            )
        )
    ],
)
def obtener_votacion(
    votacion_id: int,
    db: Session = Depends(get_db),
):
    votacion = votaciones_service.obtener_votacion(db, votacion_id)

    if votacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La votación indicada no existe.",
        )

    return votacion


@router.post(
    "/",
    response_model=VotacionRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(requerir_rol(["AsistenteConsejoEscuela"]))
    ],
)
def crear_votacion(
    datos: VotacionCrear,
    db: Session = Depends(get_db),
):
    try:
        return votaciones_service.crear_votacion(db, datos)
    except ValueError as error:
        convertir_error(error)


@router.post(
    "/{votacion_id}/votos",
    response_model=VotoRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def votar(
    votacion_id: int,
    datos: VotoCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        requerir_rol(["ConsejoProfesores"])
    ),
):
    try:
        return votaciones_service.registrar_voto(
            db,
            votacion_id,
            usuario.usuarioId,
            datos,
        )
    except ValueError as error:
        convertir_error(error)


@router.post(
    "/{votacion_id}/resultado",
    response_model=VotacionRespuesta,
)
def cerrar_votacion(
    votacion_id: int,
    datos: ResultadoVotacionRegistrar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(
        requerir_rol(["ConsejoProfesores"])
    ),
):
    try:
        return votaciones_service.registrar_resultado(
            db,
            votacion_id,
            usuario.usuarioId,
            datos,
        )
    except ValueError as error:
        convertir_error(error)
