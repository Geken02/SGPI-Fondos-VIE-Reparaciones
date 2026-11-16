import re
from docx import Document
from io import BytesIO
from typing import Dict, Any, List

def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser robusto para Form-04 con lógica corregida para checkboxes Sí/No, Modalidad, TRL y Firma.
    """
    try:
        doc = Document(BytesIO(archivo_bytes))
        
        # Unir todo el texto del documento, preservando saltos de línea para regex
        parrafos = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        texto_completo = "\n".join(parrafos)
        
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
                "externo": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
                "contrapartida": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
                "cofinanciamiento": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""}
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

        # =========================================================================
        # 1. DATOS BÁSICOS
        # =========================================================================
        for table in doc.tables[:3]:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if len(cells) >= 2:
                    if "Nombre del proyecto" in cells[0]:
                        datos["titulo"] = cells[1]
                    elif "Fecha de inicio" in cells[0]:
                        datos["fecha_inicio"] = cells[1]
                    elif "Fecha de finalización" in cells[0] or "Fecha de finalizacion" in cells[0]:
                        datos["fecha_fin"] = cells[1]

        # =========================================================================
        # 2. SECCIÓN 1: PREGUNTAS GENERALES (Lógica corregida para Sí/No)
        # =========================================================================
        
        # 1.a Modalidad: Buscar explícitamente el checkbox marcado ANTES que el texto genérico
        if re.search(r"☑\s*investigación básica y aplicada", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Básica y Aplicada"
        elif re.search(r"☑\s*investigación básica\b", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Básica"
        elif re.search(r"☑\s*investigación aplicada", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Aplicada"
        elif re.search(r"☑\s*desarrollo tecnológico", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Desarrollo Tecnológico"

        # Función auxiliar CORREGIDA: Retorna True SOLO si el checkbox marcado es "Sí"
        def es_checkbox_si(texto: str, patron_pregunta: str) -> bool:
            # Buscar el bloque de la pregunta
            match = re.search(patron_pregunta, texto, re.IGNORECASE | re.DOTALL)
            if not match:
                return False
            
            # Obtener los siguientes 300 caracteres después de la pregunta
            inicio = match.end()
            bloque = texto[inicio:inicio+300]
            
            # Retornar True solo si hay un checkbox marcado junto a "Sí"
            return bool(re.search(r"☑\s*Sí|✔\s*Sí|☑\s*si\b", bloque, re.IGNORECASE))

        # 1.b Otras fuentes
        datos["seccion1"]["otras_fuentes"]["aplica"] = es_checkbox_si(texto_completo, r"1\.b\.\s+.*?fuentes de financiamiento")
        if datos["seccion1"]["otras_fuentes"]["aplica"]:
            match_detalle = re.search(r"1\.b\..*?☑\s*Sí\s*(.*?)(?=1\.c\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["otras_fuentes"]["detalle"] = match_detalle.group(1).strip()

        # 1.c Vinculación técnica
        datos["seccion1"]["vinculacion_tecnica"]["aplica"] = es_checkbox_si(texto_completo, r"1\.c\.\s+.*?vinculación técnica")
        if datos["seccion1"]["vinculacion_tecnica"]["aplica"]:
            match_detalle = re.search(r"1\.c\..*?☑\s*Sí\s*(.*?)(?=1\.d\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["vinculacion_tecnica"]["detalle"] = match_detalle.group(1).strip()

        # 1.d Problemas nacionales
        datos["seccion1"]["problemas_nacionales"]["aplica"] = es_checkbox_si(texto_completo, r"1\.d\.\s+.*?problemas prioritarios")
        if datos["seccion1"]["problemas_nacionales"]["aplica"]:
            match_detalle = re.search(r"1\.d\..*?☑\s*Sí\s*(.*?)(?=1\.e\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["problemas_nacionales"]["detalle"] = match_detalle.group(1).strip()

        # 1.e Instrumento jurídico
        datos["seccion1"]["instrumento_juridico"]["aplica"] = es_checkbox_si(texto_completo, r"1\.e\.\s+.*?instrumento jurídico")
        if datos["seccion1"]["instrumento_juridico"]["aplica"]:
            if re.search(r"☑\s*Convenio Internacional", texto_completo, re.IGNORECASE):
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Internacional"
            else:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Nacional"

        # 1.f Convenio marco
        datos["seccion1"]["convenio_marco"]["aplica"] = es_checkbox_si(texto_completo, r"1\.f\.\s+.*?convenio marco")
        if datos["seccion1"]["convenio_marco"]["aplica"]:
            match_detalle = re.search(r"1\.f\..*?☑\s*Sí\s*(.*?)(?=1\.g\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["convenio_marco"]["nombre"] = match_detalle.group(1).strip()

        # 1.g Base posgrado (Lógica especial: Sí parcial / Sí totalmente)
        if re.search(r"1\.g\..*?☑\s*Sí,\s*parcial", texto_completo, re.IGNORECASE | re.DOTALL):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, parcial"
        elif re.search(r"1\.g\..*?☑\s*Sí,\s*totalmente", texto_completo, re.IGNORECASE | re.DOTALL):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, totalmente"
            
        if datos["seccion1"]["base_posgrado"]["aplica"] != "No":
            match_detalle = re.search(r"1\.g\..*?grado académico superior\?.*?(1\.\s*Nombre.*?2\.\s*Programa.*?3\.\s*Universidad.*?)(?=1\.h\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                texto_det = match_detalle.group(1)
                match_cand = re.search(r"1\.\s*Nombre.*?:\s*(.*?)(?:2\.|$)", texto_det, re.IGNORECASE)
                match_prog = re.search(r"2\.\s*Programa.*?:\s*(.*?)(?:3\.|$)", texto_det, re.IGNORECASE)
                match_univ = re.search(r"3\.\s*Universidad.*?:\s*(.*?)(?:1\.h\.|$)", texto_det, re.IGNORECASE)
                if match_cand: datos["seccion1"]["base_posgrado"]["candidato"] = match_cand.group(1).strip()
                if match_prog: datos["seccion1"]["base_posgrado"]["programa"] = match_prog.group(1).strip()
                if match_univ: datos["seccion1"]["base_posgrado"]["universidad"] = match_univ.group(1).strip()

        # 1.h Info confidencial
        datos["seccion1"]["info_confidencial"]["aplica"] = es_checkbox_si(texto_completo, r"1\.h\.\s+.*?confidencialidad")
        if datos["seccion1"]["info_confidencial"]["aplica"]:
            match_detalle = re.search(r"1\.h\..*?☑\s*Sí\s*(.*?)(?=1\.i\.)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["info_confidencial"]["detalle"] = match_detalle.group(1).strip()

        # 1.i Potencial PI
        datos["seccion1"]["potencial_pi"]["aplica"] = es_checkbox_si(texto_completo, r"1\.i\.\s+.*?propiedad intelectual")
        if datos["seccion1"]["potencial_pi"]["aplica"]:
            match_oficio = re.search(r"oficio del dictamen.*?:\s*([A-Z]{2,}-\w+-\d{4}-\d+)", texto_completo, re.IGNORECASE)
            if match_oficio:
                datos["seccion1"]["potencial_pi"]["oficio_dictamen"] = match_oficio.group(1).strip()

        # 1.j Innovación
        datos["seccion1"]["posee_innovacion"]["aplica"] = es_checkbox_si(texto_completo, r"1\.j\.\s+.*?innovación")
        if datos["seccion1"]["posee_innovacion"]["aplica"]:
            if re.search(r"☑\s*de Proceso", texto_completo, re.IGNORECASE):
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Proceso"
            else:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Producto"

        # 1.k TRL: Buscar la fila que tenga ☑ y extraer su número
        match_trl = re.search(r"TRL\s*(\d+):.*?☑", texto_completo, re.IGNORECASE | re.DOTALL)
        if match_trl:
            datos["seccion1"]["trl"] = int(match_trl.group(1))

        # =========================================================================
        # 3. SECCIONES NARRATIVAS
        # =========================================================================
        def extraer_seccion(inicio_patron: str, fin_patron: str) -> str:
            patron = rf"{inicio_patron}\s*(.*?)(?={fin_patron}|\Z)"
            match = re.search(patron, texto_completo, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
            return ""

        datos["resumen"] = extraer_seccion(r"2\.\s*Resumen", r"Palabras claves?:")
        datos["palabras_clave"] = extraer_seccion(r"Palabras claves?:", r"Abstract")
        datos["abstract"] = extraer_seccion(r"Abstract", r"Keywords?:")
        datos["keywords"] = extraer_seccion(r"Keywords?:", r"3\.\s*Equipo")
        datos["problema_investigacion"] = extraer_seccion(r"4\.\s*Problema de investigación", r"5\.\s*Objetivo general")
        datos["objetivo_general"] = extraer_seccion(r"5\.\s*Objetivo general", r"6\.\s*Objetivos específicos")
        
        texto_oe = extraer_seccion(r"6\.\s*Objetivos específicos", r"7\.\s*Estado del arte")
        if texto_oe:
            objetivos = [linea.strip() for linea in texto_oe.split('\n') if re.match(r'^\d+\.', linea.strip())]
            datos["objetivos_especificos"] = [re.sub(r'^\d+\.\s*', '', obj) for obj in objetivos]
        
        datos["estado_arte"] = extraer_seccion(r"7\.\s*Estado del arte", r"8\.\s*Metodología")
        datos["metodologia"] = extraer_seccion(r"8\.\s*Metodología", r"9\.\s*Plan de acción")
        datos["hoja_ruta"] = extraer_seccion(r"16\.\s*Hoja de ruta", r"17\.\s*Referencias")
        datos["referencias"] = extraer_seccion(r"17\.\s*Referencias", r"18\.\s*Declaración jurada")

        # =========================================================================
        # 4. TABLAS (Investigadores, Colaboradores, Presupuesto, Financiamiento)
        # =========================================================================
        for table in doc.tables:
            try:
                header_text = ' '.join([cell.text.strip().lower() for cell in table.rows[0].cells])
                
                if "nombre y apellidos" in header_text and "orcid" in header_text:
                    for row in table.rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        if len(cells) >= 5 and cells[0] and not cells[0].startswith('[Inserte'):
                            datos["investigadores_tec"].append({
                                'nombre': cells[0], 'orcid': cells[1] if len(cells) > 1 else '',
                                'instancia': cells[2] if len(cells) > 2 else '', 'rol': cells[3] if len(cells) > 3 else '',
                                'horas': cells[4] if len(cells) > 4 else '', 'nombramiento': cells[5] if len(cells) > 5 else ''
                            })
                
                elif "colaborador externo" in header_text and "institución" in header_text:
                    for row in table.rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        if len(cells) >= 3 and cells[0] and not cells[0].startswith('[Inserte'):
                            datos["colaboradores_externos"].append({
                                'nombre': cells[0], 'orcid': cells[1] if len(cells) > 1 else '',
                                'institucion': cells[2] if len(cells) > 2 else ''
                            })
                
                elif "año" in header_text and ("operativo" in header_text or "duradero" in header_text):
                    for row in table.rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        if len(cells) >= 3:
                            anio = cells[0]
                            if anio in ['2027', '2028', '2029', 'Total']:
                                def limpiar_monto(texto):
                                    return float(re.sub(r'[₡,\s]', '', texto)) if re.sub(r'[₡,\s]', '', texto) else 0.0
                                datos["presupuesto_anual"].append({
                                    'ano': f'Año {anio}' if anio != 'Total' else 'Total',
                                    'operativo': limpiar_monto(cells[1]) if len(cells) > 1 else 0.0,
                                    'duradero': limpiar_monto(cells[2]) if len(cells) > 2 else 0.0
                                })
                
                elif "desglose" in header_text and "año 1" in header_text:
                    for row in table.rows[1:]:
                        cells = [cell.text.strip() for cell in row.cells]
                        if len(cells) >= 5:
                            fuente = cells[0].lower()
                            def limpiar_monto(texto):
                                return float(re.sub(r'[₡,\s]', '', texto)) if re.sub(r'[₡,\s]', '', texto) else 0.0
                            
                            if "financiamiento externo" in fuente:
                                datos["financiamiento_adicional"]["externo"] = {
                                    'ano1': limpiar_monto(cells[1]), 'ano2': limpiar_monto(cells[2]),
                                    'ano3': limpiar_monto(cells[3]), 'oficio': cells[4] if len(cells) > 4 else ''
                                }
                            elif "contrapartida" in fuente:
                                datos["financiamiento_adicional"]["contrapartida"] = {
                                    'ano1': limpiar_monto(cells[1]), 'ano2': limpiar_monto(cells[2]),
                                    'ano3': limpiar_monto(cells[3]), 'oficio': cells[4] if len(cells) > 4 else ''
                                }
                            elif "cofinanciamiento" in fuente:
                                datos["financiamiento_adicional"]["cofinanciamiento"] = {
                                    'ano1': limpiar_monto(cells[1]), 'ano2': limpiar_monto(cells[2]),
                                    'ano3': limpiar_monto(cells[3]), 'oficio': cells[4] if len(cells) > 4 else ''
                                }
            except Exception:
                continue

        # =========================================================================
        # 5. PRODUCTOS 14a/14b (Mejorado para detectar checkboxes en tablas)
        # =========================================================================
        # Buscar patrones como: ☑ | 1 | Opción 1: ... | OE 2
        productos_14a_matches = re.findall(r"☑\s*\|\s*(\d+)\s*\|\s*(Opción\s*\d+:[^|]+)\s*\|\s*([^|\n]+)", texto_completo, re.IGNORECASE)
        for cant, opcion, objetivo in productos_14a_matches:
            if "Opción 1" in opcion:
                datos["productos_14a"]["opcion1"] = {"check": True, "cantidad": int(cant), "objetivo": objetivo.strip()}
            elif "Opción 2" in opcion:
                datos["productos_14a"]["opcion2"] = {"check": True, "cantidad": int(cant), "objetivo": objetivo.strip()}
            elif "Opción 3" in opcion:
                datos["productos_14a"]["opcion3"] = {"check": True, "cantidad": int(cant), "objetivo": objetivo.strip()}

        # =========================================================================
        # 6. RESGUARDO, ÉTICA Y FIRMA
        # =========================================================================
        datos["resguardo"]["resguardo_compromiso"] = bool(re.search(r"1\.\s*Declaro conocer.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["resguardo"]["resguardo_software"] = bool(re.search(r"2\.\s*En caso de desarrollar software.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))

        # Aspectos éticos: Solo son True si el checkbox de "Sí" está marcado
        datos["aspectos_eticos"]["seres_humanos"] = bool(re.search(r"1\.\s*¿Involucra.*?seres humanos\?.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["biodiversidad"] = bool(re.search(r"2\.\s*¿Involucra.*?biodiversidad\?.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["animales"] = bool(re.search(r"3\.\s*¿Involucra.*?animales\?.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["comunidades_indigenas"] = bool(re.search(r"4\.\s*¿Involucra.*?indígenas\?.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        
        match_exencion = re.search(r"15\.a\.\s*Declaración de exención.*?razones:\s*(.*?)(?=15\.b\.|16\.)", texto_completo, re.IGNORECASE | re.DOTALL)
        if match_exencion:
            datos["aspectos_eticos"]["acuerdo_comision"] = match_exencion.group(1).strip()

        # Firma: Buscar en las tablas finales
        for table in doc.tables:
            try:
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    if len(cells) >= 2:
                        if "Nombre completo" in cells[0]:
                            datos["firma"]["nombre"] = cells[1]
                        elif "Número de cédula" in cells[0] or "Numero de cedula" in cells[0]:
                            datos["firma"]["cedula"] = cells[1]
                        elif "Firma digital" in cells[0]:
                            datos["firma"]["firmado_digital"] = "☑" in cells[1] or "Sí" in cells[1]
            except Exception:
                continue

        return datos

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise Exception(f"Error al parsear el documento Word: {str(e)}")