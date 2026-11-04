from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposNotificacion(Base):
    __tablename__ = "tiposnotificacion"
    
    tipoNotificacionId = Column("tiponotificacionid", Integer, primary_key=True, index=True)
    nombreTipoNotificacion = Column("nombretiponotificacion", String(30), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class CanalesComunicacion(Base):
    __tablename__ = "canalescomunicacion"
    
    canalId = Column("canalid", Integer, primary_key=True, index=True)
    nombreCanal = Column("nombrecanal", String(30), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class Notificaciones(Base):
    __tablename__ = "notificaciones"
    
    notificacionId = Column("notificacionid", Integer, primary_key=True, index=True)
    usuarioDestinoId = Column("usuariodestinoid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=True)
    tipoNotificacionId = Column("tiponotificacionid", Integer, ForeignKey("tiposnotificacion.tiponotificacionid"), nullable=False)
    asunto = Column("asunto", String(200), nullable=False)
    cuerpoMensaje = Column("cuerpomensaje", Text, nullable=False)
    fechaEnvio = Column("fechaenvio", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fechaLectura = Column("fechalectura", DateTime, nullable=True)
    leida = Column("leida", Boolean, default=False)
    canalId = Column("canalid", Integer, ForeignKey("canalescomunicacion.canalid"), nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    usuarioDestino = relationship("Usuario", foreign_keys=[usuarioDestinoId])
    propuesta = relationship("Propuesta", back_populates="notificaciones")
    tipoNotificacion = relationship("TiposNotificacion")
    canal = relationship("CanalesComunicacion")