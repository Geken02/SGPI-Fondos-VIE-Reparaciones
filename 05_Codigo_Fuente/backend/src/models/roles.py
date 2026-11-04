from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class RolesSistema(Base):
    __tablename__ = "rolessistema"
    
    rolId = Column("rolid", Integer, primary_key=True, index=True)
    nombreRol = Column("nombrerol", String(100), unique=True, nullable=False)
    descripcionRol = Column("descripcionrol", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    

class UsuarioRol(Base):
    __tablename__ = "usuariorol"
    
    usuarioRolId = Column("usuariorolid", Integer, primary_key=True, index=True)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    rolId = Column("rolid", Integer, ForeignKey("rolessistema.rolid"), nullable=False)
    asignadoPorId = Column("asignadoporid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    asignadoEn = Column("asignadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fechaExpiracion = Column("fechaexpiracion", DateTime, nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activo = Column("activo", Boolean, default=True)
    
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    rol = relationship("RolesSistema")
    asignadoPor = relationship("Usuario", foreign_keys=[asignadoPorId])

class Permisos(Base):
    __tablename__ = "permisos"
    
    permisoId = Column("permisoid", Integer, primary_key=True, index=True)
    nombrePermiso = Column("nombrepermiso", String(100), unique=True, nullable=False)
    moduloId = Column("moduloid", Integer, ForeignKey("modulossistema.moduloid"), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    modulo = relationship("ModulosSistema")

class RolPermisos(Base):
    __tablename__ = "rolpermisos"
    
    rolPermisoId = Column("rolpermisoid", Integer, primary_key=True, index=True)
    rolId = Column("rolid", Integer, ForeignKey("rolessistema.rolid"), nullable=False)
    permisoId = Column("permisoid", Integer, ForeignKey("permisos.permisoid"), nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    rol = relationship("RolesSistema")
    permiso = relationship("Permisos")