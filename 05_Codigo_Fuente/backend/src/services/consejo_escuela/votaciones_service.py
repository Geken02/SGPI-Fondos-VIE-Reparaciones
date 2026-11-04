
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.votaciones_consejo import (
    VotacionesConsejo,
    VotosConsejo,
)
from src.services.consejo_escuela.votaciones import (
    VotacionCrear,
    VotoCrear,
    ResultadoVotacionRegistrar,
)


def listar_votaciones(db: Session):
    return (
        db.query(VotacionesConsejo)
        .order_by(VotacionesConsejo.votacionId.desc())
        .all()
    )


def obtener_votacion(db: Session, votacion_id: int):
    return (
        db.query(VotacionesConsejo)
        .filter(VotacionesConsejo.votacionId == votacion_id)
        .first()
    )


def crear_votacion(db: Session, datos: VotacionCrear):
    propuesta = (
        db.query(Propuesta)
        .filter(Propuesta.propuestaId == datos.propuestaId)
        .first()
    )

    if propuesta is None:
        raise ValueError("La propuesta indicada no existe.")

    existente = (
        db.query(VotacionesConsejo)
        .filter(VotacionesConsejo.propuestaId == datos.propuestaId)
        .first()
    )

    if existente is not None:
        raise ValueError("La propuesta ya tiene una votación registrada.")

    votacion = VotacionesConsejo(
        propuestaId=datos.propuestaId,
        estadoVotacion="ABIERTA",
        observaciones=datos.observaciones,
    )

    db.add(votacion)

    try:
        db.commit()
        db.refresh(votacion)
    except IntegrityError as error:
        db.rollback()
        raise ValueError(
            "No se pudo crear la votación. "
            "Comprueba si la propuesta ya tiene una votación."
        ) from error

    return votacion


def registrar_voto(
    db: Session,
    votacion_id: int,
    usuario_id: int,
    datos: VotoCrear,
):
    votacion = obtener_votacion(db, votacion_id)

    if votacion is None:
        raise ValueError("La votación indicada no existe.")

    if votacion.estadoVotacion != "ABIERTA":
        raise ValueError("No se puede votar en una votación cerrada.")

    voto_existente = (
        db.query(VotosConsejo)
        .filter(
            VotosConsejo.votacionId == votacion_id,
            VotosConsejo.usuarioId == usuario_id,
        )
        .first()
    )

    if voto_existente is not None:
        raise ValueError("El usuario ya registró un voto en esta votación.")

    voto = VotosConsejo(
        votacionId=votacion_id,
        usuarioId=usuario_id,
        voto=datos.voto,
        observaciones=datos.observaciones,
        usuarioAuditoriaId=usuario_id,
    )

    db.add(voto)

    try:
        db.commit()
        db.refresh(voto)
    except IntegrityError as error:
        db.rollback()
        raise ValueError(
            "No se pudo registrar el voto. "
            "Es posible que ya exista un voto de este usuario."
        ) from error

    return voto


def registrar_resultado(
    db: Session,
    votacion_id: int,
    usuario_id: int,
    datos: ResultadoVotacionRegistrar,
):
    votacion = obtener_votacion(db, votacion_id)

    if votacion is None:
        raise ValueError("La votación indicada no existe.")

    if votacion.estadoVotacion != "ABIERTA":
        raise ValueError("La votación ya está cerrada.")

    if not votacion.votos:
        raise ValueError(
            "No se puede cerrar una votación que todavía no tiene votos."
        )

    votacion.estadoVotacion = "CERRADA"
    votacion.resultadoConsejo = datos.resultadoConsejo
    votacion.fechaCierre = datetime.now(timezone.utc)
    votacion.usuarioResultadoId = usuario_id

    if datos.observaciones is not None:
        votacion.observaciones = datos.observaciones

    try:
        db.commit()
        db.refresh(votacion)
    except IntegrityError as error:
        db.rollback()
        raise ValueError(
            "No se pudo registrar el resultado de la votación."
        ) from error

    return votacion
