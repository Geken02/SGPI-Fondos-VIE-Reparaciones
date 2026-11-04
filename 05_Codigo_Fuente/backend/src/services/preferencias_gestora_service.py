from datetime import datetime, timezone

from sqlalchemy.orm import Session

from src.models.preferencias_gestora import PreferenciasGestora


PREDETERMINADAS = {
    "notificaciones": True,
    "resumenCorreo": False,
    "densidad": "normal",
}


def obtener(db: Session, usuario_id: int) -> dict:
    fila = db.query(PreferenciasGestora).filter(
        PreferenciasGestora.usuarioId == usuario_id
    ).first()
    if fila is None:
        return {**PREDETERMINADAS, "resumenCorreoDisponible": False}
    return {
        "notificaciones": fila.notificaciones,
        # Nunca se presenta como activo mientras no exista un envío programado real.
        "resumenCorreo": False,
        "resumenCorreoDisponible": False,
        "densidad": fila.densidad,
    }


def guardar(db: Session, usuario_id: int, datos: dict) -> dict:
    if datos.get("resumenCorreo", False):
        raise ValueError("El resumen por correo todavía no está disponible.")
    if datos.get("notificaciones", True) is False:
        raise ValueError("Los avisos oficiales no se pueden desactivar hasta definir las categorías opcionales.")
    ahora = datetime.now(timezone.utc)
    fila = db.query(PreferenciasGestora).filter(
        PreferenciasGestora.usuarioId == usuario_id
    ).first()
    if fila is None:
        fila = PreferenciasGestora(
            usuarioId=usuario_id,
            usuarioAuditoriaId=usuario_id,
            creadoEn=ahora,
        )
        db.add(fila)
    fila.notificaciones = True
    fila.resumenCorreo = False
    fila.densidad = datos.get("densidad", "normal")
    fila.actualizadoEn = ahora
    fila.usuarioAuditoriaId = usuario_id
    db.commit()
    return obtener(db, usuario_id)
