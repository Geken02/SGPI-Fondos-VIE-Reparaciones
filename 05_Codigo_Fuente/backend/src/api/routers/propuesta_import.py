from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from datetime import datetime, timezone
import json
import traceback

from src.database import get_db
from src.utils.dependencias import obtener_usuario_activo
from src.models.usuarios import Usuario
from src.models.catalogos import Modalidades
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido
from src.models.propuesta_contenido import PropuestaDeclaraciones  # ⚠️ Verifica este import
from src.services.form04_parser import parsear_form04_docx

router = APIRouter(prefix="/api/propuestas", tags=["Importación de Formularios"])

@router.post("/{propuesta_id}/importar-form04")
async def importar_form04(
    propuesta_id: int,
    archivo: UploadFile = File(...),
    usuario_actual: Usuario = Depends(obtener_usuario_activo),
    sesion: Session = Depends(get_db)
):
    print("\n" + "="*80)
    print(f"🔍 DEBUG ENDPOINT: Iniciando importación Form-04 para propuesta_id={propuesta_id}")
    print(f"🔍 DEBUG ENDPOINT: Usuario actual = {usuario_actual.usuarioId} ({usuario_actual.nombreUsuario})")
    print(f"🔍 DEBUG ENDPOINT: Archivo recibido = {archivo.filename}, tamaño = {archivo.size} bytes")
    print("="*80 + "\n")
    
    if not archivo.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .docx del Form-04 oficial")
    
    try:
        # =====================================================================
        # PASO 1: LEER Y PARSEAR EL ARCHIVO
        # =====================================================================
        print("📖 PASO 1: Leyendo y parseando el archivo...")
        contenido = await archivo.read()
        print(f"   ✓ Archivo leído: {len(contenido)} bytes")
        
        datos = parsear_form04_docx(contenido)
        print(f"   ✓ Parser ejecutado. Claves extraídas: {list(datos.keys())}")
        print(f"   ✓ Título extraído: {datos.get('titulo', 'VACÍO')[:80]}")
        print(f"   ✓ Modalidad extraída: {datos.get('modalidad', 'VACÍO')}")
        print(f"   ✓ TRL extraído: {datos.get('seccion1', {}).get('trl', 'VACÍO')}")
        print(f"   ✓ Resumen extraído: {len(datos.get('resumen', ''))} chars")
        
        # =====================================================================
        # PASO 2: DEBUG DE MODELOS (Verificar nombres de campos)
        # =====================================================================
        print("\n🔎 PASO 2: Inspeccionando modelos SQLAlchemy...")
        
        # Inspeccionar Propuesta
        insp_propuesta = inspect(Propuesta)
        columnas_propuesta = [c.key for c in insp_propuesta.columns]
        print(f"   📋 Columnas en modelo Propuesta: {columnas_propuesta}")
        
        # Inspeccionar PropuestaContenido
        insp_contenido = inspect(PropuestaContenido)
        columnas_contenido = [c.key for c in insp_contenido.columns]
        print(f"   📋 Columnas en modelo PropuestaContenido: {columnas_contenido}")
        
        # Inspeccionar PropuestaDeclaraciones
        insp_decl = inspect(PropuestaDeclaraciones)
        columnas_decl = [c.key for c in insp_decl.columns]
        print(f"   📋 Columnas en modelo PropuestaDeclaraciones: {columnas_decl}")
        
        # Inspeccionar Modalidades
        insp_mod = inspect(Modalidades)
        columnas_mod = [c.key for c in insp_mod.columns]
        print(f"   📋 Columnas en modelo Modalidades: {columnas_mod}")
        
        # =====================================================================
        # PASO 3: ACTUALIZAR PROPUESTA (Cabecera)
        # =====================================================================
        print("\n📝 PASO 3: Actualizando tabla Propuestas...")
        propuesta = sesion.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        
        if not propuesta:
            print(f"   ❌ ERROR: Propuesta {propuesta_id} NO encontrada en la BD")
            raise HTTPException(status_code=404, detail="Propuesta no encontrada")
        
        print(f"   ✓ Propuesta encontrada: ID={propuesta.propuestaId}, título actual='{propuesta.titulo[:50]}...'")
        
        # Actualizar título
        if datos.get("titulo"):
            print(f"   → Actualizando título: '{datos['titulo'][:50]}...'")
            propuesta.titulo = datos["titulo"]
        
        # Actualizar fechas
        if datos.get("fecha_inicio"):
            try:
                fecha_obj = datetime.strptime(datos["fecha_inicio"], "%d/%m/%Y").date()
                print(f"   → Actualizando fechaInicio: {fecha_obj}")
                propuesta.fechaInicio = fecha_obj
            except ValueError as e:
                print(f"   ⚠️ Error parseando fecha_inicio '{datos['fecha_inicio']}': {e}")
                
        if datos.get("fecha_fin"):
            try:
                fecha_obj = datetime.strptime(datos["fecha_fin"], "%d/%m/%Y").date()
                print(f"   → Actualizando fechaFinalizacion: {fecha_obj}")
                propuesta.fechaFinalizacion = fecha_obj
            except ValueError as e:
                print(f"   ⚠️ Error parseando fecha_fin '{datos['fecha_fin']}': {e}")

        # Mapear Modalidad
        modalidad_str = datos.get("modalidad", "")
        print(f"   → Buscando modalidad: '{modalidad_str}'")
        if modalidad_str:
            modalidad_obj = sesion.query(Modalidades).filter(
                Modalidades.nombreModalidad.ilike(f"%{modalidad_str}%")
            ).first()
            
            if modalidad_obj:
                print(f"   ✓ Modalidad encontrada: ID={modalidad_obj.modalidadId}, nombre='{modalidad_obj.nombreModalidad}'")
                propuesta.modalidadId = modalidad_obj.modalidadId
            else:
                print(f"   ⚠️ ADVERTENCIA: Modalidad '{modalidad_str}' NO encontrada en la BD. Listando todas las modalidades:")
                todas_modalidades = sesion.query(Modalidades).all()
                for m in todas_modalidades:
                    print(f"      - ID={m.modalidadId}: '{m.nombreModalidad}'")
            
        # Mapear TRL
        trl = datos.get("seccion1", {}).get("trl")
        if trl:
            print(f"   → Actualizando nivelTrlActual: {trl}")
            propuesta.nivelTrlActual = int(trl)
            
        propuesta.ultimaAuditoria = datetime.now(timezone.utc)
        print(f"   ✓ Propuesta actualizada en memoria")

        # =====================================================================
        # PASO 4: ACTUALIZAR PROPUESTA CONTENIDO (Textos largos)
        # =====================================================================
        print("\n📝 PASO 4: Actualizando tabla PropuestaContenido...")
        contenido_db = sesion.query(PropuestaContenido).filter(
            PropuestaContenido.propuestaId == propuesta_id
        ).first()
        
        if not contenido_db:
            print(f"   → Creando nuevo registro PropuestaContenido para propuesta_id={propuesta_id}")
            contenido_db = PropuestaContenido(propuestaId=propuesta_id)
            sesion.add(contenido_db)
        else:
            print(f"   ✓ Registro PropuestaContenido existente encontrado")
        
        # Mapeo de campos con verificación
        campos_texto = [
            ("resumen", "resumen"),
            ("palabras_clave", "palabrasClave"),
            ("abstract", "abstract"),
            ("problema_investigacion", "problemaInvestigacion"),
            ("objetivo_general", "objetivoGeneral"),
            ("estado_arte", "estadoArte"),
            ("metodologia", "metodologia"),
            ("hoja_ruta", "hojaRuta"),
        ]
        
        for campo_parser, campo_modelo in campos_texto:
            valor = datos.get(campo_parser)
            if valor:
                if hasattr(contenido_db, campo_modelo):
                    print(f"   → Seteando {campo_modelo}: {len(valor)} chars")
                    setattr(contenido_db, campo_modelo, valor)
                else:
                    print(f"   ❌ ERROR: El modelo PropuestaContenido NO tiene el campo '{campo_modelo}'")
        
        # Objetivos específicos (lista → string)
        if datos.get("objetivos_especificos"):
            objetivos_str = ";\n".join(datos["objetivos_especificos"])
            if hasattr(contenido_db, "objetivosEspecificos"):
                print(f"   → Seteando objetivosEspecificos: {len(objetivos_str)} chars")
                contenido_db.objetivosEspecificos = objetivos_str
            else:
                print(f"   ❌ ERROR: El modelo NO tiene el campo 'objetivosEspecificos'")
        
        # Divulgación (dict → JSON string)
        if datos.get("divulgacion"):
            div_json = json.dumps(datos["divulgacion"], ensure_ascii=False)
            if hasattr(contenido_db, "estrategiaDivulgacion"):
                print(f"   → Seteando estrategiaDivulgacion (JSON): {len(div_json)} chars")
                contenido_db.estrategiaDivulgacion = div_json
            else:
                print(f"   ❌ ERROR: El modelo NO tiene el campo 'estrategiaDivulgacion'")
            
        contenido_db.ultimaAuditoria = datetime.now(timezone.utc)
        print(f"   ✓ PropuestaContenido actualizada en memoria")

        # =====================================================================
        # PASO 5: ACTUALIZAR PROPUESTA DECLARACIONES (Checkboxes)
        # =====================================================================
        print("\n📝 PASO 5: Actualizando tabla PropuestaDeclaraciones...")
        decl_db = sesion.query(PropuestaDeclaraciones).filter(
            PropuestaDeclaraciones.propuestaId == propuesta_id
        ).first()
        
        if not decl_db:
            print(f"   → Creando nuevo registro PropuestaDeclaraciones para propuesta_id={propuesta_id}")
            decl_db = PropuestaDeclaraciones(propuestaId=propuesta_id)
            sesion.add(decl_db)
        else:
            print(f"   ✓ Registro PropuestaDeclaraciones existente encontrado")
            
        s1 = datos.get("seccion1", {})
        
        # Mapeo de checkboxes
        checkboxes = [
            ("otras_fuentes", "tieneFinanciamientoPrevio"),
            ("vinculacion_tecnica", "tieneContinuidadProyecto"),
            ("instrumento_juridico", "requiereInstrumentoJuridico"),
            ("info_confidencial", "tieneInformacionConfidencial"),
            ("potencial_pi", "tienePotencialPI"),
            ("posee_innovacion", "poseeInnovacion"),
        ]
        
        for campo_parser, campo_modelo in checkboxes:
            valor = bool(s1.get(campo_parser, {}).get("aplica", False))
            if hasattr(decl_db, campo_modelo):
                print(f"   → Seteando {campo_modelo}: {valor}")
                setattr(decl_db, campo_modelo, valor)
            else:
                print(f"   ❌ ERROR: El modelo NO tiene el campo '{campo_modelo}'")
        
        # Base posgrado (caso especial)
        base_posgrado_valor = s1.get("base_posgrado", {}).get("aplica", "No")
        if hasattr(decl_db, "tieneBasePosgrado"):
            decl_db.tieneBasePosgrado = bool(base_posgrado_valor != "No")
            print(f"   → Seteando tieneBasePosgrado: {base_posgrado_valor != 'No'} (valor original: '{base_posgrado_valor}')")
        else:
            print(f"   ❌ ERROR: El modelo NO tiene el campo 'tieneBasePosgrado'")
        
        # Resguardo
        resguardo_compromiso = bool(datos.get("resguardo", {}).get("resguardo_compromiso", False))
        if hasattr(decl_db, "aceptaResguardoRepositorio"):
            decl_db.aceptaResguardoRepositorio = resguardo_compromiso
            print(f"   → Seteando aceptaResguardoRepositorio: {resguardo_compromiso}")
        else:
            print(f"   ❌ ERROR: El modelo NO tiene el campo 'aceptaResguardoRepositorio'")
        
        if hasattr(decl_db, "aceptaDeclaracionJurada"):
            decl_db.aceptaDeclaracionJurada = True
            print(f"   → Seteando aceptaDeclaracionJurada: True")
        
        decl_db.ultimaAuditoria = datetime.now(timezone.utc)
        print(f"   ✓ PropuestaDeclaraciones actualizada en memoria")

        # =====================================================================
        # PASO 6: COMMIT A LA BASE DE DATOS
        # =====================================================================
        print("\n💾 PASO 6: Ejecutando COMMIT a la base de datos...")
        try:
            sesion.commit()
            print(f"   ✓ COMMIT exitoso. Todos los cambios persistidos.")
        except Exception as commit_err:
            print(f"   ❌ ERROR en COMMIT: {type(commit_err).__name__}: {commit_err}")
            sesion.rollback()
            raise
        
        # =====================================================================
        # RESPUESTA EXITOSA
        # =====================================================================
        respuesta = {
            "mensaje": "Form-04 importado y guardado exitosamente en la base de datos",
            "titulo": datos.get("titulo", "Sin título"),
            "modalidad": modalidad_str,
            "fechas": f"{datos.get('fecha_inicio')} a {datos.get('fecha_fin')}",
            "debug": {
                "propuesta_id": propuesta_id,
                "campos_actualizados_propuesta": ["titulo", "fechaInicio", "fechaFinalizacion", "modalidadId", "nivelTrlActual"],
                "campos_actualizados_contenido": [c[1] for c in campos_texto if datos.get(c[0])],
                "checkboxes_actualizados": [c[1] for c in checkboxes if s1.get(c[0], {}).get("aplica")]
            }
        }
        
        print("\n✅ ENDPOINT COMPLETADO EXITOSAMENTE")
        print(f"   Respuesta: {json.dumps(respuesta, ensure_ascii=False, indent=2)}")
        print("="*80 + "\n")
        
        return respuesta
        
    except HTTPException:
        print(f"\n❌ HTTPException lanzada: {traceback.format_exc()}")
        raise
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO en el endpoint:")
        print(f"   Tipo: {type(e).__name__}")
        print(f"   Mensaje: {str(e)}")
        print(f"   Traceback completo:")
        traceback.print_exc()
        sesion.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Error al procesar el documento: {type(e).__name__}: {str(e)}"
        )