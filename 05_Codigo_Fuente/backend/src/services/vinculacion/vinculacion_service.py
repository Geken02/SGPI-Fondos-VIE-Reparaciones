from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status

from src.models.dictamenes import Dictamenes, TiposDictamen
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.convocatorias import EstadosPropuesta
from src.models.escuelas import Escuela
from src.models.usuarios import Usuario
from src.models.notificaciones import Notificaciones
from src.models.catalogos import TiposInnovacion, LineasInvestigacion, Modalidades
from src.api.schemas.vinculacion.dictamenes import (
    PropuestaVinculacionResumen,
    PropuestaVinculacionDetalle,
    TipoDictamenResponse,
    DictamenCreate,
    DictamenResponse
)


def listar_propuestas_para_vinculacion(
    db: Session
) -> List[PropuestaVinculacionResumen]:
    """
    Lista las propuestas de investigación enviadas para su evaluación temprana
    en Propiedad Intelectual, potencial de innovación y nivel TRL.
    """
    # Propuestas en estado ENVIADA (2) o superior
    propuestas = db.query(Propuesta).filter(
        Propuesta.estadoId >= 2
    ).order_by(Propuesta.fechaEnvio.desc()).all()

    resultado = []
    for p in propuestas:
        investigador = db.query(Usuario).filter(Usuario.usuarioId == p.getInvestigadorCoordId()).first()
        escuela = db.query(Escuela).filter(Escuela.escuelaId == p.getEscuelaId()).first()
        estado = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == p.getEstadoId()).first()
        declaraciones = db.query(PropuestaDeclaraciones).filter(PropuestaDeclaraciones.propuestaId == p.getPropuestaId()).first()
        
        # Verificar si ya tiene dictamen de vinculación emitido
        dictamen_existente = db.query(Dictamenes).filter(
            Dictamenes.propuestaId == p.getPropuestaId()
        ).first()

        resultado.append(PropuestaVinculacionResumen(
            propuestaId=p.getPropuestaId(),
            codigoPropuesta=p.getCodigoPropuesta(),
            titulo=p.getTitulo(),
            investigadorCoordId=p.getInvestigadorCoordId(),
            investigadorCoordinador=f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
            nombreEscuela=escuela.nombreEscuela if escuela else "N/A",
            nivelTrlActual=p.getNivelTrlActual(),
            nivelTrlEsperado=p.getNivelTrlEsperado(),
            tienePotencialPI=declaraciones.getTienePotencialPI() if declaraciones else False,
            poseeInnovacion=declaraciones.getPoseeInnovacion() if declaraciones else False,
            nombreEstado=estado.nombreEstadoPropuesta if estado else "Desconocido",
            tieneDictamenVinculacion=dictamen_existente is not None
        ))
    return resultado


def obtener_propuesta_visor_vinculacion(
    db: Session,
    propuesta_id: int
) -> PropuestaVinculacionDetalle:
    """
    Retorna el expediente técnico resumido de la propuesta para que el evaluador
    de Vinculación analice TRL, PI y componentes de innovación.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propuesta no encontrada en el sistema"
        )

    investigador = db.query(Usuario).filter(Usuario.usuarioId == propuesta.getInvestigadorCoordId()).first()
    escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.getEscuelaId()).first()
    linea = db.query(LineasInvestigacion).filter(LineasInvestigacion.lineaId == propuesta.getLineaInvestigacionId()).first()
    modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.getModalidadId()).first()
    
    contenido = db.query(PropuestaContenido).filter(PropuestaContenido.propuestaId == propuesta_id).first()
    declaraciones = db.query(PropuestaDeclaraciones).filter(PropuestaDeclaraciones.propuestaId == propuesta_id).first()

    tipo_innovacion_nombre = None
    if declaraciones and declaraciones.getTipoInnovacionId():
        tipo_inn = db.query(TiposInnovacion).filter(
            TiposInnovacion.tipoInnovacionId == declaraciones.getTipoInnovacionId()
        ).first()
        if tipo_inn:
            tipo_innovacion_nombre = tipo_inn.nombreTipoInnovacion

    return PropuestaVinculacionDetalle(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        investigadorCoordinador=f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
        correoInvestigador=investigador.correoInstitucional if investigador else "N/A",
        nombreEscuela=escuela.nombreEscuela if escuela else "N/A",
        lineaInvestigacion=linea.nombreLinea if linea else None,
        modalidad=modalidad.nombreModalidad if modalidad else None,
        resumen=contenido.getResumen() if contenido else None,
        metodologia=contenido.getMetodologia() if contenido else None,
        hojaRuta=contenido.getHojaRuta() if contenido else None,
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        tienePotencialPI=declaraciones.getTienePotencialPI() if declaraciones else False,
        poseeInnovacion=declaraciones.getPoseeInnovacion() if declaraciones else False,
        tipoInnovacion=tipo_innovacion_nombre,
        tieneInformacionConfidencial=declaraciones.getTieneInformacionConfidencial() if declaraciones else False,
        requiereInstrumentoJuridico=declaraciones.getRequiereInstrumentoJuridico() if declaraciones else False
    )


def listar_tipos_dictamen(db: Session) -> List[TipoDictamenResponse]:
    """
    Retorna los tipos de dictamen configurados en el sistema.
    """
    tipos = db.query(TiposDictamen).filter(TiposDictamen.activo == True).all()
    return [
        TipoDictamenResponse(
            tipoDictamenId=t.getTipoDictamenId(),
            nombreTipoDictamen=t.getNombreTipoDictamen(),
            descripcion=t.getDescripcion(),
            activo=t.getActivo()
        ) for t in tipos
    ]


def crear_dictamen_vinculacion(
    db: Session,
    usuario_id: int,
    datos: DictamenCreate
) -> DictamenResponse:
    """
    Registra el dictamen técnico emitido por el evaluador de vinculación.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == datos.propuestaId).first()
    if not propuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La propuesta especificada no existe"
        )

    # Validar que el evaluador no sea el investigador coordinador de la propuesta
    if propuesta.getInvestigadorCoordId() == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puede evaluar una propuesta de la cual usted es el investigador coordinador"
        )

    # Crear el registro del dictamen usando los setters de la clase
    dictamen = Dictamenes()
    dictamen.setPropuestaId(datos.propuestaId)
    dictamen.setNumeroOficio(datos.numeroOficio)
    dictamen.setContenido(datos.contenido)
    dictamen.setRutaArchivo(datos.rutaArchivo)
    dictamen.setUsuarioRemitenteId(usuario_id)
    dictamen.setUsuarioAuditoriaId(usuario_id)

    db.add(dictamen)

    # Actualizar estado de la propuesta a EN_VINCULACION (ID 3) si está en ENVIADA (ID 2)
    if propuesta.getEstadoId() == 2:
        propuesta.setEstadoId(3)
        propuesta.setUsuarioAuditoriaId(usuario_id)
        propuesta.setUltimaAuditoria(datetime.now(timezone.utc))

    # Notificación para el investigador de la propuesta
    if propuesta.getInvestigadorCoordId():
        notif = Notificaciones(
            usuarioDestinoId=propuesta.getInvestigadorCoordId(),
            propuestaId=propuesta.getPropuestaId(),
            tipoNotificacionId=4,
            asunto=f"Dictamen emitido: {dictamen.getNumeroOficio()}",
            cuerpoMensaje=f"Se ha emitido el dictamen técnico de Vinculación para tu propuesta '{propuesta.getTitulo()}'.",
            canalId=1,
            leida=False,
            creadoEn=datetime.now(timezone.utc),
            fechaEnvio=datetime.now(timezone.utc)
        )
        db.add(notif)

    db.commit()
    db.refresh(dictamen)

    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuario_id).first()
    nombre_remitente = f"{usuario.nombreUsuario} {usuario.apellido1Usuario}" if usuario else None

    return DictamenResponse(
        dictamenId=dictamen.getDictamenId(),
        propuestaId=dictamen.getPropuestaId(),
        numeroOficio=dictamen.getNumeroOficio(),
        fechaEmision=dictamen.getFechaEmision(),
        contenido=dictamen.getContenido(),
        rutaArchivo=dictamen.getRutaArchivo(),
        usuarioRemitenteId=dictamen.getUsuarioRemitenteId(),
        nombreRemitente=nombre_remitente
    )


def obtener_dictamen_por_propuesta(
    db: Session,
    propuesta_id: int
) -> Optional[DictamenResponse]:
    """
    Obtiene el dictamen de vinculación emitido para una propuesta específica.
    """
    dictamen = db.query(Dictamenes).filter(
        Dictamenes.propuestaId == propuesta_id
    ).order_by(Dictamenes.fechaEmision.desc()).first()

    if not dictamen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La propuesta no cuenta con un dictamen registrado aún"
        )

    usuario = db.query(Usuario).filter(Usuario.usuarioId == dictamen.getUsuarioRemitenteId()).first()
    nombre_remitente = f"{usuario.nombreUsuario} {usuario.apellido1Usuario}" if usuario else None

    return DictamenResponse(
        dictamenId=dictamen.getDictamenId(),
        propuestaId=dictamen.getPropuestaId(),
        numeroOficio=dictamen.getNumeroOficio(),
        fechaEmision=dictamen.getFechaEmision(),
        contenido=dictamen.getContenido(),
        rutaArchivo=dictamen.getRutaArchivo(),
        usuarioRemitenteId=dictamen.getUsuarioRemitenteId(),
        nombreRemitente=nombre_remitente
    )


def listar_dictamenes_vinculacion(
    db: Session
) -> List[DictamenResponse]:
    """
    Retorna la lista de todos los dictámenes técnicos emitidos por Vinculación.
    """
    dictamenes = db.query(Dictamenes).order_by(Dictamenes.fechaEmision.desc()).all()
    resultado = []
    for d in dictamenes:
        usuario = db.query(Usuario).filter(Usuario.usuarioId == d.getUsuarioRemitenteId()).first()
        nombre_remitente = f"{usuario.nombreUsuario} {usuario.apellido1Usuario}" if usuario else None
        resultado.append(DictamenResponse(
            dictamenId=d.getDictamenId(),
            propuestaId=d.getPropuestaId(),
            numeroOficio=d.getNumeroOficio(),
            fechaEmision=d.getFechaEmision(),
            contenido=d.getContenido(),
            rutaArchivo=d.getRutaArchivo(),
            usuarioRemitenteId=d.getUsuarioRemitenteId(),
            nombreRemitente=nombre_remitente
        ))
    return resultado

