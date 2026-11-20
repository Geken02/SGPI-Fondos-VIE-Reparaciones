# src/api/routers/usuarios.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import time

from src.database import get_db
from src.models.usuarios import Usuario
from src.utils.dependencias import obtener_usuario_activo
from src.utils.s3_client import subir_archivo_desde_memoria, eliminar_archivo

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

# Constantes de validación
TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"]
TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB

@router.post("/{usuario_id}/foto-perfil")
async def actualizar_foto_perfil(
    usuario_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    """
    Actualiza la foto de perfil de un usuario.
    - Valida el tipo y tamaño del archivo.
    - Elimina la foto anterior si existe.
    - Sube la nueva imagen a Supabase Storage.
    - Actualiza la ruta en la base de datos.
    """
    
    # 1. Validar permisos: solo el propio usuario o un admin pueden cambiar la foto
    # (Ajusta esta lógica según tu sistema de roles)
    es_admin = any(rol.nombreRol in ["Administrador", "Admin"] for rol in usuario_actual.roles) if usuario_actual.roles else False
    
    if usuario_actual.usuarioId != usuario_id and not es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta foto de perfil"
        )

    # 2. Validar tipo de archivo
    if archivo.content_type not in TIPOS_IMAGEN_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Solo se aceptan: {', '.join(TIPOS_IMAGEN_PERMITIDOS)}"
        )

    # 3. Validar tamaño del archivo
    archivo.file.seek(0, 2)  # Ir al final del archivo
    size = archivo.file.tell()
    archivo.file.seek(0)  # Regresar al inicio
    
    if size > TAMANIO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La imagen es demasiado grande. Tamaño máximo permitido: {TAMANIO_MAXIMO_BYTES // (1024 * 1024)} MB"
        )

    # 4. Obtener el usuario de la base de datos
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # 5. Eliminar la foto anterior si existe (para no acumular archivos huérfanos en S3)
    if usuario.rutaFotoPerfil:
        try:
            eliminar_archivo(usuario.rutaFotoPerfil)
            print(f"✅ Foto anterior eliminada: {usuario.rutaFotoPerfil}")
        except Exception as e:
            print(f"⚠️ Advertencia: No se pudo eliminar la foto anterior: {e}")
            # No fallamos la operación si no se pudo eliminar la anterior

    # 6. Generar una ruta única para la nueva imagen
    # Formato: perfiles/{usuario_id}/avatar_{timestamp}.{extension}
    extension = archivo.filename.split(".")[-1].lower()
    timestamp = int(time.time())
    nueva_ruta_s3 = f"perfiles/{usuario_id}/avatar_{timestamp}.{extension}"

    # 7. Subir la nueva imagen a Supabase Storage
    try:
        url_publica = subir_archivo_desde_memoria(
            file_obj=archivo.file,
            ruta_s3=nueva_ruta_s3,
            content_type=archivo.content_type
        )
        print(f"✅ Imagen subida exitosamente: {url_publica}")
    except Exception as e:
        print(f"❌ Error al subir la imagen: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir la imagen al almacenamiento: {str(e)}"
        )

    # 8. Actualizar la base de datos con la nueva ruta
    usuario.rutaFotoPerfil = nueva_ruta_s3
    usuario.ultimaAuditoria = datetime.now(timezone.utc)
    usuario.usuarioAuditoriaId = usuario_actual.usuarioId
    
    db.commit()
    db.refresh(usuario)

    # 9. Retornar la respuesta con la URL pública
    return {
        "mensaje": "Foto de perfil actualizada exitosamente",
        "usuarioId": usuario.usuarioId,
        "rutaFotoPerfil": nueva_ruta_s3,
        "urlPublica": url_publica
    }


@router.delete("/{usuario_id}/foto-perfil")
async def eliminar_foto_perfil(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_activo)
):
    """
    Elimina la foto de perfil de un usuario.
    """
    
    # Validar permisos
    es_admin = any(rol.nombreRol in ["Administrador", "Admin"] for rol in usuario_actual.roles) if usuario_actual.roles else False
    
    if usuario_actual.usuarioId != usuario_id and not es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta foto de perfil"
        )

    # Obtener el usuario
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Si no tiene foto, no hay nada que eliminar
    if not usuario.rutaFotoPerfil:
        return {
            "mensaje": "El usuario no tiene foto de perfil",
            "usuarioId": usuario.usuarioId
        }

    # Eliminar la imagen de Supabase
    try:
        eliminar_archivo(usuario.rutaFotoPerfil)
        print(f"✅ Foto eliminada de S3: {usuario.rutaFotoPerfil}")
    except Exception as e:
        print(f"⚠️ Error al eliminar la imagen de S3: {e}")

    # Actualizar la base de datos
    usuario.rutaFotoPerfil = None
    usuario.ultimaAuditoria = datetime.now(timezone.utc)
    usuario.usuarioAuditoriaId = usuario_actual.usuarioId
    
    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Foto de perfil eliminada exitosamente",
        "usuarioId": usuario.usuarioId
    }

@router.get("/{usuario_id}/foto-perfil")
async def obtener_foto_perfil(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene la URL pública de la foto de perfil de un usuario.
    """
    from src.utils.s3_client import obtener_url_documento
    
    usuario = db.query(Usuario).filter(Usuario.usuarioId == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    if not usuario.rutaFotoPerfil:
        return {
            "usuarioId": usuario.usuarioId,
            "tieneFoto": False,
            "urlPublica": None
        }

    url_publica = obtener_url_documento(usuario.rutaFotoPerfil)
    
    return {
        "usuarioId": usuario.usuarioId,
        "tieneFoto": True,
        "rutaFotoPerfil": usuario.rutaFotoPerfil,
        "urlPublica": url_publica
    }