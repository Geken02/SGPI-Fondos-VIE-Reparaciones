# src/utils/dependencias.py 
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from src.database import get_db
from src.models.usuarios import Usuario
from src.models.roles import UsuarioRol, RolesSistema
from src.utils.seguridad import decodificar_token

esquema_seguridad = HTTPBearer()

def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_seguridad),
    sesion_bd: Session = Depends(get_db)
) -> Usuario:
    payload = decodificar_token(credenciales.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    id_usuario = payload.get("sub") # O "usuarioId", dependiendo de cómo lo guardes en decodificar_token
    if id_usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no contiene identificación de usuario",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    usuario = sesion_bd.query(Usuario).filter(Usuario.usuarioId == int(id_usuario)).first()
    if usuario is None or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return usuario

def obtener_usuario_activo(usuario_actual: Usuario = Depends(obtener_usuario_actual)) -> Usuario:
    if not usuario_actual.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return usuario_actual

# ============================================================================
# NUEVA FUNCIÓN AUXILIAR: Obtener el payload crudo del token
# ============================================================================
def obtener_payload_token(
    credenciales: HTTPAuthorizationCredentials = Depends(esquema_seguridad)
) -> dict:
    """Extrae y valida el payload del JWT sin consultar la BD."""
    payload = decodificar_token(credenciales.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

# ============================================================================
# ACTUALIZACIÓN: requerir_rol con soporte para Impersonation
# ============================================================================
def requerir_rol(roles_requeridos: list[str]):
    def verificador_rol(
        usuario_actual: Usuario = Depends(obtener_usuario_activo),
        payload: dict = Depends(obtener_payload_token), # <-- Inyectamos el payload
        sesion_bd: Session = Depends(get_db)
    ) -> Usuario:
        
        # 1. VERIFICAR SI ES UNA SUPLANTACIÓN (IMPERSONATION)
        if payload.get("impersonated") is True:
            rol_simulado = payload.get("rolNombre")
            if rol_simulado in roles_requeridos:
                # El rol simulado coincide con el requerido, ¡acceso concedido!
                return usuario_actual

        # 2. COMPORTAMIENTO NORMAL: Verificar roles en la Base de Datos
        consulta_roles = sesion_bd.query(RolesSistema.nombreRol).join(
            UsuarioRol, UsuarioRol.rolId == RolesSistema.rolId
        ).filter(
            UsuarioRol.usuarioId == usuario_actual.usuarioId,
            UsuarioRol.activo == True
        ).all()
        
        roles_del_usuario = [rol.nombreRol for rol in consulta_roles]
        
        if not any(rol in roles_del_usuario for rol in roles_requeridos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(roles_requeridos)}"
            )
        return usuario_actual
    
    return verificador_rol