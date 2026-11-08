# generar_formulario_real.py
from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from src.utils.s3_client import s3_client, S3_BUCKET_NAME
from src.database import SessionLocal
from src.models.propuesta_documentos import PropuestaDocumentos
import os
import hashlib
from datetime import datetime, timezone

def set_cell_shading(cell, color):
    """Aplica color de fondo a una celda."""
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:fill'), color)
    cell._tc.get_or_add_tcPr().append(shading_elm)

def add_checkbox(doc, checked=False, text=""):
    """Agrega un checkbox con texto."""
    symbol = "☒" if checked else "☐"
    p = doc.add_paragraph()
    run = p.add_run(f"{symbol} {text}")
    run.font.size = Pt(11)
    return p

def set_table_borders(table):
    """Aplica bordes a una tabla."""
    tbl = table._tbl
    tblPr = tbl.tblPr if tbl.tblPr is not None else OxmlElement('w:tblPr')
    borders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '4')
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), '000000')
        borders.append(border)
    tblPr.append(borders)

def crear_documento():
    doc = Document()
    
    # Estilos base
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    
    # ========== ENCABEZADO ==========
    titulo = doc.add_heading('Vicerrectoría de Investigación y Extensión', level=0)
    titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    subtitulo = doc.add_paragraph()
    subtitulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitulo.add_run('Formulación para proyectos de Investigación Básica, Aplicada o Desarrollo Tecnológico')
    run.bold = True
    run.font.size = Pt(12)
    
    subtitulo2 = doc.add_paragraph()
    subtitulo2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitulo2.add_run('Convocatoria interna para investigación (Recursos VIE)')
    run.bold = True
    
    # Tabla de datos del proyecto
    tabla_datos = doc.add_table(rows=3, cols=2)
    tabla_datos.style = 'Table Grid'
    set_table_borders(tabla_datos)
    
    celdas = [
        ('Nombre del proyecto', 'Sistema de Energía Solar Fotovoltaica de Alta Eficiencia Adaptado a Condiciones Climáticas Tropicales para Zonas Rurales de Costa Rica'),
        ('Fecha de inicio', '1 de febrero de 2027'),
        ('Fecha de finalización', '31 de enero de 2029')
    ]
    
    for i, (label, valor) in enumerate(celdas):
        tabla_datos.rows[i].cells[0].text = label
        tabla_datos.rows[i].cells[1].text = valor
        set_cell_shading(tabla_datos.rows[i].cells[0], 'D9E2F3')
        for paragraph in tabla_datos.rows[i].cells[0].paragraphs:
            for run in paragraph.runs:
                run.bold = True
    
    doc.add_paragraph()  # Espacio
    
    # ========== 1. PREGUNTAS GENERALES ==========
    doc.add_heading('1. Preguntas generales', level=1)
    
    doc.add_heading('1.a. La modalidad de la propuesta es:', level=2)
    add_checkbox(doc, checked=False, text="Investigación básica")
    add_checkbox(doc, checked=False, text="Investigación aplicada")
    add_checkbox(doc, checked=True, text="Investigación básica y aplicada")
    add_checkbox(doc, checked=False, text="Desarrollo tecnológico")
    
    doc.add_heading('1.b. ¿Ha sido esta propuesta sometida a otras fuentes de financiamiento?', level=2)
    add_checkbox(doc, checked=True, text="No")
    add_checkbox(doc, checked=False, text="Sí")
    
    doc.add_heading('1.c. ¿Existe vinculación técnica con otros proyectos?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    p = doc.add_paragraph()
    p.add_run('1. Nombre del proyecto relacionado: ').bold = True
    p.add_run(' "Optimización de celdas solares de perovskita para ambientes húmedos" (VIE-2024-015, finalizado).')
    p = doc.add_paragraph()
    p.add_run('2. Tipo de relación: ').bold = True
    p.add_run('Nueva etapa dentro de la línea de investigación "Energías Renovables para el Desarrollo Rural".')
    
    doc.add_heading('1.d. ¿Atiende problemas prioritarios de planes nacionales?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    p = doc.add_paragraph()
    p.add_run('Problema: ').bold = True
    p.add_run('Baja eficiencia de sistemas fotovoltaicos en zonas rurales con alta humedad (>85%), afectando a 120,000 habitantes según el Instituto Costarricense de Electricidad (ICE, 2024).')
    p = doc.add_paragraph()
    p.add_run('Documento de referencia: ').bold = True
    p.add_run('Plan Nacional de Descarbonización 2018-2050 (MIDEPLAN) y ODS 7: Energía asequible y no contaminante.')
    
    doc.add_heading('1.e. ¿Requiere instrumento jurídico con entes externos?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    add_checkbox(doc, checked=True, text="Convenio Nacional")
    p = doc.add_paragraph()
    p.add_run('Ente: Instituto Costarricense de Electricidad (ICE) - Gerencia de Distribución.')
    
    doc.add_heading('1.f. ¿Se fundamenta en convenio marco vigente?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    p = doc.add_paragraph('Convenio Marco de Cooperación Técnica TEC-ICE N° 2023-047, vigente hasta diciembre de 2028.')
    
    doc.add_heading('1.g. ¿Corresponde a investigación base para grado académico superior?', level=2)
    add_checkbox(doc, checked=True, text="Sí, parcialmente")
    p = doc.add_paragraph()
    p.add_run('1. Nombre: ').bold = True
    p.add_run('Ing. Carlos Alberto Méndez Rojas')
    p = doc.add_paragraph()
    p.add_run('2. Programa: ').bold = True
    p.add_run('Maestría en Ingeniería Electrónica, énfasis en Energías Renovables')
    p = doc.add_paragraph()
    p.add_run('3. Universidad: ').bold = True
    p.add_run('Instituto Tecnológico de Costa Rica')
    
    doc.add_heading('1.h. ¿Contiene información sensible?', level=2)
    add_checkbox(doc, checked=True, text="No")
    
    doc.add_heading('1.i. ¿Presenta potencial de propiedad intelectual?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    p = doc.add_paragraph('Oficio del Centro de Vinculación: CV-2026-0892. Se identifica potencial de patente para el recubrimiento nanoestructurado anti-humedad.')
    
    doc.add_heading('1.j. ¿Generará innovación?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    add_checkbox(doc, checked=True, text="de Producto")
    p = doc.add_paragraph('Prototipo funcional de panel solar con eficiencia superior al 22% en condiciones tropicales.')
    
    doc.add_heading('1.k. Nivel de madurez tecnológica (TRL)', level=2)
    tabla_trl = doc.add_table(rows=2, cols=3)
    tabla_trl.style = 'Table Grid'
    set_table_borders(tabla_trl)
    tabla_trl.rows[0].cells[0].text = 'Escala de niveles TRL'
    tabla_trl.rows[0].cells[1].text = 'Descripción'
    tabla_trl.rows[0].cells[2].text = 'Nivel TRL esperado'
    set_cell_shading(tabla_trl.rows[0].cells[0], 'D9E2F3')
    set_cell_shading(tabla_trl.rows[0].cells[1], 'D9E2F3')
    set_cell_shading(tabla_trl.rows[0].cells[2], 'D9E2F3')
    tabla_trl.rows[1].cells[0].text = 'TRL 5'
    tabla_trl.rows[1].cells[1].text = 'Tecnología validada en entorno relevante (pruebas piloto en Turrialba)'
    tabla_trl.rows[1].cells[2].text = 'TRL 5'
    
    # ========== 2. RESUMEN ==========
    doc.add_heading('2. Resumen [Máximo 500 palabras]', level=1)
    doc.add_paragraph(
        'Las zonas rurales de Costa Rica enfrentan interrupciones constantes en el suministro eléctrico '
        'y costos elevados de energía. A pesar del alto potencial solar del país (promedio de 5.2 kWh/m²/día), '
        'los sistemas fotovoltaicos convencionales presentan una eficiencia menor al 18% en condiciones de '
        'alta humedad relativa (>85%) y temperaturas superiores a 30°C, típicas del trópico húmedo. '
        'Esta investigación busca diseñar, construir y validar un prototipo de sistema solar fotovoltaico '
        'de alta eficiencia (objetivo: >22%) adaptado específicamente a las condiciones climáticas de las '
        'zonas rurales costarricenses. El enfoque metodológico es mixto, con diseño experimental en tres fases: '
        '(1) simulación computacional en MATLAB/Simulink de celdas de perovskita con recubrimiento nanoestructurado; '
        '(2) construcción de prototipo en laboratorio con pruebas controladas; y (3) validación en campo durante '
        '6 meses en la comunidad de Santa Teresita de Turrialba. Se espera obtener como productos principales: '
        'un prototipo funcional, dos artículos científicos indexados en Scopus, y una guía técnica para la '
        'implementación de sistemas solares de alta eficiencia en el trópico. El proyecto se alinea con el '
        'ODS 7 (Energía asequible y no contaminante) y el Plan Nacional de Descarbonización 2018-2050, '
        'beneficiando directamente a 30 familias rurales en la fase piloto y sentando las bases para un '
        'escalamiento a 100 comunidades para 2030.'
    )
    
    p = doc.add_paragraph()
    p.add_run('Palabras claves: ').bold = True
    p.add_run('energía solar fotovoltaica, perovskita, eficiencia energética, zonas rurales, trópico húmedo, Costa Rica')
    
    p = doc.add_paragraph()
    p.add_run('Abstract: ').bold = True
    p.add_run(
        'Rural areas in Costa Rica face constant power interruptions and high energy costs. Despite high solar '
        'potential, conventional photovoltaic systems show efficiency below 18% in high humidity conditions. '
        'This research aims to design and validate a high-efficiency (>22%) solar prototype adapted to tropical '
        'conditions using perovskite cells with nanostructured coating. Mixed-method approach with three phases: '
        'simulation, laboratory prototyping, and 6-month field validation in Turrialba. Expected outcomes include '
        'a functional prototype, two Scopus-indexed papers, and a technical implementation guide.'
    )
    
    p = doc.add_paragraph()
    p.add_run('Keywords: ').bold = True
    p.add_run('solar photovoltaic energy, perovskite, energy efficiency, rural areas, humid tropics, Costa Rica')
    
    # ========== 3. EQUIPO DE INVESTIGACIÓN ==========
    doc.add_heading('3. Equipo de investigación', level=1)
    doc.add_paragraph('Cuadro 2. Investigadores que son funcionarios del TEC')
    
    tabla_eq = doc.add_table(rows=4, cols=6)
    tabla_eq.style = 'Table Grid'
    set_table_borders(tabla_eq)
    
    headers = ['Nombre y apellidos', 'ID ORCID', 'Instancia académica', 'Condición (Rol)', 'Horas (tipo)', 'Periodo']
    for i, h in enumerate(headers):
        tabla_eq.rows[0].cells[i].text = h
        set_cell_shading(tabla_eq.rows[0].cells[i], 'D9E2F3')
        for paragraph in tabla_eq.rows[0].cells[i].paragraphs:
            for run in paragraph.runs:
                run.bold = True
    
    investigadores = [
        ('Dr. Juan Carlos Pérez Rodríguez', '0000-0001-2345-6789', 'Escuela de Ingeniería Electrónica', 'Investigador Principal', '10 horas VIE', '24 meses'),
        ('Ing. María Elena González Vargas', '0000-0002-9876-5432', 'Escuela de Ingeniería Electrónica', 'Co-Investigadora', '6 horas VIE', '24 meses'),
        ('Dr. Roberto Alberto Sánchez Mora', '0000-0003-1234-5678', 'Centro de Investigación en Energía', 'Colaborador', '4 horas REC', '18 meses')
    ]
    
    for row_idx, (nombre, orcid, instancia, rol, horas, periodo) in enumerate(investigadores, 1):
        cells = tabla_eq.rows[row_idx].cells
        cells[0].text = nombre
        cells[1].text = orcid
        cells[2].text = instancia
        cells[3].text = rol
        cells[4].text = horas
        cells[5].text = periodo
    
    doc.add_paragraph()
    doc.add_paragraph('Cuadro 3. Colaboradores externos')
    
    tabla_ext = doc.add_table(rows=2, cols=3)
    tabla_ext.style = 'Table Grid'
    set_table_borders(tabla_ext)
    
    headers_ext = ['Nombre completo', 'ID ORCID', 'Institución']
    for i, h in enumerate(headers_ext):
        tabla_ext.rows[0].cells[i].text = h
        set_cell_shading(tabla_ext.rows[0].cells[i], 'D9E2F3')
    
    tabla_ext.rows[1].cells[0].text = 'Dr. Fernando Jiménez Castro'
    tabla_ext.rows[1].cells[1].text = '0000-0004-5678-1234'
    tabla_ext.rows[1].cells[2].text = 'Instituto Costarricense de Electricidad (ICE)'
    
    # ========== 4. PROBLEMA DE INVESTIGACIÓN ==========
    doc.add_heading('4. Problema de investigación y su importancia [Máximo una página]', level=1)
    doc.add_paragraph(
        'Costa Rica posee uno de los potenciales solares más altos de Centroamérica, con un promedio de '
        'irradiación de 5.2 kWh/m²/día. Sin embargo, las zonas rurales del país, particularmente en las '
        'regiones de Turrialba, Siquirres y la Zona Sur, enfrentan interrupciones eléctricas que promedian '
        '45 horas al año según datos del ICE (2024), afectando a más de 120,000 habitantes. Los sistemas '
        'fotovoltaicos convencionales, basados en silicio cristalino, presentan una degradación acelerada '
        'en condiciones tropicales: estudios recientes (Zhang et al., 2023; Kumar & Singh, 2022) reportan '
        'pérdidas de eficiencia superiores al 25% en el primer año de operación en ambientes con humedad '
        'relativa mayor al 85%.'
    )
    doc.add_paragraph(
        'El vacío de conocimiento identificado radica en la falta de soluciones tecnológicas adaptadas '
        'específicamente al trópico húmedo centroamericano. Las celdas de perovskita han demostrado eficiencias '
        'superiores al 25% en laboratorio (NREL, 2024), pero su degradación en ambientes tropicales supera el '
        '40% en el primer año debido a la penetración de humedad en la estructura cristalina. Esta investigación '
        'propone desarrollar un recubrimiento nanoestructurado hidrofóbico que mitigue este efecto, representando '
        'un aporte original al estado del arte.'
    )
    doc.add_paragraph(
        'La relevancia social es significativa: el acceso a energía confiable impacta directamente en educación, '
        'salud y desarrollo económico rural. El valor teórico reside en la caracterización del comportamiento '
        'de materiales fotovoltaicos emergentes en condiciones tropicales reales, generando conocimiento aplicable '
        'a toda la región centroamericana. La pertinencia institucional se alinea con la Línea de Investigación '
        '"Energías Renovables para el Desarrollo Rural" de la Escuela de Ingeniería Electrónica, los objetivos '
        'estratégicos del TEC 2024-2028, y el ODS 7 de las Naciones Unidas.'
    )
    
    # ========== 5. OBJETIVO GENERAL ==========
    doc.add_heading('5. Objetivo general', level=1)
    doc.add_paragraph(
        'Diseñar, construir y validar experimentalmente un prototipo de sistema de energía solar fotovoltaica '
        'de alta eficiencia (≥22%) adaptado a las condiciones climáticas de las zonas rurales de Costa Rica, '
        'utilizando celdas de perovskita con recubrimiento nanoestructurado anti-humedad.'
    )
    
    # ========== 6. OBJETIVOS ESPECÍFICOS ==========
    doc.add_heading('6. Objetivos específicos', level=1)
    doc.add_paragraph('1. Analizar el comportamiento eléctrico y térmico de celdas solares de perovskita con diferentes recubrimientos nanoestructurados bajo condiciones controladas de humedad (70-95%) y temperatura (25-40°C).', style='List Number')
    doc.add_paragraph('2. Diseñar un sistema de seguimiento solar de doble eje de bajo costo (<₡500,000) optimizado para la latitud de Costa Rica (10°N).', style='List Number')
    doc.add_paragraph('3. Validar el prototipo funcional mediante pruebas de campo durante 6 meses en la comunidad de Santa Teresita de Turrialba, comparando su desempeño contra un sistema fotovoltaico convencional de referencia.', style='List Number')
    
    # ========== 7. ESTADO DEL ARTE ==========
    doc.add_heading('7. Estado del arte [Máximo dos páginas]', level=1)
    doc.add_paragraph(
        'La investigación en celdas solares de perovskita ha experimentado un crecimiento exponencial en la última '
        'década. Green et al. (2023) reportaron eficiencias récord del 26.1% en celdas de perovskita-silicio en '
        'tándem, publicadas en Nature Energy. Sin embargo, estos resultados se obtuvieron en condiciones de laboratorio '
        'controladas (humedad <40%, temperatura 25°C).'
    )
    doc.add_paragraph(
        'En el contexto tropical, Zhang, Liu y Wang (2023) identificaron que la degradación por humedad es el '
        'principal factor de falla, con pérdidas del 35-45% en eficiencia durante los primeros 6 meses de operación '
        'en climas húmedos. Su estudio, publicado en Advanced Energy Materials, propuso encapsulamientos de vidrio '
        'hermético que aumentan el costo en un 60%, haciéndolos inviables para aplicaciones rurales de bajo costo.'
    )
    doc.add_paragraph(
        'Kumar y Singh (2022) exploraron recubrimientos de óxido de grafeno reducida (rGO) como barrera contra la '
        'humedad, logrando reducir la degradación al 18% anual. No obstante, su metodología no consideró el efecto '
        'combinado de humedad y radiación UV, característico del trópico. Esta limitación es abordada en el presente '
        'proyecto mediante un recubrimiento híbrido rGO-TiO2 que combina barrera hidrofóbica con protección UV.'
    )
    doc.add_paragraph(
        'A nivel nacional, Rodríguez y Chaves (2024) del TEC evaluaron 15 sistemas fotovoltaicos instalados en '
        'comunidades rurales de Cartago, encontrando eficiencias promedio del 14.2% tras 2 años de operación, muy '
        'por debajo del 18% nominal. Este estudio, publicado en Revista Ingeniería, constituye el antecedente '
        'nacional más relevante y justifica la necesidad de soluciones tecnológicas adaptadas al contexto local.'
    )
    doc.add_paragraph(
        'El aporte original de esta investigación radica en: (1) el desarrollo de un recubrimiento nanoestructurado '
        'híbrido específico para el trópico húmedo centroamericano; (2) la validación empírica en condiciones reales '
        'de operación; y (3) el diseño de un sistema de seguimiento solar de bajo costo optimizado para la latitud '
        'de Costa Rica. Estos elementos no han sido abordados conjuntamente en la literatura existente.'
    )
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run('Referencias bibliográficas:').bold = True
    
    referencias = [
        'Green, M. A., Dunlop, E. D., Yoshita, M., Kopidakis, N., Bothe, K., Siefer, G., & Hao, X. (2023). Solar cell efficiency tables (Version 62). Progress in Photovoltaics, 31(7), 671-680. https://doi.org/10.1002/pip.3730',
        'Zhang, Y., Liu, Z., & Wang, H. (2023). Humidity-induced degradation mechanisms in perovskite solar cells: A comprehensive review. Advanced Energy Materials, 13(15), 2203456. https://doi.org/10.1002/aenm.202203456',
        'Kumar, A., & Singh, R. (2022). Reduced graphene oxide as moisture barrier for perovskite solar cells in tropical climates. Solar Energy Materials and Solar Cells, 245, 111876. https://doi.org/10.1016/j.solmat.2022.111876',
        'Rodríguez, F., & Chaves, M. (2024). Evaluación de desempeño de sistemas fotovoltaicos en zonas rurales de Costa Rica. Revista Ingeniería, 34(1), 45-62. https://doi.org/10.18845/ri.v34i1.6789',
        'NREL. (2024). Best Research-Cell Efficiency Chart. National Renewable Energy Laboratory. https://www.nrel.gov/pv/cell-efficiency.html',
        'Instituto Costarricense de Electricidad. (2024). Informe anual de calidad del servicio eléctrico 2023. San José: ICE.',
        'Smith, J., & Doe, A. (2023). Low-cost solar tracking systems for rural applications: A systematic review. Renewable and Sustainable Energy Reviews, 178, 113234. https://doi.org/10.1016/j.rser.2023.113234',
        'Martínez, L., & Herrera, P. (2023). Nanostructured hydrophobic coatings for photovoltaic protection in humid environments. ACS Applied Materials & Interfaces, 15(22), 26789-26801. https://doi.org/10.1021/acsami.3c04567',
        'Organización de las Naciones Unidas. (2023). Objetivos de Desarrollo Sostenible: Informe 2023. Nueva York: ONU.',
        'Ministerio de Planificación Nacional y Política Económica. (2018). Plan Nacional de Descarbonización 2018-2050. San José: MIDEPLAN.'
    ]
    
    for ref in referencias:
        doc.add_paragraph(ref, style='List Number')
    
    # ========== 8. METODOLOGÍA ==========
    doc.add_heading('8. Metodología', level=1)
    doc.add_paragraph(
        'Esta investigación utiliza un enfoque mixto con diseño experimental secuencial exploratorio, estructurado '
        'en tres fases complementarias que permiten la triangulación de resultados cuantitativos y cualitativos.'
    )
    
    p = doc.add_paragraph()
    p.add_run('Fase 1: Simulación computacional (Meses 1-6)').bold = True
    doc.add_paragraph(
        'Se utilizará MATLAB/Simulink con el módulo PV Array para modelar el comportamiento eléctrico de celdas '
        'de perovskita (CH3NH3PbI3) bajo diferentes condiciones de humedad (70%, 80%, 90%, 95%) y temperatura '
        '(25°C, 30°C, 35°C, 40°C). Se simularán 4 configuraciones de recubrimiento: (a) sin recubrimiento '
        '(control), (b) rGO puro, (c) TiO2 puro, y (d) híbrido rGO-TiO2 (propuesto). Variables de respuesta: '
        'eficiencia de conversión (%), factor de llenado, corriente de cortocircuito y voltaje de circuito abierto. '
        'Se realizarán 500 simulaciones por configuración (total: 2000 simulaciones) para asegurar robustez estadística.'
    )
    
    p = doc.add_paragraph()
    p.add_run('Fase 2: Construcción y pruebas de laboratorio (Meses 7-14)').bold = True
    doc.add_paragraph(
        'Se fabricarán 20 prototipos de celdas (5 por configuración) en el Laboratorio de Semiconductores del TEC. '
        'Las pruebas se realizarán en una cámara climática controlada (Espec SPC-180PF) que reproduce condiciones '
        'tropicales. Instrumentos: piranómetro Kipp & Zonen CMP11, datalogger Campbell Scientific CR1000X, '
        'multímetro Keysight 34465A. Se medirá la degradación de eficiencia cada 100 horas durante 1000 horas '
        'totales. Validez interna asegurada mediante grupo control y replicación. Confiabilidad verificada con '
        'coeficiente de variación <5%.'
    )
    
    p = doc.add_paragraph()
    p.add_run('Fase 3: Validación en campo (Meses 15-24)').bold = True
    doc.add_paragraph(
        'Se instalarán 2 sistemas completos (1 prototipo + 1 convencional de referencia) en la comunidad de Santa '
        'Teresita de Turrialba (9.87°N, 83.68°W, 620 msnm). Muestra: 30 familias beneficiarias seleccionadas por '
        'muestreo intencional según criterios de vulnerabilidad energética. Instrumentos de recolección: (a) datos '
        'técnicos automáticos cada 15 minutos vía IoT (ESP32 + sensores), (b) encuestas de satisfacción Likert '
        'trimestrales (α de Cronbach >0.8), (c) entrevistas semiestructuradas a 10 usuarios clave. Análisis: '
        'ANOVA de medidas repetidas para datos técnicos, análisis temático para datos cualitativos (software NVivo 14).'
    )
    
    # ========== 9. PLAN DE ACCIÓN ==========
    doc.add_heading('9. Plan de acción y plan de gestión de riesgos', level=1)
    doc.add_paragraph(
        'El plan de acción detallado se encuentra en el archivo Excel adjunto "Plan de Acción - Gestión de Riesgos - 2027.xlsx". '
        'A continuación se presenta un resumen ejecutivo:'
    )
    
    tabla_plan = doc.add_table(rows=5, cols=4)
    tabla_plan.style = 'Table Grid'
    set_table_borders(tabla_plan)
    
    headers_plan = ['Fase', 'Actividad principal', 'Duración', 'Responsable']
    for i, h in enumerate(headers_plan):
        tabla_plan.rows[0].cells[i].text = h
        set_cell_shading(tabla_plan.rows[0].cells[i], 'D9E2F3')
    
    fases = [
        ('Fase 1', 'Simulación y modelado computacional', 'Meses 1-6', 'Dr. Pérez'),
        ('Fase 2', 'Fabricación y pruebas de laboratorio', 'Meses 7-14', 'Ing. González'),
        ('Fase 3', 'Instalación y validación en campo', 'Meses 15-24', 'Dr. Pérez / Ing. González'),
        ('Transversal', 'Elaboración de artículos científicos', 'Meses 6-24', 'Todo el equipo')
    ]
    
    for row_idx, (fase, actividad, duracion, resp) in enumerate(fases, 1):
        cells = tabla_plan.rows[row_idx].cells
        cells[0].text = fase
        cells[1].text = actividad
        cells[2].text = duracion
        cells[3].text = resp
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run('Riesgos principales identificados:').bold = True
    doc.add_paragraph('1. Retraso en importación de materiales de perovskita (probabilidad: media, impacto: alto). Mitigación: proveedor alterno en México.', style='List Number')
    doc.add_paragraph('2. Falla de equipos de medición en campo por condiciones climáticas (probabilidad: media, impacto: medio). Mitigación: equipos de respaldo y seguro técnico.', style='List Number')
    doc.add_paragraph('3. Baja participación de comunidad en encuestas (probabilidad: baja, impacto: medio). Mitigación: vinculación previa con ADI local.', style='List Number')
    
    # ========== 10. PRESUPUESTO ==========
    doc.add_heading('10. Presupuesto', level=1)
    doc.add_paragraph('Cuadro 4. Presupuesto solicitado por año')
    
    tabla_pres = doc.add_table(rows=5, cols=4)
    tabla_pres.style = 'Table Grid'
    set_table_borders(tabla_pres)
    
    headers_pres = ['Año', 'Presupuesto operativo', 'Bienes duraderos', 'Total']
    for i, h in enumerate(headers_pres):
        tabla_pres.rows[0].cells[i].text = h
        set_cell_shading(tabla_pres.rows[0].cells[i], 'D9E2F3')
    
    presupuesto = [
        ('2027', '₡18,500,000', '₡12,000,000', '₡30,500,000'),
        ('2028', '₡14,000,000', '₡0', '₡14,000,000'),
        ('2029', '₡500,000', '₡0', '₡500,000'),
        ('Total', '₡33,000,000', '₡12,000,000', '₡45,000,000')
    ]
    
    for row_idx, (ano, op, bd, total) in enumerate(presupuesto, 1):
        cells = tabla_pres.rows[row_idx].cells
        cells[0].text = ano
        cells[1].text = op
        cells[2].text = bd
        cells[3].text = total
        if row_idx == 4:
            for cell in cells:
                set_cell_shading(cell, 'D9E2F3')
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run('Rubros principales: ').bold = True
    p.add_run('Equipos de medición y laboratorio (40%), Componentes electrónicos y materiales de perovskita (30%), '
              'Viáticos y giras de campo (20%), Publicaciones y divulgación (10%).')
    
    # ========== 11. FINANCIAMIENTO EXTERNO ==========
    doc.add_heading('11. Financiamiento Externo, contrapartida y cofinanciamiento', level=1)
    doc.add_paragraph('El proyecto no cuenta con financiamiento externo, contrapartida ni cofinanciamiento adicional. La totalidad de los recursos será solicitada a la VIE del TEC.')
    
    # ========== 12. COMPROMISOS DE PRODUCCIÓN ACADÉMICA ==========
    doc.add_heading('12. Compromisos de producción académica y tecnológica', level=1)
    doc.add_heading('12.a. Para proyectos de investigación básica y aplicada', level=2)
    
    p = doc.add_paragraph()
    p.add_run('1. Total de horas semanales propuestas: ').bold = True
    p.add_run('20 horas (10 VIE + 6 VIE + 4 REC)')
    
    p = doc.add_paragraph()
    p.add_run('2. Cantidad mínima de productos requeridos: ').bold = True
    p.add_run('2 opciones (rango 11-20 horas)')
    
    doc.add_paragraph()
    doc.add_paragraph('Cuadro 7. Selección del tipo de productos académicos')
    
    tabla_prod = doc.add_table(rows=4, cols=4)
    tabla_prod.style = 'Table Grid'
    set_table_borders(tabla_prod)
    
    headers_prod = ['Selección', 'Cantidad', 'Opción de Producto', 'Objetivo específico asociado']
    for i, h in enumerate(headers_prod):
        tabla_prod.rows[0].cells[i].text = h
        set_cell_shading(tabla_prod.rows[0].cells[i], 'D9E2F3')
    
    productos = [
        ('☒', '1', 'Opción 1: Artículo científico en WoS/Scopus', 'Objetivo específico 1'),
        ('☒', '1', 'Opción 1: Artículo científico en WoS/Scopus', 'Objetivo específico 3'),
        ('☐', '0', 'Opción 2: Dos artículos en SciELO/Redalyc', 'N/A'),
    ]
    
    for row_idx, (sel, cant, op, obj) in enumerate(productos, 1):
        cells = tabla_prod.rows[row_idx].cells
        cells[0].text = sel
        cells[1].text = cant
        cells[2].text = op
        cells[3].text = obj
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run('3. Otros resultados y activos tecnológicos:').bold = True
    doc.add_paragraph('1. Producto adicional 1: Prototipo funcional de sistema solar de alta eficiencia (entregado a Dirección de Investigación).', style='List Number')
    doc.add_paragraph('2. Producto adicional 2: Guía técnica para implementación de sistemas solares en trópico húmedo (documento técnico).', style='List Number')
    
    # ========== 13. RESGUARDO Y DEPÓSITO ==========
    doc.add_heading('13. Resguardo y depósito de productos', level=1)
    add_checkbox(doc, checked=True, text="Sí, acepto el compromiso de depositar todos los productos en el Repositorio Institucional.")
    add_checkbox(doc, checked=True, text="Sí, acepto el compromiso de entregar el respaldo técnico de software y bases de datos.")
    
    # ========== 14. ESTRATEGIA DE DIVULGACIÓN ==========
    doc.add_heading('14. Estrategia de divulgación y socialización', level=1)
    
    p = doc.add_paragraph()
    p.add_run('1.a. Divulgación científica/técnica:').bold = True
    doc.add_paragraph('Presentación de resultados en Congreso Internacional de Energías Renovables (CIER 2028, Panamá), 2 charlas técnicas en la Escuela de Ingeniería Electrónica del TEC, y 1 webinar abierto a la comunidad académica latinoamericana.')
    
    p = doc.add_paragraph()
    p.add_run('1.b. Canales Institucionales:').bold = True
    doc.add_paragraph('Nota en Investiga.TEC, publicación en página web de la Escuela de Ingeniería Electrónica, 3 publicaciones en redes sociales del TEC, y ficha técnica en el Portal Público de Orión.')
    
    p = doc.add_paragraph()
    p.add_run('1.c. Eventos de Socialización:').bold = True
    doc.add_paragraph('2 talleres con la comunidad de Santa Teresita de Turrialba (inicio y final del proyecto), 1 presentación ante la Asociación de Desarrollo Integral local, y 1 feria tecnológica en el campus central del TEC.')
    
    p = doc.add_paragraph()
    p.add_run('1.d. Medios Masivos:').bold = True
    doc.add_paragraph('Entrevista en Radio Nacional de Costa Rica (programa "Ciencia para Todos"), nota en periódico La Nación (sección Tecnología), y participación en programa "Tecnología al Día" de Canal 13.')
    
    # ========== 15. ASPECTOS ÉTICOS ==========
    doc.add_heading('15. Aspectos Éticos', level=1)
    
    doc.add_heading('1. ¿Involucra participación de seres humanos?', level=2)
    add_checkbox(doc, checked=True, text="Sí")
    doc.add_paragraph('Se aplicarán encuestas de satisfacción y entrevistas semiestructuradas a 30 familias beneficiarias y 10 usuarios clave. Se requerirá aval del Comité Ético Científico (CEC) del TEC.')
    
    doc.add_heading('2. ¿Involucra biodiversidad?', level=2)
    add_checkbox(doc, checked=True, text="No")
    
    doc.add_heading('3. ¿Involucra animales?', level=2)
    add_checkbox(doc, checked=True, text="No")
    
    doc.add_heading('4. ¿Involucra territorios indígenas?', level=2)
    add_checkbox(doc, checked=True, text="No")
    
    doc.add_heading('15.b. Documentación del aval', level=2)
    add_checkbox(doc, checked=True, text="Comité Ético Científico (CEC) – CEC-TEC-2026")
    doc.add_paragraph('La fase experimental con usuarios no iniciará hasta contar con el aval formal del CEC. Esta medida de mitigación está incorporada en el Plan de Riesgos.')
    
    # ========== 16. HOJA DE RUTA ==========
    doc.add_heading('16. Hoja de ruta', level=1)
    
    p = doc.add_paragraph()
    p.add_run('1. Nombre de la línea de investigación:').bold = True
    doc.add_paragraph('Energías Renovables para el Desarrollo Rural (registrada ante VIE el 15 de marzo de 2022, código LIN-2022-047).')
    
    p = doc.add_paragraph()
    p.add_run('2. Objetivo estratégico (largo plazo):').bold = True
    doc.add_paragraph('Lograr que el 30% de las comunidades rurales del TEC (aproximadamente 100 comunidades) cuenten con sistemas autónomos de energía solar de alta eficiencia para el año 2030, reduciendo la dependencia de la red eléctrica convencional en un 60% y disminuyendo las emisiones de CO2 en 500 toneladas anuales.')
    
    p = doc.add_paragraph()
    p.add_run('3. Duración total del proceso:').bold = True
    doc.add_paragraph('10 años (2022-2032), estructurados en 4 fases de proyectos interconectados.')
    
    p = doc.add_paragraph()
    p.add_run('4. Desglose por fases:').bold = True
    doc.add_paragraph('Fase 1 (2022-2024): "Optimización de celdas solares de perovskita" (VIE-2024-015, finalizado). Resultados: 1 artículo Scopus, caracterización de materiales.', style='List Number')
    doc.add_paragraph('Fase 2 (2027-2029): Proyecto actual. Resultados esperados: prototipo funcional, 2 artículos Scopus, guía técnica.', style='List Number')
    doc.add_paragraph('Fase 3 (2030-2031): "Escalamiento a 50 comunidades" (por formular en 2029).', style='List Number')
    doc.add_paragraph('Fase 4 (2032): "Consolidación y transferencia tecnológica al sector productivo".', style='List Number')
    
    p = doc.add_paragraph()
    p.add_run('5. Productos intermedios por fase:').bold = True
    doc.add_paragraph('Fase 1: 1 artículo publicado, 1 tesis de maestría defendida.', style='List Number')
    doc.add_paragraph('Fase 2: 1 prototipo validado, 2 artículos publicados, 1 guía técnica, 1 patente solicitada.', style='List Number')
    doc.add_paragraph('Fase 3: 50 sistemas instalados, 100 familias beneficiadas, 3 artículos adicionales.', style='List Number')
    
    # ========== 17. REFERENCIAS ==========
    doc.add_heading('17. Referencias', level=1)
    doc.add_paragraph('Ver sección 7 (Estado del arte) para el listado completo de 10 referencias bibliográficas de fuentes primarias publicadas en los últimos 5 años.')
    
    # ========== 18. DECLARACIÓN JURADA ==========
    doc.add_heading('18. Declaración jurada de veracidad y compromiso institucional', level=1)
    doc.add_paragraph(
        'Por este medio, manifiesto y declaro bajo fe de juramento lo siguiente:'
    )
    doc.add_paragraph('1. Que la información y los datos consignados en cada folio de esta propuesta son íntegros, veraces y correctos.', style='List Number')
    doc.add_paragraph('2. Que los documentos adjuntos y las firmas digitales que los respaldan son auténticos y han sido gestionados conforme a los requerimientos técnicos y administrativos aprobados por el CIE.', style='List Number')
    doc.add_paragraph('3. Que tengo pleno conocimiento de que la titularidad y protección de la propiedad intelectual de todos los productos, activos y resultados derivados de este proyecto se regirán estrictamente por la normativa institucional vigente y las disposiciones del Centro de Vinculación.', style='List Number')
    doc.add_paragraph('4. Que esta declaración se rinde en estricto cumplimiento de lo establecido en el artículo 96 del Estatuto Orgánico y los artículos 13, 21 y 34 del Reglamento de Investigación y Extensión del Instituto Tecnológico de Costa Rica.', style='List Number')
    
    doc.add_paragraph()
    doc.add_paragraph('Firma de la persona investigadora coordinadora')
    
    tabla_firma = doc.add_table(rows=3, cols=2)
    tabla_firma.style = 'Table Grid'
    set_table_borders(tabla_firma)
    tabla_firma.rows[0].cells[0].text = 'Nombre completo'
    tabla_firma.rows[0].cells[1].text = 'Dr. Juan Carlos Pérez Rodríguez'
    tabla_firma.rows[1].cells[0].text = 'Número de cédula'
    tabla_firma.rows[1].cells[1].text = '1-0789-0234'
    tabla_firma.rows[2].cells[0].text = 'Firma digital'
    tabla_firma.rows[2].cells[1].text = '[Firma digital certificada]'
    
    set_cell_shading(tabla_firma.rows[0].cells[0], 'D9E2F3')
    set_cell_shading(tabla_firma.rows[1].cells[0], 'D9E2F3')
    set_cell_shading(tabla_firma.rows[2].cells[0], 'D9E2F3')
    
    # Pie de página
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run('Elaborado por: Dr. Juan Carlos Pérez Rodríguez\nRevisado por: Ing. María Elena González Vargas\nValidado por: Consejo de Investigación y Extensión')
    run.font.size = Pt(9)
    run.italic = True
    
    # Guardar
    nombre_local = "Form-04_Completo.docx"
    doc.save(nombre_local)
    print(f"✅ Documento generado localmente: {nombre_local}")
    return nombre_local

def subir_y_guardar_en_bd(ruta_local):
    # Cambiado a la propuesta 13 para tus pruebas
    ruta_s3 = "propuestas/13/Form-04.docx"
    print(f"⬆ Subiendo a Supabase Storage: {ruta_s3} ...")
    
    try:
        # 1. Subir el archivo a Supabase
        s3_client.upload_file(
            ruta_local, 
            S3_BUCKET_NAME, 
            ruta_s3, 
            ExtraArgs={"ContentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        )
        print("✅ ¡Archivo subido exitosamente a Supabase Storage!")
        
        # 2. Calcular tamaño y checksum del archivo local
        with open(ruta_local, "rb") as f:
            contenido = f.read()
            tamanio_bytes = len(contenido)
            checksum = hashlib.sha256(contenido).hexdigest()
        
        # 3. Construir la URL pública (ajusta 'uuhejjfivuwphsahpqhf' si tu project ref es otro)
        url_publica = f"https://uuhejjfivuwphsahpqhf.supabase.co/storage/v1/object/public/{S3_BUCKET_NAME}/{ruta_s3}"
        
        # 4. Insertar el registro en la base de datos
        sesion = SessionLocal()
        try:
            nuevo_documento = PropuestaDocumentos(
                propuestaId=13,               # La propuesta de prueba
                tipoDocumentoId=1,            # 1 = Formulario 04
                rutaArchivo=url_publica,      # URL pública del archivo
                nombreArchivo="Form-04_Completo.docx",
                tamanioBytes=tamanio_bytes,
                checksum=checksum,
                usuarioCargaId=1,             # ID de usuario de prueba (ajusta si es necesario)
                activo=True,
                usuarioAuditoriaId=1,
                ultimaAuditoria=datetime.now(timezone.utc)
            )
            sesion.add(nuevo_documento)
            sesion.commit()
            print("✅ ¡Registro guardado exitosamente en la base de datos!")
        except Exception as e:
            sesion.rollback()
            print(f"❌ Error al guardar en la base de datos: {e}")
        finally:
            sesion.close()
            
        # 5. Limpiar el archivo local
        os.remove(ruta_local)
        print("🧹 Archivo local eliminado.")
        
    except Exception as e:
        print(f"❌ Error durante el proceso: {e}")

if __name__ == "__main__":
    archivo = crear_documento()
    subir_y_guardar_en_bd(archivo)