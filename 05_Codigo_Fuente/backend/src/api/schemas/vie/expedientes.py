from datetime import date

from pydantic import BaseModel


class ResumenExpedientes(BaseModel):
    """Cifras de las tarjetas de la bandeja (se calculan con los mismos datos de la lista)."""
    total: int
    enRevision: int
    enSubsanacion: int
    listosCie: int


class ExpedienteFila(BaseModel):
    """Una fila de la tabla de la bandeja de la Gestora VIE."""
    propuestaId: int
    id: str  # código de la propuesta, ej. FVIE-2027-001
    titulo: str
    investigador: str
    escuela: str
    estado: str  # estado de gestión: EN_REVISION, EN_SUBSANACION, LISTO_CIE, APROBADA, RECHAZADA, CANCELADA
    estadoDetalle: str  # nombre exacto del estado en la BD (ej. "En Comité Técnico")
    fechaLimite: date | None = None  # fin de la etapa actual de la convocatoria


class BandejaExpedientes(BaseModel):
    resumen: ResumenExpedientes
    expedientes: list[ExpedienteFila]
