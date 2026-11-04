# src/api/schemas/comite_tecnico/__init__.py
from .completitud import (
    BandejaCompletitudResponse,
    PropuestaCompletitudItem,
    SolicitarSubsanacionRequest,
    AsignarEvaluadoresRequest,
)
from .evaluacion import (
    BandejaEvaluacionResponse,
    PropuestaEvaluacionItem,
    ExpedientePropuestaResponse,
    GuardarBorradorRequest,
    DetalleEvaluacionItem,
    EnviarEvaluacionRequest,
)
from .dictamen import (
    ConsolidacionEvaluacionesResponse,
    EvaluadorConsolidado,
    EmitirDictamenRequest,
)

__all__ = [
    "BandejaCompletitudResponse",
    "PropuestaCompletitudItem",
    "SolicitarSubsanacionRequest",
    "AsignarEvaluadoresRequest",
    "BandejaEvaluacionResponse",
    "PropuestaEvaluacionItem",
    "ExpedientePropuestaResponse",
    "GuardarBorradorRequest",
    "DetalleEvaluacionItem",
    "EnviarEvaluacionRequest",
    "ConsolidacionEvaluacionesResponse",
    "EvaluadorConsolidado",
    "EmitirDictamenRequest",
]