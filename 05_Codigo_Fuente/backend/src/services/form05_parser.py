"""
form05_parser.py
================
Parser para el Form-05: "Plan de Acción y Gestión del Riesgo" (archivo .xlsx).

Lee el archivo Excel y devuelve un dict estructurado con:
  - equipo_map:         {iniciales → nombre_completo} construido desde la tabla
                        de equipo del encabezado del Excel.
  - actividades:        lista de dicts (una por fila de actividad)
  - riesgos:            lista de dicts, cada uno con `actividad_index`
  - medidas_mitigacion: lista de dicts, cada uno con `riesgo_index`

Cada actividad y medida devuelve las iniciales de participantes/responsables
estructuradas como lista de dicts:

    {"iniciales": "MChR", "nombre": "Mario Chacón Rivas"}

El router usa esa lista para buscar por nombre en las tablas `Usuarios` y
`ColaboradoresExternos` (query por nombre completo) y obtener el `usuarioId`.
Las iniciales desconocidas (no listadas en la tabla de equipo del Excel,
como "GAS") se reportan en `iniciales_desconocidas` para que el router
pueda advertir al usuario.

Estructura completa devuelta:

    datos = {
        "nombre_propuesta": "...",
        "tipo_iniciativa": "...",
        "duracion": "...",
        "equipo": [{"nombre": "...", "iniciales": "..."}, ...],
        "equipo_map": {"MChR": "Mario Chacón Rivas", "YL": "Yuen C. Law", ...},
        "actividades": [
            {
                "objetivo": "OE1",
                "descripcion": "...",
                "resultado_esperado": "...",
                "participantes": "MChR",               # string crudo (back-compat)
                "participantes_lista": [                # estructurado
                    {"iniciales": "MChR", "nombre": "Mario Chacón Rivas"},
                ],
                "responsabilidad": "Supervisa",
                "responsable_gestion": "MChR",         # string crudo (col I)
                "responsable_gestion_lista": [
                    {"iniciales": "MChR", "nombre": "Mario Chacón Rivas"},
                ],
                "mes_inicio": 1,
                "duracion_meses": 12.0,
                "anio_ejecucion": 1,
            },
            ...
        ],
        "riesgos": [
            {"actividad_index": 0, "descripcion": "..."},
            ...
        ],
        "medidas_mitigacion": [
            {
                "riesgo_index": 0,
                "descripcion": "...",
                "responsable": "MChR",                 # string crudo (back-compat)
                "responsable_lista": [
                    {"iniciales": "MChR", "nombre": "Mario Chacón Rivas"},
                ],
                "es_permiso_etico": False,
            },
            ...
        ],
        "iniciales_desconocidas": ["GAS"],   # iniciales no listadas en equipo
    }
"""
import re
from io import BytesIO
from typing import Dict, Any, List, Optional, Tuple

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
COL_RESP_GESTION = 9      # I  (renombrado: es "RESPONSABLE DE LA GESTIÓN")
COL_MES_INICIO = 10       # J
COL_DURACION = 11         # K

# Backwards-compat alias (algunos routers usan COL_RESP_MEDIDA)
COL_RESP_MEDIDA = COL_RESP_GESTION

# AÑO 1: cols 12-23 (meses 1-12)
# AÑO 2: cols 24-35 (meses 13-24)
# AÑO 3: cols 36-47 (meses 25-36)


# ============================================================================
# Helpers
# ============================================================================

def _safe_str(val) -> str:
    """Convierte un valor de celda a string limpio. None/empty -> ''."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("none", "nan", "null"):
        return ""
    return s


def _safe_float(val, default: float = 0.0) -> float:
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
    """Detecta filas que son encabezados o separadores."""
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
# Regex builder para extraer iniciales conocidas
# ============================================================================

def _compilar_regex_iniciales(equipo_map: Dict[str, str]) -> Optional[re.Pattern]:
    """
    Construye un regex que matchea únicamente las iniciales que aparecen en
    equipo_map.  Las iniciales se ordenan por longitud descendente para evitar
    matches parciales (ej. 'YL' no debería comerse la 'Y' de 'Yuen').

    Devuelve None si equipo_map está vacío.
    """
    if not equipo_map:
        return None
    # Escapar cada inicial y ordenar de la más larga a la más corta
    keys_ordenadas = sorted(equipo_map.keys(), key=len, reverse=True)
    # Cada inicial se ancla con \\b para evitar matches dentro de palabras
    alternancia = "|".join(re.escape(k) for k in keys_ordenadas)
    # Ignorar caso: aunque las iniciales suelen estar en mayúsculas, el Excel
    # a veces las trae en minúsculas o con espacios extras.
    return re.compile(rf"\b({alternancia})\b", re.IGNORECASE)


def _regex_iniciales_desconocidas() -> re.Pattern:
    """
    Regex genérico para detectar tokens que parecen iniciales pero no están
    en equipo_map.  Patrón: 2-6 caracteres alfanuméricos empezando con
    mayúscula, rodeados por límites de palabra o por comas/puntos.

    Ejemplos que matchea: 'GAS', 'PCD', 'A1', 'MChR'
    Ejemplos que NO matchea: 'Web' (palabra común), 'scraping', 'the'
    """
    # Solo matchear si TODO el token es mayúsculas o mayúscula+dígito,
    # y NO contiene vocales minúsculas consecutivas (para evitar palabras).
    return re.compile(
        r"\b([A-Z][A-Z0-9]{1,5})\b"
    )


def _extraer_iniciales(
    texto: str,
    regex_conocidas: Optional[re.Pattern],
    equipo_map: Dict[str, str],
) -> Tuple[List[Dict[str, str]], List[str]]:
    """
    Extrae las iniciales de un texto (celda PARTICIPANTES / RESPONSABLE).

    Devuelve una tupla (conocidas, desconocidas):
      - conocidas:     [{iniciales, nombre}, ...] — matchean equipo_map
      - desconocidas:  ["GAS", ...] — parecen iniciales pero no están en equipo_map
    """
    if not texto:
        return [], []
    texto_norm = texto.strip()

    conocidas: List[Dict[str, str]] = []
    desconocidas: List[str] = []

    # 1. Encontrar todas las iniciales CONOCIDAS en el texto.
    vistos_conocidas = set()
    if regex_conocidas:
        for m in regex_conocidas.finditer(texto_norm):
            ini = m.group(1).upper()
            if ini in equipo_map and ini not in vistos_conocidas:
                conocidas.append({
                    "iniciales": ini,
                    "nombre": equipo_map[ini],
                })
                vistos_conocidas.add(ini)

    # 2. Para detectar DESCONOCIDAS, quitamos las conocidas del texto y
    # aplicamos el regex genérico al resto.  Así evitamos falsos positivos.
    texto_sin_conocidas = texto_norm
    if regex_conocidas:
        texto_sin_conocidas = regex_conocidas.sub(" ", texto_norm)

    regex_desc = _regex_iniciales_desconocidas()
    vistos_desc = set()
    for m in regex_desc.finditer(texto_sin_conocidas):
        ini = m.group(1).upper()
        # Filtrar palabras comunes en español que podrían colarse
        if ini.lower() in {"el", "la", "los", "las", "de", "del", "y", "o", "u",
                           "en", "con", "por", "para", "a", "e", "i", "es",
                           "se", "al", "lo", "le", "su", "sus", "mas", "ya",
                           "no", "si", "ya", "oh", "ah", "eh"}:
            continue
        # Filtrar también iniciales que son solo 1 letra
        if len(ini) < 2:
            continue
        if ini not in equipo_map and ini not in vistos_desc:
            desconocidas.append(ini)
            vistos_desc.add(ini)

    return conocidas, desconocidas


# ============================================================================
# Parser principal
# ============================================================================

def parsear_form05_xlsx(archivo_bytes: bytes) -> Dict[str, Any]:
    """
    Parser para el Form-05 (Plan de Acción y Gestión de Riesgos).
    """
    try:
        wb = openpyxl.load_workbook(BytesIO(archivo_bytes), data_only=True)
    except Exception as e:
        raise Exception(f"Error al abrir el archivo Excel: {str(e)}")

    ws = None
    for sheet_name in wb.sheetnames:
        if "plan" in sheet_name.lower() and "acci" in sheet_name.lower():
            ws = wb[sheet_name]
            break
    if ws is None:
        ws = wb[wb.sheetnames[0]]

    datos: Dict[str, Any] = {
        "nombre_propuesta": "",
        "tipo_iniciativa": "",
        "duracion": "",
        "equipo": [],
        "equipo_map": {},                 # {iniciales: nombre_completo}
        "actividades": [],
        "riesgos": [],
        "medidas_mitigacion": [],
        "iniciales_desconocidas": [],     # todas las no reconocidas, sin repetir
    }

    # ------------------------------------------------------------------
    # 1. METADATOS DEL ENCABEZADO (filas 1-12) + TABLA DE EQUIPO
    # ------------------------------------------------------------------
    for r in range(1, min(15, ws.max_row + 1)):
        val_b = _safe_str(ws.cell(row=r, column=2).value)
        val_d = _safe_str(ws.cell(row=r, column=4).value)
        val_g = _safe_str(ws.cell(row=r, column=7).value)   # nombre completo
        val_h = _safe_str(ws.cell(row=r, column=8).value)   # iniciales

        if "nombre de propuesta" in val_b.lower():
            datos["nombre_propuesta"] = val_d
        elif "tipo de iniciativa" in val_b.lower():
            datos["tipo_iniciativa"] = val_d
        elif "duración" in val_b.lower() or "duracion" in val_b.lower():
            datos["duracion"] = val_d

        # Tabla de equipo: col G = nombre, col H = iniciales
        if val_g and val_h and val_g not in (
            "Personas participantes", "Equipo de investigación:"
        ):
            # Las iniciales se normalizan a UPPER para que el lookup sea
            # case-insensitive en el router (regex ya es IGNORECASE, pero
            # el dict debe estar en un único formato).
            iniciales_norm = val_h.strip().upper()
            if not any(e["iniciales"] == iniciales_norm for e in datos["equipo"]):
                datos["equipo"].append({
                    "nombre": val_g,
                    "iniciales": iniciales_norm,
                })
                datos["equipo_map"][iniciales_norm] = val_g

    # ------------------------------------------------------------------
    # 2. COMPILAR REGEX DE INICIALES CONOCIDAS
    # ------------------------------------------------------------------
    regex_iniciales = _compilar_regex_iniciales(datos["equipo_map"])

    # ------------------------------------------------------------------
    # 3. FILAS DE ACTIVIDADES
    # ------------------------------------------------------------------
    fila_header = None
    for r in range(1, min(ws.max_row + 1, 100)):
        val_b = _safe_str(ws.cell(row=r, column=COL_OBJETIVO).value)
        val_c = _safe_str(ws.cell(row=r, column=COL_ACTIVIDAD).value)
        if "objetivo" in val_b.lower() and "actividades" in val_c.lower():
            fila_header = r
            break

    if fila_header is None:
        fila_header = 16

    inicio_datos = fila_header + 2  # Saltar encabezado + fila de meses (1-36)

    oe_actual = ""
    actividad_actual_desc = ""
    actividad_actual_index: Optional[int] = None
    set_desconocidas_global = set()

    def _actualizar_desconocidas(nuevas: List[str]) -> None:
        for ini in nuevas:
            if ini not in datos["equipo_map"]:
                set_desconocidas_global.add(ini)

    for r in range(inicio_datos, ws.max_row + 1):
        val_objetivo = _safe_str(ws.cell(row=r, column=COL_OBJETIVO).value)
        val_actividad = _safe_str(ws.cell(row=r, column=COL_ACTIVIDAD).value)
        val_resultado = _safe_str(ws.cell(row=r, column=COL_RESULTADO).value)
        val_participantes = _safe_str(ws.cell(row=r, column=COL_PARTICIPANTES).value)
        val_responsabilidad = _safe_str(ws.cell(row=r, column=COL_RESPONSABILIDAD).value)
        val_riesgo = _safe_str(ws.cell(row=r, column=COL_RIESGO).value)
        val_medida = _safe_str(ws.cell(row=r, column=COL_MEDIDA).value)
        val_resp_gestion = _safe_str(ws.cell(row=r, column=COL_RESP_GESTION).value)
        val_mes_inicio = ws.cell(row=r, column=COL_MES_INICIO).value
        val_duracion = ws.cell(row=r, column=COL_DURACION).value

        # Saltar filas vacías o de notas/separadores
        if _es_fila_header(val_objetivo, val_actividad):
            continue
        if not any([val_objetivo, val_actividad, val_resultado,
                    val_participantes, val_riesgo, val_medida,
                    val_resp_gestion, val_mes_inicio, val_duracion]):
            continue

        # Detectar cambio de OE
        if val_objetivo:
            if re.match(r"(?i)^oe\s*\d+", val_objetivo) or \
               re.match(r"(?i)^objetivo\s*\d+", val_objetivo):
                oe_actual = val_objetivo.upper().replace(" ", "")
            else:
                oe_actual = val_objetivo

        # Detectar nueva actividad (col C tiene contenido nuevo)
        es_nueva_actividad = bool(val_actividad) and val_actividad != actividad_actual_desc
        if es_nueva_actividad:
            actividad_actual_desc = val_actividad
            mes_inicio = _safe_int(val_mes_inicio, default=1)
            duracion = _safe_float(val_duracion, default=1.0)
            anio_ejec = _determinar_anio_ejecucion(mes_inicio)

            # Extraer iniciales con regex — conocidas + desconocidas
            part_conocidas, part_desc = _extraer_iniciales(
                val_participantes, regex_iniciales, datos["equipo_map"]
            )
            rg_conocidas, rg_desc = _extraer_iniciales(
                val_resp_gestion, regex_iniciales, datos["equipo_map"]
            )
            _actualizar_desconocidas(part_desc)
            _actualizar_desconocidas(rg_desc)

            nueva_actividad = {
                "objetivo": oe_actual,
                "descripcion": val_actividad,
                "resultado_esperado": val_resultado,
                # Back-compat: string crudo de iniciales separado por comas
                "participantes": val_participantes,
                # Nuevo: lista estructurada
                "participantes_lista": part_conocidas,
                "participantes_desconocidas": part_desc,
                "responsabilidad": val_responsabilidad,
                # Back-compat + estructurado para responsable de gestión
                "responsable_gestion": val_resp_gestion,
                "responsable_gestion_lista": rg_conocidas,
                "responsable_gestion_desconocidas": rg_desc,
                "mes_inicio": mes_inicio,
                "duracion_meses": duracion,
                "anio_ejecucion": anio_ejec,
            }
            datos["actividades"].append(nueva_actividad)
            actividad_actual_index = len(datos["actividades"]) - 1
        else:
            # Continuación — agregar participantes/responsable a la actividad actual
            if actividad_actual_index is not None:
                act = datos["actividades"][actividad_actual_index]

                if val_participantes:
                    nuevas_part, nuevas_desc = _extraer_iniciales(
                        val_participantes, regex_iniciales, datos["equipo_map"]
                    )
                    # Agregar solo las no duplicadas
                    for p in nuevas_part:
                        if not any(x["iniciales"] == p["iniciales"]
                                   for x in act["participantes_lista"]):
                            act["participantes_lista"].append(p)
                    act["participantes_desconocidas"].extend(
                        x for x in nuevas_desc
                        if x not in act["participantes_desconocidas"]
                    )
                    _actualizar_desconocidas(nuevas_desc)
                    # Mantener también el string crudo concatenado (back-compat)
                    if val_participantes not in (act.get("participantes") or ""):
                        act["participantes"] = (
                            (act.get("participantes") or "") + ", " + val_participantes
                        ).strip(", ")

                if val_resp_gestion:
                    nuevas_rg, nuevas_rg_desc = _extraer_iniciales(
                        val_resp_gestion, regex_iniciales, datos["equipo_map"]
                    )
                    for p in nuevas_rg:
                        if not any(x["iniciales"] == p["iniciales"]
                                   for x in act["responsable_gestion_lista"]):
                            act["responsable_gestion_lista"].append(p)
                    act["responsable_gestion_desconocidas"].extend(
                        x for x in nuevas_rg_desc
                        if x not in act["responsable_gestion_desconocidas"]
                    )
                    _actualizar_desconocidas(nuevas_rg_desc)

        # ------------------------------------------------------------------
        # 4. RIESGOS Y MEDIDAS DE MITIGACIÓN
        # ------------------------------------------------------------------
        if val_riesgo and actividad_actual_index is not None:
            datos["riesgos"].append({
                "actividad_index": actividad_actual_index,
                "descripcion": val_riesgo,
                "probabilidad": None,
                "impacto": None,
            })

        if val_medida:
            riesgo_index_asociado = None
            if actividad_actual_index is not None:
                for idx in range(len(datos["riesgos"]) - 1, -1, -1):
                    if datos["riesgos"][idx]["actividad_index"] == actividad_actual_index:
                        riesgo_index_asociado = idx
                        break

            if riesgo_index_asociado is None and actividad_actual_index is not None:
                datos["riesgos"].append({
                    "actividad_index": actividad_actual_index,
                    "descripcion": "(Riesgo implícito — sin descripción explícita)",
                    "probabilidad": None,
                    "impacto": None,
                })
                riesgo_index_asociado = len(datos["riesgos"]) - 1

            if riesgo_index_asociado is not None:
                texto_medida = val_medida.lower()
                es_permiso_etico = any(kw in texto_medida for kw in [
                    "comité ético", "comite etico", "conagebio",
                    "cicua", "cobab", "aval ético", "aval etico",
                    "permiso ético", "permiso etico",
                ])

                # El responsable de la medida es el de col I (RESPONSABLE DE LA GESTIÓN)
                # — el router lo usa para vincular con Usuario.
                resp_conocidas, resp_desc = _extraer_iniciales(
                    val_resp_gestion, regex_iniciales, datos["equipo_map"]
                )
                _actualizar_desconocidas(resp_desc)

                datos["medidas_mitigacion"].append({
                    "riesgo_index": riesgo_index_asociado,
                    "descripcion": val_medida,
                    # Back-compat: string crudo
                    "responsable": val_resp_gestion,
                    # Nuevo: lista estructurada de responsables
                    "responsable_lista": resp_conocidas,
                    "responsable_desconocidas": resp_desc,
                    "es_permiso_etico": es_permiso_etico,
                })

    # Convertir el set de desconocidas a lista ordenada
    datos["iniciales_desconocidas"] = sorted(set_desconocidas_global)

    return datos