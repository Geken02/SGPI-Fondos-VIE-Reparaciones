from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class SubsanacionFila(BaseModel):
    """Una subsanación solicitada por la gestora, con los datos de su expediente."""
    subsanacionId: int
    propuestaId: int
    expedienteId: str  # código de la propuesta, ej. FVIE-2027-001
    titulo: str
    investigador: str
    escuela: str
    fechaObservacion: date  # fecha en que la gestora solicitó la subsanación
    pestana: Literal["PENDIENTES", "EN_PROCESO", "COMPLETADAS"]
    estado: Literal["PENDIENTE", "EN_PROCESO", "COMPLETADA", "RECHAZADA"]
    estadoDetalle: str  # nombre exacto del estado en la BD
    comentarioGestora: str  # lo que la gestora solicitó corregir
    gestora: str  # quién lo solicitó
    respuestaInvestigador: str | None = None
    fechaRespuesta: date | None = None
    comentarioResolucion: str | None = None  # motivo si la gestora rechazó la respuesta
    fechaResolucion: date | None = None
    puedeResolver: bool = False  # True cuando el investigador ya respondió y falta que la gestora decida


class ListaSubsanaciones(BaseModel):
    subsanaciones: list[SubsanacionFila]


class NuevaSubsanacion(BaseModel):
    comentario: str = Field(min_length=1, max_length=4000)


class ResolverSubsanacion(BaseModel):
    accion: Literal["ACEPTAR", "RECHAZAR"]
    comentario: str = Field(default="", max_length=4000)
