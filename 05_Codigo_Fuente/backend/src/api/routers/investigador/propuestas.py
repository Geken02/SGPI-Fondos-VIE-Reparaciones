from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.models.usuarios import Usuario
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
    PropuestaDetalleResponse
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
    solicitar_subsanacion
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
    return PropuestaResumenResponse(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        estadoId=propuesta.getEstadoId(),
        nombreEstado="Borrador",
        etapaId=propuesta.getEtapaId(),
        convocatoriaId=propuesta.getConvocatoriaId(),
        escuelaId=propuesta.getEscuelaId(),
        montoTotal=propuesta.getMontoTotal(),
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        fechaCreacion=propuesta.getFechaCreacion(),
        fechaEnvio=propuesta.getFechaEnvio()
    )


@router.get(
    "/catalogos/formulario",
    summary="Obtener catálogos de convocatorias y escuelas para creación de propuestas"
)
def obtener_catalogos_formulario(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    from src.models.convocatorias import Convocatorias
    from src.models.escuelas import Escuela
    from src.models.usuarios import Usuario
    from src.models.propuesta_equipo import RolesEquipo
    from datetime import date

    hoy = date.today()
    convocatorias = db.query(Convocatorias).order_by(Convocatorias.fechaCierre.desc()).all()
    escuelas = db.query(Escuela).filter(Escuela.activo == True).order_by(Escuela.nombreEscuela).all()
    investigadores = db.query(Usuario).filter(Usuario.activo == True).order_by(Usuario.nombreUsuario).all()
    roles_equipo = db.query(RolesEquipo).filter(RolesEquipo.activo == True).all()

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
                "codigoEscuela": e.codigoEscuela
            } for e in escuelas
        ],
        "investigadores": [
            {
                "usuarioId": u.usuarioId,
                "nombreCompleto": f"{u.nombreUsuario} {u.apellido1Usuario} {u.apellido2Usuario or ''}".strip(),
                "nombre": u.nombreUsuario,
                "apellido1": u.apellido1Usuario,
                "correo": u.correoInstitucional,
                "escuelaId": u.escuelaId,
                "escuela": u.escuela.nombreEscuela if u.escuela else "TEC"
            } for u in investigadores
        ],
        "rolesEquipo": [
            {
                "rolEquipoId": r.rolEquipoId,
                "nombreRol": r.nombreRol
            } for r in roles_equipo
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
    return PropuestaResumenResponse(
        propuestaId=propuesta.getPropuestaId(),
        codigoPropuesta=propuesta.getCodigoPropuesta(),
        titulo=propuesta.getTitulo(),
        estadoId=propuesta.getEstadoId(),
        nombreEstado="Borrador",
        etapaId=propuesta.getEtapaId(),
        convocatoriaId=propuesta.getConvocatoriaId(),
        escuelaId=propuesta.getEscuelaId(),
        montoTotal=propuesta.getMontoTotal(),
        nivelTrlActual=propuesta.getNivelTrlActual(),
        nivelTrlEsperado=propuesta.getNivelTrlEsperado(),
        fechaCreacion=propuesta.getFechaCreacion(),
        fechaEnvio=propuesta.getFechaEnvio()
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

