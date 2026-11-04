from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone


class TokenRecuperacion(Base):
    """
    Modelo para tokens de recuperación de contraseña.
    
    Cada token es de un solo uso y tiene un tiempo de expiración (por defecto 30 minutos).
    Permite implementar el flujo estándar de "Olvidé mi contraseña" de forma segura.
    """
    __tablename__ = "tokensrecuperacion"
    
    tokenId = Column("tokenid", Integer, primary_key=True, index=True)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    token = Column("token", String(64), unique=True, nullable=False, index=True)
    fechaCreacion = Column("fechacreacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fechaExpiracion = Column("fechaexpiracion", DateTime, nullable=False)
    usado = Column("usado", Boolean, default=False, nullable=False)
    ipSolicitud = Column("ipsolicitud", String(45), nullable=True)
    userAgent = Column("useragent", String(500), nullable=True)
    
    # Relación con el usuario al que pertenece el token
    usuario = relationship("Usuario", foreign_keys=[usuarioId])