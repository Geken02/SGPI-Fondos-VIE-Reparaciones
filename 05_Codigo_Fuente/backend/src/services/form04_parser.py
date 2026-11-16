
import re
from io import BytesIO
from typing import Dict, Any

from docx import Document
from docx.document import Document as _Doc
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P


# ---------------------------------------------------------------------------
# Helpers de recorrido del documento
# ---------------------------------------------------------------------------

def _iter_block_items(parent):
    """Itera párrafos y tablas en el orden real del documento."""
    body = parent.element.body if isinstance(parent, _Doc) else parent._element
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)


def _construir_texto_completo(doc: Document) -> str:
    """
    Texto completo del documento INCLUYENDO tablas.

    Cada fila de tabla se vuelca como una sola línea; las celdas se separan
    con ' | '.  Los saltos de línea dentro de una celda se colapsan a espacios
    para garantizar que cada fila sea una sola línea (clave para la regex del
    TRL: `TRL\\s*(\\d+):[^\\n]*☑`).
    """
    partes = []
    for block in _iter_block_items(doc):
        if isinstance(block, Paragraph):
            t = block.text.strip()
            if t:
                partes.append(t)
        elif isinstance(block, Table):
            for row in block.rows:
                cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                if any(cells):
                    partes.append(" | ".join(cells))
    return "\n".join(partes)


# ---------------------------------------------------------------------------
# Helpers de checkbox
# ---------------------------------------------------------------------------

# Caracteres de checkbox marcado / vacío que pueden aparecer en el docx.
_MARCADOS = r"[☑✔✓⊠×]"
_VACIOS = r"[☐○]"


def _checkbox_si_acotado(texto: str, inicio_patron: str, fin_patron: str) -> bool:
    """
    Devuelve True solo si dentro del bloque [inicio_patron .. fin_patron)
    hay un checkbox marcado seguido (solo whitespace entre medias) de 'Sí'.

    El acotado evita que el ☑ Sí de la pregunta siguiente contamine el
    resultado de la pregunta actual.
    """
    m_ini = re.search(inicio_patron, texto, re.IGNORECASE | re.DOTALL)
    if not m_ini:
        return False
    resto = texto[m_ini.end():]
    m_fin = re.search(fin_patron, resto, re.IGNORECASE)
    bloque = resto[: m_fin.start()] if m_fin else resto[:500]
    # ☑ seguido de Sí con solo whitespace entre medias (incl. saltos de línea).
    return bool(re.search(rf"{_MARCADOS}\s*Sí\b", bloque, re.IGNORECASE))


def _checkbox_marcado_acotado(texto: str, inicio_patron: str, fin_patron: str,
                              opcion_patron: str) -> bool:
    """
    Devuelve True si dentro del bloque [inicio .. fin) hay un checkbox marcado
    seguido de `opcion_patron`.  Útil para 'Sí, acepto el compromiso',
    'Sí, parcial', etc.
    """
    m_ini = re.search(inicio_patron, texto, re.IGNORECASE | re.DOTALL)
    if not m_ini:
        return False
    resto = texto[m_ini.end():]
    m_fin = re.search(fin_patron, resto, re.IGNORECASE)
    bloque = resto[: m_fin.start()] if m_fin else resto[:500]
    return bool(re.search(rf"{_MARCADOS}\s*{opcion_patron}", bloque, re.IGNORECASE))


def _limpiar_monto(texto: str) -> float:
    """Convierte '₡2,500,000' -> 2500000.0 ; '' -> 0.0."""
    limpio = re.sub(r"[₡,\s]", "", texto or "")
    try:
        return float(limpio) if limpio else 0.0
    except ValueError:
        return 0.0


# ---------------------------------------------------------------------------
# Parser principal
# ---------------------------------------------------------------------------

def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """Parser robusto para Form-04 con detección correcta de checkboxes."""
    try:
        doc = Document(BytesIO(archivo_bytes))
        texto_completo = _construir_texto_completo(doc)

        datos: Dict[str, Any] = {
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
                "trl": 1,
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
                "cofinanciamiento": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
            },
            "productos_14a": {
                "rango_horas": "",
                "opcion1": {"check": False, "cantidad": 0, "objetivo": ""},
                "opcion2": {"check": False, "cantidad": 0, "objetivo": ""},
                "opcion3": {"check": False, "cantidad": 0, "objetivo": ""},
                "adicional1": "",
                "adicional2": "",
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
                "norma": {"check": False, "cantidad": 0, "objetivo": ""},
            },
            "resguardo": {
                "resguardo_compromiso": False,
                "resguardo_software": False,
            },
            "divulgacion": {
                "cientifica": "",
                "canales_institucionales": "",
                "socializacion": "",
                "medios_masivos": "",
            },
            "aspectos_eticos": {
                "seres_humanos": False,
                "biodiversidad": False,
                "animales": False,
                "comunidades_indigenas": False,
                "acuerdo_comision": "",
            },
            "hoja_ruta": "",
            "referencias": "",
            "firma": {"nombre": "", "cedula": "", "firmado_digital": False},
        }

        # =====================================================================
        # 1. DATOS BÁSICOS (tablas iniciales)
        # =====================================================================
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

        # =====================================================================
        # 2. SECCIÓN 1 — PREGUNTAS GENERALES  (checkboxes Sí/No acotados)
        # =====================================================================
        # 1.a Modalidad: el ☑ va en la misma línea que la opción.
        if re.search(rf"{_MARCADOS}\s*investigación básica y aplicada", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Básica y Aplicada"
        elif re.search(rf"{_MARCADOS}\s*investigación aplicada", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Aplicada"
        elif re.search(rf"{_MARCADOS}\s*investigación básica\b", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Investigación Básica"
        elif re.search(rf"{_MARCADOS}\s*desarrollo tecnológico", texto_completo, re.IGNORECASE):
            datos["modalidad"] = "Desarrollo Tecnológico"

        # 1.b Otras fuentes — bloque acotado hasta 1.c.
        datos["seccion1"]["otras_fuentes"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.b\.\s+.*?fuentes de financiamiento", r"1\.c\."
        )
        if datos["seccion1"]["otras_fuentes"]["aplica"]:
            m = re.search(r"1\.b\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.c\.)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            if m:
                datos["seccion1"]["otras_fuentes"]["detalle"] = m.group(1).strip()

        # 1.c Vinculación técnica — hasta 1.d.
        datos["seccion1"]["vinculacion_tecnica"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.c\.\s+.*?vinculación técnica", r"1\.d\."
        )
        if datos["seccion1"]["vinculacion_tecnica"]["aplica"]:
            m = re.search(r"1\.c\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.d\.)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            if m:
                datos["seccion1"]["vinculacion_tecnica"]["detalle"] = m.group(1).strip()

        # 1.d Problemas nacionales — hasta 1.e.
        datos["seccion1"]["problemas_nacionales"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.d\.\s+.*?problemas prioritarios", r"1\.e\."
        )
        if datos["seccion1"]["problemas_nacionales"]["aplica"]:
            m = re.search(r"1\.d\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.e\.)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            if m:
                datos["seccion1"]["problemas_nacionales"]["detalle"] = m.group(1).strip()

        # 1.e Instrumento jurídico — hasta 1.f.
        datos["seccion1"]["instrumento_juridico"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.e\.\s+.*?instrumento jurídico", r"1\.f\."
        )
        if datos["seccion1"]["instrumento_juridico"]["aplica"]:
            if re.search(rf"{_MARCADOS}\s*Convenio Internacional", texto_completo, re.IGNORECASE):
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Internacional"
            else:
                datos["seccion1"]["instrumento_juridico"]["tipo"] = "Convenio Nacional"

        # 1.f Convenio marco — hasta 1.g.
        datos["seccion1"]["convenio_marco"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.f\.\s+.*?convenio marco", r"1\.g\."
        )
        if datos["seccion1"]["convenio_marco"]["aplica"]:
            m = re.search(r"1\.f\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.g\.)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            if m:
                datos["seccion1"]["convenio_marco"]["nombre"] = m.group(1).strip()

        # 1.g Base posgrado — opciones 'Sí, parcial' / 'Sí, totalmente'.
        if _checkbox_marcado_acotado(texto_completo,
                                     r"1\.g\.\s+.*?grado académico superior",
                                     r"1\.h\.",
                                     r"Sí,\s*parcial"):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, parcial"
        elif _checkbox_marcado_acotado(texto_completo,
                                       r"1\.g\.\s+.*?grado académico superior",
                                       r"1\.h\.",
                                       r"Sí,\s*totalmente"):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, totalmente"

        if datos["seccion1"]["base_posgrado"]["aplica"] != "No":
            m = re.search(
                r"1\.g\..*?grado académico superior\?.*?"
                r"(1\.\s*Nombre.*?2\.\s*Programa.*?3\.\s*Universidad.*?)"
                r"(?=1\.h\.)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m:
                t = m.group(1)
                m_c = re.search(r"1\.\s*Nombre.*?:\s*(.*?)(?:2\.|$)", t, re.IGNORECASE | re.DOTALL)
                m_p = re.search(r"2\.\s*Programa.*?:\s*(.*?)(?:3\.|$)", t, re.IGNORECASE | re.DOTALL)
                m_u = re.search(r"3\.\s*Universidad.*?:\s*(.*?)(?:1\.h\.|$)", t, re.IGNORECASE | re.DOTALL)
                if m_c:
                    datos["seccion1"]["base_posgrado"]["candidato"] = m_c.group(1).strip()
                if m_p:
                    datos["seccion1"]["base_posgrado"]["programa"] = m_p.group(1).strip()
                if m_u:
                    datos["seccion1"]["base_posgrado"]["universidad"] = m_u.group(1).strip()

        # 1.h Info confidencial — hasta 1.i.
        datos["seccion1"]["info_confidencial"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.h\.\s+.*?confidencialidad", r"1\.i\."
        )
        if datos["seccion1"]["info_confidencial"]["aplica"]:
            m = re.search(r"1\.h\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.i\.)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            if m:
                datos["seccion1"]["info_confidencial"]["detalle"] = m.group(1).strip()

        # 1.i Potencial PI — hasta 1.j.
        datos["seccion1"]["potencial_pi"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.i\.\s+.*?propiedad intelectual", r"1\.j\."
        )
        if datos["seccion1"]["potencial_pi"]["aplica"]:
            m = re.search(r"oficio del dictamen.*?:\s*([A-Z]{2,}-\w+-\d{4}-\d+)",
                          texto_completo, re.IGNORECASE)
            if m:
                datos["seccion1"]["potencial_pi"]["oficio_dictamen"] = m.group(1).strip()

        # 1.j Innovación — hasta 1.k.
        datos["seccion1"]["posee_innovacion"]["aplica"] = _checkbox_si_acotado(
            texto_completo, r"1\.j\.\s+.*?innovación", r"1\.k\."
        )
        if datos["seccion1"]["posee_innovacion"]["aplica"]:
            if re.search(rf"{_MARCADOS}\s*de Proceso", texto_completo, re.IGNORECASE):
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Proceso"
            else:
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Producto"

        # 1.k TRL — la fila del ☑ y el número deben estar en la misma línea.
        # Como cada fila de tabla es una sola línea en texto_completo,
        # [^\n]* garantiza que el ☑ pertenezca a la MISMA fila que el número.
        m_trl = re.search(rf"TRL\s*(\d+):[^\n]*{_MARCADOS}", texto_completo, re.IGNORECASE)
        if m_trl:
            datos["seccion1"]["trl"] = int(m_trl.group(1))

        # =====================================================================
        # 3. SECCIONES NARRATIVAS
        # =====================================================================
        def extraer_seccion(inicio_patron: str, fin_patron: str) -> str:
            m = re.search(rf"{inicio_patron}\s*(.*?)(?={fin_patron}|\Z)",
                          texto_completo, re.IGNORECASE | re.DOTALL)
            return m.group(1).strip() if m else ""

        datos["resumen"] = extraer_seccion(r"2\.\s*Resumen", r"Palabras claves?:")
        datos["palabras_clave"] = extraer_seccion(r"Palabras claves?:", r"Abstract")
        datos["abstract"] = extraer_seccion(r"Abstract", r"Keywords?:")
        datos["keywords"] = extraer_seccion(r"Keywords?:", r"3\.\s*Equipo")
        datos["problema_investigacion"] = extraer_seccion(r"4\.\s*Problema de investigación", r"5\.\s*Objetivo general")
        datos["objetivo_general"] = extraer_seccion(r"5\.\s*Objetivo general", r"6\.\s*Objetivos específicos")

        texto_oe = extraer_seccion(r"6\.\s*Objetivos específicos", r"7\.\s*Estado del arte")
        if texto_oe:
            objetivos = [ln.strip() for ln in texto_oe.split("\n") if re.match(r"^\d+\.", ln.strip())]
            datos["objetivos_especificos"] = [re.sub(r"^\d+\.\s*", "", o) for o in objetivos]

        datos["estado_arte"] = extraer_seccion(r"7\.\s*Estado del arte", r"8\.\s*Metodología")
        datos["metodologia"] = extraer_seccion(r"8\.\s*Metodología", r"9\.\s*Plan de acción")
        datos["hoja_ruta"] = extraer_seccion(r"16\.\s*Hoja de ruta", r"17\.\s*Referencias")
        datos["referencias"] = extraer_seccion(r"17\.\s*Referencias", r"18\.\s*Declaración jurada")

        # =====================================================================
        # 4. TABLAS — Investigadores, Colaboradores, Presupuesto, Financiamiento
        # =====================================================================
        for table in doc.tables:
            try:
                header = " ".join(c.text.strip().lower() for c in table.rows[0].cells)

                if "nombre y apellidos" in header and "orcid" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 5 and cells[0] and not cells[0].startswith("[Inserte"):
                            datos["investigadores_tec"].append({
                                "nombre": cells[0],
                                "orcid": cells[1] if len(cells) > 1 else "",
                                "instancia": cells[2] if len(cells) > 2 else "",
                                "rol": cells[3] if len(cells) > 3 else "",
                                "horas": cells[4] if len(cells) > 4 else "",
                                "nombramiento": cells[5] if len(cells) > 5 else "",
                            })

                elif "colaborador externo" in header and "institución" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 3 and cells[0] and not cells[0].startswith("[Inserte"):
                            datos["colaboradores_externos"].append({
                                "nombre": cells[0],
                                "orcid": cells[1] if len(cells) > 1 else "",
                                "institucion": cells[2] if len(cells) > 2 else "",
                            })

                elif "año" in header and ("operativo" in header or "duradero" in header):
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 3:
                            anio = cells[0]
                            if anio in ("2027", "2028", "2029", "Total"):
                                datos["presupuesto_anual"].append({
                                    "ano": f"Año {anio}" if anio != "Total" else "Total",
                                    "operativo": _limpiar_monto(cells[1]) if len(cells) > 1 else 0.0,
                                    "duradero": _limpiar_monto(cells[2]) if len(cells) > 2 else 0.0,
                                })

                elif "desglose" in header and "año 1" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 5:
                            fuente = cells[0].lower()
                            entry = {
                                "ano1": _limpiar_monto(cells[1]),
                                "ano2": _limpiar_monto(cells[2]),
                                "ano3": _limpiar_monto(cells[3]),
                                "oficio": cells[4] if len(cells) > 4 else "",
                            }
                            if "financiamiento externo" in fuente:
                                datos["financiamiento_adicional"]["externo"] = entry
                            elif "contrapartida" in fuente:
                                datos["financiamiento_adicional"]["contrapartida"] = entry
                            elif "cofinanciamiento" in fuente:
                                datos["financiamiento_adicional"]["cofinanciamiento"] = entry

                # --- Cuadro 6: rango de horas (productos 14a) ---
                elif "total de horas" in header and "productos mínimos" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 3 and re.search(_MARCADOS, cells[-1]):
                            datos["productos_14a"]["rango_horas"] = cells[0]
                            break

                # --- Cuadro 7: selección de productos académicos (14a) ---
                elif "opción de producto" in header or ("selección" in header and "opción" in header):
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 3:
                            continue
                        marca, cant_txt, opcion_txt = cells[0], cells[1], cells[2]
                        objetivo_txt = cells[3] if len(cells) > 3 else ""
                        if not re.search(_MARCADOS, marca):
                            continue
                        try:
                            cant = int(re.search(r"\d+", cant_txt).group())
                        except (AttributeError, ValueError):
                            cant = 0
                        if "Opción 1" in opcion_txt:
                            datos["productos_14a"]["opcion1"] = {"check": True, "cantidad": cant, "objetivo": objetivo_txt}
                        elif "Opción 2" in opcion_txt:
                            datos["productos_14a"]["opcion2"] = {"check": True, "cantidad": cant, "objetivo": objetivo_txt}
                        elif "Opción 3" in opcion_txt:
                            datos["productos_14a"]["opcion3"] = {"check": True, "cantidad": cant, "objetivo": objetivo_txt}

            except Exception:
                continue

        # Productos adicionales (texto libre tras "Otros resultados y activos")
        m_adic = re.search(r"Otros resultados y activos.*?(?:Complementarios)?\s*(.*?)(?=13\.|14\.\s*Resguardo)",
                           texto_completo, re.IGNORECASE | re.DOTALL)
        if m_adic:
            bloq = m_adic.group(1)
            m1 = re.search(r"1\.\s*Producto adicional 1:?\s*(.*?)(?:2\.\s*Producto adicional 2|15\.|$)",
                           bloq, re.IGNORECASE | re.DOTALL)
            m2 = re.search(r"2\.\s*Producto adicional 2:?\s*(.*?)(?:15\.|$)",
                           bloq, re.IGNORECASE | re.DOTALL)
            if m1:
                datos["productos_14a"]["adicional1"] = m1.group(1).strip()
            if m2:
                datos["productos_14a"]["adicional2"] = m2.group(1).strip()

        # =====================================================================
        # 5. RESGUARDO  (ventanas acotadas al próximo ítem)
        # =====================================================================
        datos["resguardo"]["resguardo_compromiso"] = _checkbox_marcado_acotado(
            texto_completo,
            r"1\.\s*Declaro conocer",
            r"2\.\s*En caso de desarrollar software",
            r"Sí",
        )
        datos["resguardo"]["resguardo_software"] = _checkbox_marcado_acotado(
            texto_completo,
            r"2\.\s*En caso de desarrollar software",
            r"14\.\s*Estrategia|13\.\s*Resguardo",
            r"Sí",
        )

        # =====================================================================
        # 6. DIVULGACIÓN
        # =====================================================================
        datos["divulgacion"]["cientifica"] = extraer_seccion(
            r"1\.a\.\s*Divulgación científica", r"1\.b\.\s*Canales Institucionales")
        datos["divulgacion"]["canales_institucionales"] = extraer_seccion(
            r"1\.b\.\s*Canales Institucionales", r"1\.c\.\s*Eventos de Socialización")
        datos["divulgacion"]["socializacion"] = extraer_seccion(
            r"1\.c\.\s*Eventos de Socialización", r"1\.d\.\s*Medios Masivos")
        datos["divulgacion"]["medios_masivos"] = extraer_seccion(
            r"1\.d\.\s*Medios Masivos", r"15\.\s*Aspectos Éticos")

        # =====================================================================
        # 7. ASPECTOS ÉTICOS  (cada pregunta acotada a la siguiente)
        # =====================================================================
        datos["aspectos_eticos"]["seres_humanos"] = _checkbox_si_acotado(
            texto_completo,
            r"1\.\s*¿Involucra.*?seres humanos\?",
            r"2\.\s*¿Involucra.*?biodiversidad\?",
        )
        datos["aspectos_eticos"]["biodiversidad"] = _checkbox_si_acotado(
            texto_completo,
            r"2\.\s*¿Involucra.*?biodiversidad\?",
            r"3\.\s*¿Involucra.*?animales\?",
        )
        datos["aspectos_eticos"]["animales"] = _checkbox_si_acotado(
            texto_completo,
            r"3\.\s*¿Involucra.*?animales\?",
            r"4\.\s*¿Involucra.*?indígenas\?",
        )
        datos["aspectos_eticos"]["comunidades_indigenas"] = _checkbox_si_acotado(
            texto_completo,
            r"4\.\s*¿Involucra.*?indígenas\?",
            r"15\.a\.\s*Declaración de exención",
        )

        m_ex = re.search(r"15\.a\.\s*Declaración de exención.*?razones:\s*(.*?)(?=15\.b\.|16\.)",
                         texto_completo, re.IGNORECASE | re.DOTALL)
        if m_ex:
            datos["aspectos_eticos"]["acuerdo_comision"] = m_ex.group(1).strip()

        # =====================================================================
        # 8. FIRMA  (inspección de celdas, no texto unido)
        # =====================================================================
        for table in doc.tables:
            try:
                for row in table.rows:
                    cells = [c.text.strip() for c in row.cells]
                    if len(cells) >= 2:
                        if "Nombre completo" in cells[0]:
                            datos["firma"]["nombre"] = cells[1]
                        elif "Número de cédula" in cells[0] or "Numero de cedula" in cells[0]:
                            datos["firma"]["cedula"] = cells[1]
                        elif "Firma digital" in cells[0]:
                            datos["firma"]["firmado_digital"] = bool(re.search(_MARCADOS, cells[1])) or "Sí" in cells[1]
            except Exception:
                continue

        return datos

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise Exception(f"Error al parsear el documento Word: {str(e)}")