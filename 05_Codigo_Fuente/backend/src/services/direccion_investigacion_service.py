import json
import re
import mimetypes
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.dictamenes import Dictamenes, TiposDictamen
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela
from src.services.documento_oficial_pdf import generar_oficio_pdf
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.catalogos import ConfiguracionesSistema
from src.models.notificaciones import (
    Notificaciones, TiposNotificacion, CanalesComunicacion
)


PREFIJO_CONFIG = "direccion_investigacion."
CARPETA_DOCUMENTOS = Path("storage") / "documentos_direccion"


def _buscar_propuesta(db: Session, codigo: str):
    from src.models.propuestas import Propuesta

    propuesta = (
        db.query(Propuesta)
        .join(Usuario, Propuesta.investigadorCoordId == Usuario.usuarioId)
        .join(Escuela, Propuesta.escuelaId == Escuela.escuelaId)
        .filter(Propuesta.codigoPropuesta == codigo)
        .first()
    )
    if propuesta is None:
        raise HTTPException(status_code=404, detail="No se encontró la propuesta.")
    return propuesta


def _dictamenes_cie(db: Session, propuesta_id: int | None = None):
    consulta = (
        db.query(Dictamenes)
        .join(TiposDictamen, Dictamenes.tipoDictamenId == TiposDictamen.tipoDictamenId)
        .filter(
            TiposDictamen.nombreTipoDictamen.ilike("CIE"),
            TiposDictamen.activo.is_(True),
        )
    )
    if propuesta_id is not None:
        consulta = consulta.filter(Dictamenes.propuestaId == propuesta_id)
    return consulta


def _decision_dictamen(contenido: str | None) -> str:
    texto = contenido or ""
    coincidencia = re.search(
        r"decisi[oó]n(?:\s+del\s+CIE)?\s*:\s*(aprobar|rechazar)",
        texto,
        flags=re.IGNORECASE,
    )
    if coincidencia:
        return "Aprobar" if coincidencia.group(1).lower() == "aprobar" else "Rechazar"
    # Compatibilidad con resoluciones anteriores que no separaban los campos.
    if re.search(
        r"\b(no\s+(?:es\s+)?favorable|desfavorable|rechazada|rechazado|se rechaza)\b",
        texto,
        re.IGNORECASE,
    ):
        return "Rechazar"

    if re.search(
        r"\b(aprobada|aprobado|se aprueba|favorable)\b",
        texto,
        re.IGNORECASE,
    ):
        return "Aprobar"

    return "Sin decisión registrada"


def _estado_tramite(db: Session, propuesta_id: int) -> str:
    documentos = (
        db.query(PropuestaDocumentos.documentoId)
        .join(TiposDocumento, TiposDocumento.tipoDocumentoId == PropuestaDocumentos.tipoDocumentoId)
        .filter(
            PropuestaDocumentos.propuestaId == propuesta_id,
            PropuestaDocumentos.activo.is_(True),
            TiposDocumento.nombreTipoDocumento == "Oficio_Direccion_Investigacion",
        )
        .count()
    )
    if not documentos:
        return "por_revisar"

    notificada = (
        db.query(Notificaciones.notificacionId)
        .join(TiposNotificacion, Notificaciones.tipoNotificacionId == TiposNotificacion.tipoNotificacionId)
        .filter(
            Notificaciones.propuestaId == propuesta_id,
            TiposNotificacion.nombreTipoNotificacion.in_(["Aprobacion_Propuesta", "Rechazo_Propuesta"]),
        )
        .first()
    )
    return "completado" if notificada else "en_proceso"


def _datos_propuesta(propuesta):
    investigador = propuesta.investigador
    return {
        "investigador": " ".join(
            parte for parte in (
                investigador.nombreUsuario,
                investigador.apellido1Usuario,
                investigador.apellido2Usuario,
            ) if parte
        ),
        "escuela": propuesta.escuela.nombreEscuela if propuesta.escuela else "",
    }


def listar_dictamenes(db: Session):
    filas = (
        _dictamenes_cie(db)
        .join(Dictamenes.propuesta)
        .order_by(Dictamenes.fechaEmision.desc(), Dictamenes.dictamenId.desc())
        .all()
    )
    resultado = []
    for d in filas:
        p = d.propuesta
        persona = _datos_propuesta(p)
        resultado.append({
            "dictamenId": d.dictamenId,
            "propuestaId": p.propuestaId,
            "codigo": p.codigoPropuesta,
            "titulo": p.titulo,
            **persona,
            "numeroOficio": d.numeroOficio,
            "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
            "contenido": d.contenido,
            "tipo": "CIE",
            "decision": _decision_dictamen(d.contenido),
            "estado": _estado_tramite(db, p.propuestaId),
        })
    return resultado


def obtener_dictamen(db: Session, codigo: str):
    propuesta = _buscar_propuesta(db, codigo)
    d = (
        _dictamenes_cie(db, propuesta.propuestaId)
        .order_by(Dictamenes.fechaEmision.desc(), Dictamenes.dictamenId.desc())
        .first()
    )
    if d is None:
        raise HTTPException(status_code=404, detail="La propuesta todavía no tiene una resolución final del CIE.")

    persona = _datos_propuesta(propuesta)
    documentos = listar_documentos(db, codigo)
    contenido = d.contenido or ""
    justificacion = contenido
    observaciones = ""
    match_justificacion = re.search(r"justificaci[oó]n\s*:\s*(.*)", contenido, re.IGNORECASE | re.DOTALL)
    if match_justificacion:
        justificacion = match_justificacion.group(1).strip()
    match_observaciones = re.search(r"observaciones\s*:\s*(.*)", contenido, re.IGNORECASE | re.DOTALL)
    if match_observaciones:
        observaciones = match_observaciones.group(1).strip()

    return {
        "codigo": propuesta.codigoPropuesta,
        "titulo": propuesta.titulo,
        "propuestaId": propuesta.propuestaId,
        **persona,
        "estado": _estado_tramite(db, propuesta.propuestaId),
        "decision": _decision_dictamen(contenido),
        "dictamen": {
            "dictamenId": d.dictamenId,
            "numeroOficio": d.numeroOficio,
            "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
            "contenido": contenido,
            "tipo": "CIE",
        },
        "justificacion": justificacion,
        "observaciones": observaciones,
        "criterios": [],
        "documentos": documentos,
        "historial": [],
    }


def listar_documentos(db: Session, codigo: str):
    propuesta = _buscar_propuesta(db, codigo)
    documentos = (
        db.query(PropuestaDocumentos)
        .join(TiposDocumento, TiposDocumento.tipoDocumentoId == PropuestaDocumentos.tipoDocumentoId)
        .filter(
            PropuestaDocumentos.propuestaId == propuesta.propuestaId,
            PropuestaDocumentos.activo.is_(True),
            TiposDocumento.nombreTipoDocumento == "Oficio_Direccion_Investigacion",
        )
        .order_by(PropuestaDocumentos.fechaCarga.desc())
        .all()
    )
    return [{
        "documentoId": doc.documentoId,
        "nombre": doc.nombreArchivo,
        "tipoDocumentoId": doc.tipoDocumentoId,
        "fechaCarga": doc.fechaCarga.isoformat() if doc.fechaCarga else None,
        "rutaArchivo": doc.rutaArchivo,
    } for doc in documentos]


def obtener_documento_para_descarga(db: Session, documento_id: int):
    documento = (
        db.query(PropuestaDocumentos)
        .filter(
            PropuestaDocumentos.documentoId == documento_id,
            PropuestaDocumentos.activo.is_(True),
        )
        .first()
    )

    if documento is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el documento solicitado.",
        )

    ruta = Path(documento.rutaArchivo)

    if not ruta.is_absolute():
        ruta = Path.cwd() / ruta

    ruta = ruta.resolve()
    carpeta = CARPETA_DOCUMENTOS.resolve()

    # Evitar que se descarguen archivos fuera del almacenamiento autorizado.
    try:
        ruta.relative_to(carpeta)
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="La ruta del documento no está autorizada.",
        )

    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail="El archivo del documento no existe en el almacenamiento.",
        )

    return {
        "ruta": ruta,
        "nombre": documento.nombreArchivo,
        "media_type": mimetypes.guess_type(documento.nombreArchivo)[0] or "application/octet-stream",
    }


def generar_documento(db: Session, codigo: str, datos, usuario):
    propuesta = _buscar_propuesta(db, codigo)

    # Verificar que exista un dictamen del CIE para la propuesta.
    dictamen = (
        _dictamenes_cie(db, propuesta.propuestaId)
        .order_by(Dictamenes.fechaEmision.desc(), Dictamenes.dictamenId.desc())
        .first()
    )

    if dictamen is None:
        raise HTTPException(
            status_code=409,
            detail="No se puede generar un oficio porque la propuesta todavía no tiene una resolución final del CIE.",
        )

    decision = _decision_dictamen(dictamen.contenido)
    if decision not in {"Aprobar", "Rechazar"}:
        raise HTTPException(
            status_code=409,
            detail="La resolución del CIE no contiene una decisión explícita de aprobar o rechazar.",
        )

    # La Dirección utiliza un tipo documental propio.
    tipo_nombre = "Oficio_Direccion_Investigacion"

    tipo_doc = db.query(TiposDocumento).filter(
        TiposDocumento.nombreTipoDocumento.ilike(tipo_nombre),
        TiposDocumento.activo.is_(True),
    ).first()

    if tipo_doc is None:
        raise HTTPException(
            status_code=409,
            detail="No existe el tipo documental activo Oficio_Direccion_Investigacion.",
        )

    fecha = datos.fechaEmision or datetime.now(timezone.utc).date()

    numero = (
        f"{datos.prefijoOficio}-"
        f"{fecha.year}-"
        f"{propuesta.codigoPropuesta}"
    )

    contenido = datos.plantilla.strip() or (
        f"OFICIO {numero}\n"
        f"Fecha de emisión: {fecha.isoformat()}\n"
        f"Propuesta: {propuesta.codigoPropuesta}\n"
        f"Título: {propuesta.titulo}\n"
        f"Tipo de dictamen: "
        f"{dictamen.tipoDictamen.nombreTipoDictamen if dictamen.tipoDictamenId else 'No especificado'}\n"
        f"Contenido del dictamen:\n{dictamen.contenido or 'Sin contenido registrado'}\n\n"
        f"Firmante: {datos.firmante}\n\n"
        "Documento generado por el Sistema de Gestión de Propuestas de Investigación."
    )

    CARPETA_DOCUMENTOS.mkdir(parents=True, exist_ok=True)

    nombre = re.sub(r"[^A-Za-z0-9_.-]", "_", f"{numero}.pdf")
    ruta = CARPETA_DOCUMENTOS / nombre
    generar_oficio_pdf(
        ruta, numero, fecha.isoformat(), propuesta.codigoPropuesta,
        propuesta.titulo,
        dictamen.tipoDictamen.nombreTipoDictamen if dictamen.tipoDictamenId else "No especificado",
        dictamen.contenido or "Sin contenido registrado",
        datos.firmante,
    )

    try:
        registro = PropuestaDocumentos(
            propuestaId=propuesta.propuestaId,
            tipoDocumentoId=tipo_doc.tipoDocumentoId,
            rutaArchivo=str(ruta),
            nombreArchivo=nombre,
            tamanioBytes=ruta.stat().st_size,
            checksum=None,
            usuarioCargaId=usuario.usuarioId,
            activo=True,
            usuarioAuditoriaId=usuario.usuarioId,
        )
        db.add(registro)
        db.commit()
        db.refresh(registro)
    except Exception:
        db.rollback()
        if ruta.exists():
            ruta.unlink()
        raise

    return {
        "documentoId": registro.documentoId,
        "nombre": registro.nombreArchivo,
        "numeroOficio": numero,
        "fechaEmision": fecha.isoformat(),
        "firmante": datos.firmante,
        "contenido": contenido,
        "formato": "PDF",
        "firmaDigital": False,
    }

CANAL_INTERNO = "Interno_Sistema"


def registrar_notificacion(db: Session, codigo: str, datos, usuario):
    """Registra una única notificación interna dirigida al investigador coordinador."""
    propuesta = _buscar_propuesta(db, codigo)
    dictamen_cie = (
        _dictamenes_cie(db, propuesta.propuestaId)
        .order_by(Dictamenes.fechaEmision.desc(), Dictamenes.dictamenId.desc())
        .first()
    )
    if dictamen_cie is None:
        raise HTTPException(status_code=409, detail="No existe una resolución final del CIE para esta propuesta.")
    decision_cie = _decision_dictamen(dictamen_cie.contenido)
    tipo_esperado = {
        "Aprobar": "Aprobacion_Propuesta",
        "Rechazar": "Rechazo_Propuesta",
    }.get(decision_cie)
    if tipo_esperado is None or datos.tipo.strip().lower() != tipo_esperado.lower():
        raise HTTPException(
            status_code=409,
            detail="El tipo de notificación debe corresponder a la decisión final registrada por el CIE.",
        )

    oficio = (
        db.query(PropuestaDocumentos.documentoId)
        .join(TiposDocumento, TiposDocumento.tipoDocumentoId == PropuestaDocumentos.tipoDocumentoId)
        .filter(
            PropuestaDocumentos.propuestaId == propuesta.propuestaId,
            PropuestaDocumentos.activo.is_(True),
            TiposDocumento.nombreTipoDocumento == "Oficio_Direccion_Investigacion",
        )
        .first()
    )
    if oficio is None:
        raise HTTPException(status_code=409, detail="Primero debe generar el documento oficial de Dirección de Investigación.")

    investigador = db.query(Usuario).filter(
        Usuario.usuarioId == propuesta.investigadorCoordId
    ).first()
    if investigador is None:
        raise HTTPException(status_code=409, detail="La propuesta no tiene un investigador coordinador válido.")

    tipo = db.query(TiposNotificacion).filter(
        TiposNotificacion.nombreTipoNotificacion.ilike(datos.tipo.strip()),
        TiposNotificacion.activo.is_(True),
    ).first()
    if tipo is None:
        raise HTTPException(status_code=409, detail="No existe un tipo de notificación activo con ese nombre.")

    canal = db.query(CanalesComunicacion).filter(
        CanalesComunicacion.nombreCanal.ilike(CANAL_INTERNO),
        CanalesComunicacion.activo.is_(True),
    ).first()
    if canal is None:
        raise HTTPException(status_code=409, detail=f"No existe el canal de comunicación activo {CANAL_INTERNO}.")

    asunto = (datos.asunto or f"Actualización de la propuesta {codigo}").strip()[:200]

    existente = db.query(Notificaciones.notificacionId).filter(
        Notificaciones.usuarioDestinoId == investigador.usuarioId,
        Notificaciones.propuestaId == propuesta.propuestaId,
        Notificaciones.tipoNotificacionId == tipo.tipoNotificacionId,
        Notificaciones.asunto == asunto,
        Notificaciones.canalId == canal.canalId,
    ).first()
    if existente is not None:
        raise HTTPException(status_code=409, detail="Esta propuesta ya fue notificada al investigador.")

    registro = Notificaciones(
        usuarioDestinoId=investigador.usuarioId,
        propuestaId=propuesta.propuestaId,
        tipoNotificacionId=tipo.tipoNotificacionId,
        asunto=asunto,
        cuerpoMensaje=datos.mensaje,
        canalId=canal.canalId,
        usuarioAuditoriaId=usuario.usuarioId,
    )
    db.add(registro)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(registro)

    return {
        "mensaje": "Notificación registrada. El investigador la verá dentro del sistema.",
        "notificacionId": registro.notificacionId,
        "fechaEnvio": registro.fechaEnvio.isoformat() if registro.fechaEnvio else None,
    }


def obtener_configuracion(db: Session):
    filas = db.query(ConfiguracionesSistema).filter(
        ConfiguracionesSistema.claveConfiguracion.like(f"{PREFIJO_CONFIG}%"),
        ConfiguracionesSistema.activa.is_(True),
    ).all()
    resultado = {}
    for fila in filas:
        clave = fila.claveConfiguracion[len(PREFIJO_CONFIG):]
        try:
            resultado[clave] = json.loads(fila.valorConfiguracion)
        except (ValueError, TypeError):
            resultado[clave] = fila.valorConfiguracion
    return {"configuracion": resultado}


def guardar_configuracion(db: Session, configuracion: dict, usuario):
    try:
        for clave, valor in configuracion.items():
            clave_limpia = clave.strip()
            if not clave_limpia or len(clave_limpia) > 80:
                raise HTTPException(status_code=422, detail="Clave de configuración inválida.")

            clave_db = f"{PREFIJO_CONFIG}{clave_limpia}"
            fila = db.query(ConfiguracionesSistema).filter(
                ConfiguracionesSistema.claveConfiguracion == clave_db
            ).first()
            valor_json = json.dumps(valor, ensure_ascii=False)

            if fila:
                fila.valorConfiguracion = valor_json
                fila.categoria = "DireccionInvestigacion"
                fila.usuarioAuditoriaId = usuario.usuarioId
                fila.ultimaAuditoria = datetime.now(timezone.utc)
                fila.activa = True
            else:
                db.add(ConfiguracionesSistema(
                    claveConfiguracion=clave_db,
                    valorConfiguracion=valor_json,
                    categoria="DireccionInvestigacion",
                    descripcion=f"Configuración del módulo de Dirección: {clave_limpia}",
                    esPublica=False,
                    usuarioAuditoriaId=usuario.usuarioId,
                    activa=True,
                ))
        db.commit()
    except Exception:
        db.rollback()
        raise

    return obtener_configuracion(db)
