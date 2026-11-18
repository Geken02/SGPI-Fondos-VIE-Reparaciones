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
from src.utils.dependencias  import obtener_usuario_actual, requerir_rol

router = APIRouter(dependencies=[Depends(requerir_rol([
    "GestoraVIE", "CoordinadoraGestora", "MiembroCIE", "CoordinadorCIE",
    "PresidenteCIE", "DireccionInvestigacion", "SubdirectorInvestigacion",
    "SuperAdministrador", "Administrador",
]))])

@router.get("/documentos/{documento_id}/ver")
async def ver_documento_en_linea(
    documento_id: int,
    db: Session = Depends(get_db)
):
    documento = db.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.documentoId == documento_id,
        PropuestaDocumentos.activo == True
    ).first()
    
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    try:
        response = s3_client.get_object(
            Bucket=S3_BUCKET_NAME,
            Key=documento.rutaArchivo 
        )
        
        # Determinar Content-Type según la extensión
        content_type = "application/octet-stream"
        if documento.nombreArchivo.lower().endswith('.pdf'):
            content_type = "application/pdf"
        elif documento.nombreArchivo.lower().endswith('.docx'):
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif documento.nombreArchivo.lower().endswith('.xlsx'):
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
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
            raise HTTPException(status_code=404, detail=f"Archivo no encontrado en Supabase. Ruta: {documento.rutaArchivo}")
        raise HTTPException(status_code=500, detail=f"Error de S3: {error_code}")