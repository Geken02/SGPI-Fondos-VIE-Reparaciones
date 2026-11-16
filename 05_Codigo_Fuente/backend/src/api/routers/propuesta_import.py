from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuestas import Propuestas, Modalidades
from src.models.propuesta_contenido import PropuestaContenido
from src.models.propuesta_declaraciones import PropuestaDeclaraciones
from src.services.form04_parser import parsear_form04_docx

router = APIRouter(prefix="/api/propuestas", tags=["Importación de Formularios"])

@router.post("/{propuesta_id}/importar-form04")
async def importar_form04(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    if not archivo.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx del Form-04 oficial")
    
    try:
        # 1. Leer y parsear el archivo
        contenido = await archivo.read()
        datos = parsear_form04_docx(contenido)
        
        # 2. Actualizar tabla Propuestas (Cabecera)
        propuesta = sesion.query(Propuestas).filter(Propuestas.propuestaId == propuesta_id).first()
        if not propuesta:
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
            
        if datos.get("titulo"):
            propuesta.titulo = datos["titulo"]
        
        # Mapear fechas (el parser las devuelve como string 'DD/MM/YYYY' o similar)
        if datos.get("fecha_inicio"):
            try:
                propuesta.fechaInicio = datetime.strptime(datos["fecha_inicio"], "%d/%m/%Y").date()
            except ValueError:
                pass # Si el formato falla, se ignora y se deja el existente
                
        if datos.get("fecha_fin"):
            try:
                propuesta.fechaFinalizacion = datetime.strptime(datos["fecha_fin"], "%d/%m/%Y").date()
            except ValueError:
                pass

        # Mapear Modalidad (de String a ID)
        modalidad_str = datos.get("modalidad", "Investigación básica")
        modalidad_obj = sesion.query(Modalidades).filter(
            Modalidades.nombreModalidad.ilike(f"%{modalidad_str}%")
        ).first()
        if modalidad_obj:
            propuesta.modalidadId = modalidad_obj.modalidadId
            
        # Mapear TRL
        if datos.get("seccion1", {}).get("trl"):
            propuesta.nivelTrlActual = int(datos["seccion1"]["trl"])
            
        propuesta.ultimaAuditoria = datetime.now(timezone.utc)

        # 3. Actualizar o Crear PropuestaContenido (Textos largos)
        contenido_db = sesion.query(PropuestaContenido).filter(
            PropuestaContenido.propuestaId == propuesta_id
        ).first()
        
        if not contenido_db:
            contenido_db = PropuestaContenido(propuestaId=propuesta_id)
            sesion.add(contenido_db)
            
        if datos.get("resumen"): contenido_db.resumen = datos["resumen"]
        if datos.get("palabras_clave"): contenido_db.palabrasClave = datos["palabras_clave"]
        if datos.get("abstract"): contenido_db.abstract = datos["abstract"]
        if datos.get("problema_investigacion"): contenido_db.problemaInvestigacion = datos["problema_investigacion"]
        if datos.get("objetivo_general"): contenido_db.objetivoGeneral = datos["objetivo_general"]
        if datos.get("objetivos_especificos"): 
            contenido_db.objetivosEspecificos = ";\n".join(datos["objetivos_especificos"])
        if datos.get("estado_arte"): contenido_db.estadoArte = datos["estado_arte"]
        if datos.get("metodologia"): contenido_db.metodologia = datos["metodologia"]
        if datos.get("hoja_ruta"): contenido_db.hojaRuta = datos["hoja_ruta"]
        
        # La divulgación es un diccionario, hay que guardarlo como JSON string
        if datos.get("divulgacion"):
            contenido_db.estrategiaDivulgacion = json.dumps(datos["divulgacion"], ensure_ascii=False)
            
        contenido_db.ultimaAuditoria = datetime.now(timezone.utc)

        # 4. Actualizar o Crear PropuestaDeclaraciones (Checkboxes Sí/No)
        decl_db = sesion.query(PropuestaDeclaraciones).filter(
            PropuestaDeclaraciones.propuestaId == propuesta_id
        ).first()
        
        if not decl_db:
            decl_db = PropuestaDeclaraciones(propuestaId=propuesta_id)
            sesion.add(decl_db)
            
        s1 = datos.get("seccion1", {})
        decl_db.tieneFinanciamientoPrevio = bool(s1.get("otras_fuentes", {}).get("aplica"))
        decl_db.tieneContinuidadProyecto = bool(s1.get("vinculacion_tecnica", {}).get("aplica"))
        decl_db.requiereInstrumentoJuridico = bool(s1.get("instrumento_juridico", {}).get("aplica"))
        decl_db.tieneBasePosgrado = bool(s1.get("base_posgrado", {}).get("aplica") != "No")
        decl_db.tieneInformacionConfidencial = bool(s1.get("info_confidencial", {}).get("aplica"))
        decl_db.tienePotencialPI = bool(s1.get("potencial_pi", {}).get("aplica"))
        decl_db.poseeInnovacion = bool(s1.get("posee_innovacion", {}).get("aplica"))
        
        # Mapear tipo de innovación (de Texto a ID si tienes la tabla, o dejarlo por ahora)
        # decl_db.tipoInnovacionId = ... (requeriría query a TiposInnovacion)
        
        decl_db.aceptaResguardoRepositorio = bool(datos.get("resguardo", {}).get("resguardo_compromiso"))
        decl_db.aceptaDeclaracionJurada = True # Siempre true si llegó al final del form
        
        decl_db.ultimaAuditoria = datetime.now(timezone.utc)

        # 5. Guardar cambios en la BD
        sesion.commit()
        
        return {
            "mensaje": "Form-04 importado y guardado exitosamente en la base de datos",
            "titulo": datos.get("titulo", "Sin título"),
            "modalidad": modalidad_str,
            "fechas": f"{datos.get('fecha_inicio')} a {datos.get('fecha_fin')}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        sesion.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al procesar el documento: {str(e)}")