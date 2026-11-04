from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.database import get_db
from src.models.usuarios import Usuario
from src.utils.dependencias import obtener_usuario_actual, requerir_rol
from src.api.schemas.direccion_investigacion import (
    DocumentoDireccionEntrada,
    NotificacionDireccionEntrada,
    ConfiguracionDireccionEntrada,
)
from src.services import direccion_investigacion_service as servicio

router = APIRouter(
    prefix="/direccion-investigacion",
    tags=["Dirección de Investigación"],
)

ROLES_DIRECCION = ["DireccionInvestigacion", "SuperAdministrador"]
SEGURIDAD = [Depends(requerir_rol(ROLES_DIRECCION))]


@router.get("/dictamenes", dependencies=SEGURIDAD)
def listar_dictamenes(db: Session = Depends(get_db)):
    return servicio.listar_dictamenes(db)


@router.get("/dictamenes/{codigo}", dependencies=SEGURIDAD)
def obtener_dictamen(codigo: str, db: Session = Depends(get_db)):
    return servicio.obtener_dictamen(db, codigo)


@router.get("/dictamenes/{codigo}/documentos", dependencies=SEGURIDAD)
def listar_documentos(codigo: str, db: Session = Depends(get_db)):
    return servicio.listar_documentos(db, codigo)

@router.get("/documentos/{documento_id}/descargar", dependencies=SEGURIDAD)
def descargar_documento(
    documento_id: int,
    db: Session = Depends(get_db),
):
    documento = servicio.obtener_documento_para_descarga(db, documento_id)

    return FileResponse(
        path=str(documento["ruta"]),
        filename=documento["nombre"],
        media_type=documento.get("media_type", "application/octet-stream"),
    )


@router.post("/dictamenes/{codigo}/documentos", dependencies=SEGURIDAD)
def generar_documento(
    codigo: str,
    datos: DocumentoDireccionEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return servicio.generar_documento(db, codigo, datos, usuario)


@router.post("/dictamenes/{codigo}/notificacion", dependencies=SEGURIDAD)
def registrar_notificacion(
    codigo: str,
    datos: NotificacionDireccionEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return servicio.registrar_notificacion(db, codigo, datos, usuario)


@router.post("/envios-correo/{envio_id}/reintentar", dependencies=SEGURIDAD)
def reintentar_envio_correo(
    envio_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return servicio.reintentar_envio_correo(db, envio_id, usuario)


@router.get("/configuracion", dependencies=SEGURIDAD)
def obtener_configuracion(db: Session = Depends(get_db)):
    return servicio.obtener_configuracion(db)


@router.put("/configuracion", dependencies=SEGURIDAD)
def guardar_configuracion(
    datos: ConfiguracionDireccionEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return servicio.guardar_configuracion(db, datos.configuracion, usuario)
