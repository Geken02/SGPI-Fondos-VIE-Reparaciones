# src/api/routers/archivos.py
import hashlib
import httpx
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
# Ajusta estos imports a la ruta real de tus modelos
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento 

router = APIRouter(prefix="/api/propuestas", tags=["Archivos"])

SEAWEED_FILER_URL = os.getenv("SEAWEED_FILER_URL", "http://localhost:8888")

async def subir_a_seaweedfs(archivo_bytes: bytes, nombre_archivo: str, ruta_relativa: str) -> str:
    """Sube un archivo al Filer de SeaweedFS usando HTTP PUT"""
    url = f"{SEAWEED_FILER_URL.rstrip('/')}/{ruta_relativa.strip('/')}/{nombre_archivo}"
    
    async with httpx.AsyncClient() as client:
        response = await client.put(url, content=archivo_bytes)
        if response.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Error al subir a SeaweedFS: {response.text}")
    
    return f"/{ruta_relativa.strip('/')}/{nombre_archivo}"

@router.post("/{propuesta_id}/archivos")
async def guardar_archivo_propuesta(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    tipo_documento_id: int = Form(...),  # <-- El frontend enviará el ID numérico del tipo
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Recibe un archivo, lo sube a SeaweedFS y guarda el registro en PropuestaDocumentos.
    """
    # 1. Validar que el tipo de documento existe y está activo
    tipo_doc = sesion.query(TiposDocumento).filter(
        TiposDocumento.tipoDocumentoId == tipo_documento_id,
        TiposDocumento.activo == True
    ).first()
    
    if not tipo_doc:
        raise HTTPException(status_code=400, detail="El tipo de documento especificado no es válido o está inactivo.")

    # 2. Leer el contenido del archivo en memoria
    contenido = await archivo.read()
    tamanio_bytes = len(contenido)
    
    # 3. Calcular checksum (SHA-256) para garantizar la integridad del archivo
    checksum = hashlib.sha256(contenido).hexdigest()

    # 4. Definir ruta organizada en SeaweedFS
    ruta_relativa = f"propuestas/{propuesta_id}"
    
    # 5. Subir a SeaweedFS
    try:
        ruta_seaweed = await subir_a_seaweedfs(contenido, archivo.filename, ruta_relativa)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en SeaweedFS: {str(e)}")

    # 6. Guardar registro en la base de datos usando tu modelo PropuestaDocumentos
    nuevo_documento = PropuestaDocumentos(
        propuestaId=propuesta_id,
        tipoDocumentoId=tipo_documento_id,
        rutaArchivo=ruta_seaweed,
        nombreArchivo=archivo.filename,
        tamanioBytes=tamanio_bytes,
        checksum=checksum,
        usuarioCargaId=usuario_actual.usuarioId,
        activo=True,
        usuarioAuditoriaId=usuario_actual.usuarioId,
        ultimaAuditoria=datetime.now(timezone.utc)
    )
    
    sesion.add(nuevo_documento)
    sesion.commit()
    sesion.refresh(nuevo_documento)

    return {
        "mensaje": "Archivo guardado exitosamente en SeaweedFS y registrado en la base de datos",
        "documentoId": nuevo_documento.documentoId,
        "nombre": archivo.filename,
        "ruta": ruta_seaweed,
        "tamanioBytes": tamanio_bytes,
        "checksum": checksum
    }

@router.get("/{propuesta_id}/archivos/{nombre_archivo:path}")
async def descargar_archivo_propuesta(
    propuesta_id: int,
    nombre_archivo: str,
    sesion: Session = Depends(get_db)
):
    """
    Descarga o sirve el archivo desde SeaweedFS Filer.
    """
    from fastapi.responses import Response

    doc = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.nombreArchivo == nombre_archivo,
        PropuestaDocumentos.activo == True
    ).first()

    ruta_seaweed = doc.rutaArchivo if doc else f"/propuestas/{propuesta_id}/{nombre_archivo}"
    url = f"{SEAWEED_FILER_URL.rstrip('/')}/{ruta_seaweed.lstrip('/')}"

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url)
            if resp.status_code == 200:
                media_type = resp.headers.get("content-type", "application/octet-stream")
                return Response(
                    content=resp.content,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{nombre_archivo}"'
                    }
                )
        except Exception:
            pass

    raise HTTPException(status_code=404, detail="Archivo no encontrado en SeaweedFS")
