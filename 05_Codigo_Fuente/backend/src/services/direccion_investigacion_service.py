import json
import re
import mimetypes
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models.dictamenes import Dictamenes
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.catalogos import ConfiguracionesSistema
from src.models.notificaciones import (
    Notificaciones, TiposNotificacion, CanalesComunicacion
)


PREFIJO_CONFIG = "direccion_investigacion."
CARPETA_DOCUMENTOS = Path("storage") / "documentos_direccion"


def _buscar_propuesta(db: Session, codigo: str):
    from src.models.propuestas import Propuesta

    propuesta = db.query(Propuesta).filter(
        Propuesta.codigoPropuesta == codigo
    ).first()

    if propuesta is None:
        raise HTTPException(status_code=404, detail="No se encontró la propuesta.")
    return propuesta


def listar_dictamenes(db: Session):
    filas = (
        db.query(Dictamenes)
        .join(Dictamenes.propuesta)
        .order_by(Dictamenes.fechaEmision.desc())
        .all()
    )
    resultado = []
    for d in filas:
        p = d.propuesta
        resultado.append({
            "dictamenId": d.dictamenId,
            "codigo": p.codigoPropuesta,
            "titulo": p.titulo,
            "numeroOficio": d.numeroOficio,
            "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
            "contenido": d.contenido,
            "tipo": d.tipoDictamen.nombreTipoDictamen if d.tipoDictamenId else None,
            "estado": "por_revisar",
        })
    return resultado


def obtener_dictamen(db: Session, codigo: str):
    propuesta = _buscar_propuesta(db, codigo)
    dictamenes = (
        db.query(Dictamenes)
        .filter(Dictamenes.propuestaId == propuesta.propuestaId)
        .order_by(Dictamenes.fechaEmision.desc())
        .all()
    )
    if not dictamenes:
        raise HTTPException(status_code=404, detail="La propuesta no tiene dictámenes.")

    d = dictamenes[0]
    return {
        "codigo": propuesta.codigoPropuesta,
        "titulo": propuesta.titulo,
        "propuestaId": propuesta.propuestaId,
        "estado": "por_revisar",
        "dictamen": {
            "dictamenId": d.dictamenId,
            "numeroOficio": d.numeroOficio,
            "fechaEmision": d.fechaEmision.isoformat() if d.fechaEmision else None,
            "contenido": d.contenido,
            "tipo": d.tipoDictamen.nombreTipoDictamen if d.tipoDictamenId else None,
        },
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
        db.query(Dictamenes)
        .filter(Dictamenes.propuestaId == propuesta.propuestaId)
        .order_by(Dictamenes.fechaEmision.desc())
        .first()
    )

    if dictamen is None:
        raise HTTPException(
            status_code=409,
            detail="No se puede generar un oficio porque la propuesta todavía no tiene un dictamen registrado.",
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

def registrar_notificacion(db: Session, codigo: str, datos, usuario):
    """Registra aviso interno y, si se solicita, ejecuta envío SMTP real con resultado auditable."""
    from pathlib import Path
    from datetime import datetime, timezone
    from src.models.usuarios import Usuario
    from src.models.catalogos import AsignacionesGestora

    propuesta = _buscar_propuesta(db, codigo)
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

    canales = []
    for canal_nombre in datos.canales:
        canal = db.query(CanalesComunicacion).filter(
            CanalesComunicacion.nombreCanal.ilike(canal_nombre.strip()),
            CanalesComunicacion.activo.is_(True),
        ).first()
        if canal is None:
            raise HTTPException(status_code=409, detail=f"No existe un canal de comunicación activo: {canal_nombre}.")
        if canal.canalId not in {c.canalId for c in canales}:
            canales.append(canal)

    documentos = []
    if datos.documentoIds:
        documentos = db.query(PropuestaDocumentos).filter(
            PropuestaDocumentos.propuestaId == propuesta.propuestaId,
            PropuestaDocumentos.documentoId.in_(datos.documentoIds),
            PropuestaDocumentos.activo.is_(True),
        ).all()
        if len(documentos) != len(set(datos.documentoIds)):
            raise HTTPException(status_code=409, detail="Uno o más adjuntos no pertenecen a esta propuesta o ya no están activos.")

    adjuntos = []
    raiz_storage = (Path.cwd() / "storage").resolve()
    for documento in documentos:
        ruta = Path(documento.rutaArchivo)
        if not ruta.is_absolute():
            ruta = Path.cwd() / ruta
        ruta = ruta.resolve()
        try:
            ruta.relative_to(raiz_storage)
        except ValueError as error:
            raise HTTPException(status_code=403, detail="La ruta de un adjunto no pertenece al almacenamiento autorizado.") from error
        if ruta.suffix.lower() != ".pdf" or not ruta.is_file():
            raise HTTPException(status_code=409, detail=f"El adjunto {documento.nombreArchivo} no es un PDF disponible.")
        adjuntos.append((documento.nombreArchivo, ruta))

    destinatarios_copia = []
    if datos.copiaGestora:
        asignaciones = db.query(AsignacionesGestora).filter(
            AsignacionesGestora.escuelaId == propuesta.escuelaId,
            AsignacionesGestora.activo.is_(True),
        ).all()
        ids_gestoras = {a.gestoraVIEId for a in asignaciones}
        if ids_gestoras:
            destinatarios_copia = db.query(Usuario).filter(
                Usuario.usuarioId.in_(ids_gestoras),
                Usuario.activo.is_(True),
                Usuario.correoInstitucional.isnot(None),
            ).all()

    correos_copia = [g.correoInstitucional for g in destinatarios_copia if g.correoInstitucional]
    receptores_internos = [investigador] + [
        g for g in destinatarios_copia if g.usuarioId != investigador.usuarioId
    ]
    asunto_notificacion = (datos.asunto or f"Actualización de la propuesta {codigo}").strip()

    canales_resultado = []
    registros_creados = []

    for canal in canales:
        nombre_canal = canal.nombreCanal.strip().lower()
        if nombre_canal in {"correo_electronico", "correo electrónico", "email"} and datos.idempotencyKey:
            previo = db.query(EnviosCorreo).filter(
                EnviosCorreo.claveIdempotencia == datos.idempotencyKey
            ).first()
            if previo is not None:
                canales_resultado.append({
                    "canal": canal.nombreCanal,
                    "estado": previo.estado,
                    "envioCorreoId": previo.envioCorreoId,
                    "mensaje": previo.respuestaProveedor or previo.detalleError or "Solicitud ya procesada.",
                    "reutilizado": True,
                })
                continue
        registro = Notificaciones(
            usuarioDestinoId=investigador.usuarioId,
            propuestaId=propuesta.propuestaId,
            tipoNotificacionId=tipo.tipoNotificacionId,
            asunto=asunto_notificacion,
            cuerpoMensaje=datos.mensaje,
            claveIdempotencia=(
                f"{datos.idempotencyKey}:internal:{investigador.usuarioId}"
                if datos.idempotencyKey and nombre_canal in {"interno_sistema", "interno sistema"}
                else None
            ),
            canalId=canal.canalId,
            usuarioAuditoriaId=usuario.usuarioId,
        )
        if nombre_canal in {"interno_sistema", "interno sistema"} and datos.idempotencyKey:
            previo_interno = db.query(Notificaciones).filter(
                Notificaciones.claveIdempotencia == f"{datos.idempotencyKey}:internal:{investigador.usuarioId}"
            ).first()
            if previo_interno is not None:
                canales_resultado.append({
                    "canal": canal.nombreCanal, "estado": "REGISTRADO",
                    "notificacionId": previo_interno.notificacionId,
                    "mensaje": "Solicitud ya registrada; no se duplicó la notificación interna.",
                    "reutilizado": True,
                })
                continue
        db.add(registro)
        db.flush()

        if nombre_canal in {"interno_sistema", "interno sistema"}:
            for receptor in receptores_internos[1:]:
                db.add(Notificaciones(
                    usuarioDestinoId=receptor.usuarioId,
                    propuestaId=propuesta.propuestaId,
                    tipoNotificacionId=tipo.tipoNotificacionId,
                    asunto=asunto_notificacion,
                    cuerpoMensaje=datos.mensaje,
                    claveIdempotencia=(
                        f"{datos.idempotencyKey}:internal:{receptor.usuarioId}"
                        if datos.idempotencyKey else None
                    ),
                    canalId=canal.canalId,
                    usuarioAuditoriaId=usuario.usuarioId,
                ))
            canales_resultado.append({
                "canal": canal.nombreCanal,
                "estado": "REGISTRADO",
                "notificacionId": registro.notificacionId,
                "mensaje": f"Notificación interna registrada para {len(receptores_internos)} destinatario(s).",
            })
            registros_creados.append(registro)
            continue

        if nombre_canal in {"correo_electronico", "correo electrónico", "email"}:
            if not adjuntos:
                raise HTTPException(
                    status_code=409,
                    detail="El correo institucional requiere al menos un oficio PDF generado para adjuntarlo.",
                )
            if not investigador.correoInstitucional:
                envio = EnviosCorreo(
                    notificacionId=registro.notificacionId,
                    destinatario="",
                    asunto=registro.asunto,
                    estado="FALLIDO",
                    intentos=0,
                    detalleError="El investigador no tiene correo institucional registrado.",
                    usuarioSolicitanteId=usuario.usuarioId,
                    claveIdempotencia=datos.idempotencyKey,
                )
                db.add(envio)
                db.commit()
                canales_resultado.append({
                    "canal": canal.nombreCanal, "estado": "FALLIDO",
                    "envioCorreoId": envio.envioCorreoId,
                    "mensaje": envio.detalleError,
                })
                registros_creados.append(registro)
                continue

            envio = EnviosCorreo(
                notificacionId=registro.notificacionId,
                destinatario=investigador.correoInstitucional,
                asunto=registro.asunto,
                estado="EN_PROCESO",
                intentos=1,
                usuarioSolicitanteId=usuario.usuarioId,
                claveIdempotencia=datos.idempotencyKey,
                documentoIds=json.dumps([d.documentoId for d in documentos]),
                copias=json.dumps(correos_copia),
            )
            db.add(envio)
            db.commit()
            db.refresh(envio)
            try:
                respuesta = enviar_correo(
                    investigador.correoInstitucional,
                    registro.asunto,
                    datos.mensaje,
                    adjuntos,
                    cc=correos_copia,
                )
                envio.estado = "ACEPTADO"
                envio.respuestaProveedor = respuesta
                envio.detalleError = None
                canales_resultado.append({
                    "canal": canal.nombreCanal, "estado": "ACEPTADO",
                    "envioCorreoId": envio.envioCorreoId, "mensaje": respuesta,
                })
            except HTTPException as error:
                envio.estado = "FALLIDO"
                envio.detalleError = str(error.detail)
                canales_resultado.append({
                    "canal": canal.nombreCanal, "estado": "FALLIDO",
                    "envioCorreoId": envio.envioCorreoId, "mensaje": str(error.detail),
                })
            finally:
                envio.fechaActualizacion = datetime.now(timezone.utc)
                db.commit()
            registros_creados.append(registro)
            continue

        raise HTTPException(status_code=409, detail=f"Canal no soportado por el servicio de notificaciones: {canal.nombreCanal}.")

    db.commit()
    return {
        "mensaje": "Proceso de notificación completado; revisa el resultado individual de cada canal.",
        "destinatario": investigador.correoInstitucional,
        "copias": correos_copia,
        "canales": canales_resultado,
        "notificaciones": [
            {
                "notificacionId": n.notificacionId,
                "canal": n.canal.nombreCanal if n.canal else None,
                "fechaEnvio": n.fechaEnvio.isoformat() if n.fechaEnvio else None,
            }
            for n in registros_creados
        ],
        "documentoIds": datos.documentoIds,
    }


def reintentar_envio_correo(db: Session, envio_id: int, usuario):
    """Reintenta un envío fallido reutilizando su registro y adjuntos originales."""
    from datetime import datetime, timezone
    from pathlib import Path
    from fastapi import HTTPException
    from src.models.envios_correo import EnviosCorreo

    envio = db.query(EnviosCorreo).filter(
        EnviosCorreo.envioCorreoId == envio_id
    ).first()
    if envio is None:
        raise HTTPException(status_code=404, detail="No existe el registro de envío.")
    if envio.estado == "ACEPTADO":
        raise HTTPException(status_code=409, detail="El correo ya fue aceptado por el servidor SMTP; no se reintentará para evitar duplicados.")
    if envio.estado == "EN_PROCESO":
        raise HTTPException(status_code=409, detail="El envío ya se encuentra en proceso.")
    if not envio.destinatario:
        raise HTTPException(status_code=409, detail="No se puede reintentar: el destinatario no tiene correo institucional registrado.")

    notificacion = db.query(Notificaciones).filter(
        Notificaciones.notificacionId == envio.notificacionId
    ).first()
    if notificacion is None or notificacion.propuestaId:
        raise HTTPException(status_code=409, detail="No se encontró la notificación original.")
    try:
        ids_documentos = json.loads(envio.documentoIds or "[]")
        copias = json.loads(envio.copias or "[]")
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=409, detail="Los metadatos de adjuntos del envío están dañados.") from error

    documentos = db.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == notificacion.propuestaId,
        PropuestaDocumentos.documentoId.in_(ids_documentos or [-1]),
        PropuestaDocumentos.activo.is_(True),
    ).all()
    if len(documentos) != len(set(ids_documentos)):
        raise HTTPException(status_code=409, detail="Ya no están disponibles todos los adjuntos originales.")
    raiz_storage = (Path.cwd() / "storage").resolve()
    adjuntos = []
    for documento in documentos:
        ruta = Path(documento.rutaArchivo)
        if not ruta.is_absolute():
            ruta = Path.cwd() / ruta
        ruta = ruta.resolve()
        try:
            ruta.relative_to(raiz_storage)
        except ValueError as error:
            raise HTTPException(status_code=403, detail="La ruta de un adjunto no pertenece al almacenamiento autorizado.") from error
        if ruta.suffix.lower() != ".pdf" or not ruta.is_file():
            raise HTTPException(status_code=409, detail=f"El adjunto {documento.nombreArchivo} no es un PDF disponible.")
        adjuntos.append((documento.nombreArchivo, ruta))

    envio.estado = "EN_PROCESO"
    envio.intentos += 1
    envio.detalleError = None
    envio.usuarioSolicitanteId = usuario.usuarioId
    envio.fechaActualizacion = datetime.now(timezone.utc)
    db.commit()
    try:
        respuesta = enviar_correo(
            envio.destinatario, envio.asunto, notificacion.cuerpoMensaje,
            adjuntos, cc=copias,
        )
        envio.estado = "ACEPTADO"
        envio.respuestaProveedor = respuesta
    except HTTPException as error:
        envio.estado = "FALLIDO"
        envio.detalleError = str(error.detail)
    envio.fechaActualizacion = datetime.now(timezone.utc)
    db.commit()
    return {
        "envioCorreoId": envio.envioCorreoId,
        "estado": envio.estado,
        "intentos": envio.intentos,
        "mensaje": envio.respuestaProveedor if envio.estado == "ACEPTADO" else envio.detalleError,
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
