# src/models/usuarios.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class Usuario(Base):
    __tablename__ = "usuarios"
    
    usuarioId = Column("usuarioid", Integer, primary_key=True, index=True)
    correoInstitucional = Column("correoinstitucional", String(100), unique=True, nullable=False, index=True)
    nombreUsuario = Column("nombreusuario", String(50), nullable=False)
    apellido1Usuario = Column("apellido1usuario", String(50), nullable=False)
    apellido2Usuario = Column("apellido2usuario", String(50), nullable=True)
    telefono = Column("telefono", String(15), nullable=True)
    escuelaId = Column("escuelaid", Integer, ForeignKey("escuelas.escuelaid"), nullable=True)
    
    contrasenaHash = Column("contrasenahash", String(255), nullable=True)
    ultimoAcceso = Column("ultimoacceso", DateTime, nullable=True)
    
    fechaCreacion = Column("fechacreacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    activo = Column("activo", Boolean, default=True)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    # Las relaciones usan el nombre de la variable Python (CamelCase)
    escuela = relationship("Escuela", back_populates="usuarios", foreign_keys=[escuelaId])
    roles = relationship(
        "UsuarioRol", 
        back_populates="usuario", 
        foreign_keys="[UsuarioRol.usuarioId]", 
        lazy="selectin"
    )


