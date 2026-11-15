import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Colores oficiales TEC / VIE
const COLORS = {
  azulTec: '002855',
  azulClaro: 'E6F0FA',
  grisHeader: 'F2F2F2',
  rojoObligatorio: 'FF0000',
  blanco: 'FFFFFF',
};

export const generarExcelOficial = async (rubricaData, evaluaciones = {}, productos = {}) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Rúbrica Oficial');

  // =========================================================================
  // 1. ENCABEZADO OFICIAL (Celdas combinadas y estilos)
  // =========================================================================
  const modalidad = rubricaData.nombreRubrica || 'ACTIVIDADES DE FORTALECIMIENTO';
  
  ws.mergeCells('A1:I1');
  const cellTitulo = ws.getCell('A1');
  cellTitulo.value = `RÚBRICA DE EVALUACIÓN – ${modalidad.toUpperCase()}`;
  cellTitulo.font = { bold: true, size: 14, color: { argb: COLORS.azulTec } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:I2');
  ws.getCell('A2').value = 'Convocatoria con fondos VIE 2027 – Vicerrectoría de Investigación y Extensión, Instituto Tecnológico de Costa Rica';
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('A3:B3'); ws.getCell('A3').value = 'Nombre de la propuesta:'; ws.getCell('A3').font = { bold: true };
  ws.mergeCells('C3:I3'); ws.getCell('C3').value = rubricaData.titulo || '';

  ws.mergeCells('A4:B4'); ws.getCell('A4').value = 'Dependencia académica coordinadora:'; ws.getCell('A4').font = { bold: true };
  ws.mergeCells('C4:I4'); ws.getCell('C4').value = rubricaData.escuela || '';

  ws.mergeCells('A5:B5'); ws.getCell('A5').value = 'Fecha de evaluación:'; ws.getCell('A5').font = { bold: true };
  ws.mergeCells('C5:I5'); ws.getCell('C5').value = new Date().toLocaleDateString('es-CR');

  // Advertencia de requisitos obligatorios
  ws.mergeCells('A7:I7');
  const cellAdvertencia = ws.getCell('A7');
  cellAdvertencia.value = '⚠ REQUISITOS MÍNIMOS OBLIGATORIOS: Los criterios marcados con ⛔ son requisitos obligatorios. Si obtienen "Deficiente" o "Regular", la propuesta NO será recomendada.';
  cellAdvertencia.font = { italic: true, color: { argb: 'CC0000' }, size: 10 };
  cellAdvertencia.alignment = { wrapText: true };

  // =========================================================================
  // 2. ENCABEZADOS DE LA TABLA (Fila 9)
  // =========================================================================
  const headers = [
    'Criterio de evaluación', 'Peso', 
    'Deficiente (0 pts)', 'Regular (6 pts)', 'Bueno (8 pts)', 'Excelente (10 pts)', 
    'Nivel (seleccione)', 'Subpuntaje obtenido', 'Justificación de la puntuación'
  ];
  
  const headerRow = ws.getRow(9);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: COLORS.blanco } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulTec } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
  });
  headerRow.height = 30;

  // =========================================================================
  // 3. SECCIONES Y CRITERIOS
  // =========================================================================
  let currentRow = 11;

  rubricaData.estructuraRubrica.secciones.forEach((seccion) => {
    // Fila de Título de Sección (Combinada)
    ws.mergeCells(`A${currentRow}:I${currentRow}`);
    const cellSec = ws.getCell(`A${currentRow}`);
    cellSec.value = `${seccion.nombre} — Peso de la sección: ${seccion.peso_seccion}%`;
    cellSec.font = { bold: true, size: 12, color: { argb: COLORS.azulTec } };
    cellSec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulClaro } };
    currentRow++;

    seccion.criterios.forEach((crit) => {
      const ev = evaluaciones[crit.id] || {};
      const esObligatorio = crit.es_requisito_obligatorio;
      const nombreCriterio = esObligatorio ? `⛔ ${crit.nombre}` : crit.nombre;

      const row = ws.getRow(currentRow);
      
      // Columna A: Nombre
      row.getCell(1).value = nombreCriterio;
      row.getCell(1).font = esObligatorio ? { bold: true, color: { argb: COLORS.rojoObligatorio } } : { bold: false };
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };

      // Columna B: Peso
      row.getCell(2).value = `${crit.peso}%`;
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };

      // Columnas C-F: Descripciones de niveles
      row.getCell(3).value = crit.niveles?.Deficiente || '';
      row.getCell(4).value = crit.niveles?.Regular || '';
      row.getCell(5).value = crit.niveles?.Bueno || '';
      row.getCell(6).value = crit.niveles?.Excelente || '';
      ['C','D','E','F'].forEach(col => {
        row.getCell(col).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(col).font = { size: 9 };
      });

      // Columna G: Nivel (¡AQUÍ AGREGAMOS LA LISTA DESPLEGABLE!)
      row.getCell(7).value = ev.nivel || '';
      row.getCell(7).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Deficiente,Regular,Bueno,Excelente"'],
        showErrorMessage: true,
        error: 'Por favor seleccione un nivel válido de la lista.',
        errorTitle: 'Nivel Inválido'
      };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).font = { bold: true, color: { argb: '006600' } };

      // Columna H: Subpuntaje
      row.getCell(8).value = ev.puntaje !== undefined ? ev.puntaje : '';
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      // Columna I: Justificación
      row.getCell(9).value = ev.justificacion || '';
      row.getCell(9).alignment = { wrapText: true, vertical: 'top' };

      // Bordes para toda la fila
      for (let i = 1; i <= 9; i++) {
        row.getCell(i).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }

      // Ajustar altura de fila para que se vea el texto
      row.height = 80; 
      currentRow++;
    });

    // Fila de Subtotal
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    ws.getCell(`A${currentRow}`).value = `Subtotal – ${seccion.nombre}`;
    ws.getCell(`A${currentRow}`).font = { bold: true, italic: true };
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    currentRow += 2; // Espacio entre secciones
  });

  // =========================================================================
  // 4. ANCHOS DE COLUMNA
  // =========================================================================
  ws.getColumn('A').width = 35;
  ws.getColumn('B').width = 8;
  ws.getColumn('C').width = 25;
  ws.getColumn('D').width = 25;
  ws.getColumn('E').width = 25;
  ws.getColumn('F').width = 25;
  ws.getColumn('G').width = 15;
  ws.getColumn('H').width = 12;
  ws.getColumn('I').width = 40;

  // =========================================================================
  // 5. DESCARGAR
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Rubrica_Oficial_${rubricaData.codigoPropuesta || 'Propuesta'}.xlsx`);
};