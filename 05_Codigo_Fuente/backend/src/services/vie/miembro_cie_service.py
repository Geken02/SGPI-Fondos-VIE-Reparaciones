
from sqlalchemy.orm import Session

from src.models.propuestas import Propuesta
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela
from src.models.convocatorias import EstadosPropuesta, EtapasConvocatoria
from src.models.evaluaciones import Evaluaciones,TiposEvaluacion,CriteriosEvaluacion,DetalleEvaluacion,EstadosEvaluacion,TiposRecomendacion
from fastapi import HTTPException
from src.models.dictamenes import Dictamenes, TiposDictamen
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion



def listar_expedientes_cie(db: Session, usuario_id: int) -> list[dict]:
    propuestas = (
        db.query(Propuesta, EtapasConvocatoria.fechaFin)
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .join(
            Usuario,
            Propuesta.investigadorCoordId == Usuario.usuarioId,
        )
        .join(
            Escuela,
            Propuesta.escuelaId == Escuela.escuelaId,
        )
        .outerjoin(
            EtapasConvocatoria,
            Propuesta.etapaId == EtapasConvocatoria.etapaId,
        )
        .filter(
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE",
            ~db.query(Dictamenes.dictamenId)
            .join(
                TiposDictamen,
                Dictamenes.tipoDictamenId == TiposDictamen.tipoDictamenId,
            )
            .filter(
                Dictamenes.propuestaId == Propuesta.propuestaId,
                TiposDictamen.nombreTipoDictamen == "CIE",
            )
            .exists(),
        )
        .order_by(Propuesta.propuestaId)
        .all()
    )

    resultado = []

    for propuesta, fecha_fin in propuestas:
        evaluacion_cie = (
            db.query(Evaluaciones.evaluacionId)
            .join(
                TiposEvaluacion,
                Evaluaciones.tipoEvaluacionId == TiposEvaluacion.tipoEvaluacionId,
            )
            .filter(
                Evaluaciones.propuestaId == propuesta.propuestaId,
                Evaluaciones.evaluadorId == usuario_id,
                TiposEvaluacion.nombreTipoEvaluacion == "CIE",
            )
            .first()
        )

        subsanacion_pendiente = (
            db.query(Subsanaciones.subsanacionId)
            .join(
                EstadosSubsanacion,
                Subsanaciones.estadoSubsanacionId
                == EstadosSubsanacion.estadoSubsanacionId,
            )
            .filter(
                Subsanaciones.propuestaId == propuesta.propuestaId,
                Subsanaciones.respuestaInvestigador.is_(None),
                EstadosSubsanacion.nombreEstadoSubsanacion == "Pendiente",
            )
            .first()
        )

        if subsanacion_pendiente:
            estado_trabajo = "con_observaciones"
        elif evaluacion_cie:
            estado_trabajo = "en_revision"
        else:
            estado_trabajo = "por_evaluar"

        investigador = propuesta.investigador
        nombre_investigador = " ".join(
            parte
            for parte in [
                investigador.nombreUsuario,
                investigador.apellido1Usuario,
                investigador.apellido2Usuario,
            ]
            if parte
        )

        resultado.append(
            {
                "propuestaId": propuesta.propuestaId,
                "codigo": propuesta.codigoPropuesta,
                "titulo": propuesta.titulo,
                "investigador": nombre_investigador,
                "escuela": propuesta.escuela.nombreEscuela,
                "fechaLimite": fecha_fin.date().isoformat() if fecha_fin else None,
                "estado": estado_trabajo,
            }
        )

    return resultado


def obtener_rubrica_cie(db: Session) -> list[dict]:
    """
    Devuelve los criterios activos de la rúbrica de evaluación CIE,
    ordenados según el campo 'orden'.
    """
    criterios = (
        db.query(CriteriosEvaluacion)
        .join(
            TiposEvaluacion,
            CriteriosEvaluacion.tipoEvaluacionId
            == TiposEvaluacion.tipoEvaluacionId,
        )
        .filter(
            TiposEvaluacion.nombreTipoEvaluacion == "CIE",
            TiposEvaluacion.activo.is_(True),
            CriteriosEvaluacion.activo.is_(True),
        )
        .order_by(
            CriteriosEvaluacion.orden,
            CriteriosEvaluacion.criterioId,
        )
        .all()
    )

    return [
        {
            "criterioId": criterio.criterioId,
            "seccion": criterio.nombreSeccion,
            "criterio": criterio.nombreCriterio,
            "pesoPorcentaje": float(criterio.pesoPorcentaje),
            "esRequisitoObligatorio": criterio.esRequisitoObligatorio,
            "orden": criterio.orden,
        }
        for criterio in criterios
    ]


def obtener_expediente_cie(db: Session, codigo: str) -> dict | None:
    """
    Obtiene los datos principales de una propuesta por su código.
    Devuelve None si no existe.
    """
    resultado = (
        db.query(
            Propuesta,
            EstadosPropuesta.codigoEstadoPropuesta,
            EtapasConvocatoria.fechaFin,
        )
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .join(
            Usuario,
            Propuesta.investigadorCoordId == Usuario.usuarioId,
        )
        .join(
            Escuela,
            Propuesta.escuelaId == Escuela.escuelaId,
        )
        .outerjoin(
            EtapasConvocatoria,
            Propuesta.etapaId == EtapasConvocatoria.etapaId,
        )
        .filter(Propuesta.codigoPropuesta == codigo)
        .first()
    )

    if resultado is None:
        return None

    propuesta, estado, fecha_limite = resultado

    investigador = propuesta.investigador
    nombre_investigador = " ".join(
        parte
        for parte in [
            investigador.nombreUsuario,
            investigador.apellido1Usuario,
            investigador.apellido2Usuario,
        ]
        if parte
    )

    return {
        "propuestaId": propuesta.propuestaId,
        "codigo": propuesta.codigoPropuesta,
        "titulo": propuesta.titulo,
        "estado": estado,
        "investigador": nombre_investigador,
        "escuela": propuesta.escuela.nombreEscuela,
        "montoTotal": (
            float(propuesta.montoTotal)
            if propuesta.montoTotal is not None
            else None
        ),
        "nivelTrlActual": propuesta.nivelTrlActual,
        "nivelTrlEsperado": propuesta.nivelTrlEsperado,
        "fechaInicio": (
            propuesta.fechaInicio.isoformat()
            if propuesta.fechaInicio
            else None
        ),
        "fechaFinalizacion": (
            propuesta.fechaFinalizacion.isoformat()
            if propuesta.fechaFinalizacion
            else None
        ),
        "fechaCreacion": (
            propuesta.fechaCreacion.isoformat()
            if propuesta.fechaCreacion
            else None
        ),
        "fechaEnvio": (
            propuesta.fechaEnvio.isoformat()
            if propuesta.fechaEnvio
            else None
        ),
        "fechaLimite": (
            fecha_limite.date().isoformat()
            if fecha_limite
            else None
        ),
    }

def obtener_evaluacion_cie(
    db: Session,
    codigo: str,
    usuario_id: int,
) -> dict | None:
    """
    Consulta la evaluación CIE del usuario para una propuesta.
    Devuelve None si la propuesta o la evaluación no existen.
    """
    propuesta = (
        db.query(Propuesta)
        .filter(Propuesta.codigoPropuesta == codigo)
        .first()
    )

    if propuesta is None:
        return None

    evaluacion = (
        db.query(Evaluaciones)
        .join(
            TiposEvaluacion,
            Evaluaciones.tipoEvaluacionId
            == TiposEvaluacion.tipoEvaluacionId,
        )
        .filter(
            Evaluaciones.propuestaId == propuesta.propuestaId,
            Evaluaciones.evaluadorId == usuario_id,
            TiposEvaluacion.nombreTipoEvaluacion == "CIE",
        )
        .order_by(Evaluaciones.evaluacionId.desc())
        .first()
    )

    if evaluacion is None:
        return None

    detalles = (
        db.query(DetalleEvaluacion, CriteriosEvaluacion)
        .join(
            CriteriosEvaluacion,
            DetalleEvaluacion.criterioId
            == CriteriosEvaluacion.criterioId,
        )
        .filter(
            DetalleEvaluacion.evaluacionId == evaluacion.evaluacionId
        )
        .order_by(
            CriteriosEvaluacion.orden,
            CriteriosEvaluacion.criterioId,
        )
        .all()
    )

    return {
        "evaluacionId": evaluacion.evaluacionId,
        "propuestaId": propuesta.propuestaId,
        "codigo": propuesta.codigoPropuesta,
        "titulo": propuesta.titulo,
        "evaluadorId": evaluacion.evaluadorId,
        "fechaEvaluacion": (
            evaluacion.fechaEvaluacion.isoformat()
            if evaluacion.fechaEvaluacion
            else None
        ),
        "calificacion": (
            float(evaluacion.calificacion)
            if evaluacion.calificacion is not None
            else None
        ),
        "recomendacion": (
            evaluacion.tipoRecomendacion.nombreTipoRecomendacion
            if evaluacion.tipoRecomendacion
            else None
        ),
        "estado": (
            evaluacion.estadoEvaluacion.nombreEstadoEvaluacion
            if evaluacion.estadoEvaluacion
            else None
        ),
        "observaciones": evaluacion.observaciones,
        "detalles": [
            {
                "detalleEvaluacionId": detalle.detalleEvaluacionId,
                "criterioId": criterio.criterioId,
                "seccion": criterio.nombreSeccion,
                "criterio": criterio.nombreCriterio,
                "pesoPorcentaje": float(criterio.pesoPorcentaje),
                "puntajeObtenido": float(detalle.puntajeObtenido),
                "justificacion": detalle.justificacion,
                "esRequisitoObligatorio": criterio.esRequisitoObligatorio,
                "esRequisitoObligatorioCumplido": (
                    detalle.esRequisitoObligatorioCumplido
                ),
            }
            for detalle, criterio in detalles
        ],
    }


def guardar_evaluacion_cie(
    db: Session,
    codigo: str,
    usuario_id: int,
    datos,
) -> dict:
    """Crea o actualiza el borrador de evaluación CIE del usuario."""

    propuesta = (
        db.query(Propuesta)
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .filter(
            Propuesta.codigoPropuesta == codigo,
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE",
        )
        .first()
    )

    if propuesta is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró la propuesta en estado EN_CIE.",
        )

    tipo_cie = (
        db.query(TiposEvaluacion)
        .filter(
            TiposEvaluacion.nombreTipoEvaluacion == "CIE",
            TiposEvaluacion.activo.is_(True),
        )
        .first()
    )

    if tipo_cie is None:
        raise HTTPException(
            status_code=409,
            detail="El tipo de evaluación CIE no está activo.",
        )

    estado_borrador = (
        db.query(EstadosEvaluacion)
        .filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Borrador",
            EstadosEvaluacion.activo.is_(True),
        )
        .first()
    )

    if estado_borrador is None:
        raise HTTPException(
            status_code=409,
            detail="No existe un estado Borrador activo.",
        )

    criterios_cie = (
        db.query(CriteriosEvaluacion)
        .filter(
            CriteriosEvaluacion.tipoEvaluacionId
            == tipo_cie.tipoEvaluacionId,
            CriteriosEvaluacion.activo.is_(True),
        )
        .all()
    )

    if datos.estado != "Borrador":
        raise HTTPException(
            status_code=409,
            detail=(
                "Solo se permite guardar borradores hasta que "
                "la rúbrica CIE esté definida y validada."
            ),
        )

    if datos.detalles:
        if not criterios_cie:
            raise HTTPException(
                status_code=409,
                detail="La rúbrica CIE todavía no tiene criterios activos.",
            )

        ids_validos = {criterio.criterioId for criterio in criterios_cie}
        ids_recibidos = [detalle.criterioId for detalle in datos.detalles]

        if len(ids_recibidos) != len(set(ids_recibidos)):
            raise HTTPException(
                status_code=422,
                detail="No se puede repetir un criterio en la evaluación.",
            )

        if not set(ids_recibidos).issubset(ids_validos):
            raise HTTPException(
                status_code=422,
                detail="Hay criterios que no pertenecen a la rúbrica CIE activa.",
            )

    evaluacion = (
        db.query(Evaluaciones)
        .filter(
            Evaluaciones.propuestaId == propuesta.propuestaId,
            Evaluaciones.evaluadorId == usuario_id,
            Evaluaciones.tipoEvaluacionId == tipo_cie.tipoEvaluacionId,
        )
        .order_by(Evaluaciones.evaluacionId.desc())
        .first()
    )

    try:
        if evaluacion is None:
            evaluacion = Evaluaciones(
                propuestaId=propuesta.propuestaId,
                evaluadorId=usuario_id,
                tipoEvaluacionId=tipo_cie.tipoEvaluacionId,
                estadoEvaluacionId=estado_borrador.estadoEvaluacionId,
                usuarioAuditoriaId=usuario_id,
            )
            db.add(evaluacion)
            db.flush()

        evaluacion.calificacion = datos.calificacion
        evaluacion.tipoRecomendacionId = datos.tipoRecomendacionId
        evaluacion.observaciones = datos.observaciones
        evaluacion.estadoEvaluacionId = estado_borrador.estadoEvaluacionId
        evaluacion.usuarioAuditoriaId = usuario_id

        if datos.detalles:
            recomendacion = None

            if datos.tipoRecomendacionId is not None:
                recomendacion = (
                    db.query(TiposRecomendacion)
                    .filter(
                        TiposRecomendacion.tipoRecomendacionId
                        == datos.tipoRecomendacionId,
                        TiposRecomendacion.activo.is_(True),
                    )
                    .first()
                )

                if recomendacion is None:
                    raise HTTPException(
                        status_code=422,
                        detail="El tipo de recomendación no existe o está inactivo.",
                    )

            existentes = {
                detalle.criterioId: detalle
                for detalle in db.query(DetalleEvaluacion)
                .filter(
                    DetalleEvaluacion.evaluacionId
                    == evaluacion.evaluacionId
                )
                .all()
            }

            for entrada in datos.detalles:
                detalle = existentes.get(entrada.criterioId)

                if detalle is None:
                    detalle = DetalleEvaluacion(
                        evaluacionId=evaluacion.evaluacionId,
                        criterioId=entrada.criterioId,
                        usuarioAuditoriaId=usuario_id,
                    )
                    db.add(detalle)

                detalle.puntajeObtenido = entrada.puntajeObtenido
                detalle.justificacion = entrada.justificacion
                detalle.esRequisitoObligatorioCumplido = (
                    entrada.esRequisitoObligatorioCumplido
                )
                detalle.usuarioAuditoriaId = usuario_id

        db.commit()
        db.refresh(evaluacion)

    except Exception:
        db.rollback()
        raise

    return {
        "mensaje": "Borrador de evaluación CIE guardado correctamente.",
        "evaluacionId": evaluacion.evaluacionId,
        "propuestaId": evaluacion.propuestaId,
        "evaluadorId": evaluacion.evaluadorId,
        "estado": "Borrador",
    }



def registrar_resolucion_cie(
    db: Session,
    codigo: str,
    usuario_id: int,
    datos,
) -> dict:
    """Registra una resolución CIE para una propuesta en estado EN_CIE."""

    propuesta = (
        db.query(Propuesta)
        .join(
            EstadosPropuesta,
            Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId,
        )
        .filter(
            Propuesta.codigoPropuesta == codigo,
            EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE",
            EstadosPropuesta.activo.is_(True),
        )
        .first()
    )

    if propuesta is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró la propuesta en estado EN_CIE.",
        )

    tipo_dictamen = (
        db.query(TiposDictamen)
        .filter(
            TiposDictamen.nombreTipoDictamen == "CIE",
            TiposDictamen.activo.is_(True),
        )
        .first()
    )

    if tipo_dictamen is None:
        raise HTTPException(
            status_code=409,
            detail="El tipo de dictamen CIE no está activo.",
        )

    existente = (
        db.query(Dictamenes)
        .filter(
            Dictamenes.propuestaId == propuesta.propuestaId,
            Dictamenes.tipoDictamenId == tipo_dictamen.tipoDictamenId,
        )
        .first()
    )

    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="La propuesta ya tiene una resolución CIE registrada.",
        )

    tipo_evaluacion = (
        db.query(TiposEvaluacion)
        .filter(
            TiposEvaluacion.nombreTipoEvaluacion == "CIE",
            TiposEvaluacion.activo.is_(True),
        )
        .first()
    )

    if tipo_evaluacion is None:
        raise HTTPException(
            status_code=409,
            detail="El tipo de evaluación CIE no está activo.",
        )

    estado_completada = (
        db.query(EstadosEvaluacion)
        .filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Completada",
            EstadosEvaluacion.activo.is_(True),
        )
        .first()
    )

    if estado_completada is None:
        raise HTTPException(
            status_code=409,
            detail="No existe un estado Completada activo.",
        )

    evaluacion = (
        db.query(Evaluaciones)
        .filter(
            Evaluaciones.propuestaId == propuesta.propuestaId,
            Evaluaciones.evaluadorId == usuario_id,
            Evaluaciones.tipoEvaluacionId == tipo_evaluacion.tipoEvaluacionId,
            Evaluaciones.estadoEvaluacionId
            == estado_completada.estadoEvaluacionId,
        )
        .first()
    )

    if evaluacion is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Se requiere una evaluación CIE completada por el usuario "
                "autenticado antes de registrar la resolución."
            ),
        )

    resolucion = Dictamenes(
        propuestaId=propuesta.propuestaId,
        tipoDictamenId=tipo_dictamen.tipoDictamenId,
        numeroOficio=datos.numeroOficio,
        contenido=datos.contenido,
        rutaArchivo=datos.rutaArchivo,
        usuarioRemitenteId=usuario_id,
        usuarioAuditoriaId=usuario_id,
    )

    try:
        db.add(resolucion)
        db.commit()
        db.refresh(resolucion)
    except Exception:
        db.rollback()
        raise

    return {
        "mensaje": "Resolución CIE registrada correctamente.",
        "dictamenId": resolucion.dictamenId,
        "propuestaId": resolucion.propuestaId,
        "codigo": propuesta.codigoPropuesta,
        "tipoDictamen": tipo_dictamen.nombreTipoDictamen,
        "numeroOficio": resolucion.numeroOficio,
        "fechaEmision": (
            resolucion.fechaEmision.isoformat()
            if resolucion.fechaEmision
            else None
        ),
        "contenido": resolucion.contenido,
        "rutaArchivo": resolucion.rutaArchivo,
        "usuarioRemitenteId": resolucion.usuarioRemitenteId,
    }


def listar_resoluciones_cie(db: Session) -> list[dict]:
    """Lista las resoluciones CIE registradas."""

    resoluciones = (
        db.query(Dictamenes, Propuesta, TiposDictamen)
        .join(
            Propuesta,
            Dictamenes.propuestaId == Propuesta.propuestaId,
        )
        .join(
            TiposDictamen,
            Dictamenes.tipoDictamenId == TiposDictamen.tipoDictamenId,
        )
        .filter(
            TiposDictamen.nombreTipoDictamen == "CIE",
            TiposDictamen.activo.is_(True),
        )
        .order_by(
            Dictamenes.fechaEmision.desc(),
            Dictamenes.dictamenId.desc(),
        )
        .all()
    )

    return [
        {
            "dictamenId": dictamen.dictamenId,
            "propuestaId": propuesta.propuestaId,
            "codigo": propuesta.codigoPropuesta,
            "titulo": propuesta.titulo,
            "numeroOficio": dictamen.numeroOficio,
            "fechaEmision": (
                dictamen.fechaEmision.isoformat()
                if dictamen.fechaEmision
                else None
            ),
            "contenido": dictamen.contenido,
            "rutaArchivo": dictamen.rutaArchivo,
            "usuarioRemitenteId": dictamen.usuarioRemitenteId,
        }
        for dictamen, propuesta, tipo in resoluciones
    ]
