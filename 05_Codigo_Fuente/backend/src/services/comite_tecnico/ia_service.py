# src/services/comite_tecnico/ia_service.py
import io
import time
import json
import re
import os
import google.generativeai as genai
from src.utils.s3_client import s3_client, S3_BUCKET_NAME
from src.services.comite_tecnico.rubricas_data import (
    RUBRICA_FORTALECIMIENTO, RUBRICA_BASICA_APLICADA, RUBRICA_DESARROLLO_TECNOLOGICO
)

# ============================================================================
# CONFIGURACIÓN DE GEMINI
# ============================================================================
# Configurar la API Key desde las variables de entorno (Render o local .env)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ ADVERTENCIA: GEMINI_API_KEY no está configurada en las variables de entorno.")

genai.configure(api_key=GEMINI_API_KEY)
# Usamos 1.5 Flash por su velocidad y ventana de contexto de 1 millón de tokens
model = genai.GenerativeModel("gemini-2.0-flash")

RUBRICAS_POR_MODALIDAD = {
    "fortalecimiento": RUBRICA_FORTALECIMIENTO,
    "basica_aplicada": RUBRICA_BASICA_APLICADA,
    "desarrollo_tecnologico": RUBRICA_DESARROLLO_TECNOLOGICO,
    "Investigación básica y aplicada": RUBRICA_BASICA_APLICADA,
    "Investigación básica": RUBRICA_BASICA_APLICADA,
    "Investigación aplicada": RUBRICA_BASICA_APLICADA,
    "Desarrollo tecnológico": RUBRICA_DESARROLLO_TECNOLOGICO,
    "Actividades de Fortalecimiento": RUBRICA_FORTALECIMIENTO,
    "Fortalecimiento": RUBRICA_FORTALECIMIENTO,
}

MAPEO_SECCIONES_FORMULARIO = {
    "GRUPO INVESTIGADOR": ["3.", "Equipo de investigación", "Cuadro 2"],
    "FUNDAMENTACIÓN Y VACÍO DE CONOCIMIENTO": ["4.", "Problema de investigación", "7.", "Estado del arte"],
    "FUNDAMENTACIÓN DE LA ACTIVIDAD": ["4.", "Problema de investigación"],
    "FUNDAMENTACIÓN TECNOLÓGICA": ["4.", "Problema", "7.", "Estado del arte"],
    "METODOLOGÍA": ["8.", "Metodología"],
    "METODOLOGÍA DE DESARROLLO": ["8.", "Metodología"],
    "PLAN DE ACCIÓN Y CRONOGRAMA": ["9.", "Plan de acción"],
    "PRESUPUESTO": ["10.", "Presupuesto"],
    "GESTIÓN DE RIESGOS": ["riesgo", "mitigación"],
    "ASPECTOS ÉTICOS": ["15.", "Aspectos Éticos"],
    "ASPECTOS ÉTICOS Y DE PROPIEDAD INTELECTUAL": ["15.", "Aspectos Éticos", "propiedad intelectual"],
    "PERTINENCIA E IMPACTO": ["16.", "Hoja de ruta", "ODS"],
    "PERTINENCIA, INNOVACIÓN E IMPACTO": ["16.", "Hoja de ruta", "ODS", "innovación"],
}

def descargar_archivo(ruta_archivo: str) -> bytes:
    response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=ruta_archivo)
    return response['Body'].read()

def extraer_texto_pdf(pdf_bytes: bytes) -> str:
    import pdfplumber
    texto = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for pagina in pdf.pages:
            t = pagina.extract_text()
            if t: texto += t + "\n"
    return texto

def extraer_texto_docx(docx_bytes: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(docx_bytes))
    texto = ""
    for para in doc.paragraphs:
        texto += para.text + "\n"
    for tabla in doc.tables:
        for fila in tabla.rows:
            celdas_limpias = [celda.text.strip() for celda in fila.cells if celda.text.strip()]
            if celdas_limpias:
                texto += " | ".join(celdas_limpias) + "\n"
    return texto

def extraer_texto_documento(ruta_archivo: str) -> str:
    archivo_bytes = descargar_archivo(ruta_archivo)
    ruta_lower = ruta_archivo.lower()
    if ruta_lower.endswith('.pdf'): 
        return extraer_texto_pdf(archivo_bytes)
    elif ruta_lower.endswith('.docx'): 
        return extraer_texto_docx(archivo_bytes)
    raise ValueError(f"Formato no soportado: {ruta_archivo}")

def extraer_seccion_del_texto(texto_completo: str, nombre_seccion: str) -> str:
    palabras = MAPEO_SECCIONES_FORMULARIO.get(nombre_seccion.upper(), [])
    if not palabras: return texto_completo[:500] # Aumentado un poco, Gemini maneja más contexto
    
    lineas = texto_completo.split('\n')
    seccion = []
    capturando = False
    for linea in lineas:
        if any(p in linea for p in palabras): 
            capturando = True
        if capturando:
            if linea.strip() and not re.match(r'^[\|\s\-]+$', linea):
                seccion.append(linea)
            if len('\n'.join(seccion)) > 800: # Aumentado el límite para dar más contexto a la IA
                break
    return '\n'.join(seccion)[:1000] if seccion else texto_completo[:1000]

def obtener_rubrica_por_modalidad(tipo_modalidad: str) -> dict:
    if not tipo_modalidad: return RUBRICA_BASICA_APLICADA
    if tipo_modalidad in RUBRICAS_POR_MODALIDAD: return RUBRICAS_POR_MODALIDAD[tipo_modalidad]
    tipo_lower = tipo_modalidad.lower()
    for clave, rubrica in RUBRICAS_POR_MODALIDAD.items():
        if clave.lower() in tipo_lower or tipo_lower in clave.lower(): return rubrica
    return RUBRICA_BASICA_APLICADA

def analizar_documento_completo(propuesta_id: int, tipo_modalidad: str = None, criterios_reales_por_seccion: dict = None) -> dict:
    inicio_total = time.time()
    sugerencias = {}
    total_evaluados = 0
    
    print(f"\n{'='*60}")
    print(f"🤖 INICIANDO ANÁLISIS (Gemini 1.5 Flash) para propuesta {propuesta_id}")
    
    rubrica = obtener_rubrica_por_modalidad(tipo_modalidad)
    print(f"📚 Rúbrica: {rubrica['nombre']}")
    
    try:
        texto_completo = extraer_texto_documento(f"propuestas/{propuesta_id}/Form-04.docx")
        print(f"📏 Texto extraído: {len(texto_completo)} caracteres")
    except Exception as e:
        return {"error": f"No se pudo leer el documento: {str(e)}"}

    for seccion in rubrica["secciones"]:
        nombre = seccion["nombre"]
        seccion_id = seccion["id"]
        
        if criterios_reales_por_seccion and seccion_id in criterios_reales_por_seccion:
            criterios = criterios_reales_por_seccion[seccion_id]
        else:
            criterios = [c["nombre"] for c in seccion.get("criterios", [])]
        
        if not criterios: continue

        texto_seccion = extraer_seccion_del_texto(texto_completo, nombre)
        print(f"⏳ Procesando: {nombre} ({len(criterios)} criterios)...")

        criterios_lista = "\n".join([f"  - {c}" for c in criterios])
        
        prompt = f"""Eres un evaluador experto y riguroso de proyectos de investigación académica.

SECCIÓN A EVALUAR: {nombre}

CONTENIDO DEL FORMULARIO:
{texto_seccion}

CRITERIOS A EVALUAR (Debes usar estos nombres EXACTOS):
{criterios_lista}

INSTRUCCIONES CRÍTICAS:
1. Analiza el contenido y asigna un puntaje (0, 6, 8, o 10) a CADA criterio.
2. Escribe una justificación breve (1-2 frases) basada en evidencia del texto.
3. Responde EXCLUSIVAMENTE con un array JSON válido. No incluyas texto antes o después del JSON.
4. Debes generar exactamente {len(criterios)} objetos, uno por cada criterio listado.

Formato JSON requerido:
[
  {{"criterio": "Nombre exacto del criterio", "puntaje": 8, "nivel": "Bueno", "justificacion": "Frase breve basada en el texto."}}
]"""

        try:
            # Llamada a Gemini con generación forzada de JSON
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json", # ¡Esto garantiza JSON puro!
                    temperature=0.2
                )
            )
            
            # Parsear la respuesta (ya viene limpia gracias a response_mime_type)
            evaluaciones = json.loads(response.text)
            
            if isinstance(evaluaciones, list):
                # Filtrar datos corruptos o incompletos
                evaluaciones_validas = [
                    ev for ev in evaluaciones 
                    if isinstance(ev, dict) 
                    and "criterio" in ev 
                    and "puntaje" in ev
                    and isinstance(ev.get("criterio"), str)
                    and len(ev.get("criterio", "")) > 5
                    and isinstance(ev.get("puntaje"), (int, float))
                ]
                
                if evaluaciones_validas:
                    sugerencias[str(seccion_id)] = {
                        "nombre": nombre,
                        "criterios": evaluaciones_validas
                    }
                    total_evaluados += len(evaluaciones_validas)
                    print(f"  ✅ {nombre}: {len(evaluaciones_validas)} criterios evaluados")
                else:
                    print(f"  ⚠️ {nombre}: Evaluaciones inválidas o vacías")
            else:
                print(f"  ⚠️ {nombre}: La respuesta no fue un array JSON")
                
        except json.JSONDecodeError as e:
            print(f"  💥 {nombre}: Error de formato JSON. Respuesta cruda: {response.text[:100]}")
        except Exception as e:
            print(f"  💥 {nombre}: {str(e)[:100]}")

    tiempo_total = time.time() - inicio_total
    print(f"🏁 Finalizado en {tiempo_total:.1f}s. Total criterios evaluados: {total_evaluados}")

    if total_evaluados == 0:
        return {"error": "La IA no pudo evaluar ningún criterio. Revisa el formato del documento o la conexión."}

    return {
        "propuestaId": propuesta_id,
        "documentoAnalizado": True,
        "rubricaUsada": rubrica["nombre"],
        "tiempoSegundos": round(tiempo_total, 1),
        "totalCriteriosEvaluados": total_evaluados,
        "sugerencias": sugerencias
    }