# src/services/comite_tecnico/ia_service.py
import io
import time
import json
import re
import os
import requests
from src.utils.s3_client import s3_client, S3_BUCKET_NAME
from src.services.comite_tecnico.rubricas_data import (
    RUBRICA_FORTALECIMIENTO, RUBRICA_BASICA_APLICADA, RUBRICA_DESARROLLO_TECNOLOGICO
)

# ============================================================================
# CONFIGURACIÓN DE HUGGING FACE (Gratis, Cloud, Sin Tarjeta)
# ============================================================================
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
if not HF_API_TOKEN:
    raise ValueError("⚠️ La variable de entorno HF_API_TOKEN no está configurada.")

# Modelo gratuito y estable que no requiere aprobación de puerta (Gate) en HF
MODELO_ACTIVO = "mistralai/Mistral-7B-Instruct-v0.2"
HF_API_URL = f"https://api-inference.huggingface.co/models/{MODELO_ACTIVO}"

HEADERS = {
    "Authorization": f"Bearer {HF_API_TOKEN}",
    "Content-Type": "application/json"
}

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
    if not palabras: return texto_completo[:1000]
    
    lineas = texto_completo.split('\n')
    seccion = []
    capturando = False
    for linea in lineas:
        if any(p in linea for p in palabras): 
            capturando = True
        if capturando:
            if linea.strip() and not re.match(r'^[\|\s\-]+$', linea):
                seccion.append(linea)
            if len('\n'.join(seccion)) > 800: 
                break
    return '\n'.join(seccion)[:1000] if seccion else texto_completo[:1000]

def obtener_rubrica_por_modalidad(tipo_modalidad: str) -> dict:
    if not tipo_modalidad: return RUBRICA_BASICA_APLICADA
    if tipo_modalidad in RUBRICAS_POR_MODALIDAD: return RUBRICAS_POR_MODALIDAD[tipo_modalidad]
    tipo_lower = tipo_modalidad.lower()
    for clave, rubrica in RUBRICAS_POR_MODALIDAD.items():
        if clave.lower() in tipo_lower or tipo_lower in clave.lower(): return rubrica
    return RUBRICA_BASICA_APLICADA

def extraer_json_de_respuesta(texto: str) -> list:
    """Extrae robustamente el array JSON de la respuesta, incluso si tiene markdown."""
    # 1. Intentar encontrar un bloque de código JSON
    match = re.search(r'```json\s*(\[[\s\S]*?\])\s*```', texto, re.IGNORECASE)
    if match:
        return json.loads(match.group(1))
    
    # 2. Intentar encontrar cualquier array JSON
    match = re.search(r'\[\s*\{.*?\}\s*\]', texto, re.DOTALL)
    if match:
        return json.loads(match.group(0))
        
    # 3. Si falla, intentar parsear todo el texto (a veces lo devuelve limpio)
    return json.loads(texto)

def llamar_a_ia(prompt: str) -> str:
    """Llama a la API gratuita de Hugging Face."""
    # Formato de chat específico para Mistral Instruct
    mensajes = f"<s>[INST] Eres un evaluador experto de proyectos de investigación. Responde ÚNICAMENTE con un array JSON válido, sin texto adicional, sin markdown, sin explicaciones.\n\n{prompt} [/INST]"
    
    payload = {
        "inputs": mensajes,
        "parameters": {
            "temperature": 0.1,
            "max_new_tokens": 1500,
            "return_full_text": False
        }
    }
    
    # La primera vez que se llama a un modelo inactivo en HF, puede tardar ~20-30s en "despertar"
    response = requests.post(HF_API_URL, headers=HEADERS, json=payload, timeout=60)
    
    if response.status_code == 503:
        raise Exception("El modelo se está cargando en Hugging Face. Espera 30 segundos y vuelve a intentar.")
    elif response.status_code != 200:
        raise Exception(f"Error de API {response.status_code}: {response.text}")
        
    resultado = response.json()
    if isinstance(resultado, list) and "generated_text" in resultado[0]:
        return resultado[0]["generated_text"]
    
    raise Exception(f"Respuesta inesperada de HF: {resultado}")

def analizar_documento_completo(propuesta_id: int, tipo_modalidad: str = None, criterios_reales_por_seccion: dict = None) -> dict:
    inicio_total = time.time()
    sugerencias = {}
    total_evaluados = 0
    
    print(f"\n{'='*60}")
    print(f"🤖 INICIANDO ANÁLISIS (Hugging Face - Mistral 7B) para propuesta {propuesta_id}")
    
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
        
        prompt = f"""SECCIÓN A EVALUAR: {nombre}
CONTENIDO:
{texto_seccion}

CRITERIOS (Usa estos nombres EXACTOS):
{criterios_lista}

INSTRUCCIONES:
1. Asigna puntaje (0, 6, 8, o 10) y nivel (Deficiente, Regular, Bueno, Excelente).
2. Justificación breve (1-2 frases).
3. Responde SOLO con un array JSON. Exactamente {len(criterios)} objetos.

Formato JSON requerido:
[
  {{"criterio": "Nombre exacto", "puntaje": 8, "nivel": "Bueno", "justificacion": "Frase."}}
]"""

        try:
            respuesta_raw = llamar_a_ia(prompt)
            evaluaciones = extraer_json_de_respuesta(respuesta_raw)
            
            if isinstance(evaluaciones, list):
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
                    sugerencias[str(seccion_id)] = {"nombre": nombre, "criterios": evaluaciones_validas}
                    total_evaluados += len(evaluaciones_validas)
                    print(f"  ✅ {nombre}: {len(evaluaciones_validas)} criterios")
                else:
                    print(f"  ⚠️ {nombre}: JSON vacío o inválido. Respuesta: {respuesta_raw[:100]}")
            else:
                print(f"  ⚠️ {nombre}: La respuesta no fue un array")
                
        except json.JSONDecodeError:
            print(f"  💥 {nombre}: Error parseando JSON. Respuesta: {respuesta_raw[:150]}")
        except Exception as e:
            print(f"  💥 {nombre}: {str(e)[:100]}")

    tiempo_total = time.time() - inicio_total
    print(f"🏁 Finalizado en {tiempo_total:.1f}s. Total: {total_evaluados}")

    if total_evaluados == 0:
        return {"error": "La IA no evaluó ningún criterio."}

    return {
        "propuestaId": propuesta_id,
        "documentoAnalizado": True,
        "rubricaUsada": rubrica["nombre"],
        "tiempoSegundos": round(tiempo_total, 1),
        "totalCriteriosEvaluados": total_evaluados,
        "sugerencias": sugerencias
    }