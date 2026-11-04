"""
Revisión de documentos del expediente (paso 2 del proceso de la Gestora VIE).

Se listan los documentos cargados y los obligatorios que faltan. La gestora marca cada documento cargado como
Correcto, Incompleto o Falta firma (con observaciones); si no lo ha revisado queda "Sin revisar".
"""
from datetime import datetime

from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.revision_gestora import RevisionDocumento
from src.services.vie.errores import SolicitudInvalida
from src.services.vie.validacion_service import cargar_propuesta, construir_encabezado, documentos_expediente

ESTADOS_CON_PROBLEMA = ("INCOMPLETO", "FALTA_FIRMA")


def documentos_con_revision(db: Session, p: Propuesta) -> list[dict]:
    docs = documentos_expediente(p)
    ids = [d["documentoId"] for d in docs if d["documentoId"] is not None]
    revisiones = (
        {r.documentoId: r for r in db.query(RevisionDocumento).filter(RevisionDocumento.documentoId.in_(ids))}
        if ids else {}
    )

    resultado = []
    for d in docs:
        if d["estado"] == "FALTANTE":
            estado, observaciones = "FALTANTE", ""
        else:
            r = revisiones.get(d["documentoId"])
            estado, observaciones = (r.estado, r.observaciones or "") if r else ("SIN_REVISAR", "")
        resultado.append({
            "id": d["id"], "documentoId": d["documentoId"], "codigoTipo": d["codigoTipo"], "nombre": d["nombre"],
            "archivo": d["archivo"], "fecha": d["fecha"], "cargadoPor": d["cargadoPor"],
            "estado": estado, "observaciones": observaciones,
        })
    return resultado


def obtener_documentos(db: Session, codigo_propuesta: str) -> dict:
    from src.services.vie import evaluacion_service  # import tardío: evaluacion_service usa este módulo

    p, estado, abierta = cargar_propuesta(db, codigo_propuesta)
    return {
        "expediente": construir_encabezado(db, p, estado, abierta),
        "documentos": documentos_con_revision(db, p),
        "subsanacion": evaluacion_service.evaluar_subsanacion(db, p),
    }


def guardar_revision(db: Session, codigo_propuesta: str, gestora_id: int, cambios) -> dict:
    p, _, _ = cargar_propuesta(db, codigo_propuesta)
    validos = {d.documentoId for d in p.documentos if d.activo}
    ajenos = sorted({c.documentoId for c in cambios} - validos)
    if ajenos:
        raise SolicitudInvalida(f"Los documentos {', '.join(map(str, ajenos))} no pertenecen a este expediente.")

    existentes = {
        r.documentoId: r
        for r in db.query(RevisionDocumento).filter(RevisionDocumento.documentoId.in_(validos))
    } if validos else {}
    ahora = datetime.now()
    for c in cambios:
        fila = existentes.get(c.documentoId)
        if c.estado == "SIN_REVISAR":  # quitar la revisión
            if fila:
                db.delete(fila)
                del existentes[c.documentoId]
            continue
        if fila is None:
            fila = RevisionDocumento(documentoId=c.documentoId)
            db.add(fila)
            existentes[c.documentoId] = fila
        fila.estado = c.estado
        fila.observaciones = c.observaciones.strip() or None
        fila.gestoraVIEId = gestora_id
        fila.fechaRevision = ahora
    db.commit()
    return obtener_documentos(db, codigo_propuesta)
