from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.services.form04_parser import parsear_form04_docx
from datetime import datetime, timezone
import json
import traceback

router = APIRouter(prefix="/api/propuestas", tags=["Importación de Formularios"])


@router.post("/parse-form04")
async def debug_parse_form04(
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo) # Nota: corrige el typo si es necesario a 'obtener_usuario_activo'
):
    """
    Endpoint de diagnóstico: Devuelve exactamente lo que el parser extrae del Word.
    """
    if not archivo.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx")
    
    resultado_debug = {
        "nombre_archivo": archivo.filename,
        "tamaño_bytes": archivo.size,
        "texto_crudo_extraido": "",
        "datos_estructurados": {},
        "errores": []
    }

    try:
        # 1. Leer el archivo
        contenido = await archivo.read()
        
        # 2. Intentar parsear
        datos = parsear_form04_docx(contenido)
        resultado_debug["datos_estructurados"] = datos
        
        # 3. Extraer texto crudo para ver cómo lo lee python-docx
        from docx import Document
        from io import BytesIO
        doc = Document(BytesIO(contenido))
        texto_crudo = "\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
        resultado_debug["texto_crudo_extraido"] = texto_crudo[:2000] + "\n... [TRUNCADO PARA NO SATURAR] ..." # Solo los primeros 2000 chars

    except Exception as e:
        resultado_debug["errores"].append(str(e))
        resultado_debug["errores"].append(traceback.format_exc())

    return resultado_debug