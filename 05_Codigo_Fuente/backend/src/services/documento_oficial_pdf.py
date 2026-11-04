from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


def generar_oficio_pdf(destino: Path, numero: str, fecha: str, codigo: str,
                       titulo: str, tipo_dictamen: str, contenido: str, firmante: str) -> Path:
    """Genera un PDF oficial legible; no aplica firma digital criptográfica."""
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    estilos = getSampleStyleSheet()
    estilos.add(ParagraphStyle(
        name="CuerpoOficio", parent=estilos["BodyText"], fontName="Helvetica",
        fontSize=10, leading=15, alignment=TA_LEFT, spaceAfter=8,
    ))
    elementos = [
        Paragraph("<b>TECNOLÓGICO DE COSTA RICA</b>", estilos["Title"]),
        Paragraph("<b>VICERRECTORÍA DE INVESTIGACIÓN Y EXTENSIÓN</b>", estilos["Heading2"]),
        Spacer(1, 12),
        Paragraph(f"<b>OFICIO {escape(numero)}</b>", estilos["Heading2"]),
        Paragraph(f"Fecha de emisión: {escape(fecha)}", estilos["BodyText"]),
        Spacer(1, 14),
        Paragraph(f"<b>Propuesta:</b> {escape(codigo)}", estilos["BodyText"]),
        Paragraph(f"<b>Título:</b> {escape(titulo)}", estilos["BodyText"]),
        Paragraph(f"<b>Tipo de dictamen:</b> {escape(tipo_dictamen)}", estilos["BodyText"]),
        Spacer(1, 10),
    ]
    for bloque in (contenido or "Sin contenido registrado").splitlines():
        elementos.append(Paragraph(escape(bloque) or "&#160;", estilos["CuerpoOficio"]))
    elementos.extend([
        Spacer(1, 22),
        Paragraph("Atentamente,", estilos["BodyText"]),
        Spacer(1, 28),
        Paragraph(f"<b>{escape(firmante)}</b>", estilos["BodyText"]),
        Paragraph("Dirección de Investigación", estilos["BodyText"]),
        Spacer(1, 18),
        Paragraph("<i>Documento generado por el Sistema de Gestión de Propuestas de Investigación.</i>", estilos["Italic"]),
    ])
    doc = SimpleDocTemplate(
        str(destino), pagesize=letter,
        rightMargin=0.8 * inch, leftMargin=0.8 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
        title=f"Oficio {numero}", author="Sistema SGPI",
    )
    doc.build(elementos)
    return destino
