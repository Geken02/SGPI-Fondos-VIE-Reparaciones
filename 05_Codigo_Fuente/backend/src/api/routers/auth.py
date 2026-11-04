"""
Router de autenticación del SGPI (Fondos VIE — TEC).
Eventos de bitácora alineados con el script de 70 eventos (TiposEvento).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.api.schemas import auth as esquemas
from src.database import get_db
from src.models.escuelas import Escuela
from src.api.schemas.auth import (
    SolicitudLogin,
    RespuestaToken,
    RespuestaPerfil,
    SolicitudActualizarPerfil,
    SolicitudRecuperacionContrasena,
    RespuestaRecuperacionContrasena,
    SolicitudResetConToken,
    RespuestaResetConToken
)
from src.services.auth_service import (
    autenticar_usuario,
    obtener_roles_usuario,
    generar_token_para_usuario,
    generar_token_recuperacion,
    validar_token_recuperacion,
    resetear_contrasena_con_token,
    MINUTOS_EXPIRACION_TOKEN
)
from src.models.roles import RolesSistema, UsuarioRol
from src.models.usuarios import Usuario
from src.services import auth_service
from src.utils.dependencias import obtener_usuario_actual
from src.utils.seguridad import registrar_log_request

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# ============================================================================
# LOGIN / ME / PERFIL / LOGOUT
# ============================================================================

@router.post("/login", response_model=esquemas.RespuestaToken)
def login(request: Request, cuerpo: esquemas.SolicitudLogin, sesion: Session = Depends(get_db)):
    usuario, error = auth_service.autenticar_usuario(sesion, cuerpo.correo, cuerpo.contrasena)
    if error or usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    roles = auth_service.obtener_roles_usuario(sesion, usuario.usuarioId)
    token = auth_service.generar_token_para_usuario(usuario, roles)

    # ✅ EVENTO: AUTH.LOGIN_EXITOSO (ID 1)
    registrar_log_request(
        sesion, request, evento="AUTH.LOGIN_EXITOSO", severidad="INFO", source="API_Backend",
        descripcion=f"Inicio de sesión exitoso: {usuario.correoInstitucional}",
        usuario_id=usuario.usuarioId, objeto1="Usuario", referencia_id_1=usuario.usuarioId,
    )
    sesion.commit()
    return esquemas.RespuestaToken(token_acceso=token, tipo_token="bearer")


@router.get("/me")
def yo(usuario: Usuario = Depends(obtener_usuario_actual)):
    return usuario


@router.get("/perfil", response_model=esquemas.RespuestaPerfil)
def obtener_perfil(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    sesion_bd: Session = Depends(get_db),
):
    asignaciones = sesion_bd.query(UsuarioRol).filter(
        UsuarioRol.usuarioId == usuario_actual.usuarioId,
        UsuarioRol.activo.is_(True)
    ).all()
    
    roles_obj = []
    for asignacion in asignaciones:
        rol = sesion_bd.query(RolesSistema).filter(RolesSistema.rolId == asignacion.rolId).first()
        if rol:
            roles_obj.append(esquemas.RolResumen(
                rolId=rol.rolId,
                nombreRol=rol.nombreRol,
                descripcionRol=rol.descripcionRol,
            ))

    nombre_escuela = None
    if usuario_actual.escuelaId:
        escuela = sesion_bd.query(Escuela).filter(Escuela.escuelaId == usuario_actual.escuelaId).first()
        if escuela:
            nombre_escuela = escuela.nombreEscuela

    return esquemas.RespuestaPerfil(
        usuarioId=usuario_actual.usuarioId,
        correoInstitucional=usuario_actual.correoInstitucional,
        nombreUsuario=usuario_actual.nombreUsuario,
        apellido1Usuario=usuario_actual.apellido1Usuario,
        apellido2Usuario=usuario_actual.apellido2Usuario,
        telefono=usuario_actual.telefono,
        escuelaId=usuario_actual.escuelaId,
        nombreEscuela=nombre_escuela,
        roles=roles_obj,
        activo=usuario_actual.activo,
        fechaCreacion=usuario_actual.fechaCreacion,
        ultimoAcceso=usuario_actual.ultimoAcceso,
    )


@router.put(
    "/perfil",
    response_model=esquemas.RespuestaPerfil,
    summary="Actualizar perfil del usuario autenticado",
    description="Permite modificar el nombre, apellidos y teléfono del usuario autenticado y guardarlos en la base de datos."
)
def actualizar_perfil_usuario(
    datos: esquemas.SolicitudActualizarPerfil,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    sesion_bd: Session = Depends(get_db)
):
    if datos.nombre is not None and len(datos.nombre.strip()) > 0:
        usuario_actual.nombreUsuario = datos.nombre.strip()
    if datos.apellido1 is not None and len(datos.apellido1.strip()) > 0:
        usuario_actual.apellido1Usuario = datos.apellido1.strip()
    if datos.apellido2 is not None:
        usuario_actual.apellido2Usuario = datos.apellido2.strip()
    if datos.telefono is not None:
        usuario_actual.telefono = datos.telefono.strip()
    
    usuario_actual.ultimaAuditoria = datetime.now(timezone.utc)
    usuario_actual.usuarioAuditoriaId = usuario_actual.usuarioId
    
    sesion_bd.commit()
    sesion_bd.refresh(usuario_actual)
    
    roles = obtener_roles_usuario(sesion_bd=sesion_bd, usuario_id=usuario_actual.usuarioId)
    nombre_escuela = None
    if usuario_actual.escuelaId:
        escuela = sesion_bd.query(Escuela).filter(Escuela.escuelaId == usuario_actual.escuelaId).first()
        if escuela:
            nombre_escuela = escuela.nombreEscuela

    # CORREGIDO: Usar los mismos nombres de campo en camelCase que en obtener_perfil
    return esquemas.RespuestaPerfil(
        usuarioId=usuario_actual.usuarioId,
        correoInstitucional=usuario_actual.correoInstitucional,
        nombreUsuario=usuario_actual.nombreUsuario,
        apellido1Usuario=usuario_actual.apellido1Usuario,
        apellido2Usuario=usuario_actual.apellido2Usuario,
        telefono=usuario_actual.telefono,
        escuelaId=usuario_actual.escuelaId,
        nombreEscuela=nombre_escuela,
        roles=roles,
        activo=usuario_actual.activo,
        fechaCreacion=usuario_actual.fechaCreacion,
        ultimoAcceso=usuario_actual.ultimoAcceso
    )


# ============================================================
# ENDPOINTS PARA "OLVIDÉ MI CONTRASEÑA"
# ============================================================
@router.post("/logout", summary="Cerrar sesión")
def logout(
    request: Request,
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
    sesion_bd: Session = Depends(get_db),
):
    # ✅ EVENTO: AUTH.LOGOUT (ID 3)
    registrar_log_request(
        sesion_bd, request, evento="AUTH.LOGOUT", severidad="INFO", source="API_Backend",
        descripcion=f"Cierre de sesión: {usuario_actual.correoInstitucional}",
        usuario_id=usuario_actual.usuarioId, objeto1="Usuario", referencia_id_1=usuario_actual.usuarioId,
    )
    sesion_bd.commit()
    return {"mensaje": "Sesión cerrada correctamente"}


# ============================================================================
# FLUJO "OLVIDÉ MI CONTRASEÑA" (Usando BD, no memoria)
# ============================================================================

@router.post("/recuperacion", response_model=esquemas.RespuestaRecuperacionContrasena)
def solicitar_recuperacion_contrasena(
    solicitud: esquemas.SolicitudRecuperacionContrasena,
    request: Request,
    sesion_bd: Session = Depends(get_db),
):
    token, mensaje = auth_service.generar_token_recuperacion(
        sesion_bd=sesion_bd,
        correo=solicitud.correoInstitucional,
        ip_solicitud=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    if token is None:
        return esquemas.RespuestaRecuperacionContrasena(
            mensaje="Si el correo está registrado, recibirá un enlace de recuperación.",
            correoDestino=solicitud.correoInstitucional,
            enlaceRecuperacion=None,
            minutosExpiracion=30
        )

    enlace = f"http://localhost:5173/recuperar-contrasena?token={token}"
    
    # EVENTO: AUTH.TOKEN_RECUPERACION (ID 4)
    log_result = registrar_log_request(
        sesion_bd, request, evento="AUTH.TOKEN_RECUPERACION", severidad="INFO", source="API_Backend",
        descripcion=f"Solicitud de recuperación: {solicitud.correoInstitucional}",
        usuario_id=None, objeto1="Usuario",
    )
    if log_result:
        print(f"   logId: {log_result.logId}")
        print(f"   Estado sesión antes de commit: {sesion_bd.is_active}")
            
    try:
        print(f"Ejecutando sesion.commit()...")
        sesion_bd.commit()
        print(f"Commit exitoso")
    except Exception as e:
        print(f"ERROR EN COMMIT: {type(e).__name__}: {e}")
        sesion_bd.rollback()
        raise

    return esquemas.RespuestaRecuperacionContrasena(
        mensaje=mensaje,
        correoDestino=solicitud.correoInstitucional,
        enlaceRecuperacion=enlace,
        minutosExpiracion=30
    )


@router.get("/recuperacion/verificar/{token}")
def verificar_token_recuperacion(token: str, sesion_bd: Session = Depends(get_db)):
    usuario, mensaje = auth_service.validar_token_recuperacion(sesion_bd, token)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensaje)
    return {"valido": True, "mensaje": mensaje, "correoAsociado": usuario.correoInstitucional}


@router.post("/recuperacion/reset/{token}", response_model=esquemas.RespuestaResetConToken)
def recuperar_contrasena_con_token(
    token: str,
    solicitud: esquemas.SolicitudResetConToken,
    request: Request,
    sesion_bd: Session = Depends(get_db),
):
    exito, mensaje, correo = auth_service.resetear_contrasena_con_token(
        sesion_bd=sesion_bd, token=token, nueva_contrasena=solicitud.nuevaContrasena
    )
    if not exito:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensaje)

    registrar_log_request(
        sesion_bd, request, evento="AUTH.PASSWORD_CAMBIADO", severidad="INFO", source="API_Backend",
        descripcion=f"Contraseña restablecida mediante token: {correo}",
        usuario_id=None, objeto1="Usuario",
    )
    sesion_bd.commit()

    return esquemas.RespuestaResetConToken(
        mensaje=mensaje,
        correoUsuario=correo,
        fechaReset=datetime.now(timezone.utc)
    )


@router.get("/me/dashboard", summary="Obtener dashboard según rol del usuario")
async def obtener_dashboard_usuario(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Retorna la ruta del dashboard correspondiente al rol principal del usuario.
    Prioridad: SuperAdministrador > Administrador > otros roles específicos.
    """
    # Obtener roles activos del usuario
    roles_usuario = db.query(UsuarioRol).join(RolesSistema).filter(
        UsuarioRol.usuarioId == usuario.usuarioId,
        UsuarioRol.activo == True,
        RolesSistema.activo == True
    ).all()
    
    nombres_roles = [ur.rol.nombreRol for ur in roles_usuario]
    
    # Lógica de prioridad de dashboards
    if "SuperAdministrador" in nombres_roles or "Administrador" in nombres_roles:
        return {
            "ruta": "/dashboard/admin",
            "rol": "Administrador",
            "nombreModulo": "Panel de Administrador"
        }
    elif "GestoraVIE" in nombres_roles:
        return {
            "ruta": "/dashboard/vie",
            "rol": "Gestora VIE",
            "nombreModulo": "Validación VIE"
        }
    elif "CoordinadorComiteTecnico" in nombres_roles:
        return {
            "ruta": "/dashboard/comite-tecnico/consolidar",
            "rol": "Coordinador Comité Técnico",
            "nombreModulo": "Comité Técnico - Coordinación"
        }
    elif "MiembroComiteTecnico" in nombres_roles or "ProfesorEvaluador" in nombres_roles:
        return {
            "ruta": "/dashboard/comite-tecnico/evaluacion",
            "rol": "Evaluador",
            "nombreModulo": "Comité Técnico - Evaluación"
        }
    elif "AsistenteComiteTecnico" in nombres_roles:
        return {
            "ruta": "/dashboard/comite-tecnico/bandeja",
            "rol": "Asistente Comité Técnico",
            "nombreModulo": "Comité Técnico - Bandeja"
        }
    elif "MiembroCIE" in nombres_roles:
        return {
            "ruta": "/dashboard/cie",
            "rol": "Miembro CIE",
            "nombreModulo": "Consejo de Investigación y Extensión"
        }
    elif "InvestigadorCoordinador" in nombres_roles:
        return {
            "ruta": "/dashboard/investigador",
            "rol": "Investigador",
            "nombreModulo": "Mis Propuestas"
        }
    else:
        return {
            "ruta": "/dashboard",
            "rol": "Usuario",
            "nombreModulo": "Inicio"
        }