from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import boto3
from botocore.exceptions import ClientError

# Importa tu cliente S3 y modelos
from src.utils.s3_client import s3_client, S3_BUCKET_NAME
from src.database import get_db
from src.models import PropuestaDocumentos, asignaciones_comite, Usuario
from src.utils.dependencias  import obtener_usuario_actual

router = APIRouter()

@router.get("/documentos/{documento_id}/ver")
async def ver_documento_en_linea(
    documento_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual)
):
    """
    Endpoint proxy para servir documentos PDF desde Supabase Storage.
    Evita problemas de CORS y garantiza el Content-Type correcto.
    """
    try:
        # 1. Obtener el documento de la base de datos
        documento = db.query(PropuestaDocumentos).filter(
            PropuestaDocumentos.documentoId == documento_id,
            PropuestaDocumentos.activo == True
        ).first()
        
        if not documento:
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        
        # 2. Verificar permisos (opcional pero recomendado)
        # Descomenta si quieres validar que el usuario tenga acceso a esta propuesta
        # asignacion = db.query(AsignacionComite).filter(
        #     AsignacionComite.propuestaId == documento.propuestaId,
        #     AsignacionComite.evaluadorId == usuario.usuarioId,
        #     AsignacionComite.activo == True
        # ).first()
        # if not asignacion:
        #     raise HTTPException(status_code=403, detail="No tiene acceso a este documento")
        
        # 3. Descargar el archivo desde Supabase S3
        try:
            response = s3_client.get_object(
                Bucket=S3_BUCKET_NAME,
                Key=documento.rutaArchivo
            )
            
            # 4. Determinar el Content-Type
            content_type = response.get('ContentType', 'application/pdf')
            
            # Si es un PDF, forzar el tipo correcto
            if documento.nombreArchivo.lower().endswith('.pdf'):
                content_type = 'application/pdf'
            
            # 5. Servir el archivo al frontend
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type=content_type,
                headers={
                    "Content-Disposition": f"inline; filename=\"{documento.nombreArchivo}\"",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=3600"
                }
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="El archivo no existe en el almacenamiento")
            elif error_code == 'AccessDenied':
                raise HTTPException(status_code=403, detail="No tiene permisos para acceder al archivo")
            else:
                raise HTTPException(status_code=500, detail=f"Error al acceder al archivo: {error_code}")
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR en ver_documento_en_linea: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor")