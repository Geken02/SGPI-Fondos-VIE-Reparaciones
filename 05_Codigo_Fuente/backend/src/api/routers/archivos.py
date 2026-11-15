import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento 

# ✅ Importamos el cliente S3 ya configurado para Supabase
from src.utils.s3_client import s3_client, S3_BUCKET_NAME, obtener_url_documento

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
    Recibe un archivo, lo sube a Supabase Storage (vía S3) y guarda el registro en PropuestaDocumentos.
    """
    # 1. Validar que el tipo de documento existe y está activo
    tipo_doc = sesion.query(TiposDocumento).filter(
        TiposDocumento.tipoDocumentoId == tipo_documento_id,
        TiposDocumento.activo == True
    ).first()
    
    if not tipo_doc:
        raise HTTPException(status_code=400, detail="El tipo de documento especificado no es válido o está inactivo.")

    # 2. Leer el contenido del archivo en memoria para calcular el checksum
    contenido = await archivo.read()
    tamanio_bytes = len(contenido)
    
    # 3. Calcular checksum (SHA-256) para garantizar la integridad
    checksum = hashlib.sha256(contenido).hexdigest()

    # 4. Definir ruta organizada en Supabase Storage
    ruta_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"
    
    # 5. Subir a Supabase Storage usando boto3 (put_object es ideal para bytes en memoria)
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=ruta_s3,
            Body=contenido,
            ContentType=archivo.content_type or "application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al subir a Supabase Storage: {str(e)}")

    # 6. Obtener la URL pública del documento (la que usa el frontend)
    url_publica = obtener_url_documento(ruta_s3)

    # 7. Guardar registro en la base de datos
    nuevo_documento = PropuestaDocumentos(
        propuestaId=propuesta_id,
        tipoDocumentoId=tipo_documento_id,
        rutaArchivo=ruta_s3,  # Guardamos la ruta relativa (buena práctica)
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
        "mensaje": "Archivo guardado exitosamente en Supabase y registrado en la base de datos",
        "documentoId": nuevo_documento.documentoId,
        "nombre": archivo.filename,
        "ruta": ruta_s3,
        "urlDescarga": url_publica,  # ✅ Devolvemos la URL completa para que el frontend la use de inmediato
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
    Redirige a la URL pública de Supabase para descargar el archivo.
    (Alternativa a servir el archivo directamente, aprovechando que el bucket es público).
    """
    from fastapi.responses import RedirectResponse

    doc = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.nombreArchivo == nombre_archivo,
        PropuestaDocumentos.activo == True
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Registro del archivo no encontrado en la base de datos")

    # Redirigimos directamente a la URL pública de Supabase
    url_publica = obtener_url_documento(doc.rutaArchivo)
    return RedirectResponse(url=url_publica, status_code=302)