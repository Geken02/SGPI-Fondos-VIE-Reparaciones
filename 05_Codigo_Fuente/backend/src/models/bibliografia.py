from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class Autores(Base):
    __tablename__ = "autores"
    
    autorId = Column("autorid", Integer, primary_key=True, index=True)
    nombreCompleto = Column("nombrecompleto", String(150), nullable=False)
    orcid = Column("orcid", String(20), unique=True, nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (Autores) ---
    def getAutorId(self):
        return self.autorId

    def setAutorId(self, valor):
        self.autorId = valor

    def getNombreCompleto(self):
        return self.nombreCompleto

    def setNombreCompleto(self, valor):
        self.nombreCompleto = valor

    def getOrcid(self):
        return self.orcid

    def setOrcid(self, valor):
        self.orcid = valor

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


class FuentesBibliograficas(Base):
    __tablename__ = "fuentesbibliograficas"
    
    fuenteId = Column("fuenteid", Integer, primary_key=True, index=True)
    doi = Column("doi", String(100), unique=True, nullable=True)
    titulo = Column("titulo", String(500), nullable=False)
    anioPublicacion = Column("aniopublicacion", Integer, nullable=False)
    revistaFuente = Column("revistafuente", String(200), nullable=True)
    esIndexadaWoSScopus = Column("esindexadowossCopus", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (FuentesBibliograficas) ---
    def getFuenteId(self):
        return self.fuenteId

    def setFuenteId(self, valor):
        self.fuenteId = valor

    def getDoi(self):
        return self.doi

    def setDoi(self, valor):
        self.doi = valor

    def getTitulo(self):
        return self.titulo

    def setTitulo(self, valor):
        self.titulo = valor

    def getAnioPublicacion(self):
        return self.anioPublicacion

    def setAnioPublicacion(self, valor):
        self.anioPublicacion = valor

    def getRevistaFuente(self):
        return self.revistaFuente

    def setRevistaFuente(self, valor):
        self.revistaFuente = valor

    def getEsIndexadaWoSScopus(self):
        return self.esIndexadaWoSScopus

    def setEsIndexadaWoSScopus(self, valor):
        self.esIndexadaWoSScopus = valor

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


class AutorFuente(Base):
    __tablename__ = "autorfuente"
    
    autorFuenteId = Column("autorfuenteid", Integer, primary_key=True, index=True)
    autorId = Column("autorid", Integer, ForeignKey("autores.autorid"), nullable=False)
    fuenteId = Column("fuenteid", Integer, ForeignKey("fuentesbibliograficas.fuenteid"), nullable=False)
    ordenAutoria = Column("ordenautoria", Integer, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    autor = relationship("Autores")
    fuente = relationship("FuentesBibliograficas")
    # --- Getters y Setters (AutorFuente) ---
    def getAutorFuenteId(self):
        return self.autorFuenteId

    def setAutorFuenteId(self, valor):
        self.autorFuenteId = valor

    def getAutorId(self):
        return self.autorId

    def setAutorId(self, valor):
        self.autorId = valor

    def getFuenteId(self):
        return self.fuenteId

    def setFuenteId(self, valor):
        self.fuenteId = valor

    def getOrdenAutoria(self):
        return self.ordenAutoria

    def setOrdenAutoria(self, valor):
        self.ordenAutoria = valor

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

    def getAutor(self):
        return self.autor

    def setAutor(self, valor):
        self.autor = valor

    def getFuente(self):
        return self.fuente

    def setFuente(self, valor):
        self.fuente = valor


class PropuestaReferencia(Base):
    __tablename__ = "propuestareferencia"
    
    propuestaReferenciaId = Column("propuestareferenciaid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    fuenteId = Column("fuenteid", Integer, ForeignKey("fuentesbibliograficas.fuenteid"), nullable=False)
    ordenReferencia = Column("ordenreferencia", Integer, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="referencias")
    fuente = relationship("FuentesBibliograficas")
    # --- Getters y Setters (PropuestaReferencia) ---
    def getPropuestaReferenciaId(self):
        return self.propuestaReferenciaId

    def setPropuestaReferenciaId(self, valor):
        self.propuestaReferenciaId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getFuenteId(self):
        return self.fuenteId

    def setFuenteId(self, valor):
        self.fuenteId = valor

    def getOrdenReferencia(self):
        return self.ordenReferencia

    def setOrdenReferencia(self, valor):
        self.ordenReferencia = valor

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

    def getFuente(self):
        return self.fuente

    def setFuente(self, valor):
        self.fuente = valor

