from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.consulta_historica import reporte_service
from src.utils.dependencias import requerir_rol
from src.api.schemas.admin.auditoria import LogResponse

router = APIRouter()
depende_admin = Depends(requerir_rol(["SuperAdministrador", "Administrador"]))

@router.get(
    "/actividad",
    tags=["Administración - Auditoría"],
    summary="Consultar actividad del sistema (Logs de auditoría)",
    dependencies=[depende_admin]
)
def consultar_actividad(
    sesion: Session = Depends(get_db),
    pagina: int = Query(default=1, ge=1),
    tamanoPagina: int = Query(default=50, ge=1, le=200),
    fechaInicio: Optional[datetime] = Query(default=None),
    fechaFin: Optional[datetime] = Query(default=None),
    usuarioId: Optional[int] = Query(default=None),
    tipoEventoId: Optional[int] = Query(default=None),
    severidadId: Optional[int] = Query(default=None),
    busqueda: Optional[str] = Query(default=None, max_length=100)
):
    items, metadatos = reporte_service.listar_actividad_sistema(
        sesion=sesion,
        pagina=pagina,
        tamano_pagina=tamanoPagina,
        fecha_inicio=fechaInicio,
        fecha_fin=fechaFin,
        usuario_id=usuarioId,
        tipo_evento_id=tipoEventoId,
        severidad_id=severidadId,
        busqueda=busqueda
    )
    
    # Validar y serializar con Pydantic
    items_validados = [LogResponse(**item) for item in items]
    
    return {
        "items": items_validados,
        **metadatos
    }