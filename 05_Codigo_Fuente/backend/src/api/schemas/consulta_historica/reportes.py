from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict

class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    logId: int
    tipoEventoId: int
    nombreEvento: Optional[str] = None
    severidadId: int
    nombreSeveridad: Optional[str] = None
    descripcion: str
    sourceId: int
    nombreSource: Optional[str] = None
    usuarioId: Optional[int] = None
    nombreUsuario: Optional[str] = None
    referenciaId1: Optional[int] = None
    descripcionReferencia1: Optional[str] = None
    referenciaId2: Optional[int] = None
    descripcionReferencia2: Optional[str] = None
    objetoId1: Optional[int] = None
    nombreObjeto1: Optional[str] = None
    objetoId2: Optional[int] = None
    nombreObjeto2: Optional[str] = None
    datosAnteriores: Optional[Any] = None
    datosNuevos: Optional[Any] = None
    creadoEn: datetime