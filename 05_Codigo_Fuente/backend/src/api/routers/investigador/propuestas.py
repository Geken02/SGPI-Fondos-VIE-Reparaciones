from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.models.usuarios import Usuario
from src.models.roles import RolesSistema, UsuarioRol
from src.models.escuelas import Escuela
from src.utils.dependencias import obtener_usuario_activo, requerir_rol
from src.api.schemas.investigador.propuestas import (
    PropuestaCreate,
    PropuestaUpdate,
    ContenidoForm04Update,
    DeclaracionesForm04Update,
    IntegranteEquipoCreate,
    IntegranteEquipoResponse,
    ColaboradorExternoCreate,
    ColaboradorExternoResponse,
    EquipoCompletoUpdate,
    EquipoCompletoResponse,
    ProductoAcademicoCreate,
    ProductoAcademicoResponse,
    RubroPresupuestoCreate,
    RubroPresupuestoResponse,
    SubsanacionResponse,
    SubsanacionRespuestaRequest,
    SubsanacionCrearRequest,
    PropuestaResumenResponse,
    PropuestaDetalleResponse,
    PlanAccionRiesgosUpdate,
    PlanAccionRiesgosResponse,
    AspectosEticosUpdate,
    AspectosEticosResponse,
    FinanciamientoExternoUpdate,
    FinanciamientoExternoResponse,
    ReferenciasUpdate,
    FuenteBibliograficaResponse,
    ProductosAcademicosUpdate
)
from src.services.investigador.propuesta_service import (
    crear_propuesta,
    listar_propuestas_investigador,
    obtener_propuesta_detalle,
    actualizar_propuesta_cabecera,
    actualizar_contenido_form04,
    actualizar_declaraciones_form04,
    agregar_integrante_equipo,
    eliminar_integrante_equipo,
    agregar_producto_academico,
    agregar_rubro_presupuesto,
    guardar_presupuesto_completo,
    guardar_equipo_completo,
    obtener_equipo_propuesta,
    enviar_propuesta_revision,
    obtener_subsanaciones_propuesta,
    responder_subsanacion,
    solicitar_subsanacion,
    obtener_plan_accion_riesgos,
    guardar_plan_accion_riesgos,
    guardar_aspectos_eticos,
    guardar_financiamiento_externo,
    guardar_referencias,
    guardar_productos_academicos
)

router = APIRouter(
    prefix="/investigador/propuestas",
    tags=["Módulo 1: Investigador (Formulación de Propuestas)"]
)


@router.get(
    "/",
    response_model=List[PropuestaResumenResponse],
    summary="Listar mis propuestas de investigación",
    description="Retorna todas las propuestas formuladas por el investigador autenticado."
)
def listar_mis_propuestas(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return listar_propuestas_investigador(db=db, usuario_id=usuario_actual.usuarioId)


@router.post(
    "/",
    response_model=PropuestaResumenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva propuesta en Borrador",
    description="Inicializa una propuesta con código oficial FVIE-YYYY-NNN y crea los contenedores de Form-04."
)
def registrar_propuesta(
    datos: PropuestaCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    propuesta = crear_propuesta(db=db, usuario=usuario_actual, datos=datos)
    escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.getEscuelaId()).first()
    modalidad = propuesta.getModalidad()
    return PropuestaResumenResponse(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        estadoId=propuesta.getEstadoId(),
        nombreEstado="Borrador",
        etapaId=propuesta.getEtapaId(),
        convocatoriaId=propuesta.getConvocatoriaId(),
        escuelaId=propuesta.getEscuelaId(),
        nombreEscuela=escuela.nombreEscuela if escuela else None,
        modalidadId=propuesta.getModalidadId(),
        modalidad=modalidad.nombreModalidad if modalidad else None,
        montoTotal=propuesta.getMontoTotal(),
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        fechaCreacion=propuesta.getFechaCreacion(),
        fechaEnvio=propuesta.getFechaEnvio(),
        investigadorCoordId=propuesta.getInvestigadorCoordId(),
        esPropietario=(propuesta.getInvestigadorCoordId() == usuario_actual.usuarioId),
    )


@router.get(
    "/catalogos/formulario",
    summary="Obtener catálogos de convocatorias y escuelas para creación de propuestas"
)
def obtener_catalogos_formulario(
    vigentes: bool = False,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.convocatorias import Convocatorias, EstadosPropuesta
    from src.models.escuelas import Escuela, Campus
    from src.models.catalogos import (
        NivelesTrl, TiposHora, Modalidades, TiposInnovacion, LineasInvestigacion
    )
    from src.models.usuarios import Usuario
    from src.models.propuesta_equipo import RolesEquipo
    from src.models.propuesta_plan import TiposResponsabilidad
    from src.models.aspectos_eticos import EntesRegulatorios, EstadosAval
    from src.models.presupuesto import (
        TiposFinanciamiento, EntidadesEmisoras, RubrosPropuesta
    )
    from src.models.productos_academicos import TiposProductosAcademicos
    from datetime import date

    hoy = date.today()
    # Con vigentes=True solo se devuelven convocatorias activas cuya fecha de
    # cierre (fechaCierre) sea hoy o posterior; se excluyen las ya cerradas por fecha.
    consulta_convocatorias = db.query(Convocatorias)
    if vigentes:
        consulta_convocatorias = consulta_convocatorias.filter(
            Convocatorias.activo == True,
            Convocatorias.fechaCierre >= hoy
        )
    convocatorias = consulta_convocatorias.order_by(Convocatorias.fechaCierre.desc()).all()
    escuelas = db.query(Escuela).filter(Escuela.activo == True).order_by(Escuela.nombreEscuela).all()
    campus = db.query(Campus).filter(Campus.activo == True).order_by(Campus.nombreCampus).all()
    estados_propuesta = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.activo == True
    ).order_by(EstadosPropuesta.orden).all()
    niveles_trl = db.query(NivelesTrl).filter(NivelesTrl.activo == True).order_by(NivelesTrl.nivelTrlId).all()

    # Equipo de investigación: únicamente usuarios con rol InvestigadorCoordinador (2)
    # o InvestigadorColaborador (3); se excluye cualquier otro rol del sistema.
    ROLES_EQUIPO_INVESTIGADOR = ("InvestigadorCoordinador", "InvestigadorColaborador")
    roles_investigador_ids = [
        r.rolId
        for r in db.query(RolesSistema)
        .filter(RolesSistema.nombreRol.in_(list(ROLES_EQUIPO_INVESTIGADOR)))
        .all()
    ]
    # Mapa usuarioId -> nombres de rol, para exponerlo y reforzar el filtro en el frontend.
    roles_por_usuario: dict[int, list[str]] = {}
    for usuario_id_rol, nombre_rol in (
        db.query(UsuarioRol.usuarioId, RolesSistema.nombreRol)
        .join(RolesSistema, RolesSistema.rolId == UsuarioRol.rolId)
        .filter(UsuarioRol.activo == True)
        .all()
    ):
        roles_por_usuario.setdefault(usuario_id_rol, []).append(nombre_rol)

    investigadores = (
        db.query(Usuario)
        .join(UsuarioRol, UsuarioRol.usuarioId == Usuario.usuarioId)
        .filter(
            Usuario.activo == True,
            UsuarioRol.activo == True,
            UsuarioRol.rolId.in_(roles_investigador_ids),
        )
        .distinct()
        .order_by(Usuario.nombreUsuario)
        .all()
        if roles_investigador_ids
        else []
    )
    roles_equipo = db.query(RolesEquipo).filter(RolesEquipo.activo == True).all()
    # Catálogos auxiliares (llaves foráneas de la sección 3 del esquema)
    rubros = db.query(RubrosPropuesta).filter(RubrosPropuesta.activo == True).all()
    tipos_producto = db.query(TiposProductosAcademicos).filter(
        TiposProductosAcademicos.activo == True
    ).all()
    tipos_responsabilidad = db.query(TiposResponsabilidad).filter(
        TiposResponsabilidad.activo == True
    ).all()
    entes_regulatorios = db.query(EntesRegulatorios).filter(EntesRegulatorios.activo == True).all()
    estados_aval = db.query(EstadosAval).filter(EstadosAval.activo == True).all()
    tipos_hora = db.query(TiposHora).filter(TiposHora.activo == True).all()
    tipos_financiamiento = db.query(TiposFinanciamiento).filter(
        TiposFinanciamiento.activo == True
    ).all()
    entidades_emisoras = db.query(EntidadesEmisoras).filter(EntidadesEmisoras.activo == True).all()
    tipos_innovacion = db.query(TiposInnovacion).filter(TiposInnovacion.activo == True).all()
    modalidades = db.query(Modalidades).filter(Modalidades.activo == True).all()
    lineas_investigacion = db.query(LineasInvestigacion).filter(
        LineasInvestigacion.activo == True
    ).all()

    convocatorias_data = []
    for c in convocatorias:
        cerrada = not c.activo or (c.fechaCierre is not None and c.fechaCierre < hoy)
        convocatorias_data.append({
            "convocatoriaId": c.convocatoriaId,
            "nombreConvocatoria": c.nombreConvocatoria,
            "fechaApertura": str(c.fechaApertura) if c.fechaApertura else None,
            "fechaCierre": str(c.fechaCierre) if c.fechaCierre else None,
            "activo": bool(c.activo),
            "cerrada": cerrada,
            "estado": "Cerrada" if cerrada else "Abierta"
        })

    return {
        "convocatorias": convocatorias_data,
        "escuelas": [
            {
                "escuelaId": e.escuelaId,
                "nombreEscuela": e.nombreEscuela,
                "codigoEscuela": e.codigoEscuela,
                # Escuela↔Campus es N-a-N (tabla intermedia escuelacampus):
                # la relación Escuela.campus devuelve una LISTA de Campus, no un objeto único.
                "campusId": e.campus[0].campusId if e.campus else None,
                "nombreCampus": e.campus[0].nombreCampus if e.campus else None,
                "campus": [
                    {"campusId": c.campusId, "nombreCampus": c.nombreCampus}
                    for c in e.campus
                ]
            } for e in escuelas
        ],
        "campus": [
            {
                "campusId": c.campusId,
                "nombreCampus": c.nombreCampus
            } for c in campus
        ],
        "estadosPropuesta": [
            {
                "estadoPropuestaId": es.estadoPropuestaId,
                "codigoEstadoPropuesta": es.codigoEstadoPropuesta,
                "nombreEstadoPropuesta": es.nombreEstadoPropuesta,
                "esFinal": bool(es.esFinal),
                "orden": es.orden
            } for es in estados_propuesta
        ],
        "nivelesTrl": [
            {
                "nivelTrlId": n.nivelTrlId,
                "descripcionNivel": n.descripcionNivel
            } for n in niveles_trl
        ],
        "investigadores": [
            {
                "usuarioId": u.usuarioId,
                "nombreCompleto": f"{u.nombreUsuario} {u.apellido1Usuario} {u.apellido2Usuario or ''}".strip(),
                "nombre": u.nombreUsuario,
                "apellido1": u.apellido1Usuario,
                "correo": u.correoInstitucional,
                "escuelaId": u.escuelaId,
                "escuela": u.escuela.nombreEscuela if u.escuela else "TEC",
                "roles": roles_por_usuario.get(u.usuarioId, [])
            } for u in investigadores
        ],
        "rolesEquipo": [
            {
                "rolEquipoId": r.rolEquipoId,
                "nombreRol": r.nombreRol
            } for r in roles_equipo
        ],
        "rubros": [
            {
                "rubroId": r.getRubroId(),
                "nombreRubro": r.getNombreRubro(),
                "descripcionRubro": r.getDescripcionRubro()
            } for r in rubros
        ],
        "tiposProductoAcademico": [
            {
                "tipoProductoAcademicoId": t.tipoProductoAcademicoId,
                "nombreTipoProductoAcademico": t.nombreTipoProductoAcademico,
                "descripcion": t.descripcion
            } for t in tipos_producto
        ],
        "tiposResponsabilidad": [
            {
                "tipoResponsabilidadId": t.getTipoResponsabilidadId(),
                "nombreTipoResponsabilidad": t.getNombreTipoResponsabilidad(),
                "descripcion": t.getDescripcion()
            } for t in tipos_responsabilidad
        ],
        "entesRegulatorios": [
            {
                "enteRegulatorioId": e.getEnteRegulatorioId(),
                "nombreEnteRegulatorio": e.getNombreEnteRegulatorio(),
                "descripcion": e.getDescripcion()
            } for e in entes_regulatorios
        ],
        "estadosAval": [
            {
                "estadoAvalId": e.getEstadoAvalId(),
                "nombreEstadoAval": e.getNombreEstadoAval(),
                "descripcion": e.getDescripcion()
            } for e in estados_aval
        ],
        "tiposHora": [
            {
                "tipoHoraId": t.tipoHoraId,
                "codigoTipo": t.codigoTipo,
                "descripcion": t.descripcion
            } for t in tipos_hora
        ],
        "tiposFinanciamiento": [
            {
                "tipoFinanciamientoId": t.getTipoFinanciamientoId(),
                "nombreTipoFinanciamiento": t.getNombreTipoFinanciamiento(),
                "descripcion": t.getDescripcion()
            } for t in tipos_financiamiento
        ],
        "entidadesEmisoras": [
            {
                "entidadEmisoraId": e.getEntidadEmisoraId(),
                "nombreEntidadEmisora": e.getNombreEntidadEmisora(),
                "descripcion": e.getDescripcion()
            } for e in entidades_emisoras
        ],
        "tiposInnovacion": [
            {
                "tipoInnovacionId": t.tipoInnovacionId,
                "nombreTipoInnovacion": t.nombreTipoInnovacion,
                "descripcion": t.descripcion
            } for t in tipos_innovacion
        ],
        "modalidades": [
            {
                "modalidadId": m.modalidadId,
                "nombreModalidad": m.nombreModalidad,
                "descripcion": m.descripcion
            } for m in modalidades
        ],
        "lineasInvestigacion": [
            {
                "lineaId": l.lineaId,
                "nombreLinea": l.nombreLinea,
                "descripcion": l.descripcion
            } for l in lineas_investigacion
        ]
    }


@router.get(
    "/explorar",
    response_model=List[PropuestaResumenResponse],
    summary="Exploración unificada de propuestas institucionales",
    description="Retorna todas las propuestas registradas en el SGPI para el buscador institucional."
)
def explorar_propuestas(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.escuelas import Escuela
    from src.models.convocatorias import EstadosPropuesta
    from src.models.propuestas import Propuesta
    propuestas = db.query(Propuesta).order_by(Propuesta.fechaCreacion.desc()).all()
    
    resultado = []
    for p in propuestas:
        estado = db.query(EstadosPropuesta).filter(EstadosPropuesta.estadoPropuestaId == p.getEstadoId()).first()
        escuela = db.query(Escuela).filter(Escuela.escuelaId == p.getEscuelaId()).first()
        resultado.append(PropuestaResumenResponse(
            propuestaId=p.getPropuestaId(),
            codigoPropuesta=p.getCodigoPropuesta(),
            titulo=p.getTitulo(),
            estadoId=p.getEstadoId(),
            nombreEstado=estado.nombreEstadoPropuesta if estado else "Borrador",
            etapaId=p.getEtapaId(),
            convocatoriaId=p.getConvocatoriaId(),
            escuelaId=p.getEscuelaId(),
            nombreEscuela=escuela.nombreEscuela if escuela else None,
            montoTotal=p.getMontoTotal(),
            nivelTrlActual=p.getNivelTrlActual(),
            nivelTrlEsperado=p.getNivelTrlEsperado(),
            fechaCreacion=p.getFechaCreacion(),
            fechaEnvio=p.getFechaEnvio()
        ))
    return resultado


@router.get(
    "/{propuesta_id}",
    response_model=PropuestaDetalleResponse,
    summary="Consultar expediente completo de la propuesta",
    description="Retorna la cabecera, contenido Form-04, equipo, productos académicos y presupuesto de la propuesta."
)
def consultar_propuesta(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_propuesta_detalle(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId
    )


@router.put(
    "/{propuesta_id}",
    response_model=PropuestaResumenResponse,
    summary="Actualizar información general de la propuesta",
    description="Permite modificar título, línea, modalidad o TRL de la propuesta mientras permanezca en Borrador."
)
def actualizar_propuesta(
    propuesta_id: int,
    datos: PropuestaUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    propuesta = actualizar_propuesta_cabecera(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.getEscuelaId()).first()
    modalidad = propuesta.getModalidad()
    return PropuestaResumenResponse(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        estadoId=propuesta.getEstadoId(),
        nombreEstado="Borrador",
        etapaId=propuesta.getEtapaId(),
        convocatoriaId=propuesta.getConvocatoriaId(),
        escuelaId=propuesta.getEscuelaId(),
        nombreEscuela=escuela.nombreEscuela if escuela else None,
        modalidadId=propuesta.getModalidadId(),
        modalidad=modalidad.nombreModalidad if modalidad else None,
        montoTotal=propuesta.getMontoTotal(),
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        fechaCreacion=propuesta.getFechaCreacion(),
        fechaEnvio=propuesta.getFechaEnvio(),
        investigadorCoordId=propuesta.getInvestigadorCoordId(),
        esPropietario=(propuesta.getInvestigadorCoordId() == usuario_actual.usuarioId),
    )


@router.put(
    "/{propuesta_id}/contenido",
    summary="Guardar contenido narrativo Form-04",
    description="Actualiza las secciones del Form-04 (resumen, metodología, hoja de ruta, objetivos, etc.)."
)
def guardar_contenido(
    propuesta_id: int,
    datos: ContenidoForm04Update,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    contenido = actualizar_contenido_form04(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return {"message": "Contenido Form-04 guardado exitosamente"}


@router.put(
    "/{propuesta_id}/declaraciones",
    summary="Guardar declaraciones y aspectos de Propiedad Intelectual",
    description="Registra la declaración jurada, potencial de innovación y propiedad intelectual."
)
def guardar_declaraciones(
    propuesta_id: int,
    datos: DeclaracionesForm04Update,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    declaraciones = actualizar_declaraciones_form04(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return {"message": "Declaraciones guardadas exitosamente"}




@router.get(
    "/{propuesta_id}/equipo",
    summary="Consultar equipo e investigadores de la propuesta"
)
def obtener_equipo(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_equipo_propuesta(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId
    )


@router.put(
    "/{propuesta_id}/equipo-completo",
    summary="Guardar equipo completo de investigadores y colaboradores",
    description="Sincroniza y valida de forma atómica los integrantes del TEC y los colaboradores externos."
)
def actualizar_equipo_completo(
    propuesta_id: int,
    datos: EquipoCompletoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return guardar_equipo_completo(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )

@router.post(
    "/{propuesta_id}/equipo",
    response_model=IntegranteEquipoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar integrante al equipo",
    description="Incorpora un miembro al equipo con su carga horaria semanal y rol."
)
def registrar_integrante(
    propuesta_id: int,
    datos: IntegranteEquipoCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    integrante = agregar_integrante_equipo(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return IntegranteEquipoResponse(
        integranteEquipoId=integrante.getIntegranteEquipoId(),
        propuestaId=integrante.getPropuestaId(),
        usuarioId=integrante.usuarioId,
        tipoHoraId=integrante.getTipoHoraId(),
        horasSemanales=integrante.getHorasSemanales(),
        rolEquipoId=integrante.getRolEquipoId(),
        orcid=integrante.getOrcid()
    )


@router.delete(
    "/{propuesta_id}/equipo/{integrante_id}",
    summary="Eliminar integrante del equipo",
    description="Remueve un integrante del equipo (el coordinador no puede eliminarse)."
)
def borrar_integrante(
    propuesta_id: int,
    integrante_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return eliminar_integrante_equipo(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        integrante_id=integrante_id
    )


@router.post(
    "/{propuesta_id}/productos-academicos",
    response_model=ProductoAcademicoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar producto académico",
    description="Registra un producto académico comprometido en el proyecto (Regla 2.4.1)."
)
def registrar_producto(
    propuesta_id: int,
    datos: ProductoAcademicoCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    producto = agregar_producto_academico(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return ProductoAcademicoResponse(
        productoId=producto.getProductoId(),
        propuestaId=producto.getPropuestaId(),
        tipoProductoAcademicoId=producto.getTipoProductoAcademicoId(),
        descripcion=producto.getDescripcion(),
        cantidadComprometida=producto.getCantidadComprometida(),
        fechaEntregaEstimada=producto.getFechaEntregaEstimada(),
        esPropiedadIndustrial=producto.getEsPropiedadIndustrial()
    )


@router.post(
    "/{propuesta_id}/presupuesto",
    response_model=RubroPresupuestoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar rubro de presupuesto",
    description="Agrega un rubro de gasto al presupuesto del proyecto y actualiza el monto total."
)
def registrar_rubro(
    propuesta_id: int,
    datos: RubroPresupuestoCreate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    item = agregar_rubro_presupuesto(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return RubroPresupuestoResponse(
        presupuestoId=item.getPresupuestoId(),
        propuestaId=item.getPropuestaId(),
        rubroId=item.getRubroId(),
        montoSolicitado=item.getMontoSolicitado(),
        montoAprobado=item.getMontoAprobado(),
        anioEjecucion=item.getAnioEjecucion(),
        esDuradero=item.getEsDuradero()
    )


@router.put(
    "/{propuesta_id}/presupuesto",
    response_model=List[RubroPresupuestoResponse],
    summary="Guardar o reemplazar presupuesto completo",
    description="Reemplaza todos los rubros de presupuesto de la propuesta y actualiza el monto total."
)
def reemplazar_presupuesto(
    propuesta_id: int,
    rubros: List[RubroPresupuestoCreate],
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    items = guardar_presupuesto_completo(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        rubros=rubros
    )
    return [
        RubroPresupuestoResponse(
            presupuestoId=item.getPresupuestoId(),
            propuestaId=item.getPropuestaId(),
            rubroId=item.getRubroId(),
            montoSolicitado=item.getMontoSolicitado(),
            montoAprobado=item.getMontoAprobado(),
            anioEjecucion=item.getAnioEjecucion(),
            esDuradero=item.getEsDuradero()
        ) for item in items
    ]


@router.get(
    "/{propuesta_id}/plan-accion",
    response_model=PlanAccionRiesgosResponse,
    summary="Consultar Plan de Acción y Gestión de Riesgos",
    description="Retorna objetivos específicos, actividades, participantes y riesgos con sus medidas de mitigación."
)
def consultar_plan_accion(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_plan_accion_riesgos(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId
    )


@router.put(
    "/{propuesta_id}/plan-accion",
    response_model=PlanAccionRiesgosResponse,
    summary="Guardar Plan de Acción y Gestión de Riesgos",
    description="Reemplaza de forma transaccional e idempotente ObjetivosEspecificos, Actividades, ParticipantesActividad, Riesgos y MedidasMitigacion."
)
def guardar_plan_accion(
    propuesta_id: int,
    datos: PlanAccionRiesgosUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return guardar_plan_accion_riesgos(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )


@router.get(
    "/{propuesta_id}/aspectos-eticos",
    response_model=AspectosEticosResponse,
    summary="Consultar Aspectos Éticos de la propuesta"
)
def consultar_aspectos_eticos(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.aspectos_eticos import AspectosEticos
    obtener_propuesta_detalle(db=db, propuesta_id=propuesta_id, usuario_id=usuario_actual.usuarioId)
    aspecto = db.query(AspectosEticos).filter(AspectosEticos.propuestaId == propuesta_id).first()
    if not aspecto:
        return AspectosEticosResponse()
    return AspectosEticosResponse(
        involucraSeresHumanos=bool(aspecto.getInvolucraSeresHumanos()),
        involucraBiodiversidad=bool(aspecto.getInvolucraBiodiversidad()),
        involucraAnimales=bool(aspecto.getInvolucraAnimales()),
        involucraTerritoriosIndigenas=bool(aspecto.getInvolucraTerritoriosIndigenas()),
        justificacionExencion=aspecto.getJustificacionExencion(),
        enteRegulatorioId=aspecto.getEnteRegulatorioId(),
        estadoAvalId=aspecto.getEstadoAvalId()
    )


@router.put(
    "/{propuesta_id}/aspectos-eticos",
    response_model=AspectosEticosResponse,
    summary="Guardar (upsert) Aspectos Éticos de la propuesta",
    description="Inserta o actualiza los aspectos éticos y ambientales vinculando los catálogos EntesRegulatorios y EstadosAval."
)
def guardar_aspectos(
    propuesta_id: int,
    datos: AspectosEticosUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    aspecto = guardar_aspectos_eticos(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return AspectosEticosResponse(
        involucraSeresHumanos=bool(aspecto.getInvolucraSeresHumanos()),
        involucraBiodiversidad=bool(aspecto.getInvolucraBiodiversidad()),
        involucraAnimales=bool(aspecto.getInvolucraAnimales()),
        involucraTerritoriosIndigenas=bool(aspecto.getInvolucraTerritoriosIndigenas()),
        justificacionExencion=aspecto.getJustificacionExencion(),
        enteRegulatorioId=aspecto.getEnteRegulatorioId(),
        estadoAvalId=aspecto.getEstadoAvalId()
    )


@router.get(
    "/{propuesta_id}/financiamiento",
    response_model=List[FinanciamientoExternoResponse],
    summary="Consultar financiamiento externo y fuentes adicionales"
)
def consultar_financiamiento(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.presupuesto import FinanciamientoExterno
    obtener_propuesta_detalle(db=db, propuesta_id=propuesta_id, usuario_id=usuario_actual.usuarioId)
    items = db.query(FinanciamientoExterno).filter(
        FinanciamientoExterno.propuestaId == propuesta_id
    ).all()
    return [
        FinanciamientoExternoResponse(
            financiamientoId=f.getFinanciamientoId(),
            tipoFinanciamientoId=f.getTipoFinanciamientoId(),
            anio=f.getAnio(),
            monto=f.getMonto(),
            numeroOficio=f.getNumeroOficio(),
            entidadEmisoraId=f.getEntidadEmisoraId()
        ) for f in items
    ]


@router.put(
    "/{propuesta_id}/financiamiento",
    response_model=List[FinanciamientoExternoResponse],
    summary="Reemplazar financiamiento externo de la propuesta",
    description="Reemplaza de forma atómica las fuentes de financiamiento, tomando los IDs reales de TiposFinanciamiento y EntidadesEmisoras."
)
def reemplazar_financiamiento(
    propuesta_id: int,
    datos: FinanciamientoExternoUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    items = guardar_financiamiento_externo(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return [
        FinanciamientoExternoResponse(
            financiamientoId=f.getFinanciamientoId(),
            tipoFinanciamientoId=f.getTipoFinanciamientoId(),
            anio=f.getAnio(),
            monto=f.getMonto(),
            numeroOficio=f.getNumeroOficio(),
            entidadEmisoraId=f.getEntidadEmisoraId()
        ) for f in items
    ]


@router.put(
    "/{propuesta_id}/referencias",
    response_model=List[FuenteBibliograficaResponse],
    summary="Reemplazar referencias bibliográficas de la propuesta",
    description="Reutiliza FuentesBibliograficas por DOI (o las crea) y reconstruye los vínculos en PropuestaReferencia."
)
def reemplazar_referencias(
    propuesta_id: int,
    datos: ReferenciasUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return guardar_referencias(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )


@router.put(
    "/{propuesta_id}/productos-academicos",
    response_model=List[ProductoAcademicoResponse],
    summary="Reemplazar productos académicos comprometidos",
    description="Reemplaza de forma atómica los productos académicos de la propuesta vinculando TiposProductosAcademicos y ObjetivosEspecificos reales."
)
def reemplazar_productos(
    propuesta_id: int,
    datos: ProductosAcademicosUpdate,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    productos = guardar_productos_academicos(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )
    return [
        ProductoAcademicoResponse(
            productoId=p.getProductoId(),
            propuestaId=p.getPropuestaId(),
            tipoProductoAcademicoId=p.getTipoProductoAcademicoId(),
            descripcion=p.getDescripcion(),
            cantidadComprometida=p.getCantidadComprometida(),
            fechaEntregaEstimada=p.getFechaEntregaEstimada(),
            esPropiedadIndustrial=p.getEsPropiedadIndustrial()
        ) for p in productos
    ]


@router.post(
    "/{propuesta_id}/enviar",
    summary="Enviar propuesta a revisión institucional",
    description="Finaliza la formulación en Borrador y envía formalmente la propuesta a la VIE."
)
def enviar_propuesta(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    propuesta = enviar_propuesta_revision(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId
    )
    return {
        "message": "Propuesta enviada exitosamente a evaluación por la Unidad de Vinculación",
        "codigoPropuesta": propuesta.getCodigoPropuesta(),
        "fechaEnvio": propuesta.getFechaEnvio()
    }


# ==============================================================================
# SUB-MÓDULO: SUBSANACIONES Y OBSERVACIONES DE REVISIÓN
# Flujo: Revisión -> Subsanación -> Corrección por el solicitante -> Reenvío
# ==============================================================================

@router.get(
    "/{propuesta_id}/subsanaciones",
    response_model=List[SubsanacionResponse],
    summary="Listar subsanaciones de la propuesta",
    description="Retorna el historial de observaciones y solicitudes de corrección de la propuesta."
)
def listar_subsanaciones(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return obtener_subsanaciones_propuesta(
        db=db,
        propuesta_id=propuesta_id,
        usuario_id=usuario_actual.usuarioId
    )


@router.post(
    "/{propuesta_id}/subsanaciones/{subsanacion_id}/responder",
    response_model=SubsanacionResponse,
    summary="Responder a una subsanación y reenviar propuesta",
    description="Permite al investigador justificar las correcciones realizadas y reenviar la propuesta a una nueva revisión."
)
def responder_a_subsanacion(
    propuesta_id: int,
    subsanacion_id: int,
    datos: SubsanacionRespuestaRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return responder_subsanacion(
        db=db,
        propuesta_id=propuesta_id,
        subsanacion_id=subsanacion_id,
        usuario_id=usuario_actual.usuarioId,
        datos=datos
    )


@router.post(
    "/{propuesta_id}/subsanaciones/simular",
    response_model=SubsanacionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Devolver propuesta a estado Subsanación (Revisión -> Subsanación)",
    description="Simula el envío de observaciones por parte del revisor o gestor de la VIE para que el investigador pueda corregir y reenviar."
)
def devolver_en_subsanacion(
    propuesta_id: int,
    datos: SubsanacionCrearRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    return solicitar_subsanacion(
        db=db,
        propuesta_id=propuesta_id,
        gestora_id=usuario_actual.usuarioId,
        datos=datos
    )


@router.patch(
    "/{propuesta_id}/cancelar",
    summary="Cancelar propuesta",
    description="Cancela una propuesta siempre que sea Borrador o del coordinador. Pasa al estado CANCELADA (9)."
)
def cancelar_propuesta(
    propuesta_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.propuestas import Propuesta
    from src.models.convocatorias import EstadosPropuesta

    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")

    if propuesta.getInvestigadorCoordId() != usuario_actual.usuarioId:
        raise HTTPException(status_code=403, detail="Solo el investigador coordinador puede cancelar esta propuesta")

    # Obtener estado CANCELADA
    estado_cancelada = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta == "CANCELADA"
    ).first()
    nuevo_estado_id = estado_cancelada.estadoPropuestaId if estado_cancelada else 9

    propuesta.estadoId = nuevo_estado_id
    from datetime import datetime, timezone
    propuesta.ultimaAuditoria = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Propuesta cancelada exitosamente", "propuestaId": propuesta_id, "estadoId": nuevo_estado_id}

