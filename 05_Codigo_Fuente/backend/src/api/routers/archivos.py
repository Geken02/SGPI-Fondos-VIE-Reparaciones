# src/api/routers/archivos.py
import hashlib
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento 
from src.utils.s3_client import subir_archivo, obtener_url_documento # <-- Importamos tu cliente S3

router = APIRouter(prefix="/api/propuestas", tags=["Archivos"])

@router.post("/{propuesta_id}/archivos")
async def guardar_archivo_propuesta(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    tipo_documento_id: int = Form(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Recibe un archivo, lo sube a Supabase Storage y guarda el registro en PropuestaDocumentos.
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
    
    # 3. Calcular checksum (SHA-256)
    checksum = hashlib.sha256(contenido).hexdigest()

    # 4. Definir ruta organizada en Supabase Storage
    # Ejemplo: propuestas/13/formulario_04.pdf
    ruta_relativa_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"
    
    # 5. Subir a Supabase Storage usando tu cliente S3
    try:
        # Guardamos el archivo temporalmente en memoria o disco para subirlo
        # Como s3_client.upload_file espera una ruta local, podemos guardar un temp file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=archivo.filename) as temp_file:
            temp_file.write(contenido)
            temp_file_path = temp_file.name
        
        # Subimos el archivo
        url_publica = subir_archivo(temp_file_path, ruta_relativa_s3, archivo.content_type or "application/octet-stream")
        
        # Limpiamos el archivo temporal
        os.remove(temp_file_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al subir a Supabase Storage: {str(e)}")

    # 6. Guardar registro en la base de datos
    nuevo_documento = PropuestaDocumentos(
        propuestaId=propuesta_id,
        tipoDocumentoId=tipo_documento_id,
        rutaArchivo=url_publica, # Guardamos la URL pública de Supabase
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
        "mensaje": "Archivo guardado exitosamente en Supabase Storage y registrado en la base de datos",
        "documentoId": nuevo_documento.documentoId,
        "nombre": archivo.filename,
        "ruta": url_publica,
        "tamanioBytes": tamanio_bytes,
        "checksum": checksum
    }