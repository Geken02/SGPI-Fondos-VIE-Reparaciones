# src/models/presupuesto.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone


# ============================================================================
# TIPOS DE FINANCIAMIENTO
# ============================================================================
class TiposFinanciamiento(Base):
    __tablename__ = "tiposfinanciamiento"
    
    tipoFinanciamientoId = Column("tipofinanciamientoid", Integer, primary_key=True, index=True)
    nombreTipoFinanciamiento = Column("nombretipofinanciamiento", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    # --- Getters y Setters ---
    def getTipoFinanciamientoId(self): return self.tipoFinanciamientoId
    def setTipoFinanciamientoId(self, valor): self.tipoFinanciamientoId = valor
    def getNombreTipoFinanciamiento(self): return self.nombreTipoFinanciamiento
    def setNombreTipoFinanciamiento(self, valor): self.nombreTipoFinanciamiento = valor
    def getDescripcion(self): return self.descripcion
    def setDescripcion(self, valor): self.descripcion = valor
    def getActivo(self): return self.activo
    def setActivo(self, valor): self.activo = valor
    def getCreadoEn(self): return self.creadoEn
    def setCreadoEn(self, valor): self.creadoEn = valor
    def getUsuarioAuditoriaId(self): return self.usuarioAuditoriaId
    def setUsuarioAuditoriaId(self, valor): self.usuarioAuditoriaId = valor
    def getUltimaAuditoria(self): return self.ultimaAuditoria
    def setUltimaAuditoria(self, valor): self.ultimaAuditoria = valor


# ============================================================================
# ENTIDADES EMISORAS
# ============================================================================
class EntidadesEmisoras(Base):
    __tablename__ = "entidadesemisoras"
    
    entidadEmisoraId = Column("entidademisoraid", Integer, primary_key=True, index=True)
    nombreEntidadEmisora = Column("nombreentidademisora", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    # --- Getters y Setters ---
    def getEntidadEmisoraId(self): return self.entidadEmisoraId
    def setEntidadEmisoraId(self, valor): self.entidadEmisoraId = valor
    def getNombreEntidadEmisora(self): return self.nombreEntidadEmisora
    def setNombreEntidadEmisora(self, valor): self.nombreEntidadEmisora = valor
    def getDescripcion(self): return self.descripcion
    def setDescripcion(self, valor): self.descripcion = valor
    def getActivo(self): return self.activo
    def setActivo(self, valor): self.activo = valor
    def getCreadoEn(self): return self.creadoEn
    def setCreadoEn(self, valor): self.creadoEn = valor
    def getUsuarioAuditoriaId(self): return self.usuarioAuditoriaId
    def setUsuarioAuditoriaId(self, valor): self.usuarioAuditoriaId = valor
    def getUltimaAuditoria(self): return self.ultimaAuditoria
    def setUltimaAuditoria(self, valor): self.ultimaAuditoria = valor


# ============================================================================
# RUBROS DE PROPUESTA
# ============================================================================
class RubrosPropuesta(Base):
    __tablename__ = "rubrospropuesta"
    
    rubroId = Column("rubroid", Integer, primary_key=True, index=True)
    nombreRubro = Column("nombrerubro", String(100), nullable=False)
    descripcionRubro = Column("descripcionrubro", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

    # --- Getters y Setters ---
    def getRubroId(self): return self.rubroId
    def setRubroId(self, valor): self.rubroId = valor
    def getNombreRubro(self): return self.nombreRubro
    def setNombreRubro(self, valor): self.nombreRubro = valor
    def getDescripcionRubro(self): return self.descripcionRubro
    def setDescripcionRubro(self, valor): self.descripcionRubro = valor
    def getActivo(self): return self.activo
    def setActivo(self, valor): self.activo = valor
    def getCreadoEn(self): return self.creadoEn
    def setCreadoEn(self, valor): self.creadoEn = valor
    def getUsuarioAuditoriaId(self): return self.usuarioAuditoriaId
    def setUsuarioAuditoriaId(self, valor): self.usuarioAuditoriaId = valor
    def getUltimaAuditoria(self): return self.ultimaAuditoria
    def setUltimaAuditoria(self, valor): self.ultimaAuditoria = valor


# ============================================================================
# PRESUPUESTO DE PROPUESTA
# ============================================================================
class PresupuestoPropuesta(Base):
    __tablename__ = "presupuestopropuesta"
    
    presupuestoId = Column("presupuestoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    rubroId = Column("rubroid", Integer, ForeignKey("rubrospropuesta.rubroid"), nullable=False)
    montoSolicitado = Column("montosolicitado", Numeric(12, 2), nullable=False)
    montoAprobado = Column("montoaprobado", Numeric(12, 2), nullable=True)
    anioEjecucion = Column("anioejecucion", Integer, nullable=False)
    esDuradero = Column("esduradero", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    # Relaciones
    propuesta = relationship("Propuesta", back_populates="presupuesto")
    rubro = relationship("RubrosPropuesta")

    # --- Getters y Setters ---
    def getPresupuestoId(self): return self.presupuestoId
    def setPresupuestoId(self, valor): self.presupuestoId = valor
    def getPropuestaId(self): return self.propuestaId
    def setPropuestaId(self, valor): self.propuestaId = valor
    def getRubroId(self): return self.rubroId
    def setRubroId(self, valor): self.rubroId = valor
    def getMontoSolicitado(self): return self.montoSolicitado
    def setMontoSolicitado(self, valor): self.montoSolicitado = valor
    def getMontoAprobado(self): return self.montoAprobado
    def setMontoAprobado(self, valor): self.montoAprobado = valor
    def getAnioEjecucion(self): return self.anioEjecucion
    def setAnioEjecucion(self, valor): self.anioEjecucion = valor
    def getEsDuradero(self): return self.esDuradero
    def setEsDuradero(self, valor): self.esDuradero = valor
    def getCreadoEn(self): return self.creadoEn
    def setCreadoEn(self, valor): self.creadoEn = valor
    def getUsuarioAuditoriaId(self): return self.usuarioAuditoriaId
    def setUsuarioAuditoriaId(self, valor): self.usuarioAuditoriaId = valor
    def getUltimaAuditoria(self): return self.ultimaAuditoria
    def setUltimaAuditoria(self, valor): self.ultimaAuditoria = valor
    def getPropuesta(self): return self.propuesta
    def setPropuesta(self, valor): self.propuesta = valor
    def getRubro(self): return self.rubro
    def setRubro(self, valor): self.rubro = valor


# ============================================================================
# FINANCIAMIENTO EXTERNO
# ============================================================================
class FinanciamientoExterno(Base):
    __tablename__ = "financiamientoexterno"
    
    financiamientoId = Column("financiamientoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    tipoFinanciamientoId = Column("tipofinanciamientoid", Integer, ForeignKey("tiposfinanciamiento.tipofinanciamientoid"), nullable=False)
    anio = Column("anio", Integer, nullable=False)
    monto = Column("monto", Numeric(12, 2), nullable=False)
    numeroOficio = Column("numerooficio", String(50), nullable=True)
    entidadEmisoraId = Column("entidademisoraid", Integer, ForeignKey("entidadesemisoras.entidademisoraid"), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    # Relaciones
    propuesta = relationship("Propuesta", back_populates="financiamientoExterno")
    tipoFinanciamiento = relationship("TiposFinanciamiento")
    entidadEmisora = relationship("EntidadesEmisoras")

    # --- Getters y Setters ---
    def getFinanciamientoId(self): return self.financiamientoId
    def setFinanciamientoId(self, valor): self.financiamientoId = valor
    def getPropuestaId(self): return self.propuestaId
    def setPropuestaId(self, valor): self.propuestaId = valor
    def getTipoFinanciamientoId(self): return self.tipoFinanciamientoId
    def setTipoFinanciamientoId(self, valor): self.tipoFinanciamientoId = valor
    def getAnio(self): return self.anio
    def setAnio(self, valor): self.anio = valor
    def getMonto(self): return self.monto
    def setMonto(self, valor): self.monto = valor
    def getNumeroOficio(self): return self.numeroOficio
    def setNumeroOficio(self, valor): self.numeroOficio = valor
    def getEntidadEmisoraId(self): return self.entidadEmisoraId
    def setEntidadEmisoraId(self, valor): self.entidadEmisoraId = valor
    def getCreadoEn(self): return self.creadoEn
    def setCreadoEn(self, valor): self.creadoEn = valor
    def getUsuarioAuditoriaId(self): return self.usuarioAuditoriaId
    def setUsuarioAuditoriaId(self, valor): self.usuarioAuditoriaId = valor
    def getUltimaAuditoria(self): return self.ultimaAuditoria
    def setUltimaAuditoria(self, valor): self.ultimaAuditoria = valor
    def getPropuesta(self): return self.propuesta
    def setPropuesta(self, valor): self.propuesta = valor
    def getTipoFinanciamiento(self): return self.tipoFinanciamiento
    def setTipoFinanciamiento(self, valor): self.tipoFinanciamiento = valor
    def getEntidadEmisora(self): return self.entidadEmisora
    def setEntidadEmisora(self, valor): self.entidadEmisora = valor