from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field


class PuntajeCIEEntrada(BaseModel):
    criterioId: int = Field(gt=0)
    puntaje: Decimal = Field(ge=0, le=10, max_digits=4, decimal_places=2)


class EvaluacionCIEEntrada(BaseModel):
    puntajes: list[PuntajeCIEEntrada] = Field(min_length=1)
    observaciones: str | None = Field(default=None, max_length=4000)
    decision: Literal["Aprobar", "Rechazar"]


class ResolucionCIEEntrada(BaseModel):
    decision: Literal["Aprobar", "Rechazar"]
    justificacion: str = Field(min_length=1, max_length=10000)

