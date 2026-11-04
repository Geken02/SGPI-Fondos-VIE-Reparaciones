from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from src.config import settings


def verificar_contrasena(contrasena_plana: str, contrasena_hasheada: str) -> bool:
    """
    Verifica que la contraseña plana coincida con el hash almacenado en la base de datos.
    
    Args:
        contrasena_plana: Contraseña ingresada por el usuario en texto plano
        contrasena_hasheada: Hash bcrypt almacenado en la tabla Usuarios
    
    Returns:
        True si las contraseñas coinciden, False en caso contrario
    """
    # Convertir strings a bytes para bcrypt
    contrasena_bytes = contrasena_plana.encode('utf-8')
    hash_bytes = contrasena_hasheada.encode('utf-8')
    
    return bcrypt.checkpw(contrasena_bytes, hash_bytes)


def generar_hash_contrasena(contrasena: str) -> str:
    """
    Genera un hash seguro de la contraseña usando bcrypt.
    
    Args:
        contrasena: Contraseña en texto plano a hashear
    
    Returns:
        Hash bcrypt de la contraseña como string
    """
    # Convertir string a bytes
    contrasena_bytes = contrasena.encode('utf-8')
    
    # Generar salt y hashear
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(contrasena_bytes, salt)
    
    # Convertir bytes a string para almacenar en la BD
    return hash_bytes.decode('utf-8')


def crear_token_acceso(datos: dict, duracion_expiracion: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT con los datos del usuario y un tiempo de expiración.
    
    Args:
        datos: Diccionario con la información del usuario (sub, correo, roles)
        duracion_expiracion: Tiempo de validez del token (por defecto usa ACCESS_TOKEN_EXPIRE_MINUTES)
    
    Returns:
        Token JWT codificado como string
    """
    datos_a_codificar = datos.copy()
    
    if duracion_expiracion:
        expiracion = datetime.now(timezone.utc) + duracion_expiracion
    else:
        expiracion = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    datos_a_codificar.update({"exp": expiracion})
    
    # Codificar el token con la clave secreta y el algoritmo configurado
    token_codificado = jwt.encode(datos_a_codificar, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token_codificado


def decodificar_token(token: str) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.
    
    Args:
        token: Token JWT a decodificar
    
    Returns:
        Diccionario con el payload del token si es válido, None si expiró o es inválido
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def registrar_log_request(sesion, request, *, evento: str, severidad: str, source: str,
                          descripcion: str, usuario_id=None, objeto1=None,
                          referencia_id_1=None, descripcion_ref_1=None,
                          datos_anteriores=None, datos_nuevos=None):
    """Escribe un log de auditoría tomando userAgent/IP del request HTTP actual.

    Wrapper de conveniencia sobre services.auditoria_service.registrar_evento para
    usar directamente desde los routers (donde se dispone de `request`)."""
    from src.services.auditoria_service import registrar_evento

    return registrar_evento(
        sesion,
        evento=evento, severidad=severidad, source=source, descripcion=descripcion,
        usuario_id=usuario_id, objeto1=objeto1,
        referencia_id_1=referencia_id_1, descripcion_ref_1=descripcion_ref_1,
        datos_anteriores=datos_anteriores, datos_nuevos=datos_nuevos,
        user_agent=request.headers.get("user-agent"),
        computadora=request.client.host if request.client else None,
    )
