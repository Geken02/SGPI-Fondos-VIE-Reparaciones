from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)

from src.database import Base


class ResolucionesCIE(Base):
    """Resolución formal emitida por el Comité Institucional de Ética."""

    __tablename__ = "resolucionescie"
    __table_args__ = (
        UniqueConstraint("propuestaid", name="uq_resolucionescie_propuesta"),
    )

    resolucionCieId = Column("resolucioncieid", Integer, primary_key=True, index=True)
    propuestaId = Column(
        "propuestaid",
        Integer,
        ForeignKey("propuestas.propuestaid"),
        nullable=False,
        index=True,
    )
    numeroOficio = Column("numerooficio", String(50), nullable=True)
    fechaEmision = Column(
        "fechaemision",
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    decision = Column("decision", String(20), nullable=False)
    justificacion = Column("justificacion", Text, nullable=False)
    calificacion = Column("calificacion", Numeric(5, 2), nullable=True)
    recomendacion = Column("recomendacion", String(100), nullable=True)
    observaciones = Column("observaciones", Text, nullable=True)
    contenido = Column("contenido", Text, nullable=False)
    rutaArchivo = Column("rutaarchivo", String(500), nullable=True)
    usuarioRemitenteId = Column(
        "usuarioremitenteid",
        Integer,
        ForeignKey("usuarios.usuarioid"),
        nullable=False,
    )
    creadoEn = Column(
        "creadoen",
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    usuarioAuditoriaId = Column(
        "usuarioauditoriaid",
        Integer,
        ForeignKey("usuarios.usuarioid"),
        nullable=True,
    )
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
