from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PropuestaConsejoRespuesta(BaseModel):
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    estadoId: int
    estadoCodigo: str
    estadoNombre: str
    etapaId: int
    convocatoriaId: int
    investigadorCoordId: int
    escuelaId: int
    montoTotal: Decimal
    nivelTrlActual: int | None = None
    nivelTrlEsperado: int | None = None
    fechaInicio: date | None = None
    fechaFinalizacion: date | None = None
    fechaCreacion: datetime
    fechaEnvio: datetime | None = None

    model_config = ConfigDict(from_attributes=True)