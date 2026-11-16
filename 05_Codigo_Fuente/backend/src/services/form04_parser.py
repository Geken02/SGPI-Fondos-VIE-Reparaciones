# src/services/form04_parser.py
from docx import Document
from docx.table import Table
from io import BytesIO
import re
from typing import Dict, Any, List

def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Extrae todos los datos del Form-04 oficial (.docx):
    - Texto de secciones narrativas (resumen, problema, objetivos, etc.)
    - Tablas (Cuadro 2: Investigadores TEC, Cuadro 3: Colaboradores, Cuadro 4: Presupuesto, Cuadro 5: Financiamiento)
    - Checkboxes (Sección 1: Preguntas generales, Sección 13: Resguardo, Sección 15: Aspectos éticos)
    """
    try:
        doc = Document(BytesIO(archivo_bytes))
        texto_completo = "\n".join([p.text.strip() for p in doc.paragraphs if p.text.strip()])
        
        datos = {
            # Datos básicos
            "titulo": "",
            "fecha_inicio": "",
            "fecha_fin": "",
            "modalidad": "",
            
            # Sección 1: Preguntas generales (checkboxes)
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
            
            # Secciones narrativas
            "resumen": "",
            "palabras_clave": "",
            "abstract": "",
            "keywords": "",
            "problema_investigacion": "",
            "objetivo_general": "",
            "objetivos_especificos": [],
            "estado_arte": "",
            "metodologia": "",
            "hoja_ruta": "",
            "referencias": "",
            
            # Cuadro 2: Investigadores TEC
            "investigadores_tec": [],
            
            # Cuadro 3: Colaboradores externos
            "colaboradores_externos": [],
            
            # Cuadro 4: Presupuesto por año
            "presupuesto_anual": [],
            
            # Cuadro 5: Financiamiento adicional
            "financiamiento_adicional": {
                "externo": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""},
                "contrapartida": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""},
                "cofinanciamiento": {"ano1": 0, "ano2": 0, "ano3": 0, "oficio": ""}
            },
            
            # Sección 12: Productos académicos
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
            
            # Sección 13: Resguardo (checkboxes)
            "resguardo": {
                "resguardo_compromiso": False,
                "resguardo_software": False
            },
            
            # Sección 14: Divulgación
            "divulgacion": {
                "cientifica": "",
                "canales_institucionales": "",
                "socializacion": "",
                "medios_masivos": ""
            },
            
            # Sección 15: Aspectos éticos (checkboxes)
            "aspectos_eticos": {
                "seres_humanos": False,
                "biodiversidad": False,
                "animales": False,
                "comunidades_indigenas": False,
                "acuerdo_comision": ""
            },
            
            # Sección 18: Firma
            "firma": {
                "nombre": "",
                "cedula": "",
                "firmado_digital": False
            }
        }
        
        # ====================================================================
        # 1. EXTRAER DATOS BÁSICOS (Título, fechas)
        # ====================================================================
        # Buscar en las primeras tablas o párrafos
        for table in doc.tables[:3]:  # Revisar las primeras 3 tablas
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if len(cells) >= 2:
                    if "Nombre del proyecto" in cells[0]:
                        datos["titulo"] = cells[1] if len(cells) > 1 else ""
                    elif "Fecha de inicio" in cells[0]:
                        datos["fecha_inicio"] = cells[1] if len(cells) > 1 else ""
                    elif "Fecha de finalización" in cells[0]:
                        datos["fecha_fin"] = cells[1] if len(cells) > 1 else ""
        
        # ====================================================================
        # 2. EXTRAER SECCIÓN 1: PREGUNTAS GENERALES (CHECKBOXES)
        # ====================================================================
        # 1.a Modalidad
        match_modalidad = re.search(
            r"1\.a\.\s+La modalidad.*?(?:☑|✔|✓)\s*(investigación básica|investigación aplicada|investigación básica y aplicada|desarrollo tecnológico)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_modalidad:
            datos["modalidad"] = match_modalidad.group(1).strip().title()
        
        # 1.b Otras fuentes de financiamiento
        match_fuentes = re.search(
            r"1\.b\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.c\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_fuentes:
            datos["seccion1"]["otras_fuentes"]["aplica"] = True
            datos["seccion1"]["otras_fuentes"]["detalle"] = match_fuentes.group(1).strip()
        
        # 1.c Vinculación técnica
        match_vinculacion = re.search(
            r"1\.c\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.d\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_vinculacion:
            datos["seccion1"]["vinculacion_tecnica"]["aplica"] = True
            datos["seccion1"]["vinculacion_tecnica"]["detalle"] = match_vinculacion.group(1).strip()
        
        # 1.d Problemas nacionales
        match_problemas = re.search(
            r"1\.d\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.e\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_problemas:
            datos["seccion1"]["problemas_nacionales"]["aplica"] = True
            datos["seccion1"]["problemas_nacionales"]["detalle"] = match_problemas.group(1).strip()
        
        # 1.e Instrumento jurídico
        match_instrumento = re.search(
            r"1\.e\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.f\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_instrumento:
            datos["seccion1"]["instrumento_juridico"]["aplica"] = True
            texto = match_instrumento.group(1).strip()
            if "Convenio Internacional" in texto:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Internacional"
            else:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Nacional"
        
        # 1.f Convenio marco
        match_convenio = re.search(
            r"1\.f\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.g\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_convenio:
            datos["seccion1"]["convenio_marco"]["aplica"] = True
            datos["seccion1"]["convenio_marco"]["nombre"] = match_convenio.group(1).strip()
        
        # 1.g Base posgrado
        match_posgrado = re.search(
            r"1\.g\.\s+.*?(?:☑|✔|✓)\s*(Sí parcial|Sí totalmente)\s*(.*?)(?:1\.h\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_posgrado:
            datos["seccion1"]["base_posgrado"]["aplica"] = match_posgrado.group(1).strip()
            # Extraer datos del posgrado (candidato, programa, universidad)
            texto_posgrado = match_posgrado.group(2).strip()
            # Buscar patrones como "1. Nombre:", "2. Programa:", "3. Universidad:"
            match_candidato = re.search(r"1\.\s*Nombre.*?:\s*(.*?)(?:2\.|$)", texto_posgrado, re.IGNORECASE)
            match_programa = re.search(r"2\.\s*Programa.*?:\s*(.*?)(?:3\.|$)", texto_posgrado, re.IGNORECASE)
            match_universidad = re.search(r"3\.\s*Universidad.*?:\s*(.*?)(?:1\.h\.|$)", texto_posgrado, re.IGNORECASE)
            
            if match_candidato:
                datos["seccion1"]["base_posgrado"]["candidato"] = match_candidato.group(1).strip()
            if match_programa:
                datos["seccion1"]["base_posgrado"]["programa"] = match_programa.group(1).strip()
            if match_universidad:
                datos["seccion1"]["base_posgrado"]["universidad"] = match_universidad.group(1).strip()
        
        # 1.h Información confidencial
        match_confidencial = re.search(
            r"1\.h\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.i\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_confidencial:
            datos["seccion1"]["info_confidencial"]["aplica"] = True
            datos["seccion1"]["info_confidencial"]["detalle"] = match_confidencial.group(1).strip()
        
        # 1.i Potencial PI
        match_pi = re.search(
            r"1\.i\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.j\.|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_pi:
            datos["seccion1"]["potencial_pi"]["aplica"] = True
            # Buscar número de oficio
            match_oficio = re.search(r"(?:oficio|dictamen)[:\s]*([A-Z]{2,}-\w+-\d{4}-\d+)", match_pi.group(1), re.IGNORECASE)
            if match_oficio:
                datos["seccion1"]["potencial_pi"]["oficio_dictamen"] = match_oficio.group(1).strip()
        
        # 1.j Innovación
        match_innovacion = re.search(
            r"1\.j\.\s+.*?(?:☑|✔|✓)\s*Sí\s*(.*?)(?:1\.k\.|Cuadro 1|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_innovacion:
            datos["seccion1"]["posee_innovacion"]["aplica"] = True
            texto = match_innovacion.group(1).strip()
            if "de Producto" in texto:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Producto"
            else:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Proceso"
        
        # 1.k TRL (solo para desarrollo tecnológico)
        match_trl = re.search(
            r"(?:TRL|nivel de madurez).*?(?:☑|✔|✓|seleccionado).*?(\d)",
            texto_completo,
            re.IGNORECASE
        )
        if match_trl:
            datos["seccion1"]["trl"] = int(match_trl.group(1))
        
        # ====================================================================
        # 3. EXTRAER SECCIONES NARRATIVAS (2-11, 14, 16-17)
        # ====================================================================
        def extraer_seccion(inicio: str, fin: str) -> str:
            patron = rf"{inicio}.*?\n(.*?)(?={fin}|\Z)"
            match = re.search(patron, texto_completo, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
            return ""
        
        datos["resumen"] = extraer_seccion("2\.\s+Resumen", "Palabras claves?:")
        datos["palabras_clave"] = extraer_seccion("Palabras claves?:", "Abstract")
        datos["abstract"] = extraer_seccion("Abstract", "Keywords?:")
        datos["keywords"] = extraer_seccion("Keywords?:", "3\.\s+Equipo")
        datos["problema_investigacion"] = extraer_seccion("4\.\s+Problema de investigación", "5\.\s+Objetivo general")
        datos["objetivo_general"] = extraer_seccion("5\.\s+Objetivo general", "6\.\s+Objetivos específicos")
        
        # Objetivos específicos (lista numerada)
        texto_oe = extraer_seccion("6\.\s+Objetivos específicos", "7\.\s+Estado del arte")
        if texto_oe:
            objetivos = [linea.strip() for linea in texto_oe.split('\n') if re.match(r'^\d+\.', linea.strip())]
            datos["objetivos_especificos"] = [re.sub(r'^\d+\.\s*', '', obj) for obj in objetivos]
        
        datos["estado_arte"] = extraer_seccion("7\.\s+Estado del arte", "8\.\s+Metodología")
        datos["metodologia"] = extraer_seccion("8\.\s+Metodología", "9\.\s+Plan de acción")
        datos["hoja_ruta"] = extraer_seccion("16\.\s+Hoja de ruta", "17\.\s+Referencias")
        datos["referencias"] = extraer_seccion("17\.\s+Referencias", "18\.\s+Declaración jurada")
        
        # ====================================================================
        # 4. EXTRAER TABLAS (Cuadro 2, 3, 4, 5)
        # ====================================================================
        for table in doc.tables:
            # Cuadro 2: Investigadores TEC
            if _es_tabla_investigadores_tec(table):
                datos["investigadores_tec"] = _parsear_tabla_investigadores_tec(table)
            
            # Cuadro 3: Colaboradores externos
            elif _es_tabla_colaboradores(table):
                datos["colaboradores_externos"] = _parsear_tabla_colaboradores(table)
            
            # Cuadro 4: Presupuesto por año
            elif _es_tabla_presupuesto(table):
                datos["presupuesto_anual"] = _parsear_tabla_presupuesto(table)
            
            # Cuadro 5: Financiamiento adicional
            elif _es_tabla_financiamiento(table):
                datos["financiamiento_adicional"] = _parsear_tabla_financiamiento(table)
        
        # ====================================================================
        # 5. EXTRAER SECCIÓN 13: RESGUARDO (CHECKBOXES)
        # ====================================================================
        match_resguardo1 = re.search(
            r"13\.\s+Resguardo.*?1\.\s+Declaro conocer.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_resguardo1:
            datos["resguardo"]["resguardo_compromiso"] = True
        
        match_resguardo2 = re.search(
            r"13\.\s+Resguardo.*?2\.\s+En caso de desarrollar.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_resguardo2:
            datos["resguardo"]["resguardo_software"] = True
        
        # ====================================================================
        # 6. EXTRAER SECCIÓN 14: DIVULGACIÓN
        # ====================================================================
        datos["divulgacion"]["cientifica"] = extraer_seccion("14\.\s+Estrategia.*?1\.a\.\s+Divulgación científica", "1\.b\.\s+Canales Institucionales")
        datos["divulgacion"]["canales_institucionales"] = extraer_seccion("1\.b\.\s+Canales Institucionales", "1\.c\.\s+Eventos de Socialización")
        datos["divulgacion"]["socializacion"] = extraer_seccion("1\.c\.\s+Eventos de Socialización", "1\.d\.\s+Medios Masivos")
        datos["divulgacion"]["medios_masivos"] = extraer_seccion("1\.d\.\s+Medios Masivos", "15\.\s+Aspectos Éticos")
        
        # ====================================================================
        # 7. EXTRAER SECCIÓN 15: ASPECTOS ÉTICOS (CHECKBOXES)
        # ====================================================================
        match_etica1 = re.search(
            r"15\.\s+Aspectos Éticos.*?1\.\s+.*?seres humanos.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_etica1:
            datos["aspectos_eticos"]["seres_humanos"] = True
        
        match_etica2 = re.search(
            r"15\.\s+Aspectos Éticos.*?2\.\s+.*?biodiversidad.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_etica2:
            datos["aspectos_eticos"]["biodiversidad"] = True
        
        match_etica3 = re.search(
            r"15\.\s+Aspectos Éticos.*?3\.\s+.*?animales.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_etica3:
            datos["aspectos_eticos"]["animales"] = True
        
        match_etica4 = re.search(
            r"15\.\s+Aspectos Éticos.*?4\.\s+.*?indígenas.*?(?:☑|✔|✓)\s*Sí",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_etica4:
            datos["aspectos_eticos"]["comunidades_indigenas"] = True
        
        # Justificación de exención
        match_exencion = re.search(
            r"15\.a\.\s+Declaración de exención.*?razones:\s*(.*?)(?:15\.b\.|16\.\s+Hoja de ruta|$)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_exencion:
            datos["aspectos_eticos"]["acuerdo_comision"] = match_exencion.group(1).strip()
        
        # ====================================================================
        # 8. EXTRAER SECCIÓN 18: FIRMA
        # ====================================================================
        for table in doc.tables:
            if _es_tabla_firma(table):
                datos["firma"] = _parsear_tabla_firma(table)
                break
        
        return datos
    
    except Exception as e:
        raise Exception(f"Error al parsear el documento Word: {str(e)}")


# ============================================================================
# FUNCIONES AUXILIARES PARA TABLAS
# ============================================================================

def _es_tabla_investigadores_tec(table: Table) -> bool:
    """Verifica si la tabla es el Cuadro 2 (Investigadores TEC)"""
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'nombre y apellidos' in header_text and 'orcid' in header_text
    except IndexError:
        return False

def _parsear_tabla_investigadores_tec(table: Table) -> List[Dict[str, str]]:
    """Extrae datos del Cuadro 2"""
    investigadores = []
    for row in table.rows[1:]:  # Saltar encabezado
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 5 and cells[0] and cells[0] != '[Inserte las filas':
            investigadores.append({
                'nombre': cells[0],
                'orcid': cells[1] if len(cells) > 1 else '',
                'instancia': cells[2] if len(cells) > 2 else '',
                'rol': cells[3] if len(cells) > 3 else '',
                'horas': cells[4] if len(cells) > 4 else '',
                'nombramiento': cells[5] if len(cells) > 5 else ''
            })
    return investigadores

def _es_tabla_colaboradores(table: Table) -> bool:
    """Verifica si la tabla es el Cuadro 3 (Colaboradores externos)"""
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'colaborador externo' in header_text and 'institución' in header_text
    except IndexError:
        return False

def _parsear_tabla_colaboradores(table: Table) -> List[Dict[str, str]]:
    """Extrae datos del Cuadro 3"""
    colaboradores = []
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 3 and cells[0] and cells[0] != '[Inserte las filas':
            colaboradores.append({
                'nombre': cells[0],
                'orcid': cells[1] if len(cells) > 1 else '',
                'institucion': cells[2] if len(cells) > 2 else ''
            })
    return colaboradores

def _es_tabla_presupuesto(table: Table) -> bool:
    """Verifica si la tabla es el Cuadro 4 (Presupuesto por año)"""
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'año' in header_text and ('operativo' in header_text or 'duradero' in header_text)
    except IndexError:
        return False

def _parsear_tabla_presupuesto(table: Table) -> List[Dict[str, Any]]:
    """Extrae datos del Cuadro 4"""
    presupuesto = []
    for row in table.rows[1:]:
        cells = [cell.text.strip() for cell in row.cells]
        if len(cells) >= 3:
            try:
                anio = cells[0]
                if anio in ['2027', '2028', '2029', 'Total']:
                    operativo = _parsear_monto(cells[1]) if len(cells) > 1 else 0
                    duradero = _parsear_monto(cells[2]) if len(cells) > 2 else 0
                    presupuesto.append({
                        'ano': f'Año {anio}' if anio != 'Total' else 'Total',
                        'operativo': operativo,
                        'duradero': duradero
                    })
            except ValueError:
                continue
    return presupuesto

def _es_tabla_financiamiento(table: Table) -> bool:
    """Verifica si la tabla es el Cuadro 5 (Financiamiento adicional)"""
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'desglose' in header_text and ('año 1' in header_text or 'oficio' in header_text)
    except IndexError:
        return False

def _parsear_tabla_financiamiento(table: Table) -> Dict[str, Any]:
    """Extrae datos del Cuadro 5"""
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
                financiamiento['externo']['ano1'] = _parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['externo']['ano2'] = _parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['externo']['ano3'] = _parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['externo']['oficio'] = cells[4] if len(cells) > 4 else ''
            elif 'contrapartida' in fuente:
                financiamiento['contrapartida']['ano1'] = _parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['contrapartida']['ano2'] = _parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['contrapartida']['ano3'] = _parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['contrapartida']['oficio'] = cells[4] if len(cells) > 4 else ''
            elif 'cofinanciamiento' in fuente:
                financiamiento['cofinanciamiento']['ano1'] = _parsear_monto(cells[1]) if len(cells) > 1 else 0
                financiamiento['cofinanciamiento']['ano2'] = _parsear_monto(cells[2]) if len(cells) > 2 else 0
                financiamiento['cofinanciamiento']['ano3'] = _parsear_monto(cells[3]) if len(cells) > 3 else 0
                financiamiento['cofinanciamiento']['oficio'] = cells[4] if len(cells) > 4 else ''
    
    return financiamiento

def _es_tabla_firma(table: Table) -> bool:
    """Verifica si la tabla es la de firma (Sección 18)"""
    try:
        header_text = ' '.join([cell.text for cell in table.rows[0].cells]).lower()
        return 'nombre completo' in header_text and 'cédula' in header_text
    except IndexError:
        return False

def _parsear_tabla_firma(table: Table) -> Dict[str, Any]:
    """Extrae datos de la firma"""
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

def _parsear_monto(texto: str) -> float:
    """Convierte texto de monto (₡ 1,500,000) a float"""
    texto_limpio = re.sub(r'[₡,\s]', '', texto)
    try:
        return float(texto_limpio)
    except ValueError:
        return 0.0