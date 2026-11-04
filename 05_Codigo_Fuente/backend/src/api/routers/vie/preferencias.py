from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.api.schemas.preferencias_gestora import (
    PreferenciasGestoraEntrada,
    PreferenciasGestoraRespuesta,
)
from src.services import preferencias_gestora_service
from src.utils.dependencias import requerir_rol

router = APIRouter(prefix="/vie/preferencias", tags=["VIE - Preferencias"])
ROLES_GESTORA = ["GestoraVIE", "SuperAdministrador"]


@router.get("", response_model=PreferenciasGestoraRespuesta)
def obtener_preferencias(
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    return preferencias_gestora_service.obtener(db, usuario.usuarioId)


@router.put("", response_model=PreferenciasGestoraRespuesta)
def guardar_preferencias(
    datos: PreferenciasGestoraEntrada,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    try:
        return preferencias_gestora_service.guardar(
            db, usuario.usuarioId, datos.model_dump()
        )
    except ValueError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
