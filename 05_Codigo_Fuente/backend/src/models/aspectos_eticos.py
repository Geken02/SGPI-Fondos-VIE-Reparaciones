from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class EntesRegulatorios(Base):
    __tablename__ = "entesregulatorios"
    
    enteRegulatorioId = Column("enteregulatorioid", Integer, primary_key=True, index=True)
    nombreEnteRegulatorio = Column("nombreenteregulatorio", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (EntesRegulatorios) ---
    def getEnteRegulatorioId(self):
        return self.enteRegulatorioId

    def setEnteRegulatorioId(self, valor):
        self.enteRegulatorioId = valor

    def getNombreEnteRegulatorio(self):
        return self.nombreEnteRegulatorio

    def setNombreEnteRegulatorio(self, valor):
        self.nombreEnteRegulatorio = valor

    def getDescripcion(self):
        return self.descripcion

    def setDescripcion(self, valor):
        self.descripcion = valor

    def getActivo(self):
        return self.activo

    def setActivo(self, valor):
        self.activo = valor

    def getCreadoEn(self):
        return self.creadoEn

    def setCreadoEn(self, valor):
        self.creadoEn = valor

    def getUsuarioAuditoriaId(self):
        return self.usuarioAuditoriaId

    def setUsuarioAuditoriaId(self, valor):
        self.usuarioAuditoriaId = valor

    def getUltimaAuditoria(self):
        return self.ultimaAuditoria

    def setUltimaAuditoria(self, valor):
        self.ultimaAuditoria = valor


class EstadosAval(Base):
    __tablename__ = "estadosaval"
    
    estadoAvalId = Column("estadoavalid", Integer, primary_key=True, index=True)
    nombreEstadoAval = Column("nombreestadoaval", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (EstadosAval) ---
    def getEstadoAvalId(self):
        return self.estadoAvalId

    def setEstadoAvalId(self, valor):
        self.estadoAvalId = valor

    def getNombreEstadoAval(self):
        return self.nombreEstadoAval

    def setNombreEstadoAval(self, valor):
        self.nombreEstadoAval = valor

    def getDescripcion(self):
        return self.descripcion

    def setDescripcion(self, valor):
        self.descripcion = valor

    def getActivo(self):
        return self.activo

    def setActivo(self, valor):
        self.activo = valor

    def getCreadoEn(self):
        return self.creadoEn

    def setCreadoEn(self, valor):
        self.creadoEn = valor

    def getUsuarioAuditoriaId(self):
        return self.usuarioAuditoriaId

    def setUsuarioAuditoriaId(self, valor):
        self.usuarioAuditoriaId = valor

    def getUltimaAuditoria(self):
        return self.ultimaAuditoria

    def setUltimaAuditoria(self, valor):
        self.ultimaAuditoria = valor


class AspectosEticos(Base):
    __tablename__ = "aspectoseticos"
    
    aspectoEticoId = Column("aspectoeticoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    involucraSeresHumanos = Column("involucrasereshumanos", Boolean, default=False)
    involucraBiodiversidad = Column("involucrabiodiversidad", Boolean, default=False)
    involucraAnimales = Column("involucraanimales", Boolean, default=False)
    involucraTerritoriosIndigenas = Column("involucraterritoriosindigenas", Boolean, default=False)
    justificacionExencion = Column("justificacionexencion", Text, nullable=True)
    enteRegulatorioId = Column("enteregulatorioid", Integer, ForeignKey("entesregulatorios.enteregulatorioid"), nullable=True)
    estadoAvalId = Column("estadoavalid", Integer, ForeignKey("estadosaval.estadoavalid"), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="aspectosEticos")
    enteRegulatorio = relationship("EntesRegulatorios")
    estadoAval = relationship("EstadosAval")
    # --- Getters y Setters (AspectosEticos) ---
    def getAspectoEticoId(self):
        return self.aspectoEticoId

    def setAspectoEticoId(self, valor):
        self.aspectoEticoId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getInvolucraSeresHumanos(self):
        return self.involucraSeresHumanos

    def setInvolucraSeresHumanos(self, valor):
        self.involucraSeresHumanos = valor

    def getInvolucraBiodiversidad(self):
        return self.involucraBiodiversidad

    def setInvolucraBiodiversidad(self, valor):
        self.involucraBiodiversidad = valor

    def getInvolucraAnimales(self):
        return self.involucraAnimales

    def setInvolucraAnimales(self, valor):
        self.involucraAnimales = valor

    def getInvolucraTerritoriosIndigenas(self):
        return self.involucraTerritoriosIndigenas

    def setInvolucraTerritoriosIndigenas(self, valor):
        self.involucraTerritoriosIndigenas = valor

    def getJustificacionExencion(self):
        return self.justificacionExencion

    def setJustificacionExencion(self, valor):
        self.justificacionExencion = valor

    def getEnteRegulatorioId(self):
        return self.enteRegulatorioId

    def setEnteRegulatorioId(self, valor):
        self.enteRegulatorioId = valor

    def getEstadoAvalId(self):
        return self.estadoAvalId

    def setEstadoAvalId(self, valor):
        self.estadoAvalId = valor

    def getCreadoEn(self):
        return self.creadoEn

    def setCreadoEn(self, valor):
        self.creadoEn = valor

    def getUsuarioAuditoriaId(self):
        return self.usuarioAuditoriaId

    def setUsuarioAuditoriaId(self, valor):
        self.usuarioAuditoriaId = valor

    def getUltimaAuditoria(self):
        return self.ultimaAuditoria

    def setUltimaAuditoria(self, valor):
        self.ultimaAuditoria = valor

    def getPropuesta(self):
        return self.propuesta

    def setPropuesta(self, valor):
        self.propuesta = valor

    def getEnteRegulatorio(self):
        return self.enteRegulatorio

    def setEnteRegulatorio(self, valor):
        self.enteRegulatorio = valor

    def getEstadoAval(self):
        return self.estadoAval

    def setEstadoAval(self, valor):
        self.estadoAval = valor

