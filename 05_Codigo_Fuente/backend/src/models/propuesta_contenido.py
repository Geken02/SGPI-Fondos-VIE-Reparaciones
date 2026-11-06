from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class PropuestaContenido(Base):
    __tablename__ = "propuestacontenido"
    
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), primary_key=True, unique=True)
    resumen = Column("resumen", String(4000), nullable=False)
    palabrasClave = Column("palabrasclave", String(255), nullable=True)
    abstract = Column("abstract", String(4000), nullable=True)
    problemaInvestigacion = Column("problemainvestigacion", String(4000), nullable=True)
    objetivoGeneral = Column("objetivogeneral", String(2000), nullable=True)
    objetivosEspecificos = Column("objetivosespecificos", String(3000), nullable=True)
    estadoArte = Column("estadoarte", String(8000), nullable=True)
    metodologia = Column("metodologia", String(6000), nullable=True)
    estrategiaDivulgacion = Column("estrategiadivulgacion", String(3000), nullable=True)
    hojaRuta = Column("hojaruta", String(4000), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="contenido")
    # --- Getters y Setters (PropuestaContenido) ---
    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getResumen(self):
        return self.resumen

    def setResumen(self, valor):
        self.resumen = valor

    def getPalabrasClave(self):
        return self.palabrasClave

    def setPalabrasClave(self, valor):
        self.palabrasClave = valor

    def getAbstract(self):
        return self.abstract

    def setAbstract(self, valor):
        self.abstract = valor

    def getProblemaInvestigacion(self):
        return self.problemaInvestigacion

    def setProblemaInvestigacion(self, valor):
        self.problemaInvestigacion = valor

    def getObjetivoGeneral(self):
        return self.objetivoGeneral

    def setObjetivoGeneral(self, valor):
        self.objetivoGeneral = valor

    def getObjetivosEspecificos(self):
        return self.objetivosEspecificos

    def setObjetivosEspecificos(self, valor):
        self.objetivosEspecificos = valor

    def getEstadoArte(self):
        return self.estadoArte

    def setEstadoArte(self, valor):
        self.estadoArte = valor

    def getMetodologia(self):
        return self.metodologia

    def setMetodologia(self, valor):
        self.metodologia = valor

    def getEstrategiaDivulgacion(self):
        return self.estrategiaDivulgacion

    def setEstrategiaDivulgacion(self, valor):
        self.estrategiaDivulgacion = valor

    def getHojaRuta(self):
        return self.hojaRuta

    def setHojaRuta(self, valor):
        self.hojaRuta = valor

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


class PropuestaDeclaraciones(Base):
    __tablename__ = "propuestadeclaraciones"
    
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), primary_key=True, unique=True)
    tieneFinanciamientoPrevio = Column("tienefinanciamientoprevio", Boolean, default=False)
    tieneContinuidadProyecto = Column("tienecontinuidadproyecto", Boolean, default=False)
    requiereInstrumentoJuridico = Column("requiereinstrumentojuridico", Boolean, default=False)
    tieneBasePosgrado = Column("tienebaseposgrado", Boolean, default=False)
    tieneInformacionConfidencial = Column("tieneinformacionconfidencial", Boolean, default=False)
    tienePotencialPI = Column("tienepotencialpi", Boolean, default=False)
    poseeInnovacion = Column("poseeinnovacion", Boolean, default=False)
    tipoInnovacionId = Column("tipoinnovacionid", Integer, ForeignKey("tiposinnovacion.tipoinnovacionid"), nullable=True)
    aceptaResguardoRepositorio = Column("aceptaresguardorepositorio", Boolean, default=False)
    aceptaDeclaracionJurada = Column("aceptadeclaracionjurada", Boolean, default=False)
    fechaFirmaDeclaracion = Column("fechafirmadeclaracion", DateTime, nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="declaraciones")
    tipoInnovacion = relationship("TiposInnovacion")
    # --- Getters y Setters (PropuestaDeclaraciones) ---
    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getTieneFinanciamientoPrevio(self):
        return self.tieneFinanciamientoPrevio

    def setTieneFinanciamientoPrevio(self, valor):
        self.tieneFinanciamientoPrevio = valor

    def getTieneContinuidadProyecto(self):
        return self.tieneContinuidadProyecto

    def setTieneContinuidadProyecto(self, valor):
        self.tieneContinuidadProyecto = valor

    def getRequiereInstrumentoJuridico(self):
        return self.requiereInstrumentoJuridico

    def setRequiereInstrumentoJuridico(self, valor):
        self.requiereInstrumentoJuridico = valor

    def getTieneBasePosgrado(self):
        return self.tieneBasePosgrado

    def setTieneBasePosgrado(self, valor):
        self.tieneBasePosgrado = valor

    def getTieneInformacionConfidencial(self):
        return self.tieneInformacionConfidencial

    def setTieneInformacionConfidencial(self, valor):
        self.tieneInformacionConfidencial = valor

    def getTienePotencialPI(self):
        return self.tienePotencialPI

    def setTienePotencialPI(self, valor):
        self.tienePotencialPI = valor

    def getPoseeInnovacion(self):
        return self.poseeInnovacion

    def setPoseeInnovacion(self, valor):
        self.poseeInnovacion = valor

    def getTipoInnovacionId(self):
        return self.tipoInnovacionId

    def setTipoInnovacionId(self, valor):
        self.tipoInnovacionId = valor

    def getAceptaResguardoRepositorio(self):
        return self.aceptaResguardoRepositorio

    def setAceptaResguardoRepositorio(self, valor):
        self.aceptaResguardoRepositorio = valor

    def getAceptaDeclaracionJurada(self):
        return self.aceptaDeclaracionJurada

    def setAceptaDeclaracionJurada(self, valor):
        self.aceptaDeclaracionJurada = valor

    def getFechaFirmaDeclaracion(self):
        return self.fechaFirmaDeclaracion

    def setFechaFirmaDeclaracion(self, valor):
        self.fechaFirmaDeclaracion = valor

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

    def getTipoInnovacion(self):
        return self.tipoInnovacion

    def setTipoInnovacion(self, valor):
        self.tipoInnovacion = valor

