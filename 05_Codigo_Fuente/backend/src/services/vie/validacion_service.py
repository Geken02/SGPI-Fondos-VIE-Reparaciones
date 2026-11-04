"""
Validación normativa de un expediente (Gestora VIE).

Todos los requisitos se calculan con datos reales de la propuesta; nada se guarda aquí.
Las reglas están agrupadas por requisito para poder ajustarlas fácilmente.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from src.models.convocatorias import Convocatorias, EstadosPropuesta, EtapasConvocatoria
from src.models.propuestas import Propuesta
from src.models.revision_gestora import ValidacionRequisito
from src.services.vie.errores import ConflictoNegocio, SolicitudInvalida
from src.services.vie.expediente_service import (
    ESTADO_BORRADOR,
    calcular_estado_gestion,
    expresion_subsanacion_abierta,
)

CUMPLE, NO_CUMPLE, PENDIENTE, NO_APLICA = "CUMPLE", "NO_CUMPLE", "PENDIENTE", "NO_APLICA"

# Tipos de documento (TiposDocumento.nombreTipoDocumento) que exige la convocatoria
DOC_FORMULARIO = "Form-04"
DOC_PLAN_ACCION = "Form-05"
DOC_PRESUPUESTO = "Form-06"
DOC_ACUERDO_CONSEJO = "Acuerdo_Consejo"
DOC_CARTA_COMPROMISO = "Carta_Compromiso"  # solo si hay colaboradores externos
DOCUMENTOS_OBLIGATORIOS = [DOC_FORMULARIO, DOC_PLAN_ACCION, DOC_PRESUPUESTO, DOC_ACUERDO_CONSEJO]

# Campos del Form-04 que no pueden quedar vacíos: (atributo de PropuestaContenido, nombre legible)
CAMPOS_FORMULARIO = [
    ("resumen", "resumen"),
    ("palabrasClave", "palabras clave"),
    ("problemaInvestigacion", "problema de investigación"),
    ("objetivoGeneral", "objetivo general"),
    ("estadoArte", "estado del arte"),
]

# Paso del proceso (1 Validación normativa, 2 Revisión de documentos, 3 Subsanaciones, 4 Envío al CIE)
PASO_POR_ESTADO = {
    "EN_SUBSANACION": 3,
    "LISTO_CIE": 4,
    "APROBADA": 4,
    "RECHAZADA": 4,
    "CANCELADA": 4,
}


class ExpedienteNoEncontrado(Exception):
    pass


def _lleno(valor) -> bool:
    return bool(valor and str(valor).strip())


def _req(id_: str, nombre: str, estado: str, observaciones: str = "") -> dict:
    return {"id": id_, "nombre": nombre, "estado": estado, "observaciones": observaciones}


def _lista_legible(items: list[str]) -> str:
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " y " + items[-1]


# ---------------------------------------------------------------------------
# 1. Aspectos generales
# ---------------------------------------------------------------------------
def _formulario_completo(p: Propuesta) -> dict:
    nombre = "Formulario de solicitud completo"
    if p.contenido is None:
        return _req("g1", nombre, NO_CUMPLE, "No se ha completado el contenido del formulario.")
    faltan = [etiqueta for attr, etiqueta in CAMPOS_FORMULARIO if not _lleno(getattr(p.contenido, attr))]
    if faltan:
        return _req("g1", nombre, NO_CUMPLE, f"Falta completar: {_lista_legible(faltan)}.")
    return _req("g1", nombre, CUMPLE)


def _aval_unidad(tipos_cargados: set[str]) -> dict:
    nombre = "Carta de aval de la unidad académica"
    if DOC_ACUERDO_CONSEJO in tipos_cargados:
        return _req("g2", nombre, CUMPLE)
    return _req("g2", nombre, NO_CUMPLE, "Falta cargar el acuerdo del consejo de la unidad académica (Form-07/08).")


def _linea_investigacion(p: Propuesta) -> dict:
    nombre = "Cumplimiento de líneas de investigación"
    if p.lineaInvestigacionId is None or p.lineaInvestigacion is None:
        return _req("g3", nombre, NO_CUMPLE, "No se indicó la línea de investigación.")
    if not p.lineaInvestigacion.activo:
        return _req("g3", nombre, NO_CUMPLE, "La línea de investigación seleccionada ya no está activa.")
    return _req("g3", nombre, CUMPLE)


# ---------------------------------------------------------------------------
# 2. Requisitos éticos
# ---------------------------------------------------------------------------
def _declaracion_etica(p: Propuesta) -> dict:
    nombre = "Declaración de compromiso ético"
    if p.declaraciones is None or not p.declaraciones.aceptaDeclaracionJurada:
        return _req("e1", nombre, NO_CUMPLE, "Falta aceptar la declaración jurada.")
    return _req("e1", nombre, CUMPLE)


def _consentimiento(p: Propuesta) -> dict:
    nombre = "Consentimiento informado (si aplica)"
    filas = p.aspectosEticos
    if not filas:
        return _req("e2", nombre, NO_CUMPLE, "No se registraron los aspectos éticos de la propuesta.")
    if not any(f.involucraSeresHumanos for f in filas):
        return _req("e2", nombre, NO_APLICA)
    # El sistema todavía no guarda el consentimiento firmado: lo verifica la gestora a mano.
    return _req(
        "e2", nombre, PENDIENTE,
        "Involucra seres humanos: verificar manualmente el consentimiento firmado (el sistema aún no lo registra).",
    )


def evaluar_avales(filas) -> tuple[str, str]:
    """Estado y observación del aval ante el ente regulador para las filas de AspectosEticos dadas.

    Las filas ya vienen filtradas (solo las que requieren aval). Sin filas -> NO_APLICA.
    """
    if not filas:
        return NO_APLICA, ""

    problemas, pendientes, exentos = [], [], 0
    for f in filas:
        ente = f.enteRegulatorio.nombreEnteRegulatorio if f.enteRegulatorio else "el ente regulador"
        aval = f.estadoAval.nombreEstadoAval if f.estadoAval else None
        if aval is None:
            problemas.append(f"Falta indicar el estado del aval ante {ente}.")
        elif aval == "Rechazado":
            problemas.append(f"El aval fue rechazado por {ente}.")
        elif aval == "Pendiente":
            pendientes.append(f"Aval solicitado a {ente}, en espera de resolución.")
        elif aval == "Exento":
            exentos += 1

    if problemas:
        return NO_CUMPLE, " ".join(problemas)
    if pendientes:
        return PENDIENTE, " ".join(pendientes)
    if exentos == len(filas):
        return NO_APLICA, "La propuesta está exenta de este permiso."
    return CUMPLE, ""


def requiere_aval(fila) -> bool:
    """¿La fila de aspectos éticos involucra algo que exige permiso o aval?"""
    return bool(
        fila.involucraSeresHumanos or fila.involucraBiodiversidad
        or fila.involucraAnimales or fila.involucraTerritoriosIndigenas
    )


def _aval_etico(p: Propuesta) -> dict:
    nombre = "Aprobación del comité de ética (si aplica)"
    filas = p.aspectosEticos
    if not filas:
        return _req("e3", nombre, NO_CUMPLE, "No se registraron los aspectos éticos de la propuesta.")
    estado, observaciones = evaluar_avales([f for f in filas if requiere_aval(f)])
    return _req("e3", nombre, estado, observaciones)


# ---------------------------------------------------------------------------
# 3. Aspectos financieros
# ---------------------------------------------------------------------------
def _presupuesto(p: Propuesta) -> dict:
    nombre = "Presupuesto detallado"
    if not p.presupuesto:
        return _req("f1", nombre, NO_CUMPLE, "No se registraron rubros de presupuesto.")
    return _req("f1", nombre, CUMPLE)


def _justificacion_fondos(tipos_cargados: set[str]) -> dict:
    nombre = "Justificación de uso de fondos"
    if DOC_PRESUPUESTO in tipos_cargados:
        return _req("f2", nombre, CUMPLE)
    return _req("f2", nombre, NO_CUMPLE, "Falta cargar la plantilla de presupuesto (Form-06) con la justificación.")


# ---------------------------------------------------------------------------
# 4. Aspectos técnicos
# ---------------------------------------------------------------------------
def _metodologia(p: Propuesta) -> dict:
    nombre = "Metodología y plan de trabajo"
    faltan = []
    if p.contenido is None or not _lleno(p.contenido.metodologia):
        faltan.append("metodología")
    if not p.objetivosEspecificos:
        faltan.append("objetivos específicos")
    if faltan:
        return _req("t1", nombre, NO_CUMPLE, f"Falta completar: {_lista_legible(faltan)}.")
    return _req("t1", nombre, CUMPLE)


def _cronograma(p: Propuesta) -> dict:
    nombre = "Cronograma de actividades"
    if not p.actividades:
        return _req("t2", nombre, NO_CUMPLE, "No se registraron actividades en el plan de trabajo.")
    con_actividad = {a.objetivoEspecificoId for a in p.actividades}
    sin_actividad = sorted(o.numeroObjetivo for o in p.objetivosEspecificos if o.objetivoEspecificoId not in con_actividad)
    if sin_actividad:
        numeros = ", ".join(str(n) for n in sin_actividad)
        etiqueta = "El objetivo específico N.º" if len(sin_actividad) == 1 else "Los objetivos específicos N.º"
        verbo = "no tiene" if len(sin_actividad) == 1 else "no tienen"
        return _req("t2", nombre, NO_CUMPLE, f"{etiqueta} {numeros} {verbo} actividades asociadas.")
    return _req("t2", nombre, CUMPLE)


# ---------------------------------------------------------------------------
# Documentos del expediente
# ---------------------------------------------------------------------------
def documentos_expediente(p: Propuesta) -> list[dict]:
    activos = [d for d in p.documentos if d.activo]
    obligatorios = list(DOCUMENTOS_OBLIGATORIOS)
    if p.colaboradoresExternos:
        obligatorios.append(DOC_CARTA_COMPROMISO)

    def nombre_doc(d) -> str:
        t = d.tipoDocumento
        return (t.descripcion or t.nombreTipoDocumento) if t else d.nombreArchivo

    def cargado_por(d) -> str | None:
        u = d.usuarioCarga
        return " ".join(x for x in (u.nombreUsuario, u.apellido1Usuario, u.apellido2Usuario) if x) if u else None

    def fila(d) -> dict:
        return {
            "id": f"doc-{d.documentoId}", "documentoId": d.documentoId,
            "codigoTipo": d.tipoDocumento.nombreTipoDocumento if d.tipoDocumento else None,
            "nombre": nombre_doc(d), "archivo": d.nombreArchivo, "fecha": d.fechaCarga.date(),
            "cargadoPor": cargado_por(d), "estado": "CARGADO",
        }

    resultado, usados = [], set()
    for codigo in obligatorios:
        cargados = sorted(
            (d for d in activos if d.tipoDocumento and d.tipoDocumento.nombreTipoDocumento == codigo),
            key=lambda d: d.fechaCarga,
            reverse=True,
        )
        if cargados:
            resultado.extend(fila(d) for d in cargados)
            usados.update(d.documentoId for d in cargados)
        else:
            resultado.append({
                "id": f"falta-{codigo}", "documentoId": None, "codigoTipo": codigo,
                "nombre": NOMBRES_DOCUMENTO_FALTANTE.get(codigo, codigo), "archivo": None, "fecha": None,
                "cargadoPor": None, "estado": "FALTANTE",
            })

    otros = sorted((d for d in activos if d.documentoId not in usados), key=lambda d: d.fechaCarga, reverse=True)
    resultado.extend(fila(d) for d in otros)
    return resultado


NOMBRES_DOCUMENTO_FALTANTE = {
    DOC_FORMULARIO: "Formulario de Proyecto de Investigación",
    DOC_PLAN_ACCION: "Plan de Acción y Gestión de Riesgos",
    DOC_PRESUPUESTO: "Plantilla de Presupuesto Detallado",
    DOC_ACUERDO_CONSEJO: "Acuerdo de Consejo de Escuela (Form-07/08)",
    DOC_CARTA_COMPROMISO: "Carta de compromiso de colaboradores externos",
}


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------
def cargar_propuesta(db: Session, codigo_propuesta: str):
    """Propuesta enviada a la VIE (no borrador), su estado y si tiene una subsanación abierta."""
    fila = (
        db.query(Propuesta, EstadosPropuesta, expresion_subsanacion_abierta().label("abierta"))
        .join(EstadosPropuesta, EstadosPropuesta.estadoPropuestaId == Propuesta.estadoId)
        .filter(Propuesta.codigoPropuesta == codigo_propuesta)
        .first()
    )
    if fila is None or fila.EstadosPropuesta.codigoEstadoPropuesta == ESTADO_BORRADOR:
        raise ExpedienteNoEncontrado(codigo_propuesta)
    return fila.Propuesta, fila.EstadosPropuesta, bool(fila.abierta)


def construir_encabezado(db: Session, p: Propuesta, estado, subsanacion_abierta: bool) -> dict:
    """Datos base del expediente que comparten Validación normativa y Revisión VIE."""
    estado_gestion = calcular_estado_gestion(estado.codigoEstadoPropuesta, subsanacion_abierta)
    inv = p.investigador
    etapa = db.get(EtapasConvocatoria, p.etapaId) if p.etapaId else None
    return {
        "propuestaId": p.propuestaId,
        "id": p.codigoPropuesta,
        "titulo": p.titulo,
        "investigador": " ".join(x for x in (inv.nombreUsuario, inv.apellido1Usuario, inv.apellido2Usuario) if x),
        "escuela": p.escuela.nombreEscuela,
        "estado": estado_gestion,
        "estadoDetalle": estado.nombreEstadoPropuesta,
        "convocatoria": _nombre_convocatoria(db, p),
        "tipo": p.modalidad.nombreModalidad if p.modalidad else None,
        "fechaIngreso": p.fechaEnvio.date() if p.fechaEnvio else None,
        "fechaLimite": etapa.fechaFin.date() if etapa and etapa.fechaFin else None,
        "pasoActual": PASO_POR_ESTADO.get(estado_gestion, 1),
    }


def construir_grupos(p: Propuesta) -> list[dict]:
    """Lista de verificación calculada por el sistema con los datos del expediente."""
    tipos_cargados = {
        d.tipoDocumento.nombreTipoDocumento for d in p.documentos if d.activo and d.tipoDocumento
    }
    return [
        {"id": "generales", "titulo": "1. Aspectos generales",
         "requisitos": [_formulario_completo(p), _aval_unidad(tipos_cargados), _linea_investigacion(p)]},
        {"id": "eticos", "titulo": "2. Requisitos éticos",
         "requisitos": [_declaracion_etica(p), _consentimiento(p), _aval_etico(p)]},
        {"id": "financieros", "titulo": "3. Aspectos financieros",
         "requisitos": [_presupuesto(p), _justificacion_fondos(tipos_cargados)]},
        {"id": "tecnicos", "titulo": "4. Aspectos técnicos",
         "requisitos": [_metodologia(p), _cronograma(p)]},
    ]


def construir_grupos_revisados(db: Session, p: Propuesta) -> list[dict]:
    """Lista de verificación con las decisiones guardadas por la gestora encima de lo calculado."""
    grupos = construir_grupos(p)
    revisiones = {
        r.requisitoId: r
        for r in db.query(ValidacionRequisito).filter(ValidacionRequisito.propuestaId == p.propuestaId)
    }
    for grupo in grupos:
        for q in grupo["requisitos"]:
            q["estadoSistema"], q["observacionesSistema"], q["manual"] = q["estado"], q["observaciones"], False
            r = revisiones.get(q["id"])
            if r:
                q["estado"], q["observaciones"], q["manual"] = r.estado, r.observaciones or "", True
    return grupos


def contar_cumplimiento(grupos: list[dict]) -> tuple[int, int]:
    """(requisitos que cumplen, requisitos evaluables). "No aplica" no cuenta."""
    estados = [q["estado"] for g in grupos for q in g["requisitos"]]
    evaluables = sum(e in (CUMPLE, NO_CUMPLE, PENDIENTE) for e in estados)
    return sum(e == CUMPLE for e in estados), evaluables


def porcentaje_cumplimiento(grupos: list[dict]) -> int:
    cumple, evaluables = contar_cumplimiento(grupos)
    return 100 if evaluables == 0 else round(cumple * 100 / evaluables)


def obtener_validacion(db: Session, codigo_propuesta: str) -> dict:
    from src.services.vie import evaluacion_service  # import tardío: evaluacion_service usa este módulo

    p, estado, abierta = cargar_propuesta(db, codigo_propuesta)
    grupos = construir_grupos_revisados(db, p)
    return {
        "expediente": construir_encabezado(db, p, estado, abierta),
        "grupos": grupos,
        "documentos": documentos_expediente(p),
        "porcentajeCumplimiento": porcentaje_cumplimiento(grupos),
        "subsanacion": evaluacion_service.evaluar_subsanacion(db, p),
    }


def guardar_requisitos(db: Session, codigo_propuesta: str, gestora_id: int, cambios) -> dict:
    """Guarda (o quita) las decisiones de la gestora sobre requisitos y devuelve la validación actualizada."""
    p, _, _ = cargar_propuesta(db, codigo_propuesta)
    ids_validos = {q["id"] for g in construir_grupos(p) for q in g["requisitos"]}
    desconocidos = sorted({c.id for c in cambios} - ids_validos)
    if desconocidos:
        raise SolicitudInvalida(f"Requisito desconocido: {', '.join(desconocidos)}.")

    existentes = {
        r.requisitoId: r
        for r in db.query(ValidacionRequisito).filter(ValidacionRequisito.propuestaId == p.propuestaId)
    }
    ahora = datetime.now()
    for c in cambios:
        fila = existentes.get(c.id)
        if c.estado is None:  # volver al valor calculado por el sistema
            if fila:
                db.delete(fila)
                del existentes[c.id]
            continue
        if fila is None:
            fila = ValidacionRequisito(propuestaId=p.propuestaId, requisitoId=c.id)
            db.add(fila)
            existentes[c.id] = fila
        fila.estado = c.estado
        fila.observaciones = c.observaciones.strip() or None
        fila.gestoraVIEId = gestora_id
        fila.fechaActualizacion = ahora
    db.commit()
    return obtener_validacion(db, codigo_propuesta)


def _nombre_convocatoria(db: Session, p: Propuesta) -> str:
    conv = db.get(Convocatorias, p.convocatoriaId)
    return conv.nombreConvocatoria if conv else "—"

def enviar_al_cie(db: Session, codigo_propuesta: str, gestora_id: int) -> dict:
    """Remite al CIE una propuesta con al menos 90 % de cumplimiento y sin subsanaciones abiertas."""
    from src.services.vie import evaluacion_service

    p, estado_actual, _ = cargar_propuesta(db, codigo_propuesta)
    codigo_estado_actual = estado_actual.codigoEstadoPropuesta

    if codigo_estado_actual == "EN_CIE":
        raise ConflictoNegocio("Este expediente ya fue enviado al CIE.")
    if codigo_estado_actual in {"APROBADA", "RECHAZADA", "CANCELADA"}:
        raise ConflictoNegocio("No se puede enviar al CIE un expediente que ya tiene un estado final.")

    grupos = construir_grupos_revisados(db, p)
    porcentaje = porcentaje_cumplimiento(grupos)
    if porcentaje < 90:
        raise ConflictoNegocio(
            f"No se puede enviar al CIE: el cumplimiento normativo es de {porcentaje} %. Se requiere al menos un 90 %."
        )

    evaluacion = evaluacion_service.evaluar_subsanacion(db, p)
    if evaluacion["bloqueo"]:
        raise ConflictoNegocio(
            "No se puede enviar al CIE mientras exista una subsanación sin cerrar. " + evaluacion["bloqueo"]
        )

    # El porcentaje normativo no sustituye la comprobación documental individual.
    # Se bloquean documentos obligatorios faltantes, observados o aún sin revisar.
    # SIN_REVISAR se mantiene bloqueante como criterio conservador hasta que la
    # institución confirme formalmente si puede remitirse documentación no revisada.
    from src.services.vie.documentos_service import documentos_con_revision
    documentos = documentos_con_revision(db, p)
    codigos_obligatorios = set(DOCUMENTOS_OBLIGATORIOS)
    if p.colaboradoresExternos:
        codigos_obligatorios.add(DOC_CARTA_COMPROMISO)
    estados_bloqueantes = {"FALTANTE", "INCOMPLETO", "FALTA_FIRMA", "SIN_REVISAR"}
    problemas_documentales = [
        d for d in documentos
        if d["codigoTipo"] in codigos_obligatorios and d["estado"] in estados_bloqueantes
    ]
    if problemas_documentales:
        detalle = "; ".join(
            f"{d['nombre']} ({d['estado'].replace('_', ' ').lower()})"
            for d in problemas_documentales
        )
        raise ConflictoNegocio(
            "No se puede enviar al CIE: hay documentos obligatorios faltantes, observados o sin revisar: "
            + detalle + "."
        )

    estado_cie = (
        db.query(EstadosPropuesta)
        .filter(EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE")
        .first()
    )
    if estado_cie is None:
        raise ConflictoNegocio("No existe el estado EN_CIE en el catálogo de estados de propuesta.")

    ahora = datetime.now()
    p.estadoId = estado_cie.estadoPropuestaId
    p.usuarioAuditoriaId = gestora_id
    p.ultimaAuditoria = ahora
    db.commit()

    return {
        "codigo": p.codigoPropuesta,
        "estado": "LISTO_CIE",
        "estadoDetalle": estado_cie.nombreEstadoPropuesta,
        "porcentajeCumplimiento": porcentaje,
        "mensaje": "El expediente se envió al CIE correctamente.",
    }

