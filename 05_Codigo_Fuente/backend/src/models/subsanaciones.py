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
    comentarioResolucion = Column("comentarioresolucion", Text, nullable=True)
    fechaResolucion = Column("fecharesolucion", DateTime, nullable=True)
    
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


def obtener_o_crear_estado_subsanacion(db):
    """
    Garantiza la existencia del estado de propuesta 'EN_SUBSANACION' (ID 10)
    en la tabla EstadosPropuesta, evitando fallos por llaves foraneas.
    """
    from src.models.convocatorias import EstadosPropuesta
    est = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta.in_(["EN_SUBSANACION", "SUBSANACION"])
    ).first()
    if not est:
        est = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == 10).first()
    if not est:
        try:
            est = EstadosPropuesta(
                codigoEstadoPropuesta="EN_SUBSANACION",
                nombreEstadoPropuesta="En Subsanación",
                descripcion="Propuesta devuelta al investigador para correcciones o subsanación de observaciones",
                esFinal=False,
                orden=10,
                activo=True
            )
            est.estadoPropuestaId = 10
            db.add(est)
            db.commit()
            db.refresh(est)
        except Exception:
            db.rollback()
            est = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.codigoEstadoPropuesta.in_(["EN_SUBSANACION", "SUBSANACION"])
            ).first()
    return est
