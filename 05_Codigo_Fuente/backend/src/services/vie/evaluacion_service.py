"""
¿Corresponde solicitar una subsanación? Una sola regla para todas las ventanas:

  · faltan documentos obligatorios, o
  · hay documentos marcados como Incompleto / Falta firma, o
  · el cumplimiento normativo es menor al umbral (90 %).

Si ya hay una subsanación sin cerrar, no se puede pedir otra hasta resolverla.
"""
from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.subsanaciones import EstadosSubsanacion, Subsanaciones
from src.services.vie.documentos_service import ESTADOS_CON_PROBLEMA, documentos_con_revision
from src.services.vie.validacion_service import (
    NO_CUMPLE,
    construir_grupos_revisados,
    contar_cumplimiento,
    porcentaje_cumplimiento,
)

UMBRAL_CUMPLIMIENTO = 90

ETIQUETA_ESTADO_DOC = {"INCOMPLETO": "incompleto", "FALTA_FIRMA": "falta firma"}
MENSAJE_BLOQUEO = {
    "Pendiente": "Ya hay una subsanación pendiente: se espera la respuesta del investigador.",
    "Rechazada": "La última respuesta fue rechazada: el investigador debe corregirla de nuevo.",
    "Resuelta": "El investigador ya respondió una subsanación: resuélvela primero en la ventana Subsanaciones.",
}
PRIORIDAD_BLOQUEO = ("Resuelta", "Rechazada", "Pendiente")


def _plural(n: int, singular: str, plural: str) -> str:
    return f"{n} {singular if n == 1 else plural}"


def _bloqueo(db: Session, p: Propuesta) -> str | None:
    abiertas = {
        nombre
        for (nombre,) in db.query(EstadosSubsanacion.nombreEstadoSubsanacion)
        .join(Subsanaciones, Subsanaciones.estadoSubsanacionId == EstadosSubsanacion.estadoSubsanacionId)
        .filter(Subsanaciones.propuestaId == p.propuestaId)
        .all()
        if nombre != "Completada"
    }
    for nombre in PRIORIDAD_BLOQUEO:
        if nombre in abiertas:
            return MENSAJE_BLOQUEO[nombre]
    return None


def evaluar_subsanacion(db: Session, p: Propuesta) -> dict:
    grupos = construir_grupos_revisados(db, p)
    cumple, evaluables = contar_cumplimiento(grupos)
    porcentaje = porcentaje_cumplimiento(grupos)
    docs = documentos_con_revision(db, p)
    faltantes = [d for d in docs if d["estado"] == "FALTANTE"]
    observados = [d for d in docs if d["estado"] in ESTADOS_CON_PROBLEMA]

    motivos = []
    if faltantes:
        n = len(faltantes)
        motivos.append(
            f"{'Falta' if n == 1 else 'Faltan'} {_plural(n, 'documento obligatorio', 'documentos obligatorios')}: "
            + ", ".join(d["nombre"] for d in faltantes) + "."
        )
    if observados:
        n = len(observados)
        motivos.append(
            f"{_plural(n, 'documento con observaciones', 'documentos con observaciones')}: "
            + ", ".join(f"{d['nombre']} ({ETIQUETA_ESTADO_DOC[d['estado']]})" for d in observados) + "."
        )
    if cumple * 100 < UMBRAL_CUMPLIMIENTO * evaluables:
        motivos.append(f"El cumplimiento normativo es de {porcentaje} %, menor al mínimo de {UMBRAL_CUMPLIMIENTO} %.")

    comentario = ""
    if motivos:
        lineas = ["Se solicita subsanar lo siguiente:"]
        lineas += [f"- Documento faltante: {d['nombre']}." for d in faltantes]
        for d in observados:
            detalle = f" {d['observaciones']}" if d["observaciones"] else ""
            lineas.append(f"- Documento {ETIQUETA_ESTADO_DOC[d['estado']]}: {d['nombre']}.{detalle}")
        for g in grupos:
            for q in g["requisitos"]:
                if q["estado"] == NO_CUMPLE:
                    detalle = f" {q['observaciones']}" if q["observaciones"] else ""
                    lineas.append(f"- Requisito que no cumple: {q['nombre']}.{detalle}")
        comentario = "\n".join(lineas)

    bloqueo = _bloqueo(db, p)
    return {
        "puede": bool(motivos) and bloqueo is None,
        "motivos": motivos,
        "bloqueo": bloqueo,
        "porcentajeCumplimiento": porcentaje,
        "umbral": UMBRAL_CUMPLIMIENTO,
        "comentarioSugerido": comentario,
    }
