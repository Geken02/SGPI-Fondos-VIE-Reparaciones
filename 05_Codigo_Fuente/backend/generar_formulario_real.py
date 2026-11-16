"""
Generador de Form-04 de prueba para el SGPI
Crea un archivo .docx con la estructura oficial de la VIE 2027
para probar el parser form04_parser.py
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


def crear_documento():
    doc = Document()
    
    # =========================================================================
    # ENCABEZADO OFICIAL
    # =========================================================================
    header = doc.add_paragraph()
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header.add_run("Vicerrectoría de Investigación y Extensión")
    run.bold = True
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0, 40, 85)
    
    subheader = doc.add_paragraph()
    subheader.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subheader.add_run("Formulación para proyectos de Investigación Básica, Aplicada o Desarrollo Tecnológico")
    run.font.size = Pt(11)
    
    subheader2 = doc.add_paragraph()
    subheader2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subheader2.add_run("Convocatoria interna para investigación (Recursos VIE)")
    run.font.size = Pt(10)
    run.italic = True
    
    # =========================================================================
    # TABLA DE DATOS BÁSICOS
    # =========================================================================
    tabla_datos = doc.add_table(rows=3, cols=2)
    tabla_datos.style = 'Table Grid'
    
    tabla_datos.cell(0, 0).text = "Nombre del proyecto"
    tabla_datos.cell(0, 1).text = "Sistema de monitoreo inteligente basado en IoT y Machine Learning para la optimización del riego en cultivos de café de altura en Costa Rica"
    
    tabla_datos.cell(1, 0).text = "Fecha de inicio"
    tabla_datos.cell(1, 1).text = "01/02/2027"
    
    tabla_datos.cell(2, 0).text = "Fecha de finalización"
    tabla_datos.cell(2, 1).text = "31/01/2029"
    
    # =========================================================================
    # SECCIÓN 1: PREGUNTAS GENERALES
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("1. Preguntas generales")
    run.bold = True
    run.font.size = Pt(12)
    
    # 1.a Modalidad
    doc.add_paragraph("1.a. La modalidad de la propuesta es:")
    doc.add_paragraph("☐ investigación básica")
    doc.add_paragraph("☐ investigación aplicada")
    doc.add_paragraph("☑ investigación básica y aplicada")  # ✅ MARCADA
    doc.add_paragraph("☐ desarrollo tecnológico")
    
    # 1.b Otras fuentes
    doc.add_paragraph("1.b. ¿Ha sido esta propuesta sometida, de forma parcial o total, a la consideración de otras fuentes de financiamiento (internas o externas) o FUNDATEC?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    # 1.c Vinculación técnica
    doc.add_paragraph("1.c. ¿Existe vinculación técnica o de continuidad entre esta propuesta con otros proyectos de investigación inscritos oficialmente ante la VIE o con una hoja de ruta?")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí")  # ✅ MARCADA
    doc.add_paragraph("En caso afirmativo, especifique:")
    doc.add_paragraph("1. Nombre del proyecto relacionado: FVIE-2025-012 'Sensores de bajo costo para agricultura'")
    doc.add_paragraph("2. Tipo de relación: Continuidad de proyecto finalizado")
    
    # 1.d Problemas nacionales
    doc.add_paragraph("1.d. ¿Atiende esta propuesta la resolución de problemas prioritarios identificados por planes nacionales, sectoriales o entes externos de relevancia?")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí")  # ✅ MARCADA
    doc.add_paragraph("En caso afirmativo, especifique el problema y el documento de referencia:")
    doc.add_paragraph("Atiende el ODS 6 (Agua limpia) y ODS 12 (Producción responsable), alineado con el Plan Nacional de Desarrollo 2024-2028 en el eje de agricultura sostenible.")
    
    # 1.e Instrumento jurídico
    doc.add_paragraph("1.e. ¿Para la ejecución técnica de esta propuesta, se requiere la formalización de un instrumento jurídico entre el ITCR y entes externos?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    # 1.f Convenio marco
    doc.add_paragraph("1.f. ¿Se fundamenta esta iniciativa en un convenio marco de cooperación técnica actualmente vigente entre el ITCR y la entidad colaboradora?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    # 1.g Base posgrado
    doc.add_paragraph("1.g. ¿Corresponde esta propuesta, parcial o totalmente, a la investigación base para que una persona opte por un grado académico superior?")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí, parcial")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí, totalmente")
    doc.add_paragraph("En caso afirmativo, detalle los datos del programa de posgrado:")
    doc.add_paragraph("1. Nombre de la persona candidata: Juan Pérez")
    doc.add_paragraph("2. Programa y grado académico a obtener: Maestría en Ingeniería Electrónica")
    doc.add_paragraph("3. Universidad que acredita el grado: Instituto Tecnológico de Costa Rica (TEC)")
    
    # 1.h Confidencialidad
    doc.add_paragraph("1.h. ¿Contiene el planteamiento del problema o la metodología de esta propuesta información sensible de terceros o datos sujetos a cláusulas de protección y confidencialidad?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    # 1.i Potencial PI
    doc.add_paragraph("1.i. ¿La propuesta presenta el potencial de generar resultados susceptibles de protección mediante propiedad intelectual?")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí")  # ✅ MARCADA
    doc.add_paragraph("En caso afirmativo indique el número de oficio del dictamen del Centro de Vinculación:")
    doc.add_paragraph("CV-DICT-2026-045")
    
    # 1.j Innovación
    doc.add_paragraph("1.j. ¿Considera que los resultados del proyecto se traducirán en una innovación conforme a los criterios institucionales?")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí")  # ✅ MARCADA
    doc.add_paragraph("En caso afirmativo, seleccione el tipo de innovación predominante:")
    doc.add_paragraph("☐ de Proceso")
    doc.add_paragraph("☑ de Producto")  # ✅ MARCADA
    
    # 1.k TRL
    doc.add_paragraph("1.k. Si es una iniciativa de desarrollo tecnológico, indique el nivel de madurez tecnológica (TRL) que mejor lo describe:")
    
    # Cuadro 1 - TRL
    tabla_trl = doc.add_table(rows=10, cols=3)
    tabla_trl.style = 'Table Grid'
    
    tabla_trl.cell(0, 0).text = "Escala de niveles TRL"
    tabla_trl.cell(0, 1).text = "Descripción de los niveles de madurez tecnológica"
    tabla_trl.cell(0, 2).text = "Nivel de TRL esperado"
    
    trl_data = [
        ("TRL 1: Principios básicos observados", "Se identifican y documentan principios científicos básicos..."),
        ("TRL 2: Concepto tecnológico formulado", "Se plantea una posible aplicación tecnológica..."),
        ("TRL 3: Prueba experimental de concepto", "Se obtiene evidencia experimental inicial..."),  # ✅ SELECCIONADO
        ("TRL 4: Tecnología validada en laboratorio", "La tecnología se valida en condiciones controladas..."),
        ("TRL 5: Tecnología validada en entorno relevante", "La tecnología demuestra funcionalidad..."),
        ("TRL 6: Tecnología demostrada en entorno relevante", "Se demuestra un prototipo..."),
        ("TRL 7: Demostración en entorno operativo real", "La tecnología opera en condiciones reales..."),
        ("TRL 8: Sistema completo y calificado", "La tecnología está completa y validada..."),
        ("TRL 9: Tecnología probada en operación real", "La tecnología se encuentra implementada...")
    ]
    
    for i, (nivel, desc) in enumerate(trl_data, start=1):
        tabla_trl.cell(i, 0).text = nivel
        tabla_trl.cell(i, 1).text = desc
        if i == 3:  # TRL 3 seleccionado
            tabla_trl.cell(i, 2).text = "☑"
        else:
            tabla_trl.cell(i, 2).text = "☐"
    
    # =========================================================================
    # SECCIÓN 2: RESUMEN
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("2. Resumen [Máximo 500 palabras]")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "El cultivo de café en Costa Rica enfrenta desafíos críticos debido a la variabilidad climática "
        "y el uso ineficiente del agua. Esta propuesta busca diseñar y validar un sistema de riego "
        "inteligente basado en Internet de las Cosas (IoT) y algoritmos de Machine Learning. El sistema "
        "utilizará sensores de bajo costo para monitorear la humedad del suelo y variables meteorológicas "
        "en tiempo real, procesando los datos mediante un modelo predictivo que optimice los ciclos de "
        "riego. Se espera reducir el consumo hídrico en un 20% y aumentar la productividad del grano "
        "en un 15%, generando una solución escalable para pequeños y medianos productores cafetaleros "
        "de altura."
    )
    
    doc.add_paragraph("Palabras claves:")
    doc.add_paragraph("Internet de las Cosas, Machine Learning, Agricultura de precisión, Café, Optimización hídrica")
    
    doc.add_paragraph("Abstract")
    doc.add_paragraph(
        "Coffee cultivation in Costa Rica faces critical challenges due to climate variability and "
        "inefficient water use. This proposal aims to design and validate a smart irrigation system "
        "based on Internet of Things (IoT) and Machine Learning algorithms. The system will use "
        "low-cost sensors to monitor soil moisture and meteorological variables in real-time, "
        "processing data through a predictive model to optimize irrigation cycles. We expect to "
        "reduce water consumption by 20% and increase bean productivity by 15%, generating a "
        "scalable solution for small and medium-sized high-altitude coffee producers."
    )
    
    doc.add_paragraph("Keywords:")
    doc.add_paragraph("Internet of Things, Machine Learning, Precision Agriculture, Coffee, Water optimization")
    
    # =========================================================================
    # SECCIÓN 3: EQUIPO DE INVESTIGACIÓN
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("3. Equipo de investigación")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("Cuadro 2. Investigadores que son funcionarios del TEC")
    
    # Cuadro 2
    tabla_equipo = doc.add_table(rows=3, cols=6)
    tabla_equipo.style = 'Table Grid'
    
    # Headers
    headers = ["Nombre y apellidos", "ID ORCID", "Instancia académica", "Condición (Rol)", "Cantidad y tipo de horas", "Periodo de nombramiento"]
    for i, h in enumerate(headers):
        tabla_equipo.cell(0, i).text = h
    
    # Fila 1: Coordinador
    tabla_equipo.cell(1, 0).text = "Gerald Hernández Gamboa"
    tabla_equipo.cell(1, 1).text = "0000-0001-2345-6789"
    tabla_equipo.cell(1, 2).text = "Escuela de Ingeniería en Electrónica"
    tabla_equipo.cell(1, 3).text = "Coordinador(a)"
    tabla_equipo.cell(1, 4).text = "10 h VIE"
    tabla_equipo.cell(1, 5).text = "2027-2029"
    
    # Fila 2: Co-investigador
    tabla_equipo.cell(2, 0).text = "Nahomy Gómez Ruiz"
    tabla_equipo.cell(2, 1).text = "0000-0002-3456-7890"
    tabla_equipo.cell(2, 2).text = "Escuela de Ingeniería en Computación"
    tabla_equipo.cell(2, 3).text = "Co-Investigador(a)"
    tabla_equipo.cell(2, 4).text = "5 h VIE"
    tabla_equipo.cell(2, 5).text = "2027-2029"
    
    doc.add_paragraph()
    doc.add_paragraph("Cuadro 3. Colaboradores externos")
    
    # Cuadro 3
    tabla_colab = doc.add_table(rows=2, cols=3)
    tabla_colab.style = 'Table Grid'
    
    tabla_colab.cell(0, 0).text = "Nombre completo del colaborador externo"
    tabla_colab.cell(0, 1).text = "ID ORCID"
    tabla_colab.cell(0, 2).text = "Institución o empresa que representa"
    
    tabla_colab.cell(1, 0).text = "Dr. Carlos Mora Jiménez"
    tabla_colab.cell(1, 1).text = "0000-0003-4567-8901"
    tabla_colab.cell(1, 2).text = "Universidad de Costa Rica (UCR)"
    
    # =========================================================================
    # SECCIONES 4-8: TEXTO NARRATIVO
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("4. Problema de investigación y su importancia [Máximo una página]")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "A pesar de que Costa Rica es un líder en producción de café de especialidad, el 60% de los "
        "pequeños productores en zonas de altura carecen de sistemas de riego tecnificados, dependiendo "
        "exclusivamente de la lluvia. Esto resulta en una merma del 15% en la producción durante años "
        "de sequía (Fenómeno El Niño). No existe en el país una solución de bajo costo que integre "
        "sensores IoT con modelos predictivos adaptados a la topografía y microclimas de las zonas "
        "cafetaleras locales. Esta investigación aborda un problema prioritario nacional alineado con "
        "los ODS 6 y 12, y contribuye a la línea de investigación de Tecnologías para la Agricultura "
        "Sostenible de la Escuela de Electrónica."
    )
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("5. Objetivo general:")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "Diseñar, implementar y validar un sistema de riego inteligente basado en IoT y Machine Learning "
        "para optimizar el uso del agua en cultivos de café de altura en Costa Rica."
    )
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("6. Objetivos específicos:")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "1. Caracterizar los parámetros edafoclimáticos críticos para el cultivo de café en la región "
        "de Los Santos mediante el despliegue de una red de sensores IoT."
    )
    doc.add_paragraph(
        "2. Desarrollar y entrenar un algoritmo de Machine Learning capaz de predecir la demanda hídrica "
        "del cultivo con una precisión superior al 85%."
    )
    doc.add_paragraph(
        "3. Validar el prototipo del sistema de riego inteligente en una finca cafetalera piloto, midiendo "
        "el ahorro hídrico y el impacto en la productividad."
    )
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("7. Estado del arte [Máximo dos páginas]")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "Investigaciones recientes como las de Smith et al. (2023) en 'Smart Agriculture Journal' demuestran "
        "que el uso de redes de sensores inalámbricos puede reducir el consumo de agua hasta en un 30%. "
        "En Costa Rica, el TEC ha desarrollado prototipos iniciales (Rodríguez, 2022), pero carecen de "
        "integración con modelos predictivos. Este proyecto llena ese vacío al combinar hardware de bajo "
        "costo con algoritmos de aprendizaje automático (Random Forest y LSTM) específicos para la fenología "
        "del café."
    )
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("8. Metodología")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "Se utilizará un enfoque mixto (cuantitativo-experimental). Fase 1: Desplegar 20 nodos sensores "
        "(ESP32 con sensores de humedad capacitivos) en la finca piloto. Fase 2: Recolección de datos "
        "durante 3 meses para entrenar el modelo ML en Python (Scikit-learn). Fase 3: Implementación del "
        "sistema de control actuado (válvulas solenoides) y validación mediante un diseño experimental de "
        "bloques al azar, comparando el grupo de control (riego tradicional) con el grupo experimental "
        "(riego inteligente)."
    )
    
    # =========================================================================
    # SECCIÓN 9: PLAN DE ACCIÓN (referencia al Form-05)
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("9. Plan de acción y plan de gestión de riesgos")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "El plan de acción y plan de gestión de riesgos deberá completarse en el archivo de Microsoft "
        "Excel 'Plan de Acción - Gestión de Riesgos – 2027' adjunto como Form-05."
    )
    
    # =========================================================================
    # SECCIÓN 10: PRESUPUESTO
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("10. Presupuesto")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("Cuadro 4. Presupuesto solicitado por año")
    
    # Cuadro 4
    tabla_presup = doc.add_table(rows=5, cols=4)
    tabla_presup.style = 'Table Grid'
    
    tabla_presup.cell(0, 0).text = "Año"
    tabla_presup.cell(0, 1).text = "Monto total solicitado de presupuesto operativo"
    tabla_presup.cell(0, 2).text = "Monto total solicitado de presupuesto de bienes duraderos"
    tabla_presup.cell(0, 3).text = "Total"
    
    tabla_presup.cell(1, 0).text = "2027"
    tabla_presup.cell(1, 1).text = "₡2,500,000"
    tabla_presup.cell(1, 2).text = "₡1,500,000"
    tabla_presup.cell(1, 3).text = "₡4,000,000"
    
    tabla_presup.cell(2, 0).text = "2028"
    tabla_presup.cell(2, 1).text = "₡1,200,000"
    tabla_presup.cell(2, 2).text = "₡0"
    tabla_presup.cell(2, 3).text = "₡1,200,000"
    
    tabla_presup.cell(3, 0).text = "2029"
    tabla_presup.cell(3, 1).text = "₡0"
    tabla_presup.cell(3, 2).text = "₡0"
    tabla_presup.cell(3, 3).text = "₡0"
    
    tabla_presup.cell(4, 0).text = "Total"
    tabla_presup.cell(4, 1).text = "₡3,700,000"
    tabla_presup.cell(4, 2).text = "₡1,500,000"
    tabla_presup.cell(4, 3).text = "₡5,200,000"
    
    # =========================================================================
    # SECCIÓN 11: FINANCIAMIENTO EXTERNO
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("11. Financiamiento Externo, contrapartida y cofinanciamiento")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("Cuadro 5. Desglose de fuente de recursos financieros adicionales")
    
    # Cuadro 5
    tabla_finan = doc.add_table(rows=5, cols=5)
    tabla_finan.style = 'Table Grid'
    
    tabla_finan.cell(0, 0).text = "Desglose"
    tabla_finan.cell(0, 1).text = "Año 1"
    tabla_finan.cell(0, 2).text = "Año 2"
    tabla_finan.cell(0, 3).text = "Año 3"
    tabla_finan.cell(0, 4).text = "Número oficio"
    
    tabla_finan.cell(1, 0).text = "Financiamiento externo"
    tabla_finan.cell(1, 1).text = "₡0"
    tabla_finan.cell(1, 2).text = "₡0"
    tabla_finan.cell(1, 3).text = "₡0"
    tabla_finan.cell(1, 4).text = ""
    
    tabla_finan.cell(2, 0).text = "Contrapartida"
    tabla_finan.cell(2, 1).text = "₡500,000"
    tabla_finan.cell(2, 2).text = "₡0"
    tabla_finan.cell(2, 3).text = "₡0"
    tabla_finan.cell(2, 4).text = "OF-ESC-EL-2027-008"
    
    tabla_finan.cell(3, 0).text = "Cofinanciamiento"
    tabla_finan.cell(3, 1).text = "₡0"
    tabla_finan.cell(3, 2).text = "₡0"
    tabla_finan.cell(3, 3).text = "₡0"
    tabla_finan.cell(3, 4).text = ""
    
    tabla_finan.cell(4, 0).text = "Total"
    tabla_finan.cell(4, 1).text = "₡500,000"
    tabla_finan.cell(4, 2).text = "₡0"
    tabla_finan.cell(4, 3).text = "₡0"
    tabla_finan.cell(4, 4).text = ""
    
    # =========================================================================
    # SECCIÓN 12: COMPROMISOS DE PRODUCCIÓN (12a - Investigación Básica/Aplicada)
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("12. Compromisos de producción académica y tecnológica")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("12.a. Para proyectos de investigación básica, aplicada, o ambas")
    
    doc.add_paragraph("Total de horas semanales propuestas en el proyecto: [15] horas.")
    
    doc.add_paragraph("Cuadro 6. Selección de cantidad de productos académicos")
    
    tabla_prod = doc.add_table(rows=4, cols=3)
    tabla_prod.style = 'Table Grid'
    
    tabla_prod.cell(0, 0).text = "Total de horas"
    tabla_prod.cell(0, 1).text = "Productos mínimos requeridos"
    tabla_prod.cell(0, 2).text = "Selección del compromiso"
    
    tabla_prod.cell(1, 0).text = "1 a 10 horas"
    tabla_prod.cell(1, 1).text = "1 opción"
    tabla_prod.cell(1, 2).text = "☐"
    
    tabla_prod.cell(2, 0).text = "11 a 20 horas"
    tabla_prod.cell(2, 1).text = "2 opciones (en cualquier combinación)"
    tabla_prod.cell(2, 2).text = "☑"  # ✅ SELECCIONADO
    
    tabla_prod.cell(3, 0).text = "21 a 30 horas"
    tabla_prod.cell(3, 1).text = "3 opciones (en cualquier combinación)"
    tabla_prod.cell(3, 2).text = "☐"
    
    doc.add_paragraph()
    doc.add_paragraph("Cuadro 7. Selección del tipo de productos académicos")
    
    tabla_prod_tipo = doc.add_table(rows=4, cols=4)
    tabla_prod_tipo.style = 'Table Grid'
    
    tabla_prod_tipo.cell(0, 0).text = "Selección"
    tabla_prod_tipo.cell(0, 1).text = "Cantidad"
    tabla_prod_tipo.cell(0, 2).text = "Opción de Producto"
    tabla_prod_tipo.cell(0, 3).text = "Objetivo específico asociado"
    
    # Opción 1
    tabla_prod_tipo.cell(1, 0).text = "☑"  # ✅ MARCADA
    tabla_prod_tipo.cell(1, 1).text = "1"
    tabla_prod_tipo.cell(1, 2).text = "Opción 1: Un (1) artículo científico sometido en revista o conferencia indexada en Web of Science (WoS) o Scopus"
    tabla_prod_tipo.cell(1, 3).text = "OE 2"
    
    # Opción 2
    tabla_prod_tipo.cell(2, 0).text = "☑"  # ✅ MARCADA
    tabla_prod_tipo.cell(2, 1).text = "2"
    tabla_prod_tipo.cell(2, 2).text = "Opción 2: Dos (2) artículos científicos sometidos en revistas indexadas en SciELO, Redalyc, ESCI, DOAJ, o memorias con Consejo Editorial"
    tabla_prod_tipo.cell(2, 3).text = "OE 3"
    
    # Opción 3
    tabla_prod_tipo.cell(3, 0).text = "☐"
    tabla_prod_tipo.cell(3, 1).text = "0"
    tabla_prod_tipo.cell(3, 2).text = "Opción 3: Un (1) Libro o Capítulo de libro técnico especializado"
    tabla_prod_tipo.cell(3, 3).text = ""
    
    doc.add_paragraph()
    doc.add_paragraph("3. Otros resultados y activos tecnológicos (Complementarios)")
    doc.add_paragraph("1. Producto adicional 1: Base de datos abierta de microclimas cafetaleros")
    doc.add_paragraph("2. Producto adicional 2: Manual técnico del sistema IoT desplegado")
    
    # =========================================================================
    # SECCIÓN 13: RESGUARDO
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("13. Resguardo y depósito de productos")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("1. Declaro conocer la obligatoriedad de depositar todos los productos...")
    doc.add_paragraph("☐ No")
    doc.add_paragraph("☑ Sí, acepto el compromiso.")  # ✅ MARCADA
    
    doc.add_paragraph("2. En caso de desarrollar software... asumo el compromiso...")
    doc.add_paragraph("☑ No")  # ✅ MARCADA (no desarrolla software)
    doc.add_paragraph("☐ Sí, acepto el compromiso.")
    
    # =========================================================================
    # SECCIÓN 14: DIVULGACIÓN
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("14. Estrategia de divulgación y socialización")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("1.a. Divulgación científica / técnica:")
    doc.add_paragraph("Presentación en Congreso IEEE Latin America 2028. Charlas técnicas a estudiantes de la Escuela de Electrónica y Computación.")
    
    doc.add_paragraph("1.b. Canales Institucionales:")
    doc.add_paragraph("Nota en InvestigaTEC. Publicación en el blog de la Escuela de Electrónica. Difusión en el Portal Público de Orión.")
    
    doc.add_paragraph("1.c. Eventos de Socialización:")
    doc.add_paragraph("Talleres con la Asociación de Productores de Café de Los Santos. Presentación a la Cámara Agrícola de Costa Rica.")
    
    doc.add_paragraph("1.d. Medios Masivos:")
    doc.add_paragraph("Entrevista en Radio Nacional. Nota en prensa escrita (La Nación, sección tecnología).")
    
    # =========================================================================
    # SECCIÓN 15: ASPECTOS ÉTICOS
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("15. Aspectos Éticos")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph("1. ¿Involucra esta propuesta la participación directa o indirecta de seres humanos?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    doc.add_paragraph("2. ¿Involucra esta propuesta el uso, colecta, acceso o estudio de biodiversidad?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    doc.add_paragraph("3. ¿Involucra esta propuesta el uso, manipulación, cría o experimentación con animales vertebrados?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    doc.add_paragraph("4. ¿Involucra esta propuesta trabajo en o con territorios, comunidades o pueblos indígenas?")
    doc.add_paragraph("☑ No")  # ✅ MARCADA
    doc.add_paragraph("☐ Sí")
    
    doc.add_paragraph()
    doc.add_paragraph("15.a. Declaración de exención (obligatoria si respondió No a todas las preguntas anteriores)")
    doc.add_paragraph(
        "Declaro que esta propuesta NO requiere autorización de ningún comité ético ni ente regulatorio, "
        "por las siguientes razones: El estudio se limita a variables edafoclimáticas (humedad del suelo, "
        "temperatura, precipitación) y de cultivo, sin intervención en seres vivos sensibles ni acceso a "
        "recursos genéticos. No se trabaja con comunidades indígenas ni se colecta material biológico."
    )
    
    # =========================================================================
    # SECCIÓN 16: HOJA DE RUTA
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("16. Hoja de ruta")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "1. Nombre de la línea de investigación: Tecnologías para la Agricultura Sostenible\n"
        "2. Objetivo estratégico (largo plazo): Crear un observatorio nacional de clima y suelo para "
        "cultivos tropicales que permita la toma de decisiones basada en datos.\n"
        "3. Duración total del proceso: 5 años (2027-2031)\n"
        "4. Desglose por fases: Fase 1 (2027-2029): Proyecto actual IoT+ML. Fase 2 (2029-2031): "
        "Escalamiento a otros cultivos (cacao, piña).\n"
        "5. Productos intermedios por fase: 3 artículos WoS, 1 patente de software, 2 tesis de maestría."
    )
    
    # =========================================================================
    # SECCIÓN 17: REFERENCIAS
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("17. Referencias")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "1. Smith, J., & Johnson, A. (2023). IoT in Agriculture: A Comprehensive Review. Smart Agriculture "
        "Journal, 12(4), 112-130. https://doi.org/10.1234/saj.2023.001\n"
        "2. Rodríguez, A., & Vargas, M. (2022). Sensores de bajo costo para el agro costarricense. Revista "
        "TEC de Ingeniería, 8(1), 45-60.\n"
        "3. Chen, L., et al. (2024). Machine Learning for Precision Irrigation. Computers and Electronics "
        "in Agriculture, 198, 107-120.\n"
        "4. Martínez, P., & Gómez, R. (2023). Café de altura y cambio climático en Centroamérica. "
        "Agricultura Tropical, 45(2), 78-92.\n"
        "5. Wang, Y., et al. (2024). ESP32-based sensor networks for environmental monitoring. Sensors, "
        "24(3), 1-15."
    )
    
    # =========================================================================
    # SECCIÓN 18: DECLARACIÓN JURADA Y FIRMA
    # =========================================================================
    doc.add_paragraph()
    p = doc.add_paragraph()
    run = p.add_run("18. Declaración jurada de veracidad y compromiso institucional")
    run.bold = True
    run.font.size = Pt(12)
    
    doc.add_paragraph(
        "Por este medio, manifiesto y declaro bajo fe de juramento lo siguiente:\n"
        "1. Que la información y los datos consignados en cada folio de esta propuesta son íntegros, veraces y correctos.\n"
        "2. Que los documentos adjuntos y las firmas digitales que los respaldan son auténticos.\n"
        "3. Que tengo pleno conocimiento de que la titularidad y protección de la propiedad intelectual...\n"
        "4. Que esta declaración se rinde en estricto cumplimiento de lo establecido en el artículo 96 del Estatuto Orgánico..."
    )
    
    doc.add_paragraph()
    doc.add_paragraph("Firma de la persona investigadora coordinadora")
    
    # Tabla de firma
    tabla_firma = doc.add_table(rows=3, cols=2)
    tabla_firma.style = 'Table Grid'
    
    tabla_firma.cell(0, 0).text = "Nombre completo"
    tabla_firma.cell(0, 1).text = "Gerald Hernández Gamboa"
    
    tabla_firma.cell(1, 0).text = "Número de cédula"
    tabla_firma.cell(1, 1).text = "1-1111-1111"
    
    tabla_firma.cell(2, 0).text = "Firma digital"
    tabla_firma.cell(2, 1).text = "☑ Firmado con BCCR/GAUDI"  # ✅ MARCADA
    
    return doc


if __name__ == "__main__":
    print("🔨 Generando Form-04 de prueba...")
    doc = crear_documento()
    
    nombre_archivo = "Form04_Proyecto_IoT_Cafe_PRUEBA.docx"
    doc.save(nombre_archivo)
    
    print(f"✅ Archivo generado exitosamente: {nombre_archivo}")
    print(f"📍 Ubicación: {__file__}")
    print("\n🧪 Próximos pasos:")
    print("1. Sube este archivo desde el dashboard del investigador (botón '📤 Subir Doc' en F-01)")
    print("2. Verifica en los logs de Render que el parser lo procese correctamente")
    print("3. Revisa en la BD que las tablas PropuestaContenido y PropuestaDeclaraciones se hayan rellenado")