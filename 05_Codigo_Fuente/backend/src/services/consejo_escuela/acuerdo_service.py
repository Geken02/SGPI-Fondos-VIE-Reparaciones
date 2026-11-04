
from sqlalchemy.orm import Session

from src.models.acuerdos import AcuerdosConsejo, TiposAcuerdo
from src.models.propuestas import Propuesta
from src.models.catalogos import TiposHora
from src.api.schemas.consejo_escuela.acuerdos import (
    AcuerdoCrear,
    AcuerdoActualizar,
)


def listar_acuerdos(db: Session):
    return (
        db.query(AcuerdosConsejo)
        .order_by(AcuerdosConsejo.acuerdoId.desc())
        .all()
    )


def obtener_acuerdo(db: Session, acuerdo_id: int):
    return (
        db.query(AcuerdosConsejo)
        .filter(AcuerdosConsejo.acuerdoId == acuerdo_id)
        .first()
    )


def crear_acuerdo(db: Session, datos: AcuerdoCrear):
    propuesta = (
        db.query(Propuesta)
        .filter(Propuesta.propuestaId == datos.propuestaId)
        .first()
    )
    if not propuesta:
        raise ValueError("La propuesta indicada no existe.")

    tipo_acuerdo = (
        db.query(TiposAcuerdo)
        .filter(
            TiposAcuerdo.tipoAcuerdoId == datos.tipoAcuerdoId,
            TiposAcuerdo.activo.is_(True),
        )
        .first()
    )
    if not tipo_acuerdo:
        raise ValueError("El tipo de acuerdo no existe o está inactivo.")

    if datos.tipoHoraId is not None:
        tipo_hora = (
            db.query(TiposHora)
            .filter(
                TiposHora.tipoHoraId == datos.tipoHoraId,
                TiposHora.activo.is_(True),
            )
            .first()
        )
        if not tipo_hora:
            raise ValueError("El tipo de hora no existe o está inactivo.")

    acuerdo = AcuerdosConsejo(**datos.model_dump())

    db.add(acuerdo)
    db.commit()
    db.refresh(acuerdo)

    return acuerdo


def actualizar_acuerdo(
    db: Session,
    acuerdo_id: int,
    datos: AcuerdoActualizar,
):
    acuerdo = obtener_acuerdo(db, acuerdo_id)

    if not acuerdo:
        raise ValueError("El acuerdo indicado no existe.")

    cambios = datos.model_dump(exclude_unset=True)

    if (
        "tipoAcuerdoId" in cambios
        and cambios["tipoAcuerdoId"] is not None
    ):
        tipo_acuerdo = (
            db.query(TiposAcuerdo)
            .filter(
                TiposAcuerdo.tipoAcuerdoId == cambios["tipoAcuerdoId"],
                TiposAcuerdo.activo.is_(True),
            )
            .first()
        )
        if not tipo_acuerdo:
            raise ValueError("El tipo de acuerdo no existe o está inactivo.")

    if (
        "tipoHoraId" in cambios
        and cambios["tipoHoraId"] is not None
    ):
        tipo_hora = (
            db.query(TiposHora)
            .filter(
                TiposHora.tipoHoraId == cambios["tipoHoraId"],
                TiposHora.activo.is_(True),
            )
            .first()
        )
        if not tipo_hora:
            raise ValueError("El tipo de hora no existe o está inactivo.")

    for campo, valor in cambios.items():
        setattr(acuerdo, campo, valor)

    db.commit()
    db.refresh(acuerdo)

    return acuerdo
