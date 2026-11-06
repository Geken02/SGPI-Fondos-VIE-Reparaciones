
from pydantic import BaseModel, ConfigDict
from typing import List


class MiembroConsejoRespuesta(BaseModel):
    usuarioId: int
    nombreCompleto: str
    correoInstitucional: str

    model_config = ConfigDict(from_attributes=True)


class AsignacionConsejoCrear(BaseModel):
    usuarioIds: List[int]


class AsignacionConsejoRespuesta(BaseModel):
    asignacionId: int
    propuestaId: int
    usuarioId: int
    nombreCompleto: str
    correoInstitucional: str
    activo: bool
