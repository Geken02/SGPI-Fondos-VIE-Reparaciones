import re
import json
from docx import Document
from docx.table import Table
from io import BytesIO
from typing import Dict, Any, List


def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser robusto para Form-04 con MODO DEBUG activado.
    Extrae datos estructurados e imprime en consola lo que detecta para facilitar la depuración.
    """
    try:
        doc = Document(BytesIO(archivo_bytes))
        
        # Extraer TODO el texto del documento normalizando espacios
        parrafos = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        texto_completo = "\n".join(parrafos)
        
        # =========================================================================
        # 🔍 MODO DEBUG 1: Ver cómo python-docx está leyendo el archivo
        # =========================================================================
        print("\n" + "="*80)
        print("🔍 DEBUG: TEXTO CRUDO EXTRAÍDO DEL WORD (Primeros 1500 caracteres):")
        print(texto_completo[:1500].replace('\n', ' | '))
        print("="*80 + "\n")

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
        # 1. DATOS BÁSICOS (Tablas iniciales)
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
        # 2. SECCIÓN 1: PREGUNTAS GENERALES (Checkboxes)
        # =========================================================================
        match_modalidad = re.search(
            r"1\.a\.\s+La modalidad.*?(investigación básica|investigación aplicada|investigación básica y aplicada|desarrollo tecnológico)",
            texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match_modalidad:
            contexto = texto_completo[match_modalidad.start():match_modalidad.end()+100]
            if any(s in contexto for s in ['☑', '✓', '✔', '☒', '✅', 'X', 'x']):
                datos["modalidad"] = match_modalidad.group(1).strip().title()

        def detectar_checkbox(texto: str, patron: str) -> bool:
            match = re.search(patron, texto, re.IGNORECASE | re.DOTALL)
            if not match:
                return False
            contexto = texto[match.start():match.start()+400]
            return any(s in contexto for s in ['☑', '✓', '✔', '☒', '✅', 'X', 'x']) or re.search(r'☑\s*Sí|✔\s*Sí|X\s*Sí', contexto, re.IGNORECASE)

        if detectar_checkbox(texto_completo, r"1\.b\.\s+.*?otras fuentes"):
            datos["seccion1"]["otras_fuentes"]["aplica"] = True
            match_detalle = re.search(r"1\.b\.\s+.*?Sí\s*(.*?)(?:1\.c\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["otras_fuentes"]["detalle"] = match_detalle.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.c\.\s+.*?vinculación técnica"):
            datos["seccion1"]["vinculacion_tecnica"]["aplica"] = True
            match_detalle = re.search(r"1\.c\.\s+.*?Sí\s*(.*?)(?:1\.d\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["vinculacion_tecnica"]["detalle"] = match_detalle.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.d\.\s+.*?problemas prioritarios"):
            datos["seccion1"]["problemas_nacionales"]["aplica"] = True
            match_detalle = re.search(r"1\.d\.\s+.*?Sí\s*(.*?)(?:1\.e\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["problemas_nacionales"]["detalle"] = match_detalle.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.e\.\s+.*?instrumento jurídico"):
            datos["seccion1"]["instrumento_juridico"]["aplica"] = True
            if "Convenio Internacional" in texto_completo:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Internacional"
            else:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Nacional"

        if detectar_checkbox(texto_completo, r"1\.f\.\s+.*?convenio marco"):
            datos["seccion1"]["convenio_marco"]["aplica"] = True
            match_detalle = re.search(r"1\.f\.\s+.*?Sí\s*(.*?)(?:1\.g\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["convenio_marco"]["nombre"] = match_detalle.group(1).strip()

        match_posgrado = re.search(r"1\.g\.\s+.*?(Sí parcial|Sí totalmente)", texto_completo, re.IGNORECASE | re.DOTALL)
        if match_posgrado and detectar_checkbox(texto_completo, r"1\.g\.\s+.*?grado académico"):
            datos["seccion1"]["base_posgrado"]["aplica"] = match_posgrado.group(1).strip()
            match_detalle = re.search(r"1\.g\.\s+.*?Sí\s*(.*?)(?:1\.h\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                texto_posgrado = match_detalle.group(1)
                match_candidato = re.search(r"1\.\s*Nombre.*?:\s*(.*?)(?:2\.|$)", texto_posgrado, re.IGNORECASE)
                match_programa = re.search(r"2\.\s*Programa.*?:\s*(.*?)(?:3\.|$)", texto_posgrado, re.IGNORECASE)
                match_universidad = re.search(r"3\.\s*Universidad.*?:\s*(.*?)(?:1\.h\.|$)", texto_posgrado, re.IGNORECASE)
                if match_candidato: datos["seccion1"]["base_posgrado"]["candidato"] = match_candidato.group(1).strip()
                if match_programa: datos["seccion1"]["base_posgrado"]["programa"] = match_programa.group(1).strip()
                if match_universidad: datos["seccion1"]["base_posgrado"]["universidad"] = match_universidad.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.h\.\s+.*?información sensible"):
            datos["seccion1"]["info_confidencial"]["aplica"] = True
            match_detalle = re.search(r"1\.h\.\s+.*?Sí\s*(.*?)(?:1\.i\.|$)", texto_completo, re.IGNORECASE | re.DOTALL)
            if match_detalle:
                datos["seccion1"]["info_confidencial"]["detalle"] = match_detalle.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.i\.\s+.*?propiedad intelectual"):
            datos["seccion1"]["potencial_pi"]["aplica"] = True
            match_oficio = re.search(r"(?:oficio|dictamen)[:\s]*([A-Z]{2,}-\w+-\d{4}-\d+)", texto_completo, re.IGNORECASE)
            if match_oficio:
                datos["seccion1"]["potencial_pi"]["oficio_dictamen"] = match_oficio.group(1).strip()

        if detectar_checkbox(texto_completo, r"1\.j\.\s+.*?innovación"):
            datos["seccion1"]["posee_innovacion"]["aplica"] = True
            if "de Producto" in texto_completo:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Producto"
            elif "de Proceso" in texto_completo:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Proceso"

        match_trl = re.search(r"(?:TRL|nivel de madurez).*?(?:☑|✔|✓|☒|X|x|seleccionado).*?(\d)", texto_completo, re.IGNORECASE)
        if match_trl:
            datos["seccion1"]["trl"] = int(match_trl.group(1))

        # =========================================================================
        # 3. SECCIONES NARRATIVAS
        # =========================================================================
        def extraer_seccion(inicio_patron: str, fin_patron: str) -> str:
            patron = rf"{inicio_patron}.*?\n(.*?)(?={fin_patron}|\Z)"
            match = re.search(patron, texto_completo, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
            return ""

        datos["resumen"] = extraer_seccion(r"2\.\s+Resumen", r"Palabras claves?:")
        datos["palabras_clave"] = extraer_seccion(r"Palabras claves?:", r"Abstract")
        datos["abstract"] = extraer_seccion(r"Abstract", r"Keywords?:")
        datos["keywords"] = extraer_seccion(r"Keywords?:", r"3\.\s+Equipo")
        datos["problema_investigacion"] = extraer_seccion(r"4\.\s+Problema de investigación", r"5\.\s+Objetivo general")
        datos["objetivo_general"] = extraer_seccion(r"5\.\s+Objetivo general", r"6\.\s+Objetivos específicos")
        
        texto_oe = extraer_seccion(r"6\.\s+Objetivos específicos", r"7\.\s+Estado del arte")
        if texto_oe:
            objetivos = [linea.strip() for linea in texto_oe.split('\n') if re.match(r'^\d+\.', linea.strip())]
            datos["objetivos_especificos"] = [re.sub(r'^\d+\.\s*', '', obj) for obj in objetivos]
        
        datos["estado_arte"] = extraer_seccion(r"7\.\s+Estado del arte", r"8\.\s+Metodología")
        datos["metodologia"] = extraer_seccion(r"8\.\s+Metodología", r"9\.\s+Plan de acción")
        datos["hoja_ruta"] = extraer_seccion(r"16\.\s+Hoja de ruta", r"17\.\s+Referencias")
        datos["referencias"] = extraer_seccion(r"17\.\s+Referencias", r"18\.\s+Declaración jurada")

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
            except Exception as e:
                print(f"⚠️ Error procesando tabla: {e}")
                continue

        # =========================================================================
        # 5. SECCIÓN 13: RESGUARDO
        # =========================================================================
        datos["resguardo"]["resguardo_compromiso"] = bool(re.search(r"1\.\s*Declaro conocer.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["resguardo"]["resguardo_software"] = bool(re.search(r"2\.\s*En caso de desarrollar software.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))

        # =========================================================================
        # 6. SECCIÓN 14: DIVULGACIÓN
        # =========================================================================
        datos["divulgacion"]["cientifica"] = extraer_seccion(r"1\.a\.\s+Divulgación científica", r"1\.b\.")
        datos["divulgacion"]["canales_institucionales"] = extraer_seccion(r"1\.b\.\s+Canales Institucionales", r"1\.c\.")
        datos["divulgacion"]["socializacion"] = extraer_seccion(r"1\.c\.\s+Eventos de Socialización", r"1\.d\.")
        datos["divulgacion"]["medios_masivos"] = extraer_seccion(r"1\.d\.\s+Medios Masivos", r"15\.")

        # =========================================================================
        # 7. SECCIÓN 15: ASPECTOS ÉTICOS
        # =========================================================================
        datos["aspectos_eticos"]["seres_humanos"] = bool(re.search(r"1\.\s*¿Involucra.*?seres humanos.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["biodiversidad"] = bool(re.search(r"2\.\s*¿Involucra.*?biodiversidad.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["animales"] = bool(re.search(r"3\.\s*¿Involucra.*?animales.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        datos["aspectos_eticos"]["comunidades_indigenas"] = bool(re.search(r"4\.\s*¿Involucra.*?indígenas.*?☑\s*Sí", texto_completo, re.IGNORECASE | re.DOTALL))
        
        match_exencion = re.search(r"15\.a\.\s+Declaración de exención.*?razones:\s*(.*?)(?=15\.b\.|16\.)", texto_completo, re.IGNORECASE | re.DOTALL)
        if match_exencion:
            datos["aspectos_eticos"]["acuerdo_comision"] = match_exencion.group(1).strip()

        # =========================================================================
        # 🔍 MODO DEBUG 2: Imprimir el resultado final del parsing en JSON legible
        # =========================================================================
        print("\n" + "="*80)
        print("📊 DEBUG: DATOS FINALES PARSEADOS DEL FORM-04:")
        print(json.dumps(datos, indent=2, ensure_ascii=False))
        print("="*80 + "\n")

        return datos

    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO EN EL PARSER: {str(e)}\n")
        import traceback
        traceback.print_exc()
        raise Exception(f"Error al parsear el documento Word: {str(e)}")