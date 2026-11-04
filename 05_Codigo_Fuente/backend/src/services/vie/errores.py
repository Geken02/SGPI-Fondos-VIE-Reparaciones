class SolicitudInvalida(Exception):
    """Los datos enviados no son válidos (HTTP 400)."""


class ConflictoNegocio(Exception):
    """La acción no se puede hacer en el estado actual (HTTP 409)."""


class NoEncontrado(Exception):
    """El recurso pedido no existe (HTTP 404)."""
