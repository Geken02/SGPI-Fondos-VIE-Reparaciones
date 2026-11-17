from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class EscuelaCampus(Base):
    """Tabla intermedia N a N entre Escuela y Campus con auditoría."""
    __tablename__ = "escuelacampus"
    
    escuelaId = Column("escuelaid", Integer, ForeignKey("escuelas.escuelaid"), primary_key=True)
    campusId = Column("campusid", Integer, ForeignKey("campus.campusid"), primary_key=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    escuela = relationship("Escuela", back_populates="escuela_campus_rel")
    campus = relationship("Campus", back_populates="escuela_campus_rel")


class Escuela(Base):
    __tablename__ = "escuelas"
    
    escuelaId = Column("escuelaid", Integer, primary_key=True, index=True)
    codigoEscuela = Column("codigoescuela", String(10), unique=True, nullable=False)
    nombreEscuela = Column("nombreescuela", String(150), nullable=False)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    escuela_campus_rel = relationship("EscuelaCampus", back_populates="escuela", cascade="all, delete-orphan")
    campus = relationship("Campus", secondary="escuelacampus", viewonly=True) # Para lectura fácil
    
    usuarios = relationship("Usuario", back_populates="escuela", foreign_keys="[Usuario.escuelaId]")
    usuarioAuditor = relationship("Usuario", foreign_keys="[Escuela.usuarioAuditoriaId]")


class Campus(Base):
    __tablename__ = "campus"
    
    campusId = Column("campusid", Integer, primary_key=True, index=True)
    nombreCampus = Column("nombrecampus", String(50), nullable=False)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    escuela_campus_rel = relationship("EscuelaCampus", back_populates="campus", cascade="all, delete-orphan")
    escuelas = relationship("Escuela", secondary="escuelacampus", viewonly=True)