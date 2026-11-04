# src/api/routers/admin/usuarios.py
"""
Rutas del Módulo 5: Administración del Sistema — Usuarios, roles, permisos y accesibilidad.
TODAS las operaciones de escritura incluyen:
- Trazabilidad forense (Logs) con diagnóstico explícito
- sesion.commit() para garantizar la persistencia
- Verificación doble: rol (RBAC) + permiso específico (fine-grained)
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload


from src.api.schemas.admin.comunes import EstadoToggle
from src.api.schemas.admin import usuarios as esquemas
from src.database import get_db
from src.models.roles import RolesSistema, UsuarioRol
from src.models.usuarios import Usuario
from src.services.admin import usuario_service
from src.utils.dependencias import requerir_rol
from src.utils.seguridad import registrar_log_request
from src.utils.permisos import verificar_permiso
from src.utils.dependencias import obtener_usuario_activo, requerir_rol
from src.utils.seguridad import crear_token_acceso 

ROLES_ADMIN = ["SuperAdministrador", "Administrador"]

router = APIRouter()
depende_admin = Depends(requerir_rol(ROLES_ADMIN))




router = APIRouter()


# ============================================================================
# ENDPOINT DE SUPLANTACIÓN (IMPERSONATION)
# ============================================================================
@router.post(
    "/impersonate",
    tags=["Administración - Seguridad"],
    summary="Suplantar rol para pruebas (solo SuperAdministrador)",
    response_description="Nuevo token JWT con el rol simulado"
)
def impersonar_rol(
    cuerpo: dict,  # {"rol_nombre": "InvestigadorCoordinador"}
    usuario_actual: Usuario = Depends(requerir_rol(["SuperAdministrador"])),
    sesion: Session = Depends(get_db)
):
    """
    Permite al SuperAdministrador generar un token temporal con los permisos
    de otro rol, para probar la experiencia de usuario de forma segura.
    
    El token expira en 1 hora y mantiene trazabilidad del usuario original.
    """
    rol_nombre = cuerpo.get("rol_nombre")
    
    if not rol_nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El campo 'rol_nombre' es obligatorio"
        )

    # 1. Verificar que el rol solicitado existe y está activo
    rol = sesion.query(RolesSistema).filter(
        RolesSistema.nombreRol == rol_nombre,
        RolesSistema.activo == True
    ).first()
    
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El rol '{rol_nombre}' no existe o está inactivo"
        )

    # 2. No permitir suplantarse a sí mismo (no tiene sentido)
    if rol_nombre == "SuperAdministrador":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya eres SuperAdministrador. No necesitas suplantar este rol."
        )

    # 3. Generar el token temporal con los datos de suplantación
    ahora = datetime.now(timezone.utc)
    datos_token = {
        "sub": str(usuario_actual.usuarioId),
        "usuarioId": usuario_actual.usuarioId,
        "correo": usuario_actual.correoInstitucional,
        "impersonated": True,
        "rolNombre": rol.nombreRol,
        "rolId": rol.rolId,
        "original_usuarioId": usuario_actual.usuarioId,
        "iat": ahora,
        "exp": ahora + timedelta(hours=1)  # Expira en 1 hora
    }
    
    # Genera el token usando tu función existente
    access_token = crear_token_acceso(datos_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "rolSimulado": rol.nombreRol,
        "expiraEn": "1 hora",
        "mensaje": f"Ahora estás simulando el rol: {rol.nombreRol}"
    }


# ============================================================================
# ENDPOINT PARA VOLVER AL ROL ORIGINAL (opcional, pero recomendado)
# ============================================================================
@router.post(
    "/restore-role",
    tags=["Administración - Seguridad"],
    summary="Restaurar rol original de SuperAdministrador",
    response_description="Mensaje de confirmación"
)
def restaurar_rol(
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Endpoint auxiliar para cuando el frontend quiere confirmar
    que está volviendo al rol original. En realidad el frontend
    simplemente restaura el token guardado en localStorage.
    """
    return {
        "mensaje": "Rol restaurado correctamente",
        "usuario": usuario_actual.correoInstitucional
    }

def _rol_resumen(asignacion) -> esquemas.RolResumen:
    """Transforma una asignación de UsuarioRol al esquema Resumen, extrayendo el nombre del rol de forma segura."""
    rol_obj = getattr(asignacion, 'rol', None)
    
    # Protección: busca el nombre en camelCase o snake_case según cómo esté en tu modelo
    nombre_rol = None
    if rol_obj:
        nombre_rol = getattr(rol_obj, 'nombreRol', None) or getattr(rol_obj, 'nombre_rol', None)
        
    return esquemas.RolResumen(
        usuarioRolId=asignacion.usuarioRolId,
        rolId=asignacion.rolId,
        nombreRol=nombre_rol,
        asignadoEn=asignacion.asignadoEn,
        fechaExpiracion=asignacion.fechaExpiracion,
        activo=asignacion.activo,
    )


def _envoltura(items: list, metadatos: dict, esquema_item: type) -> dict:
    """Envuelve los resultados con metadatos de paginación. Manejo especial para Usuarios."""
    
    # CASO ESPECIAL: UsuarioResponse necesita mapeo manual porque la relación 'roles' es anidada
    if esquema_item == esquemas.UsuarioResponse:
        validated_items = []
        for u in items:
            u_data = {
                "usuarioId": u.usuarioId,
                "correoInstitucional": u.correoInstitucional,
                "nombreUsuario": u.nombreUsuario,
                "apellido1Usuario": u.apellido1Usuario,
                "apellido2Usuario": u.apellido2Usuario,
                "telefono": u.telefono,
                "escuelaId": u.escuelaId,
                "nombreEscuela": getattr(u.escuela, 'nombreEscuela', None) if u.escuela else None,
                
                "fechaCreacion": u.fechaCreacion,
                "ultimoAcceso": u.ultimoAcceso,
                "activo": u.activo,
                "roles": [_rol_resumen(r) for r in (getattr(u, 'roles', []) or [])]
            }
            validated_items.append(esquema_item.model_validate(u_data))
        return {"items": validated_items, **metadatos}
    
    # CASO GENERAL
    return {"items": [esquema_item.model_validate(i) for i in items], **metadatos}

# ============================================================================
# CRUD DE USUARIOS
# ============================================================================

@router.get("/usuarios", tags=["Administración - Usuarios"], summary="Listar usuarios del sistema", dependencies=[depende_admin])
def listar_usuarios(
    sesion: Session = Depends(get_db),
    pagina: int = Query(default=1, ge=1),
    tamanoPagina: int = Query(default=50, ge=1, le=200),
    busqueda: Optional[str] = Query(default=None, max_length=100),
    escuelaId: Optional[int] = None,
    rolId: Optional[int] = None,
    incluirInactivos: bool = False,
):
    items, metadatos = usuario_service.listar_usuarios(
        sesion, pagina=pagina, tamano_pagina=tamanoPagina, busqueda=busqueda,
        escuela_id=escuelaId, rol_id=rolId, incluir_inactivos=incluirInactivos,
    )
    return _envoltura(items, metadatos, esquemas.UsuarioResponse)


@router.post("/usuarios", tags=["Administración - Usuarios"], summary="Crear usuario",
             status_code=status.HTTP_201_CREATED,
             dependencies=[depende_admin, Depends(verificar_permiso("usuarios.crear"))])
def crear_usuario(
    request: Request, 
    cuerpo: esquemas.UsuarioCreate, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    usuario = usuario_service.crear_usuario(sesion, cuerpo.model_dump(exclude_unset=True), admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.USUARIO_CREADO", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} creó el usuario {usuario.correoInstitucional}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario.usuarioId,
        datos_nuevos={"correoInstitucional": usuario.correoInstitucional, "nombreUsuario": usuario.nombreUsuario, "escuelaId": usuario.escuelaId}
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
    
    return esquemas.UsuarioResponse.model_validate(usuario)


@router.get("/usuarios/{usuario_id}", tags=["Administración - Usuarios"], summary="Obtener usuario", dependencies=[depende_admin])
def obtener_usuario(usuario_id: int, sesion: Session = Depends(get_db)):
    return esquemas.UsuarioResponse.model_validate(usuario_service.obtener_usuario(sesion, usuario_id))


@router.patch("/usuarios/{usuario_id}", tags=["Administración - Usuarios"], summary="Actualizar usuario",
              dependencies=[depende_admin, Depends(verificar_permiso("usuarios.actualizar"))])
def actualizar_usuario(
    request: Request, 
    usuario_id: int, 
    cuerpo: esquemas.UsuarioUpdate, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    usuario_previo = usuario_service.obtener_usuario(sesion, usuario_id)
    datos_previos = {"correoInstitucional": usuario_previo.correoInstitucional, "nombreUsuario": usuario_previo.nombreUsuario, "activo": usuario_previo.activo}
    
    usuario = usuario_service.actualizar_usuario(sesion, usuario_id, cuerpo.model_dump(exclude_unset=True), admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.USUARIO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} actualizó el usuario {usuario.correoInstitucional}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario.usuarioId,
        datos_anteriores=datos_previos, datos_nuevos=cuerpo.model_dump(exclude_unset=True)
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
    
    return esquemas.UsuarioResponse.model_validate(usuario)


@router.put("/usuarios/{usuario_id}/estado", tags=["Administración - Usuarios"], summary="Activar/desactivar usuario (soft-delete)",
            dependencies=[depende_admin, Depends(verificar_permiso("usuarios.eliminar"))])
def cambiar_estado_usuario(
    request: Request, 
    usuario_id: int, 
    cuerpo: EstadoToggle, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    usuario = usuario_service.cambiar_activo_usuario(sesion, usuario_id, cuerpo.activo, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.USUARIO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} {'activó' if cuerpo.activo else 'desactivó'} al usuario {usuario.correoInstitucional}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario.usuarioId,
        datos_nuevos={"activo": cuerpo.activo}
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
    
    return esquemas.UsuarioResponse.model_validate(usuario)


@router.put("/usuarios/{usuario_id}/contrasena", tags=["Administración - Usuarios"], summary="Restablecer contraseña de un usuario", status_code=status.HTTP_204_NO_CONTENT,
            dependencies=[depende_admin, Depends(verificar_permiso("usuarios.actualizar"))])
def reset_contrasena(
    request: Request, 
    usuario_id: int, 
    cuerpo: esquemas.ResetContrasenaRequest, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    usuario = usuario_service.obtener_usuario(sesion, usuario_id)
    usuario_service.reset_contrasena(sesion, usuario_id, cuerpo.nuevaContrasena, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.USUARIO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} restableció la contraseña del usuario {usuario.correoInstitucional}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario.usuarioId
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
    
    return None


# ============================================================================
# ROLES ASIGNADOS A UN USUARIO
# ============================================================================

@router.get("/usuarios/{usuario_id}/roles", tags=["Administración - Usuarios"], summary="Roles del usuario", dependencies=[depende_admin])
def roles_usuario(usuario_id: int, sesion: Session = Depends(get_db)):
    asignaciones = usuario_service.roles_de_usuario(sesion, usuario_id)
    return [_rol_resumen(a) for a in asignaciones]


@router.post("/usuarios/{usuario_id}/roles", tags=["Administración - Usuarios"], summary="Asignar rol al usuario", status_code=status.HTTP_201_CREATED,
             dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def asignar_rol(
    request: Request, 
    usuario_id: int, 
    cuerpo: esquemas.AsignacionRolCreate, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    rol = sesion.get(RolesSistema, cuerpo.rolId)
    rol_nombre = rol.nombreRol if rol else f"ID {cuerpo.rolId}"
    
    asignacion = usuario_service.asignar_rol(sesion, usuario_id, cuerpo.rolId, cuerpo.fechaExpiracion, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.ROL_ASIGNADO", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} asignó el rol '{rol_nombre}' al usuario ID {usuario_id}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario_id,
        datos_nuevos={"rolId": cuerpo.rolId, "fechaExpiracion": cuerpo.fechaExpiracion.isoformat() if cuerpo.fechaExpiracion else None}
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
    
    return _rol_resumen(asignacion)


@router.delete("/usuarios/{usuario_id}/roles/{usuario_rol_id}", tags=["Administración - Usuarios"], summary="Revocar rol al usuario", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def revocar_rol(
    request: Request, 
    usuario_id: int, 
    usuario_rol_id: int, 
    sesion: Session = Depends(get_db), 
    admin: Usuario = depende_admin
):
    asignacion = sesion.get(UsuarioRol, usuario_rol_id)
    rol_nombre = asignacion.rol.nombreRol if asignacion and asignacion.rol else f"ID {asignacion.rolId if asignacion else '?'}"
    
    usuario_service.revocar_rol(sesion, usuario_id, usuario_rol_id, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.ROL_REMOVIDO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} revocó el rol '{rol_nombre}' al usuario ID {usuario_id}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario_id,
        datos_anteriores={"usuario_rol_id": usuario_rol_id}
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
    
    return None


# ============================================================================
# CATÁLOGO DE ROLES DEL SISTEMA
# ============================================================================

@router.get("/roles", tags=["Administración - Roles"], summary="Listar roles del sistema", dependencies=[depende_admin])
def listar_roles(sesion: Session = Depends(get_db), incluirInactivos: bool = False):
    roles = usuario_service.listar_roles(sesion, incluir_inactivos=incluirInactivos)
    return [esquemas.RolResponse.model_validate(r) for r in roles]


@router.post("/roles", tags=["Administración - Roles"], summary="Crear rol", status_code=status.HTTP_201_CREATED,
             dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def crear_rol(request: Request, cuerpo: esquemas.RolCreate, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    rol = usuario_service.crear_rol(sesion, cuerpo.model_dump(exclude_unset=True), admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} creó el rol '{rol.nombreRol}'",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=rol.rolId,
        datos_nuevos={"nombreRol": rol.nombreRol, "descripcionRol": rol.descripcionRol}
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
    
    return esquemas.RolResponse.model_validate(rol)


@router.patch("/roles/{rol_id}", tags=["Administración - Roles"], summary="Actualizar rol",
              dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def actualizar_rol(request: Request, rol_id: int, cuerpo: esquemas.RolUpdate, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    rol = usuario_service.actualizar_rol(sesion, rol_id, cuerpo.model_dump(exclude_unset=True), admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} actualizó el rol '{rol.nombreRol}'",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=rol.rolId,
        datos_nuevos=cuerpo.model_dump(exclude_unset=True)
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
    
    return esquemas.RolResponse.model_validate(rol)


@router.put("/roles/{rol_id}/estado", tags=["Administración - Roles"], summary="Activar/desactivar rol",
            dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def cambiar_estado_rol(request: Request, rol_id: int, cuerpo: EstadoToggle, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    rol = usuario_service.cambiar_activo_rol(sesion, rol_id, cuerpo.activo, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} {'activó' if cuerpo.activo else 'desactivó'} el rol '{rol.nombreRol}'",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=rol.rolId,
        datos_nuevos={"activo": cuerpo.activo}
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
    
    return esquemas.RolResponse.model_validate(rol)


# ============================================================================
# PERMISOS
# ============================================================================

@router.get("/permisos", tags=["Administración - Permisos"], summary="Listar permisos", dependencies=[depende_admin])
def listar_permisos(sesion: Session = Depends(get_db), moduloId: Optional[int] = None):
    permisos = usuario_service.listar_permisos(sesion, modulo_id=moduloId)
    return [esquemas.PermisoResponse.model_validate(p) for p in permisos]


@router.post("/permisos", tags=["Administración - Permisos"], summary="Crear permiso", status_code=status.HTTP_201_CREATED,
             dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def crear_permiso(request: Request, cuerpo: esquemas.PermisoCreate, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    permiso = usuario_service.crear_permiso(sesion, cuerpo.model_dump(exclude_unset=True), admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} creó el permiso '{permiso.nombrePermiso}'",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=permiso.permisoId,
        datos_nuevos={"nombrePermiso": permiso.nombrePermiso, "moduloId": permiso.moduloId}
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
    
    return esquemas.PermisoResponse.model_validate(permiso)


@router.get("/roles/{rol_id}/permisos", tags=["Administración - Permisos"], summary="Permisos de un rol", dependencies=[depende_admin])
def permisos_rol(rol_id: int, sesion: Session = Depends(get_db)):
    return esquemas.RolPermisosResponse(rolId=rol_id, permisoIds=usuario_service.permisos_de_rol(sesion, rol_id))


@router.put("/roles/{rol_id}/permisos", tags=["Administración - Permisos"], summary="Reemplazar el set completo de permisos de un rol",
            dependencies=[depende_admin, Depends(verificar_permiso("roles.gestionar"))])
def reemplazar_permisos_rol(request: Request, rol_id: int, cuerpo: esquemas.RolPermisosAsignar, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    ids = usuario_service.reemplazar_permisos_rol(sesion, rol_id, cuerpo.permisoIds, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} reemplazó los permisos del rol ID {rol_id}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=rol_id,
        datos_nuevos={"permisoIds": ids}
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
    
    return esquemas.RolPermisosResponse(rolId=rol_id, permisoIds=ids)


# ============================================================================
# ACCESIBILIDAD (WCAG 2.1 AA)
# ============================================================================

@router.get("/accesibilidad/{usuario_id}", tags=["Administración - Accesibilidad"], summary="Preferencias de accesibilidad de un usuario", dependencies=[depende_admin])
def obtener_preferencias(usuario_id: int, sesion: Session = Depends(get_db)):
    preferencia = usuario_service.obtener_preferencias(sesion, usuario_id)
    if preferencia is None:
        return None
    return {
        "usuarioId": preferencia.usuarioId,
        "modoAltoContraste": preferencia.modoAltoContraste,
        "tamanioFuenteId": preferencia.tamanioFuenteId,
        "filtroDaltonismoId": preferencia.filtroDaltonismoId,
        "reducirAnimaciones": preferencia.reducirAnimaciones,
        "optimizarLectorPantalla": preferencia.optimizarLectorPantalla,
    }


@router.put("/accesibilidad/{usuario_id}", tags=["Administración - Accesibilidad"], summary="Guardar preferencias de accesibilidad",
            dependencies=[depende_admin, Depends(verificar_permiso("accesibilidad.gestionar"))])
def guardar_preferencias(request: Request, usuario_id: int, cuerpo: dict, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    permitidos = {"modoAltoContraste", "tamanioFuenteId", "filtroDaltonismoId", "reducirAnimaciones", "optimizarLectorPantalla"}
    datos = {k: v for k, v in cuerpo.items() if k in permitidos}
    preferencia = usuario_service.guardar_preferencias(sesion, usuario_id, datos, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ACCESIBILIDAD.CONFIGURADA", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} actualizó las preferencias de accesibilidad del usuario ID {usuario_id}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=usuario_id,
        datos_nuevos=datos
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
    
    return {
        "usuarioId": preferencia.usuarioId,
        "modoAltoContraste": preferencia.modoAltoContraste,
        "tamanioFuenteId": preferencia.tamanioFuenteId,
        "filtroDaltonismoId": preferencia.filtroDaltonismoId,
        "reducirAnimaciones": preferencia.reducirAnimaciones,
        "optimizarLectorPantalla": preferencia.optimizarLectorPantalla,
    }


# ============================================================================
# ASIGNACIONES GESTORA VIE ↔ ESCUELA
# ============================================================================

@router.get("/asignaciones-gestora", tags=["Administración - Gestoría"], summary="Listar asignaciones de gestoras VIE", dependencies=[depende_admin])
def listar_asignaciones(sesion: Session = Depends(get_db), escuelaId: Optional[int] = None):
    asignaciones = usuario_service.listar_asignaciones_gestora(sesion, escuela_id=escuelaId)
    return [esquemas.AsignacionGestoraResponse.model_validate(a) for a in asignaciones]


@router.post("/asignaciones-gestora", tags=["Administración - Gestoría"], summary="Asignar gestora VIE a una escuela", status_code=status.HTTP_201_CREATED,
             dependencies=[depende_admin, Depends(verificar_permiso("gestoria.gestionar"))])
def asignar_gestora(request: Request, cuerpo: esquemas.AsignacionGestoraCreate, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    asignacion = usuario_service.asignar_gestora(sesion, cuerpo.escuelaId, cuerpo.gestoraVIEId, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="INFO", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} asignó la gestora VIE ID {cuerpo.gestoraVIEId} a la escuela ID {cuerpo.escuelaId}",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=cuerpo.escuelaId,
        datos_nuevos={"gestoraVIEId": cuerpo.gestoraVIEId, "escuelaId": cuerpo.escuelaId}
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
    
    return esquemas.AsignacionGestoraResponse.model_validate(asignacion)


@router.delete("/asignaciones-gestora/{asignacion_id}", tags=["Administración - Gestoría"], summary="Revocar asignación de gestora", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[depende_admin, Depends(verificar_permiso("gestoria.gestionar"))])
def revocar_asignacion(request: Request, asignacion_id: int, sesion: Session = Depends(get_db), admin: Usuario = depende_admin):
    usuario_service.revocar_asignacion_gestora(sesion, asignacion_id, admin.usuarioId)
    
    log_result = registrar_log_request(
        sesion, request, evento="ADMIN.CATALOGO_MODIFICADO", severidad="WARNING", source="API_Backend",
        descripcion=f"{admin.correoInstitucional} revocó la asignación de gestora VIE (ID {asignacion_id})",
        usuario_id=admin.usuarioId, objeto1="Usuario", referencia_id_1=asignacion_id
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
    
    return None