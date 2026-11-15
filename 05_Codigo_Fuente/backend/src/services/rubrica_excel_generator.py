from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from datetime import datetime
from io import BytesIO

# Colores oficiales
AZUL_TEC = "002855"
AZUL_CLARO = "E6F0FA"
ROJO = "CC0000"
VERDE = "008000"

# Tipos de productos según modalidad (extraídos del Excel oficial)
TIPOS_PRODUCTOS = {
    "fortalecimiento": [
        "Opción 1 - Diagnóstico de situación",
        "Opción 2 - Estudio de mercado",
        "Opción 3 - Estudio de factibilidad",
        "Opción 4 - Ensayo de laboratorio",
        "Opción 5 - Propuesta de creación de una línea de investigación",
        "Opción 6 - Propuesta de proyecto de investigación básica, aplicada o proyecto de desarrollo tecnológico",
        "Opción 7 - Artículo científico sometido en revista o conferencia indexada (WoS, Scopus, Redalyc, SciELO, ESCI o DOAJ)"
    ],
    "investigacion": [
        "Opción 1 - Un artículo científico sometido en revista o memoria indexada en Web of Science (WoS) o Scopus",
        "Opción 2 - Dos artículos científicos en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias con Consejo Editorial permanente",
        "Opción 3 - Un libro o capítulo de libro técnico especializado, sometido ante Comité Editorial permanente, vinculado al tema de investigación"
    ],
    "desarrollo_pi": [
        "Opción 1 - Patente de invención o modelo de utilidad (documento técnico preliminar de solicitud)",
        "Opción 2 - Diseño industrial – dibujo o modelo industrial – (solicitud completa)",
        "Opción 3 - Desarrollo de Software (código fuente + manual técnico + manual de usuario + ciclo de vida)",
        "Opción 4 - Secreto (documento técnico conformado y depositado en el Centro de Vinculación)",
        "Opción 5 - Obtención Vegetal (documento técnico con caracterización de la nueva variedad)",
        "Opción 6 - Denominación de origen o indicación geográfica (pliego de condiciones)",
        "Opción 8 - Otros (a criterio del Centro de Vinculación)"
    ],
    "desarrollo_acad": [
        "Opción 1 - Un artículo científico sometido en revista o memoria indexada en Web of Science (WoS) o Scopus",
        "Opción 2 - Dos artículos científicos en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias con Consejo Editorial permanente",
        "Opción 3 - Un libro o capítulo de libro técnico especializado, sometido ante Comité Editorial permanente, vinculado al tema de investigación",
        "Opción 4 - Norma técnica sometida ante entes competentes de trayectoria nacional o internacional, o manuales técnicos de alta especialidad",
        "Opción 5 - Otros productos según la naturaleza de la propuesta, validados por el CIE"
    ]
}


def generar_rubrica_excel(rubrica_data: dict, evaluaciones: dict = None, productos: dict = None) -> bytes:
    """
    Genera el Excel oficial de la rúbrica con FÓRMULAS REALES.
    rubrica_data: dict con la estructura de la rúbrica
    evaluaciones: dict {criterio_id: {nivel, puntaje, justificacion}}
    productos: dict {horasSemanales, cantidadPropuesta, tiposSeleccionados}
    """
    if evaluaciones is None:
        evaluaciones = {}
    if productos is None:
        productos = {}

    wb = Workbook()
    ws = wb.active
    ws.title = "Rúbrica Oficial"

    # Detectar modalidad
    modalidad = rubrica_data.get("nombreRubrica", "ACTIVIDADES DE FORTALECIMIENTO").upper()
    es_desarrollo = "DESARROLLO" in modalidad
    es_investigacion = "INVESTIGACIÓN" in modalidad and "DESARROLLO" not in modalidad

    # Estilos
    thin = Side(style="thin", color="000000")
    borde = Border(left=thin, right=thin, top=thin, bottom=thin)
    fill_azul = PatternFill("solid", fgColor=AZUL_TEC)
    fill_claro = PatternFill("solid", fgColor=AZUL_CLARO)
    font_blanco_bold = Font(bold=True, color="FFFFFF", size=11)
    font_azul_bold = Font(bold=True, color=AZUL_TEC, size=11)
    font_rojo = Font(italic=True, color=ROJO, size=10)
    font_bold = Font(bold=True)

    # =========================================================================
    # ENCABEZADO
    # =========================================================================
    ws.merge_cells("A1:I1")
    ws["A1"] = f"RÚBRICA DE EVALUACIÓN – {modalidad}"
    ws["A1"].font = Font(bold=True, size=14, color=AZUL_TEC)
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("A2:I2")
    ws["A2"] = "Convocatoria con fondos VIE 2027 – Vicerrectoría de Investigación y Extensión, Instituto Tecnológico de Costa Rica"
    ws["A2"].alignment = Alignment(horizontal="center")

    ws["A3"] = "Nombre de la propuesta:"; ws["A3"].font = font_bold
    ws.merge_cells("C3:I3"); ws["C3"] = rubrica_data.get("titulo", "")

    ws["A4"] = "Dependencia académica coordinadora:"; ws["A4"].font = font_bold
    ws.merge_cells("C4:I4"); ws["C4"] = rubrica_data.get("escuela", "")

    ws["A5"] = "Fecha de evaluación:"; ws["A5"].font = font_bold
    ws.merge_cells("C5:I5"); ws["C5"] = datetime.now().strftime("%d/%m/%Y")

    ws.merge_cells("A7:I7")
    ws["A7"] = "⚠ REQUISITOS MÍNIMOS OBLIGATORIOS: Los criterios marcados con ⛔, son requisitos obligatorios. Cuando un requisito obligatorio obtenga una calificación 'deficiente' o 'regular', el Comité Técnico emitirá dictamen técnico desfavorable o no recomendará la propuesta, para conocimiento del Consejo de la instancia y trámite ante la VIE y CIE, según corresponda."
    ws["A7"].font = font_rojo
    ws["A7"].alignment = Alignment(wrap_text=True)

    # =========================================================================
    # ENCABEZADOS DE TABLA (fila 9)
    # =========================================================================
    headers = [
        "Criterio de evaluación", "Peso",
        "Deficiente (0 pts)", "Regular (6 pts)", "Bueno (8 pts)", "Excelente (10 pts)",
        "Nivel (seleccione)", "Subpuntaje obtenido", "Justificación de la puntuación"
    ]
    for i, h in enumerate(headers, 1):
        cell = ws.cell(row=9, column=i, value=h)
        cell.font = font_blanco_bold
        cell.fill = fill_azul
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = borde
    ws.row_dimensions[9].height = 30

    # =========================================================================
    # SECCIONES Y CRITERIOS
    # =========================================================================
    current_row = 11
    celdas_subtotales = []

    secciones = rubrica_data.get("estructuraRubrica", {}).get("secciones", [])
    for seccion in secciones:
        # Título de sección
        ws.merge_cells(f"A{current_row}:I{current_row}")
        ws[f"A{current_row}"] = f"{seccion['nombre']} — Peso de la sección: {seccion['peso_seccion']}%"
        ws[f"A{current_row}"].font = font_azul_bold
        ws[f"A{current_row}"].fill = fill_claro
        current_row += 1

        start_row = current_row
        criterios = seccion.get("criterios", [])
        for crit in criterios:
            crit_id = str(crit.get("id", ""))
            ev = evaluaciones.get(crit_id, {})
            es_obligatorio = crit.get("es_requisito_obligatorio", False)
            nombre = f"⛔ {crit['nombre']}" if es_obligatorio else crit["nombre"]

            ws.cell(row=current_row, column=1, value=nombre).alignment = Alignment(wrap_text=True, vertical="top")
            if es_obligatorio:
                ws.cell(row=current_row, column=1).font = Font(bold=True, color=ROJO)

            peso_cell = ws.cell(row=current_row, column=2, value=crit.get("peso", 0))
            peso_cell.number_format = '0"%"'
            peso_cell.alignment = Alignment(horizontal="center", vertical="top")

            niveles = crit.get("niveles", {})
            ws.cell(row=current_row, column=3, value=niveles.get("Deficiente", "")).alignment = Alignment(wrap_text=True, vertical="top")
            ws.cell(row=current_row, column=4, value=niveles.get("Regular", "")).alignment = Alignment(wrap_text=True, vertical="top")
            ws.cell(row=current_row, column=5, value=niveles.get("Bueno", "")).alignment = Alignment(wrap_text=True, vertical="top")
            ws.cell(row=current_row, column=6, value=niveles.get("Excelente", "")).alignment = Alignment(wrap_text=True, vertical="top")

            # Columna G: Nivel con lista desplegable
            nivel_cell = ws.cell(row=current_row, column=7, value=ev.get("nivel", ""))
            nivel_cell.font = Font(bold=True, color="006600")
            nivel_cell.alignment = Alignment(horizontal="center", vertical="center")

            # Columna H: FÓRMULA REAL
            formula = f'=IF(G{current_row}="Deficiente",0,IF(G{current_row}="Regular",6,IF(G{current_row}="Bueno",8,IF(G{current_row}="Excelente",10,""))))'
            h_cell = ws.cell(row=current_row, column=8, value=formula)
            h_cell.font = Font(bold=True, color=AZUL_TEC)
            h_cell.alignment = Alignment(horizontal="center", vertical="center")

            ws.cell(row=current_row, column=9, value=ev.get("justificacion", "")).alignment = Alignment(wrap_text=True, vertical="top")

            for col in range(1, 10):
                ws.cell(row=current_row, column=col).border = borde
            ws.row_dimensions[current_row].height = 80
            current_row += 1

        end_row = current_row - 1

        # Subtotal con FÓRMULA REAL
        ws.merge_cells(f"A{current_row}:F{current_row}")
        ws[f"A{current_row}"] = f"Subtotal – {seccion['nombre']}"
        ws[f"A{current_row}"].font = Font(bold=True, italic=True)
        ws[f"A{current_row}"].alignment = Alignment(horizontal="right")

        formula_subtotal = f"=SUMPRODUCT(H{start_row}:H{end_row},B{start_row}:B{end_row})/SUM(B{start_row}:B{end_row})*({seccion['peso_seccion']}/100)"
        ws.merge_cells(f"G{current_row}:H{current_row}")
        sub_cell = ws.cell(row=current_row, column=7, value=formula_subtotal)
        sub_cell.number_format = '0.00'
        sub_cell.font = Font(bold=True, color=AZUL_TEC)
        sub_cell.alignment = Alignment(horizontal="center")
        celdas_subtotales.append(f"G{current_row}")

        current_row += 2

    # =========================================================================
    # CALIFICACIÓN FINAL
    # =========================================================================
    ws.merge_cells(f"A{current_row}:F{current_row}")
    ws[f"A{current_row}"] = "CALIFICACIÓN FINAL DE LA PROPUESTA"
    ws[f"A{current_row}"].font = Font(bold=True, size=12)
    ws[f"A{current_row}"].alignment = Alignment(horizontal="right")

    formula_final = "=" + "+".join(celdas_subtotales)
    ws.merge_cells(f"G{current_row}:H{current_row}")
    final_cell = ws.cell(row=current_row, column=7, value=formula_final)
    final_cell.number_format = '0.00'
    final_cell.font = Font(bold=True, size=14, color=AZUL_TEC)
    final_cell.alignment = Alignment(horizontal="center")
    calificacion_row = current_row

    # Formato condicional
    ws.conditional_formatting.add(
        f"G{current_row}",
        CellIsRule(operator="greaterThanOrEqual", formula=["0.7"], font=Font(color=VERDE, bold=True))
    )
    ws.conditional_formatting.add(
        f"G{current_row}",
        CellIsRule(operator="lessThan", formula=["0.7"], font=Font(color=ROJO, bold=True))
    )

    current_row += 1
    ws.merge_cells(f"A{current_row}:I{current_row}")
    ws[f"A{current_row}"] = "ESCALA DE RESULTADOS: ≥ 0.70 = RECOMIENDA | < 0.70 = NO RECOMIENDA"
    ws[f"A{current_row}"].font = Font(bold=True, italic=True, color="666666")
    ws[f"A{current_row}"].alignment = Alignment(horizontal="center")
    current_row += 2

    # =========================================================================
    # SECCIÓN 8: PRODUCTOS ACADÉMICOS
    # =========================================================================
    ws.merge_cells(f"A{current_row}:I{current_row}")
    ws[f"A{current_row}"] = "8. PRODUCTOS ACADÉMICOS — Sección no sumativa"
    ws[f"A{current_row}"].font = font_azul_bold
    ws[f"A{current_row}"].fill = fill_claro
    current_row += 1

    ws.merge_cells(f"A{current_row}:I{current_row}")
    if es_desarrollo:
        ws[f"A{current_row}"] = "ATENCIÓN: Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Todo proyecto de desarrollo tecnológico requiere MÍNIMO 2 productos (1 de propiedad industrial obligatorio + 1 adicional). Si la formulación de la propuesta NO cumple, el Comité Técnico DEBE no recomendar la propuesta."
    else:
        ws[f"A{current_row}"] = "ATENCIÓN: Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Si el equipo NO cumple, el Comité Técnico NO DEBE RECOMENDAR la propuesta independientemente de la calificación final obtenida."
    ws[f"A{current_row}"].font = font_rojo
    ws[f"A{current_row}"].alignment = Alignment(wrap_text=True)
    current_row += 1

    # Horas semanales (editable)
    ws.merge_cells(f"A{current_row}:B{current_row}")
    ws[f"A{current_row}"] = "Total de horas semanales asignadas al equipo"
    ws[f"A{current_row}"].font = font_bold
    ws.merge_cells(f"C{current_row}:I{current_row}")
    ws[f"C{current_row}"] = productos.get("horasSemanales", 0)
    ws[f"C{current_row}"].fill = PatternFill("solid", fgColor="FFFFCC")
    horas_row = current_row
    current_row += 1

    # Mínimo requerido (FÓRMULA)
    ws.merge_cells(f"A{current_row}:B{current_row}")
    ws[f"A{current_row}"] = "Mínimo de productos requeridos (según horas)"
    ws[f"A{current_row}"].font = font_bold
    ws.merge_cells(f"C{current_row}:I{current_row}")
    if es_desarrollo:
        ws[f"C{current_row}"] = f"=MAX(2,CEILING(C{horas_row}/10,1))"
    else:
        ws[f"C{current_row}"] = f"=MAX(1,CEILING(C{horas_row}/10,1))"
    ws[f"C{current_row}"].font = Font(bold=True, color=AZUL_TEC)
    minimo_row = current_row
    current_row += 1

    # Cantidad propuesta (editable)
    ws.merge_cells(f"A{current_row}:B{current_row}")
    ws[f"A{current_row}"] = "Cantidad de productos propuestos por el equipo"
    ws[f"A{current_row}"].font = font_bold
    ws.merge_cells(f"C{current_row}:I{current_row}")
    ws[f"C{current_row}"] = productos.get("cantidadPropuesta", 0)
    ws[f"C{current_row}"].fill = PatternFill("solid", fgColor="FFFFCC")
    cantidad_row = current_row
    current_row += 1

    # Tipos de productos
    ws.merge_cells(f"A{current_row}:B{current_row}")
    ws[f"A{current_row}"] = "Tipo(s) de producto(s) comprometidos"
    ws[f"A{current_row}"].font = font_bold
    ws.merge_cells(f"C{current_row}:I{current_row}")
    ws[f"C{current_row}"] = "Marque el tipo declarado por el equipo (uno por cada producto comprometido):"
    current_row += 1

    # Lista de tipos según modalidad
    tipos_a_mostrar = []
    if es_desarrollo:
        tipos_a_mostrar = TIPOS_PRODUCTOS["desarrollo_pi"] + TIPOS_PRODUCTOS["desarrollo_acad"]
    elif es_investigacion:
        tipos_a_mostrar = TIPOS_PRODUCTOS["investigacion"]
    else:
        tipos_a_mostrar = TIPOS_PRODUCTOS["fortalecimiento"]

    tipos_seleccionados = productos.get("tiposSeleccionados", [])
    for t in tipos_a_mostrar:
        seleccionado = any(t.lower() in str(x).lower() for x in tipos_seleccionados)
        ws.merge_cells(f"A{current_row}:I{current_row}")
        ws[f"A{current_row}"] = f"{'☑' if seleccionado else '☐'} {t}"
        current_row += 1

    current_row += 1

    # ¿Cumple mínimo? (FÓRMULA)
    ws.merge_cells(f"A{current_row}:B{current_row}")
    ws[f"A{current_row}"] = "¿Cumple con el mínimo según las horas asignadas?"
    ws[f"A{current_row}"].font = font_bold
    ws.merge_cells(f"C{current_row}:I{current_row}")
    ws[f"C{current_row}"] = f'=IF(C{cantidad_row}>=C{minimo_row},"✓ CUMPLE con los requisitos mínimos de productos académicos → La propuesta puede continuar su revisión","✗ NO CUMPLE con los requisitos mínimos → La propuesta debe ser RECHAZADA por el Comité Técnico")'
    ws[f"C{current_row}"].font = Font(bold=True)
    cumple_row = current_row
    current_row += 2

    # =========================================================================
    # DICTAMEN FINAL (FÓRMULA)
    # =========================================================================
    ws.merge_cells(f"A{current_row}:I{current_row}")
    ws[f"A{current_row}"] = f'=IF(AND(G{calificacion_row}>=0.7,ISNUMBER(SEARCH("✓",C{cumple_row}))),"DICTAMEN DEL COMITÉ TÉCNICO: PROPUESTA RECOMENDADA","DICTAMEN DEL COMITÉ TÉCNICO: PROPUESTA NO RECOMENDADA")'
    ws[f"A{current_row}"].font = Font(bold=True, size=12, color=AZUL_TEC)
    ws[f"A{current_row}"].alignment = Alignment(horizontal="center")
    current_row += 2

    # Firmas
    for rol in ["integrante 1", "integrante 2", "integrante 3", "coordinadora"]:
        ws.merge_cells(f"A{current_row}:I{current_row}")
        ws[f"A{current_row}"] = f"Nombre y firma de la persona {rol} del Comité Técnico:"
        ws[f"A{current_row}"].font = font_bold
        ws[f"A{current_row}"].border = Border(bottom=Side(style="thin"))
        current_row += 2

    # =========================================================================
    # ANCHOS DE COLUMNA
    # =========================================================================
    anchos = {"A": 35, "B": 8, "C": 25, "D": 25, "E": 25, "F": 25, "G": 15, "H": 12, "I": 40}
    for col, w in anchos.items():
        ws.column_dimensions[col].width = w

    # Forzar recálculo al abrir
    wb.calculation.fullCalcOnLoad = True

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()