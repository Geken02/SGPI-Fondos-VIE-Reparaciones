from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.api.schemas.vie.expedientes import BandejaExpedientes
from src.api.schemas.vie.gestion import DocumentosRespuesta, GuardarRequisitos, GuardarRevisionDocumentos
from src.api.schemas.vie.revision import RevisionVIERespuesta
from src.api.schemas.vie.subsanaciones import NuevaSubsanacion, SubsanacionFila
from src.api.schemas.vie.validacion import ValidacionNormativaRespuesta
from src.services.vie import (
    documentos_service,
    expediente_service,
    revision_service,
    subsanacion_service,
    validacion_service,
)
from src.services.vie.errores import ConflictoNegocio, SolicitudInvalida
from src.utils.dependencias import requerir_rol

router = APIRouter(
    prefix="/vie/expedientes",
    tags=["VIE - Expedientes"],
)

ROLES_GESTORA = ["GestoraVIE", "CoordinadoraGestora", "SuperAdministrador", "Administrador"]


def _no_encontrado(codigo: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"No existe un expediente enviado con el código {codigo}.")


# Ruta "" (sin "/" final) para que el front llame a /vie/expedientes sin redirecciones 307,
# que con CORS + Authorization hacen fallar la petición en el navegador.
@router.get("", response_model=BandejaExpedientes)
def obtener_bandeja_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Bandeja de la Gestora VIE limitada a sus escuelas asignadas."""
    return expediente_service.listar_expedientes(db, usuario.usuarioId)


@router.get("/{codigo}/validacion", response_model=ValidacionNormativaRespuesta)
def obtener_validacion_normativa(
    codigo: str,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Validación normativa de un expediente: encabezado, lista de verificación y documentos."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return validacion_service.obtener_validacion(db, codigo)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error


@router.put("/{codigo}/validacion/requisitos", response_model=ValidacionNormativaRespuesta)
def guardar_requisitos(
    codigo: str,
    datos: GuardarRequisitos,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Guarda las decisiones de la gestora sobre requisitos (estado y observaciones) y devuelve la validación actualizada."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return validacion_service.guardar_requisitos(db, codigo, usuario.usuarioId, datos.cambios)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error
    except SolicitudInvalida as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error


@router.post("/{codigo}/enviar-cie")
def enviar_expediente_al_cie(
    codigo: str,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Remite al CIE una propuesta con cumplimiento >= 90 % y sin subsanaciones abiertas."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return validacion_service.enviar_al_cie(db, codigo, usuario.usuarioId)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error
    except ConflictoNegocio as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error


@router.get("/{codigo}/revision", response_model=RevisionVIERespuesta)
def obtener_revision_vie(
    codigo: str,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Revisión VIE de un expediente: encabezado, requisitos normativos y documentación adjunta."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return revision_service.obtener_revision(db, codigo)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error


@router.get("/{codigo}/documentos", response_model=DocumentosRespuesta)
def obtener_documentos(
    codigo: str,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Revisión de documentos: documentos cargados, obligatorios faltantes y su estado de revisión."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return documentos_service.obtener_documentos(db, codigo)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error


@router.put("/{codigo}/documentos/revision", response_model=DocumentosRespuesta)
def guardar_revision_documentos(
    codigo: str,
    datos: GuardarRevisionDocumentos,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Guarda el estado de revisión de los documentos y devuelve la lista actualizada."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return documentos_service.guardar_revision(db, codigo, usuario.usuarioId, datos.revisiones)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error
    except SolicitudInvalida as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error


@router.post("/{codigo}/subsanaciones", response_model=SubsanacionFila, status_code=status.HTTP_201_CREATED)
def solicitar_subsanacion(
    codigo: str,
    datos: NuevaSubsanacion,
    db: Session = Depends(get_db),
    usuario=Depends(requerir_rol(ROLES_GESTORA)),
):
    """Solicita una subsanación al investigador (solo si faltan documentos o el cumplimiento es menor al 90 %)."""
    expediente_service.verificar_acceso_expediente(db, codigo, usuario.usuarioId)
    try:
        return subsanacion_service.crear_subsanacion(db, codigo, usuario.usuarioId, datos.comentario)
    except validacion_service.ExpedienteNoEncontrado as error:
        raise _no_encontrado(codigo) from error
    except SolicitudInvalida as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
    except ConflictoNegocio as error:
        raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error
