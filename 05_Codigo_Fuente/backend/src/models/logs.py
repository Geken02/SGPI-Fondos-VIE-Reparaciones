from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposEvento(Base):
    __tablename__ = "tiposevento"
    
    tipoEventoId = Column("tipoeventoid", Integer, primary_key=True, index=True)
    nombreEvento = Column("nombreevento", String(50), unique=True, nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    requierePreguardado = Column("requierepreguardado", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activo = Column("activo", Boolean, default=True)

class Severidades(Base):
    __tablename__ = "severidades"
    
    severidadId = Column("severidadid", Integer, primary_key=True, index=True)
    valorSeveridad = Column("valorseveridad", Integer, nullable=False)
    nombreSeveridad = Column("nombreseveridad", String(50), unique=True, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activo = Column("activo", Boolean, default=True)

class Objetos(Base):
    __tablename__ = "objetos"
    
    objetoId = Column("objetoid", Integer, primary_key=True, index=True)
    nombreObjeto = Column("nombreobjeto", String(50), unique=True, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activo = Column("activo", Boolean, default=True)

class Sources(Base):
    __tablename__ = "sources"
    
    sourceId = Column("sourceid", Integer, primary_key=True, index=True)
    nombreSource = Column("nombresource", String(50), unique=True, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activo = Column("activo", Boolean, default=True)

class Logs(Base):
    __tablename__ = "logs"
    
    logId = Column("logid", Integer, primary_key=True, index=True)
    tipoEventoId = Column("tipoeventoid", Integer, ForeignKey("tiposevento.tipoeventoid"), nullable=False)
    severidadId = Column("severidadid", Integer, ForeignKey("severidades.severidadid"), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=False)
    sourceId = Column("sourceid", Integer, ForeignKey("sources.sourceid"), nullable=False)
    userAgent = Column("useragent", Text, nullable=True)
    computadora = Column("computadora", String(100), nullable=True)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    referenciaId1 = Column("referenciaid1", Integer, nullable=True)
    referenciaId2 = Column("referenciaid2", Integer, nullable=True)
    descripcionReferencia1 = Column("descripcionreferencia1", String(200), nullable=True)
    descripcionReferencia2 = Column("descripcionreferencia2", String(200), nullable=True)
    objetoId1 = Column("objetoid1", Integer, ForeignKey("objetos.objetoid"), nullable=True)
    objetoId2 = Column("objetoid2", Integer, ForeignKey("objetos.objetoid"), nullable=True)
    datosAnteriores = Column("datosanteriores", JSONB, nullable=True)
    datosNuevos = Column("datosnuevos", JSONB, nullable=True)
    checkSum = Column("checksum", String(64), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    activo = Column("activo", Boolean, default=True)
    
    tipoEvento = relationship("TiposEvento")
    severidad = relationship("Severidades")
    source = relationship("Sources")
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    objeto1 = relationship("Objetos", foreign_keys=[objetoId1])
    objeto2 = relationship("Objetos", foreign_keys=[objetoId2])