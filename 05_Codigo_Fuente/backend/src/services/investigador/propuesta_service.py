from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from fastapi import HTTPException, status

from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta, RolesEquipo, ColaboradoresExternos
from datetime import date
from src.models.presupuesto import PresupuestoPropuesta
from src.models.propuesta_plan import Actividades
from src.models.propuesta_documentos import PropuestaDocumentos
from src.models.productos_academicos import ProductosAcademicos
from src.models.convocatorias import EstadosPropuesta, Convocatorias, EtapasConvocatoria
from src.models.escuelas import Escuela
from src.models.usuarios import Usuario
from src.models.notificaciones import Notificaciones
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion
from src.utils.helpers import generar_codigo_propuesta
from src.api.schemas.investigador.propuestas import (
    PropuestaCreate,
    PropuestaUpdate,
    ContenidoForm04Update,
    ContenidoForm04Response,
    DeclaracionesForm04Update,
    DeclaracionesForm04Response,
    IntegranteEquipoCreate,
    ColaboradorExternoCreate,
    ColaboradorExternoResponse,
    EquipoCompletoUpdate,
    ProductoAcademicoCreate,
    RubroPresupuestoCreate,
    SubsanacionResponse,
    SubsanacionRespuestaRequest,
    SubsanacionCrearRequest,
    PropuestaResumenResponse,
    PropuestaDetalleResponse,
    IntegranteEquipoResponse,
    ProductoAcademicoResponse,
    RubroPresupuestoResponse
)


def obtener_propuesta_con_acceso(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    requiere_coordinador: bool = False
) -> Propuesta:
    """
    Verifica que la propuesta exista y que el usuario tenga permisos adecuados.
    - Si requiere_coordinador es True, solo el investigador coordinador / creador tiene acceso (ej. para el envío formal).
    - Si requiere_coordinador es False, tanto el coordinador como los integrantes del equipo tienen acceso de lectura y edición.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propuesta no encontrada"
        )

    es_coord = (propuesta.getInvestigadorCoordId() == usuario_id)
    if requiere_coordinador:
        if not es_coord:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo la persona coordinadora (propietaria de la propuesta) puede realizar el envío definitivo a la Unidad de Vinculación."
            )
        return propuesta

    if es_coord:
        return propuesta

    es_integrante = db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
        IntegrantesEquipoPropuesta.usuarioId == usuario_id
    ).first() is not None

    if not es_integrante:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder o modificar esta propuesta."
        )

    return propuesta


def crear_propuesta(
    db: Session,
    usuario: Usuario,
    datos: PropuestaCreate
) -> Propuesta:
    """
    Crea una nueva propuesta en estado BORRADOR y genera su código oficial preliminar.
    """
    codigo = generar_codigo_propuesta(db)

    # Validar que convocatoria y escuela existan en la BD
    conv_id = datos.convocatoriaId
    convocatoria = db.query(Convocatorias).filter(Convocatorias.convocatoriaId == conv_id).first()
    if not convocatoria:
        primera_conv = db.query(Convocatorias).filter(Convocatorias.activo == True).first()
        convocatoria = primera_conv
        conv_id = primera_conv.convocatoriaId if primera_conv else 1

    hoy = date.today()
    if convocatoria and (not convocatoria.activo or (convocatoria.fechaCierre and convocatoria.fechaCierre < hoy)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La convocatoria '{convocatoria.nombreConvocatoria}' se encuentra cerrada (Fecha de cierre: {convocatoria.fechaCierre}). No se pueden formular nuevas propuestas para esta convocatoria."
        )

    esc_id = datos.escuelaId or usuario.escuelaId() or 1
    if not db.query(Escuela).filter(Escuela.escuelaId == esc_id).first():
        primera_esc = db.query(Escuela).filter(Escuela.activo == True).first()
        esc_id = primera_esc.escuelaId if primera_esc else 1

    nueva_propuesta = Propuesta()
    nueva_propuesta.setCodigoPropuesta(codigo)
    nueva_propuesta.setTitulo(datos.titulo)
    nueva_propuesta.setConvocatoriaId(conv_id)
    nueva_propuesta.setInvestigadorCoordId(usuario.usuarioId)
    nueva_propuesta.setEscuelaId(esc_id)
    nueva_propuesta.setLineaInvestigacionId(datos.lineaInvestigacionId)
    nueva_propuesta.setModalidadId(datos.modalidadId)
    nueva_propuesta.setEstadoId(1)  # 1 = Borrador
    nueva_propuesta.setEtapaId(1)   # 1 = Formulación
    nueva_propuesta.setMontoTotal(Decimal("0.00"))
    nueva_propuesta.setNivelTrlActual(datos.nivelTrlActual or 1)
    nueva_propuesta.setNivelTrlEsperado(datos.nivelTrlEsperado or 3)
    nueva_propuesta.setFechaInicio(datos.fechaInicio)
    nueva_propuesta.setFechaFinalizacion(datos.fechaFinalizacion)
    nueva_propuesta.setFechaCreacion(datetime.now(timezone.utc))
    nueva_propuesta.setUsuarioAuditoriaId(usuario.usuarioId)
    nueva_propuesta.setCreadoEn(datetime.now(timezone.utc))

    db.add(nueva_propuesta)
    db.flush()

    # Inicializar registros dependientes
    contenido = PropuestaContenido()
    contenido.setPropuestaId(nueva_propuesta.getPropuestaId())
    contenido.setResumen(f"Borrador preliminar de la propuesta: {datos.titulo}")
    contenido.setUsuarioAuditoriaId(usuario.usuarioId)
    db.add(contenido)

    declaraciones = PropuestaDeclaraciones()
    declaraciones.setPropuestaId(nueva_propuesta.getPropuestaId())
    declaraciones.setTieneFinanciamientoPrevio(False)
    declaraciones.setTienePotencialPI(False)
    declaraciones.setPoseeInnovacion(False)
    declaraciones.setAceptaDeclaracionJurada(False)
    declaraciones.setAceptaResguardoRepositorio(False)
    declaraciones.setUsuarioAuditoriaId(usuario.usuarioId)
    db.add(declaraciones)

    # Agregar al usuario como coordinador en el equipo
    coord = IntegrantesEquipoPropuesta()
    coord.setPropuestaId(nueva_propuesta.getPropuestaId())
    coord.setUsuarioId(usuario.usuarioId)
    coord.setTipoHoraId(1)
    coord.setRolEquipoId(1)  # 1 = Coordinador
    coord.setHorasSemanales(Decimal("20.00"))
    coord.setUsuarioAuditoriaId(usuario.usuarioId)
    db.add(coord)

    # Notificación de creación
    notif = Notificaciones(
        usuarioDestinoId=usuario.usuarioId,
        propuestaId=nueva_propuesta.getPropuestaId(),
        tipoNotificacionId=4,
        asunto=f"Propuesta registrada: {codigo}",
        cuerpoMensaje=f"Se ha creado el borrador preliminar de la propuesta '{datos.titulo}' con código {codigo}.",
        canalId=1,
        leida=False,
        creadoEn=datetime.now(timezone.utc),
        fechaEnvio=datetime.now(timezone.utc)
    )
    db.add(notif)

    db.commit()
    db.refresh(nueva_propuesta)
    return nueva_propuesta


def listar_propuestas_investigador(
    db: Session,
    usuario_id: int
) -> List[PropuestaResumenResponse]:
    """
    Retorna la lista resumida de todas las propuestas creadas por el investigador actual
    o en las que participa como integrante del equipo de investigación.
    """
    subquery_integrantes = db.query(IntegrantesEquipoPropuesta.propuestaId).filter(
        IntegrantesEquipoPropuesta.usuarioId == usuario_id
    ).subquery()

    propuestas = db.query(Propuesta).filter(
        or_(
            Propuesta.investigadorCoordId == usuario_id,
            Propuesta.propuestaId.in_(subquery_integrantes)
        )
    ).order_by(Propuesta.fechaCreacion.desc()).all()

    resultado = []
    for p in propuestas:
        estado = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == p.getEstadoId()).first()
        escuela = db.query(Escuela).filter(Escuela.escuelaId == p.getEscuelaId()).first()
        
        # Validar individualmente si cada formulario está completado
        f01 = bool(p.getFechaEnvio() is not None) or \
              db.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == p.getPropuestaId(), PropuestaDocumentos.tipoDocumentoId == 1).count() > 0
        f02 = db.query(Actividades).filter(Actividades.propuestaId == p.getPropuestaId()).count() > 0 or \
              db.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == p.getPropuestaId(), PropuestaDocumentos.tipoDocumentoId == 2).count() > 0
        f03 = db.query(PresupuestoPropuesta).filter(PresupuestoPropuesta.propuestaId == p.getPropuestaId()).count() > 0 or \
              db.query(PropuestaDocumentos).filter(PropuestaDocumentos.propuestaId == p.getPropuestaId(), PropuestaDocumentos.tipoDocumentoId == 3).count() > 0

        # Subsanación activa más reciente
        sub_orm = db.query(Subsanaciones).filter(
            Subsanaciones.propuestaId == p.getPropuestaId()
        ).order_by(Subsanaciones.fechaSolicitud.desc()).first()

        sub_resp = None
        if sub_orm:
            est_sub = db.query(EstadosSubsanacion).filter(
                EstadosSubsanacion.estadoSubsanacionId == sub_orm.getEstadoSubsanacionId()
            ).first()
            revisor = db.query(Usuario).filter(Usuario.usuarioId == sub_orm.getGestoraVIEId()).first()
            rev_nombre = f"{revisor.nombreUsuario} {revisor.apellido1Usuario}".strip() if revisor else "Gestoría VIE"
            sub_resp = SubsanacionResponse(
                subsanacionId=sub_orm.getSubsanacionId(),
                propuestaId=sub_orm.getPropuestaId(),
                gestoraVIEId=sub_orm.getGestoraVIEId(),
                nombreRevisor=rev_nombre,
                fechaSolicitud=sub_orm.getFechaSolicitud(),
                comentarioGestora=sub_orm.getComentarioGestora(),
                fechaRespuestaInvestigador=sub_orm.getFechaRespuestaInvestigador(),
                respuestaInvestigador=sub_orm.getRespuestaInvestigador(),
                estadoSubsanacionId=sub_orm.getEstadoSubsanacionId(),
                nombreEstadoSubsanacion=est_sub.nombreEstadoSubsanacion if est_sub else "Pendiente"
            )

        es_propietario = (p.getInvestigadorCoordId() == usuario_id)

        resultado.append(PropuestaResumenResponse(
            propuestaId=p.getPropuestaId(),
            codigoPropuesta=p.getCodigoPropuesta(),
            titulo=p.getTitulo(),
            estadoId=p.getEstadoId(),
            nombreEstado=estado.nombreEstadoPropuesta if estado else None,
            etapaId=p.getEtapaId(),
            convocatoriaId=p.getConvocatoriaId(),
            escuelaId=p.getEscuelaId(),
            nombreEscuela=escuela.nombreEscuela if escuela else None,
            montoTotal=p.getMontoTotal(),
            nivelTrlActual=p.getNivelTrlActual(),
            nivelTrlEsperado=p.getNivelTrlEsperado(),
            fechaCreacion=p.getFechaCreacion(),
            fechaEnvio=p.getFechaEnvio(),
            investigadorCoordId=p.getInvestigadorCoordId(),
            esPropietario=es_propietario,
            form01Completado=f01,
            form02Completado=f02,
            form03Completado=f03,
            subsanacionActiva=sub_resp
        ))
    return resultado


def obtener_propuesta_detalle(
    db: Session,
    propuesta_id: int,
    usuario_id: int
) -> PropuestaDetalleResponse:
    """
    Retorna el detalle completo de una propuesta del investigador o donde participa como integrante.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    estado = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == propuesta.getEstadoId()).first()
    escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.getEscuelaId()).first()
    contenido = db.query(PropuestaContenido).filter(PropuestaContenido.propuestaId == propuesta_id).first()
    declaraciones = db.query(PropuestaDeclaraciones).filter(PropuestaDeclaraciones.propuestaId == propuesta_id).first()

    # Integrantes
    colaboradores_orm = db.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id
    ).all()
    colaboradores_resp = [
        ColaboradorExternoResponse(
            colaboradorId=c.getColaboradorId(),
            propuestaId=c.getPropuestaId(),
            nombreColaborador=c.getNombreColaborador(),
            apellido1Colaborador=c.getApellido1Colaborador(),
            apellido2Colaborador=c.getApellido2Colaborador(),
            idOrcid=c.getIdOrcid(),
            institucionEmpresa=c.getInstitucionEmpresa()
        ) for c in colaboradores_orm
    ]

    integrantes_orm = db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id
    ).all()
    integrantes_resp = []
    for inte in integrantes_orm:
        usu = db.query(Usuario).filter(Usuario.usuarioId == inte.usuarioId).first()
        rol = db.query(RolesEquipo).filter(RolesEquipo.rolEquipoId == inte.getRolEquipoId()).first()
        nombre_completo = f"{usu.nombreUsuario} {usu.apellido1Usuario}".strip() if usu else None
        integrantes_resp.append(
            IntegranteEquipoResponse(
                integranteEquipoId=inte.getIntegranteEquipoId(),
                propuestaId=inte.getPropuestaId(),
                usuarioId=inte.usuarioId,
                nombreCompleto=nombre_completo,
                correoInstitucional=usu.correoInstitucional if usu else None,
                tipoHoraId=inte.getTipoHoraId() or 1,
                rolEquipoId=inte.getRolEquipoId(),
                horasSemanales=inte.getHorasSemanales(),
                orcid=inte.getOrcid()
            )
        )

    # Productos académicos
    productos_orm = db.query(ProductosAcademicos).filter(
        ProductosAcademicos.propuestaId == propuesta_id
    ).all()
    productos_resp = [
        ProductoAcademicoResponse(
            productoId=prod.getProductoId(),
            propuestaId=prod.getPropuestaId(),
            tipoProductoAcademicoId=prod.getTipoProductoAcademicoId(),
            descripcion=prod.getDescripcion(),
            cantidadComprometida=prod.getCantidadComprometida(),
            fechaEntregaEstimada=prod.getFechaEntregaEstimada(),
            esPropiedadIndustrial=prod.getEsPropiedadIndustrial()
        ) for prod in productos_orm
    ]

    # Presupuesto
    presupuesto_orm = db.query(PresupuestoPropuesta).filter(
        PresupuestoPropuesta.propuestaId == propuesta_id
    ).all()
    presupuesto_resp = [
        RubroPresupuestoResponse(
            presupuestoId=pre.getPresupuestoId(),
            propuestaId=pre.getPropuestaId(),
            rubroId=pre.getRubroId(),
            montoSolicitado=pre.getMontoSolicitado(),
            montoAprobado=pre.getMontoAprobado(),
            anioEjecucion=pre.getAnioEjecucion(),
            esDuradero=pre.getEsDuradero()
        ) for pre in presupuesto_orm
    ]

    # Subsanaciones
    subsanaciones_orm = db.query(Subsanaciones).filter(
        Subsanaciones.propuestaId == propuesta_id
    ).order_by(Subsanaciones.fechaSolicitud.desc()).all()
    subsanaciones_resp = []
    for s in subsanaciones_orm:
        est_sub = db.query(EstadosSubsanacion).filter(
            EstadosSubsanacion.estadoSubsanacionId == s.getEstadoSubsanacionId()
        ).first()
        revisor = db.query(Usuario).filter(Usuario.usuarioId == s.getGestoraVIEId()).first()
        rev_nombre = f"{revisor.nombreUsuario} {revisor.apellido1Usuario}".strip() if revisor else "Gestoría VIE"
        subsanaciones_resp.append(
            SubsanacionResponse(
                subsanacionId=s.getSubsanacionId(),
                propuestaId=s.getPropuestaId(),
                gestoraVIEId=s.getGestoraVIEId(),
                nombreRevisor=rev_nombre,
                fechaSolicitud=s.getFechaSolicitud(),
                comentarioGestora=s.getComentarioGestora(),
                fechaRespuestaInvestigador=s.getFechaRespuestaInvestigador(),
                respuestaInvestigador=s.getRespuestaInvestigador(),
                estadoSubsanacionId=s.getEstadoSubsanacionId(),
                nombreEstadoSubsanacion=est_sub.nombreEstadoSubsanacion if est_sub else "Pendiente"
            )
        )

    contenido_resp = ContenidoForm04Response(
        resumen=contenido.getResumen() if contenido else None,
        palabrasClave=contenido.getPalabrasClave() if contenido else None,
        abstract=contenido.getAbstract() if contenido else None,
        problemaInvestigacion=contenido.getProblemaInvestigacion() if contenido else None,
        objetivoGeneral=contenido.getObjetivoGeneral() if contenido else None,
        objetivosEspecificos=contenido.getObjetivosEspecificos() if contenido else None,
        estadoArte=contenido.getEstadoArte() if contenido else None,
        metodologia=contenido.getMetodologia() if contenido else None,
        estrategiaDivulgacion=contenido.getEstrategiaDivulgacion() if contenido else None,
        hojaRuta=contenido.getHojaRuta() if contenido else None
    ) if contenido else None

    declaraciones_resp = DeclaracionesForm04Response(
        tieneFinanciamientoPrevio=declaraciones.getTieneFinanciamientoPrevio() if declaraciones else False,
        tieneContinuidadProyecto=declaraciones.getTieneContinuidadProyecto() if declaraciones else False,
        requiereInstrumentoJuridico=declaraciones.getRequiereInstrumentoJuridico() if declaraciones else False,
        tieneBasePosgrado=declaraciones.getTieneBasePosgrado() if declaraciones else False,
        tieneInformacionConfidencial=declaraciones.getTieneInformacionConfidencial() if declaraciones else False,
        tienePotencialPI=declaraciones.getTienePotencialPI() if declaraciones else False,
        poseeInnovacion=declaraciones.getPoseeInnovacion() if declaraciones else False,
        tipoInnovacionId=declaraciones.getTipoInnovacionId() if declaraciones else None,
        aceptaResguardoRepositorio=declaraciones.getAceptaResguardoRepositorio() if declaraciones else False,
        aceptaDeclaracionJurada=declaraciones.getAceptaDeclaracionJurada() if declaraciones else False
    ) if declaraciones else None

    return PropuestaDetalleResponse(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        estadoId=propuesta.getEstadoId(),
        nombreEstado=estado.nombreEstadoPropuesta if estado else None,
        etapaId=propuesta.getEtapaId(),
        convocatoriaId=propuesta.getConvocatoriaId(),
        escuelaId=propuesta.getEscuelaId(),
        lineaInvestigacionId=propuesta.getLineaInvestigacionId(),
        modalidadId=propuesta.getModalidadId(),
        montoTotal=propuesta.getMontoTotal(),
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        fechaInicio=propuesta.getFechaInicio(),
        fechaFinalizacion=propuesta.getFechaFinalizacion(),
        fechaCreacion=propuesta.getFechaCreacion(),
        fechaEnvio=propuesta.getFechaEnvio(),
        investigadorCoordId=propuesta.getInvestigadorCoordId(),
        esPropietario=(propuesta.getInvestigadorCoordId() == usuario_id),
        resumen=contenido.getResumen() if contenido else None,
        palabrasClave=contenido.getPalabrasClave() if contenido else None,
        abstract=contenido.getAbstract() if contenido else None,
        objetivoGeneral=contenido.getObjetivoGeneral() if contenido else None,
        metodologia=contenido.getMetodologia() if contenido else None,
        tienePotencialPI=declaraciones.getTienePotencialPI() if declaraciones else False,
        poseeInnovacion=declaraciones.getPoseeInnovacion() if declaraciones else False,
        contenido=contenido_resp,
        declaraciones=declaraciones_resp,
        integrantes=integrantes_resp,
        colaboradoresExternos=colaboradores_resp,
        productosAcademicos=productos_resp,
        presupuesto=presupuesto_resp,
        subsanaciones=subsanaciones_resp
    )


def actualizar_propuesta_cabecera(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: PropuestaUpdate
) -> Propuesta:
    """
    Actualiza la información general de la propuesta. Permitido en estado BORRADOR o SUBSANACION.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    if propuesta.getEstadoId() not in [1, 10]:
        raise HTTPException(status_code=400, detail="Solo se pueden editar propuestas en Borrador o en Subsanación")

    if datos.titulo is not None:
        propuesta.setTitulo(datos.titulo)
    if datos.escuelaId is not None:
        propuesta.setEscuelaId(datos.escuelaId)
    if datos.lineaInvestigacionId is not None:
        propuesta.setLineaInvestigacionId(datos.lineaInvestigacionId)
    if datos.modalidadId is not None:
        propuesta.setModalidadId(datos.modalidadId)
    if datos.nivelTrlActual is not None:
        propuesta.setNivelTrlActual(datos.nivelTrlActual)
    if datos.nivelTrlEsperado is not None:
        propuesta.setNivelTrlEsperado(datos.nivelTrlEsperado)
    if datos.fechaInicio is not None:
        propuesta.setFechaInicio(datos.fechaInicio)
    if datos.fechaFinalizacion is not None:
        propuesta.setFechaFinalizacion(datos.fechaFinalizacion)

    propuesta.setUsuarioAuditoriaId(usuario_id)
    propuesta.setUltimaAuditoria(datetime.now(timezone.utc))

    db.commit()
    db.refresh(propuesta)
    return propuesta


def actualizar_contenido_form04(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: ContenidoForm04Update
) -> PropuestaContenido:
    """
    Actualiza la información descriptiva (Resumen, Metodología, etc.) del Formulario 04.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    contenido = db.query(PropuestaContenido).filter(
        PropuestaContenido.propuestaId == propuesta_id
    ).first()

    if not contenido:
        contenido = PropuestaContenido()
        contenido.setPropuestaId(propuesta_id)
        db.add(contenido)

    if datos.resumen is not None:
        contenido.setResumen(datos.resumen)
    if datos.palabrasClave is not None:
        contenido.setPalabrasClave(datos.palabrasClave)
    if datos.abstract is not None:
        contenido.setAbstract(datos.abstract)
    if datos.problemaInvestigacion is not None:
        contenido.setProblemaInvestigacion(datos.problemaInvestigacion)
    if datos.objetivoGeneral is not None:
        contenido.setObjetivoGeneral(datos.objetivoGeneral)
    if datos.objetivosEspecificos is not None:
        contenido.setObjetivosEspecificos(datos.objetivosEspecificos)
    if datos.estadoArte is not None:
        contenido.setEstadoArte(datos.estadoArte)
    if datos.metodologia is not None:
        contenido.setMetodologia(datos.metodologia)
    if datos.estrategiaDivulgacion is not None:
        contenido.setEstrategiaDivulgacion(datos.estrategiaDivulgacion)
    if datos.hojaRuta is not None:
        contenido.setHojaRuta(datos.hojaRuta)

    contenido.setUsuarioAuditoriaId(usuario_id)
    contenido.setUltimaAuditoria(datetime.now(timezone.utc))

    db.commit()
    db.refresh(contenido)
    return contenido


def actualizar_declaraciones_form04(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: DeclaracionesForm04Update
) -> PropuestaDeclaraciones:
    """
    Actualiza las declaraciones éticas, ambientales y de PI del Formulario 04.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    declaraciones = db.query(PropuestaDeclaraciones).filter(
        PropuestaDeclaraciones.propuestaId == propuesta_id
    ).first()

    if not declaraciones:
        declaraciones = PropuestaDeclaraciones()
        declaraciones.setPropuestaId(propuesta_id)
        db.add(declaraciones)

    if datos.tieneFinanciamientoPrevio is not None:
        declaraciones.setTieneFinanciamientoPrevio(datos.tieneFinanciamientoPrevio)
    if getattr(datos, 'tieneContinuidadProyecto', None) is not None:
        declaraciones.setTieneContinuidadProyecto(datos.tieneContinuidadProyecto)
    if getattr(datos, 'requiereInstrumentoJuridico', None) is not None:
        declaraciones.setRequiereInstrumentoJuridico(datos.requiereInstrumentoJuridico)
    if getattr(datos, 'tieneBasePosgrado', None) is not None:
        declaraciones.setTieneBasePosgrado(datos.tieneBasePosgrado)
    if getattr(datos, 'tieneInformacionConfidencial', None) is not None:
        declaraciones.setTieneInformacionConfidencial(datos.tieneInformacionConfidencial)
    if datos.tienePotencialPI is not None:
        declaraciones.setTienePotencialPI(datos.tienePotencialPI)
    if datos.poseeInnovacion is not None:
        declaraciones.setPoseeInnovacion(datos.poseeInnovacion)
    if getattr(datos, 'tipoInnovacionId', None) is not None:
        declaraciones.setTipoInnovacionId(datos.tipoInnovacionId)
    if hasattr(datos, 'aceptaDeclaracionJurada') and datos.aceptaDeclaracionJurada is not None:
        declaraciones.setAceptaDeclaracionJurada(datos.aceptaDeclaracionJurada)
    if hasattr(datos, 'aceptaResguardoRepositorio') and datos.aceptaResguardoRepositorio is not None:
        declaraciones.setAceptaResguardoRepositorio(datos.aceptaResguardoRepositorio)

    declaraciones.setUsuarioAuditoriaId(usuario_id)
    declaraciones.setUltimaAuditoria(datetime.now(timezone.utc))

    db.commit()
    db.refresh(declaraciones)
    return declaraciones


def agregar_integrante_equipo(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: IntegranteEquipoCreate
) -> IntegrantesEquipoPropuesta:
    """
    Agrega un miembro o colaborador al equipo de la propuesta.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    nuevo_integrante = IntegrantesEquipoPropuesta()
    nuevo_integrante.setPropuestaId(propuesta_id)
    nuevo_integrante.setUsuarioId(datos.usuarioId)
    nuevo_integrante.setRolEquipoId(datos.rolEquipoId)
    nuevo_integrante.setHorasSemanales(datos.horasSemanales)
    nuevo_integrante.setUsuarioAuditoriaId(usuario_id)

    db.add(nuevo_integrante)
    db.commit()
    db.refresh(nuevo_integrante)
    return nuevo_integrante


def eliminar_integrante_equipo(
    db: Session,
    propuesta_id: int,
    integrante_id: int,
    usuario_id: int
) -> bool:
    """
    Elimina a un miembro del equipo de la propuesta. No se puede eliminar al coordinador.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    integrante = db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.integranteId == integrante_id,
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id
    ).first()

    if not integrante:
        raise HTTPException(status_code=404, detail="Integrante no encontrado")

    if integrante.getRolEquipoId() == 1:
        raise HTTPException(status_code=400, detail="No se puede eliminar a la persona coordinadora del equipo")

    db.delete(integrante)
    db.commit()
    return True


def agregar_producto_academico(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: ProductoAcademicoCreate
) -> ProductosAcademicos:
    """
    Registra un producto académico o tecnológico comprometido para la propuesta.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    producto = ProductosAcademicos()
    producto.setPropuestaId(propuesta_id)
    producto.setTipoProductoAcademicoId(getattr(datos, 'tipoProductoAcademicoId', getattr(datos, 'tipoProductoId', 1)))
    producto.setDescripcion(datos.descripcion)
    producto.setCantidadComprometida(datos.cantidadComprometida)
    producto.setFechaEntregaEstimada(datos.fechaEntregaEstimada)
    producto.setEsPropiedadIndustrial(datos.esPropiedadIndustrial)
    producto.setUsuarioAuditoriaId(usuario_id)

    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


def agregar_rubro_presupuesto(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: RubroPresupuestoCreate
) -> PresupuestoPropuesta:
    """
    Registra un rubro al presupuesto de la propuesta y actualiza el montoTotal en la cabecera.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    item = PresupuestoPropuesta()
    item.setPropuestaId(propuesta_id)
    item.setRubroId(datos.rubroId)
    item.setMontoSolicitado(datos.montoSolicitado)
    item.setAnioEjecucion(datos.anioEjecucion)
    item.setEsDuradero(datos.esDuradero)
    item.setUsuarioAuditoriaId(usuario_id)

    db.add(item)
    db.flush()

    # Actualizar monto total en la propuesta
    total = sum([p.getMontoSolicitado() for p in propuesta.presupuesto])
    propuesta.setMontoTotal(total)

    db.commit()
    db.refresh(item)
    return item


def guardar_presupuesto_completo(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    rubros: List[RubroPresupuestoCreate]
) -> List[PresupuestoPropuesta]:
    """
    Reemplaza todos los rubros de presupuesto de la propuesta con la nueva lista y actualiza el monto total.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    # Eliminar rubros anteriores
    db.query(PresupuestoPropuesta).filter(
        PresupuestoPropuesta.propuestaId == propuesta_id
    ).delete(synchronize_session=False)

    nuevos = []
    total = Decimal("0.00")
    for r in rubros:
        item = PresupuestoPropuesta()
        item.setPropuestaId(propuesta_id)
        item.setRubroId(r.rubroId)
        item.setMontoSolicitado(Decimal(str(r.montoSolicitado)))
        item.setAnioEjecucion(r.anioEjecucion)
        item.setEsDuradero(r.esDuradero)
        item.setUsuarioAuditoriaId(usuario_id)
        db.add(item)
        nuevos.append(item)
        total += Decimal(str(r.montoSolicitado))

    propuesta.setMontoTotal(total)
    db.commit()
    for item in nuevos:
        db.refresh(item)
    return nuevos


def enviar_propuesta_revision(
    db: Session,
    propuesta_id: int,
    usuario_id: int
) -> Propuesta:
    """
    Envía formalmente la propuesta a revisión institucional (cambia de BORRADOR a ENVIADA).
    Restringido exclusivamente a la persona coordinadora / propietaria de la propuesta.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=True)

    if propuesta.getEstadoId() not in [1, 10]:
        raise HTTPException(status_code=400, detail="Solo se pueden enviar propuestas en estado Borrador o en Subsanación")

    # Validaciones mínimas de integridad
    contenido = db.query(PropuestaContenido).filter(PropuestaContenido.propuestaId == propuesta_id).first()
    if not contenido or not contenido.getResumen() or len(contenido.getResumen().strip()) < 20:
        raise HTTPException(status_code=400, detail="Debe completar al menos el Resumen Ejecutivo del Form-04")

    # Cambiar estado a ENVIADA (ID 2)
    propuesta.setEstadoId(2)
    propuesta.setFechaEnvio(datetime.now(timezone.utc))
    propuesta.setUsuarioAuditoriaId(usuario_id)
    propuesta.setUltimaAuditoria(datetime.now(timezone.utc))

    # Notificación para el investigador
    notif = Notificaciones(
        usuarioDestinoId=usuario_id,
        propuestaId=propuesta.getPropuestaId(),
        tipoNotificacionId=4,
        asunto=f"Propuesta enviada: {propuesta.getCodigoPropuesta()}",
        cuerpoMensaje=f"Tu propuesta '{propuesta.getTitulo()}' ha sido enviada formalmente a evaluación por la Unidad de Vinculación.",
        canalId=1,
        leida=False,
        creadoEn=datetime.now(timezone.utc),
        fechaEnvio=datetime.now(timezone.utc)
    )
    db.add(notif)

    db.commit()
    db.refresh(propuesta)
    return propuesta


def obtener_subsanaciones_propuesta(
    db: Session,
    propuesta_id: int,
    usuario_id: int
) -> List[SubsanacionResponse]:
    """
    Retorna el historial de subsanaciones solicitadas a una propuesta.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    subsanaciones = db.query(Subsanaciones).filter(
        Subsanaciones.propuestaId == propuesta_id
    ).order_by(Subsanaciones.fechaSolicitud.desc()).all()

    resultado = []
    for s in subsanaciones:
        est_sub = db.query(EstadosSubsanacion).filter(
            EstadosSubsanacion.estadoSubsanacionId == s.getEstadoSubsanacionId()
        ).first()
        revisor = db.query(Usuario).filter(Usuario.usuarioId == s.getGestoraVIEId()).first()
        rev_nombre = f"{revisor.nombreUsuario} {revisor.apellido1Usuario}".strip() if revisor else "Gestoría VIE"
        resultado.append(SubsanacionResponse(
            subsanacionId=s.getSubsanacionId(),
            propuestaId=s.getPropuestaId(),
            gestoraVIEId=s.getGestoraVIEId(),
            nombreRevisor=rev_nombre,
            fechaSolicitud=s.getFechaSolicitud(),
            comentarioGestora=s.getComentarioGestora(),
            fechaRespuestaInvestigador=s.getFechaRespuestaInvestigador(),
            respuestaInvestigador=s.getRespuestaInvestigador(),
            estadoSubsanacionId=s.getEstadoSubsanacionId(),
            nombreEstadoSubsanacion=est_sub.nombreEstadoSubsanacion if est_sub else "Pendiente"
        ))
    return resultado


def responder_subsanacion(
    db: Session,
    propuesta_id: int,
    subsanacion_id: int,
    usuario_id: int,
    datos: SubsanacionRespuestaRequest
) -> SubsanacionResponse:
    """
    Registra la corrección o respuesta del investigador ante la subsanación.
    Si se marca reenviarPropuesta=True, cambia el estado de la propuesta a 'Enviada a VIE' (Revisión)
    cumpliendo el flujo: Revisión -> Subsanación -> Corrección por el solicitante -> Reenvío -> Nueva revisión.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    sub = db.query(Subsanaciones).filter(
        Subsanaciones.subsanacionId == subsanacion_id,
        Subsanaciones.propuestaId == propuesta_id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subsanación no encontrada")

    # Actualizar subsanación
    sub.setRespuestaInvestigador(datos.respuestaInvestigador)
    sub.setFechaRespuestaInvestigador(datetime.now(timezone.utc))
    sub.setEstadoSubsanacionId(2)  # 2: Resuelta / Respondida

    # Reenvío de la propuesta para nueva revisión
    if datos.reenviarPropuesta:
        if propuesta.getInvestigadorCoordId() != usuario_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo la persona coordinadora (propietaria de la propuesta) puede reenviar la propuesta a revisión institucional."
            )
        propuesta.setEstadoId(2)  # Enviada a Vinculación / En Revisión
        propuesta.setFechaEnvio(datetime.now(timezone.utc))
        propuesta.setUltimaAuditoria(datetime.now(timezone.utc))

        # Notificación al revisor o gestor
        notif = Notificaciones(
            usuarioDestinoId=sub.getGestoraVIEId(),
            propuestaId=propuesta.getPropuestaId(),
            tipoNotificacionId=4,
            asunto=f"Subsanación Respondida: {propuesta.getCodigoPropuesta()}",
            cuerpoMensaje=f"La propuesta '{propuesta.getTitulo()}' ha sido corregida y reenviada para nueva revisión por la Unidad de Vinculación.",
            canalId=1,
            leida=False,
            creadoEn=datetime.now(timezone.utc),
            fechaEnvio=datetime.now(timezone.utc)
        )
        db.add(notif)

    db.commit()
    db.refresh(sub)

    est_sub = db.query(EstadosSubsanacion).filter(
        EstadosSubsanacion.estadoSubsanacionId == sub.getEstadoSubsanacionId()
    ).first()
    revisor = db.query(Usuario).filter(Usuario.usuarioId == sub.getGestoraVIEId()).first()
    rev_nombre = f"{revisor.nombreUsuario} {revisor.apellido1Usuario}".strip() if revisor else "Gestoría VIE"

    return SubsanacionResponse(
        subsanacionId=sub.getSubsanacionId(),
        propuestaId=sub.getPropuestaId(),
        gestoraVIEId=sub.getGestoraVIEId(),
        nombreRevisor=rev_nombre,
        fechaSolicitud=sub.getFechaSolicitud(),
        comentarioGestora=sub.getComentarioGestora(),
        fechaRespuestaInvestigador=sub.getFechaRespuestaInvestigador(),
        respuestaInvestigador=sub.getRespuestaInvestigador(),
        estadoSubsanacionId=sub.getEstadoSubsanacionId(),
        nombreEstadoSubsanacion=est_sub.nombreEstadoSubsanacion if est_sub else "Resuelta"
    )


def solicitar_subsanacion(
    db: Session,
    propuesta_id: int,
    gestora_id: int,
    datos: SubsanacionCrearRequest
) -> SubsanacionResponse:
    """
    Devuelve la propuesta en estado 'En Subsanación' (10) con observaciones o faltantes requeridos.
    """
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")

    # Cambiar estado de propuesta a 10: 'En Subsanación'
    propuesta.setEstadoId(10)
    propuesta.setUltimaAuditoria(datetime.now(timezone.utc))

    nueva_sub = Subsanaciones()
    nueva_sub.setPropuestaId(propuesta_id)
    nueva_sub.setGestoraVIEId(gestora_id)
    nueva_sub.setComentarioGestora(datos.comentarioGestora)
    nueva_sub.setFechaSolicitud(datetime.now(timezone.utc))
    nueva_sub.setEstadoSubsanacionId(1)  # 1: Pendiente

    db.add(nueva_sub)

    # Notificar al investigador coordinador
    notif = Notificaciones(
        usuarioDestinoId=propuesta.getInvestigadorCoordId(),
        propuestaId=propuesta.getPropuestaId(),
        tipoNotificacionId=4,
        asunto=f"Subsanación requerida: {propuesta.getCodigoPropuesta()}",
        cuerpoMensaje=f"Tu propuesta '{propuesta.getTitulo()}' ha sido devuelta en estado Subsanación con las siguientes observaciones: {datos.comentarioGestora[:120]}...",
        canalId=1,
        leida=False,
        creadoEn=datetime.now(timezone.utc),
        fechaEnvio=datetime.now(timezone.utc)
    )
    db.add(notif)

    db.commit()
    db.refresh(nueva_sub)

    est_sub = db.query(EstadosSubsanacion).filter(
        EstadosSubsanacion.estadoSubsanacionId == nueva_sub.getEstadoSubsanacionId()
    ).first()
    revisor = db.query(Usuario).filter(Usuario.usuarioId == nueva_sub.getGestoraVIEId()).first()
    rev_nombre = f"{revisor.nombreUsuario} {revisor.apellido1Usuario}".strip() if revisor else "Gestoría VIE"

    return SubsanacionResponse(
        subsanacionId=nueva_sub.getSubsanacionId(),
        propuestaId=nueva_sub.getPropuestaId(),
        gestoraVIEId=nueva_sub.getGestoraVIEId(),
        nombreRevisor=rev_nombre,
        fechaSolicitud=nueva_sub.getFechaSolicitud(),
        comentarioGestora=nueva_sub.getComentarioGestora(),
        fechaRespuestaInvestigador=nueva_sub.getFechaRespuestaInvestigador(),
        respuestaInvestigador=nueva_sub.getRespuestaInvestigador(),
        estadoSubsanacionId=nueva_sub.getEstadoSubsanacionId(),
        nombreEstadoSubsanacion=est_sub.nombreEstadoSubsanacion if est_sub else "Pendiente"
    )


def guardar_equipo_completo(
    db: Session,
    propuesta_id: int,
    usuario_id: int,
    datos: EquipoCompletoUpdate
) -> dict:
    """
    Sincroniza y valida de manera atómica todos los integrantes del TEC y colaboradores externos.
    Verifica estrictamente que los miembros del TEC existan en la tabla usuarios.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)
    coord_id = propuesta.getInvestigadorCoordId()

    # 1. Integrantes TEC
    db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id
    ).delete(synchronize_session=False)

    coordinador_incluido = False
    for inte in datos.integrantes:
        usu = db.query(Usuario).filter(Usuario.usuarioId == inte.usuarioId, Usuario.activo == True).first()
        if not usu:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El miembro con ID {inte.usuarioId} no existe en la base de datos de usuarios del TEC."
            )
        if inte.usuarioId == coord_id:
            coordinador_incluido = True

        nuevo_inte = IntegrantesEquipoPropuesta()
        nuevo_inte.setPropuestaId(propuesta_id)
        nuevo_inte.setUsuarioId(inte.usuarioId)
        nuevo_inte.setTipoHoraId(inte.tipoHoraId or 1)
        nuevo_inte.setHorasSemanales(inte.horasSemanales or Decimal("10.0"))
        nuevo_inte.setRolEquipoId(1 if inte.usuarioId == coord_id else (inte.rolEquipoId or 2))
        nuevo_inte.setOrcid(inte.orcid)
        nuevo_inte.setUsuarioAuditoriaId(usuario_id)
        db.add(nuevo_inte)

    if not coordinador_incluido:
        coord = IntegrantesEquipoPropuesta()
        coord.setPropuestaId(propuesta_id)
        coord.setUsuarioId(coord_id)
        coord.setTipoHoraId(1)
        coord.setHorasSemanales(Decimal("10.0"))
        coord.setRolEquipoId(1)
        coord.setUsuarioAuditoriaId(usuario_id)
        db.add(coord)

    # 2. Colaboradores Externos
    db.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id
    ).delete(synchronize_session=False)

    for col in datos.colaboradoresExternos:
        if not col.nombreColaborador or not col.nombreColaborador.strip():
            continue
        nuevo_col = ColaboradoresExternos()
        nuevo_col.setPropuestaId(propuesta_id)
        nuevo_col.setNombreColaborador(col.nombreColaborador.strip())
        nuevo_col.setApellido1Colaborador(col.apellido1Colaborador)
        nuevo_col.setApellido2Colaborador(col.apellido2Colaborador)
        nuevo_col.setIdOrcid(col.idOrcid)
        nuevo_col.setInstitucionEmpresa(col.institucionEmpresa.strip() if col.institucionEmpresa else "Institución Externa")
        nuevo_col.setUsuarioAuditoriaId(usuario_id)
        db.add(nuevo_col)

    db.commit()
    return {"message": "Equipo de investigación y colaboradores externos guardados exitosamente"}


def obtener_equipo_propuesta(
    db: Session,
    propuesta_id: int,
    usuario_id: int
) -> dict:
    """
    Retorna la lista de integrantes del TEC y colaboradores externos de una propuesta.
    """
    propuesta = obtener_propuesta_con_acceso(db, propuesta_id, usuario_id, requiere_coordinador=False)

    integrantes_orm = db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta_id
    ).all()
    integrantes_resp = []
    for inte in integrantes_orm:
        usu = db.query(Usuario).filter(Usuario.usuarioId == inte.usuarioId).first()
        rol = db.query(RolesEquipo).filter(RolesEquipo.rolEquipoId == inte.getRolEquipoId()).first()
        nombre_completo = f"{usu.nombreUsuario} {usu.apellido1Usuario}".strip() if usu else None
        integrantes_resp.append(
            IntegranteEquipoResponse(
                integranteEquipoId=inte.getIntegranteEquipoId(),
                propuestaId=inte.getPropuestaId(),
                usuarioId=inte.usuarioId,
                nombreCompleto=nombre_completo,
                correoInstitucional=usu.correoInstitucional if usu else None,
                tipoHoraId=inte.getTipoHoraId() or 1,
                horasSemanales=inte.getHorasSemanales(),
                rolEquipoId=inte.getRolEquipoId(),
                orcid=inte.getOrcid()
            )
        )

    colaboradores_orm = db.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id
    ).all()
    colabs_resp = [
        ColaboradorExternoResponse(
            colaboradorId=c.getColaboradorId(),
            propuestaId=c.getPropuestaId(),
            nombreColaborador=c.getNombreColaborador(),
            apellido1Colaborador=c.getApellido1Colaborador(),
            apellido2Colaborador=c.getApellido2Colaborador(),
            idOrcid=c.getIdOrcid(),
            institucionEmpresa=c.getInstitucionEmpresa()
        ) for c in colaboradores_orm
    ]

    return {
        "integrantes": integrantes_resp,
        "colaboradoresExternos": colabs_resp
    }
