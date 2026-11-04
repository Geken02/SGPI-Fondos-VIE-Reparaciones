from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TipoDictamenResponse(BaseModel):
    """Tipos de dictamen disponibles."""
    tipoDictamenId: int
    nombreTipoDictamen: str
    descripcion: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True


class PropuestaVinculacionResumen(BaseModel):
    """Resumen de propuesta para el visor del evaluador de vinculación."""
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    investigadorCoordId: Optional[int] = None
    investigadorCoordinador: str
    nombreEscuela: str
    nivelTrlActual: Optional[int] = None
    nivelTrlEsperado: Optional[int] = None
    tienePotencialPI: bool = False
    poseeInnovacion: bool = False
    nombreEstado: str
    tieneDictamenVinculacion: bool = False

    class Config:
        from_attributes = True


class PropuestaVinculacionDetalle(BaseModel):
    """Expediente técnico resumido para emitir dictamen de vinculación."""
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    investigadorCoordinador: str
    correoInvestigador: str
    nombreEscuela: str
    lineaInvestigacion: Optional[str] = None
    modalidad: Optional[str] = None
    
    # Contenido relevante para PI/TRL
    resumen: Optional[str] = None
    metodologia: Optional[str] = None
    hojaRuta: Optional[str] = None
    
    # Declaraciones y TRL
    nivelTrlActual: Optional[int] = None
    nivelTrlEsperado: Optional[int] = None
    tienePotencialPI: bool = False
    poseeInnovacion: bool = False
    tipoInnovacion: Optional[str] = None
    tieneInformacionConfidencial: bool = False
    requiereInstrumentoJuridico: bool = False

    class Config:
        from_attributes = True


class DictamenCreate(BaseModel):
    """Esquema para emitir un Dictamen Técnico de Vinculación."""
    propuestaId: int = Field(..., description="ID de la propuesta a dictaminar")
    numeroOficio: Optional[str] = Field(None, max_length=50, description="Número de oficio institucional (ej: VINC-2027-015)")
    contenido: str = Field(..., min_length=10, description="Cuerpo y conclusiones del dictamen de vinculación")
    rutaArchivo: Optional[str] = Field(None, max_length=500, description="Ruta o enlace al documento PDF firmado")


class DictamenResponse(BaseModel):
    """Respuesta con la información del dictamen registrado."""
    dictamenId: int
    propuestaId: int
    numeroOficio: Optional[str] = None
    fechaEmision: datetime
    contenido: str
    rutaArchivo: Optional[str] = None
    usuarioRemitenteId: int
    nombreRemitente: Optional[str] = None

    class Config:
        from_attributes = True
