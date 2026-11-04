from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime, timezone

class EstadosSubsanacion(Base):
    __tablename__ = "estadossubsanacion"
    
    estadoSubsanacionId = Column("estadosubsanacionid", Integer, primary_key=True, index=True)
    nombreEstadoSubsanacion = Column("nombreestadosubsanacion", String(100), nullable=False)
    descripcion = Column("descripcion", String(255), nullable=True)
    activo = Column("activo", Boolean, default=True)
    creadoEn = Column("creadoen", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    usuarioAuditoriaId = Column("usuarioauditoriaid", Integer, ForeignKey("usuarios.usuarioid"), nullable=True)
    ultimaAuditoria = Column("ultimaauditoria", DateTime, nullable=True)

class Subsanaciones(Base):
    __tablename__ = "subsanaciones"
    
    subsanacionId = Column("subsanacionid", Integer, primary_key=True, index=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    gestoraVIEId = Column("gestoravieid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaSolicitud = Column("fechasolicitud", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    comentarioGestora = Column("comentariogestora", Text, nullable=False)
    fechaRespuestaInvestigador = Column("fecharespuestainvestigador", DateTime, nullable=True)
    respuestaInvestigador = Column("respuestainvestigador", Text, nullable=True)
    estadoSubsanacionId = Column("estadosubsanacionid", Integer, ForeignKey("estadossubsanacion.estadosubsanacionid"), nullable=False, default=1)
    
    propuesta = relationship("Propuesta", back_populates="subsanaciones")
    gestoraVIE = relationship("Usuario", foreign_keys=[gestoraVIEId])
    estadoSubsanacion = relationship("EstadosSubsanacion")

    # --- Getters y Setters ---
    def getSubsanacionId(self):
        return self.subsanacionId

    def setSubsanacionId(self, valor):
        self.subsanacionId = valor

    def getPropuestaId(self):
        return self.propuestaId

    def setPropuestaId(self, valor):
        self.propuestaId = valor

    def getGestoraVIEId(self):
        return self.gestoraVIEId

    def setGestoraVIEId(self, valor):
        self.gestoraVIEId = valor

    def getFechaSolicitud(self):
        return self.fechaSolicitud

    def setFechaSolicitud(self, valor):
        self.fechaSolicitud = valor

    def getComentarioGestora(self):
        return self.comentarioGestora

    def setComentarioGestora(self, valor):
        self.comentarioGestora = valor

    def getFechaRespuestaInvestigador(self):
        return self.fechaRespuestaInvestigador

    def setFechaRespuestaInvestigador(self, valor):
        self.fechaRespuestaInvestigador = valor

    def getRespuestaInvestigador(self):
        return self.respuestaInvestigador

    def setRespuestaInvestigador(self, valor):
        self.respuestaInvestigador = valor

    def getEstadoSubsanacionId(self):
        return self.estadoSubsanacionId

    def setEstadoSubsanacionId(self, valor):
        self.estadoSubsanacionId = valor
