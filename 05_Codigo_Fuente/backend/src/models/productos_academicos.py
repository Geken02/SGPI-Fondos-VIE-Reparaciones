from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposProductosAcademicos(Base):
    __tablename__ = "tiposproductosacademicos"
    
    tipoProductoAcademicoId = Column("tipoproductoacademicoid", Integer, primary_key=True, index=True)
    nombreTipoProductoAcademico = Column("nombretipoproductoacademico", String(100), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    # --- Getters y Setters (TiposProductosAcademicos) ---
    def getTipoProductoAcademicoId(self):
        return self.tipoProductoAcademicoId

    def setTipoProductoAcademicoId(self, valor):
        self.tipoProductoAcademicoId = valor

    def getNombreTipoProductoAcademico(self):
        return self.nombreTipoProductoAcademico

    def setNombreTipoProductoAcademico(self, valor):
        self.nombreTipoProductoAcademico = valor

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


class ProductosAcademicos(Base):
    __tablename__ = "productosacademicos"
    
    productoId = Column("productoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    tipoProductoAcademicoId = Column("tipoproductoacademicoid", Integer, ForeignKey("tiposproductosacademicos.tipoproductoacademicoid"), nullable=False)
    objetivoEspecificoId = Column("objetivoespecificoid", Integer, ForeignKey("objetivosespecificos.objetivoespecificoid"), nullable=True)
    descripcion = Column("descripcion", String(300), nullable=False)
    cantidadComprometida = Column("cantidadcomprometida", Integer, nullable=False)
    fechaEntregaEstimada = Column("fechaentregaestimada", Date, nullable=True)
    fechaEntregaReal = Column("fechaentregareal", Date, nullable=True)
    esPropiedadIndustrial = Column("espropiedadindustrial", Boolean, default=False)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="productosAcademicos")
    tipoProductoAcademico = relationship("TiposProductosAcademicos")
    objetivoEspecifico = relationship("ObjetivosEspecificos")
    # --- Getters y Setters (ProductosAcademicos) ---
    def getProductoId(self):
        return self.productoId

    def setProductoId(self, valor):
        self.productoId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getTipoProductoAcademicoId(self):
        return self.tipoProductoAcademicoId

    def setTipoProductoAcademicoId(self, valor):
        self.tipoProductoAcademicoId = valor

    def getObjetivoEspecificoId(self):
        return self.objetivoEspecificoId

    def setObjetivoEspecificoId(self, valor):
        self.objetivoEspecificoId = valor

    def getDescripcion(self):
        return self.descripcion

    def setDescripcion(self, valor):
        self.descripcion = valor

    def getCantidadComprometida(self):
        return self.cantidadComprometida

    def setCantidadComprometida(self, valor):
        self.cantidadComprometida = valor

    def getFechaEntregaEstimada(self):
        return self.fechaEntregaEstimada

    def setFechaEntregaEstimada(self, valor):
        self.fechaEntregaEstimada = valor

    def getFechaEntregaReal(self):
        return self.fechaEntregaReal

    def setFechaEntregaReal(self, valor):
        self.fechaEntregaReal = valor

    def getEsPropiedadIndustrial(self):
        return self.esPropiedadIndustrial

    def setEsPropiedadIndustrial(self, valor):
        self.esPropiedadIndustrial = valor

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

    def getTipoProductoAcademico(self):
        return self.tipoProductoAcademico

    def setTipoProductoAcademico(self, valor):
        self.tipoProductoAcademico = valor

    def getObjetivoEspecifico(self):
        return self.objetivoEspecifico

    def setObjetivoEspecifico(self, valor):
        self.objetivoEspecifico = valor

