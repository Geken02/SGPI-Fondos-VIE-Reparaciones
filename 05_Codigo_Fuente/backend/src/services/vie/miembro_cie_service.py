from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela
from src.models.convocatorias import EstadosPropuesta, EtapasConvocatoria
from src.models.evaluaciones import (
    Evaluaciones, TiposEvaluacion, CriteriosEvaluacion, DetalleEvaluacion,
    EstadosEvaluacion, TiposRecomendacion,
)
from src.models.dictamenes import Dictamenes, TiposDictamen
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion
from src.models.propuesta_documentos import PropuestaDocumentos
from src.models.propuesta_contenido import PropuestaContenido
from src.models.catalogos import HistorialEstadosPropuesta


def _tipo_evaluacion(db):
    return db.query(TiposEvaluacion).filter(
        TiposEvaluacion.nombreTipoEvaluacion == "CIE",
        TiposEvaluacion.activo.is_(True),
    ).first()


def _tipo_dictamen(db):
    return db.query(TiposDictamen).filter(
        TiposDictamen.nombreTipoDictamen == "CIE",
        TiposDictamen.activo.is_(True),
    ).first()


def listar_expedientes_cie(db: Session, usuario_id: int) -> list[dict]:
    propuestas = (
        db.query(Propuesta, EtapasConvocatoria.fechaFin)
        .join(EstadosPropuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId)
        .join(Usuario, Propuesta.investigadorCoordId == Usuario.usuarioId)
        .join(Escuela, Propuesta.escuelaId == Escuela.escuelaId)
        .outerjoin(EtapasConvocatoria, Propuesta.etapaId == EtapasConvocatoria.etapaId)
        .filter(EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE")
        .order_by(Propuesta.propuestaId)
        .all()
    )
    resultado = []
    tipo_cie = _tipo_dictamen(db)
    for propuesta, fecha_fin in propuestas:
        dictamen = None
        if tipo_cie:
            dictamen = db.query(Dictamenes.dictamenId).filter(
                Dictamenes.propuestaId == propuesta.propuestaId,
                Dictamenes.tipoDictamenId == tipo_cie.tipoDictamenId,
            ).first()
        if dictamen:
            continue
        evaluacion = (
            db.query(Evaluaciones)
            .join(TiposEvaluacion, Evaluaciones.tipoEvaluacionId == TiposEvaluacion.tipoEvaluacionId)
            .filter(
                Evaluaciones.propuestaId == propuesta.propuestaId,
                Evaluaciones.evaluadorId == usuario_id,
                TiposEvaluacion.nombreTipoEvaluacion == "CIE",
            ).order_by(Evaluaciones.evaluacionId.desc()).first()
        )
        pendiente = (
            db.query(Subsanaciones.subsanacionId)
            .join(EstadosSubsanacion, Subsanaciones.estadoSubsanacionId == EstadosSubsanacion.estadoSubsanacionId)
            .filter(
                Subsanaciones.propuestaId == propuesta.propuestaId,
                EstadosSubsanacion.nombreEstadoSubsanacion.in_(("Pendiente", "Rechazada")),
            ).first()
        )
        nombre = " ".join(x for x in (
            propuesta.investigador.nombreUsuario,
            propuesta.investigador.apellido1Usuario,
            propuesta.investigador.apellido2Usuario,
        ) if x)
        resultado.append({
            "propuestaId": propuesta.propuestaId,
            "codigo": propuesta.codigoPropuesta,
            "titulo": propuesta.titulo,
            "investigador": nombre,
            "escuela": propuesta.escuela.nombreEscuela,
            "fechaLimite": fecha_fin.date().isoformat() if fecha_fin else None,
            "estado": "con_observaciones" if pendiente else ("en_revision" if evaluacion else "por_evaluar"),
        })
    return resultado


def obtener_rubrica_cie(db: Session) -> dict:
    tipo = _tipo_evaluacion(db)
    if not tipo:
        return {"configurada": False, "escala": {"minimo": 0, "maximo": 10, "opciones": list(range(0, 11))}, "criterios": []}
    criterios = db.query(CriteriosEvaluacion).filter(
        CriteriosEvaluacion.tipoEvaluacionId == tipo.tipoEvaluacionId,
        CriteriosEvaluacion.activo.is_(True),
    ).order_by(CriteriosEvaluacion.orden, CriteriosEvaluacion.criterioId).all()
    return {
        "configurada": bool(criterios),
        "escala": {"minimo": 0, "maximo": 10, "opciones": list(range(0, 11))},
        "criterios": [{
            "criterioId": c.criterioId,
            "seccion": c.nombreSeccion,
            "nombre": c.nombreCriterio,
            "peso": float(c.pesoPorcentaje),
            "esRequisitoObligatorio": bool(c.esRequisitoObligatorio),
            "orden": c.orden,
        } for c in criterios],
    }


def obtener_expediente_cie(db: Session, codigo: str) -> dict | None:
    row = (
        db.query(Propuesta, EstadosPropuesta.codigoEstadoPropuesta, EstadosPropuesta.nombreEstadoPropuesta, EtapasConvocatoria.fechaFin)
        .join(EstadosPropuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId)
        .join(Usuario, Propuesta.investigadorCoordId == Usuario.usuarioId)
        .join(Escuela, Propuesta.escuelaId == Escuela.escuelaId)
        .outerjoin(EtapasConvocatoria, Propuesta.etapaId == EtapasConvocatoria.etapaId)
        .filter(Propuesta.codigoPropuesta == codigo).first()
    )
    if not row:
        return None
    p, estado_codigo, estado_nombre, fecha_limite = row
    dictamen_tipo = _tipo_dictamen(db)
    dictamenes = []
    dictamenes_db = db.query(Dictamenes).filter(
        Dictamenes.propuestaId == p.propuestaId
    ).order_by(Dictamenes.fechaEmision.desc()).all()
    for d in dictamenes_db:
        nombre_tipo = d.tipoDictamen.nombreTipoDictamen if d.tipoDictamen else "Dictamen"
        remitente = "CIE" if nombre_tipo == "CIE" else nombre_tipo
        dictamenes.append({
            "dictamenId": d.dictamenId, "tipo": nombre_tipo,
            "numeroOficio": d.numeroOficio,
            "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
            "contenido": d.contenido, "rutaArchivo": d.rutaArchivo,
            "remitente": remitente,
        })
    contenido = db.query(PropuestaContenido).filter(
        PropuestaContenido.propuestaId == p.propuestaId
    ).first()
    documentos = []
    for d in db.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == p.propuestaId,
        PropuestaDocumentos.activo.is_(True),
    ).order_by(PropuestaDocumentos.fechaCarga.desc()).all():
        documentos.append({
            "documentoId": d.documentoId,
            "nombreArchivo": d.nombreArchivo,
            "tipo": d.tipoDocumento.nombreTipoDocumento if d.tipoDocumento else "Documento",
            "rutaArchivo": d.rutaArchivo,
            "fechaCarga": d.fechaCarga.isoformat() if d.fechaCarga else None,
        })
    historial_db = db.query(HistorialEstadosPropuesta).filter(
        HistorialEstadosPropuesta.propuestaId == p.propuestaId
    ).order_by(HistorialEstadosPropuesta.fechaCambio.desc()).all()
    historial = [{
        "fecha": h.fechaCambio.isoformat() if h.fechaCambio else None,
        "estadoAnterior": h.estadoAnterior.nombreEstadoPropuesta if h.estadoAnterior else None,
        "estadoNuevo": h.estadoNuevo.nombreEstadoPropuesta if h.estadoNuevo else "—",
        "responsable": " ".join(x for x in (
            h.usuarioResponsable.nombreUsuario,
            h.usuarioResponsable.apellido1Usuario,
            h.usuarioResponsable.apellido2Usuario,
        ) if x) if h.usuarioResponsable else "Sistema",
        "observaciones": h.observaciones,
    } for h in historial_db]
    subsanaciones = []
    for s in db.query(Subsanaciones).filter(
        Subsanaciones.propuestaId == p.propuestaId
    ).order_by(Subsanaciones.fechaSolicitud.desc()).all():
        subsanaciones.append({
            "subsanacionId": s.subsanacionId,
            "fechaSolicitud": s.fechaSolicitud.isoformat() if s.fechaSolicitud else None,
            "comentarioGestora": s.comentarioGestora,
            "respuestaInvestigador": s.respuestaInvestigador,
            "fechaRespuesta": s.fechaRespuestaInvestigador.isoformat() if s.fechaRespuestaInvestigador else None,
            "pendiente": s.respuestaInvestigador is None,
        })
    return {
        "propuestaId": p.propuestaId,
        "codigo": p.codigoPropuesta,
        "titulo": p.titulo,
        "estado": estado_codigo,
        "estadoCodigo": estado_codigo,
        "estadoNombre": estado_nombre,
        "resuelta": any(d.tipoDictamen and d.tipoDictamen.nombreTipoDictamen == "CIE" for d in dictamenes_db),
        "investigador": " ".join(x for x in (
            p.investigador.nombreUsuario, p.investigador.apellido1Usuario, p.investigador.apellido2Usuario
        ) if x),
        "escuela": p.escuela.nombreEscuela,
        "montoTotal": float(p.montoTotal) if p.montoTotal is not None else None,
        "nivelTrlActual": p.nivelTrlActual,
        "nivelTrlEsperado": p.nivelTrlEsperado,
        "fechaInicio": p.fechaInicio.isoformat() if p.fechaInicio else None,
        "fechaFinalizacion": p.fechaFinalizacion.isoformat() if p.fechaFinalizacion else None,
        "fechaCreacion": p.fechaCreacion.isoformat() if p.fechaCreacion else None,
        "fechaEnvio": p.fechaEnvio.isoformat() if p.fechaEnvio else None,
        "fechaLimite": fecha_limite.date().isoformat() if fecha_limite else None,
        "documentos": documentos,
        "dictamenes": dictamenes,
        "contenidoPropuesta": ({
            "resumen": contenido.resumen,
            "palabrasClave": contenido.palabrasClave,
            "abstract": contenido.abstract,
            "problemaInvestigacion": contenido.problemaInvestigacion,
            "objetivoGeneral": contenido.objetivoGeneral,
            "objetivosEspecificos": contenido.objetivosEspecificos,
            "estadoArte": contenido.estadoArte,
            "metodologia": contenido.metodologia,
            "estrategiaDivulgacion": contenido.estrategiaDivulgacion,
            "hojaRuta": contenido.hojaRuta,
        } if contenido else None),
        "subsanaciones": subsanaciones,
        "historial": historial,
    }


def obtener_evaluacion_cie(db: Session, codigo: str, usuario_id: int) -> dict:
    propuesta = db.query(Propuesta).filter(Propuesta.codigoPropuesta == codigo).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="No se encontró la propuesta.")
    tipo = _tipo_evaluacion(db)
    if not tipo:
        return {"existe": False, "estado": None, "puntajes": [], "calificacion": None, "observaciones": None, "decision": None}
    ev = db.query(Evaluaciones).filter(
        Evaluaciones.propuestaId == propuesta.propuestaId,
        Evaluaciones.evaluadorId == usuario_id,
        Evaluaciones.tipoEvaluacionId == tipo.tipoEvaluacionId,
    ).order_by(Evaluaciones.evaluacionId.desc()).first()
    if not ev:
        return {"existe": False, "estado": None, "puntajes": [], "calificacion": None, "observaciones": None, "decision": None}
    detalles = db.query(DetalleEvaluacion).filter(
        DetalleEvaluacion.evaluacionId == ev.evaluacionId
    ).all()
    return {
        "existe": True,
        "evaluacionId": ev.evaluacionId,
        "estado": ev.estadoEvaluacion.nombreEstadoEvaluacion if ev.estadoEvaluacion else None,
        "calificacion": float(ev.calificacion) if ev.calificacion is not None else None,
        "observaciones": ev.observaciones,
        "recomendacion": ({
            "Recomendar_Financiamiento": "Recomendar financiamiento",
            "Recomendar_Condicionado": "Recomendar condicionado",
            "No_Recomendar_Financiamiento": "No recomendar financiamiento",
        }.get(ev.tipoRecomendacion.nombreTipoRecomendacion) if ev.tipoRecomendacion else None),
        "puntajes": [{
            "criterioId": d.criterioId,
            "puntaje": float(d.puntajeObtenido),
            "justificacion": d.justificacion,
            "requisitoCumplido": d.esRequisitoObligatorioCumplido,
        } for d in detalles],
    }


def guardar_evaluacion_cie(db: Session, codigo: str, usuario_id: int, datos) -> dict:
    propuesta = db.query(Propuesta).join(
        EstadosPropuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId
    ).filter(
        Propuesta.codigoPropuesta == codigo,
        EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE",
    ).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="La propuesta no está disponible en la etapa CIE.")
    tipo = _tipo_evaluacion(db)
    if not tipo:
        raise HTTPException(status_code=409, detail="No está activo el tipo de evaluación CIE.")
    criterios = db.query(CriteriosEvaluacion).filter(
        CriteriosEvaluacion.tipoEvaluacionId == tipo.tipoEvaluacionId,
        CriteriosEvaluacion.activo.is_(True),
    ).order_by(CriteriosEvaluacion.orden).all()
    if not criterios:
        raise HTTPException(status_code=409, detail="La rúbrica CIE no tiene criterios configurados.")
    puntajes = {x.criterioId: x.puntaje for x in datos.puntajes}
    ids = {c.criterioId for c in criterios}
    if set(puntajes) != ids:
        raise HTTPException(status_code=422, detail="Debe calificar todos los criterios de la rúbrica CIE.")
    if any(v < 0 or v > 10 for v in puntajes.values()):
        raise HTTPException(status_code=422, detail="Los puntajes deben estar entre 0 y 10.")
    entradas_por_criterio = {x.criterioId: x for x in datos.puntajes}
    for criterio in criterios:
        if criterio.esRequisitoObligatorio and entradas_por_criterio[criterio.criterioId].requisitoCumplido is None:
            raise HTTPException(status_code=422, detail=f"Indique si se cumple el requisito obligatorio: {criterio.nombreCriterio}.")
    peso_total = sum(float(c.pesoPorcentaje) for c in criterios)
    if peso_total <= 0:
        raise HTTPException(status_code=409, detail="Los pesos de la rúbrica CIE no son válidos.")
    calificacion = sum(puntajes[c.criterioId] * float(c.pesoPorcentaje) for c in criterios) / peso_total
    nombres_recomendacion = {
        "Recomendar financiamiento": "Recomendar_Financiamiento",
        "Recomendar condicionado": "Recomendar_Condicionado",
        "No recomendar financiamiento": "No_Recomendar_Financiamiento",
    }
    nombre_recomendacion = nombres_recomendacion.get(datos.recomendacion)
    if not nombre_recomendacion:
        raise HTTPException(status_code=422, detail="Seleccione una recomendación válida.")
    recomendacion = db.query(TiposRecomendacion).filter(
        TiposRecomendacion.nombreTipoRecomendacion == nombre_recomendacion,
        TiposRecomendacion.activo.is_(True),
    ).first()
    estado = db.query(EstadosEvaluacion).filter(
        EstadosEvaluacion.nombreEstadoEvaluacion == "Completada",
        EstadosEvaluacion.activo.is_(True),
    ).first()
    if not recomendacion or not estado:
        raise HTTPException(status_code=409, detail="Faltan catálogos activos de recomendación o estado Completada.")
    try:
        ev = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta.propuestaId,
            Evaluaciones.evaluadorId == usuario_id,
            Evaluaciones.tipoEvaluacionId == tipo.tipoEvaluacionId,
        ).order_by(Evaluaciones.evaluacionId.desc()).first()
        if ev and ev.estadoEvaluacion and ev.estadoEvaluacion.nombreEstadoEvaluacion == "Completada":
            raise HTTPException(status_code=409, detail="La evaluación CIE ya fue enviada y no se puede modificar.")
        
        if not ev:
            ev = Evaluaciones(
                propuestaId=propuesta.propuestaId,
                evaluadorId=usuario_id,
                tipoEvaluacionId=tipo.tipoEvaluacionId,
                estadoEvaluacionId=estado.estadoEvaluacionId,
                usuarioAuditoriaId=usuario_id,
            )
            db.add(ev)
            db.flush()

        ev.calificacion = round(calificacion, 2)
        ev.tipoRecomendacionId = recomendacion.tipoRecomendacionId
        ev.observaciones = datos.observaciones
        ev.estadoEvaluacionId = estado.estadoEvaluacionId
        ev.usuarioAuditoriaId = usuario_id
        actuales = {d.criterioId: d for d in db.query(DetalleEvaluacion).filter(DetalleEvaluacion.evaluacionId == ev.evaluacionId).all()}
        for c in criterios:
            d = actuales.get(c.criterioId)
            if not d:
                d = DetalleEvaluacion(evaluacionId=ev.evaluacionId, criterioId=c.criterioId, usuarioAuditoriaId=usuario_id)
                db.add(d)
            d.puntajeObtenido = puntajes[c.criterioId]
            entrada = entradas_por_criterio[c.criterioId]
            d.esRequisitoObligatorioCumplido = entrada.requisitoCumplido if c.esRequisitoObligatorio else None
            d.justificacion = entrada.justificacion
            d.usuarioAuditoriaId = usuario_id
        db.commit()
        db.refresh(ev)
    except Exception:
        db.rollback()
        raise
    return {
        "mensaje": "Evaluación CIE completada correctamente.",
        "evaluacionId": ev.evaluacionId,
        "estado": "Completada",
        "calificacion": round(calificacion, 2),
        "recomendacion": nombre_recomendacion,
    }


def registrar_resolucion_cie(db: Session, codigo: str, usuario_id: int, datos) -> dict:
    propuesta = db.query(Propuesta).join(
        EstadosPropuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId
    ).filter(
        Propuesta.codigoPropuesta == codigo,
        EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE",
    ).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="La propuesta no está en estado EN_CIE.")
    tipo_dictamen = _tipo_dictamen(db)
    tipo_eval = _tipo_evaluacion(db)
    if not tipo_dictamen or not tipo_eval:
        raise HTTPException(status_code=409, detail="Faltan catálogos CIE activos.")
    if db.query(Dictamenes).filter(
        Dictamenes.propuestaId == propuesta.propuestaId,
        Dictamenes.tipoDictamenId == tipo_dictamen.tipoDictamenId,
    ).first():
        raise HTTPException(status_code=409, detail="La propuesta ya tiene una resolución CIE.")
    evaluacion = db.query(Evaluaciones).filter(
        Evaluaciones.propuestaId == propuesta.propuestaId,
        Evaluaciones.evaluadorId == usuario_id,
        Evaluaciones.tipoEvaluacionId == tipo_eval.tipoEvaluacionId,
    ).order_by(Evaluaciones.evaluacionId.desc()).first()
    if not evaluacion or not evaluacion.estadoEvaluacion or evaluacion.estadoEvaluacion.nombreEstadoEvaluacion != "Completada":
        raise HTTPException(status_code=409, detail="Primero debe completar la rúbrica CIE.")
    if not datos.decision or not datos.justificacion:
        raise HTTPException(status_code=422, detail="La decisión y su justificación son obligatorias.")
    nombre_estado = "APROBADA" if datos.decision == "Aprobar" else "RECHAZADA"
    estado_propuesta = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta == nombre_estado,
        EstadosPropuesta.activo.is_(True),
    ).first()
    if not estado_propuesta:
        raise HTTPException(status_code=409, detail=f"No existe el estado {nombre_estado}.")
    contenido = (
        f"RESOLUCIÓN DEL CONSEJO DE INVESTIGACIÓN Y EXTENSIÓN (CIE)\n"
        f"Propuesta: {propuesta.codigoPropuesta} - {propuesta.titulo}\n"
        f"Decisión: {'APROBADA' if datos.decision == 'Aprobar' else 'RECHAZADA'}\n"
        f"Calificación CIE: {evaluacion.calificacion}/10\n"
        f"Recomendación de la rúbrica: {evaluacion.tipoRecomendacion.nombreTipoRecomendacion if evaluacion.tipoRecomendacion else 'No indicada'}\n\n"
        f"Justificación:\n{datos.justificacion.strip()}\n\n"
        f"Observaciones de evaluación:\n{evaluacion.observaciones or 'Sin observaciones adicionales.'}"
    )
    try:
        estado_anterior_id = propuesta.estadoId
        dictamen = Dictamenes(
            propuestaId=propuesta.propuestaId,
            tipoDictamenId=tipo_dictamen.tipoDictamenId,
            numeroOficio=datos.numeroOficio,
            contenido=contenido,
            rutaArchivo=datos.rutaArchivo,
            usuarioRemitenteId=usuario_id,
            usuarioAuditoriaId=usuario_id,
        )
        db.add(dictamen)
        propuesta.estadoId = estado_propuesta.estadoPropuestaId
        db.add(HistorialEstadosPropuesta(
            propuestaId=propuesta.propuestaId,
            estadoAnteriorId=estado_anterior_id,
            estadoNuevoId=estado_propuesta.estadoPropuestaId,
            usuarioResponsableId=usuario_id,
            observaciones=f"Resolución CIE: {datos.decision}. {datos.justificacion.strip()}",
        ))
        db.commit()
        db.refresh(dictamen)
    except Exception:
        db.rollback()
        raise
    return {
        "mensaje": "Resolución CIE registrada y remitida a Dirección de Investigación.",
        "dictamenId": dictamen.dictamenId,
        "propuestaId": propuesta.propuestaId,
        "codigo": propuesta.codigoPropuesta,
        "decision": datos.decision,
        "numeroOficio": dictamen.numeroOficio,
        "fechaEmision": dictamen.fechaEmision.isoformat() if dictamen.fechaEmision else None,
        "contenido": contenido,
    }


def listar_resoluciones_cie(db: Session) -> list[dict]:
    tipo = _tipo_dictamen(db)
    if not tipo:
        return []
    filas = db.query(Dictamenes, Propuesta).join(
        Propuesta, Dictamenes.propuestaId == Propuesta.propuestaId
    ).filter(
        Dictamenes.tipoDictamenId == tipo.tipoDictamenId
    ).order_by(Dictamenes.fechaEmision.desc(), Dictamenes.dictamenId.desc()).all()
    return [{
        "dictamenId": d.dictamenId, "propuestaId": p.propuestaId,
        "codigo": p.codigoPropuesta, "titulo": p.titulo,
        "numeroOficio": d.numeroOficio,
        "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
        "contenido": d.contenido, "rutaArchivo": d.rutaArchivo,
        "decision": "Aprobar" if "Decisión: APROBADA" in (d.contenido or "") else "Rechazar",
    } for d, p in filas]
