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

// Tipos de productos según el Excel oficial
const TIPOS_PRODUCTOS = {
  fortalecimiento: [
    'Opción 1 - Diagnóstico de situación',
    'Opción 2 - Estudio de mercado',
    'Opción 3 - Estudio de factibilidad',
    'Opción 4 - Ensayo de laboratorio',
    'Opción 5 - Propuesta de creación de una línea de investigación',
    'Opción 6 - Propuesta de proyecto de investigación básica, aplicada o proyecto de desarrollo tecnológico',
    'Opción 7 - Artículo científico sometido en revista o conferencia indexada (WoS, Scopus, Redalyc, SciELO, ESCI o DOAJ)'
  ],
  investigacion: [
    'Opción 1 - Un artículo científico sometido en revista o memoria indexada en Web of Science (WoS) o Scopus',
    'Opción 2 - Dos artículos científicos en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias con Consejo Editorial permanente',
    'Opción 3 - Un libro o capítulo de libro técnico especializado, sometido ante Comité Editorial permanente, vinculado al tema de investigación'
  ],
  desarrollo: {
    propiedadIndustrial: [
      'Opción 1 - Patente de invención o modelo de utilidad (documento técnico preliminar de solicitud)',
      'Opción 2 - Diseño industrial – dibujo o modelo industrial – (solicitud completa)',
      'Opción 3 - Desarrollo de Software (código fuente + manual técnico + manual de usuario + ciclo de vida)',
      'Opción 4 - Secreto (documento técnico conformado y depositado en el Centro de Vinculación)',
      'Opción 5 - Obtención Vegetal (documento técnico con caracterización de la nueva variedad)',
      'Opción 6 - Denominación de origen o indicación geográfica (pliego de condiciones)',
      'Opción 8 - Otros (a criterio del Centro de Vinculación)'
    ],
    academicos: [
      'Opción 1 - Un artículo científico sometido en revista o memoria indexada en Web of Science (WoS) o Scopus',
      'Opción 2 - Dos artículos científicos en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias con Consejo Editorial permanente',
      'Opción 3 - Un libro o capítulo de libro técnico especializado, sometido ante Comité Editorial permanente, vinculado al tema de investigación',
      'Opción 4 - Norma técnica sometida ante entes competentes de trayectoria nacional o internacional, o manuales técnicos de alta especialidad',
      'Opción 5 - Otros productos según la naturaleza de la propuesta, validados por el CIE'
    ]
  }
};

// Helper para aplicar bordes a una fila
const aplicarBordes = (row, numCols = 9) => {
  for (let i = 1; i <= numCols; i++) {
    row.getCell(i).border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
};

export const generarExcelOficial = async (rubricaData, evaluaciones = {}, productos = {}) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Rúbrica Oficial');

  const modalidad = rubricaData.nombreRubrica || 'ACTIVIDADES DE FORTALECIMIENTO';
  const esDesarrollo = modalidad.toLowerCase().includes('desarrollo');
  const esInvestigacion = modalidad.toLowerCase().includes('investigación');

  // =========================================================================
  // 1. ENCABEZADO OFICIAL
  // =========================================================================
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
  cellAdvertencia.value = '⚠ REQUISITOS MÍNIMOS OBLIGATORIOS: Los criterios marcados con ⛔ son requisitos obligatorios. Cuando un requisito obligatorio obtenga una calificación "deficiente" o "regular", el Comité Técnico emitirá dictamen técnico desfavorable o no recomendará la propuesta, para conocimiento del Consejo de la instancia y trámite ante la VIE y CIE, según corresponda.';
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
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 30;

  let currentRow = 11;
  const celdasSubtotales = [];

  // =========================================================================
  // 3. SECCIONES Y CRITERIOS (con cálculos en JS)
  // =========================================================================
  rubricaData.estructuraRubrica.secciones.forEach((seccion) => {
    ws.mergeCells(`A${currentRow}:I${currentRow}`);
    const cellSec = ws.getCell(`A${currentRow}`);
    cellSec.value = `${seccion.nombre} — Peso de la sección: ${seccion.peso_seccion}%`;
    cellSec.font = { bold: true, size: 12, color: { argb: COLORS.azulTec } };
    cellSec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulClaro } };
    currentRow++;

    let subTotalSeccion = 0;
    let pesoEvaluadoSeccion = 0;

    seccion.criterios.forEach((crit) => {
      const ev = evaluaciones[crit.id] || {};
      const esObligatorio = crit.es_requisito_obligatorio;
      const nombreCriterio = esObligatorio ? `⛔ ${crit.nombre}` : crit.nombre;

      const row = ws.getRow(currentRow);

      row.getCell(1).value = nombreCriterio;
      row.getCell(1).font = esObligatorio ? { bold: true, color: { argb: COLORS.rojoObligatorio } } : { bold: false };
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };

      row.getCell(2).value = crit.peso;
      row.getCell(2).numFmt = '0"%"';
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'top' };

      row.getCell(3).value = crit.niveles?.Deficiente || '';
      row.getCell(4).value = crit.niveles?.Regular || '';
      row.getCell(5).value = crit.niveles?.Bueno || '';
      row.getCell(6).value = crit.niveles?.Excelente || '';
      ['C', 'D', 'E', 'F'].forEach(col => {
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

      // Columna H: Subpuntaje (VALOR CALCULADO EN JS)
      const puntajeCalculado = ev.puntaje !== undefined && ev.puntaje !== null ? ev.puntaje : '';
      row.getCell(8).value = puntajeCalculado;
      if (puntajeCalculado !== '') {
        row.getCell(8).font = { bold: true, color: { argb: COLORS.azulTec } };
        subTotalSeccion += (puntajeCalculado / 10) * crit.peso;
        pesoEvaluadoSeccion += crit.peso;
      }
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      // Columna I: Justificación
      row.getCell(9).value = ev.justificacion || '';
      row.getCell(9).alignment = { wrapText: true, vertical: 'top' };

      aplicarBordes(row);
      row.height = 80;
      currentRow++;
    });

    // Fila de Subtotal
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    ws.getCell(`A${currentRow}`).value = `Subtotal – ${seccion.nombre}`;
    ws.getCell(`A${currentRow}`).font = { bold: true, italic: true };
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };

    if (pesoEvaluadoSeccion > 0) {
      const notaSeccion = (subTotalSeccion / pesoEvaluadoSeccion) * (seccion.peso_seccion / 100);
      ws.mergeCells(`G${currentRow}:H${currentRow}`);
      ws.getCell(`G${currentRow}`).value = parseFloat(notaSeccion.toFixed(2));
      ws.getCell(`G${currentRow}`).numFmt = '0.00';
      ws.getCell(`G${currentRow}`).font = { bold: true, color: { argb: COLORS.azulTec } };
      ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
      celdasSubtotales.push(parseFloat(notaSeccion.toFixed(2)));
    }

    currentRow += 2;
  });

  // =========================================================================
  // 4. CALIFICACIÓN FINAL (suma en JS)
  // =========================================================================
  const calificacionFinal = celdasSubtotales.reduce((a, b) => a + b, 0);

  ws.mergeCells(`A${currentRow}:F${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'CALIFICACIÓN FINAL DE LA PROPUESTA';
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };

  ws.mergeCells(`G${currentRow}:H${currentRow}`);
  ws.getCell(`G${currentRow}`).value = parseFloat(calificacionFinal.toFixed(2));
  ws.getCell(`G${currentRow}`).numFmt = '0.00';
  ws.getCell(`G${currentRow}`).font = {
    bold: true,
    size: 14,
    color: { argb: calificacionFinal >= 0.70 ? COLORS.verdeExito : COLORS.rojoError }
  };
  ws.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
  currentRow++;

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'ESCALA DE RESULTADOS: ≥ 0.70 = RECOMIENDA | < 0.70 = NO RECOMIENDA';
  ws.getCell(`A${currentRow}`).font = { bold: true, italic: true, color: { argb: '666666' } };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow += 2;

  // =========================================================================
  // 5. SECCIÓN 8: PRODUCTOS ACADÉMICOS
  // =========================================================================
  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '8. PRODUCTOS ACADÉMICOS — Sección no sumativa';
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12, color: { argb: COLORS.azulTec } };
  ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.azulClaro } };
  currentRow++;

  // Texto de advertencia según modalidad
  let advertenciaProductos = '';
  if (esDesarrollo) {
    advertenciaProductos = 'ATENCIÓN: Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Todo proyecto de desarrollo tecnológico requiere MÍNIMO 2 productos (1 de propiedad industrial obligatorio + 1 adicional). Si la formulación de la propuesta NO cumple, el Comité Técnico DEBE no recomendar la propuesta.';
  } else {
    advertenciaProductos = 'ATENCIÓN: Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Si el equipo NO cumple, el Comité Técnico NO DEBE RECOMENDAR la propuesta independientemente de la calificación final obtenida.';
  }

  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = advertenciaProductos;
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

  let textoMinimo = '';
  if (esDesarrollo) {
    textoMinimo = `Todo proyecto de desarrollo tecnológico exige MÍNIMO 2 productos (Sección 5.5):\n1) Al menos 1 activo de propiedad industrial (obligatorio)\n2) Al menos 1 producto adicional académico o de PI\n3) Más 1 producto adicional por cada 10 horas semanales excedentes\n\nSegún la Sección 2.4.1 de la Convocatoria:\n1 a 10 horas semanales → 1 producto académico mínimo\n11 a 20 horas semanales → 2 productos académicos mínimos\n21 a 30 horas semanales → 3 productos académicos mínimos\n(un producto adicional por cada 10 horas semanales excedentes, redondeado hacia arriba)`;
  } else {
    const seccionRef = esInvestigacion ? '2.4.1' : '3.6';
    textoMinimo = `Según la Sección ${seccionRef} de la Convocatoria:\n1 a 10 horas semanales → 1 producto académico mínimo\n11 a 20 horas semanales → 2 productos académicos mínimos\n21 a 30 horas semanales → 3 productos académicos mínimos\n(un producto adicional por cada 10 horas semanales excedentes, redondeado hacia arriba)`;
  }
  ws.getCell(`C${currentRow}`).value = textoMinimo;
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

  const seccionRef = esInvestigacion ? '4.4' : (esDesarrollo ? '5.4' : '3.6');
  ws.getCell(`C${currentRow}`).value = `Marque el tipo declarado por el equipo (uno por cada producto comprometido):`;
  ws.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;

  // Lista de tipos según modalidad
  const tiposAMostrar = esDesarrollo
    ? [...TIPOS_PRODUCTOS.desarrollo.propiedadIndustrial, ...TIPOS_PRODUCTOS.desarrollo.academicos]
    : (esInvestigacion ? TIPOS_PRODUCTOS.investigacion : TIPOS_PRODUCTOS.fortalecimiento);

  tiposAMostrar.forEach((tipo) => {
    ws.mergeCells(`A${currentRow}:B${currentRow}`);
    ws.getCell(`A${currentRow}`).value = '';
    ws.mergeCells(`C${currentRow}:I${currentRow}`);
    const estaSeleccionado = productos.tiposSeleccionados?.some(t =>
      String(t).toLowerCase().includes(tipo.split(' - ')[0].toLowerCase().replace('opción ', ''))
    );
    ws.getCell(`C${currentRow}`).value = `${estaSeleccionado ? '☑' : '☐'} ${tipo}`;
    ws.getCell(`C${currentRow}`).font = estaSeleccionado ? { bold: true } : {};
    currentRow++;
  });

  // Cumple con el mínimo
  const minimoRequerido = rubricaData.minimoProductosRequeridos || 0;
  const cumpleMinimo = productos.cantidadPropuesta >= minimoRequerido;

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
  const recomiendaFinal = calificacionFinal >= 0.70 && cumpleMinimo;
  ws.mergeCells(`A${currentRow}:I${currentRow}`);
  ws.getCell(`A${currentRow}`).value = `DICTAMEN DEL COMITÉ TÉCNICO: ${recomiendaFinal ? 'PROPUESTA RECOMENDADA' : 'PROPUESTA NO RECOMENDADA'}`;
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 12, color: { argb: recomiendaFinal ? COLORS.verdeExito : COLORS.rojoError } };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow += 2;

  ['integrante 1', 'integrante 2', 'integrante 3', 'coordinadora'].forEach(rol => {
    ws.mergeCells(`A${currentRow}:I${currentRow}`);
    ws.getCell(`A${currentRow}`).value = `Nombre y firma de la persona ${rol} del Comité Técnico:`;
    ws.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
  });

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