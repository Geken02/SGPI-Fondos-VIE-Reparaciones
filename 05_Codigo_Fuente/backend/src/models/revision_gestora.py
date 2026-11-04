from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from src.database import Base


class ValidacionRequisito(Base):
    """Decisión manual de la gestora sobre un requisito de la validación normativa (reemplaza lo calculado)."""
    __tablename__ = "validacionrequisitos"

    validacionRequisitoId = Column("validacionrequisitoid", Integer, primary_key=True)
    propuestaId = Column("propuestaid", Integer, ForeignKey("propuestas.propuestaid"), nullable=False)
    requisitoId = Column("requisitoid", String(30), nullable=False)
    estado = Column("estado", String(20), nullable=False)
    observaciones = Column("observaciones", Text, nullable=True)
    gestoraVIEId = Column("gestoravieid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaActualizacion = Column("fechaactualizacion", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class RevisionDocumento(Base):
    """Estado de revisión de un documento cargado: CORRECTO, INCOMPLETO o FALTA_FIRMA."""
    __tablename__ = "revisiondocumentos"

    revisionDocumentoId = Column("revisiondocumentoid", Integer, primary_key=True)
    documentoId = Column("documentoid", Integer, ForeignKey("propuestadocumentos.documentoid"), nullable=False, unique=True)
    estado = Column("estado", String(20), nullable=False)
    observaciones = Column("observaciones", Text, nullable=True)
    gestoraVIEId = Column("gestoravieid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
    fechaRevision = Column("fecharevision", DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
