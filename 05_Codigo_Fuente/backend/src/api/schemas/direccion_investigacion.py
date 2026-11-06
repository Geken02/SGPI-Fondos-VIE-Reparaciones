from datetime import date
from pydantic import BaseModel, Field


class DocumentoDireccionEntrada(BaseModel):
    tipo: str = Field(min_length=1, max_length=100)
    fechaEmision: date | None = None
    firmante: str = Field(min_length=1, max_length=200)
    plantilla: str = Field(default="", max_length=20000)
    prefijoOficio: str = Field(default="VIE", max_length=30)


class NotificacionDireccionEntrada(BaseModel):
    tipo: str = Field(min_length=1, max_length=100)
    mensaje: str = Field(min_length=1, max_length=10000)
    asunto: str | None = Field(default=None, max_length=200)


class ConfiguracionDireccionEntrada(BaseModel):
    configuracion: dict[str, object]
