"""
Revisión VIE de un expediente (primer paso: revisión normativa de la Gestora VIE).

Los cinco requisitos corresponden a lo que verifica la Dirección de Investigación según las
Disposiciones de la Convocatoria (sección 2.11, inciso b). Todo se calcula con datos reales de la BD;
nada se guarda aquí.
"""
from datetime import date

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from src.models.convocatorias import EstadosPropuesta
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta
from src.models.propuesta_plan import Actividades, MedidasMitigacion, Riesgos
from src.models.propuestas import Propuesta
from src.services.vie.validacion_service import (
    NO_APLICA,
    NO_CUMPLE,
    PENDIENTE,
    cargar_propuesta,
    construir_encabezado,
    documentos_expediente,
    evaluar_avales,
    requiere_aval,
)

CUMPLE, EN_REVISION = "CUMPLE", "EN_REVISION"

ESTADO_PROYECTO_EJECUTADO = "APROBADA"   # proyectos que ya debieron entregar informe final al terminar
DOC_INFORME_FINAL = "Informe_Final"      # TiposDocumento.nombreTipoDocumento
ROL_ESTUDIANTE = "Asistente"             # RolesEquipo: "Estudiante o personal de apoyo a la investigación"
PRODUCTO_TFG = "Tesis_Grado"             # TiposProductosAcademicos: tesis/TFG derivado del proyecto


def _req(id_: str, nombre: str, estado: str, observaciones: str = "") -> dict:
    # "Pendiente" del dominio se muestra como "En revisión" en esta ventana
    return {"id": id_, "nombre": nombre, "estado": EN_REVISION if estado == PENDIENTE else estado,
            "observaciones": observaciones}


def _lleno(valor) -> bool:
    return bool(valor and str(valor).strip())


def _nombre_completo(u) -> str:
    return " ".join(x for x in (u.nombreUsuario, u.apellido1Usuario, u.apellido2Usuario) if x)


def _ente(fila) -> str:
    return fila.enteRegulatorio.nombreEnteRegulatorio if fila.enteRegulatorio else "el ente regulador"


# ---------------------------------------------------------------------------
# 1. Morosidad: las personas participantes deben estar al día con sus informes finales
# ---------------------------------------------------------------------------
def _morosidad(db: Session, p: Propuesta) -> dict:
    nombre = "Morosidad Institucional"

    personas = {p.investigadorCoordId: _nombre_completo(p.investigador)}
    for integrante in p.integrantes:
        personas[integrante.usuarioId] = _nombre_completo(integrante.usuario)
    ids = list(personas)

    participa = select(IntegrantesEquipoPropuesta.propuestaId).where(IntegrantesEquipoPropuesta.usuarioId.in_(ids))
    previas = (
        db.query(Propuesta)
        .join(EstadosPropuesta, EstadosPropuesta.estadoPropuestaId == Propuesta.estadoId)
        .filter(
            Propuesta.propuestaId != p.propuestaId,
            EstadosPropuesta.codigoEstadoPropuesta == ESTADO_PROYECTO_EJECUTADO,
            Propuesta.fechaFinalizacion.isnot(None),
            Propuesta.fechaFinalizacion < date.today(),
            or_(Propuesta.investigadorCoordId.in_(ids), Propuesta.propuestaId.in_(participa)),
        )
        .all()
    )

    adeudos = []
    for previa in previas:
        entregado = any(
            d.activo and d.tipoDocumento and d.tipoDocumento.nombreTipoDocumento == DOC_INFORME_FINAL
            for d in previa.documentos
        )
        if entregado:
            continue
        participantes = {previa.investigadorCoordId, *(i.usuarioId for i in previa.integrantes)} & set(ids)
        quienes = ", ".join(personas[u] for u in sorted(participantes))
        adeudos.append(f"{quienes}: informe final pendiente de {previa.codigoPropuesta}.")

    if adeudos:
        return _req("morosidad", nombre, NO_CUMPLE, " ".join(adeudos))
    return _req("morosidad", nombre, CUMPLE)


# ---------------------------------------------------------------------------
# 2. Ética: aspectos éticos registrados, declaración jurada y exenciones justificadas
# ---------------------------------------------------------------------------
def _etica(p: Propuesta) -> dict:
    nombre = "Ética en investigación"
    if not p.aspectosEticos:
        return _req("etica", nombre, NO_CUMPLE, "No se registraron los aspectos éticos de la propuesta.")

    problemas = []
    if p.declaraciones is None or not p.declaraciones.aceptaDeclaracionJurada:
        problemas.append("Falta aceptar la declaración jurada.")
    for fila in p.aspectosEticos:
        exento = fila.estadoAval is not None and fila.estadoAval.nombreEstadoAval == "Exento"
        if exento and not _lleno(fila.justificacionExencion):
            problemas.append(f"Falta la justificación de la exención ante {_ente(fila)}.")

    if problemas:
        return _req("etica", nombre, NO_CUMPLE, " ".join(problemas))
    return _req("etica", nombre, CUMPLE)


# ---------------------------------------------------------------------------
# 3. Permisos: avales vigentes y medidas para obtenerlos dentro del plan de riesgos
# ---------------------------------------------------------------------------
def _tiene_medida_de_permiso(db: Session, p: Propuesta) -> bool:
    return (
        db.query(MedidasMitigacion.medidaMitigacionId)
        .join(Riesgos, Riesgos.riesgoId == MedidasMitigacion.riesgoId)
        .join(Actividades, Actividades.actividadId == Riesgos.actividadId)
        .filter(Actividades.propuestaId == p.propuestaId, MedidasMitigacion.esPermisoEtico.is_(True))
        .first()
        is not None
    )


def _permisos(db: Session, p: Propuesta) -> dict:
    nombre = "Permisos y autorizaciones"
    if not p.aspectosEticos:
        return _req("permisos", nombre, NO_CUMPLE, "No se registraron los aspectos éticos de la propuesta.")

    estado, observaciones = evaluar_avales([f for f in p.aspectosEticos if requiere_aval(f)])
    if estado == NO_APLICA:
        return _req("permisos", nombre, NO_APLICA, observaciones)

    if not _tiene_medida_de_permiso(db, p):
        aviso = "El plan de riesgos no incluye medidas de mitigación para la obtención de los permisos."
        return _req("permisos", nombre, NO_CUMPLE, f"{observaciones} {aviso}".strip())
    return _req("permisos", nombre, estado, observaciones)


# ---------------------------------------------------------------------------
# 4. Participación estudiantil: estudiantes asistentes o TFG
# ---------------------------------------------------------------------------
def _participacion_estudiantil(p: Propuesta) -> dict:
    nombre = "Participación estudiantil"
    hay_asistentes = any(i.rolEquipo and i.rolEquipo.nombreRol == ROL_ESTUDIANTE for i in p.integrantes)
    hay_tfg = any(
        pa.tipoProductoAcademico and pa.tipoProductoAcademico.nombreTipoProductoAcademico == PRODUCTO_TFG
        for pa in p.productosAcademicos
    )
    if hay_asistentes or hay_tfg:
        return _req("estudiantil", nombre, CUMPLE)
    return _req("estudiantil", nombre, NO_CUMPLE,
                "El equipo no incluye estudiantes asistentes ni se comprometió un trabajo final de graduación.")


# ---------------------------------------------------------------------------
# 5. Plan de riesgos: un riesgo por actividad y medidas de mitigación
# ---------------------------------------------------------------------------
def _plan_riesgos(db: Session, p: Propuesta) -> dict:
    nombre = "Plan de riesgos"
    if not p.actividades:
        return _req("riesgos", nombre, NO_CUMPLE, "No hay actividades en el plan de acción para identificar riesgos.")

    ids_actividad = [a.actividadId for a in p.actividades]
    riesgos = db.query(Riesgos).filter(Riesgos.actividadId.in_(ids_actividad)).all()
    sin_riesgo = len(set(ids_actividad) - {r.actividadId for r in riesgos})

    con_medida = set()
    if riesgos:
        con_medida = {
            fila.riesgoId
            for fila in db.query(MedidasMitigacion.riesgoId)
            .filter(MedidasMitigacion.riesgoId.in_([r.riesgoId for r in riesgos]))
            .all()
        }
    sin_medida = sum(1 for r in riesgos if r.riesgoId not in con_medida)

    problemas = []
    if sin_riesgo:
        problemas.append(f"{sin_riesgo} {'actividad sin riesgo identificado' if sin_riesgo == 1 else 'actividades sin riesgo identificado'}.")
    if sin_medida:
        problemas.append(f"{sin_medida} {'riesgo sin medida de mitigación' if sin_medida == 1 else 'riesgos sin medida de mitigación'}.")
    if problemas:
        return _req("riesgos", nombre, NO_CUMPLE, " ".join(problemas))
    return _req("riesgos", nombre, CUMPLE)


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------
def obtener_revision(db: Session, codigo_propuesta: str) -> dict:
    p, estado, abierta = cargar_propuesta(db, codigo_propuesta)
    return {
        "expediente": construir_encabezado(db, p, estado, abierta),
        "requisitos": [
            _morosidad(db, p),
            _etica(p),
            _permisos(db, p),
            _participacion_estudiantil(p),
            _plan_riesgos(db, p),
        ],
        "documentos": documentos_expediente(p),
    }
