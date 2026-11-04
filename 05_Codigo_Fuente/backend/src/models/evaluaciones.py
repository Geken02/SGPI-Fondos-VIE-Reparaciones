# src/models/evaluaciones.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposEvaluacion(Base):
    __tablename__ = "tiposevaluacion"
    
    tipoEvaluacionId = Column("tipoevaluacionid", Integer, primary_key=True, index=True)
    nombreTipoEvaluacion = Column("nombretipoevaluacion", String(50), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class TiposRecomendacion(Base):
    __tablename__ = "tiposrecomendacion"
    
    tipoRecomendacionId = Column("tiporecomendacionid", Integer, primary_key=True, index=True)
    nombreTipoRecomendacion = Column("nombretiporecomendacion", String(50), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class EstadosEvaluacion(Base):
    __tablename__ = "estadosevaluacion"
    
    estadoEvaluacionId = Column("estadoevaluacionid", Integer, primary_key=True, index=True)
    nombreEstadoEvaluacion = Column("nombreestadoevaluacion", String(50), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class CriteriosEvaluacion(Base):
    __tablename__ = "criteriosevaluacion"
    
    criterioId = Column("criterioid", Integer, primary_key=True, index=True)
    tipoEvaluacionId = Column("tipoevaluacionid", Integer, ForeignKey("tiposevaluacion.tipoevaluacionid"), nullable=False)
    nombreSeccion = Column("nombreseccion", String(100), nullable=False)
    nombreCriterio = Column("nombrecriterio", String(200), nullable=False)
    pesoPorcentaje = Column("pesoporcentaje", Numeric(5, 2), nullable=False)
    esRequisitoObligatorio = Column("esrequisitoobligatorio", Boolean, default=False)
    orden = Column("orden", Integer, nullable=False)
    activo = Column("activo", Boolean, default=True)
    
    tipoEvaluacion = relationship("TiposEvaluacion")

class Evaluaciones(Base):
    __tablename__ = "evaluaciones"
    
    evaluacionId = Column("evaluacionid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    evaluadorId = Column("evaluadorid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    tipoEvaluacionId = Column("tipoevaluacionid", Integer, ForeignKey("tiposevaluacion.tipoevaluacionid"), nullable=False)
    fechaEvaluacion = Column("fechaevaluacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    calificacion = Column("calificacion", Numeric(4, 2), nullable=True)
    tipoRecomendacionId = Column("tiporecomendacionid", Integer, ForeignKey("tiposrecomendacion.tiporecomendacionid"), nullable=True)
    observaciones = Column("observaciones", Text, nullable=True)
    
    # ✅ AQUÍ ESTABA EL ERROR: Ahora apunta correctamente a "estadosevaluacion.estadoevaluacionid"
    estadoEvaluacionId = Column("estadoevaluacionid", Integer, ForeignKey("estadosevaluacion.estadoevaluacionid"), nullable=False)
    
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="evaluaciones")
    evaluador = relationship("Usuario", foreign_keys=[evaluadorId])
    tipoEvaluacion = relationship("TiposEvaluacion")
    tipoRecomendacion = relationship("TiposRecomendacion")
    estadoEvaluacion = relationship("EstadosEvaluacion")

class DetalleEvaluacion(Base):
    __tablename__ = "detalleevaluacion"
    
    detalleEvaluacionId = Column("detalleevaluacionid", Integer, primary_key=True, index=True)
    evaluacionId = Column("evaluacionid", Integer, ForeignKey("evaluaciones.evaluacionid"), nullable=False)
    criterioId = Column("criterioid", Integer, ForeignKey("criteriosevaluacion.criterioid"), nullable=False)
    puntajeObtenido = Column("puntajeobtenido", Numeric(5, 2), nullable=False)
    justificacion = Column("justificacion", Text, nullable=True)
    esRequisitoObligatorioCumplido = Column("esrequisitoobligatoriocumplido", Boolean, nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    evaluacion = relationship("Evaluaciones")
    criterio = relationship("CriteriosEvaluacion")