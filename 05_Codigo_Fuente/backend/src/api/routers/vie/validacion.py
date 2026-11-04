from datetime import date
from typing import Literal

from pydantic import BaseModel

EstadoRequisito = Literal["CUMPLE", "NO_CUMPLE", "PENDIENTE", "NO_APLICA"]
EstadoDocumento = Literal["CARGADO", "FALTANTE"]


class RequisitoValidacion(BaseModel):
    id: str
    nombre: str
    estado: EstadoRequisito  # el que se muestra: el de la gestora si lo cambió, o el calculado
    observaciones: str = ""
    estadoSistema: EstadoRequisito | None = None  # lo que calcula el sistema con los datos del expediente
    observacionesSistema: str = ""
    manual: bool = False  # True si la gestora lo cambió y está guardado


class GrupoValidacion(BaseModel):
    id: str
    titulo: str
    requisitos: list[RequisitoValidacion]


class DocumentoExpediente(BaseModel):
    id: str
    nombre: str
    fecha: date | None = None  # fecha de carga; None si el documento falta
    estado: EstadoDocumento


class EncabezadoExpediente(BaseModel):
    propuestaId: int
    id: str  # código de la propuesta, ej. FVIE-2027-001
    titulo: str
    investigador: str
    escuela: str
    estado: str  # estado de gestión (mismo criterio que la bandeja)
    estadoDetalle: str
    convocatoria: str
    tipo: str | None = None  # modalidad de la propuesta
    fechaIngreso: date | None = None  # fecha de envío a la VIE
    fechaLimite: date | None = None  # fin de la etapa actual de la convocatoria
    pasoActual: int  # 1 a 4, paso del proceso en que se encuentra


class EvaluacionSubsanacion(BaseModel):
    """¿Corresponde solicitar una subsanación? (faltan documentos u observados, o cumplimiento menor al umbral)"""
    puede: bool
    motivos: list[str]
    bloqueo: str | None = None  # por qué no se puede solicitar aunque haya motivos (ya hay una subsanación abierta)
    porcentajeCumplimiento: int
    umbral: int
    comentarioSugerido: str


class ValidacionNormativaRespuesta(BaseModel):
    expediente: EncabezadoExpediente
    grupos: list[GrupoValidacion]
    documentos: list[DocumentoExpediente]
    porcentajeCumplimiento: int
    subsanacion: EvaluacionSubsanacion
