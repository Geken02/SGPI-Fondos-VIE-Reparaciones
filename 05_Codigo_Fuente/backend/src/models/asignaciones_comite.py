# src/models/asignaciones_comite.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from src.database import Base

class AsignacionComite(Base):
    __tablename__ = 'asignacionescomite'
    
    asignacionId = Column(Integer, primary_key=True, index=True)
    propuestaId = Column(Integer, ForeignKey('propuestas.propuestaId'), nullable=False, index=True)
    evaluadorId = Column(Integer, ForeignKey('usuarios.usuarioId'), nullable=False, index=True)
    asignadoPorId = Column(Integer, ForeignKey('usuarios.usuarioId'), nullable=False)
    fechaAsignacion = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    comentarios = Column(String(200))
    activo = Column(Boolean, default=True)
    usuarioAuditoriaId = Column(Integer, ForeignKey('usuarios.usuarioId'), nullable=True)
    ultimaAuditoria = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    propuesta = relationship("Propuesta", back_populates="asignaciones")
    evaluador = relationship("Usuario", foreign_keys=[evaluadorId])
    asignadoPor = relationship("Usuario", foreign_keys=[asignadoPorId])
    usuarioAuditoria = relationship("Usuario", foreign_keys=[usuarioAuditoriaId])