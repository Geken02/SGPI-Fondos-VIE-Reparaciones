"""
form04_parser.py
================
Parser robusto para el Form-04 (Formulario Proyecto Investigación Fondos VIE 2027).

Lee el archivo .docx generado por la Vicerrectoría de Investigación y Extensión
y devuelve un dict estructurado con TODOS los datos del formulario listos para
ser persistidos en la base de datos (schema SGPI).

Estructura del .docx que reconoce (secciones numeradas como en el formulario real):
  1.  Preguntas generales  (1.1 - 1.11)
  2.  Resumen + Abstract
  3.  Equipo de investigación (Cuadros 2 y 3)
  4.  Problema de investigación
  5.  Objetivo general
  6.  Objetivos específicos
  7.  Estado del arte
  8.  Metodología
  12. Plan de acción
  13. Presupuesto (Cuadro 4)
  14. Financiamiento externo (Cuadro 5)
  15. Compromisos (Cuadros 6, 7, 8, 9, 10)
  16. Resguardo
  17. Estrategia de divulgación
  18. Aspectos éticos
  19. Hoja de ruta
  20. Referencias
  21. Declaración jurada (firma)

Caracteres de checkbox reconocidos:
  - Marcados: ☑ ☒ ✔ ✓ × ⨯ ✗ ⊠ ✘
  - Vacíos:   ☐ ○ □
"""

import re
from io import BytesIO
from typing import Dict, Any, List, Optional, Tuple

from docx import Document
from docx.document import Document as _Doc
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P


# ---------------------------------------------------------------------------
# Constantes de checkbox
# ---------------------------------------------------------------------------

# Caracteres que indican casilla MARCADA.
# IMPORTANTE: incluye ☒ (U+2612 BALLOT BOX WITH X), usado por el .docx generado.
_MARCADOS = r"[☑☒✔✓×⨯✗⊠✘]"

# Caracteres que indican casilla VACÍA.
_VACIOS = r"[☐○□]"


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
    con ' | '.  Los saltos de línea dentro de una celda se colapsan a espacios.
    """
    partes: List[str] = []
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


def _limpiar_monto(texto: str) -> float:
    """Convierte '₡5.000.000.00' -> 5000000.0 ; '' -> 0.0.

    Formato CR/LatAm: los puntos son separadores de miles EXCEPTO el último
    grupo que, si tiene exactamente 2 dígitos, son decimales.
    """
    if not texto:
        return 0.0
    # Quitar símbolo de colón, espacios.
    limpio = re.sub(r"[₡\s]", "", texto)
    if not limpio:
        return 0.0
    # Eliminar comas (algunos formatos las usan para decimales).
    limpio = limpio.replace(",", "")

    if "." in limpio:
        partes = limpio.split(".")
        # Caso 1: último grupo tiene EXACTAMENTE 2 dígitos => es decimal.
        # Los grupos anteriores son separadores de miles (pueden tener 1-3 dígitos).
        if len(partes) >= 2 and len(partes[-1]) == 2:
            entero = "".join(partes[:-1])
            decimal = partes[-1]
            limpio = f"{entero}.{decimal}"
        # Caso 2: último grupo tiene 3 dígitos y TODOS los grupos tienen 3 dígitos
        # => todos son separadores de miles, no hay decimales.
        elif len(partes[-1]) == 3 and all(len(p) == 3 for p in partes):
            limpio = "".join(partes)
        # Caso 3: último grupo tiene 3 dígitos pero el primer grupo es < 3
        # => formato "5.000.000" (sin decimales) — todos son miles.
        elif len(partes[-1]) == 3:
            limpio = "".join(partes)
        # Caso 4: último grupo tiene 1 dígito => tratar como decimal.
        elif len(partes[-1]) == 1:
            entero = "".join(partes[:-1])
            decimal = partes[-1]
            limpio = f"{entero}.{decimal}"
        else:
            limpio = limpio.replace(".", "")

    try:
        return float(limpio) if limpio else 0.0
    except ValueError:
        return 0.0


def _extraer_seccion_de(texto: str, inicio_patron: str, fin_patron: str) -> str:
    """Extrae el texto entre inicio_patron y fin_patron (regex)."""
    m = re.search(
        rf"{inicio_patron}\s*(.*?)(?={fin_patron}|\Z)",
        texto, re.IGNORECASE | re.DOTALL,
    )
    return m.group(1).strip() if m else ""


def _checkbox_marcado_en_bloque_de(texto: str, inicio_patron: str, fin_patron: str,
                                   opcion_patron: str) -> bool:
    """
    Devuelve True si dentro del bloque [inicio .. fin) hay un checkbox marcado
    seguido de `opcion_patron`.  Útil para 'Sí', 'Sí, parcial', 'Sí, totalmente',
    'Convenio Nacional', 'de Producto', etc.
    """
    m_ini = re.search(inicio_patron, texto, re.IGNORECASE | re.DOTALL)
    if not m_ini:
        return False
    resto = texto[m_ini.end():]
    m_fin = re.search(fin_patron, resto, re.IGNORECASE)
    bloque = resto[: m_fin.start()] if m_fin else resto[:800]
    return bool(re.search(rf"{_MARCADOS}\s*{opcion_patron}", bloque, re.IGNORECASE))


# ---------------------------------------------------------------------------
# Helpers para parsear referencias bibliográficas
# ---------------------------------------------------------------------------

def _parsear_referencia(texto: str) -> Optional[Dict[str, Any]]:
    """
    Convierte una línea como:
      '[3] Núñez-Marcos, A., Perez-de-Viñaspre, O., Labaka, G.: A survey ...
       Expert Systems with Applications 213, 118993 (2023).
       https://doi.org/10.1016/j.eswa.2022.118993'
    en un dict con: numero, autores (lista), titulo, anio, doi, revista_fuente,
    es_indexada_wos_scopus (bool aproximado).
    """
    if not texto:
        return None
    # Número de referencia [N]
    m_num = re.match(r"\s*\[(\d+)\]\s*(.+)", texto, re.DOTALL)
    if not m_num:
        return None
    numero = int(m_num.group(1))
    cuerpo = m_num.group(2).strip()

    # DOI
    doi = ""
    m_doi = re.search(r"https?://doi\.org/(\S+?)(?:[,;\s]*$|\s*$)", cuerpo)
    if m_doi:
        doi = "https://doi.org/" + m_doi.group(1).rstrip(".,;)")

    # Año (entre paréntesis)
    anio = 0
    m_anio = re.search(r"\((\d{4})\)", cuerpo)
    if m_anio:
        anio = int(m_anio.group(1))

    # Autores: texto antes del primer ":" que sigue a los apellidos.
    autores: List[str] = []
    m_auth = re.match(r"(.+?):\s*(.+)", cuerpo, re.DOTALL)
    titulo = cuerpo
    if m_auth:
        bloque_authors = m_auth.group(1)
        titulo = m_auth.group(2)
        # Separa por comas y "and"/"&"
        parts = re.split(r",|\sand\s|&", bloque_authors)
        for a in parts:
            a = a.strip().strip(".")
            if a and len(a) > 1:
                # Elimina sufijos como "Jr." o "2nd" pegados al final.
                a = re.sub(r"\s+(Jr|Sr|Ph\.?D\.?)\.?$", "", a, flags=re.IGNORECASE).strip()
                if a:
                    autores.append(a)

    # Título: limpiar hasta el primer "." o el inicio del indicador de revista.
    # Heuristic: cortar al primer punto que NO esté dentro del título principal.
    # Simplemente tomamos hasta el primer "." después del título.
    titulo_corto = titulo.split(".")[0].strip() if titulo else ""

    # Revista fuente: tras el título, suele aparecer el nombre de la revista.
    revista = ""
    m_rev = re.search(
        r"\.\s*([A-Z][^.()]{5,}?)\s+\d+", titulo
    )
    if m_rev:
        revista = m_rev.group(1).strip()
    # Alternativa: "In: ..." indica actas/conferencia
    es_acta = bool(re.search(r"\bIn:\s", cuerpo, re.IGNORECASE))

    # Indexación WoS/Scopus: heurística — si menciona ACM/IEEE/Springer/LNCS
    # o "Proceedings of the ... Annual Meeting of the Association for Computational Linguistics"
    es_indexada = bool(re.search(
        r"\b(ACM|IEEE|Springer|LNCS|Association for Computational Linguistics|"
        r"Annual Review|Expert Systems|Oxford University Press|Cambridge University Press|"
        r"Multimodal Technologies and Interaction|arXiv)\b",
        cuerpo, re.IGNORECASE
    ))

    return {
        "numero": numero,
        "autores": autores,
        "titulo": titulo_corto or titulo[:300],
        "anio": anio,
        "doi": doi,
        "revista_fuente": revista,
        "es_acta_conferencia": es_acta,
        "es_indexada_wos_scopus": es_indexada,
        "texto_completo": texto.strip(),
    }


# ---------------------------------------------------------------------------
# Parser principal
# ---------------------------------------------------------------------------

def parsear_form04_docx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser robusto para Form-04.

    Devuelve un dict con la estructura completa del formulario.  Nunca lanza
    por datos faltantes: si una sección no se encuentra, se devuelve un valor
    vacío compatible con el esquema de la BD.
    """
    try:
        doc = Document(BytesIO(archivo_bytes))
        texto_completo = _construir_texto_completo(doc)

        # Closures que capturan texto_completo automáticamente.
        def _extraer_seccion(inicio_patron: str, fin_patron: str) -> str:
            return _extraer_seccion_de(texto_completo, inicio_patron, fin_patron)

        def _checkbox_marcado_en_bloque(inicio_patron: str, fin_patron: str,
                                        opcion_patron: str) -> bool:
            return _checkbox_marcado_en_bloque_de(
                texto_completo, inicio_patron, fin_patron, opcion_patron
            )

        datos: Dict[str, Any] = {
            # Datos básicos del encabezado
            "titulo": "",
            "fecha_inicio": "",
            "fecha_fin": "",
            "modalidad": "",
            "convocatoria": "Convocatoria interna para investigación (Recursos VIE)",

            # Sección 1 — Preguntas generales (1.1 - 1.11)
            "seccion1": {
                "modalidad": "",
                "otras_fuentes": {"aplica": False, "detalle": ""},
                "vinculacion_tecnica": {"aplica": False, "detalle": ""},
                "problemas_nacionales": {"aplica": False, "detalle": ""},
                "instrumento_juridico": {
                    "aplica": False,
                    "convenio_nacional": False,
                    "convenio_internacional": False,
                    "detalle": "",
                },
                "convenio_marco": {"aplica": False, "nombre": ""},
                "base_posgrado": {
                    "aplica": "No",
                    "candidato": "",
                    "programa": "",
                    "universidad": "",
                },
                "info_confidencial": {"aplica": False, "detalle": ""},
                "potencial_pi": {"aplica": False, "oficio_dictamen": ""},
                "posee_innovacion": {"aplica": False, "tipo": ""},
                "trl": 1,
            },

            # Sección 2 — Resumen
            "resumen": "",
            "palabras_clave": "",
            "abstract": "",
            "keywords": "",

            # Sección 3 — Equipo de investigación
            "investigadores_tec": [],
            "colaboradores_externos": [],

            # Sección 4 — Problema
            "problema_investigacion": "",

            # Sección 5 — Objetivo general
            "objetivo_general": "",

            # Sección 6 — Objetivos específicos
            "objetivos_especificos": [],

            # Sección 7 — Estado del arte
            "estado_arte": "",

            # Sección 8 — Metodología
            "metodologia": "",

            # Sección 13 — Presupuesto
            "presupuesto_anual": [],   # [{"ano": 2027, "operativo": 5000000, "duradero": 0, "total": 5000000}, ...]
            "monto_total_proyecto": 0.0,

            # Sección 14 — Financiamiento externo
            "financiamiento_adicional": {
                "externo": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
                "contrapartida": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
                "cofinanciamiento": {"ano1": 0.0, "ano2": 0.0, "ano3": 0.0, "oficio": ""},
            },

            # Sección 15 — Compromisos
            "compromisos": {
                "horas_semanales_basica": 0,
                "horas_semanales_desarrollo": 0,
                "rango_basica": "",
                "rango_desarrollo": "",
                "productos_basica": [],   # [{opcion, cantidad, objetivo}]
                "productos_desarrollo": [],
                "activos_propiedad_industrial": [],  # [{tipo_activo, consecutivo}]
                "productos_adicionales": [],   # texto libre
            },

            # Sección 16 — Resguardo
            "resguardo": {
                "resguardo_compromiso": False,
                "resguardo_software": False,
            },

            # Sección 17 — Estrategia divulgación
            "divulgacion": {
                "cientifica": "",
                "canales_institucionales": "",
                "socializacion": "",
                "medios_masivos": "",
            },

            # Sección 18 — Aspectos éticos
            "aspectos_eticos": {
                "seres_humanos": False,
                "biodiversidad": False,
                "animales": False,
                "comunidades_indigenas": False,
                "justificacion_exencion": "",
                "ente_regulatorio": "",   # CEC, CONAGEBIO, CICUA/COBAB, Otro
            },

            # Sección 19 — Hoja de ruta
            "hoja_ruta": "",

            # Sección 20 — Referencias
            "referencias": [],   # lista de dicts parseados

            # Sección 21 — Declaración jurada / firma
            "firma": {
                "nombre": "",
                "cedula": "",
                "firmado_digital": False,
                "fecha_firma": "",
            },
        }

        # =====================================================================
        # 1. DATOS BÁSICOS — tabla inicial (Nombre del proyecto, Fechas)
        # =====================================================================
        for table in doc.tables[:3]:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells]
                if len(cells) >= 2:
                    label = cells[0]
                    value = cells[1]
                    if "Nombre del proyecto" in label:
                        datos["titulo"] = value
                    elif "Fecha de inicio" in label:
                        datos["fecha_inicio"] = value
                    elif "Fecha de finalizacion" in label or "Fecha de finalización" in label:
                        datos["fecha_fin"] = value

        # =====================================================================
        # 2. SECCIÓN 1 — PREGUNTAS GENERALES
        # =====================================================================
        # 1.1 Modalidad — el ☒ va en la misma línea que la opción.
        if _checkbox_marcado_en_bloque(r"1\.1\.",
                                       r"1\.2\.",
                                       r"investigación básica y aplicada"):
            datos["seccion1"]["modalidad"] = "Investigación Básica y Aplicada"
        elif _checkbox_marcado_en_bloque(r"1\.1\.",
                                         r"1\.2\.",
                                         r"investigación aplicada"):
            datos["seccion1"]["modalidad"] = "Investigación Aplicada"
        elif _checkbox_marcado_en_bloque(r"1\.1\.",
                                         r"1\.2\.",
                                         r"investigación básica"):
            datos["seccion1"]["modalidad"] = "Investigación Básica"
        elif _checkbox_marcado_en_bloque(r"1\.1\.",
                                         r"1\.2\.",
                                         r"desarrollo tecnológico"):
            datos["seccion1"]["modalidad"] = "Desarrollo Tecnológico"
        datos["modalidad"] = datos["seccion1"]["modalidad"]

        # 1.2 Otras fuentes de financiamiento — bloque acotado hasta 1.3.
        datos["seccion1"]["otras_fuentes"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.2\.", r"1\.3\.", r"Sí"
        )
        if datos["seccion1"]["otras_fuentes"]["aplica"]:
            m = re.search(
                r"1\.2\..*?" + _MARCADOS + r"\s*Sí\s*(.*?)(?=1\.3\.)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m:
                datos["seccion1"]["otras_fuentes"]["detalle"] = m.group(1).strip()

        # 1.3 Vinculación técnica — hasta 1.4.
        datos["seccion1"]["vinculacion_tecnica"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.3\.", r"1\.4\.", r"Sí"
        )
        if datos["seccion1"]["vinculacion_tecnica"]["aplica"]:
            m = re.search(
                r"a\.\s*Nombre del proyecto relacionado:\s*(.*?)\s*b\.",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m:
                tipo_match = re.search(
                    r"b\.\s*Tipo de relación.*?:\s*(.*?)(?=1\.4\.)",
                    texto_completo, re.IGNORECASE | re.DOTALL,
                )
                detalle = "Nombre: " + m.group(1).strip()
                if tipo_match:
                    detalle += " | Tipo: " + tipo_match.group(1).strip()
                datos["seccion1"]["vinculacion_tecnica"]["detalle"] = detalle

        # 1.4 Problemas prioritarios nacionales — hasta 1.5.
        datos["seccion1"]["problemas_nacionales"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.4\.", r"1\.5\.", r"Sí"
        )
        if datos["seccion1"]["problemas_nacionales"]["aplica"]:
            detalle = _extraer_seccion(r"1\.4\..*?especifique el problema y el documento de referencia.*?:",
                r"1\.5\.",
            )
            datos["seccion1"]["problemas_nacionales"]["detalle"] = detalle

        # 1.5 Instrumento jurídico — hasta 1.6.
        datos["seccion1"]["instrumento_juridico"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.5\.", r"1\.6\.", r"Sí"
        )
        if datos["seccion1"]["instrumento_juridico"]["aplica"]:
            datos["seccion1"]["instrumento_juridico"]["convenio_nacional"] = \
                _checkbox_marcado_en_bloque(r"1\.5\.", r"1\.6\.", r"Convenio Nacional"
                )
            datos["seccion1"]["instrumento_juridico"]["convenio_internacional"] = \
                _checkbox_marcado_en_bloque(r"1\.5\.", r"1\.6\.", r"Convenio Internacional"
                )
            m = re.search(
                r"1\.5\..*?Convenio Internacional\s*(.*?)(?=1\.6\.)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m and m.group(1).strip():
                datos["seccion1"]["instrumento_juridico"]["detalle"] = m.group(1).strip()

        # 1.6 Convenio marco — hasta 1.7.
        datos["seccion1"]["convenio_marco"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.6\.", r"1\.7\.", r"Sí"
        )
        if datos["seccion1"]["convenio_marco"]["aplica"]:
            m = re.search(
                r"1\.6\..*?indique el nombre completo del convenio:\s*(.*?)(?=1\.7\.)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m:
                datos["seccion1"]["convenio_marco"]["nombre"] = m.group(1).strip()

        # 1.7 Base posgrado — opciones 'Sí, parcial' / 'Sí, totalmente'.
        if _checkbox_marcado_en_bloque(r"1\.7\.", r"1\.8\.", r"Sí,\s*parcial"):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, parcial"
        elif _checkbox_marcado_en_bloque(r"1\.7\.", r"1\.8\.", r"Sí,\s*totalmente"):
            datos["seccion1"]["base_posgrado"]["aplica"] = "Sí, totalmente"

        if datos["seccion1"]["base_posgrado"]["aplica"] != "No":
            m_c = re.search(
                r"1\.\s*Nombre de la persona candidata:\s*(.*?)(?:2\.\s*Programa|$)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            m_p = re.search(
                r"2\.\s*Programa y grado académico a obtener:\s*(.*?)(?:3\.\s*Universidad|$)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            m_u = re.search(
                r"3\.\s*Universidad que acredita el grado:\s*(.*?)(?:1\.8\.|$)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m_c:
                datos["seccion1"]["base_posgrado"]["candidato"] = m_c.group(1).strip()
            if m_p:
                datos["seccion1"]["base_posgrado"]["programa"] = m_p.group(1).strip()
            if m_u:
                datos["seccion1"]["base_posgrado"]["universidad"] = m_u.group(1).strip()

        # 1.8 Info confidencial — hasta 1.9.
        datos["seccion1"]["info_confidencial"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.8\.", r"1\.9\.", r"Sí"
        )
        if datos["seccion1"]["info_confidencial"]["aplica"]:
            m = re.search(
                r"1\.8\..*?describa el tipo de información y la fuente de la restricción:\s*(.*?)(?=1\.9\.)",
                texto_completo, re.IGNORECASE | re.DOTALL,
            )
            if m:
                datos["seccion1"]["info_confidencial"]["detalle"] = m.group(1).strip()

        # 1.9 Potencial PI — hasta 1.10.
        datos["seccion1"]["potencial_pi"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.9\.", r"1\.10\.", r"Sí"
        )
        if datos["seccion1"]["potencial_pi"]["aplica"]:
            # Captura códigos tipo "VINC-127-2026"
            m = re.search(
                r"Dictamen\s+([A-Z]{2,}-\d+-\d{4})",
                texto_completo, re.IGNORECASE,
            )
            if m:
                datos["seccion1"]["potencial_pi"]["oficio_dictamen"] = m.group(1).strip()

        # 1.10 Innovación — hasta 1.11.
        datos["seccion1"]["posee_innovacion"]["aplica"] = _checkbox_marcado_en_bloque(r"1\.10\.", r"1\.11\.", r"Sí"
        )
        if datos["seccion1"]["posee_innovacion"]["aplica"]:
            if _checkbox_marcado_en_bloque(r"1\.10\.", r"1\.11\.", r"de Proceso"):
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Proceso"
            elif _checkbox_marcado_en_bloque(r"1\.10\.", r"1\.11\.", r"de Producto"):
                datos["seccion1"]["posee_innovacion"]["tipo"] = "de Producto"

        # 1.11 TRL — cuadro con 9 filas; cada fila tiene TRL N en col 0 y checkbox en col 2.
        for table in doc.tables:
            try:
                header = " ".join(c.text.strip().lower() for c in table.rows[0].cells)
                if "escala de niveles trl" in header and "nivel de trl esperado" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if not cells:
                            continue
                        # cells[0] = "TRL 7: Demostración en entorno operativo real"
                        m_trl = re.search(r"TRL\s*(\d+)", cells[0])
                        if not m_trl:
                            continue
                        numero_trl = int(m_trl.group(1))
                        # cells[2] contiene el checkbox
                        marca_celda = cells[2] if len(cells) > 2 else ""
                        if re.search(_MARCADOS, marca_celda):
                            datos["seccion1"]["trl"] = numero_trl
                            break
                    break
            except Exception:
                continue

        # =====================================================================
        # 3. SECCIONES NARRATIVAS (2 - 8)
        # =====================================================================
        datos["resumen"] = _extraer_seccion(r"2\.\s*Resumen", r"Palabras claves?:")
        datos["palabras_clave"] = _extraer_seccion(r"Palabras claves?:", r"Abstract")
        datos["abstract"] = _extraer_seccion(r"Abstract", r"Keywords?:")
        datos["keywords"] = _extraer_seccion(r"Keywords?:", r"3\.\s*Equipo de investigación")
        datos["problema_investigacion"] = _extraer_seccion(
            r"4\.\s*Problema de investigación", r"5\.\s*Objetivo general"
        )
        datos["objetivo_general"] = _extraer_seccion(
            r"5\.\s*Objetivo general:?", r"6\.\s*Objetivos específicos"
        ).lstrip(":").strip()

        # 6. Objetivos específicos — están numerados 1.-8. uno por línea.
        texto_oe = _extraer_seccion(r"6\.\s*Objetivos específicos", r"7\.\s*Estado del arte")
        if texto_oe:
            # Cada objetivo comienza con "N. " en su propia línea.
            for ln in texto_oe.split("\n"):
                ln = ln.strip()
                m = re.match(r"^(\d+)\.\s+(.+)", ln)
                if m:
                    datos["objetivos_especificos"].append({
                        "numero": int(m.group(1)),
                        "descripcion": m.group(2).strip(),
                    })

        # 7. Estado del arte — hasta "8. Metodología".
        datos["estado_arte"] = _extraer_seccion(r"7\.\s*Estado del arte", r"8\.\s*Metodología")

        # 8. Metodología — hasta "12. Plan de acción".
        datos["metodologia"] = _extraer_seccion(r"8\.\s*Metodología", r"12\.\s*Plan de acción")

        # =====================================================================
        # 4. TABLAS — Investigadores, Colaboradores, Presupuesto, Financiamiento
        # =====================================================================
        for table in doc.tables:
            try:
                header = " ".join(c.text.strip().lower() for c in table.rows[0].cells)

                # --- Cuadro 2: Investigadores TEC ---
                if "nombre y apellidos" in header and "orcid" in header \
                        and "instancia" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 5:
                            continue
                        nombre = cells[0]
                        if not nombre or nombre.startswith("[Inserte"):
                            continue
                        # horas: "4 VIE-Centro / 4 REC" -> [{'tipo':'VIE-Centro','horas':4}, ...]
                        horas_raw = cells[4] if len(cells) > 4 else ""
                        tipos_horas = []
                        for parte in re.split(r"[/\n]", horas_raw):
                            parte = parte.strip()
                            m_h = re.match(r"(\d+(?:[.,]\d+)?)\s*([A-Za-z\-]+)", parte)
                            if m_h:
                                tipos_horas.append({
                                    "horas": float(m_h.group(1).replace(",", ".")),
                                    "tipo_hora": m_h.group(2).strip(),
                                })
                        datos["investigadores_tec"].append({
                            "nombre": nombre,
                            "orcid": cells[1] if len(cells) > 1 else "",
                            "instancia": cells[2] if len(cells) > 2 else "",
                            "rol": cells[3] if len(cells) > 3 else "",
                            "horas": tipos_horas,
                            "nombramiento": cells[5] if len(cells) > 5 else "",
                        })

                # --- Cuadro 3: Colaboradores externos ---
                elif "colaborador externo" in header and "institución" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 3:
                            continue
                        nombre = cells[0]
                        if not nombre or nombre.startswith("[Inserte"):
                            continue
                        # Dividir "Nombre Apellido1 Apellido2"
                        partes = nombre.split(maxsplit=1)
                        nombre_pila = partes[0] if partes else nombre
                        apellidos = partes[1] if len(partes) > 1 else ""
                        apellido1 = ""
                        apellido2 = ""
                        if apellidos:
                            ap_tokens = apellidos.split()
                            if len(ap_tokens) >= 2:
                                apellido1 = ap_tokens[0]
                                apellido2 = " ".join(ap_tokens[1:])
                            else:
                                apellido1 = ap_tokens[0]
                        datos["colaboradores_externos"].append({
                            "nombre_completo": nombre,
                            "nombre": nombre_pila,
                            "apellido1": apellido1,
                            "apellido2": apellido2,
                            "orcid": cells[1] if len(cells) > 1 else "",
                            "institucion": cells[2] if len(cells) > 2 else "",
                        })

                # --- Cuadro 4: Presupuesto por año ---
                elif "año" in header and "operativo" in header and "duradero" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 4:
                            continue
                        anio_str = cells[0]
                        # Solo filas con año numérico (ignorar "Total")
                        if anio_str.isdigit():
                            datos["presupuesto_anual"].append({
                                "ano": int(anio_str),
                                "operativo": _limpiar_monto(cells[1]),
                                "duradero": _limpiar_monto(cells[2]),
                                "total": _limpiar_monto(cells[3]),
                            })
                        elif anio_str.lower() == "total":
                            datos["monto_total_proyecto"] = _limpiar_monto(cells[3])

                # --- Cuadro 5: Financiamiento externo ---
                elif "desglose" in header and "año 1" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 5:
                            continue
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

                # --- Cuadro 6: rango de horas (productos básica) ---
                elif "total de horas" in header and "productos mínimos" in header \
                        and "selección del compromiso" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 3 and re.search(_MARCADOS, cells[-1]):
                            datos["compromisos"]["rango_basica"] = cells[0]
                            # Extraer horas numéricas del texto del rango
                            m_h = re.search(r"(\d+)\s*a\s*(\d+)", cells[0])
                            if m_h:
                                datos["compromisos"]["horas_semanales_basica"] = int(m_h.group(2))
                            break

                # --- Cuadro 7: selección de productos académicos (básica) ---
                elif "opción de producto" in header \
                        and "objetivo específico asociado" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 3:
                            continue
                        marca = cells[0]
                        opcion_txt = cells[2] if len(cells) > 2 else ""
                        objetivo_txt = cells[3] if len(cells) > 3 else ""
                        if not re.search(_MARCADOS, marca):
                            continue
                        m_cant = re.search(r"\((\d+)\)", opcion_txt)
                        cantidad = int(m_cant.group(1)) if m_cant else 1
                        datos["compromisos"]["productos_basica"].append({
                            "opcion": opcion_txt[:200],
                            "cantidad": cantidad,
                            "objetivo": objetivo_txt,
                        })

                # --- Cuadro 8: rango de horas (productos desarrollo tecnológico) ---
                elif "total de horas" in header and "mínimos de combinaciones" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) >= 3 and re.search(_MARCADOS, cells[-1]):
                            datos["compromisos"]["rango_desarrollo"] = cells[0]
                            m_h = re.search(r"(\d+)\s*a\s*(\d+)", cells[0])
                            if m_h:
                                datos["compromisos"]["horas_semanales_desarrollo"] = int(m_h.group(2))
                            break

                # --- Cuadro 9: activos de propiedad industrial ---
                elif "tipo de activo" in header and "consecutivo del dictamen" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 3:
                            continue
                        marca = cells[0]
                        tipo_txt = cells[2] if len(cells) > 2 else ""
                        consecutivo = cells[3] if len(cells) > 3 else ""
                        if not re.search(_MARCADOS, marca):
                            continue
                        # Extraer nombre corto del activo ("Activo 3: Desarrollo de Software" -> "Desarrollo de Software")
                        m_act = re.search(r"Activo\s+\d+:\s*(.+?)(?:\s*\(|$)", tipo_txt)
                        nombre_activo = m_act.group(1).strip() if m_act else tipo_txt[:80]
                        datos["compromisos"]["activos_propiedad_industrial"].append({
                            "tipo_activo": nombre_activo,
                            "consecutivo": consecutivo,
                        })

                # --- Cuadro 10: productos académicos (desarrollo tecnológico) ---
                elif "tipo de producto" in header \
                        and "objetivo específico asociado" in header:
                    for row in table.rows[1:]:
                        cells = [c.text.strip() for c in row.cells]
                        if len(cells) < 3:
                            continue
                        marca = cells[0]
                        opcion_txt = cells[2] if len(cells) > 2 else ""
                        objetivo_txt = cells[3] if len(cells) > 3 else ""
                        if not re.search(_MARCADOS, marca):
                            continue
                        m_cant = re.search(r"\((\d+)\)", opcion_txt)
                        cantidad = int(m_cant.group(1)) if m_cant else 1
                        datos["compromisos"]["productos_desarrollo"].append({
                            "opcion": opcion_txt[:200],
                            "cantidad": cantidad,
                            "objetivo": objetivo_txt,
                        })

            except Exception:
                continue

        # Productos adicionales (texto libre tras "Otros resultados y activos")
        m_adic = re.search(
            r"Otros resultados y activos.*?(?:Complementarios)?\s*(.*?)(?=15\.2\.|Recordatorio Técnico)",
            texto_completo, re.IGNORECASE | re.DOTALL,
        )
        if m_adic:
            bloq = m_adic.group(1)
            for m_p in re.finditer(
                r"Producto adicional\s*\d+:?\s*(.*?)(?=Producto adicional\s*\d+|Recordatorio|15\.2\.|$)",
                bloq, re.IGNORECASE | re.DOTALL,
            ):
                texto_p = m_p.group(1).strip()
                if texto_p:
                    datos["compromisos"]["productos_adicionales"].append(texto_p)

        # =====================================================================
        # 5. RESGUARDO  (sección 16, acotada a 17)
        # =====================================================================
        datos["resguardo"]["resguardo_compromiso"] = _checkbox_marcado_en_bloque(r"16\.\s*Resguardo.*?a\.\s*Declaro conocer",
            r"b\.\s*En caso de desarrollar software",
            r"Sí",
        )
        datos["resguardo"]["resguardo_software"] = _checkbox_marcado_en_bloque(r"b\.\s*En caso de desarrollar software",
            r"17\.\s*Estrategia",
            r"Sí",
        )

        # =====================================================================
        # 6. DIVULGACIÓN  (sección 17, subsecciones a-d)
        # =====================================================================
        datos["divulgacion"]["cientifica"] = _extraer_seccion(
            r"a\.\s*Divulgación científica.*?:", r"b\.\s*Canales Institucionales"
        )
        datos["divulgacion"]["canales_institucionales"] = _extraer_seccion(
            r"b\.\s*Canales Institucionales.*?:", r"c\.\s*Eventos de Socialización"
        )
        datos["divulgacion"]["socializacion"] = _extraer_seccion(
            r"c\.\s*Eventos de Socialización.*?:", r"d\.\s*Medios Masivos"
        )
        datos["divulgacion"]["medios_masivos"] = _extraer_seccion(
            r"d\.\s*Medios Masivos.*?:", r"18\.\s*Aspectos Éticos"
        )

        # =====================================================================
        # 7. ASPECTOS ÉTICOS  (sección 18)
        # =====================================================================
        # a. Seres humanos — acotado hasta 'b. ¿Involucra... biodiversidad'
        datos["aspectos_eticos"]["seres_humanos"] = _checkbox_marcado_en_bloque(r"a\.\s*¿Involucra.*?seres humanos",
            r"b\.\s*¿Involucra.*?biodiversidad",
            r"Sí",
        )
        datos["aspectos_eticos"]["biodiversidad"] = _checkbox_marcado_en_bloque(r"b\.\s*¿Involucra.*?biodiversidad",
            r"c\.\s*¿Involucra.*?animales",
            r"Sí",
        )
        datos["aspectos_eticos"]["animales"] = _checkbox_marcado_en_bloque(r"c\.\s*¿Involucra.*?animales",
            r"d\.\s*¿Involucra.*?indígenas",
            r"Sí",
        )
        datos["aspectos_eticos"]["comunidades_indigenas"] = _checkbox_marcado_en_bloque(r"d\.\s*¿Involucra.*?indígenas",
            r"18\.1\.\s*Declaración de exención",
            r"Sí",
        )

        # Justificación de exención
        datos["aspectos_eticos"]["justificacion_exencion"] = _extraer_seccion(
            r"18\.1\.\s*Declaración de exención.*?razones:",
            r"18\.2\.\s*Documentación",
        )

        # Ente regulatorio — primer checkbox marcado en 18.2.
        m_ente = re.search(
            r"18\.2\..*?aval:(.*?)(?:La fase experimental|$)",
            texto_completo, re.IGNORECASE | re.DOTALL,
        )
        if m_ente:
            bloque_ente = m_ente.group(1)
            if re.search(rf"{_MARCADOS}\s*Comité Ético Científico", bloque_ente):
                datos["aspectos_eticos"]["ente_regulatorio"] = "CEC"
            elif re.search(rf"{_MARCADOS}\s*CONAGEBIO", bloque_ente):
                datos["aspectos_eticos"]["ente_regulatorio"] = "CONAGEBIO"
            elif re.search(rf"{_MARCADOS}\s*CICUA", bloque_ente):
                datos["aspectos_eticos"]["ente_regulatorio"] = "CICUA/COBAB"
            elif re.search(rf"{_MARCADOS}\s*Otro comité", bloque_ente):
                datos["aspectos_eticos"]["ente_regulatorio"] = "Otro"

        # =====================================================================
        # 8. HOJA DE RUTA  (sección 19)
        # =====================================================================
        datos["hoja_ruta"] = _extraer_seccion(r"19\.\s*Hoja de ruta", r"20\.\s*Referencias")

        # =====================================================================
        # 9. REFERENCIAS  (sección 20)
        # =====================================================================
        texto_refs = _extraer_seccion(r"20\.\s*Referencias", r"21\.\s*Declaración jurada")
        if texto_refs:
            # Cada referencia está en una línea que comienza con [N]
            for ln in texto_refs.split("\n"):
                ln = ln.strip()
                if re.match(r"^\[\d+\]", ln):
                    ref = _parsear_referencia(ln)
                    if ref:
                        datos["referencias"].append(ref)

        # =====================================================================
        # 10. FIRMA  (sección 21 — última tabla)
        # =====================================================================
        for table in doc.tables:
            try:
                for row in table.rows:
                    cells = [c.text.strip() for c in row.cells]
                    if len(cells) < 2:
                        continue
                    label, value = cells[0], cells[1]
                    if "Nombre completo" in label:
                        datos["firma"]["nombre"] = value
                    elif "Número de cédula" in label or "Numero de cedula" in label:
                        datos["firma"]["cedula"] = value
                    elif "Firma digital" in label:
                        datos["firma"]["firmado_digital"] = bool(value) and "Sí" in value[:20] or "FIRMA" in value.upper()
                        # Extraer fecha declarada si está presente
                        m_f = re.search(
                            r"Fecha declarada:\s*([\d/: ]+)",
                            value,
                        )
                        if m_f:
                            datos["firma"]["fecha_firma"] = m_f.group(1).strip()
            except Exception:
                continue

        return datos

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise Exception(f"Error al parsear el documento Word: {str(e)}")