from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.api.schemas.vie.subsanaciones import ListaSubsanaciones, ResolverSubsanacion, SubsanacionFila
from src.services.vie import subsanacion_service
from src.services.vie.errores import ConflictoNegocio, NoEncontrado, SolicitudInvalida
from src.utils.dependencias import requerir_rol

router = APIRouter(
    prefix="/vie/subsanaciones",
    tags=["VIE - Subsanaciones"],
)

ROLES_GESTORA = ["GestoraVIE", "SuperAdministrador"]


# Ruta "" (sin "/" final) para evitar redirecciones 307 con CORS + Authorization.
@router.get("", response_model=ListaSubsanaciones)
def listar_subsanaciones(
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Subsanaciones de las escuelas asignadas a la gestora."""
    return subsanacion_service.listar_subsanaciones(db, usuario.usuarioId)


@router.patch("/{subsanacion_id}/resolver", response_model=SubsanacionFila)
def resolver_subsanacion(
    subsanacion_id: int,
    datos: ResolverSubsanacion,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Acepta o rechaza la respuesta del investigador a una subsanación."""
    try:
        return subsanacion_service.resolver_subsanacion(db, subsanacion_id, usuario.usuarioId, datos.accion, datos.comentario)
    except NoEncontrado as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
    except SolicitudInvalida as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
    except ConflictoNegocio as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
