"""
form06_parser.py
================
Parser del Form-06 (Presupuesto Operativo) en formato .xlsx.
Extrae: partidas por año con código OG, categoría, detalle, monto y justificación.
"""
import openpyxl
import re
from io import BytesIO
from typing import Optional


def _normalizar_texto(valor) -> str:
    if valor is None:
        return ""
    return str(valor).strip()


def _parsear_monto(valor) -> float:
    if valor is None or valor == "":
        return 0.0
    try:
        return float(str(valor).replace(",", "").replace(" ", ""))
    except (ValueError, TypeError):
        return 0.0


def _detectar_anio(nombre_hoja: str) -> Optional[int]:
    """Extrae el año de 'Año 1 (2027)' -> 2027"""
    m = re.search(r"\((\d{4})\)", nombre_hoja)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d{4})", nombre_hoja)
    if m:
        return int(m.group(1))
    return None


def parsear_form06_xlsx(contenido: bytes) -> dict:
    """
    Devuelve:
      - codigo_propuesta
      - investigador
      - partidas: lista de {anio, codigo_og, categoria, detalle, monto, justificacion}
      - resumen: lista de {anio, servicios, materiales, becas, equipo, total}
      - gran_total
    """
    wb = openpyxl.load_workbook(BytesIO(contenido), data_only=True)

    resultado = {
        "codigo_propuesta": None,
        "investigador": None,
        "partidas": [],
        "resumen": [],
        "gran_total": 0.0,
    }

    # ------------------------------------------------------------------
    # Hojas de año: "Año 1 (2027)", "Año 2 (2028)", "Año 3 (2029)"
    # ------------------------------------------------------------------
    for nombre_hoja in wb.sheetnames:
        if not nombre_hoja.lower().startswith("año"):
            continue
        anio = _detectar_anio(nombre_hoja)
        if not anio:
            continue

        ws = wb[nombre_hoja]
        filas = list(ws.iter_rows(values_only=True))

        # Capturar código e investigador desde las primeras filas
        for r in filas[:6]:
            if not r:
                continue
            texto = " ".join(_normalizar_texto(c) for c in r if c)
            if "DEMO" in texto or "CIE" in texto or "FVIE" in texto:
                # Ej: "DEMO-CIE-PATOS-003 — DI-Ayuda a los patos 3"
                m = re.match(r"([A-Z0-9\-]+)", texto)
                if m and not resultado["codigo_propuesta"]:
                    resultado["codigo_propuesta"] = m.group(1)
            if "Investigador" in texto:
                m = re.search(r"Investigador\(a\):\s*([^|]+)", texto)
                if m and not resultado["investigador"]:
                    resultado["investigador"] = m.group(1).strip()

        # Localizar fila de encabezados: Código OG | Categoría | Detalle | Monto | Justificación
        idx_header = None
        for i, r in enumerate(filas):
            if r and len(r) >= 4 and "Código" in _normalizar_texto(r[0]) and "OG" in _normalizar_texto(r[0]):
                idx_header = i
                break

        if idx_header is None:
            continue

        # Leer partidas hasta encontrar "Subtotal"
        for r in filas[idx_header + 1:]:
            if not r:
                continue
            detalle = _normalizar_texto(r[2]) if len(r) > 2 else ""
            if "Subtotal" in detalle or "Total" in detalle:
                break
            codigo_og = _normalizar_texto(r[0]) if len(r) > 0 else ""
            categoria = _normalizar_texto(r[1]) if len(r) > 1 else ""
            monto = _parsear_monto(r[3]) if len(r) > 3 else 0.0
            justificacion = _normalizar_texto(r[4]) if len(r) > 4 else ""

            if monto <= 0 and not detalle:
                continue

            resultado["partidas"].append({
                "anio": anio,
                "codigo_og": codigo_og,
                "categoria": categoria,
                "detalle": detalle,
                "monto": monto,
                "justificacion": justificacion,
            })

    # ------------------------------------------------------------------
    # Hoja "Resumen Trienal"
    # ------------------------------------------------------------------
    if "Resumen Trienal" in wb.sheetnames:
        ws = wb["Resumen Trienal"]
        filas = list(ws.iter_rows(values_only=True))
        for r in filas:
            if not r:
                continue
            texto = _normalizar_texto(r[0])
            if re.match(r"^\d{4}$", texto):
                anio = int(texto)
                resultado["resumen"].append({
                    "anio": anio,
                    "servicios": _parsear_monto(r[1]) if len(r) > 1 else 0.0,
                    "materiales": _parsear_monto(r[2]) if len(r) > 2 else 0.0,
                    "becas": _parsear_monto(r[3]) if len(r) > 3 else 0.0,
                    "equipo": _parsear_monto(r[4]) if len(r) > 4 else 0.0,
                    "total": _parsear_monto(r[5]) if len(r) > 5 else 0.0,
                })
            elif "GRAN TOTAL" in texto.upper():
                # El gran total suele estar en la última columna numérica
                for c in reversed(r):
                    if c is not None and _parsear_monto(c) > 0:
                        resultado["gran_total"] = _parsear_monto(c)
                        break

    return resultado