from sqlalchemy.orm import Session

from src.models.convocatorias import EstadosPropuesta
from src.models.propuestas import Propuesta


def _convertir_propuesta(propuesta: Propuesta, estado: EstadosPropuesta) -> dict:
    return {
        "propuestaId": propuesta.propuestaId,
        "codigoPropuesta": propuesta.codigoPropuesta,
        "titulo": propuesta.titulo,
        "estadoId": propuesta.estadoId,
        "estadoCodigo": estado.codigoEstadoPropuesta,
        "estadoNombre": estado.nombreEstadoPropuesta,
        "etapaId": propuesta.etapaId,
        "convocatoriaId": propuesta.convocatoriaId,
        "investigadorCoordId": propuesta.investigadorCoordId,
        "escuelaId": propuesta.escuelaId,
        "montoTotal": propuesta.montoTotal,
        "nivelTrlActual": propuesta.nivelTrlActual,
        "nivelTrlEsperado": propuesta.nivelTrlEsperado,
        "fechaInicio": propuesta.fechaInicio,
        "fechaFinalizacion": propuesta.fechaFinalizacion,
        "fechaCreacion": propuesta.fechaCreacion,
        "fechaEnvio": propuesta.fechaEnvio,
    }


def listar_propuestas_en_consejo(db: Session) -> list[dict]:
    resultados = (
        db.query(Propuesta, EstadosPropuesta)
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .filter(
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CONSEJO",
            EstadosPropuesta.activo.is_(True),
        )
        .order_by(Propuesta.fechaEnvio.asc(), Propuesta.propuestaId.asc())
        .all()
    )

    return [
        _convertir_propuesta(propuesta, estado)
        for propuesta, estado in resultados
    ]


def obtener_propuesta_en_consejo(
    db: Session,
    propuesta_id: int,
) -> dict | None:
    resultado = (
        db.query(Propuesta, EstadosPropuesta)
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .filter(
            Propuesta.propuestaId == propuesta_id,
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CONSEJO",
            EstadosPropuesta.activo.is_(True),
        )
        .first()
    )

    if resultado is None:
        return None

    propuesta, estado = resultado
    return _convertir_propuesta(propuesta, estado)