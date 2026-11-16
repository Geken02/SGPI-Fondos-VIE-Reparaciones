from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuestas import Propuestas
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.services.form04_parser import parsear_form04_docx
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/api/propuestas", tags=["Importación de Formularios"])

@router.post("/{propuesta_id}/importar-form04")
async def importar_form04(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Recibe el Form-04 oficial (.docx), lo parsea y guarda los datos en la BD
    """
    if not archivo.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx del Form-04 oficial")
    
    contenido = await archivo.read()
    
    try:
        datos = parsear_form04_docx(contenido)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al parsear el documento: {str(e)}")
    
    # Actualizar título de la propuesta si se extrajo
    if datos.get("titulo"):
        propuesta = sesion.query(Propuestas).filter(Propuestas.propuestaId == propuesta_id).first()
        if propuesta:
            propuesta.titulo = datos["titulo"]
    
    # Buscar o crear el registro de contenido
    contenido_db = sesion.query(PropuestaContenido).filter(
        PropuestaContenido.propuestaId == propuesta_id
    ).first()
    
    if not contenido_db:
        contenido_db = PropuestaContenido(propuestaId=propuesta_id)
        sesion.add(contenido_db)
    
    # Rellenar los campos extraídos
    if datos.get("resumen"): contenido_db.resumen = datos["resumen"]
    if datos.get("palabras_clave"): contenido_db.palabrasClave = datos["palabras_clave"]
    if datos.get("abstract"): contenido_db.abstract = datos["abstract"]
    if datos.get("problema_investigacion"): contenido_db.problemaInvestigacion = datos["problema_investigacion"]
    if datos.get("objetivo_general"): contenido_db.objetivoGeneral = datos["objetivo_general"]
    if datos.get("objetivos_especificos"): contenido_db.objetivosEspecificos = ";\n".join(datos["objetivos_especificos"])
    if datos.get("estado_arte"): contenido_db.estadoArte = datos["estado_arte"]
    if datos.get("metodologia"): contenido_db.metodologia = datos["metodologia"]
    if datos.get("hoja_ruta"): contenido_db.hojaRuta = datos["hoja_ruta"]
    
    # Actualizar declaraciones si existen
    declaraciones_db = sesion.query(PropuestaDeclaraciones).filter(
        PropuestaDeclaraciones.propuestaId == propuesta_id
    ).first()
    
    if not declaraciones_db:
        declaraciones_db = PropuestaDeclaraciones(propuestaId=propuesta_id)
        sesion.add(declaraciones_db)
    
    seccion1 = datos.get("seccion1", {})
    if seccion1.get("otras_fuentes", {}).get("aplica"):
        declaraciones_db.tieneFinanciamientoPrevio = True
    if seccion1.get("vinculacion_tecnica", {}).get("aplica"):
        declaraciones_db.tieneContinuidadProyecto = True
    if seccion1.get("instrumento_juridico", {}).get("aplica"):
        declaraciones_db.requiereInstrumentoJuridico = True
    if seccion1.get("base_posgrado", {}).get("aplica") != "No":
        declaraciones_db.tieneBasePosgrado = True
    if seccion1.get("info_confidencial", {}).get("aplica"):
        declaraciones_db.tieneInformacionConfidencial = True
    if seccion1.get("potencial_pi", {}).get("aplica"):
        declaraciones_db.tienePotencialPI = True
    if seccion1.get("posee_innovacion", {}).get("aplica"):
        declaraciones_db.poseeInnovacion = True
    
    resguardo = datos.get("resguardo", {})
    if resguardo.get("resguardo_compromiso"):
        declaraciones_db.aceptaResguardoRepositorio = True
    
    declaraciones_db.ultimaAuditoria = datetime.now(timezone.utc)
    contenido_db.ultimaAuditoria = datetime.now(timezone.utc)
    
    sesion.commit()
    
    return {
        "mensaje": "Form-04 importado y guardado exitosamente en la base de datos",
        "datos_extraidos": {
            "titulo": datos.get("titulo"),
            "secciones_completadas": sum(1 for v in datos.values() if v and v != "" and v != [] and v != {})
        }
    }