"""
form06_parser.py
================
Parser para el Form-06: "Plantilla Presupuesto Convocatoria Fondos VIE" (.xlsx).

Lee el archivo Excel (con hojas por año: 2027, 2028, 2029) y devuelve un dict
estructurado con todas las partidas presupuestarias que tienen monto > 0.

Estructura esperada por el router archivos.py (_persistir_datos_form06):

    datos = {
        "partidas": [
            {
                "og": "1-04-99-01",                       # código de Objeto de Gasto
                "categoria": "Otros servicios de gestión y apoyo",   # Detalle
                "detalle": "1-04-99-01 | Otros servicios de gestión y apoyo",
                "monto": 2000000.00,
                "anio": 2027,
                "justificacion": "contratación de personas sordas e intérpretes...",
                "es_duradero": False,                     # True si cae en sección de Equipo
            },
            ...
        ],
        "gran_total": 5000000.00,            # suma de los "Monto Total" por año
        "totales_por_anio": {2027: 5000000, 2028: 5000000, 2029: 5000000},
        "notas": [                           # texto de la hoja "Aspectos importantes"
            "Nota 1: Se debe formular...",
            ...
        ],
    }
"""
import re
from io import BytesIO
from typing import Dict, Any, List, Optional

import openpyxl


# ============================================================================
# Constantes
# ============================================================================
# Columnas del Form-06 (1-indexed para openpyxl)
COL_OG = 1          # A — código de Objeto de Gasto (ej. "1-04-99-01")
COL_DETALLE = 2     # B — nombre del rubro (ej. "Otros servicios de gestión y apoyo")
COL_TOTAL = 3       # C — monto total
COL_JUSTIFICACION = 4  # D — justificación del gasto

# Filas donde empieza cada sección dentro de cada hoja anual
FILA_HEADER_OG = 7        # Fila con "OG | Detalle | Total | Justificación"
FILA_INICIO_DATOS = 8     # Primera fila con datos de partidas
FILA_FIN_DATOS = 77       # Última fila con códigos OG (la fila 78 es "Monto Total")
FILA_MONTO_TOTAL = 78     # Fila con el gran total anual

# Secciones dentro de cada hoja (para clasificar el rubro)
SECCIONES_DURADERAS = {
    # Códigos que comienzan con "5-" son Equipo (bienes duraderos)
    "5-": "Equipo",
}
SECCIONES_SERVICIOS = {"1-": "Servicios"}
SECCIONES_MATERIALES = {"2-": "Materiales y suministros"}
SECCIONES_BECAS = {"6-": "Becas"}


def _safe_str(val) -> str:
    """Convierte un valor de celda a string limpio."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("none", "nan", "null"):
        return ""
    return s


def _limpiar_monto(val) -> float:
    """
    Convierte un valor de celda a float.
    - Si es numérico: lo devuelve directo.
    - Si es string: limpia símbolos ₡, comas, espacios y puntos (formato CR).

    Ejemplos:
        2000000.0       -> 2000000.0
        "₡2,000,000.00" -> 2000000.0
        "₡ 2.000.000,00" -> 2000000.0  (formato europeo)
        "*"             -> 0.0
        ""              -> 0.0
    """
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s == "*":
        return 0.0
    # Quitar símbolos de colón y espacios
    s = re.sub(r"[₡\s]", "", s)
    if not s:
        return 0.0
    # Si tiene , como decimal y . como miles (formato CR/LatAm):
    # "2.000.000,00" -> "2000000.00"
    if "," in s and "." in s:
        # Asumir que la última coma es decimal
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        # Solo coma: si tiene 2 dígitos después de la última coma, es decimal
        partes = s.split(",")
        if len(partes[-1]) == 2:
            s = "".join(partes[:-1]) + "." + partes[-1]
        else:
            s = s.replace(",", "")
    elif "." in s:
        # Solo puntos: como en form04_parser, distinguir miles de decimal
        partes = s.split(".")
        if len(partes) >= 2 and len(partes[-1]) == 2:
            s = "".join(partes[:-1]) + "." + partes[-1]
        elif len(partes[-1]) == 3 and all(len(p) == 3 for p in partes):
            s = "".join(partes)
        elif len(partes[-1]) == 3:
            s = "".join(partes)
        # else: dejarlo tal cual
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _es_fila_total(texto: str) -> bool:
    """Detecta si una fila es de totales (no debe tratarse como partida)."""
    if not texto:
        return False
    t = texto.lower().strip()
    return (
        t.startswith("total ")
        or t.startswith("total de ")
        or t.startswith("total materiales")
        or t.startswith("total servicios")
        or t.startswith("total equipo")
        or t.startswith("total becas")
        or t == "monto total"
    )


def _determinar_seccion(og_code: str) -> str:
    """Determina la sección/categoría macro a partir del código OG."""
    if not og_code:
        return ""
    if og_code.startswith("5-"):
        return "Equipo"
    if og_code.startswith("6-"):
        return "Becas"
    if og_code.startswith("2-"):
        return "Materiales y suministros"
    if og_code.startswith("1-"):
        return "Servicios"
    return ""


def _es_duradero(og_code: str, seccion: str) -> bool:
    """Determina si una partida es un bien duradero (Equipo)."""
    return og_code.startswith("5-") or seccion == "Equipo"


# ============================================================================
# Parser principal
# ============================================================================

def parsear_form06_xlsx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser para el Form-06 (Plantilla Presupuesto).

    Recorre las hojas anuales (2027, 2028, 2029, ...) y extrae todas las
    partidas con monto > 0.  Devuelve un dict listo para que el router lo
    persista en PresupuestoPropuesta.
    """
    try:
        wb = openpyxl.load_workbook(BytesIO(archivo_bytes), data_only=True)
    except Exception as e:
        raise Exception(f"Error al abrir el archivo Excel: {str(e)}")

    datos: Dict[str, Any] = {
        "partidas": [],
        "gran_total": 0.0,
        "totales_por_anio": {},
        "notas": [],
        # NUEVO: lista única de rubros (OG + nombre) encontrados en el Excel.
        # El router la usa para insertar en RubrosPropuesta los rubros que falten.
        "rubros_encontrados": [],
        # NUEVO: dict {og_code: {nombre, seccion, es_duradero}} para lookup rápido.
        "rubros_por_og": {},
    }

    # ------------------------------------------------------------------
    # 1. HOJA "ASPECTOS IMPORTANTES" — extraer notas informativas
    # ------------------------------------------------------------------
    for sheet_name in wb.sheetnames:
        if "aspecto" in sheet_name.lower() or "nota" in sheet_name.lower():
            ws = wb[sheet_name]
            for r in range(1, ws.max_row + 1):
                val_a = _safe_str(ws.cell(row=r, column=1).value)
                val_b = _safe_str(ws.cell(row=r, column=2).value)
                if val_a and val_b and "nota" in val_a.lower():
                    datos["notas"].append(f"{val_a} {val_b}")
            break

    # ------------------------------------------------------------------
    # 2. HOJAS ANUALES — extraer partidas con monto > 0
    # ------------------------------------------------------------------
    hojas_anuales = []
    for sheet_name in wb.sheetnames:
        # Aceptar "2027", "2028", "2029", "Año 2027", etc.
        if re.search(r"\b(20\d{2})\b", sheet_name):
            hojas_anuales.append(sheet_name)

    # Si no hay hojas anuales explícitas, intentar todas excepto "Aspectos importantes"
    if not hojas_anuales:
        hojas_anuales = [s for s in wb.sheetnames
                         if "aspecto" not in s.lower() and "nota" not in s.lower()]

    for sheet_name in hojas_anuales:
        # Extraer el año del nombre de la hoja (primer número 20XX encontrado)
        m_anio = re.search(r"\b(20\d{2})\b", sheet_name)
        if not m_anio:
            continue
        anio = int(m_anio.group(1))

        ws = wb[sheet_name]
        total_anio = 0.0

        # Localizar la fila con "OG | Detalle | Total | Justificación"
        fila_header = None
        for r in range(1, min(ws.max_row + 1, 20)):
            val_a = _safe_str(ws.cell(row=r, column=COL_OG).value)
            val_b = _safe_str(ws.cell(row=r, column=COL_DETALLE).value)
            if val_a.lower() == "og" and "detalle" in val_b.lower():
                fila_header = r
                break

        if fila_header is None:
            # Fallback: usar el estándar del Form-06
            fila_header = FILA_HEADER_OG

        inicio = fila_header + 1
        fin = min(ws.max_row + 1, FILA_MONTO_TOTAL + 5)  # algo de margen

        for r in range(inicio, fin):
            val_og = _safe_str(ws.cell(row=r, column=COL_OG).value)
            val_detalle = _safe_str(ws.cell(row=r, column=COL_DETALLE).value)
            val_total_celda = ws.cell(row=r, column=COL_TOTAL).value
            val_just = _safe_str(ws.cell(row=r, column=COL_JUSTIFICACION).value)

            # Saltar filas vacías
            if not val_og and not val_detalle:
                continue

            # Saltar filas de totales ("Total de servicios", "Monto Total", etc.)
            if _es_fila_total(val_og) or _es_fila_total(val_detalle):
                # "Monto Total" suele estar en col A con el monto en col C
                if val_og.lower().strip() == "monto total":
                    monto_total_anio = _limpiar_monto(val_total_celda)
                    datos["totales_por_anio"][anio] = monto_total_anio
                    total_anio = monto_total_anio
                continue

            # Solo procesar filas con código OG válido (formato "X-XX-XX-XX")
            if not re.match(r"^\d+-\d{2}-\d{2}-\d{2}$", val_og):
                continue

            monto = _limpiar_monto(val_total_celda)
            if monto <= 0:
                continue

            seccion = _determinar_seccion(val_og)
            es_dura = _es_duradero(val_og, seccion)
            datos["partidas"].append({
                "og": val_og,
                "categoria": val_detalle,
                "detalle": f"{val_og} | {val_detalle}",
                "monto": monto,
                "anio": anio,
                "justificacion": val_just,
                "seccion": seccion,
                "es_duradero": es_dura,
            })

            # NUEVO: registrar el rubro único encontrado (para que el router
            # lo inserte en RubrosPropuesta si no existe).
            if val_og not in datos["rubros_por_og"]:
                datos["rubros_por_og"][val_og] = {
                    "og": val_og,
                    "nombre": val_detalle,        # nombre visible (ej. "Otros servicios de gestión y apoyo")
                    "seccion": seccion,            # macro-categoría (Servicios / Materiales / Equipo / Becas)
                    "es_duradero": es_dura,
                }
                datos["rubros_encontrados"].append(datos["rubros_por_og"][val_og])

        # Si no se encontró la fila "Monto Total", sumar las partidas del año
        if anio not in datos["totales_por_anio"]:
            suma = sum(p["monto"] for p in datos["partidas"] if p["anio"] == anio)
            datos["totales_por_anio"][anio] = suma
            total_anio = suma

    # ------------------------------------------------------------------
    # 3. GRAN TOTAL — sumar los totales de cada año
    # ------------------------------------------------------------------
    datos["gran_total"] = sum(datos["totales_por_anio"].values())

    return datos