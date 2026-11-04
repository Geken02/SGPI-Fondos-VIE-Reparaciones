# src/api/schemas/comite_tecnico/dictamen.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class EvaluadorConsolidado(BaseModel):
    """Evaluación individual de un evaluador en la consolidación"""
    evaluacionId: int
    evaluador: str
    calificacion: float
    recomendacion: Optional[int] = None


class ConsolidacionEvaluacionesResponse(BaseModel):
    """Respuesta de la consolidación de evaluaciones"""
    propuestaId: int
    calificacionFinal: float = Field(
        ...,
        ge=0,
        le=1,
        description="Calificación final en escala 0-1"
    )
    evaluaciones: List[EvaluadorConsolidado]
    totalEvaluadores: int
    recomendacion: str = Field(
        ...,
        description="RECOMIENDA o NO RECOMIENDA"
    )
    umbralAprobacion: float = Field(
        default=0.70,
        description="Umbral mínimo para recomendar"
    )


class EmitirDictamenRequest(BaseModel):
    """Request para emitir dictamen final"""
    contenido: str = Field(
        ...,
        min_length=50,
        max_length=5000,
        description="Contenido del dictamen con justificación de la decisión"
    )
    recomienda: bool = Field(
        ...,
        description="True si recomienda la propuesta, False si no"
    )