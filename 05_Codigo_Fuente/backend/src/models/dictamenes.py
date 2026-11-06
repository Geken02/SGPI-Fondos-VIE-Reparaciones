from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposDictamen(Base):
    __tablename__ = "tiposdictamen"
    
    tipoDictamenId = Column("tipodictamenid", Integer, primary_key=True, index=True)
    nombreTipoDictamen = Column("nombretipodictamen", String(50), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (TiposDictamen) ---
    def getTipoDictamenId(self):
        return self.tipoDictamenId

    def setTipoDictamenId(self, valor):
        self.tipoDictamenId = valor

    def getNombreTipoDictamen(self):
        return self.nombreTipoDictamen

    def setNombreTipoDictamen(self, valor):
        self.nombreTipoDictamen = valor

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


class Dictamenes(Base):
    __tablename__ = "dictamenes"
    
    dictamenId = Column("dictamenid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    tipoDictamenId = Column("tipodictamenid", Integer, ForeignKey("tiposdictamen.tipodictamenid"), nullable=True)
    numeroOficio = Column("numerooficio", String(50), nullable=True)
    fechaEmision = Column("fechaemision", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    contenido = Column("contenido", Text, nullable=False)
    rutaArchivo = Column("rutaarchivo", String(500), nullable=True)
    usuarioRemitenteId = Column("usuarioremitenteid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="dictamenes")
    tipoDictamen = relationship("TiposDictamen")
    usuarioRemitente = relationship("Usuario", foreign_keys=[usuarioRemitenteId])
    # --- Getters y Setters (Dictamenes) ---
    def getDictamenId(self):
        return self.dictamenId

    def setDictamenId(self, valor):
        self.dictamenId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getNumeroOficio(self):
        return self.numeroOficio

    def setNumeroOficio(self, valor):
        self.numeroOficio = valor

    def getFechaEmision(self):
        return self.fechaEmision

    def setFechaEmision(self, valor):
        self.fechaEmision = valor

    def getContenido(self):
        return self.contenido

    def setContenido(self, valor):
        self.contenido = valor

    def getRutaArchivo(self):
        return self.rutaArchivo

    def setRutaArchivo(self, valor):
        self.rutaArchivo = valor

    def getUsuarioRemitenteId(self):
        return self.usuarioRemitenteId

    def setUsuarioRemitenteId(self, valor):
        self.usuarioRemitenteId = valor

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

    def getUsuarioRemitente(self):
        return self.usuarioRemitente

    def setUsuarioRemitente(self, valor):
        self.usuarioRemitente = valor

