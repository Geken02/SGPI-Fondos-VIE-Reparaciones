# src/api/schemas/comite_tecnico/completitud.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PropuestaCompletitudItem(BaseModel):
    """Item de propuesta en la bandeja de completitud"""
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    investigador: str
    escuela: str
    fechaEnvio: Optional[datetime] = None
    esCompleta: bool
    documentosFaltantes: List[int] = Field(default_factory=list)
    estado: str


class EstadisticasCompletitud(BaseModel):
    """Estadísticas de la bandeja"""
    total: int
    completas: int
    incompletas: int


class BandejaCompletitudResponse(BaseModel):
    """Respuesta completa de la bandeja de completitud"""
    propuestas: List[PropuestaCompletitudItem]
    estadisticas: EstadisticasCompletitud


class SolicitarSubsanacionRequest(BaseModel):
    """Request para solicitar subsanación"""
    comentario: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Comentario detallando los documentos faltantes o correcciones necesarias"
    )


class AsignarEvaluadoresRequest(BaseModel):
    """Request para asignar evaluadores a una propuesta"""
    evaluadorIds: List[int] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Lista de IDs de los evaluadores a asignar"
    )