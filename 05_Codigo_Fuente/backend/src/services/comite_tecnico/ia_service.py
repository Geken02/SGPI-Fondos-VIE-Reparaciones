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
# CONFIGURACIÓN DE CLOUDFLARE WORKERS AI (100% Gratis, Sin Tarjeta, Cloud)
# ============================================================================
CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID")
CF_API_TOKEN = os.getenv("CF_API_TOKEN")

if not CF_ACCOUNT_ID or not CF_API_TOKEN:
    raise ValueError("⚠️ Faltan las variables CF_ACCOUNT_ID o CF_API_TOKEN en Render.")

MODELO_ACTIVO = "@cf/meta/llama-3.1-8b-instruct"
CF_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{MODELO_ACTIVO}"

HEADERS = {
    "Authorization": f"Bearer {CF_API_TOKEN}",
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

def extraer_json_de_respuesta(respuesta) -> list:
    """Extrae robustamente el array JSON de la respuesta."""
    # 1. Si ya es una lista, devuélvela directamente
    if isinstance(respuesta, list):
        return respuesta
    
    # 2. Si es un diccionario, busca la lista dentro
    if isinstance(respuesta, dict):
        if "evaluaciones" in respuesta and isinstance(respuesta["evaluaciones"], list):
            return respuesta["evaluaciones"]
        for value in respuesta.values():
            if isinstance(value, list):
                return value
    
    # 3. Si es un string, procesarlo
    if isinstance(respuesta, str):
        texto = respuesta.strip()
        
        # Intento 1: Buscar bloque de código markdown ```json ... ```
        match = re.search(r'```json\s*(\[[\s\S]*?\])\s*```', texto, re.IGNORECASE)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Intento 2: Buscar el PRIMER '[' y el ÚLTIMO ']' (Mucho más robusto)
        start_idx = texto.find('[')
        end_idx = texto.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = texto[start_idx:end_idx+1]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # Intento 3: Parsear todo el string directamente
        try:
            parsed = json.loads(texto)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict):
                for value in parsed.values():
                    if isinstance(value, list):
                        return value
        except json.JSONDecodeError:
            pass
    
    print(f"⚠️ No se pudo extraer JSON de: {str(respuesta)[:200]}")
    return []

def llamar_a_ia(prompt: str) -> str:
    """Llama a Cloudflare Workers AI."""
    payload = {
        "messages": [
            {
                "role": "system", 
                "content": "Eres un evaluador experto de proyectos de investigación. Tu ÚNICA tarea es devolver un array JSON válido. NO incluyas texto adicional, NO uses markdown, NO expliques nada. Solo el array JSON."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "max_tokens": 2000 
    }
    
    response = requests.post(CF_API_URL, headers=HEADERS, json=payload, timeout=60)
    
    if response.status_code != 200:
        raise Exception(f"Error de API {response.status_code}: {response.text}")
        
    data = response.json()
    if data.get("success"):
        return data["result"]["response"]
    
    raise Exception(f"Cloudflare falló: {data.get('errors')}")

def analizar_documento_completo(propuesta_id: int, tipo_modalidad: str = None, criterios_reales_por_seccion: dict = None) -> dict:
    inicio_total = time.time()
    sugerencias = {}
    total_evaluados = 0
    
    print(f"\n{'='*60}")
    print(f"🤖 INICIANDO ANÁLISIS (Cloudflare AI - Llama 3.1) para propuesta {propuesta_id}")
    
    rubrica = obtener_rubrica_por_modalidad(tipo_modalidad)
    print(f"📚 Rúbrica: {rubrica['nombre']}")
    
    # 1. Extraer texto completo del documento
    try:
        texto_completo = extraer_texto_documento(f"propuestas/{propuesta_id}/Form-04.docx")
        print(f"📏 Texto extraído: {len(texto_completo)} caracteres")
    except Exception as e:
        return {"error": f"No se pudo leer el documento: {str(e)}"}

    # 2. Iterar por cada sección de la rúbrica
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
CONTENIDO DEL FORMULARIO:
{texto_seccion}

CRITERIOS A EVALUAR (Usa estos nombres EXACTOS):
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
            
            if isinstance(evaluaciones, list) and len(evaluaciones) > 0:
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
                    print(f"  ⚠️ {nombre}: JSON vacío o inválido. Respuesta: {str(respuesta_raw)[:100]}")
            else:
                print(f"  ⚠️ {nombre}: La respuesta no fue un array válido. Respuesta: {str(respuesta_raw)[:100]}")
                
        except Exception as e:
            print(f"  💥 {nombre}: Error inesperado: {str(e)[:100]}")

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