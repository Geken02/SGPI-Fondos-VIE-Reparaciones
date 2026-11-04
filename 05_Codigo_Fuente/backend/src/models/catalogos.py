from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone


class LineasInvestigacion(Base):
    __tablename__ = "lineasinvestigacion"
    
    lineaId = Column("lineaid", Integer, primary_key=True, index=True)
    nombreLinea = Column("nombrelinea", String(200), unique=True, nullable=False)
    descripcion = Column("descripcion", String(500), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class TiposHora(Base):
    __tablename__ = "tiposhora"
    
    tipoHoraId = Column("tipohoraid", Integer, primary_key=True, index=True)
    codigoTipo = Column("codigotipo", String(20), unique=True, nullable=False)
    descripcion = Column("descripcion", String(100), nullable=False)
    activo = Column("activo", Boolean, default=True)


class NivelesTrl(Base):
    __tablename__ = "nivelestrl"
    
    nivelTrlId = Column("niveltrlid", Integer, primary_key=True)
    descripcionNivel = Column("descripcionnivel", String(500), nullable=False)
    activo = Column("activo", Boolean, default=True)


class Modalidades(Base):
    __tablename__ = "modalidades"
    
    modalidadId = Column("modalidadid", Integer, primary_key=True, index=True)
    nombreModalidad = Column("nombremodalidad", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class TiposInnovacion(Base):
    __tablename__ = "tiposinnovacion"
    
    tipoInnovacionId = Column("tipoinnovacionid", Integer, primary_key=True, index=True)
    nombreTipoInnovacion = Column("nombretipoinnovacion", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class ModulosSistema(Base):
    __tablename__ = "modulossistema"
    
    moduloId = Column("moduloid", Integer, primary_key=True, index=True)
    nombreModulo = Column("nombremodulo", String(50), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class TamaniosFuente(Base):
    __tablename__ = "tamaniosfuente"
    
    tamanioFuenteId = Column("tamaniofuenteid", Integer, primary_key=True, index=True)
    nombreTamanioFuente = Column("nombretamaniofuente", String(20), nullable=False, default='Normal')
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class FiltrosDaltonismo(Base):
    __tablename__ = "filtrosdaltonismo"
    
    filtroDaltonismoId = Column("filtrodaltonismoid", Integer, primary_key=True, index=True)
    nombreFiltroDaltonismo = Column("nombrefiltrodaltonismo", String(30), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)


class ConfiguracionesSistema(Base):
    __tablename__ = "configuracionessistema"
    
    configuracionId = Column("configuracionid", Integer, primary_key=True, index=True)
    claveConfiguracion = Column("claveconfiguracion", String(100), unique=True, nullable=False)
    valorConfiguracion = Column("valorconfiguracion", Text, nullable=False)
    categoria = Column("categoria", String(50), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    esPublica = Column("espublica", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    activa = Column("activa", Boolean, default=True)


class AsignacionesGestora(Base):
    __tablename__ = "asignacionesgestora"
    
    asignacionId = Column("asignacionid", Integer, primary_key=True, index=True)
    escuelaId = Column("escuelaid", Integer, ForeignKey("escuelas.escuelaid"), nullable=False)
    gestoraVIEId = Column("gestoravieid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaAsignacion = Column("fechaasignacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    escuela = relationship("Escuela")
    gestoraVIE = relationship("Usuario", foreign_keys=[gestoraVIEId])


class PreferenciasAccesibilidad(Base):
    __tablename__ = "preferenciasaccesibilidad"
    
    preferenciaId = Column("preferenciaid", Integer, primary_key=True, index=True)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), unique=True, nullable=False)
    modoAltoContraste = Column("modoaltocontraste", Boolean, default=False)
    tamanioFuenteId = Column("tamaniofuenteid", Integer, ForeignKey("tamaniosfuente.tamaniofuenteid"), nullable=False)
    filtroDaltonismoId = Column("filtrodaltonismoid", Integer, ForeignKey("filtrosdaltonismo.filtrodaltonismoid"), nullable=False)
    reducirAnimaciones = Column("reduciranimaciones", Boolean, default=False)
    optimizarLectorPantalla = Column("optimizarlectorpantalla", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    tamanioFuente = relationship("TamaniosFuente")
    filtroDaltonismo = relationship("FiltrosDaltonismo")


class HistorialEstadosPropuesta(Base):
    __tablename__ = "historialestadospropuesta"
    
    historialEstadoId = Column("historialestadoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    estadoAnteriorId = Column("estadoanteriorid", Integer, ForeignKey("estadospropuesta.estadopropuestaid"), nullable=True)
    estadoNuevoId = Column("estadonuevoid", Integer, ForeignKey("estadospropuesta.estadopropuestaid"), nullable=False)
    usuarioResponsableId = Column("usuarioresponsableid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaCambio = Column("fechacambio", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    observaciones = Column("observaciones", Text, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="historialEstados")

    estadoAnterior = relationship("EstadosPropuesta", foreign_keys=[estadoAnteriorId])
    estadoNuevo = relationship("EstadosPropuesta", foreign_keys=[estadoNuevoId])
    usuarioResponsable = relationship("Usuario", foreign_keys=[usuarioResponsableId])