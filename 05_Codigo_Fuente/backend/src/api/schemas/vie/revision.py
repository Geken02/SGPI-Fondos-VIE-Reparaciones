from typing import Literal

from pydantic import BaseModel

from src.api.schemas.vie.validacion import DocumentoExpediente, EncabezadoExpediente

EstadoRequisitoRevision = Literal["CUMPLE", "NO_CUMPLE", "EN_REVISION", "NO_APLICA"]


class RequisitoRevision(BaseModel):
    id: str
    nombre: str
    estado: EstadoRequisitoRevision
    observaciones: str = ""


class RevisionVIERespuesta(BaseModel):
    expediente: EncabezadoExpediente
    requisitos: list[RequisitoRevision]
    documentos: list[DocumentoExpediente]
