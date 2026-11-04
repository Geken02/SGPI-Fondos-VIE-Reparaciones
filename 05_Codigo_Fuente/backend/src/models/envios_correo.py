from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from src.database import Base


class EnviosCorreo(Base):
    """Resultado auditable de cada intento de entrega por correo electrónico."""

    __tablename__ = "envioscorreo"

    envioCorreoId = Column("enviocorreoid", Integer, primary_key=True, index=True)
    notificacionId = Column("notificacionid", Integer, ForeignKey("notificaciones.notificacionid"), nullable=False, index=True)
    destinatario = Column("destinatario", String(254), nullable=False)
    asunto = Column("asunto", String(200), nullable=False)
    estado = Column("estado", String(20), nullable=False, default="EN_PROCESO")
    intentos = Column("intentos", Integer, nullable=False, default=1)
    detalleError = Column("detalleerror", Text, nullable=True)
    respuestaProveedor = Column("respuestaproveedor", Text, nullable=True)
    claveIdempotencia = Column("claveidempotencia", String(80), unique=True, nullable=True)
    documentoIds = Column("documentoids", Text, nullable=False, default="[]")
    copias = Column("copias", Text, nullable=False, default="[]")
    fechaCreacion = Column("fechacreacion", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    fechaActualizacion = Column("fechaactualizacion", DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    usuarioSolicitanteId = Column("usuariosolicitanteid", Integer, ForeignKey("usuarios.usuarioid"), nullable=False)
