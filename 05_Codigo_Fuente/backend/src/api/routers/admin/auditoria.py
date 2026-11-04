# src/api/routers/admin/auditoria.py
"""
Rutas del Módulo 5: Administración — Consulta de la bitácora forense (Logs).

Endpoints de SOLO LECTURA: la escritura de logs la realiza el servicio de
auditoría del sistema (services/auditoria_service.py), nunca el frontend.
Incluye el chequeo anti-manipulación (verificar_integridad) exigido por la
documentación del módulo de administración.

Seguridad: Doble capa de verificación (rol RBAC + permiso granular) en todos
los endpoints, dado que la bitácora contiene información sensible de auditoría.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.api.schemas.admin import auditoria as esquemas
from src.database import get_db
from src.services.admin import auditoria_consulta_service as servicio
from src.utils.dependencias import requerir_rol
from src.utils.permisos import verificar_permiso  

ROLES_ADMIN = ["SuperAdministrador", "Administrador"]

router = APIRouter()
depende_admin = Depends(requerir_rol(ROLES_ADMIN))
depende_permiso_bitacora = Depends(verificar_permiso("bitacora.leer"))  


@router.get("/bitacora", tags=["Administración - Auditoría"], summary="Consultar bitácora forense",
            dependencies=[depende_admin, depende_permiso_bitacora]) 
def listar_bitacora(
    sesion: Session = Depends(get_db),
    desde: Optional[datetime] = Query(default=None),
    hasta: Optional[datetime] = Query(default=None),
    tipoEventoId: Optional[int] = Query(default=None),
    severidadMinima: Optional[int] = Query(default=None, ge=1),
    usuarioId: Optional[int] = Query(default=None),
    objetoId: Optional[int] = Query(default=None),
    referenciaId: Optional[int] = Query(default=None),
    busqueda: Optional[str] = Query(default=None, max_length=200),
    pagina: int = Query(default=1, ge=1),
    tamanoPagina: int = Query(default=50, ge=1, le=200),
):
    items, metadatos = servicio.consultar_bitacora(
        sesion,
        desde=desde,
        hasta=hasta,
        tipo_evento_id=tipoEventoId,
        severidad_minima=severidadMinima,
        usuario_id=usuarioId,
        objeto_id=objetoId,
        referencia_id=referenciaId,
        texto=busqueda,
        pagina=pagina,
        tamano_pagina=tamanoPagina,
    )
    return {
        "items": [esquemas.LogResponse.model_validate(i) for i in items],
        **metadatos,
    }


@router.get("/bitacora/integridad", tags=["Administración - Auditoría"],
             summary="Verificación anti-manipulación de la cadena de auditoría",
             response_model=esquemas.IntegridadResponse, 
             dependencies=[depende_admin, depende_permiso_bitacora]) 
def verificar_integridad(
    sesion: Session = Depends(get_db),
    limite: int = Query(default=1000, ge=1, le=10000),
):
    return servicio.verificar_integridad(sesion, limite=limite)


@router.get("/bitacora/{log_id}", tags=["Administración - Auditoría"],
             summary="Detalle de un registro de bitácora", 
             dependencies=[depende_admin, depende_permiso_bitacora]) 
def detalle_bitacora(log_id: int, sesion: Session = Depends(get_db)):
    datos = servicio.detalle_log(sesion, log_id)
    return esquemas.LogDetalle.model_validate(datos)


@router.get("/eventos-log", tags=["Administración - Auditoría"],
             summary="Catálogo de tipos de evento", response_model=list[esquemas.EventoLogResponse],
             dependencies=[depende_admin, depende_permiso_bitacora])  
def eventos_log(sesion: Session = Depends(get_db)):
    return servicio.catalogo_eventos(sesion)


@router.get("/severidades-log", tags=["Administración - Auditoría"],
             summary="Catálogo de severidades", response_model=list[esquemas.SeveridadResponse],
             dependencies=[depende_admin, depende_permiso_bitacora])  
def severidades_log(sesion: Session = Depends(get_db)):
    return servicio.catalogo_severidades(sesion)


@router.get("/sources-log", tags=["Administración - Auditoría"],
             summary="Catálogo de fuentes/origen de eventos", response_model=list[esquemas.SourceResponse],
             dependencies=[depende_admin, depende_permiso_bitacora])  
def sources_log(sesion: Session = Depends(get_db)):
    return servicio.catalogo_sources(sesion)


@router.get("/objetos-log", tags=["Administración - Auditoría"],
             summary="Catálogo de objetos auditables", response_model=list[esquemas.ObjetoResponse],
             dependencies=[depende_admin, depende_permiso_bitacora])  
def objetos_log(sesion: Session = Depends(get_db)):
    return servicio.catalogo_objetos(sesion)