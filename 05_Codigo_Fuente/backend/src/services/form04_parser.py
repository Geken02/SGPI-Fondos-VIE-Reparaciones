import re
from docx import Document
from docx.table import Table
from io import BytesIO
from typing import Dict, Any, List, Optional


def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser robusto para Form-04 que maneja:
    - Checkboxes como símbolos Unicode (☑, ✓, ✔, ☒)
    - Checkboxes como texto ("Sí", "No")
    - Variaciones en formato de secciones
    - Tablas con diferentes estructuras
    """
    try:
        doc = Document(BytesIO(archivo_bytes))
        
        # Extraer TODO el texto del documento de forma estructurada
        texto_completo = extraer_texto_completo(doc)
        
        datos = {
            "titulo": "",
            "fecha_inicio": "",
            "fecha_fin": "",
            "modalidad": "",
            "seccion1": {
                "otras_fuentes": {"aplica": False, "detalle": ""},
                "vinculacion_tecnica": {"aplica": False, "detalle": ""},
                "problemas_nacionales": {"aplica": False, "detalle": ""},
                "instrumento_juridico": {"aplica": False, "tipo": ""},
                "convenio_marco": {"aplica": False, "nombre": ""},
                "base_posgrado": {"aplica": "No", "candidato": "", "programa": "", "universidad": ""},
                "info_confidencial": {"aplica": False, "detalle": ""},
                "potencial_pi": {"aplica": False, "oficio_dictamen": ""},
                "posee_innovacion": {"aplica": False, "tipo": ""},
                "trl": 1
            },
            "resumen": "",
            "palabras_clave": "",
            "abstract": "",
            "keywords": "",
            "problema_investigacion": "",
            "objetivo_general": "",
            "objetivos_especificos": [],
            "estado_arte": "",
            "metodologia": "",
            "investigadores_tec": [],
            "colaboradores_externos": [],
            "presupuesto_anual": [],
            "financiamiento_adicional": {
                "externo": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""},
                "contrapartida": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""},
                "cofinanciamiento": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""}
            },
            "productos_14a": {
                "rango_horas": "",
                "opcion1": {"check": False, "cantidad": 0, "objetivo": ""},
                "opcion2": {"check": False, "cantidad": 0, "objetivo": ""},
                "opcion3": {"check": False, "cantidad": 0, "objetivo": ""},
                "adicional1": "",
                "adicional2": ""
            },
            "productos_14b": {
                "rango_horas": "",
                "patente": {"check": False, "cantidad": 0, "consecutivo": ""},
                "diseno": {"check": False, "cantidad": 0, "consecutivo": ""},
                "software": {"check": False, "cantidad": 0, "consecutivo": ""},
                "secreto": {"check": False, "cantidad": 0, "consecutivo": ""},
                "obtencion": {"check": False, "cantidad": 0, "consecutivo": ""},
                "marca": {"check": False, "cantidad": 0, "consecutivo": ""},
                "circuito": {"check": False, "cantidad": 0, "consecutivo": ""},
                "otros": {"check": False, "cantidad": 0, "consecutivo": ""},
                "articulo": {"check": False, "cantidad": 0, "objetivo": ""},
                "memoria": {"check": False, "cantidad": 0, "objetivo": ""},
                "paquete": {"check": False, "cantidad": 0, "objetivo": ""},
                "norma": {"check": False, "cantidad": 0, "objetivo": ""}
            },
            "resguardo": {
                "resguardo_compromiso": False,
                "resguardo_software": False
            },
            "divulgacion": {
                "cientifica": "",
                "canales_institucionales": "",
                "socializacion": "",
                "medios_masivos": ""
            },
            "aspectos_eticos": {
                "seres_humanos": False,
                "biodiversidad": False,
                "animales": False,
                "comunidades_indigenas": False,
                "acuerdo_comision": ""
            },
            "hoja_ruta": "",
            "referencias": "",
            "firma": {
                "nombre": "",
                "cedula": "",
                "firmado_digital": False
            }
        }
        
        # 1. DATOS BÁSICOS
        datos["titulo"] = buscar_en_tabla_inicial(doc, "Nombre del proyecto")
        datos["fecha_inicio"] = buscar_en_tabla_inicial(doc, "Fecha de inicio")
        datos["fecha_fin"] = buscar_en_tabla_inicial(doc, "Fecha de finalización") or \
                          buscar_en_tabla_inicial(doc, "Fecha de finalizacion")
        
        # 2. SECCIÓN 1: PREGUNTAS GENERALES
        parsear_seccion1_checkboxes(texto_completo, datos["seccion1"])
        
        # 3. SECCIONES NARRATIVAS
        datos["resumen"] = extraer_seccion_robusta(texto_completo, r"2\.\s+Resumen", r"Palabras claves?")
        datos["palabras_clave"] = extraer_seccion_robusta(texto_completo, r"Palabras claves?", r"Abstract")
        datos["abstract"] = extraer_seccion_robusta(texto_completo, r"Abstract", r"Keywords?")
        datos["keywords"] = extraer_seccion_robusta(texto_completo, r"Keywords?", r"3\.\s+Equipo")
        datos["problema_investigacion"] = extraer_seccion_robusta(texto_completo, r"4\.\s+Problema de investigación", r"5\.\s+Objetivo general")
        datos["objetivo_general"] = extraer_seccion_robusta(texto_completo, r"5\.\s+Objetivo general", r"6\.\s+Objetivos específicos")
        
        texto_oe = extraer_seccion_robusta(texto_completo, r"6\.\s+Objetivos específicos", r"7\.\s+Estado del arte")
        if texto_oe:
            objetivos = [linea.strip() for linea in texto_oe.split('\n') if re.match(r'^\d+\.', linea.strip())]
            datos["objetivos_especificos"] = [re.sub(r'^\d+\.\s*', '', obj) for obj in objetivos]
        
        datos["estado_arte"] = extraer_seccion_robusta(texto_completo, r"7\.\s+Estado del arte", r"8\.\s+Metodología")
        datos["metodologia"] = extraer_seccion_robusta(texto_completo, r"8\.\s+Metodología", r"9\.\s+Plan de acción")
        datos["hoja_ruta"] = extraer_seccion_robusta(texto_completo, r"16\.\s+Hoja de ruta", r"17\.\s+Referencias")
        datos["referencias"] = extraer_seccion_robusta(texto_completo, r"17\.\s+Referencias", r"18\.\s+Declaración jurada")
        
        # 4. TABLAS
        for table in doc.tables:
            if es_tabla_investigadores_tec(table):
                datos["investigadores_tec"] = parsear_tabla_investigadores_tec(table)
            elif es_tabla_colaboradores(table):
                datos["colaboradores_externos"] = parsear_tabla_colaboradores(table)
            elif es_tabla_presupuesto(table):
                datos["presupuesto_anual"] = parsear_tabla_presupuesto(table)
            elif es_tabla_financiamiento(table):
                datos["financiamiento_adicional"] = parsear_tabla_financiamiento(table)
            elif es_tabla_firma(table):
                datos["firma"] = parsear_tabla_firma(table)
        
        # 5. SECCIÓN 13: RESGUARDO
        datos["resguardo"]["resguardo_compromiso"] = detectar_checkbox(
            texto_completo, 
            r"13\.\s+Resguardo.*?1\.\s+Declaro conocer.*?Repositorio Institucional"
        )
        datos["resguardo"]["resguardo_software"] = detectar_checkbox(
            texto_completo,
            r"13\.\s+Resguardo.*?2\.\s+En caso de desarrollar software"
        )
        
        # 6. SECCIÓN 14: DIVULGACIÓN
        datos["divulgacion"]["cientifica"] = extraer_seccion_robusta(
            texto_completo, r"1\.a\.\s+Divulgación científica", r"1\.b\.\s+Canales Institucionales"
        )
        datos["divulgacion"]["canales_institucionales"] = extraer_seccion_robusta(
            texto_completo, r"1\.b\.\s+Canales Institucionales", r"1\.c\.\s+Eventos de Socialización"
        )
        datos["divulgacion"]["socializacion"] = extraer_seccion_robusta(
            texto_completo, r"1\.c\.\s+Eventos de Socialización", r"1\.d\.\s+Medios Masivos"
        )
        datos["divulgacion"]["medios_masivos"] = extraer_seccion_robusta(
            texto_completo, r"1\.d\.\s+Medios Masivos", r"15\.\s+Aspectos Éticos"
        )
        
        # 7. SECCIÓN 15: ASPECTOS ÉTICOS
        datos["aspectos_eticos"]["seres_humanos"] = detectar_checkbox(
            texto_completo, r"15\.\s+Aspectos Éticos.*?1\.\s+.*?seres humanos"
        )
        datos["aspectos_eticos"]["biodiversidad"] = detectar_checkbox(
            texto_completo, r"15\.\s+Aspectos Éticos.*?2\.\s+.*?biodiversidad"
        )
        datos["aspectos_eticos"]["animales"] = detectar_checkbox(
            texto_completo, r"15\.\s+Aspectos Éticos.*?3\.\s+.*?animales"
        )
        datos["aspectos_eticos"]["comunidades_indigenas"] = detectar_checkbox(
            texto_completo, r"15\.\s+Aspectos Éticos.*?4\.\s+.*?indígenas"
        )
        
        match_exencion = re.search(
            r"15\.a\.\s+Declaración de exención.*?razones:\s*(.*?)(?:15\.b\.|16\.\s+Hoja de ruta|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_exencion:
            datos["aspectos_eticos"]["acuerdo_comision"] = match_exencion.group(1).strip()
        
        return datos
    
    except Exception as e:
        raise Exception(f"Error al parsear el documento Word: {str(e)}")


# ============================================================================
# FUNCIONES AUXILIARES ROBUSTAS
# ============================================================================

def extraer_texto_completo(doc: Document) -> str:
    """Extrae todo el texto del documento normalizando espacios y saltos de línea"""
    parrafos = []
    for para in doc.paragraphs:
        texto = para.text.strip()
        if texto:
            parrafos.append(texto)
    
    texto = "\n\n".join(parrafos)
    texto = re.sub(r'[ \t]+', ' ', texto)
    
    return texto


def buscar_en_tabla_inicial(doc: Document, campo: str) -> str:
    """Busca un valor en las primeras tablas del documento"""
    for table in doc.tables[:5]:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            if len(cells) >= 2:
                if campo.lower() in cells[0].lower():
                    return cells[1] if len(cells) > 1 else ""
    return ""


def detectar_checkbox(texto: str, patron_contexto: str) -> bool:
    """
    Detecta si un checkbox está marcado usando múltiples estrategias:
    1. Busca símbolos Unicode (☑, ✓, ✔, ☒)
    2. Busca la palabra "Sí" cerca del contexto
    3. Analiza el patrón de respuesta
    """
    match_contexto = re.search(patron_contexto, texto, re.IGNORECASE | re.DOTALL)
    if not match_contexto:
        return False
    
    inicio = match_contexto.end()
    fin = min(inicio + 500, len(texto))
    texto_cercano = texto[inicio:fin]
    
    # Estrategia 1: Buscar símbolos Unicode de checkbox marcado
    simbolos_marcados = ['☑', '✓', '✔', '☒', '✅']
    for simbolo in simbolos_marcados:
        if simbolo in texto_cercano:
            if 'Sí' in texto_cercano or 'sí' in texto_cercano:
                return True
    
    # Estrategia 2: Buscar patrón "☐ No ☑ Sí"
    patron_si_marcado = r'[☐☑✓✔☒✅]\s*(?:No|Sí|si)[\s\n]+[☐☑✓✔☒✅]\s*(?:Sí|si)'
    if re.search(patron_si_marcado, texto_cercano, re.IGNORECASE):
        return True
    
    # Estrategia 3: Buscar "Sí" como respuesta única
    lineas = texto_cercano.split('\n')
    for linea in lineas[:10]:
        linea_limpia = linea.strip()
        if re.match(r'^[☑✓✔☒✅]?\s*Sí\s*$', linea_limpia, re.IGNORECASE):
            return True
    
    return False


def parsear_seccion1_checkboxes(texto: str, seccion1: Dict[str, Any]):
    """Parsea todas las preguntas de la sección 1"""
    
    # 1.a Modalidad
    match_modalidad = re.search(
        r"1\.a\.\s+La modalidad.*?(investigación básica|investigación aplicada|investigación básica y aplicada|desarrollo tecnológico)",
        texto,
        re.IGNORECASE | re.DOTALL
    )
    if match_modalidad:
        contexto = texto[match_modalidad.start():match_modalidad.end()+100]
        if any(s in contexto for s in ['☑', '✓', '✔', '☒', '✅']):
            seccion1["modalidad"] = match_modalidad.group(1).strip().title()
    
    # 1.b Otras fuentes
    if detectar_checkbox(texto, r"1\.b\.\s+.*?otras fuentes de financiamiento"):
        seccion1["otras_fuentes"]["aplica"] = True
        detalle = extraer_detalle_despues_checkbox(texto, r"1\.b\.\s+.*?otras fuentes")
        seccion1["otras_fuentes"]["detalle"] = detalle
    
    # 1.c Vinculación técnica
    if detectar_checkbox(texto, r"1\.c\.\s+.*?vinculación técnica"):
        seccion1["vinculacion_tecnica"]["aplica"] = True
        detalle = extraer_detalle_despues_checkbox(texto, r"1\.c\.\s+.*?vinculación")
        seccion1["vinculacion_tecnica"]["detalle"] = detalle
    
    # 1.d Problemas nacionales
    if detectar_checkbox(texto, r"1\.d\.\s+.*?problemas prioritarios"):
        seccion1["problemas_nacionales"]["aplica"] = True
        detalle = extraer_detalle_despues_checkbox(texto, r"1\.d\.\s+.*?problemas")
        seccion1["problemas_nacionales"]["detalle"] = detalle
    
    # 1.e Instrumento jurídico
    if detectar_checkbox(texto, r"1\.e\.\s+.*?instrumento jurídico"):
        seccion1["instrumento_juridico"]["aplica"] = True
        if "Convenio Internacional" in texto:
            seccion1["instrumento_juridico"]["tipo"] = "Convenio Internacional"
        elif "Convenio Nacional" in texto:
            seccion1["instrumento_juridico"]["tipo"] = "Convenio Nacional"
    
    # 1.f Convenio marco
    if detectar_checkbox(texto, r"1\.f\.\s+.*?convenio marco"):
        seccion1["convenio_marco"]["aplica"] = True
        nombre = extraer_detalle_despues_checkbox(texto, r"1\.f\.\s+.*?convenio marco")
        seccion1["convenio_marco"]["nombre"] = nombre
    
    # 1.g Base posgrado
    match_posgrado = re.search(r"1\.g\.\s+.*?(Sí parcial|Sí totalmente)", texto, re.IGNORECASE | re.DOTALL)
    if match_posgrado and detectar_checkbox(texto, r"1\.g\.\s+.*?grado académico"):
        seccion1["base_posgrado"]["aplica"] = match_posgrado.group(1).strip()
        texto_posgrado = extraer_detalle_despues_checkbox(texto, r"1\.g\.\s+.*?posgrado")
        match_candidato = re.search(r"1\.\s*Nombre.*?:\s*(.*?)(?:2\.|$)", texto_posgrado, re.IGNORECASE)
        match_programa = re.search(r"2\.\s*Programa.*?:\s*(.*?)(?:3\.|$)", texto_posgrado, re.IGNORECASE)
        match_universidad = re.search(r"3\.\s*Universidad.*?:\s*(.*?)(?:1\.h\.|$)", texto_posgrado, re.IGNORECASE)
        
        if match_candidato:
            seccion1["base_posgrado"]["candidato"] = match_candidato.group(1).strip()
        if match_programa:
            seccion1["base_posgrado"]["programa"] = match_programa.group(1).strip()
        if match_universidad:
            seccion1["base_posgrado"]["universidad"] = match_universidad.group(1).strip()
    
    # 1.h Información confidencial
    if detectar_checkbox(texto, r"1\.h\.\s+.*?información sensible"):
        seccion1["info_confidencial"]["aplica"] = True
        detalle = extraer_detalle_despues_checkbox(texto, r"1\.h\.\s+.*?confidencial")
        seccion1["info_confidencial"]["detalle"] = detalle
    
    # 1.i Potencial PI
    if detectar_checkbox(texto, r"1\.i\.\s+.*?propiedad intelectual"):
        seccion1["potencial_pi"]["aplica"] = True
        match_oficio = re.search(r"(?:oficio|dictamen)[:\s]*([A-Z]{2,}-\w+-\d{4}-\d+)", texto, re.IGNORECASE)
        if match_oficio:
            seccion1["potencial_pi"]["oficio_dictamen"] = match_oficio.group(1).strip()
    
    # 1.j Innovación
    if detectar_checkbox(texto, r"1\.j\.\s+.*?innovación"):
        seccion1["posee_innovacion"]["aplica"] = True
        if "de Producto" in texto:
            seccion1["posee_innovacion"]["tipo"] = "de Producto"
        elif "de Proceso" in texto:
            seccion1["posee_innovacion"]["tipo"] = "de Proceso"
    
    # 1.k TRL
    match_trl = re.search(r"(?:TRL|nivel de madurez).*?(?:☑|✔|✓|seleccionado).*?(\d)", texto, re.IGNORECASE)
    if match_trl:
        seccion1["trl"] = int(match_trl.group(1))


def extraer_detalle_despues_checkbox(texto: str, patron: str) -> str:
    """Extrae el texto de detalle que viene después de un checkbox marcado"""
    match = re.search(patron, texto, re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    
    inicio = match.end()
    limite = re.search(r'(?:1\.[a-z]\.|2\.\s+Resumen)', texto[inicio:], re.IGNORECASE)
    if limite:
        fin = inicio + limite.start()
    else:
        fin = min(inicio + 1000, len(texto))
    
    detalle = texto[inicio:fin].strip()
    detalle = re.sub(r'[☐☑✓✔☒✅]', '', detalle).strip()
    
    return detalle


def extraer_seccion_robusta(texto: str, inicio_patron: str, fin_patron: str) -> str:
    """Extrae una sección de texto de manera robusta"""
    patron = rf"{inicio_patron}.*?\n(.*?)(?={fin_patron}|\Z)"
    match = re.search(patron, texto, re.IGNORECASE | re.DOTALL)
    if match:
        contenido = match.group(1).strip()
        contenido = re.sub(r'\n{3,}', '\n\n', contenido)
        return contenido
    return ""


# ============================================================================
# FUNCIONES PARA TABLAS
# ============================================================================

def es_tabla_investigadores_tec(table: Table) -> bool:
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'nombre y apellidos' in header_text and 'orcid' in header_text
    except IndexError:
        return False


def parsear_tabla_investigadores_tec(table: Table) -> List[Dict[str, str]]:
    investigadores = []
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 5 and cells[0] and not cells[0].startswith('[Inserte'):
            investigadores.append({
                'nombre': cells[0],
                'orcid': cells[1] if len(cells) > 1 else '',
                'instancia': cells[2] if len(cells) > 2 else '',
                'rol': cells[3] if len(cells) > 3 else '',
                'horas': cells[4] if len(cells) > 4 else '',
                'nombramiento': cells[5] if len(cells) > 5 else ''
            })
    return investigadores


def es_tabla_colaboradores(table: Table) -> bool:
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'colaborador externo' in header_text and 'institución' in header_text
    except IndexError:
        return False


def parsear_tabla_colaboradores(table: Table) -> List[Dict[str, str]]:
    colaboradores = []
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 3 and cells[0] and not cells[0].startswith('[Inserte'):
            colaboradores.append({
                'nombre': cells[0],
                'orcid': cells[1] if len(cells) > 1 else '',
                'institucion': cells[2] if len(cells) > 2 else ''
            })
    return colaboradores


def es_tabla_presupuesto(table: Table) -> bool:
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'año' in header_text and ('operativo' in header_text or 'duradero' in header_text)
    except IndexError:
        return False


def parsear_tabla_presupuesto(table: Table) -> List[Dict[str, Any]]:
    presupuesto = []
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 3:
            try:
                anio = cells[0]
                if anio in ['2027', '2028', '2029', 'Total']:
                    operativo = parsear_monto(cells[1]) if len(cells) > 1 else 0
                    duradero = parsear_monto(cells[2]) if len(cells) > 2 else 0
                    presupuesto.append({
                        'ano': f'Año {anio}' if anio != 'Total' else 'Total',
                        'operativo': operativo,
                        'duradero': duradero
                    })
            except ValueError:
                continue
    return presupuesto


def es_tabla_financiamiento(table: Table) -> bool:
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'desglose' in header_text and ('año 1' in header_text or 'oficio' in header_text)
    except IndexError:
        return False


def parsear_tabla_financiamiento(table: Table) -> Dict[str, Any]:
    financiamiento = {
        'externo': {'ano1': 0, 'ano2': 0, 'ano3': 0, 'oficio': ''},
        'contrapartida': {'ano1': 0, 'ano2': 0, 'ano3': 0, 'oficio': ''},
        'cofinanciamiento': {'ano1': 0, 'ano2': 0, 'ano3': 0, 'oficio': ''}
    }
    
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 5:
            fuente = cells[0].lower()
            if 'financiamiento externo' in fuente:
                financiamiento['externo']['ano1'] = parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['externo']['ano2'] = parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['externo']['ano3'] = parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['externo']['oficio'] = cells[4] if len(cells) > 4 else ''
            elif 'contrapartida' in fuente:
                financiamiento['contrapartida']['ano1'] = parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['contrapartida']['ano2'] = parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['contrapartida']['ano3'] = parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['contrapartida']['oficio'] = cells[4] if len(cells) > 4 else ''
            elif 'cofinanciamiento' in fuente:
                financiamiento['cofinanciamiento']['ano1'] = parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['cofinanciamiento']['ano2'] = parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['cofinanciamiento']['ano3'] = parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['cofinanciamiento']['oficio'] = cells[4] if len(cells) > 4 else ''
    
    return financiamiento


def es_tabla_firma(table: Table) -> bool:
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'nombre completo' in header_text and 'cédula' in header_text
    except IndexError:
        return False


def parsear_tabla_firma(table: Table) -> Dict[str, Any]:
    firma = {'nombre': '', 'cedula': '', 'firmado_digital': False}
    for row in table.rows:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 2:
            if 'nombre completo' in cells[0].lower():
                firma['nombre'] = cells[1]
            elif 'número de cédula' in cells[0].lower() or 'numero de ced' in cells[0].lower():
                firma['cedula'] = cells[1]
            elif 'firma digital' in cells[0].lower():
                firma['firmado_digital'] = 'sí' in cells[1].lower() or '✓' in cells[1] or '✔' in cells[1]
    return firma


def parsear_monto(texto: str) -> float:
    texto_limpio = re.sub(r'[₡,\s]', '', texto)
    try:
        return float(texto_limpio)
    except ValueError:
        return 0.0