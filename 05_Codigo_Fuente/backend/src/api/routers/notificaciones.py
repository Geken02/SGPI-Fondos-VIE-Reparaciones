from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from src.database import get_db
from src.models.usuarios import Usuario
from src.models.notificaciones import Notificaciones, TiposNotificacion, CanalesComunicacion
from src.utils.dependencias import obtener_usuario_activo
from src.api.schemas.notificaciones import NotificacionResponse, ConteoNoLeidasResponse

router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones del Sistema"]
)

@router.get(
    "/",
    response_model=List[NotificacionResponse],
    summary="Listar notificaciones del usuario autenticado"
)
def listar_notificaciones(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    notificaciones_db = db.query(Notificaciones).filter(
        Notificaciones.usuarioDestinoId == usuario_actual.usuarioId
    ).order_by(Notificaciones.fechaEnvio.desc()).all()

    resultado = []
    for n in notificaciones_db:
        tipo_nombre = None
        if n.tipoNotificacionId:
            tipo = db.query(TiposNotificacion).filter(
                TiposNotificacion.tipoNotificacionId == n.tipoNotificacionId
            ).first()
            if tipo:
                tipo_nombre = tipo.nombreTipoNotificacion

        resultado.append(NotificacionResponse(
            id=n.notificacionId,
            asunto=n.asunto,
            cuerpo=n.cuerpoMensaje,
            fechaEnvio=n.fechaEnvio,
            fechaLectura=n.fechaLectura,
            leida=bool(n.leida),
            propuestaId=n.propuestaId,
            tipo=tipo_nombre,
            canal=n.canal.nombreCanal if n.canal else "Desconocido"
        ))
    return resultado

@router.get(
    "/conteo",
    response_model=ConteoNoLeidasResponse,
    summary="Obtener conteo de notificaciones no leídas"
)
def conteo_no_leidas(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    total = db.query(Notificaciones).filter(
        Notificaciones.usuarioDestinoId == usuario_actual.usuarioId
    ).count()

    no_leidas = db.query(Notificaciones).filter(
        Notificaciones.usuarioDestinoId == usuario_actual.usuarioId,
        Notificaciones.leida == False
    ).count()

    return ConteoNoLeidasResponse(total=total, noLeidas=no_leidas)

@router.put(
    "/{notificacion_id}/leer",
    summary="Marcar notificación individual como leída"
)
def marcar_como_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    notif = db.query(Notificaciones).filter(
        Notificaciones.notificacionId == notificacion_id,
        Notificaciones.usuarioDestinoId == usuario_actual.usuarioId
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    notif.leida = True
    notif.fechaLectura = datetime.now(timezone.utc)
    db.commit()
    return {"mensaje": "Notificación marcada como leída", "id": notificacion_id}

@router.put(
    "/marcar-todas-leidas",
    summary="Marcar todas las notificaciones como leídas"
)
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    db.query(Notificaciones).filter(
        Notificaciones.usuarioDestinoId == usuario_actual.usuarioId,
        Notificaciones.leida == False
    ).update({
        Notificaciones.leida: True,
        Notificaciones.fechaLectura: datetime.now(timezone.utc)
    })
    db.commit()
    return {"mensaje": "Todas las notificaciones han sido marcadas como leídas"}
