from pydantic import BaseModel
from typing import Dict, List, Optional

class AnalisisIARequest(BaseModel):
    seccionNombre: str
    criterioNombre: str
    nivel: str
    descripcionNivel: str
    justificacion: str

class AnalisisIAResponse(BaseModel):
    sugerencia: str
    activa: bool

class EstadoIAResponse(BaseModel):
    activa: bool

# NUEVO: Schema para análisis masivo de toda la rúbrica
class CriterioEvaluacion(BaseModel):
    id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    peso: Optional[float] = None

class SeccionEvaluacion(BaseModel):
    id: Optional[int] = None
    nombre: str
    criterios: List[CriterioEvaluacion]

class AnalisisDocumentoIARequest(BaseModel):
    tipoModalidad: str
    criteriosPorSeccion: Dict[str, List[CriterioEvaluacion]]

class CriterioResultado(BaseModel):
    criterioId: Optional[int] = None
    criterioNombre: str
    puntajeSugerido: float
    nivelSugerido: str
    justificacion: str

class SeccionResultado(BaseModel):
    seccionId: Optional[int] = None
    seccionNombre: str
    criterios: List[CriterioResultado]

class AnalisisDocumentoIAResponse(BaseModel):
    sugerencias: Dict[str, SeccionResultado]
    calificacionEstimada: Optional[float] = None
    activa: bool


class AnalisisDocumentoIARequest(BaseModel):
    tipoModalidad: str
    criteriosPorSeccion: Dict[str, List[str]]  # <-- Clave: Diccionario de listas de STRINGS

class AnalisisDocumentoIAResponse(BaseModel):
    propuestaId: int
    documentoAnalizado: bool
    rubricaUsada: str
    tiempoSegundos: float
    totalCriteriosEvaluados: int
    sugerencias: Dict[str, dict]