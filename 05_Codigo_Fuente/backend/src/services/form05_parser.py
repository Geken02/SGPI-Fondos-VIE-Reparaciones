"""
form05_parser.py
================
Parser para el Form-05: "Plan de Acción y Gestión del Riesgo" (archivo .xlsx).

Lee el archivo Excel y devuelve un dict estructurado con:
  - actividades:         lista de dicts (una por fila de actividad del Excel)
  - riesgos:             lista de dicts, cada uno con `actividad_index`
  - medidas_mitigacion:  lista de dicts, cada uno con `riesgo_index`

Estructura esperada por el router archivos.py (_persistir_datos_form05):

    datos = {
        "actividades": [
            {
                "objetivo": "OE1",
                "descripcion": "Adaptar PIELS para manejo de Campos Semánticos",
                "resultado_esperado": "1. Base de datos adaptada ...",
                "participantes": "MChR",        # iniciales
                "mes_inicio": 1,
                "duracion_meses": 12.0,
                "anio_ejecucion": 1,            # 1, 2 o 3
            },
            ...
        ],
        "riesgos": [
            {"actividad_index": 0, "descripcion": "Problemas en pago de asistentes"},
            ...
        ],
        "medidas_mitigacion": [
            {"riesgo_index": 0, "descripcion": "Ubicar presupuestos adicionales FDU",
             "responsable": "MChR", "es_permiso_etico": False},
            ...
        ],
        # Metadatos adicionales (informativos)
        "nombre_propuesta": "...",
        "tipo_iniciativa": "...",
        "equipo": [{"nombre": "...", "iniciales": "..."}, ...],
    }
"""
import re
from io import BytesIO
from typing import Dict, Any, List, Optional

import openpyxl


# ============================================================================
# Constantes de columnas (1-indexed para openpyxl)
# ============================================================================
COL_OBJETIVO = 2          # B
COL_ACTIVIDAD = 3         # C
COL_RESULTADO = 4         # D
COL_PARTICIPANTES = 5     # E
COL_RESPONSABILIDAD = 6   # F
COL_RIESGO = 7            # G
COL_MEDIDA = 8            # H
COL_RESP_MEDIDA = 9       # I
COL_MES_INICIO = 10       # J
COL_DURACION = 11         # K
# AÑO 1: cols 12-23 (meses 1-12)
# AÑO 2: cols 24-35 (meses 13-24)
# AÑO 3: cols 36-47 (meses 25-36)


def _safe_str(val) -> str:
    """Convierte un valor de celda a string limpio. None/empty -> ''."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("none", "nan", "null"):
        return ""
    return s


def _safe_float(val, default: float = 0.0) -> float:
    """Convierte a float. Strings como '12.00', '12,5', números directos."""
    if val is None:
        return default
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", ".")
    try:
        return float(s) if s else default
    except ValueError:
        return default


def _safe_int(val, default: int = 0) -> int:
    """Convierte a int. Maneja floats como 12.0 -> 12."""
    f = _safe_float(val, default)
    try:
        return int(f)
    except (ValueError, TypeError):
        return default


def _determinar_anio_ejecucion(mes_inicio: int) -> int:
    """Convierte mes_inicio (1-36) a año de ejecución (1, 2 o 3)."""
    if mes_inicio <= 0:
        return 1
    if mes_inicio <= 12:
        return 1
    if mes_inicio <= 24:
        return 2
    return 3


def _es_fila_header(valor_objetivo: str, valor_actividad: str) -> bool:
    """Detecta filas que son encabezados o separadores y no deben procesarse."""
    if not valor_objetivo and not valor_actividad:
        return True
    texto = (valor_objetivo + " " + valor_actividad).lower()
    if "objetivo" in texto and "actividades" in texto:
        return True
    if "[inserte las filas" in texto:
        return True
    if "notas:" in texto:
        return True
    if "aclaración" in texto or "aclaracion" in texto:
        return True
    return False


# ============================================================================
# Parser principal
# ============================================================================

def parsear_form05_xlsx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser para el Form-05 (Plan de Acción y Gestión de Riesgos).

    Lee el archivo .xlsx desde bytes y devuelve un dict estructurado.
    Nunca lanza por datos faltantes — los campos vacíos se devuelven como
    '' o 0 según corresponda.
    """
    try:
        wb = openpyxl.load_workbook(BytesIO(archivo_bytes), data_only=True)
    except Exception as e:
        raise Exception(f"Error al abrir el archivo Excel: {str(e)}")

    # El Form-05 tiene una hoja principal con el plan; puede llamarse
    # "Plan de Acción-Riesgos" o similar.
    ws = None
    for sheet_name in wb.sheetnames:
        if "plan" in sheet_name.lower() and "acci" in sheet_name.lower():
            ws = wb[sheet_name]
            break
    if ws is None:
        # Fallback: usar la primera hoja
        ws = wb[wb.sheetnames[0]]

    datos: Dict[str, Any] = {
        "nombre_propuesta": "",
        "tipo_iniciativa": "",
        "duracion": "",
        "equipo": [],            # [{nombre, iniciales}]
        "actividades": [],
        "riesgos": [],
        "medidas_mitigacion": [],
    }

    # ------------------------------------------------------------------
    # 1. METADATOS DEL ENCABEZADO (filas 1-12)
    # ------------------------------------------------------------------
    for r in range(1, min(15, ws.max_row + 1)):
        # Nombre de propuesta: celda con "Nombre de propuesta:" en col B
        val_b = _safe_str(ws.cell(row=r, column=2).value)
        val_d = _safe_str(ws.cell(row=r, column=4).value)
        val_g = _safe_str(ws.cell(row=r, column=7).value)
        val_h = _safe_str(ws.cell(row=r, column=8).value)

        if "nombre de propuesta" in val_b.lower():
            datos["nombre_propuesta"] = val_d
        elif "tipo de iniciativa" in val_b.lower():
            datos["tipo_iniciativa"] = val_d
        elif "duración" in val_b.lower() or "duracion" in val_b.lower():
            datos["duracion"] = val_d

        # Equipo: filas donde col G tiene un nombre y col H tiene iniciales
        if val_g and val_h and len(val_h) <= 6 and val_g not in (
            "Personas participantes", "Equipo de investigación:"
        ):
            # Evitar duplicados
            if not any(e["iniciales"] == val_h for e in datos["equipo"]):
                datos["equipo"].append({"nombre": val_g, "iniciales": val_h})

    # ------------------------------------------------------------------
    # 2. FILAS DE ACTIVIDADES (a partir de fila 16-17 hasta encontrar notas)
    # ------------------------------------------------------------------
    # Encontrar la fila de encabezado (OBJETIVO | ACTIVIDADES | ...)
    fila_header = None
    for r in range(1, min(ws.max_row + 1, 100)):
        val_b = _safe_str(ws.cell(row=r, column=COL_OBJETIVO).value)
        val_c = _safe_str(ws.cell(row=r, column=COL_ACTIVIDAD).value)
        if "objetivo" in val_b.lower() and "actividades" in val_c.lower():
            fila_header = r
            break

    if fila_header is None:
        # Si no encuentra el encabezado, asumir fila 16 como en el Form-05 estándar
        fila_header = 16

    inicio_datos = fila_header + 2  # Saltar encabezado + fila de meses (1-36)

    # Variables de estado para continuar OE/actividad entre filas
    oe_actual = ""
    actividad_actual_desc = ""
    actividad_actual_resultado = ""
    actividad_actual_index: Optional[int] = None  # índice en datos["actividades"]

    for r in range(inicio_datos, ws.max_row + 1):
        val_objetivo = _safe_str(ws.cell(row=r, column=COL_OBJETIVO).value)
        val_actividad = _safe_str(ws.cell(row=r, column=COL_ACTIVIDAD).value)
        val_resultado = _safe_str(ws.cell(row=r, column=COL_RESULTADO).value)
        val_participantes = _safe_str(ws.cell(row=r, column=COL_PARTICIPANTES).value)
        val_responsabilidad = _safe_str(ws.cell(row=r, column=COL_RESPONSABILIDAD).value)
        val_riesgo = _safe_str(ws.cell(row=r, column=COL_RIESGO).value)
        val_medida = _safe_str(ws.cell(row=r, column=COL_MEDIDA).value)
        val_resp_medida = _safe_str(ws.cell(row=r, column=COL_RESP_MEDIDA).value)
        val_mes_inicio = ws.cell(row=r, column=COL_MES_INICIO).value
        val_duracion = ws.cell(row=r, column=COL_DURACION).value

        # Saltar filas vacías o de notas/separadores
        if _es_fila_header(val_objetivo, val_actividad):
            continue
        # Si TODO está vacío, saltar
        if not any([val_objetivo, val_actividad, val_resultado,
                    val_participantes, val_riesgo, val_medida,
                    val_mes_inicio, val_duracion]):
            continue

        # Detectar cambio de OE (cuando col B tiene un valor nuevo)
        if val_objetivo:
            # Si parece código OE (OE1, OE2, etc.) usarlo; si no, dejarlo pasar
            if re.match(r"(?i)^oe\s*\d+", val_objetivo) or \
               re.match(r"(?i)^objetivo\s*\d+", val_objetivo):
                oe_actual = val_objetivo.upper().replace(" ", "")
            else:
                oe_actual = val_objetivo

        # Detectar nueva actividad (col C tiene contenido)
        es_nueva_actividad = bool(val_actividad) and val_actividad != actividad_actual_desc
        if es_nueva_actividad:
            actividad_actual_desc = val_actividad
            actividad_actual_resultado = val_resultado
            mes_inicio = _safe_int(val_mes_inicio, default=1)
            duracion = _safe_float(val_duracion, default=1.0)
            anio_ejec = _determinar_anio_ejecucion(mes_inicio)

            nueva_actividad = {
                "objetivo": oe_actual,
                "descripcion": val_actividad,
                "resultado_esperado": val_resultado,
                "participantes": val_participantes,
                "responsabilidad": val_responsabilidad,
                "mes_inicio": mes_inicio,
                "duracion_meses": duracion,
                "anio_ejecucion": anio_ejec,
            }
            datos["actividades"].append(nueva_actividad)
            actividad_actual_index = len(datos["actividades"]) - 1
        else:
            # Continuación de la misma actividad — actualizar participantes si hay
            if val_participantes and actividad_actual_index is not None:
                act = datos["actividades"][actividad_actual_index]
                # Si la actividad actual no tenía participantes, setearlos;
                # si los tenía, concatenar (preservando el primero como principal).
                if not act.get("participantes"):
                    act["participantes"] = val_participantes
                elif val_participantes not in act["participantes"]:
                    act["participantes"] = act["participantes"] + ", " + val_participantes

        # ------------------------------------------------------------------
        # 3. RIESGOS Y MEDIDAS DE MITIGACIÓN
        # ------------------------------------------------------------------
        # Una fila puede tener riesgo y/o medida. Si tiene riesgo, se crea
        # un nuevo riesgo (vinculado a la actividad actual). Si tiene medida,
        # se crea una nueva medida (vinculada al último riesgo de esta actividad
        # si existe, o al último riesgo global si no).
        if val_riesgo and actividad_actual_index is not None:
            nuevo_riesgo = {
                "actividad_index": actividad_actual_index,
                "descripcion": val_riesgo,
                "probabilidad": None,    # No se especifica en el Form-05
                "impacto": None,
            }
            datos["riesgos"].append(nuevo_riesgo)

        # La medida se asocia al ÚLTIMO riesgo creado para la misma actividad
        if val_medida:
            # Buscar el último riesgo cuya actividad_index coincida con la actual
            riesgo_index_asociado = None
            if actividad_actual_index is not None:
                for idx in range(len(datos["riesgos"]) - 1, -1, -1):
                    if datos["riesgos"][idx]["actividad_index"] == actividad_actual_index:
                        riesgo_index_asociado = idx
                        break

            # Si hay medida pero no hay riesgo previo para esta actividad,
            # creamos un riesgo "placeholder" para que la medida tenga a qué vincularse.
            if riesgo_index_asociado is None and actividad_actual_index is not None:
                datos["riesgos"].append({
                    "actividad_index": actividad_actual_index,
                    "descripcion": "(Riesgo implícito — sin descripción explícita en el Form-05)",
                    "probabilidad": None,
                    "impacto": None,
                })
                riesgo_index_asociado = len(datos["riesgos"]) - 1

            if riesgo_index_asociado is not None:
                # Detectar si la medida es sobre permisos éticos
                texto_medida = val_medida.lower()
                es_permiso_etico = any(kw in texto_medida for kw in [
                    "comité ético", "comite etico", "conagebio",
                    "cicua", "cobab", "aval ético", "aval etico",
                    "permiso ético", "permiso etico",
                ])
                datos["medidas_mitigacion"].append({
                    "riesgo_index": riesgo_index_asociado,
                    "descripcion": val_medida,
                    "responsable": val_resp_medida,
                    "es_permiso_etico": es_permiso_etico,
                })

    return datos