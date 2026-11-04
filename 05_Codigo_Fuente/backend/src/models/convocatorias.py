from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class Convocatorias(Base):
    __tablename__ = "convocatorias"
    
    convocatoriaId = Column("convocatoriaid", Integer, primary_key=True, index=True)
    nombreConvocatoria = Column("nombreconvocatoria", String(100), nullable=False)
    fechaApertura = Column("fechaapertura", Date, nullable=False)
    fechaCierre = Column("fechacierre", Date, nullable=False)
    fechaBloqueoOrion = Column("fechabloqueoorion", Date, nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class EtapasConvocatoria(Base):
    __tablename__ = "etapasconvocatoria"
    
    etapaId = Column("etapaid", Integer, primary_key=True, index=True)
    convocatoriaId = Column("convocatoriaid", Integer, ForeignKey("convocatorias.convocatoriaid"), nullable=False)
    nombreEtapa = Column("nombreetapa", String(100), nullable=False)
    fechaInicio = Column("fechainicio", DateTime, nullable=False)
    fechaFin = Column("fechafin", DateTime, nullable=False)
    esBloqueante = Column("esbloqueante", Boolean, default=False)
    rolResponsableId = Column("rolresponsableid", Integer, ForeignKey("rolessistema.rolid"), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    convocatoria = relationship("Convocatorias")
    rolResponsable = relationship("RolesSistema")

class EstadosPropuesta(Base):
    __tablename__ = "estadospropuesta"
    
    estadoPropuestaId = Column("estadopropuestaid", Integer, primary_key=True, index=True)
    codigoEstadoPropuesta = Column("codigoestadopropuesta", String(20), unique=True, nullable=False)
    nombreEstadoPropuesta = Column("nombreestadopropuesta", String(100), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    esFinal = Column("esfinal", Boolean, default=False)
    orden = Column("orden", Integer, nullable=False)
    activo = Column("activo", Boolean, default=True)