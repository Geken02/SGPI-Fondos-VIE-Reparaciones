from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from src.api.schemas.vie.validacion import EncabezadoExpediente, EstadoRequisito, EvaluacionSubsanacion

EstadoRevisionDocumento = Literal["SIN_REVISAR", "CORRECTO", "INCOMPLETO", "FALTA_FIRMA"]


# ---- Validación normativa: guardar decisiones de la gestora ------------------------------
class CambioRequisito(BaseModel):
    id: str
    estado: EstadoRequisito | None = None  # None = volver al valor calculado por el sistema
    observaciones: str = Field(default="", max_length=2000)


class GuardarRequisitos(BaseModel):
    cambios: list[CambioRequisito] = Field(min_length=1, max_length=50)


# ---- Revisión de documentos ---------------------------------------------------------------
class DocumentoRevision(BaseModel):
    id: str
    documentoId: int | None = None  # None si el documento obligatorio no se ha cargado
    codigoTipo: str | None = None
    nombre: str
    archivo: str | None = None
    fecha: date | None = None
    cargadoPor: str | None = None
    estado: Literal["SIN_REVISAR", "CORRECTO", "INCOMPLETO", "FALTA_FIRMA", "FALTANTE"]
    observaciones: str = ""


class CambioDocumento(BaseModel):
    documentoId: int
    estado: EstadoRevisionDocumento
    observaciones: str = Field(default="", max_length=2000)


class GuardarRevisionDocumentos(BaseModel):
    revisiones: list[CambioDocumento] = Field(min_length=1, max_length=100)


class DocumentosRespuesta(BaseModel):
    expediente: EncabezadoExpediente
    documentos: list[DocumentoRevision]
    subsanacion: EvaluacionSubsanacion
