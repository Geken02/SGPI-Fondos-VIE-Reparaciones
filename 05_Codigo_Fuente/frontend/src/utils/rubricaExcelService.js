import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const COLORS = {
  azulTec: '002855',
  azulClaro: 'E6F0FA',
  rojoObligatorio: 'CC0000',
  blanco: 'FFFFFF',
  verdeExito: '008000',
  rojoError: 'CC0000'
};

export const generarExcelOficial = async (rubricaData, evaluaciones = {}, productos = {}) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Rúbrica Oficial');

  // =========================================================================
  // 1. ENCABEZADO OFICIAL
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

  ws.mergeCells('A7:I7');
  const cellAdvertencia = ws.getCell('A7');
  cellAdvertencia.value = '⚠ REQUISITOS MÍNIMOS OBLIGATORIOS: Los criterios marcados con ⛔ son requisitos obligatorios. Cuando un requisito obligatorio obtenga una calificación "deficiente" o "regular", el Comité Técnico emitirá dictamen técnico desfavorable o no recomendará la propuesta.';
  cellAdvertencia.font = { italic: true, color: { argb: COLORS.rojoObligatorio }, size: 10 };
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

  let currentRow = 11;
  const celdasSubtotales = []; // Para guardar las referencias de celdas de subtotal y sumarlas al final

  // =========================================================================
  // 3. SECCIONES Y CRITERIOS (Con FÓRMULAS DE EXCEL AUTOCALCULABLES)
  // =========================================================================
  rubricaData.estructuraRubrica.secciones.forEach((seccion) => {
    ws.mergeCells(`A${currentRow}:I${currentRow}`);
    const cellSec = ws.getCell(`A${currentRow}`);
    cellSec.value = `${seccion.nombre} — Peso de la sección: ${seccion.peso_seccion}%`;
    cellSec.font = { bold: true, size: 12, color: { argb: COLORS.azulTec } };
    cellSec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulClaro } };
    currentRow++;

    const startRow = currentRow; // Guardamos la fila inicial de los criterios de esta sección

    seccion.criterios.forEach((crit) => {
      const ev = evaluaciones[crit.id] || {};
      const esObligatorio = crit.es_requisito_obligatorio;
      const nombreCriterio = esObligatorio ? `⛔ ${crit.nombre}` : crit.nombre;

      const row = ws.getRow(currentRow);
      
      row.getCell(1).value = nombreCriterio;
      row.getCell(1).font = esObligatorio ? { bold: true, color: { argb: COLORS.rojoObligatorio } } : { bold: false };
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };

      // Columna B: Peso (como número para que las fórmulas funcionen, pero con formato visual)
      row.getCell(2).value = crit.peso; 
      row.getCell(2).numFmt = '0"%"';
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };

      row.getCell(3).value = crit.niveles?.Deficiente || '';
      row.getCell(4).value = crit.niveles?.Regular || '';
      row.getCell(5).value = crit.niveles?.Bueno || '';
      row.getCell(6).value = crit.niveles?.Excelente || '';
      ['C','D','E','F'].forEach(col => {
        row.getCell(col).alignment = { wrapText: true, vertical: 'top' };
        row.getCell(col).font = { size: 9 };
      });

      // Columna G: Nivel (Lista desplegable)
      row.getCell(7).value = ev.nivel || '';
      row.getCell(7).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Deficiente,Regular,Bueno,Excelente"'],
        showErrorMessage: true,
        error: 'Seleccione: Deficiente, Regular, Bueno o Excelente',
        errorTitle: 'Nivel Inválido'
      };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).font = { bold: true, color: { argb: '006600' } };

      // Columna H: Subpuntaje (¡FÓRMULA DE EXCEL!)
      // Mapea el texto de la columna G a su valor numérico
      const formulaSubpuntaje = `IF(G${currentRow}="Deficiente", 0, IF(G${currentRow}="Regular", 6, IF(G${currentRow}="Bueno", 8, IF(G${currentRow}="Excelente", 10, ""))))`;
      row.getCell(8).value = { 
        formula: formulaSubpuntaje,
        result: ev.puntaje !== undefined ? ev.puntaje : null // Valor inicial calculado por JS
      };
      row.getCell(8).font = { bold: true, color: { argb: COLORS.azulTec } };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      // Columna I: Justificación
      row.getCell(9).value = ev.justificacion || '';
      row.getCell(9).alignment = { wrapText: true, vertical: 'top' };

      for (let i = 1; i <= 9; i++) {
        row.getCell(i).border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
      }

      row.height = 80; 
      currentRow++;
    });

    const endRow = currentRow - 1; // Última fila de criterios de esta sección

    // Fila de Subtotal de la sección
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    ws.getCell(`A${currentRow}`).value = `Subtotal – ${seccion.nombre}`;
    ws.getCell(`A${currentRow}`).font = { bold: true, italic: true };
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    
    // Fórmula del subtotal: SUMPRODUCT(puntajes, pesos) / SUM(pesos) * (peso_seccion / 100)
    // Esto calcula el promedio ponderado de la sección y lo escala a su peso final
    const formulaSubtotal = `SUMPRODUCT(H${startRow}:H${endRow}, B${startRow}:B${endRow}) / SUM(B${startRow}:B${endRow}) * (${seccion.peso_seccion}/100)`;
    
    ws.mergeCells(`G${currentRow}:H${currentRow}`);
    ws.getCell(`G${currentRow}`).value = {
      formula: formulaSubtotal,
      result: null // Excel lo calculará al abrirse
    };
    ws.getCell(`G${currentRow}`).numFmt = '0.00';
    ws.getCell(`G${currentRow}`).font = { bold: true, color: { argb: COLORS.azulTec } };
    ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
    
    celdasSubtotales.push(`G${currentRow}`);
    currentRow += 2; // Espacio entre secciones
  });

  // =========================================================================
  // 4. CALIFICACIÓN FINAL (FÓRMULA DE SUMA)
  // =========================================================================
  ws.mergeCells(`A${currentRow}:F${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'CALIFICACIÓN FINAL DE LA PROPUESTA';
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };

  // Fórmula que suma todas las celdas de subtotal de las secciones
  const formulaCalificacionFinal = `SUM(${celdasSubtotales.join(',')})`;
  
  ws.mergeCells(`G${currentRow}:H${currentRow}`);
  ws.getCell(`G${currentRow}`).value = {
    formula: formulaCalificacionFinal,
    result: null
  };
  ws.getCell(`G${currentRow}`).numFmt = '0.00';
  // El color se aplicará condicionalmente en Excel, pero ponemos un color base
  ws.getCell(`G${currentRow}`).font = { bold: true, size: 14 };
  ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'ESCALA DE RESULTADOS: ≥ 0.70 = RECOMIENDA | < 0.70 = NO RECOMIENDA';
  ws.getCell(`A${currentRow}`).font = { bold: true, italic: true, color: { argb: '666666' } };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow += 2;

  // =========================================================================
  // 5. SECCIÓN 8: PRODUCTOS ACADÉMICOS (Oficial)
  // =========================================================================
  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '8. PRODUCTOS ACADÉMICOS — Sección no sumativa';
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12, color: { argb: COLORS.azulTec } };
  ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulClaro } };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'ATENCIÓN: Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Si el equipo NO cumple, el Comité Técnico NO DEBE RECOMENDAR la propuesta independientemente de la calificación final obtenida.';
  ws.getCell(`A${currentRow}`).font = { italic: true, color: { argb: COLORS.rojoObligatorio }, size: 10 };
  ws.getCell(`A${currentRow}`).alignment = { wrapText: true };
  currentRow++;

  // Horas semanales
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Total de horas semanales asignadas al equipo';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.mergeCells(`C${currentRow}:I${currentRow}`);
  ws.getCell(`C${currentRow}`).value = `Indique la suma total de horas semanales (VIE + VIE-Centro + REC + CONS + DOC + VIESA) del equipo según la propuesta:\n\n___${productos.horasSemanales || 0}___ horas semanales totales`;
  ws.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;

  // Mínimo requerido
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Mínimo de productos requeridos (escala de proporcionalidad)';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.mergeCells(`C${currentRow}:I${currentRow}`);
  ws.getCell(`C${currentRow}`).value = `Según la Convocatoria:\n1 a 10 horas semanales → 1 producto académico mínimo\n11 a 20 horas semanales → 2 productos académicos mínimos\n21 a 30 horas semanales → 3 productos académicos mínimos\n(un producto adicional por cada 10 horas semanales excedentes, redondeado hacia arriba)`;
  ws.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;

  // Cantidad propuesta
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Cantidad de productos propuestos por el equipo';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.mergeCells(`C${currentRow}:I${currentRow}`);
  ws.getCell(`C${currentRow}`).value = `El equipo declara comprometer ___${productos.cantidadPropuesta || 0}___ productos académicos en la propuesta.`;
  currentRow++;

  // Tipos de productos
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Tipo(s) de producto(s) comprometidos';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.mergeCells(`C${currentRow}:I${currentRow}`);
  ws.getCell(`C${currentRow}`).value = (productos.tiposSeleccionados && productos.tiposSeleccionados.length > 0) 
    ? productos.tiposSeleccionados.join(', ') 
    : 'Ninguno seleccionado';
  ws.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;

  // Cumple con el mínimo
  const cumpleMinimo = productos.cantidadPropuesta >= (rubricaData.minimoProductosRequeridos || 0);
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '¿Cumple con el mínimo según las horas asignadas?';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  ws.mergeCells(`C${currentRow}:I${currentRow}`);
  ws.getCell(`C${currentRow}`).value = cumpleMinimo 
    ? '✓ CUMPLE con los requisitos mínimos de productos académicos → La propuesta puede continuar su revisión'
    : '✗ NO CUMPLE con los requisitos mínimos → La propuesta debe ser RECHAZADA por el Comité Técnico';
  ws.getCell(`C${currentRow}`).font = { bold: true, color: { argb: cumpleMinimo ? COLORS.verdeExito : COLORS.rojoError } };
  ws.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow += 2;

  // =========================================================================
  // 6. DICTAMEN Y FIRMAS
  // =========================================================================
  // Nota: El dictamen final se calcula en base a la celda de calificación final
  const recomiendaFinal = true; // Se evalúa visualmente en Excel, pero dejamos el texto base
  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'DICTAMEN DEL COMITÉ TÉCNICO: (Ver Calificación Final y Productos)';
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow += 2;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Nombre y firma de la persona integrante 1 del Comité Técnico:';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Nombre y firma de la persona integrante 2 del Comité Técnico:';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Nombre y firma de la persona integrante 3 del Comité Técnico:';
  ws.getCell(`A${currentRow}`).font = { bold: true };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Nombre y firma de la persona coordinadora del Comité Técnico:';
  ws.getCell(`A${currentRow}`).font = { bold: true };

  // =========================================================================
  // 7. ANCHOS DE COLUMNA
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
  // 8. DESCARGAR
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Rubrica_Oficial_${rubricaData.codigoPropuesta || 'Propuesta'}.xlsx`);
};