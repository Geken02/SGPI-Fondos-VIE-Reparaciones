# src/services/servicio_autenticacion.py
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from src.models.usuarios import Usuario
from src.models.roles import UsuarioRol, RolesSistema
from src.utils.seguridad import verificar_contrasena, crear_token_acceso
import secrets
from src.models.recuperacion import TokenRecuperacion
from src.utils.seguridad import generar_hash_contrasena
from src.utils.helpers import validar_fortaleza_contrasena


def autenticar_usuario(
    sesion_bd: Session,
    correo: str,
    contrasena: str
) -> tuple[Usuario | None, str | None]:
    """
    Autentica un usuario verificando su correo y contraseña contra la base de datos.
    
    Este servicio implementa la lógica de login del sistema SGPI:
    1. Busca el usuario por correo institucional
    2. Verifica que el usuario esté activo
    3. Valida la contraseña contra el hash almacenado
    4. Actualiza la fecha de último acceso
    5. Genera el token JWT con los roles del usuario
    
    Args:
        sesion_bd: Sesión de base de datos activa
        correo: Correo institucional del usuario
        contrasena: Contraseña en texto plano ingresada por el usuario
    
    Returns:
        Tupla (usuario, mensaje_error):
        - Si es exitoso: (objeto Usuario, None)
        - Si falla: (None, "mensaje de error descriptivo")
    """
    
    # 1. Buscar usuario por correo institucional
    usuario = sesion_bd.query(Usuario).filter(
        Usuario.correoInstitucional == correo
    ).first()
    
    if usuario is None:
        return None, "Correo institucional no registrado en el sistema"
    
    # 2. Verificar que el usuario esté activo
    if not usuario.activo:
        return None, "Usuario inactivo. Contacte al administrador del sistema"
    
    # 3. Verificar que tenga contraseña configurada
    if usuario.contrasenaHash is None:
        return None, "Usuario sin contraseña configurada. Contacte al administrador"
    
    # 4. Validar la contraseña contra el hash bcrypt
    if not verificar_contrasena(contrasena, usuario.contrasenaHash):
        return None, "Contraseña incorrecta"
    
    # 5. Actualizar la fecha de último acceso
    usuario.ultimoAcceso = datetime.now(timezone.utc)
    sesion_bd.commit()
    
    return usuario, None


def obtener_roles_usuario(sesion_bd: Session, usuario_id: int) -> list[str]:
    """
    Obtiene la lista de nombres de roles activos de un usuario.
    
    Consulta la tabla UsuarioRol en conjunto con RolesSistema para obtener
    los roles vigentes del usuario (que no hayan expirado y estén activos).
    
    Args:
        sesion_bd: Sesión de base de datos activa
        usuario_id: ID del usuario a consultar
    
    Returns:
        Lista de nombres de roles (ej: ["InvestigadorCoordinador", "ProfesorEvaluador"])
    """
    consulta_roles = sesion_bd.query(RolesSistema.nombreRol).join(
        UsuarioRol, UsuarioRol.rolId == RolesSistema.rolId
    ).filter(
        UsuarioRol.usuarioId == usuario_id,
        UsuarioRol.activo == True
    ).distinct().all()
    
    return [rol.nombreRol for rol in consulta_roles]


def generar_token_para_usuario(usuario: Usuario, roles: list[str]) -> str:
    """
    Genera un token JWT con la información del usuario y sus roles.
    
    El token incluye:
    - sub: ID del usuario (identificador principal)
    - correo: Correo institucional
    - roles: Lista de roles activos
    
    Args:
        usuario: Objeto Usuario autenticado
        roles: Lista de nombres de roles del usuario
    
    Returns:
        Token JWT codificado como string
    """
    datos_token = {
        "sub": str(usuario.usuarioId),
        "correo": usuario.correoInstitucional,
        "roles": roles
    }
    
    return crear_token_acceso(datos=datos_token)

# ============================================================
# SERVICIOS PARA "OLVIDÉ MI CONTRASEÑA"
# ============================================================

MINUTOS_EXPIRACION_TOKEN = 30  # Tiempo de validez del token


def generar_token_recuperacion(
    sesion_bd: Session,
    correo: str,
    ip_solicitud: str = None,
    user_agent: str = None
) -> tuple[str | None, str]:
    """
    Genera un token de recuperación de contraseña para un usuario.
    
    Este servicio implementa el flujo seguro de recuperación:
    1. Busca al usuario por correo
    2. Invalida tokens anteriores no usados (por seguridad)
    3. Genera un nuevo token criptográficamente seguro
    4. Lo guarda en la base de datos con fecha de expiración
    
    Args:
        sesion_bd: Sesión de base de datos activa
        correo: Correo institucional del usuario
        ip_solicitud: IP desde donde se hizo la solicitud (para auditoría)
        user_agent: Navegador/dispositivo del usuario (para auditoría)
    
    Returns:
        Tupla (token, mensaje):
        - Si el usuario existe: (token_generado, "Token generado correctamente")
        - Si no existe: (None, "Correo no registrado")
    """
    
    # 1. Buscar usuario por correo
    usuario = sesion_bd.query(Usuario).filter(
        Usuario.correoInstitucional == correo.lower()
    ).first()
    
    if usuario is None:
        return None, "Correo no registrado en el sistema"
    
    if not usuario.activo:
        return None, "Usuario inactivo"
    
    # 2. Invalidar tokens anteriores no usados (seguridad)
    sesion_bd.query(TokenRecuperacion).filter(
        TokenRecuperacion.usuarioId == usuario.usuarioId,
        TokenRecuperacion.usado == False
    ).update({"usado": True})
    
    # 3. Generar token criptográficamente seguro (64 caracteres)
    token_nuevo = secrets.token_urlsafe(48)
    
    # 4. Crear registro del token con fecha de expiración
    fecha_actual = datetime.now(timezone.utc)
    fecha_expiracion = fecha_actual + timedelta(minutes=MINUTOS_EXPIRACION_TOKEN)
    
    token_registro = TokenRecuperacion(
        usuarioId=usuario.usuarioId,
        token=token_nuevo,
        fechaCreacion=fecha_actual,
        fechaExpiracion=fecha_expiracion,
        usado=False,
        ipSolicitud=ip_solicitud,
        userAgent=user_agent[:500] if user_agent else None
    )
    
    sesion_bd.add(token_registro)
    sesion_bd.commit()
    
    return token_nuevo, "Token generado correctamente"

def validar_token_recuperacion(
    sesion_bd: Session,
    token: str
) -> tuple[Usuario | None, str]:
    """
    Valida un token de recuperación de contraseña.
    """
    
    # 1. Buscar el token en la base de datos
    token_registro = sesion_bd.query(TokenRecuperacion).filter(
        TokenRecuperacion.token == token
    ).first()
    
    if token_registro is None:
        return None, "Token inválido o no encontrado"
    
    # 2. Verificar que no haya sido usado
    if token_registro.usado:
        return None, "Este token ya fue utilizado. Solicite uno nuevo."
    
    # 3. Verificar que no haya expirado
    fecha_actual = datetime.now(timezone.utc)
    
    fecha_expiracion = token_registro.fechaExpiracion
    if fecha_expiracion.tzinfo is None:
        fecha_expiracion = fecha_expiracion.replace(tzinfo=timezone.utc)
    
    if fecha_expiracion < fecha_actual:
        return None, "El token ha expirado. Solicite uno nuevo."
    
    # 4. Obtener el usuario asociado
    usuario = sesion_bd.query(Usuario).filter(
        Usuario.usuarioId == token_registro.usuarioId
    ).first()
    
    if usuario is None or not usuario.activo:
        return None, "Usuario no encontrado o inactivo"
    
    return usuario, "Token válido"


def resetear_contrasena_con_token(
    sesion_bd: Session,
    token: str,
    nueva_contrasena: str
) -> tuple[bool, str, str]:
    """
    Resetea la contraseña de un usuario usando un token de recuperación válido.
    
    Este es el paso final del flujo "Olvidé mi contraseña":
    1. Valida el token
    2. Valida la fortaleza de la nueva contraseña
    3. Actualiza la contraseña del usuario
    4. Marca el token como usado
    
    Args:
        sesion_bd: Sesión de base de datos activa
        token: Token de recuperación válido
        nueva_contrasena: Nueva contraseña a asignar
    
    Returns:
        Tupla (exito, mensaje, correo_usuario):
        - Si fue exitoso: (True, "Contraseña actualizada", "correo@tec.ac.cr")
        - Si falló: (False, "mensaje de error", "")
    """
    
    # 1. Validar el token
    usuario, mensaje_validacion = validar_token_recuperacion(sesion_bd, token)
    if usuario is None:
        return False, mensaje_validacion, ""
    
    # 2. Validar fortaleza de la nueva contraseña
    es_valida, mensaje_error = validar_fortaleza_contrasena(nueva_contrasena)
    if not es_valida:
        return False, mensaje_error, ""
    
    # 3. Actualizar la contraseña del usuario
    nuevo_hash = generar_hash_contrasena(nueva_contrasena)
    usuario.contrasenaHash = nuevo_hash
    
    # 4. Marcar el token como usado
    token_registro = sesion_bd.query(TokenRecuperacion).filter(
        TokenRecuperacion.token == token
    ).first()
    token_registro.usado = True
    
    sesion_bd.commit()
    
    return True, "Contraseña actualizada correctamente", usuario.correoInstitucional