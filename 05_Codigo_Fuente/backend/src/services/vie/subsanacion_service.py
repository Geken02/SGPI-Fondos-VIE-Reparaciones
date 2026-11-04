from datetime import datetime

from sqlalchemy.orm import Session, aliased

from src.models.escuelas import Escuela
from src.models.propuestas import Propuesta
from src.models.subsanaciones import EstadosSubsanacion, Subsanaciones
from src.models.usuarios import Usuario
from src.models.catalogos import AsignacionesGestora
from src.services.vie.expediente_service import es_superadministrador, verificar_acceso_expediente
from src.services.vie import evaluacion_service
from src.services.vie.errores import ConflictoNegocio, NoEncontrado, SolicitudInvalida
from src.services.vie.validacion_service import cargar_propuesta

# ---------------------------------------------------------------------------
# Cómo se traduce el estado de la BD (EstadosSubsanacion) a pestaña y estado de
# la ventana. Si cambia el criterio, se ajusta SOLO aquí.
#
#   nombre en la BD  ->  (pestaña,      estado mostrado)
# ---------------------------------------------------------------------------
PESTANA_Y_ESTADO = {
    "Pendiente": ("PENDIENTES", "PENDIENTE"),    # se esperan correcciones del investigador
    "Rechazada": ("PENDIENTES", "RECHAZADA"),    # su respuesta no cumplió: debe corregir de nuevo
    "Resuelta": ("EN_PROCESO", "EN_PROCESO"),    # respondió y la gestora la está revisando
    "Completada": ("COMPLETADAS", "COMPLETADA"), # la gestora validó la respuesta (ver script 06)
}
POR_DEFECTO = ("PENDIENTES", "PENDIENTE")  # estado desconocido: queda visible como pendiente
ESTADO_INICIAL = "Pendiente"
ESTADO_RESPONDIDA = "Resuelta"
ESTADO_ACEPTADA = "Completada"
ESTADO_RECHAZADA = "Rechazada"


def _nombre(u) -> str:
    return " ".join(p for p in (u.nombreUsuario, u.apellido1Usuario, u.apellido2Usuario) if p)


def _consulta(db: Session):
    gestora = aliased(Usuario)
    return (
        db.query(Subsanaciones, EstadosSubsanacion, Propuesta, Usuario, Escuela, gestora)
        .join(Propuesta, Propuesta.propuestaId == Subsanaciones.propuestaId)
        .join(EstadosSubsanacion, EstadosSubsanacion.estadoSubsanacionId == Subsanaciones.estadoSubsanacionId)
        .join(Usuario, Usuario.usuarioId == Propuesta.investigadorCoordId)
        .join(Escuela, Escuela.escuelaId == Propuesta.escuelaId)
        .join(gestora, gestora.usuarioId == Subsanaciones.gestoraVIEId)
    )


def _fila(sub, estado, p, investigador, escuela, gestora) -> dict:
    pestana, estado_ui = PESTANA_Y_ESTADO.get(estado.nombreEstadoSubsanacion, POR_DEFECTO)
    return {
        "subsanacionId": sub.subsanacionId,
        "propuestaId": p.propuestaId,
        "expedienteId": p.codigoPropuesta,
        "titulo": p.titulo,
        "investigador": _nombre(investigador),
        "escuela": escuela.nombreEscuela,
        "fechaObservacion": sub.fechaSolicitud.date(),
        "pestana": pestana,
        "estado": estado_ui,
        "estadoDetalle": estado.nombreEstadoSubsanacion,
        "comentarioGestora": sub.comentarioGestora,
        "gestora": _nombre(gestora),
        "respuestaInvestigador": sub.respuestaInvestigador,
        "fechaRespuesta": sub.fechaRespuestaInvestigador.date() if sub.fechaRespuestaInvestigador else None,
        "comentarioResolucion": sub.comentarioResolucion,
        "fechaResolucion": sub.fechaResolucion.date() if sub.fechaResolucion else None,
        "puedeResolver": estado.nombreEstadoSubsanacion == ESTADO_RESPONDIDA,
    }


def _fila_por_id(db: Session, subsanacion_id: int) -> dict:
    fila = _consulta(db).filter(Subsanaciones.subsanacionId == subsanacion_id).first()
    if fila is None:
        raise NoEncontrado(f"No existe la subsanación {subsanacion_id}.")
    return _fila(*fila)


def listar_subsanaciones(db: Session, usuario_id: int | None = None) -> dict:
    """Subsanaciones de las escuelas asignadas al usuario (o todas para SuperAdministrador)."""
    consulta = _consulta(db)
    if usuario_id is not None and not es_superadministrador(db, usuario_id):
        escuelas_asignadas = db.query(AsignacionesGestora.escuelaId).filter(
            AsignacionesGestora.gestoraVIEId == usuario_id,
            AsignacionesGestora.activo.is_(True),
        )
        consulta = consulta.filter(Propuesta.escuelaId.in_(escuelas_asignadas))
    filas = consulta.order_by(
        Subsanaciones.fechaSolicitud.desc(), Subsanaciones.subsanacionId.desc()
    ).all()
    return {"subsanaciones": [_fila(*f) for f in filas]}


def _estado_catalogo(db: Session, nombre: str) -> EstadosSubsanacion:
    estado = db.query(EstadosSubsanacion).filter(EstadosSubsanacion.nombreEstadoSubsanacion == nombre).first()
    if estado is None:
        raise ConflictoNegocio(f"Falta el estado «{nombre}» en el catálogo de subsanaciones (ejecuta el script 06).")
    return estado


def crear_subsanacion(db: Session, codigo_propuesta: str, gestora_id: int, comentario: str) -> dict:
    """Solicita una subsanación. Solo procede si la regla de evaluación lo permite (la misma que ve la gestora)."""
    comentario = comentario.strip()
    if not comentario:
        raise SolicitudInvalida("Escribe qué debe corregir el investigador.")

    p, _, _ = cargar_propuesta(db, codigo_propuesta)
    evaluacion = evaluacion_service.evaluar_subsanacion(db, p)
    if evaluacion["bloqueo"]:
        raise ConflictoNegocio(evaluacion["bloqueo"])
    if not evaluacion["motivos"]:
        raise ConflictoNegocio(
            f"El expediente no requiere subsanación: tiene sus documentos y cumple al menos el {evaluacion['umbral']} % "
            "de los requisitos."
        )

    sub = Subsanaciones(
        propuestaId=p.propuestaId,
        gestoraVIEId=gestora_id,
        fechaSolicitud=datetime.now(),
        comentarioGestora=comentario,
        estadoSubsanacionId=_estado_catalogo(db, ESTADO_INICIAL).estadoSubsanacionId,
    )
    db.add(sub)
    db.commit()
    return _fila_por_id(db, sub.subsanacionId)


def resolver_subsanacion(db: Session, subsanacion_id: int, gestora_id: int, accion: str, comentario: str) -> dict:
    """La gestora decide sobre la respuesta del investigador: aceptarla (Completada) o rechazarla (con motivo)."""
    sub = db.get(Subsanaciones, subsanacion_id)
    if sub is None:
        raise NoEncontrado(f"No existe la subsanación {subsanacion_id}.")
    propuesta = db.get(Propuesta, sub.propuestaId)
    if propuesta is not None:
        verificar_acceso_expediente(db, propuesta.codigoPropuesta, gestora_id)
    if sub.estadoSubsanacion.nombreEstadoSubsanacion != ESTADO_RESPONDIDA:
        raise ConflictoNegocio("Solo se puede resolver una subsanación que el investigador ya respondió (estado «En proceso»).")

    comentario = comentario.strip()
    if accion == "RECHAZAR" and not comentario:
        raise SolicitudInvalida("Indica el motivo por el que se rechaza la respuesta.")

    destino = _estado_catalogo(db, ESTADO_ACEPTADA if accion == "ACEPTAR" else ESTADO_RECHAZADA)
    sub.estadoSubsanacionId = destino.estadoSubsanacionId
    sub.comentarioResolucion = comentario or None
    sub.fechaResolucion = datetime.now()
    db.commit()
    return _fila_por_id(db, subsanacion_id)
