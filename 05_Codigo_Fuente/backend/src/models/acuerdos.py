from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class TiposAcuerdo(Base):
    __tablename__ = "tiposacuerdo"
    
    tipoAcuerdoId = Column("tipoacuerdoid", Integer, primary_key=True, index=True)
    nombreTipoAcuerdo = Column("nombretipoacuerdo", String(100), nullable=False)
    descripcion = Column("descripcion", String(300), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class AcuerdosConsejo(Base):
    __tablename__ = "acuerdosconsejo"
    
    acuerdoId = Column("acuerdoid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    tipoAcuerdoId = Column("tipoacuerdoid", Integer, ForeignKey("tiposacuerdo.tipoacuerdoid"), nullable=False)
    numeroAcuerdo = Column("numeroacuerdo", String(50), nullable=True)
    fechaAcuerdo = Column("fechaacuerdo", Date, nullable=True)
    horasAprobadas = Column("horasaprobadas", Numeric(4, 1), nullable=True)
    tipoHoraId = Column("tipohoraid", Integer, ForeignKey("tiposhora.tipohoraid"), nullable=True)
    periodoNombramiento = Column("periodonombramiento", String(100), nullable=True)
    presupuestoAprobado = Column("presupuestoaprobado", Numeric(12, 2), nullable=True)
    rutaArchivo = Column("rutaarchivo", String(500), nullable=True)
    usuarioFirmaId = Column("usuariofirmaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)    
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    propuesta = relationship("Propuesta", back_populates="acuerdos")
    tipoAcuerdo = relationship("TiposAcuerdo")
    tipoHora = relationship("TiposHora")
    usuarioFirma = relationship("Usuario", foreign_keys=[usuarioFirmaId])

class AcuerdoConsejoPresupuesto(Base):
    __tablename__ = "acuerdoconsejopresupuesto"
    
    acuerdoPresupuestoId = Column("acuerdopresupuestoid", Integer, primary_key=True, index=True)
    acuerdoId = Column("acuerdoid", Integer, ForeignKey("acuerdosconsejo.acuerdoid"), nullable=False)
    anio = Column("anio", Integer, nullable=False)
    montoOperativoAprobado = Column("montooperativoaprobado", Numeric(12, 2), nullable=True)
    montoBienesDuraderosAprobado = Column("montobienesduraderosaprobado", Numeric(12, 2), nullable=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)
    
    acuerdo = relationship("AcuerdosConsejo")