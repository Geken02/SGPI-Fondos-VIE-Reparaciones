from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from src.database import Base


class AsignacionesConsejo(Base):
    __tablename__ = "asignacionesconsejo"

    asignacionId = Column(
        "asignacionid",
        Integer,
        primary_key=True,
        index=True,
    )

    propuestaId = Column(
        "propuestaid",
        Integer,
        ForeignKey("propuestas.propuestaid"),
        nullable=False,
    )

    usuarioId = Column(
        "usuarioid",
        Integer,
        ForeignKey("usuarios.usuarioid"),
        nullable=False,
    )

    asignadoPorId = Column(
        "asignadoporid",
        Integer,
        ForeignKey("usuarios.usuarioid"),
        nullable=False,
    )

    fechaAsignacion = Column(
        "fechaasignacion",
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    activo = Column(
        "activo",
        Boolean,
        default=True,
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "propuestaid",
            "usuarioid",
            name="uq_asignacion_consejo_propuesta_usuario",
        ),
    )

    propuesta = relationship("Propuesta")

    usuario = relationship(
        "Usuario",
        foreign_keys=[usuarioId],
    )

    asignadoPor = relationship(
        "Usuario",
        foreign_keys=[asignadoPorId],
    )