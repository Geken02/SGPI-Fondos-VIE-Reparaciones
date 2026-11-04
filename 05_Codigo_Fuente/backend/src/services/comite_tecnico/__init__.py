# src/services/comite_tecnico/__init__.py
from .completitud_service import CompletitudService
from .evaluacion_service import EvaluacionService
from .dictamen_service import DictamenService

__all__ = ["CompletitudService", "EvaluacionService", "DictamenService"]