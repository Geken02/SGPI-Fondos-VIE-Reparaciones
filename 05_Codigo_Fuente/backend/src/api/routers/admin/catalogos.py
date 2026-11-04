# src/api/routers/admin/catalogos.py
"""
Rutas del Módulo 5: Administración del Sistema — Catálogos dinámicos.
Se genera automáticamente un CRUD REST completo (listar / obtener / crear / actualizar /
activar-desactivar) por cada descriptor definido en catalogo_service.DESCRIPTORES, con
validaciones de negocio específicas para Convocatorias, Etapas y Configuraciones.
Respuestas paginadas: { items: [...], total, pagina, tamanoPagina, totalPaginas }

Seguridad: Doble capa de verificación (rol RBAC + permiso granular) en todas las
operaciones de escritura.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session
from typing import Any, Dict, Tuple

from src.api.schemas.admin.comunes import EstadoToggle
from src.api.schemas.admin import catalogos as esquemas
from src.database import get_db
from src.models.usuarios import Usuario
from src.services.admin import catalogo_service
from src.utils.dependencias import requerir_rol
from src.utils.seguridad import registrar_log_request
from src.utils.permisos import verificar_permiso  

ROLES_ADMIN = ["SuperAdministrador", "Administrador"]
router = APIRouter()

# ============================================================================
# MAPEO DE ESQUEMAS POR CATÁLOGO
# ============================================================================

MAPEO_ESQUEMAS: Dict[str, Tuple[Any, Any, Any]] = {
    "lineas-investigacion": (esquemas.LineaCreate, esquemas.LineaUpdate, esquemas.LineaResponse),
    "tipos-hora": (esquemas.TipoHoraCreate, esquemas.TipoHoraUpdate, esquemas.TipoHoraResponse),
    "niveles-trl": (esquemas.NivelTrlCreate, esquemas.NivelTrlUpdate, esquemas.NivelTrlResponse),
    "modalidades": (esquemas.ModalidadCreate, esquemas.ModalidadUpdate, esquemas.ModalidadResponse),
    "tipos-innovacion": (esquemas.TipoInnovacionCreate, esquemas.TipoInnovacionUpdate, esquemas.TipoInnovacionResponse),
    "roles-equipo": (esquemas.RolEquipoCreate, esquemas.RolEquipoUpdate, esquemas.RolEquipoResponse),
    "tipos-responsabilidad": (esquemas.TipoResponsabilidadCreate, esquemas.TipoResponsabilidadUpdate, esquemas.TipoResponsabilidadResponse),
    "rubros": (esquemas.RubroCreate, esquemas.RubroUpdate, esquemas.RubroResponse),
    "tipos-documento": (esquemas.TipoDocumentoCreate, esquemas.TipoDocumentoUpdate, esquemas.TipoDocumentoResponse),
    "tipos-financiamiento": (esquemas.TipoFinanciamientoCreate, esquemas.TipoFinanciamientoUpdate, esquemas.TipoFinanciamientoResponse),
    "entidades-emisoras": (esquemas.EntidadEmisoraCreate, esquemas.EntidadEmisoraUpdate, esquemas.EntidadEmisoraResponse),
    "entes-regulatorios": (esquemas.EnteRegulatorioCreate, esquemas.EnteRegulatorioUpdate, esquemas.EnteRegulatorioResponse),
    "estados-aval": (esquemas.EstadoAvalCreate, esquemas.EstadoAvalUpdate, esquemas.EstadoAvalResponse),
    "estados-subsanacion": (esquemas.EstadoSubsanacionCreate, esquemas.EstadoSubsanacionUpdate, esquemas.EstadoSubsanacionResponse),
    "tipos-acuerdo": (esquemas.TipoAcuerdoCreate, esquemas.TipoAcuerdoUpdate, esquemas.TipoAcuerdoResponse),
    "tipos-producto": (esquemas.TipoProductoAcademicoCreate, esquemas.TipoProductoAcademicoUpdate, esquemas.TipoProductoAcademicoResponse),
    "tipos-evaluacion": (esquemas.TipoEvaluacionCreate, esquemas.TipoEvaluacionUpdate, esquemas.TipoEvaluacionResponse),
    "tipos-recomendacion": (esquemas.TipoRecomendacionCreate, esquemas.TipoRecomendacionUpdate, esquemas.TipoRecomendacionResponse),
    "estados-evaluacion": (esquemas.EstadoEvaluacionCreate, esquemas.EstadoEvaluacionUpdate, esquemas.EstadoEvaluacionResponse),
    "tipos-dictamen": (esquemas.TipoDictamenCreate, esquemas.TipoDictamenUpdate, esquemas.TipoDictamenResponse),
    "campus": (esquemas.CampusCreate, esquemas.CampusUpdate, esquemas.CampusResponse),
    "escuelas": (esquemas.EscuelaCreate, esquemas.EscuelaUpdate, esquemas.EscuelaResponse),
    "estados-propuesta": (esquemas.EstadoPropuestaCreate, esquemas.EstadoPropuestaUpdate, esquemas.EstadoPropuestaResponse),
    "modulos": (esquemas.ModuloCreate, esquemas.ModuloUpdate, esquemas.ModuloResponse),
    "tamanios-fuente": (esquemas.TamanoFuenteCreate, esquemas.TamanoFuenteUpdate, esquemas.TamanoFuenteResponse),
    "filtros-daltonismo": (esquemas.FiltroDaltonismoCreate, esquemas.FiltroDaltonismoUpdate, esquemas.FiltroDaltonismoResponse),
    "configuraciones": (esquemas.ConfiguracionCreate, esquemas.ConfiguracionUpdate, esquemas.ConfiguracionResponse),
    "convocatorias": (esquemas.ConvocatoriaCreate, esquemas.ConvocatoriaUpdate, esquemas.ConvocatoriaResponse),
    "etapas": (esquemas.EtapaCreate, esquemas.EtapaUpdate, esquemas.EtapaResponse),
}

# Validar integridad del mapeo
for clave in catalogo_service.DESCRIPTORES:
    if clave not in MAPEO_ESQUEMAS:
        raise RuntimeError(f"Falta mapeo de esquemas para el catálogo '{clave}' en routers/admin/catalogos.py")


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def _jsonable(d: dict) -> dict:
    """Convierte valores no serializables como JSON (datetime) a texto para la bitácora."""
    from datetime import date, datetime as dt
    salida = {}
    for k, v in d.items():
        if isinstance(v, (dt, date)):
            salida[k] = v.isoformat()
        elif isinstance(v, bool) or v is None or isinstance(v, (int, float, str)):
            salida[k] = v
        else:
            salida[k] = str(v)
    return salida

def _serializar(clave: str, registro, esquema_item: type):
    """Valida el esquema; enriquece con datos relacionados si es necesario."""
    # Primero, obtener todos los atributos del registro SQLAlchemy
    datos_raw = {
        column.key: getattr(registro, column.key, None)
        for column in registro.__table__.columns
    }
    
    # Intentar usar el esquema Pydantic
    try:
        datos = esquema_item.model_validate(registro).model_dump()
    except Exception:
        # Si falla, usar los datos raw
        datos = datos_raw
    
    # Enriquecimiento específico para escuelas
    if clave == "escuelas" and getattr(registro, "campus", None) is not None:
        datos["nombreCampus"] = registro.campus.nombreCampus
    
    # Si falta el campo "nombre" o similar, buscarlo en los datos raw
    campos_nombre_posibles = ['nombre', 'nombreLinea', 'nombrelinea', 'nombreRol', 'nombrerol', 
                              'nombreModalidad', 'nombremodalidad', 'descripcion', 'descripcionNivel',
                              'descripcionnivel', 'codigoTipo', 'codigotipo', 'claveConfig', 'claveconfig']
    
    for campo in campos_nombre_posibles:
        if campo in datos_raw and campo not in datos:
            datos[campo] = datos_raw[campo]
    
    return datos


def _envoltura(clave: str, items: list, metadatos: dict, esquema_item: type) -> dict:
    return {"items": [_serializar(clave, i, esquema_item) for i in items], **metadatos}


def _validaciones_especificas(clave: str, datos: dict, sesion: Session, existente=None) -> None:
    if clave == "convocatorias":
        catalogo_service.validar_convocatoria(datos, existente)
    elif clave == "etapas":
        catalogo_service.validar_etapa(datos, sesion, existente)


# ============================================================================
# GENERADOR DINÁMICO DE RUTAS CRUD
# ============================================================================

def registrar_rutas_catalogo(clave: str) -> None:
    """Crea y monta el CRUD REST de un catálogo dinámico sobre el router principal."""
    descriptor = catalogo_service.DESCRIPTORES[clave]
    esquema_crear, esquema_actualizar, esquema_response = MAPEO_ESQUEMAS[clave]
    depende_admin = Depends(requerir_rol(ROLES_ADMIN))
    
    # ✅ NUEVA DEPENDENCIA: Verificación de permiso granular
    depende_permiso = Depends(verificar_permiso("catalogos.gestionar"))

    # Eventos de auditoría específicos según el catálogo
    if clave == "convocatorias":
        EVENTO_CREAR = "ADMIN.CONVOCATORIA_CREADA"      # ID 56
    elif clave == "etapas":
        EVENTO_CREAR = "ADMIN.ETAPA_CONFIGURADA"        # ID 57
    else:
        EVENTO_CREAR = "ADMIN.CATALOGO_CREADO"          # ID 71
    
    EVENTO_ACTUALIZAR = "ADMIN.CATALOGO_MODIFICADO"     # ID 55
    EVENTO_CAMBIAR_ESTADO = "ADMIN.CATALOGO_MODIFICADO" # ID 55

    # -------------------------------------------------------------------------
    # LISTAR (GET) - Solo requiere rol admin
    # -------------------------------------------------------------------------
    @router.get(f"/{clave}", tags=["Administración - Catálogos"], summary=f"Listar {descriptor.nombre}",
                 dependencies=[depende_admin])
    def listar_registros(
        sesion: Session = Depends(get_db),
        pagina: int = Query(default=1, ge=1),
        tamanoPagina: int = Query(default=50, ge=1, le=200),
        busqueda: Optional[str] = Query(default=None, max_length=100),
        incluirInactivos: bool = Query(default=False),
    ):
        items, metadatos = catalogo_service.listar(
            sesion, descriptor, pagina=pagina, tamano_pagina=tamanoPagina,
            busqueda=busqueda, incluir_inactivos=incluirInactivos,
        )
        return _envoltura(clave, items, metadatos, esquema_response)

    # -------------------------------------------------------------------------
    # OBTENER POR ID (GET) - Solo requiere rol admin
    # -------------------------------------------------------------------------
    @router.get(f"/{clave}/{{registro_id}}", tags=["Administración - Catálogos"], summary=f"Obtener {descriptor.nombre}",
                 dependencies=[depende_admin])
    def obtener_registro(registro_id: int, sesion: Session = Depends(get_db)):
        registro = catalogo_service.obtener(sesion, descriptor, registro_id)
        return _serializar(clave, registro, esquema_response)

    # -------------------------------------------------------------------------
    # CREAR (POST) - Requiere rol admin + permiso "catalogos.gestionar"
    # -------------------------------------------------------------------------
    @router.post(f"/{clave}", tags=["Administración - Catálogos"], summary=f"Crear {descriptor.nombre}",
              status_code=status.HTTP_201_CREATED, 
              dependencies=[depende_admin, depende_permiso])  # ✅ DOBLE VERIFICACIÓN
    def crear_registro(request: Request, cuerpo: esquema_crear, usuario: Usuario = depende_admin,
                    sesion: Session = Depends(get_db)):
        datos = cuerpo.model_dump(exclude_unset=True)
        _validaciones_especificas(clave, datos, sesion)
        registro = catalogo_service.crear(sesion, descriptor, datos, usuario.usuarioId)
        
        print(f"\n{'='*60}")
        print(f"🔍 DIAGNÓSTICO DE LOG - Catálogo: {clave}")
        print(f"{'='*60}")
        
        log_result = registrar_log_request(
            sesion, request, evento=EVENTO_CREAR,
            severidad="INFO", source="API_Backend",
            descripcion=f"{usuario.correoInstitucional} creó {descriptor.nombre} #{getattr(registro, descriptor.pk)} en catálogo '{clave}'",
            usuario_id=usuario.usuarioId, objeto1="Usuario", referencia_id_1=getattr(registro, descriptor.pk),
            datos_nuevos=_jsonable(datos),  # 👈 SOLUCIÓN: Usar la función que ya tienes
        )
        
        print(f"registrar_log_request retornó: {log_result}")
        if log_result:
            print(f"   logId: {log_result.logId}")
            print(f"   Estado sesión antes de commit: {sesion.is_active}")
        
        try:
            print(f"Ejecutando sesion.commit()...")
            sesion.commit()
            print(f"Commit exitoso")
        except Exception as e:
            print(f"ERROR EN COMMIT: {type(e).__name__}: {e}")
            sesion.rollback()
            raise
        
        if log_result:
            from src.models.logs import Logs
            log_persistido = sesion.get(Logs, log_result.logId)
            if log_persistido:
                print(f"Log persistido en BD con ID: {log_persistido.logId}")
            else:
                print(f"Log NO persistió en BD (ID {log_result.logId} no encontrado)")
        
        print(f"{'='*60}\n")
        
        return _serializar(clave, registro, esquema_response)

    # -------------------------------------------------------------------------
    # ACTUALIZAR (PATCH) - Requiere rol admin + permiso "catalogos.gestionar"
    # -------------------------------------------------------------------------
    @router.patch(f"/{clave}/{{registro_id}}", tags=["Administración - Catálogos"], summary=f"Actualizar {descriptor.nombre}",
                   dependencies=[depende_admin, depende_permiso])  # ✅ DOBLE VERIFICACIÓN
    def actualizar_registro(
        request: Request, 
        registro_id: int, 
        cuerpo: esquema_actualizar,  # type: ignore[reportInvalidTypeForm]
        usuario: Usuario = depende_admin, 
        sesion: Session = Depends(get_db)
    ):
        existente = catalogo_service.obtener(sesion, descriptor, registro_id)
        datos = cuerpo.model_dump(exclude_unset=True)
        _validaciones_especificas(clave, datos, sesion, existente)
        
        antes = {k: getattr(existente, k, None) for k in datos}
        registro = catalogo_service.actualizar(sesion, descriptor, registro_id, datos, usuario.usuarioId)
        
        log_result = registrar_log_request(
            sesion, request, 
            evento=EVENTO_ACTUALIZAR,  
            severidad="WARNING", source="API_Backend",
            descripcion=f"{usuario.correoInstitucional} actualizó {descriptor.nombre} #{registro_id} en catálogo '{clave}'",
            usuario_id=usuario.usuarioId, objeto1="Usuario", referencia_id_1=registro_id,
            datos_anteriores=_jsonable(antes), datos_nuevos=_jsonable(datos),
        )
        print(f"registrar_log_request retornó: {log_result}")
        if log_result:
            print(f"   logId: {log_result.logId}")
            print(f"   Estado sesión antes de commit: {sesion.is_active}")
        
        try:
            print(f"Ejecutando sesion.commit()...")
            sesion.commit()
            print(f"Commit exitoso")
        except Exception as e:
            print(f"ERROR EN COMMIT: {type(e).__name__}: {e}")
            sesion.rollback()
            raise
        return _serializar(clave, registro, esquema_response)

    # -------------------------------------------------------------------------
    # CAMBIAR ESTADO (PUT) - Requiere rol admin + permiso "catalogos.gestionar"
    # -------------------------------------------------------------------------
    @router.put(f"/{clave}/{{registro_id}}/estado", tags=["Administración - Catálogos"],
                 summary=f"Activar/desactivar {descriptor.nombre} (soft-delete)", 
                 dependencies=[depende_admin, depende_permiso])  # ✅ DOBLE VERIFICACIÓN
    def cambiar_estado(
        request: Request, 
        registro_id: int, 
        cuerpo: EstadoToggle,
        usuario: Usuario = depende_admin, 
        sesion: Session = Depends(get_db)
    ):
        registro = catalogo_service.cambiar_activo(sesion, descriptor, registro_id, cuerpo.activo, usuario.usuarioId)
        
        log_result = registrar_log_request(
            sesion, request, 
            evento=EVENTO_CAMBIAR_ESTADO, 
            severidad="WARNING", source="API_Backend",
            descripcion=f"{usuario.correoInstitucional} {'activó' if cuerpo.activo else 'desactivó'} {descriptor.nombre} #{registro_id} en catálogo '{clave}'",
            usuario_id=usuario.usuarioId, objeto1="Usuario", referencia_id_1=registro_id,
            datos_nuevos={"activo": cuerpo.activo},
        )

        print(f"registrar_log_request retornó: {log_result}")
        if log_result:
            print(f"   logId: {log_result.logId}")
            print(f"   Estado sesión antes de commit: {sesion.is_active}")
        
        try:
            print(f"Ejecutando sesion.commit()...")
            sesion.commit()
            print(f"Commit exitoso")
        except Exception as e:
            print(f"ERROR EN COMMIT: {type(e).__name__}: {e}")
            sesion.rollback()
            raise
        return _serializar(clave, registro, esquema_response)


# Registrar todas las rutas de catálogos dinámicos
for _clave in catalogo_service.DESCRIPTORES:
    registrar_rutas_catalogo(_clave)