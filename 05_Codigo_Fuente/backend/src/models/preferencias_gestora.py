from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from src.database import Base


class PreferenciasGestora(Base):
    """Preferencias personales de la persona Gestora VIE, sincronizadas por cuenta."""

    __tablename__ = "preferenciasgestora"

    preferenciaId = Column("preferenciaid", Integer, primary_key=True, index=True)
    usuarioId = Column(
        "usuarioid", Integer, ForeignKey("usuarios.usuarioid"),
        unique=True, nullable=False, index=True,
    )
    notificaciones = Column("notificaciones", Boolean, nullable=False, default=True)
    resumenCorreo = Column("resumencorreo", Boolean, nullable=False, default=False)
    densidad = Column("densidad", String(12), nullable=False, default="normal")
    creadoEn = Column("creadoen", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    actualizadoEn = Column("actualizadoen", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)

    usuario = relationship("Usuario", foreign_keys=[usuarioId])
