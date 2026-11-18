"""
form05_parser.py
================
Parser del Form-05 (Plan de Acción y Gestión del Riesgo) en formato .xlsx.
Extrae: actividades, riesgos, medidas de mitigación y participantes.
"""
import openpyxl
from io import BytesIO
from typing import List, Dict, Optional


def _normalizar_texto(valor) -> str:
    if valor is None:
        return ""
    return str(valor).strip()


def _parsear_numero(valor) -> Optional[float]:
    if valor is None or valor == "":
        return None
    try:
        return float(str(valor).replace(",", ""))
    except (ValueError, TypeError):
        return None


def parsear_form05_xlsx(contenido: bytes) -> dict:
    """
    Lee el .xlsx del Form-05 y devuelve un dict con:
      - info_general: título, código, tipo de iniciativa, duración
      - equipo: lista de {nombre, iniciales, rol}
      - actividades: lista de {objetivo, descripcion, resultado, participantes,
                               responsabilidad, mes_inicio, duracion_meses, anio_ejecucion}
      - riesgos: lista de {descripcion, actividad_index, probabilidad, impacto}
      - medidas_mitigacion: lista de {descripcion, riesgo_index, responsable, es_permiso_etico}
    """
    wb = openpyxl.load_workbook(BytesIO(contenido), data_only=True)

    resultado = {
        "info_general": {},
        "equipo": [],
        "actividades": [],
        "riesgos": [],
        "medidas_mitigacion": [],
    }

    # ------------------------------------------------------------------
    # HOJA 1: Información General
    # ------------------------------------------------------------------
    if "Información General" in wb.sheetnames:
        ws = wb["Información General"]
        for row in ws.iter_rows(values_only=True):
            if not row or len(row) < 2:
                continue
            clave = _normalizar_texto(row[0])
            valor = _normalizar_texto(row[1]) if len(row) > 1 else ""
            if not clave or not valor:
                continue
            clave_l = clave.lower()
            if "código" in clave_l or "codigo" in clave_l:
                resultado["info_general"]["codigo_propuesta"] = valor
            elif "título" in clave_l or "titulo" in clave_l:
                resultado["info_general"]["titulo"] = valor
            elif "tipo de iniciativa" in clave_l:
                resultado["info_general"]["tipo_iniciativa"] = valor
            elif "duración" in clave_l or "duracion" in clave_l:
                resultado["info_general"]["duracion"] = valor

    # ------------------------------------------------------------------
    # HOJA 2: Equipo de Trabajo
    # ------------------------------------------------------------------
    if "Equipo de Trabajo" in wb.sheetnames:
        ws = wb["Equipo de Trabajo"]
        filas = list(ws.iter_rows(values_only=True))
        # Buscar fila de encabezado: Nombre | Iniciales | Rol
        idx_header = None
        for i, r in enumerate(filas):
            if r and len(r) >= 3 and _normalizar_texto(r[0]).lower() == "nombre":
                idx_header = i
                break
        if idx_header is not None:
            for r in filas[idx_header + 1:]:
                if not r or not _normalizar_texto(r[0]):
                    continue
                resultado["equipo"].append({
                    "nombre": _normalizar_texto(r[0]),
                    "iniciales": _normalizar_texto(r[1]) if len(r) > 1 else "",
                    "rol": _normalizar_texto(r[2]) if len(r) > 2 else "",
                })

    # ------------------------------------------------------------------
    # HOJA 3: Plan de Acción (la más importante)
    # ------------------------------------------------------------------
    if "Plan de Acción" in wb.sheetnames:
        ws = wb["Plan de Acción"]
        filas = list(ws.iter_rows(values_only=True))

        # Localizar fila de encabezados (OBJETIVO | ACTIVIDADES | ...)
        idx_header = None
        for i, r in enumerate(filas):
            if r and len(r) >= 10 and _normalizar_texto(r[0]).upper() == "OBJETIVO" \
                    and "ACTIVIDADES" in _normalizar_texto(r[1]).upper():
                idx_header = i
                break

        if idx_header is None:
            return resultado

        # Mapeo de columnas por posición
        # 0=OBJETIVO, 1=ACTIVIDADES, 2=RESULTADO, 3=PARTICIPANTES, 4=RESPONSABILIDAD,
        # 5=RIESGOS, 6=MEDIDAS, 7=RESP_GESTION, 8=MES_INICIO, 9=DURACION
        # 10..21 = Año1 (12 meses), 22..33 = Año2 (12 meses)
        headers = filas[idx_header]

        for r in filas[idx_header + 1:]:
            if not r or not _normalizar_texto(r[1]):
                continue  # Sin actividad = fila vacía

            # Detectar año de ejecución mirando las columnas de meses
            anio_ejecucion = 1  # por defecto año 1
            mes_inicio = _parsear_numero(r[8]) if len(r) > 8 else None
            duracion_meses = _parsear_numero(r[9]) if len(r) > 9 else None

            # Si hay marca en columnas 22+ (Año 2), cambiar año
            if len(r) > 22:
                for j in range(22, min(len(r), 34)):
                    if r[j] and _normalizar_texto(r[j]):
                        anio_ejecucion = 2
                        break

            actividad = {
                "objetivo": _normalizar_texto(r[0]),
                "descripcion": _normalizar_texto(r[1]),
                "resultado_esperado": _normalizar_texto(r[2]) if len(r) > 2 else "",
                "participantes": _normalizar_texto(r[3]) if len(r) > 3 else "",
                "responsabilidad": _normalizar_texto(r[4]) if len(r) > 4 else "",
                "riesgos_texto": _normalizar_texto(r[5]) if len(r) > 5 else "",
                "medidas_texto": _normalizar_texto(r[6]) if len(r) > 6 else "",
                "responsable_gestion": _normalizar_texto(r[7]) if len(r) > 7 else "",
                "mes_inicio": int(mes_inicio) if mes_inicio else None,
                "duracion_meses": duracion_meses,
                "anio_ejecucion": anio_ejecucion,
            }
            idx_actividad = len(resultado["actividades"])
            resultado["actividades"].append(actividad)

            # Riesgos: un riesgo por actividad (o separados por salto de línea)
            riesgos_raw = actividad["riesgos_texto"]
            if riesgos_raw:
                partes = [p.strip() for p in riesgos_raw.split("\n") if p.strip()]
                for p in partes:
                    resultado["riesgos"].append({
                        "descripcion": p,
                        "actividad_index": idx_actividad,
                        "probabilidad": None,
                        "impacto": None,
                    })

            # Medidas de mitigación
            medidas_raw = actividad["medidas_texto"]
            if medidas_raw and resultado["riesgos"]:
                partes = [p.strip() for p in medidas_raw.split("\n") if p.strip()]
                # Asignar cada medida al último riesgo de esta actividad
                riesgos_de_actividad = [i for i, rg in enumerate(resultado["riesgos"])
                                        if rg["actividad_index"] == idx_actividad]
                for k, p in enumerate(partes):
                    if riesgos_de_actividad:
                        idx_riesgo = riesgos_de_actividad[min(k, len(riesgos_de_actividad) - 1)]
                        resultado["medidas_mitigacion"].append({
                            "descripcion": p,
                            "riesgo_index": idx_riesgo,
                            "responsable": actividad["responsable_gestion"],
                            "es_permiso_etico": "permiso" in p.lower() or "ético" in p.lower(),
                        })

    return resultado