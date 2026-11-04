from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class RolesEquipo(Base):
    __tablename__ = "rolesequipo"
    
    rolEquipoId = Column("rolequipoid", Integer, primary_key=True, index=True)
    nombreRol = Column("nombrerol", String(30), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (RolesEquipo) ---
    def getRolEquipoId(self):
        return self.rolEquipoId

    def setRolEquipoId(self, valor):
        self.rolEquipoId = valor

    def getNombreRol(self):
        return self.nombreRol

    def setNombreRol(self, valor):
        self.nombreRol = valor

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


class IntegrantesEquipoPropuesta(Base):
    __tablename__ = "integrantesequipopropuesta"
    
    integranteEquipoId = Column("integranteequipoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    usuarioId = Column("usuarioid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    tipoHoraId = Column("tipohoraid", Integer, ForeignKey("tiposhora.tipohoraid"), nullable=False)
    horasSemanales = Column("horassemanales", Numeric(4, 1), nullable=False)
    rolEquipoId = Column("rolequipoid", Integer, ForeignKey("rolesequipo.rolequipoid"), nullable=False)
    orcid = Column("orcid", String(20), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="integrantes")
    usuario = relationship("Usuario", foreign_keys=[usuarioId])
    tipoHora = relationship("TiposHora")
    rolEquipo = relationship("RolesEquipo")
    # --- Getters y Setters (IntegrantesEquipoPropuesta) ---
    def getIntegranteEquipoId(self):
        return self.integranteEquipoId

    def setIntegranteEquipoId(self, valor):
        self.integranteEquipoId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getUsuarioId(self):
        return self.usuarioId

    def setUsuarioId(self, valor):
        self.usuarioId = valor

    def getTipoHoraId(self):
        return self.tipoHoraId

    def setTipoHoraId(self, valor):
        self.tipoHoraId = valor

    def getHorasSemanales(self):
        return self.horasSemanales

    def setHorasSemanales(self, valor):
        self.horasSemanales = valor

    def getRolEquipoId(self):
        return self.rolEquipoId

    def setRolEquipoId(self, valor):
        self.rolEquipoId = valor

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

    def getPropuesta(self):
        return self.propuesta

    def setPropuesta(self, valor):
        self.propuesta = valor

    def getUsuario(self):
        return self.usuario

    def setUsuario(self, valor):
        self.usuario = valor

    def getTipoHora(self):
        return self.tipoHora

    def setTipoHora(self, valor):
        self.tipoHora = valor

    def getRolEquipo(self):
        return self.rolEquipo

    def setRolEquipo(self, valor):
        self.rolEquipo = valor


class ColaboradoresExternos(Base):
    __tablename__ = "colaboradoresexternos"
    
    colaboradorId = Column("colaboradorid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    nombreColaborador = Column("nombrecolaborador", String(50), nullable=False)
    apellido1Colaborador = Column("apellido1colaborador", String(50), nullable=True)
    apellido2Colaborador = Column("apellido2colaborador", String(50), nullable=True)
    idOrcid = Column("idorcid", String(20), nullable=True)
    institucionEmpresa = Column("institucionempresa", String(150), nullable=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="colaboradoresExternos")
    # --- Getters y Setters (ColaboradoresExternos) ---
    def getColaboradorId(self):
        return self.colaboradorId

    def setColaboradorId(self, valor):
        self.colaboradorId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getNombreColaborador(self):
        return self.nombreColaborador

    def setNombreColaborador(self, valor):
        self.nombreColaborador = valor

    def getApellido1Colaborador(self):
        return self.apellido1Colaborador

    def setApellido1Colaborador(self, valor):
        self.apellido1Colaborador = valor

    def getApellido2Colaborador(self):
        return self.apellido2Colaborador

    def setApellido2Colaborador(self, valor):
        self.apellido2Colaborador = valor

    def getIdOrcid(self):
        return self.idOrcid

    def setIdOrcid(self, valor):
        self.idOrcid = valor

    def getInstitucionEmpresa(self):
        return self.institucionEmpresa

    def setInstitucionEmpresa(self, valor):
        self.institucionEmpresa = valor

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

