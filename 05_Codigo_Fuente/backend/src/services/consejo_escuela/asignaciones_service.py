
from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.usuarios import Usuario
from src.models.roles import UsuarioRol, RolesSistema
from src.models.asignaciones_consejo import AsignacionesConsejo


ROL_CONSEJO_PROFESORES = "ConsejoProfesores"


def listar_miembros_consejo(db: Session):
    """
    Lista los usuarios activos que tienen el rol ConsejoProfesores.
    """

    usuarios = (
        db.query(Usuario)
        .join(
            UsuarioRol,
            UsuarioRol.usuarioId == Usuario.usuarioId,
        )
        .join(
            RolesSistema,
            RolesSistema.rolId == UsuarioRol.rolId,
        )
        .filter(
            Usuario.activo.is_(True),
            UsuarioRol.activo.is_(True),
            RolesSistema.nombreRol == ROL_CONSEJO_PROFESORES,
        )
        .distinct()
        .order_by(
            Usuario.nombreUsuario,
            Usuario.apellido1Usuario,
        )
        .all()
    )

    return [
        {
            "usuarioId": usuario.usuarioId,
            "nombreCompleto": (
                f"{usuario.nombreUsuario} "
                f"{usuario.apellido1Usuario} "
                f"{usuario.apellido2Usuario or ''}"
            ).strip(),
            "correoInstitucional": usuario.correoInstitucional,
        }
        for usuario in usuarios
    ]


def listar_asignaciones_propuesta(
    db: Session,
    propuesta_id: int,
):
    """
    Devuelve las asignaciones activas de una propuesta.
    """

    propuesta = (
        db.query(Propuesta)
        .filter(Propuesta.propuestaId == propuesta_id)
        .first()
    )

    if propuesta is None:
        raise ValueError("La propuesta indicada no existe.")

    asignaciones = (
        db.query(AsignacionesConsejo, Usuario)
        .join(
            Usuario,
            Usuario.usuarioId == AsignacionesConsejo.usuarioId,
        )
        .filter(
            AsignacionesConsejo.propuestaId == propuesta_id,
            AsignacionesConsejo.activo.is_(True),
        )
        .order_by(
            Usuario.nombreUsuario,
            Usuario.apellido1Usuario,
        )
        .all()
    )

    return [
        {
            "asignacionId": asignacion.asignacionId,
            "propuestaId": asignacion.propuestaId,
            "usuarioId": usuario.usuarioId,
            "nombreCompleto": (
                f"{usuario.nombreUsuario} "
                f"{usuario.apellido1Usuario} "
                f"{usuario.apellido2Usuario or ''}"
            ).strip(),
            "correoInstitucional": usuario.correoInstitucional,
            "activo": asignacion.activo,
        }
        for asignacion, usuario in asignaciones
    ]


def asignar_miembros_propuesta(
    db: Session,
    propuesta_id: int,
    usuario_ids: list[int],
    asignado_por_id: int,
):
    """
    Asigna miembros del Consejo de Profesores a una propuesta.

    Si la asignación ya existe y está inactiva, se reactiva.
    Si ya existe activa, se conserva.
    """

    propuesta = (
        db.query(Propuesta)
        .filter(Propuesta.propuestaId == propuesta_id)
        .first()
    )

    if propuesta is None:
        raise ValueError("La propuesta indicada no existe.")

    # Evitar IDs repetidos en la solicitud
    usuario_ids = list(set(usuario_ids))

    if not usuario_ids:
        raise ValueError(
            "Debe seleccionar al menos un miembro del Consejo."
        )

    # Verificar que todos los usuarios existan y estén activos
    usuarios = (
        db.query(Usuario)
        .filter(
            Usuario.usuarioId.in_(usuario_ids),
            Usuario.activo.is_(True),
        )
        .all()
    )

    if len(usuarios) != len(usuario_ids):
        raise ValueError(
            "Uno o más usuarios no existen o están inactivos."
        )

    # Verificar que todos tengan el rol ConsejoProfesores
    miembros_validos = (
        db.query(Usuario.usuarioId)
        .join(
            UsuarioRol,
            UsuarioRol.usuarioId == Usuario.usuarioId,
        )
        .join(
            RolesSistema,
            RolesSistema.rolId == UsuarioRol.rolId,
        )
        .filter(
            Usuario.usuarioId.in_(usuario_ids),
            Usuario.activo.is_(True),
            UsuarioRol.activo.is_(True),
            RolesSistema.nombreRol == ROL_CONSEJO_PROFESORES,
        )
        .distinct()
        .all()
    )

    ids_validos = {fila[0] for fila in miembros_validos}

    if ids_validos != set(usuario_ids):
        raise ValueError(
            "Todos los usuarios asignados deben tener "
            "el rol activo ConsejoProfesores."
        )

    for usuario_id in usuario_ids:
        asignacion = (
            db.query(AsignacionesConsejo)
            .filter(
                AsignacionesConsejo.propuestaId == propuesta_id,
                AsignacionesConsejo.usuarioId == usuario_id,
            )
            .first()
        )

        if asignacion is None:
            asignacion = AsignacionesConsejo(
                propuestaId=propuesta_id,
                usuarioId=usuario_id,
                asignadoPorId=asignado_por_id,
                activo=True,
            )
            db.add(asignacion)

        elif not asignacion.activo:
            asignacion.activo = True
            asignacion.asignadoPorId = asignado_por_id

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return listar_asignaciones_propuesta(db, propuesta_id)


def quitar_asignacion(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
):
    """
    Desactiva la asignación de un miembro a una propuesta.
    No elimina el registro de la base de datos.
    """

    asignacion = (
        db.query(AsignacionesConsejo)
        .filter(
            AsignacionesConsejo.propuestaId == propuesta_id,
            AsignacionesConsejo.usuarioId == usuario_id,
            AsignacionesConsejo.activo.is_(True),
        )
        .first()
    )

    if asignacion is None:
        raise ValueError(
            "No existe una asignación activa para ese miembro "
            "en la propuesta indicada."
        )

    asignacion.activo = False

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "mensaje": "La asignación fue desactivada correctamente."
    }
