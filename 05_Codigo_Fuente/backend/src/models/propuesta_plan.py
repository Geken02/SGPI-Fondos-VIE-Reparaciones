from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposResponsabilidad(Base):
    __tablename__ = "tiposresponsabilidad"
    
    tipoResponsabilidadId = Column("tiporesponsabilidadid", Integer, primary_key=True, index=True)
    nombreTipoResponsabilidad = Column("nombretiporesponsabilidad", String(30), nullable=False)
    descripcion = Column("descripcion", String(200), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (TiposResponsabilidad) ---
    def getTipoResponsabilidadId(self):
        return self.tipoResponsabilidadId

    def setTipoResponsabilidadId(self, valor):
        self.tipoResponsabilidadId = valor

    def getNombreTipoResponsabilidad(self):
        return self.nombreTipoResponsabilidad

    def setNombreTipoResponsabilidad(self, valor):
        self.nombreTipoResponsabilidad = valor

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


class ObjetivosEspecificos(Base):
    __tablename__ = "objetivosespecificos"
    
    objetivoEspecificoId = Column("objetivoespecificoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    numeroObjetivo = Column("numeroobjetivo", Integer, nullable=False)
    descripcion = Column("descripcion", Text, nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="objetivosEspecificos")
    # --- Getters y Setters (ObjetivosEspecificos) ---
    def getObjetivoEspecificoId(self):
        return self.objetivoEspecificoId

    def setObjetivoEspecificoId(self, valor):
        self.objetivoEspecificoId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getNumeroObjetivo(self):
        return self.numeroObjetivo

    def setNumeroObjetivo(self, valor):
        self.numeroObjetivo = valor

    def getDescripcion(self):
        return self.descripcion

    def setDescripcion(self, valor):
        self.descripcion = valor

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


class Actividades(Base):
    __tablename__ = "actividades"
    
    actividadId = Column("actividadid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    objetivoEspecificoId = Column("objetivoespecificoid", Integer, ForeignKey("objetivosespecificos.objetivoespecificoid"), nullable=False)
    descripcionActividad = Column("descripcionactividad", Text, nullable=False)
    resultadoEsperado = Column("resultadoesperado", Text, nullable=False)
    mesInicio = Column("mesinicio", Integer, nullable=False)
    duracionMeses = Column("duracionmeses", Numeric(5, 2), nullable=False)
    anioEjecucion = Column("anioejecucion", Integer, nullable=False)
    esGira = Column("esgira", Boolean, default=False)
    esPasantia = Column("espasantia", Boolean, default=False)
    requiereInformeAvance = Column("requiereinformeavance", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="actividades")
    objetivoEspecifico = relationship("ObjetivosEspecificos")
    # --- Getters y Setters (Actividades) ---
    def getActividadId(self):
        return self.actividadId

    def setActividadId(self, valor):
        self.actividadId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getObjetivoEspecificoId(self):
        return self.objetivoEspecificoId

    def setObjetivoEspecificoId(self, valor):
        self.objetivoEspecificoId = valor

    def getDescripcionActividad(self):
        return self.descripcionActividad

    def setDescripcionActividad(self, valor):
        self.descripcionActividad = valor

    def getResultadoEsperado(self):
        return self.resultadoEsperado

    def setResultadoEsperado(self, valor):
        self.resultadoEsperado = valor

    def getMesInicio(self):
        return self.mesInicio

    def setMesInicio(self, valor):
        self.mesInicio = valor

    def getDuracionMeses(self):
        return self.duracionMeses

    def setDuracionMeses(self, valor):
        self.duracionMeses = valor

    def getAnioEjecucion(self):
        return self.anioEjecucion

    def setAnioEjecucion(self, valor):
        self.anioEjecucion = valor

    def getEsGira(self):
        return self.esGira

    def setEsGira(self, valor):
        self.esGira = valor

    def getEsPasantia(self):
        return self.esPasantia

    def setEsPasantia(self, valor):
        self.esPasantia = valor

    def getRequiereInformeAvance(self):
        return self.requiereInformeAvance

    def setRequiereInformeAvance(self, valor):
        self.requiereInformeAvance = valor

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

    def getObjetivoEspecifico(self):
        return self.objetivoEspecifico

    def setObjetivoEspecifico(self, valor):
        self.objetivoEspecifico = valor


class Riesgos(Base):
    __tablename__ = "riesgos"
    
    riesgoId = Column("riesgoid", Integer, primary_key=True, index=True)
    actividadId = Column("actividadid", Integer, ForeignKey("actividades.actividadid"), nullable=False)
    descripcionRiesgo = Column("descripcionriesgo", Text, nullable=False)
    probabilidad = Column("probabilidad", String(20), nullable=True)
    impacto = Column("impacto", String(20), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    actividad = relationship("Actividades")
    # --- Getters y Setters (Riesgos) ---
    def getRiesgoId(self):
        return self.riesgoId

    def setRiesgoId(self, valor):
        self.riesgoId = valor

    def getActividadId(self):
        return self.actividadId

    def setActividadId(self, valor):
        self.actividadId = valor

    def getDescripcionRiesgo(self):
        return self.descripcionRiesgo

    def setDescripcionRiesgo(self, valor):
        self.descripcionRiesgo = valor

    def getProbabilidad(self):
        return self.probabilidad

    def setProbabilidad(self, valor):
        self.probabilidad = valor

    def getImpacto(self):
        return self.impacto

    def setImpacto(self, valor):
        self.impacto = valor

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

    def getActividad(self):
        return self.actividad

    def setActividad(self, valor):
        self.actividad = valor


class MedidasMitigacion(Base):
    __tablename__ = "medidasmitigacion"
    
    medidaMitigacionId = Column("medidamitigacionid", Integer, primary_key=True, index=True)
    riesgoId = Column("riesgoid", Integer, ForeignKey("riesgos.riesgoid"), nullable=False)
    descripcionMedida = Column("descripcionmedida", Text, nullable=False)
    usuarioResponsableId = Column("usuarioresponsableid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    esPermisoEtico = Column("espermisoetico", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    riesgo = relationship("Riesgos")
    usuarioResponsable = relationship("Usuario", foreign_keys=[usuarioResponsableId])
    # --- Getters y Setters (MedidasMitigacion) ---
    def getMedidaMitigacionId(self):
        return self.medidaMitigacionId

    def setMedidaMitigacionId(self, valor):
        self.medidaMitigacionId = valor

    def getRiesgoId(self):
        return self.riesgoId

    def setRiesgoId(self, valor):
        self.riesgoId = valor

    def getDescripcionMedida(self):
        return self.descripcionMedida

    def setDescripcionMedida(self, valor):
        self.descripcionMedida = valor

    def getUsuarioResponsableId(self):
        return self.usuarioResponsableId

    def setUsuarioResponsableId(self, valor):
        self.usuarioResponsableId = valor

    def getEsPermisoEtico(self):
        return self.esPermisoEtico

    def setEsPermisoEtico(self, valor):
        self.esPermisoEtico = valor

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

    def getRiesgo(self):
        return self.riesgo

    def setRiesgo(self, valor):
        self.riesgo = valor

    def getUsuarioResponsable(self):
        return self.usuarioResponsable

    def setUsuarioResponsable(self, valor):
        self.usuarioResponsable = valor


class ParticipantesActividad(Base):
    __tablename__ = "participantesactividad"
    
    participanteActividadId = Column("participanteactividadid", Integer, primary_key=True, index=True)
    actividadId = Column("actividadid", Integer, ForeignKey("actividades.actividadid"), nullable=False)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    tipoResponsabilidadId = Column("tiporesponsabilidadid", Integer, ForeignKey("tiposresponsabilidad.tiporesponsabilidadid"), nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    actividad = relationship("Actividades")
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    tipoResponsabilidad = relationship("TiposResponsabilidad")
    # --- Getters y Setters (ParticipantesActividad) ---
    def getParticipanteActividadId(self):
        return self.participanteActividadId

    def setParticipanteActividadId(self, valor):
        self.participanteActividadId = valor

    def getActividadId(self):
        return self.actividadId

    def setActividadId(self, valor):
        self.actividadId = valor

    def getUsuarioId(self):
        return self.usuarioId

    def setUsuarioId(self, valor):
        self.usuarioId = valor

    def getTipoResponsabilidadId(self):
        return self.tipoResponsabilidadId

    def setTipoResponsabilidadId(self, valor):
        self.tipoResponsabilidadId = valor

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

    def getActividad(self):
        return self.actividad

    def setActividad(self, valor):
        self.actividad = valor

    def getUsuario(self):
        return self.usuario

    def setUsuario(self, valor):
        self.usuario = valor

    def getTipoResponsabilidad(self):
        return self.tipoResponsabilidad

    def setTipoResponsabilidad(self, valor):
        self.tipoResponsabilidad = valor

