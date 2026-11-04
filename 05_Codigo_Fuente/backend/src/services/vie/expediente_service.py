from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.convocatorias import EstadosPropuesta, EtapasConvocatoria
from src.models.escuelas import Escuela
from src.models.propuestas import Propuesta
from src.models.subsanaciones import EstadosSubsanacion, Subsanaciones
from src.models.usuarios import Usuario
from src.models.catalogos import AsignacionesGestora
from src.models.roles import RolesSistema, UsuarioRol
from fastapi import HTTPException, status

# ---------------------------------------------------------------------------
# Cómo se traducen los estados de la BD a los estados de la bandeja de la
# Gestora VIE. Si cambia el criterio, se ajusta SOLO en este bloque.
# ---------------------------------------------------------------------------
ESTADO_BORRADOR = "BORRADOR"                      # no se ha enviado a la VIE: no aparece
ESTADOS_FINALES = {"APROBADA", "RECHAZADA", "CANCELADA"}  # se muestran tal cual
ESTADO_LISTO_CIE = "EN_CIE"                       # -> "Listo para CIE"
# Subsanaciones que mantienen el expediente "En subsanación" (EstadosSubsanacion.nombreEstadoSubsanacion):
# "Pendiente" = se esperan correcciones; "Rechazada" = la respuesta no cumplió y hay que corregir de nuevo.
# "Resuelta" (el investigador ya respondió) queda en revisión de la gestora, no cuenta como abierta.
NOMBRES_SUBSANACION_ABIERTA = ("Pendiente", "Rechazada")

# Resultado para el resto (ENVIADA, EN_VINCULACION, EN_COMITE, EN_CONSEJO): "En revisión"


def calcular_estado_gestion(codigo_estado: str, subsanacion_pendiente: bool) -> str:
    """Estado que ve la gestora para una propuesta ya enviada."""
    if codigo_estado in ESTADOS_FINALES:
        return codigo_estado
    if subsanacion_pendiente:
        return "EN_SUBSANACION"
    if codigo_estado == ESTADO_LISTO_CIE:
        return "LISTO_CIE"
    return "EN_REVISION"


def expresion_subsanacion_abierta():
    """EXISTS correlacionado con Propuesta: ¿tiene alguna subsanación abierta (Pendiente o Rechazada)?"""
    return (
        select(Subsanaciones.subsanacionId)
        .join(
            EstadosSubsanacion,
            EstadosSubsanacion.estadoSubsanacionId == Subsanaciones.estadoSubsanacionId,
        )
        .where(
            Subsanaciones.propuestaId == Propuesta.propuestaId,
            EstadosSubsanacion.nombreEstadoSubsanacion.in_(NOMBRES_SUBSANACION_ABIERTA),
        )
        .correlate(Propuesta)
        .exists()
    )


def es_superadministrador(db: Session, usuario_id: int) -> bool:
    """Indica si la cuenta conserva una asignación activa al rol SuperAdministrador."""
    return db.query(RolesSistema.rolId).join(
        UsuarioRol, UsuarioRol.rolId == RolesSistema.rolId
    ).filter(
        UsuarioRol.usuarioId == usuario_id,
        UsuarioRol.activo.is_(True),
        RolesSistema.activo.is_(True),
        RolesSistema.nombreRol == "SuperAdministrador",
    ).first() is not None


def verificar_acceso_expediente(db: Session, codigo_propuesta: str, usuario_id: int) -> None:
    """Impide que una gestora consulte o modifique expedientes de escuelas no asignadas."""
    if es_superadministrador(db, usuario_id):
        return
    propuesta = db.query(Propuesta.propuestaId, Propuesta.escuelaId).filter(
        Propuesta.codigoPropuesta == codigo_propuesta
    ).first()
    if propuesta is None:
        return  # El servicio de dominio conserva la respuesta 404 correspondiente.
    asignacion = db.query(AsignacionesGestora.asignacionId).filter(
        AsignacionesGestora.gestoraVIEId == usuario_id,
        AsignacionesGestora.escuelaId == propuesta.escuelaId,
        AsignacionesGestora.activo.is_(True),
    ).first()
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene una asignación activa para consultar o modificar expedientes de esta escuela.",
        )


def listar_expedientes(db: Session, usuario_id: int | None = None) -> dict:
    """Propuestas enviadas visibles para el usuario según sus escuelas asignadas."""
    tiene_subsanacion_pendiente = expresion_subsanacion_abierta()

    consulta = (
        db.query(
            Propuesta.propuestaId.label("propuesta_id"),
            Propuesta.codigoPropuesta.label("codigo"),
            Propuesta.titulo.label("titulo"),
            Usuario.nombreUsuario.label("nombre"),
            Usuario.apellido1Usuario.label("apellido1"),
            Usuario.apellido2Usuario.label("apellido2"),
            Escuela.nombreEscuela.label("escuela"),
            EstadosPropuesta.codigoEstadoPropuesta.label("codigo_estado"),
            EstadosPropuesta.nombreEstadoPropuesta.label("nombre_estado"),
            EtapasConvocatoria.fechaFin.label("fecha_fin_etapa"),
            tiene_subsanacion_pendiente.label("subsanacion_pendiente"),
        )
        .join(EstadosPropuesta, EstadosPropuesta.estadoPropuestaId == Propuesta.estadoId)
        .join(Usuario, Usuario.usuarioId == Propuesta.investigadorCoordId)
        .join(Escuela, Escuela.escuelaId == Propuesta.escuelaId)
        .outerjoin(EtapasConvocatoria, EtapasConvocatoria.etapaId == Propuesta.etapaId)
        .filter(EstadosPropuesta.codigoEstadoPropuesta != ESTADO_BORRADOR)
    )
    if usuario_id is not None and not es_superadministrador(db, usuario_id):
        escuelas_asignadas = select(AsignacionesGestora.escuelaId).where(
            AsignacionesGestora.gestoraVIEId == usuario_id,
            AsignacionesGestora.activo.is_(True),
        )
        consulta = consulta.filter(Propuesta.escuelaId.in_(escuelas_asignadas))
    filas = consulta.order_by(
        Propuesta.fechaEnvio.desc().nullslast(), Propuesta.propuestaId.desc()
    ).all()

    expedientes = [
        {
            "propuestaId": f.propuesta_id,
            "id": f.codigo,
            "titulo": f.titulo,
            "investigador": " ".join(p for p in (f.nombre, f.apellido1, f.apellido2) if p),
            "escuela": f.escuela,
            "estado": calcular_estado_gestion(f.codigo_estado, bool(f.subsanacion_pendiente)),
            "estadoDetalle": f.nombre_estado,
            "fechaLimite": f.fecha_fin_etapa.date() if f.fecha_fin_etapa else None,
        }
        for f in filas
    ]

    # Las tarjetas salen de la misma lista, así nunca difieren de la tabla.
    resumen = {
        "total": len(expedientes),
        "enRevision": sum(e["estado"] == "EN_REVISION" for e in expedientes),
        "enSubsanacion": sum(e["estado"] == "EN_SUBSANACION" for e in expedientes),
        "listosCie": sum(e["estado"] == "LISTO_CIE" for e in expedientes),
    }

    return {"resumen": resumen, "expedientes": expedientes}
