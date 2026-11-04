
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AcuerdoBase(BaseModel):
    propuestaId: int = Field(gt=0)
    tipoAcuerdoId: int = Field(gt=0)
    numeroAcuerdo: str | None = Field(default=None, max_length=50)
    fechaAcuerdo: date | None = None
    horasAprobadas: Decimal | None = Field(default=None, ge=0, max_digits=4, decimal_places=1)
    tipoHoraId: int | None = Field(default=None, gt=0)
    periodoNombramiento: str | None = Field(default=None, max_length=100)
    presupuestoAprobado: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    rutaArchivo: str | None = Field(default=None, max_length=500)


class AcuerdoCrear(AcuerdoBase):
    pass


class AcuerdoActualizar(BaseModel):
    tipoAcuerdoId: int | None = Field(default=None, gt=0)
    numeroAcuerdo: str | None = Field(default=None, max_length=50)
    fechaAcuerdo: date | None = None
    horasAprobadas: Decimal | None = Field(default=None, ge=0, max_digits=4, decimal_places=1)
    tipoHoraId: int | None = Field(default=None, gt=0)
    periodoNombramiento: str | None = Field(default=None, max_length=100)
    presupuestoAprobado: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    rutaArchivo: str | None = Field(default=None, max_length=500)


class AcuerdoRespuesta(AcuerdoBase):
    acuerdoId: int
    creadoEn: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
