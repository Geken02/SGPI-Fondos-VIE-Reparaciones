from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime
from typing import Dict, Any
from io import BytesIO

def generar_acuerdo_word(datos: Dict[str, Any]) -> bytes:
    """Genera el documento Word oficial del acuerdo (Form-07 o Form-08)"""
    doc = Document()
    
    # Configuración de estilo
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)
    
    # Encabezado
    header = doc.add_paragraph()
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = header.add_run("INSTITUTO TECNOLÓGICO DE COSTA RICA")
    run.bold = True
    run.font.size = Pt(12)
    
    subheader = doc.add_paragraph()
    subheader.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subheader.add_run("Consejo de Escuela")
    run.font.size = Pt(11)
    
    # Número y fecha del acuerdo
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run(f"Acuerdo No. {datos['numeroAcuerdo']}").bold = True
    
    fecha = datos.get('fechaAcuerdo')
    if fecha:
        fecha_obj = datetime.fromisoformat(fecha) if isinstance(fecha, str) else fecha
        p.add_run(f"\nFecha: {fecha_obj.strftime('%d de %B de %Y')}")
    
    doc.add_paragraph()
    
    # Considerando que
    doc.add_paragraph("Considerando que:", style='Heading 2')
    
    propuesta = datos['propuesta']
    escuela = datos['escuela']
    
    # Punto 1
    p = doc.add_paragraph()
    p.add_run(f"1. Se ha presentado al Comité Técnico de la {escuela} la propuesta titulada ")
    p.add_run(f'"{propuesta["titulo"]}"').italic = True
    p.add_run(", coordinada por el equipo investigador de la propuesta.")
    
    # Punto 2
    p = doc.add_paragraph()
    p.add_run(f"2. Dicha propuesta corresponde a una iniciativa de investigación en la modalidad de ")
    p.add_run(propuesta['modalidad']).bold = True
    p.add_run(".")
    
    # Punto 3 - Integrantes
    p = doc.add_paragraph()
    p.add_run("3. El equipo investigador está conformado por:")
    
    # Tabla de integrantes
    tabla = doc.add_table(rows=1, cols=5)
    tabla.style = 'Table Grid'
    
    # Encabezados
    hdr_cells = tabla.rows[0].cells
    hdr_cells[0].text = 'Nombre'
    hdr_cells[1].text = 'Rol'
    hdr_cells[2].text = 'Horas'
    hdr_cells[3].text = 'Tipo'
    hdr_cells[4].text = 'Período'
    
    for cell in hdr_cells:
        cell.paragraphs[0].runs[0].bold = True
    
    # Datos de integrantes
    for intg in datos.get('integrantes', []):
        row_cells = tabla.add_row().cells
        row_cells[0].text = intg['nombre']
        row_cells[1].text = intg['rol']
        row_cells[2].text = str(intg['horas'])
        row_cells[3].text = intg['tipoHora']
        row_cells[4].text = intg['periodo']
    
    doc.add_paragraph()
    
    # Punto 4 - Presupuesto
    p = doc.add_paragraph()
    p.add_run(f"4. La propuesta solicita un presupuesto total de ₡{datos['presupuesto']:,.2f} colones.")
    
    # Punto 5 - Horas
    p = doc.add_paragraph()
    p.add_run(f"5. Se aprueban {datos['horasAprobadas']} horas semanales para la ejecución del proyecto.")
    
    doc.add_paragraph()
    
    # Por tanto, se acuerda
    doc.add_paragraph("Por tanto, se acuerda:", style='Heading 2')
    
    p = doc.add_paragraph()
    p.add_run("1. Avalar la propuesta de investigación titulada ")
    p.add_run(f'"{propuesta["titulo"]}"').italic = True
    p.add_run(f" para su presentación ante la VIE.")
    
    p = doc.add_paragraph()
    p.add_run("2. Avalar la participación del equipo investigador bajo las condiciones de nombramiento descritas en el punto 3.")
    
    p = doc.add_paragraph()
    p.add_run(f"3. Avalar el presupuesto de ₡{datos['presupuesto']:,.2f} colones para la ejecución del proyecto.")
    
    p = doc.add_paragraph()
    p.add_run("4. Ratificar la calificación otorgada por el Comité Técnico.")
    
    # Firmas
    doc.add_paragraph()
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    p.add_run("_" * 40)
    p = doc.add_paragraph()
    p.add_run("Presidente del Consejo de Escuela")
    
    # Guardar en memoria
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer.read()