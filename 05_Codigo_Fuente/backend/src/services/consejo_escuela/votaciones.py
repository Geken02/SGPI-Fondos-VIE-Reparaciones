
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TipoVoto = Literal["APROBAR", "RECHAZAR", "ABSTENCION"]
ResultadoConsejo = Literal[
    "APROBADA",
    "RECHAZADA",
    "DEVUELTA_AJUSTES",
]


class VotacionCrear(BaseModel):
    propuestaId: int = Field(gt=0)
    observaciones: str | None = Field(default=None, max_length=1000)


class VotoCrear(BaseModel):
    voto: TipoVoto
    observaciones: str | None = Field(default=None, max_length=1000)


class VotoRespuesta(BaseModel):
    votoId: int
    votacionId: int
    usuarioId: int
    voto: TipoVoto
    observaciones: str | None = None
    fechaVoto: datetime

    model_config = ConfigDict(from_attributes=True)


class ResultadoVotacionRegistrar(BaseModel):
    resultadoConsejo: ResultadoConsejo
    observaciones: str | None = Field(default=None, max_length=1000)


class VotacionRespuesta(BaseModel):
    votacionId: int
    propuestaId: int
    estadoVotacion: Literal["ABIERTA", "CERRADA"]
    resultadoConsejo: ResultadoConsejo | None = None
    fechaApertura: datetime
    fechaCierre: datetime | None = None
    observaciones: str | None = None
    votos: list[VotoRespuesta] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
