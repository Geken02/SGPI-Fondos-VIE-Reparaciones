# src/models/asignaciones_comite.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from src.database import Base

class AsignacionComite(Base):
    __tablename__ = 'asignacionescomite'
    
    # Mapeo explícito a minúsculas para coincidir con PostgreSQL
    asignacionId = Column("asignacionid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False, index=True)
    evaluadorId = Column("evaluadorid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False, index=True)
    asignadoPorId = Column("asignadoporid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaAsignacion = Column("fechaasignacion", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    comentarios = Column("comentarios", String(200), nullable=True)
    activo = Column("activo", Boolean, default=True)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones simplificadas para evitar conflictos de back_populates
    propuesta = relationship("Propuesta")
    evaluador = relationship("Usuario", foreign_keys=[evaluadorId])
    asignadoPor = relationship("Usuario", foreign_keys=[asignadoPorId])