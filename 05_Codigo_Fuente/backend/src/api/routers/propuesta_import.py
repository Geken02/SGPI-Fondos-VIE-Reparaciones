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

# ==============================================================================
# ENDPOINT PARA PARSEAR FORM-04 (.docx) Y GUARDAR EN LA BD
# ==============================================================================
@router.post("/{propuesta_id}/importar-form04")
async def importar_form04(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    """
    Recibe el Form-04 oficial (.docx), lo parsea y guarda los datos en las tablas de la BD.
    """
    if not archivo.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx del Form-04 oficial")
    
    try:
        # 1. Importar el parser (asegúrate de que este archivo exista en src/services/)
        from src.services.form04_parser import parsear_form04_docx
        
        # 2. Leer y parsear el archivo
        contenido = await archivo.read()
        datos = parsear_form04_docx(contenido)
        
        # 3. Actualizar la propuesta (Título, fechas, modalidad, TRL)
        propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
            
        if datos.get("titulo"):
            propuesta.titulo = datos["titulo"]
        if datos.get("modalidad"):
            # Aquí podrías mapear el string de modalidad al modalidadId real si es necesario
            pass
            
        # 4. Actualizar o crear PropuestaContenido
        contenido_db = sesion.query(PropuestaContenido).filter(
            PropuestaContenido.propuestaId == propuesta_id
        ).first()
        
        if not contenido_db:
            contenido_db = PropuestaContenido(propuestaId=propuesta_id)
            sesion.add(contenido_db)
            
        if datos.get("resumen"): contenido_db.resumen = datos["resumen"]
        if datos.get("palabras_clave"): contenido_db.palabrasClave = datos["palabras_clave"]
        if datos.get("abstract"): contenido_db.abstract = datos["abstract"]
        if datos.get("keywords"): contenido_db.keywords = datos["keywords"]
        if datos.get("problema_investigacion"): contenido_db.problemaInvestigacion = datos["problema_investigacion"]
        if datos.get("objetivo_general"): contenido_db.objetivoGeneral = datos["objetivo_general"]
        if datos.get("objetivos_especificos"): contenido_db.objetivosEspecificos = ";\n".join(datos["objetivos_especificos"])
        if datos.get("estado_arte"): contenido_db.estadoArte = datos["estado_arte"]
        if datos.get("metodologia"): contenido_db.metodologia = datos["metodologia"]
        if datos.get("hoja_ruta"): contenido_db.hojaRuta = datos["hoja_ruta"]
        
        contenido_db.ultimaAuditoria = datetime.now(timezone.utc)
        
        # 5. Actualizar o crear PropuestaDeclaraciones (Checkboxes)
        declaraciones_db = sesion.query(PropuestaDeclaraciones).filter(
            PropuestaDeclaraciones.propuestaId == propuesta_id
        ).first()
        
        if not declaraciones_db:
            declaraciones_db = PropuestaDeclaraciones(propuestaId=propuesta_id)
            sesion.add(declaraciones_db)
            
        s1 = datos.get("seccion1", {})
        if s1.get("otras_fuentes", {}).get("aplica"): declaraciones_db.tieneFinanciamientoPrevio = True
        if s1.get("vinculacion_tecnica", {}).get("aplica"): declaraciones_db.tieneContinuidadProyecto = True
        if s1.get("instrumento_juridico", {}).get("aplica"): declaraciones_db.requiereInstrumentoJuridico = True
        if s1.get("base_posgrado", {}).get("aplica") != "No": declaraciones_db.tieneBasePosgrado = True
        if s1.get("info_confidencial", {}).get("aplica"): declaraciones_db.tieneInformacionConfidencial = True
        if s1.get("potencial_pi", {}).get("aplica"): declaraciones_db.tienePotencialPI = True
        if s1.get("posee_innovacion", {}).get("aplica"): declaraciones_db.poseeInnovacion = True
        
        if datos.get("resguardo", {}).get("resguardo_compromiso"):
            declaraciones_db.aceptaResguardoRepositorio = True
            
        declaraciones_db.ultimaAuditoria = datetime.now(timezone.utc)
        
        # 6. Guardar cambios en la BD
        sesion.commit()
        
        return {
            "mensaje": "Form-04 parseado y guardado exitosamente en la base de datos",
            "datos_extraidos": {
                "titulo": datos.get("titulo"),
                "secciones_completadas": sum(1 for v in datos.values() if v and v != "" and v != [] and v != {})
            }
        }
        
    except ImportError:
        raise HTTPException(status_code=500, detail="El módulo form04_parser no se encuentra en el backend")
    except Exception as e:
        sesion.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al procesar el documento: {str(e)}")