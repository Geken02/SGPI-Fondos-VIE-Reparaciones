# src/api/schemas/comite_tecnico/evaluacion.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PropuestaEvaluacionItem(BaseModel):
    """Item de propuesta en la bandeja de evaluación"""
    evaluacionId: int
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    investigador: str
    fechaAsignacion: Optional[datetime] = None
    estadoEvaluacion: str
    calificacion: Optional[float] = None


class BandejaEvaluacionResponse(BaseModel):
    """Respuesta de la bandeja de evaluación"""
    propuestas: List[PropuestaEvaluacionItem]
    total: int


class IntegranteEquipo(BaseModel):
    """Integrante del equipo de investigación"""
    usuarioId: int
    nombre: str
    rol: int
    horasSemanales: float


class ContenidoPropuesta(BaseModel):
    """Contenido académico de la propuesta"""
    resumen: str
    objetivoGeneral: Optional[str] = None
    metodologia: Optional[str] = None


class ExpedientePropuestaResponse(BaseModel):
    """Respuesta del expediente completo de una propuesta"""
    propuesta: dict = Field(
        ...,
        description="Datos completos de la propuesta incluyendo contenido e integrantes"
    )


class DetalleEvaluacionItem(BaseModel):
    """Detalle de evaluación por criterio"""
    criterioId: int = Field(..., description="ID del criterio de evaluación")
    puntaje: float = Field(
        ...,
        ge=0,
        le=10,
        description="Puntaje obtenido (0, 6, 8 o 10)"
    )
    justificacion: Optional[str] = Field(
        None,
        max_length=2000,
        description="Justificación de la puntuación (obligatoria si no es Excelente)"
    )
    esObligatorioCumplido: Optional[bool] = Field(
        None,
        description="Indica si se cumple el requisito obligatorio (solo para criterios marcados como obligatorios)"
    )


class GuardarBorradorRequest(BaseModel):
    """Request para guardar evaluación como borrador"""
    detalles: List[DetalleEvaluacionItem] = Field(
        ...,
        min_length=1,
        description="Lista de detalles de evaluación por criterio"
    )


class DetalleEvaluacionSchema(BaseModel):
    criterioId: int
    puntaje: float
    justificacion: str

class EnviarEvaluacionRequest(BaseModel):
    detalles: List[DetalleEvaluacionSchema]
    calificacionFinal: float  # <-- Este campo debe existir
    recomienda: bool
    observaciones: Optional[str] = ""

class RespuestaEvaluacionSchema(BaseModel):
    success: bool
    evaluacionId: int
    message: str