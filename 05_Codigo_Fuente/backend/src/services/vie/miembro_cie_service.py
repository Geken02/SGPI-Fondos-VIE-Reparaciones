from datetime import datetime, timezone
from decimal import Decimal

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
from src.models.subsanaciones import Subsanaciones
from src.models.catalogos import HistorialEstadosPropuesta
from src.models.propuesta_documentos import PropuestaDocumentos
from src.models.roles import RolesSistema, UsuarioRol
from src.models.notificaciones import Notificaciones, TiposNotificacion, CanalesComunicacion


def _tipo_evaluacion(db):
    return db.query(TiposEvaluacion).filter(TiposEvaluacion.nombreTipoEvaluacion == "CIE", TiposEvaluacion.activo.is_(True)).first()

def _nombre_usuario(usuario):
    if not usuario: return "—"
    return " ".join(x for x in (usuario.nombreUsuario, usuario.apellido1Usuario, usuario.apellido2Usuario) if x)

def _propuesta(db, codigo, exigir_en_cie=False):
    q = db.query(Propuesta).filter(Propuesta.codigoPropuesta == codigo)
    p = q.first()
    if p is None: raise HTTPException(status_code=404, detail="No se encontró la propuesta solicitada.")
    estado = db.get(EstadosPropuesta, p.estadoId)
    if exigir_en_cie and (estado is None or estado.codigoEstadoPropuesta != "EN_CIE"):
        raise HTTPException(status_code=409, detail="La propuesta ya no está pendiente de resolución del CIE.")
    return p, estado

def listar_expedientes_cie(db: Session, usuario_id: int) -> list[dict]:
    tipo_dictamen = db.query(TiposDictamen).filter(TiposDictamen.nombreTipoDictamen == "CIE").first()
    q = db.query(Propuesta, EtapasConvocatoria.fechaFin).join(EstadosPropuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId).outerjoin(EtapasConvocatoria, Propuesta.etapaId == EtapasConvocatoria.etapaId).filter(EstadosPropuesta.codigoEstadoPropuesta == "EN_CIE")
    propuestas = q.order_by(Propuesta.propuestaId).all()
    resultado=[]
    for p, fecha_fin in propuestas:
        dictamen = db.query(Dictamenes).filter(Dictamenes.propuestaId == p.propuestaId, Dictamenes.tipoDictamenId == (tipo_dictamen.tipoDictamenId if tipo_dictamen else -1)).first()
        if dictamen: continue
        evaluacion = db.query(Evaluaciones).join(TiposEvaluacion).filter(Evaluaciones.propuestaId == p.propuestaId, Evaluaciones.evaluadorId == usuario_id, TiposEvaluacion.nombreTipoEvaluacion == "CIE").order_by(Evaluaciones.evaluacionId.desc()).first()
        resultado.append({"propuestaId":p.propuestaId,"codigo":p.codigoPropuesta,"titulo":p.titulo,"investigador":_nombre_usuario(p.investigador),"escuela":p.escuela.nombreEscuela if p.escuela else "—","fechaLimite":fecha_fin.date().isoformat() if fecha_fin else None,"estado":"en_revision" if evaluacion else "por_evaluar"})
    return resultado

def obtener_rubrica_cie(db: Session) -> dict:
    tipo = _tipo_evaluacion(db)
    criterios = [] if tipo is None else db.query(CriteriosEvaluacion).filter(CriteriosEvaluacion.tipoEvaluacionId == tipo.tipoEvaluacionId, CriteriosEvaluacion.activo.is_(True)).order_by(CriteriosEvaluacion.orden, CriteriosEvaluacion.criterioId).all()
    total = sum((Decimal(str(c.pesoPorcentaje)) for c in criterios), Decimal("0"))
    configurada = bool(criterios) and total == Decimal("100.00")
    return {"configurada":configurada,"escala":{"minimo":0,"maximo":10},"criterios":[{"criterioId":c.criterioId,"nombre":c.nombreCriterio,"peso":float(c.pesoPorcentaje),"seccion":c.nombreSeccion,"obligatorio":bool(c.esRequisitoObligatorio)} for c in criterios],"pesoTotal":float(total)}

def obtener_expediente_cie(db: Session, codigo: str) -> dict | None:
    p, estado = _propuesta(db,codigo)
    etapa = db.get(EtapasConvocatoria,p.etapaId) if p.etapaId else None
    tipo_dictamen = db.query(TiposDictamen).filter(TiposDictamen.nombreTipoDictamen == "CIE").first()
    dictamenes = db.query(Dictamenes).filter(Dictamenes.propuestaId == p.propuestaId).order_by(Dictamenes.fechaEmision.desc()).all()
    resuelta = any(d.tipoDictamenId == tipo_dictamen.tipoDictamenId for d in dictamenes) if tipo_dictamen else False
    historial = db.query(HistorialEstadosPropuesta).filter(HistorialEstadosPropuesta.propuestaId == p.propuestaId).order_by(HistorialEstadosPropuesta.fechaCambio).all()
    subsanaciones = db.query(Subsanaciones).filter(Subsanaciones.propuestaId == p.propuestaId).order_by(Subsanaciones.fechaSolicitud.desc()).all()
    documentos = db.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == p.propuestaId, PropuestaDocumentos.activo.is_(True)).order_by(PropuestaDocumentos.fechaCarga.desc()).all()
    return {
      "propuestaId":p.propuestaId,"codigo":p.codigoPropuesta,"titulo":p.titulo,"estadoCodigo":estado.codigoEstadoPropuesta if estado else "","estadoNombre":estado.nombreEstadoPropuesta if estado else "—","estado":estado.codigoEstadoPropuesta if estado else "",
      "resuelta":resuelta,"investigador":_nombre_usuario(p.investigador),"escuela":p.escuela.nombreEscuela if p.escuela else "—","modalidad":p.modalidad.nombreModalidad if p.modalidad else None,"montoTotal":float(p.montoTotal or 0),"nivelTrlActual":p.nivelTrlActual,"nivelTrlEsperado":p.nivelTrlEsperado,"fechaInicio":p.fechaInicio.isoformat() if p.fechaInicio else None,"fechaFinalizacion":p.fechaFinalizacion.isoformat() if p.fechaFinalizacion else None,"fechaLimite":etapa.fechaFin.date().isoformat() if etapa and etapa.fechaFin else None,
      "documentos":[{"documentoId":d.documentoId,"nombreArchivo":d.nombreArchivo,"tipo":d.tipoDocumento.descripcion or d.tipoDocumento.nombreTipoDocumento if d.tipoDocumento else "Documento","fechaCarga":d.fechaCarga.isoformat() if d.fechaCarga else None} for d in documentos],
      "dictamenes":[{"dictamenId":d.dictamenId,"tipo":d.tipoDictamen.nombreTipoDictamen if d.tipoDictamen else "Dictamen","numeroOficio":d.numeroOficio,"fechaEmision":d.fechaEmision.isoformat() if d.fechaEmision else None,"contenido":d.contenido,"remitente":_nombre_usuario(d.usuarioRemitente)} for d in dictamenes],
      "subsanaciones":[{"subsanacionId":x.subsanacionId,"fechaSolicitud":x.fechaSolicitud.isoformat() if x.fechaSolicitud else None,"comentarioGestora":x.comentarioGestora,"respuestaInvestigador":x.respuestaInvestigador} for x in subsanaciones],
      "historial":[{"fecha":h.fechaCambio.isoformat() if h.fechaCambio else None,"estadoAnterior":h.estadoAnterior.nombreEstadoPropuesta if h.estadoAnterior else None,"estadoNuevo":h.estadoNuevo.nombreEstadoPropuesta if h.estadoNuevo else "—","responsable":_nombre_usuario(h.usuarioResponsable),"observaciones":h.observaciones} for h in historial]
    }

def obtener_evaluacion_cie(db: Session, codigo: str, usuario_id: int) -> dict:
    p, _ = _propuesta(db,codigo)
    tipo = _tipo_evaluacion(db)
    if not tipo: return {"existe":False,"puntajes":[],"observaciones":"","decision":"","estado":"Pendiente","calificacion":None}
    e = db.query(Evaluaciones).filter(Evaluaciones.propuestaId==p.propuestaId,Evaluaciones.evaluadorId==usuario_id,Evaluaciones.tipoEvaluacionId==tipo.tipoEvaluacionId).order_by(Evaluaciones.evaluacionId.desc()).first()
    if not e: return {"existe":False,"puntajes":[],"observaciones":"","decision":"","estado":"Pendiente","calificacion":None}
    detalles=db.query(DetalleEvaluacion).filter(DetalleEvaluacion.evaluacionId==e.evaluacionId).all()
    rec=e.tipoRecomendacion.nombreTipoRecomendacion if e.tipoRecomendacion else ""
    decision="Aprobar" if rec=="Recomendar_Financiamiento" else "Rechazar" if rec=="No_Recomendar_Financiamiento" else ""
    return {"existe":True,"evaluacionId":e.evaluacionId,"puntajes":[{"criterioId":d.criterioId,"puntaje":float(d.puntajeObtenido)} for d in detalles],"observaciones":e.observaciones or "","decision":decision,"estado":e.estadoEvaluacion.nombreEstadoEvaluacion if e.estadoEvaluacion else "Borrador","calificacion":float(e.calificacion) if e.calificacion is not None else None}

def guardar_evaluacion_cie(db: Session, codigo: str, usuario_id: int, datos) -> dict:
    p, _ = _propuesta(db,codigo,exigir_en_cie=True)
    tipo=_tipo_evaluacion(db)
    if not tipo: raise HTTPException(status_code=409,detail="No está configurado el tipo de evaluación CIE.")
    rubrica=obtener_rubrica_cie(db)
    if not rubrica["configurada"]: raise HTTPException(status_code=409,detail="La rúbrica CIE debe tener criterios activos con pesos que sumen 100 %.")
    criterios={c.criterioId:c for c in db.query(CriteriosEvaluacion).filter(CriteriosEvaluacion.tipoEvaluacionId==tipo.tipoEvaluacionId,CriteriosEvaluacion.activo.is_(True)).all()}
    ids=[x.criterioId for x in datos.puntajes]
    if len(ids)!=len(set(ids)) or set(ids)!=set(criterios): raise HTTPException(status_code=422,detail="Debe registrar un puntaje para cada criterio activo de la rúbrica, sin repetir criterios.")
    estado=db.query(EstadosEvaluacion).filter(EstadosEvaluacion.nombreEstadoEvaluacion=="Completada",EstadosEvaluacion.activo.is_(True)).first()
    if not estado: raise HTTPException(status_code=409,detail="No existe el estado Completada en el catálogo de evaluaciones.")
    recomendacion_nombre="Recomendar_Financiamiento" if datos.decision=="Aprobar" else "No_Recomendar_Financiamiento"
    recomendacion=db.query(TiposRecomendacion).filter(TiposRecomendacion.nombreTipoRecomendacion==recomendacion_nombre,TiposRecomendacion.activo.is_(True)).first()
    if not recomendacion: raise HTTPException(status_code=409,detail=f"No existe la recomendación {recomendacion_nombre} en el catálogo.")
    peso_total=sum((Decimal(str(c.pesoPorcentaje)) for c in criterios.values()),Decimal("0"))
    calificacion=sum((Decimal(str(x.puntaje))*Decimal(str(criterios[x.criterioId].pesoPorcentaje)) for x in datos.puntajes),Decimal("0"))/peso_total
    e=db.query(Evaluaciones).filter(Evaluaciones.propuestaId==p.propuestaId,Evaluaciones.evaluadorId==usuario_id,Evaluaciones.tipoEvaluacionId==tipo.tipoEvaluacionId).order_by(Evaluaciones.evaluacionId.desc()).first()
    try:
      if not e:
        borrador=db.query(EstadosEvaluacion).filter(EstadosEvaluacion.nombreEstadoEvaluacion=="Borrador").first()
        e=Evaluaciones(propuestaId=p.propuestaId,evaluadorId=usuario_id,tipoEvaluacionId=tipo.tipoEvaluacionId,estadoEvaluacionId=(borrador.estadoEvaluacionId if borrador else estado.estadoEvaluacionId),usuarioAuditoriaId=usuario_id); db.add(e); db.flush()
      e.calificacion=calificacion.quantize(Decimal("0.01")); e.observaciones=datos.observaciones; e.tipoRecomendacionId=recomendacion.tipoRecomendacionId; e.estadoEvaluacionId=estado.estadoEvaluacionId; e.usuarioAuditoriaId=usuario_id
      existentes={d.criterioId:d for d in db.query(DetalleEvaluacion).filter(DetalleEvaluacion.evaluacionId==e.evaluacionId).all()}
      for x in datos.puntajes:
        d=existentes.get(x.criterioId)
        if d is None: d=DetalleEvaluacion(evaluacionId=e.evaluacionId,criterioId=x.criterioId,usuarioAuditoriaId=usuario_id); db.add(d)
        d.puntajeObtenido=x.puntaje; d.justificacion=datos.observaciones; d.usuarioAuditoriaId=usuario_id
      db.commit(); db.refresh(e)
    except Exception:
      db.rollback(); raise
    return {"mensaje":"Evaluación CIE completada correctamente.","evaluacionId":e.evaluacionId,"calificacion":float(e.calificacion),"estado":"Completada"}

def registrar_resolucion_cie(db: Session, codigo: str, usuario_id: int, datos) -> dict:
    p, estado_actual = _propuesta(db,codigo,exigir_en_cie=True)
    tipo_eval=_tipo_evaluacion(db)
    tipo_dictamen=db.query(TiposDictamen).filter(TiposDictamen.nombreTipoDictamen=="CIE",TiposDictamen.activo.is_(True)).first()
    estado_final=db.query(EstadosPropuesta).filter(EstadosPropuesta.codigoEstadoPropuesta==("APROBADA" if datos.decision=="Aprobar" else "RECHAZADA"),EstadosPropuesta.activo.is_(True)).first()
    completada=db.query(EstadosEvaluacion).filter(EstadosEvaluacion.nombreEstadoEvaluacion=="Completada",EstadosEvaluacion.activo.is_(True)).first()
    if not all((tipo_eval,tipo_dictamen,estado_final,completada)): raise HTTPException(status_code=409,detail="Faltan catálogos requeridos para emitir la resolución del CIE.")
    evaluacion=db.query(Evaluaciones).filter(Evaluaciones.propuestaId==p.propuestaId,Evaluaciones.evaluadorId==usuario_id,Evaluaciones.tipoEvaluacionId==tipo_eval.tipoEvaluacionId,Evaluaciones.estadoEvaluacionId==completada.estadoEvaluacionId).first()
    if not evaluacion: raise HTTPException(status_code=409,detail="Completa primero la rúbrica CIE antes de emitir la resolución.")
    existente=db.query(Dictamenes).filter(Dictamenes.propuestaId==p.propuestaId,Dictamenes.tipoDictamenId==tipo_dictamen.tipoDictamenId).first()
    if existente: raise HTTPException(status_code=409,detail="La propuesta ya tiene una resolución CIE registrada.")
    contenido=f"RESOLUCIÓN DEL CONSEJO DE INVESTIGACIÓN Y EXTENSIÓN\nDecisión: {datos.decision}\nCalificación: {evaluacion.calificacion} / 10\nObservaciones de evaluación: {evaluacion.observaciones or 'Sin observaciones'}\nJustificación de la resolución: {datos.justificacion.strip()}"
    try:
      dictamen=Dictamenes(propuestaId=p.propuestaId,tipoDictamenId=tipo_dictamen.tipoDictamenId,contenido=contenido,usuarioRemitenteId=usuario_id,usuarioAuditoriaId=usuario_id); db.add(dictamen)
      p.estadoId=estado_final.estadoPropuestaId; p.usuarioAuditoriaId=usuario_id; p.ultimaAuditoria=datetime.now(timezone.utc)
      db.add(HistorialEstadosPropuesta(propuestaId=p.propuestaId,estadoAnteriorId=estado_actual.estadoPropuestaId,estadoNuevoId=estado_final.estadoPropuestaId,usuarioResponsableId=usuario_id,observaciones=datos.justificacion.strip()))
      nombre_tipo_notificacion = "Aprobacion_Propuesta" if datos.decision == "Aprobar" else "Rechazo_Propuesta"
      tipo_notificacion = db.query(TiposNotificacion).filter(TiposNotificacion.nombreTipoNotificacion == nombre_tipo_notificacion, TiposNotificacion.activo.is_(True)).first()
      canal_interno = db.query(CanalesComunicacion).filter(CanalesComunicacion.nombreCanal == "Interno_Sistema", CanalesComunicacion.activo.is_(True)).first()
      rol_direccion = db.query(RolesSistema).filter(RolesSistema.nombreRol == "DireccionInvestigacion", RolesSistema.activo.is_(True)).first()
      if tipo_notificacion and canal_interno and rol_direccion:
        destinatarios = db.query(Usuario).join(UsuarioRol, UsuarioRol.usuarioId == Usuario.usuarioId).filter(UsuarioRol.rolId == rol_direccion.rolId, UsuarioRol.activo.is_(True), Usuario.activo.is_(True)).all()
        for destinatario in destinatarios:
          db.add(Notificaciones(usuarioDestinoId=destinatario.usuarioId, propuestaId=p.propuestaId, tipoNotificacionId=tipo_notificacion.tipoNotificacionId, asunto=f"Resolución CIE recibida: {p.codigoPropuesta}", cuerpoMensaje=f"El CIE emitió la decisión {datos.decision} para la propuesta {p.codigoPropuesta}. Dirección de Investigación debe generar el oficio y notificar al investigador.", canalId=canal_interno.canalId, usuarioAuditoriaId=usuario_id))
      db.commit(); db.refresh(dictamen)
    except Exception:
      db.rollback(); raise
    return {"mensaje":"Resolución CIE registrada y remitida a Dirección de Investigación.","dictamenId":dictamen.dictamenId,"propuestaId":p.propuestaId,"codigo":p.codigoPropuesta,"decision":datos.decision,"estado":estado_final.codigoEstadoPropuesta,"fechaEmision":dictamen.fechaEmision.isoformat() if dictamen.fechaEmision else None}

def listar_resoluciones_cie(db: Session) -> list[dict]:
    tipo=db.query(TiposDictamen).filter(TiposDictamen.nombreTipoDictamen=="CIE",TiposDictamen.activo.is_(True)).first()
    if not tipo: return []
    filas=db.query(Dictamenes,Propuesta).join(Propuesta,Dictamenes.propuestaId==Propuesta.propuestaId).filter(Dictamenes.tipoDictamenId==tipo.tipoDictamenId).order_by(Dictamenes.fechaEmision.desc()).all()
    return [{"dictamenId":d.dictamenId,"propuestaId":p.propuestaId,"codigo":p.codigoPropuesta,"titulo":p.titulo,"numeroOficio":d.numeroOficio,"fechaEmision":d.fechaEmision.isoformat() if d.fechaEmision else None,"contenido":d.contenido,"decision":"Aprobar" if "Decisión: Aprobar" in (d.contenido or "") else "Rechazar"} for d,p in filas]
