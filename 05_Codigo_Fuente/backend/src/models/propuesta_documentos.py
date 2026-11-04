from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposDocumento(Base):
    __tablename__ = "tiposdocumento"
    
    tipoDocumentoId = Column("tipodocumentoid", Integer, primary_key=True, index=True)
    nombreTipoDocumento = Column("nombretipodocumento", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (TiposDocumento) ---
    def getTipoDocumentoId(self):
        return self.tipoDocumentoId

    def setTipoDocumentoId(self, valor):
        self.tipoDocumentoId = valor

    def getNombreTipoDocumento(self):
        return self.nombreTipoDocumento

    def setNombreTipoDocumento(self, valor):
        self.nombreTipoDocumento = valor

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


class PropuestaDocumentos(Base):
    __tablename__ = "propuestadocumentos"
    
    documentoId = Column("documentoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    tipoDocumentoId = Column("tipodocumentoid", Integer, ForeignKey("tiposdocumento.tipodocumentoid"), nullable=False)
    rutaArchivo = Column("rutaarchivo", String(500), nullable=False)
    nombreArchivo = Column("nombrearchivo", String(255), nullable=False)
    tamanioBytes = Column("tamaniobytes", Integer, nullable=True)
    checksum = Column("checksum", String(64), nullable=True)
    fechaCarga = Column("fechacarga", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioCargaId = Column("usuariocargaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    activo = Column("activo", Boolean, default=True)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="documentos")
    tipoDocumento = relationship("TiposDocumento")
    usuarioCarga = relationship("Usuario", foreign_keys=[usuarioCargaId])
    # --- Getters y Setters (PropuestaDocumentos) ---
    def getDocumentoId(self):
        return self.documentoId

    def setDocumentoId(self, valor):
        self.documentoId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getTipoDocumentoId(self):
        return self.tipoDocumentoId

    def setTipoDocumentoId(self, valor):
        self.tipoDocumentoId = valor

    def getRutaArchivo(self):
        return self.rutaArchivo

    def setRutaArchivo(self, valor):
        self.rutaArchivo = valor

    def getNombreArchivo(self):
        return self.nombreArchivo

    def setNombreArchivo(self, valor):
        self.nombreArchivo = valor

    def getTamanioBytes(self):
        return self.tamanioBytes

    def setTamanioBytes(self, valor):
        self.tamanioBytes = valor

    def getChecksum(self):
        return self.checksum

    def setChecksum(self, valor):
        self.checksum = valor

    def getFechaCarga(self):
        return self.fechaCarga

    def setFechaCarga(self, valor):
        self.fechaCarga = valor

    def getUsuarioCargaId(self):
        return self.usuarioCargaId

    def setUsuarioCargaId(self, valor):
        self.usuarioCargaId = valor

    def getActivo(self):
        return self.activo

    def setActivo(self, valor):
        self.activo = valor

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

    def getTipoDocumento(self):
        return self.tipoDocumento

    def setTipoDocumento(self, valor):
        self.tipoDocumento = valor

    def getUsuarioCarga(self):
        return self.usuarioCarga

    def setUsuarioCarga(self, valor):
        self.usuarioCarga = valor

