# src/utils/permisos.py
"""
Verificación de permisos granulares (fine-grained access control).
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from src.database import get_db
from src.models.roles import UsuarioRol, RolPermisos, Permisos
from src.utils.dependencias import obtener_usuario_actual


def verificar_permiso(permiso_nombre: str):
    """
    Dependencia de FastAPI que verifica si el usuario tiene un permiso específico.
    
    Uso:
        @router.post("/usuarios", dependencies=[Depends(verificar_permiso("usuarios.crear"))])
    """
    def _verificar(
        sesion: Session = Depends(get_db),
        usuario=Depends(obtener_usuario_actual)
    ):
        # 1. Obtener roles activos del usuario
        roles_usuario = sesion.execute(
            select(UsuarioRol.rolId).where(
                UsuarioRol.usuarioId == usuario.usuarioId,
                UsuarioRol.activo.is_(True)
            )
        ).scalars().all()
        
        if not roles_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes roles asignados"
            )
        
        # 2. Verificar si alguno de sus roles tiene el permiso
        tiene_permiso = sesion.execute(
            select(RolPermisos.rolId)
            .join(Permisos, RolPermisos.permisoId == Permisos.permisoId)
            .where(
                RolPermisos.rolId.in_(roles_usuario),
                Permisos.nombrePermiso == permiso_nombre
            )
        ).first()
        
        if not tiene_permiso:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes el permiso requerido: {permiso_nombre}"
            )
        
        return usuario
    
    return _verificar