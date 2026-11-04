from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificacionResponse(BaseModel):
    id: int
    asunto: str
    cuerpo: str
    fechaEnvio: datetime
    fechaLectura: Optional[datetime] = None
    leida: bool
    propuestaId: Optional[int] = None
    tipo: Optional[str] = None
    canal: Optional[str] = None

    class Config:
        from_attributes = True

class ConteoNoLeidasResponse(BaseModel):
    total: int
    noLeidas: int
