# src/models/votaciones_consejo.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone


class VotacionesConsejo(Base):
    """
    Representa una votación del Consejo de Escuela sobre una propuesta.
    Solo puede existir una votación por propuesta (propuestaid es UNIQUE).
    """
    __tablename__ = "votacionesconsejo"

    votacionId = Column("votacionid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False, unique=True)
    estadoVotacion = Column("estadovotacion", String(10), nullable=False, default="ABIERTA")
    resultadoConsejo = Column("resultadoconsejo", String(20), nullable=True)
    fechaApertura = Column("fechaapertura", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fechaCierre = Column("fechacierre", DateTime, nullable=True)
    observaciones = Column("observaciones", String(1000), nullable=True)
    usuarioResultadoId = Column("usuarioresultadoid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    creadoEn = Column("creadoen", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    # Relaciones
    propuesta = relationship("Propuesta", back_populates="votacionConsejo", foreign_keys=[propuestaId])
    usuarioResultado = relationship("Usuario", foreign_keys=[usuarioResultadoId])
    usuarioAuditoria = relationship("Usuario", foreign_keys=[usuarioAuditoriaId])
    votos = relationship(
        "VotosConsejo",
        back_populates="votacion",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # Constraints CHECK
    __table_args__ = (
        CheckConstraint(
            "estadovotacion IN ('ABIERTA', 'CERRADA')",
            name="chk_votacionesconsejo_estado"
        ),
        CheckConstraint(
            "resultadoconsejo IS NULL OR resultadoconsejo IN ('APROBADA', 'RECHAZADA', 'DEVUELTA_AJUSTES')",
            name="chk_votacionesconsejo_resultado"
        ),
        CheckConstraint(
            """(
                (estadovotacion = 'ABIERTA' AND fechacierre IS NULL AND resultadoconsejo IS NULL AND usuarioresultadoid IS NULL)
                OR
                (estadovotacion = 'CERRADA' AND fechacierre IS NOT NULL AND resultadoconsejo IS NOT NULL AND usuarioresultadoid IS NOT NULL)
            )""",
            name="chk_votacionesconsejo_cierre"
        ),
        {'extend_existing': True}
    )


class VotosConsejo(Base):
    """
    Representa el voto individual de un integrante del Consejo sobre una votación específica.
    Un usuario solo puede votar una vez por votación (UNIQUE votacionid + usuarioid).
    """
    __tablename__ = "votosconsejo"

    votoId = Column("votoid", Integer, primary_key=True, index=True)
    votacionId = Column("votacionid", Integer, ForeignKey("votacionesconsejo.votacionid", ondelete="CASCADE"), nullable=False)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    voto = Column("voto", String(12), nullable=False)
    observaciones = Column("observaciones", String(1000), nullable=True)
    fechaVoto = Column("fechavoto", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    creadoEn = Column("creadoen", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    # Relaciones
    votacion = relationship("VotacionesConsejo", back_populates="votos", foreign_keys=[votacionId])
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    usuarioAuditoria = relationship("Usuario", foreign_keys=[usuarioAuditoriaId])

    # Constraints UNIQUE y CHECK
    __table_args__ = (
        UniqueConstraint("votacionid", "usuarioid", name="uq_votosconsejo_usuario"),
        CheckConstraint(
            "voto IN ('APROBAR', 'RECHAZAR', 'ABSTENCION')",
            name="chk_votosconsejo_voto"
        ),
        {'extend_existing': True}
    )