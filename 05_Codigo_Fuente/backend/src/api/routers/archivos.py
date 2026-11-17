import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.propuestas import Propuesta
from src.models.catalogos import Modalidades
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.utils.s3_client import s3_client, S3_BUCKET_NAME, obtener_url_documento
from src.services.form04_parser import parsear_form04_docx

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
    Recibe un archivo, lo sube a Supabase Storage y guarda/actualiza el registro en PropuestaDocumentos.
    Si ya existe un documento activo del mismo tipo, se ACTUALIZA el registro existente (ahorrando IDs).
    SI es un .docx del Form-04 (tipo 1), también lo parsea y actualiza las tablas de la propuesta.
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
    
    # 3. Calcular checksum (SHA-256) para garantizar la integridad
    checksum = hashlib.sha256(contenido).hexdigest()

    # =========================================================================
    # 3.5. LÓGICA DE REEMPLAZO (UPDATE): Verificar si ya existe un documento activo
    # =========================================================================
    documento_existente = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.tipoDocumentoId == tipo_documento_id,
        PropuestaDocumentos.activo == True
    ).first()

    # Si existe y el checksum es idéntico, no hacemos nada (ahorra tiempo, ancho de banda y espacio)
    if documento_existente and documento_existente.checksum == checksum:
        return {
            "mensaje": "El archivo es idéntico al ya registrado. No se realizaron cambios.",
            "documentoId": documento_existente.documentoId,
            "nombre": documento_existente.nombreArchivo,
            "ruta": documento_existente.rutaArchivo,
            "urlDescarga": obtener_url_documento(documento_existente.rutaArchivo),
            "tamanioBytes": documento_existente.tamanioBytes,
            "checksum": checksum,
            "reemplazado": False
        }

    # 4. Definir ruta organizada en Supabase Storage para el archivo
    ruta_s3 = f"propuestas/{propuesta_id}/{archivo.filename}"
    
    # 5. Subir a Supabase Storage usando boto3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=ruta_s3,
            Body=contenido,
            ContentType=archivo.content_type or "application/octet-stream"
        )
        print(f"Archivo subido a S3: {ruta_s3}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al subir a Supabase Storage: {str(e)}")

    # =========================================================================
    # 6. ACTUALIZAR o CREAR el registro en la BD (Verdadero UPSERT)
    # =========================================================================
    fue_reemplazo = False
    
    if documento_existente:
        print(f"🔄 Actualizando documento existente (ID: {documento_existente.documentoId})")
        fue_reemplazo = True
        
        # A. Eliminar el archivo viejo de S3 para ahorrar espacio
        try:
            s3_client.delete_object(
                Bucket=S3_BUCKET_NAME,
                Key=documento_existente.rutaArchivo
            )
            print(f"Archivo anterior eliminado de S3 exitosamente.")
        except Exception as e:
            print(f"No se pudo eliminar el archivo anterior de S3: {e}")
            # Continuamos, no queremos que un fallo en S3 bloquee la actualización de la BD
        
        # B. Actualizar los campos del registro existente (MISMO documentoId)
        documento_existente.rutaArchivo = ruta_s3
        documento_existente.nombreArchivo = archivo.filename
        documento_existente.tamanioBytes = tamanio_bytes
        documento_existente.checksum = checksum
        documento_existente.usuarioCargaId = usuario_actual.usuarioId
        documento_existente.fechaCarga = datetime.now(timezone.utc) # Actualizamos la fecha a la nueva carga
        documento_existente.usuarioAuditoriaId = usuario_actual.usuarioId
        documento_existente.ultimaAuditoria = datetime.now(timezone.utc)
        
        documento_a_retornar = documento_existente
    else:
        # Crear nuevo registro solo si no existía ninguno
        documento_a_retornar = PropuestaDocumentos(
            propuestaId=propuesta_id,
            tipoDocumentoId=tipo_documento_id,
            rutaArchivo=ruta_s3,
            nombreArchivo=archivo.filename,
            tamanioBytes=tamanio_bytes,
            checksum=checksum,
            usuarioCargaId=usuario_actual.usuarioId,
            activo=True,
            usuarioAuditoriaId=usuario_actual.usuarioId,
            ultimaAuditoria=datetime.now(timezone.utc)
        )
        sesion.add(documento_a_retornar)

    # =========================================================================
    # 7. LÓGICA ESPECIAL: Si es Form-04 (.docx), parsear y guardar en la BD
    # =========================================================================
    if tipo_documento_id == 1 and archivo.filename.lower().endswith('.docx'):
        try:
            print(f"🔍 Detectado Form-04 (.docx). Iniciando parseo para propuesta {propuesta_id}...")
            datos = parsear_form04_docx(contenido)
            
            # A. Actualizar tabla Propuestas (Cabecera)
            propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
            if propuesta:
                if datos.get("titulo"): propuesta.titulo = datos["titulo"]
                if datos.get("fecha_inicio"):
                    try: propuesta.fechaInicio = datetime.strptime(datos["fecha_inicio"], "%d/%m/%Y").date()
                    except Exception: pass
                if datos.get("fecha_fin"):
                    try: propuesta.fechaFinalizacion = datetime.strptime(datos["fecha_fin"], "%d/%m/%Y").date()
                    except Exception: pass
                if datos.get("modalidad"):
                    mod_obj = sesion.query(Modalidades).filter(Modalidades.nombreModalidad.ilike(f"%{datos['modalidad']}%")).first()
                    if mod_obj: propuesta.modalidadId = mod_obj.modalidadId
                propuesta.ultimaAuditoria = datetime.now(timezone.utc)

            # B. Actualizar o Crear PropuestaContenido
            contenido_db = sesion.query(PropuestaContenido).filter(PropuestaContenido.propuestaId == propuesta_id).first()
            if not contenido_db:
                contenido_db = PropuestaContenido(propuestaId=propuesta_id)
                sesion.add(contenido_db)
            
            if datos.get("resumen"): contenido_db.resumen = datos["resumen"]
            if datos.get("palabras_clave"): contenido_db.palabrasClave = datos["palabras_clave"]
            if datos.get("abstract"): contenido_db.abstract = datos["abstract"]
            if datos.get("problema_investigacion"): contenido_db.problemaInvestigacion = datos["problema_investigacion"]
            if datos.get("objetivo_general"): contenido_db.objetivoGeneral = datos["objetivo_general"]
            if datos.get("objetivos_especificos"): contenido_db.objetivosEspecificos = ";\n".join(datos["objetivos_especificos"])
            if datos.get("estado_arte"): contenido_db.estadoArte = datos["estado_arte"]
            if datos.get("metodologia"): contenido_db.metodologia = datos["metodologia"]
            if datos.get("hoja_ruta"): contenido_db.hojaRuta = datos["hoja_ruta"]
            contenido_db.ultimaAuditoria = datetime.now(timezone.utc)

            # C. Actualizar o Crear PropuestaDeclaraciones
            decl_db = sesion.query(PropuestaDeclaraciones).filter(PropuestaDeclaraciones.propuestaId == propuesta_id).first()
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
            decl_db.aceptaResguardoRepositorio = bool(datos.get("resguardo", {}).get("resguardo_compromiso"))
            decl_db.ultimaAuditoria = datetime.now(timezone.utc)
            
            print("Form-04 parseado y tablas actualizadas exitosamente.")
            
        except Exception as e:
            print(f"ADVERTENCIA: No se pudo parsear el Form-04. El archivo se subió, pero no se rellenaron las tablas. Error: {e}")

    # 8. Confirmar cambios en la base de datos
    sesion.commit()
    sesion.refresh(documento_a_retornar)

    # 9. Construir mensaje de respuesta
    mensaje_base = "Archivo guardado exitosamente en Supabase y registrado en la base de datos"
    if fue_reemplazo:
        mensaje_base += " (Se actualizó el registro existente y se eliminó la versión anterior de S3)."
    if tipo_documento_id == 1 and archivo.filename.lower().endswith('.docx'):
        mensaje_base += " (Datos del Form-04 extraídos y guardados en tablas)."

    url_publica = obtener_url_documento(documento_a_retornar.rutaArchivo)

    return {
        "mensaje": mensaje_base,
        "documentoId": documento_a_retornar.documentoId,
        "nombre": documento_a_retornar.nombreArchivo,
        "ruta": documento_a_retornar.rutaArchivo,
        "urlDescarga": url_publica,
        "tamanioBytes": documento_a_retornar.tamanioBytes,
        "checksum": documento_a_retornar.checksum,
        "reemplazado": fue_reemplazo
    }


@router.get("/{propuesta_id}/archivos/{nombre_archivo:path}")
async def descargar_archivo_propuesta(
    propuesta_id: int,
    nombre_archivo: str,
    sesion: Session = Depends(get_db)
):
    """Redirige a la URL pública de Supabase para descargar el archivo."""
    from fastapi.responses import RedirectResponse

    doc = sesion.query(PropuestaDocumentos).filter(
        PropuestaDocumentos.propuestaId == propuesta_id,
        PropuestaDocumentos.nombreArchivo == nombre_archivo,
        PropuestaDocumentos.activo == True
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Registro del archivo no encontrado o no está activo en la base de datos")

    url_publica = obtener_url_documento(doc.rutaArchivo)
    return RedirectResponse(url=url_publica, status_code=302)