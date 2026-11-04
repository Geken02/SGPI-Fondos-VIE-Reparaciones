from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class Propuesta(Base):
    __tablename__ = "propuestas"
    
    propuestaId = Column("propuestaid", Integer, primary_key=True, index=True)
    codigoPropuesta = Column("codigopropuesta", String(20), unique=True, nullable=False, index=True)
    titulo = Column("titulo", String(300), nullable=False)
    estadoId = Column("estadoid", Integer, ForeignKey("estadospropuesta.estadopropuestaid"), nullable=False)
    etapaId = Column("etapaid", Integer, ForeignKey("etapasconvocatoria.etapaid"), nullable=False)
    convocatoriaId = Column("convocatoriaid", Integer, ForeignKey("convocatorias.convocatoriaid"), nullable=False)
    investigadorCoordId = Column("investigadorcoordid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    escuelaId = Column("escuelaid", Integer, ForeignKey("escuelas.escuelaid"), nullable=False)
    lineaInvestigacionId = Column("lineainvestigacionid", Integer, ForeignKey("lineasinvestigacion.lineaid"), nullable=True)
    modalidadId = Column("modalidadid", Integer, ForeignKey("modalidades.modalidadid"), nullable=True)
    montoTotal = Column("montototal", Numeric(12, 2), nullable=False)
    nivelTrlActual = Column("niveltrlactual", Integer, nullable=True)
    nivelTrlEsperado = Column("niveltrlesperado", Integer, nullable=True)
    fechaInicio = Column("fechainicio", Date, nullable=True)
    fechaFinalizacion = Column("fechafinalizacion", Date, nullable=True)
    fechaCreacion = Column("fechacreacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    fechaEnvio = Column("fechaenvio", DateTime, nullable=True)
    propuestaAnteriorId = Column("propuestaanteriorid", Integer, ForeignKey("propuestas.propuestaid"), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    investigador = relationship("Usuario", foreign_keys=[investigadorCoordId])
    escuela = relationship("Escuela")
    lineaInvestigacion = relationship("LineasInvestigacion")
    modalidad = relationship("Modalidades")
    propuestaAnterior = relationship("Propuesta", remote_side=[propuestaId])
    
    contenido = relationship("PropuestaContenido", back_populates="propuesta", uselist=False)
    declaraciones = relationship("PropuestaDeclaraciones", back_populates="propuesta", uselist=False)
    objetivosEspecificos = relationship("ObjetivosEspecificos", back_populates="propuesta")
    actividades = relationship("Actividades", back_populates="propuesta")
    integrantes = relationship("IntegrantesEquipoPropuesta", back_populates="propuesta")
    colaboradoresExternos = relationship("ColaboradoresExternos", back_populates="propuesta")
    documentos = relationship("PropuestaDocumentos", back_populates="propuesta")
    financiamientoExterno = relationship("FinanciamientoExterno", back_populates="propuesta")
    aspectosEticos = relationship("AspectosEticos", back_populates="propuesta")
    presupuesto = relationship("PresupuestoPropuesta", back_populates="propuesta")
    productosAcademicos = relationship("ProductosAcademicos", back_populates="propuesta")
    evaluaciones = relationship("Evaluaciones", back_populates="propuesta")
    dictamenes = relationship("Dictamenes", back_populates="propuesta")
    acuerdos = relationship("AcuerdosConsejo", back_populates="propuesta")
    votacionConsejo = relationship("VotacionesConsejo", back_populates="propuesta", uselist=False)  
    historialEstados = relationship("HistorialEstadosPropuesta", back_populates="propuesta")
    subsanaciones = relationship("Subsanaciones", back_populates="propuesta")
    referencias = relationship("PropuestaReferencia", back_populates="propuesta")
    notificaciones = relationship("Notificaciones", back_populates="propuesta")
    # --- Getters y Setters (Propuesta) ---
    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getCodigoPropuesta(self):
        return self.codigoPropuesta

    def setCodigoPropuesta(self, valor):
        self.codigoPropuesta = valor

    def getTitulo(self):
        return self.titulo

    def setTitulo(self, valor):
        self.titulo = valor

    def getEstadoId(self):
        return self.estadoId

    def setEstadoId(self, valor):
        self.estadoId = valor

    def getEtapaId(self):
        return self.etapaId

    def setEtapaId(self, valor):
        self.etapaId = valor

    def getConvocatoriaId(self):
        return self.convocatoriaId

    def setConvocatoriaId(self, valor):
        self.convocatoriaId = valor

    def getInvestigadorCoordId(self):
        return self.investigadorCoordId

    def setInvestigadorCoordId(self, valor):
        self.investigadorCoordId = valor

    def getEscuelaId(self):
        return self.escuelaId

    def setEscuelaId(self, valor):
        self.escuelaId = valor

    def getLineaInvestigacionId(self):
        return self.lineaInvestigacionId

    def setLineaInvestigacionId(self, valor):
        self.lineaInvestigacionId = valor

    def getModalidadId(self):
        return self.modalidadId

    def setModalidadId(self, valor):
        self.modalidadId = valor

    def getMontoTotal(self):
        return self.montoTotal

    def setMontoTotal(self, valor):
        self.montoTotal = valor

    def getNivelTrlActual(self):
        return self.nivelTrlActual

    def setNivelTrlActual(self, valor):
        self.nivelTrlActual = valor

    def getNivelTrlEsperado(self):
        return self.nivelTrlEsperado

    def setNivelTrlEsperado(self, valor):
        self.nivelTrlEsperado = valor

    def getFechaInicio(self):
        return self.fechaInicio

    def setFechaInicio(self, valor):
        self.fechaInicio = valor

    def getFechaFinalizacion(self):
        return self.fechaFinalizacion

    def setFechaFinalizacion(self, valor):
        self.fechaFinalizacion = valor

    def getFechaCreacion(self):
        return self.fechaCreacion

    def setFechaCreacion(self, valor):
        self.fechaCreacion = valor

    def getFechaEnvio(self):
        return self.fechaEnvio

    def setFechaEnvio(self, valor):
        self.fechaEnvio = valor

    def getPropuestaAnteriorId(self):
        return self.propuestaAnteriorId

    def setPropuestaAnteriorId(self, valor):
        self.propuestaAnteriorId = valor

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

    def getInvestigador(self):
        return self.investigador

    def setInvestigador(self, valor):
        self.investigador = valor

    def getEscuela(self):
        return self.escuela

    def setEscuela(self, valor):
        self.escuela = valor

    def getLineaInvestigacion(self):
        return self.lineaInvestigacion

    def setLineaInvestigacion(self, valor):
        self.lineaInvestigacion = valor

    def getModalidad(self):
        return self.modalidad

    def setModalidad(self, valor):
        self.modalidad = valor

    def getPropuestaAnterior(self):
        return self.propuestaAnterior

    def setPropuestaAnterior(self, valor):
        self.propuestaAnterior = valor

    def getContenido(self):
        return self.contenido

    def setContenido(self, valor):
        self.contenido = valor

    def getDeclaraciones(self):
        return self.declaraciones

    def setDeclaraciones(self, valor):
        self.declaraciones = valor

    def getObjetivosEspecificos(self):
        return self.objetivosEspecificos

    def setObjetivosEspecificos(self, valor):
        self.objetivosEspecificos = valor

    def getActividades(self):
        return self.actividades

    def setActividades(self, valor):
        self.actividades = valor

    def getIntegrantes(self):
        return self.integrantes

    def setIntegrantes(self, valor):
        self.integrantes = valor

    def getColaboradoresExternos(self):
        return self.colaboradoresExternos

    def setColaboradoresExternos(self, valor):
        self.colaboradoresExternos = valor

    def getDocumentos(self):
        return self.documentos

    def setDocumentos(self, valor):
        self.documentos = valor

    def getFinanciamientoExterno(self):
        return self.financiamientoExterno

    def setFinanciamientoExterno(self, valor):
        self.financiamientoExterno = valor

    def getAspectosEticos(self):
        return self.aspectosEticos

    def setAspectosEticos(self, valor):
        self.aspectosEticos = valor

    def getPresupuesto(self):
        return self.presupuesto

    def setPresupuesto(self, valor):
        self.presupuesto = valor

    def getProductosAcademicos(self):
        return self.productosAcademicos

    def setProductosAcademicos(self, valor):
        self.productosAcademicos = valor

    def getEvaluaciones(self):
        return self.evaluaciones

    def setEvaluaciones(self, valor):
        self.evaluaciones = valor

    def getDictamenes(self):
        return self.dictamenes

    def setDictamenes(self, valor):
        self.dictamenes = valor

    def getAcuerdos(self):
        return self.acuerdos

    def setAcuerdos(self, valor):
        self.acuerdos = valor

    def getHistorialEstados(self):
        return self.historialEstados

    def setHistorialEstados(self, valor):
        self.historialEstados = valor

    def getSubsanaciones(self):
        return self.subsanaciones

    def setSubsanaciones(self, valor):
        self.subsanaciones = valor

    def getReferencias(self):
        return self.referencias

    def setReferencias(self, valor):
        self.referencias = valor

    def getNotificaciones(self):
        return self.notificaciones

    def setNotificaciones(self, valor):
        self.notificaciones = valor

