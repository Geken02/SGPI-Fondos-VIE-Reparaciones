from email.message import EmailMessage
from pathlib import Path
import smtplib
import ssl

from fastapi import HTTPException

from src.config import settings


def _validar_configuracion():
    faltantes = [
        nombre for nombre, valor in (
            ("SMTP_HOST", settings.SMTP_HOST),
            ("SMTP_FROM", settings.SMTP_FROM),
        ) if not valor
    ]
    if faltantes:
        raise HTTPException(
            status_code=503,
            detail="El correo institucional no está configurado. Faltan: " + ", ".join(faltantes),
        )
    if settings.SMTP_USE_SSL and settings.SMTP_USE_TLS:
        raise HTTPException(
            status_code=500,
            detail="Configuración SMTP inválida: no se pueden activar SSL y STARTTLS simultáneamente.",
        )


def enviar_correo(destinatario: str, asunto: str, cuerpo: str, adjuntos: list[tuple[str, Path]], cc: list[str] | None = None) -> str:
    """Envía un correo con adjuntos PDF y devuelve respuesta SMTP; nunca simula una entrega."""
    _validar_configuracion()
    mensaje = EmailMessage()
    mensaje["From"] = settings.SMTP_FROM
    mensaje["To"] = destinatario
    cc = sorted({correo.strip() for correo in (cc or []) if correo and correo.strip() and correo.strip().lower() != destinatario.lower()})
    if cc:
        mensaje["Cc"] = ", ".join(cc)
    mensaje["Subject"] = asunto
    mensaje.set_content(cuerpo)

    for nombre, ruta in adjuntos:
        ruta = Path(ruta)
        if not ruta.is_file():
            raise HTTPException(status_code=409, detail=f"No se encontró el adjunto {nombre}.")
        if ruta.suffix.lower() != ".pdf":
            raise HTTPException(status_code=409, detail=f"El adjunto {nombre} no es un PDF.")
        mensaje.add_attachment(
            ruta.read_bytes(),
            maintype="application",
            subtype="pdf",
            filename=nombre,
        )

    contexto = ssl.create_default_context()
    try:
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT, context=contexto,
            ) as servidor:
                if settings.SMTP_USERNAME:
                    servidor.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                respuesta = servidor.send_message(mensaje)
        else:
            with smtplib.SMTP(
                settings.SMTP_HOST, settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT,
            ) as servidor:
                servidor.ehlo()
                if settings.SMTP_USE_TLS:
                    servidor.starttls(context=contexto)
                    servidor.ehlo()
                if settings.SMTP_USERNAME:
                    servidor.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                respuesta = servidor.send_message(mensaje)
    except (smtplib.SMTPException, OSError) as error:
        raise HTTPException(status_code=502, detail=f"El proveedor SMTP rechazó o no aceptó el envío: {error}") from error

    if respuesta:
        raise HTTPException(status_code=502, detail="El proveedor SMTP rechazó el mensaje para uno o más destinatarios.")
    return "Aceptado por el servidor SMTP; esto no confirma lectura por el destinatario."
