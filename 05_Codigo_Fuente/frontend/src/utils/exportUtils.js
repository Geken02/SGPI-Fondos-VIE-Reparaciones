import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';

/* ═══════════════════════════════════════════════════════════════════════
   UTILIDADES DE EXPORTACIÓN — PDF (Form-04) y Excel (Form-05 / Form-06)
   Instituto Tecnológico de Costa Rica — Vicerrectoría de Investigación
   ═══════════════════════════════════════════════════════════════════════ */

/* ──────────────── helpers compartidos ──────────────── */
const hoy = () => new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safe(v, fallback = '') {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* Estilos reutilizables para ExcelJS */
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const TITLE_FONT  = { bold: true, size: 14, color: { argb: 'FF002855' } };
const SUB_FONT    = { bold: true, size: 11, color: { argb: 'FF002855' } };
const BORDER_THIN = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' }
};

function applyHeaderRow(ws, rowNum, colCount) {
  const row = ws.getRow(rowNum);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }
}

function applyDataBorders(ws, startRow, endRow, colCount) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      row.getCell(c).border = BORDER_THIN;
    }
  }
}

async function guardarWorkbook(wb, nombre) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  descargarBlob(blob, nombre);
}


/* ═══════════════════════════════════════════════════════════════
   1.  EXPORTAR FORM-04  (Formulario de Proyecto)  →  PDF
   ═══════════════════════════════════════════════════════════════ */
export function exportarForm04PDF(datos, codigo = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  const addPage = () => { doc.addPage(); y = 14; };
  const checkPage = (need = 30) => { if (y + need > 265) addPage(); };

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Instituto Tecnológico de Costa Rica', margin, y);
  doc.text('Vicerrectoría de Investigación y Extensión', margin, y + 4);
  y += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMULARIO F-04 — FORMULARIO DE PROYECTO', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${safe(codigo, 'Sin código')}  |  Generado: ${hoy()}`, margin, y);
  y += 10;

  const section = (title) => {
    checkPage(20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(0, 40, 85);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y);
    doc.setTextColor(0, 0, 0);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const field = (label, value) => {
    checkPage(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(safe(value, '—'), contentW - 2);
    doc.text(lines, margin + 2, y + 5);
    y += 5 + lines.length * 4.2;
  };

  const multiField = (label, value) => {
    checkPage(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const text = safe(value, 'No especificado');
    const lines = doc.splitTextToSize(text, contentW - 4);
    for (let i = 0; i < lines.length; i++) {
      checkPage(5);
      doc.text(lines[i], margin + 2, y);
      y += 4.2;
    }
    y += 2;
  };

  section('1. IDENTIFICACIÓN Y MODALIDAD');
  field('Nombre del Proyecto', datos.nombreProyecto);
  field('Modalidad', datos.modalidad);
  field('Fecha de Inicio', datos.fechaInicio);
  field('Fecha de Finalización', datos.fechaFin);

  section('2. FINANCIACIÓN PREVIA Y VINCULACIÓN');
  field('Otras Fuentes de Financiamiento', datos.otrasFuentes?.aplica ? `Sí — ${datos.otrasFuentes.detalle || ''}` : 'No aplica');
  field('Vinculación Técnica', datos.vinculacionTecnica?.aplica ? `Sí — ${datos.vinculacionTecnica.detalle || ''}` : 'No aplica');
  field('Problemas Nacionales', datos.problemasNacionales?.aplica ? `Sí — ${datos.problemasNacionales.detalle || ''}` : 'No aplica');

  section('3. INSTRUMENTOS JURÍDICOS Y CONVENIOS');
  field('Requiere Instrumento Jurídico', datos.requiereInstrumento?.aplica ? `Sí — ${datos.requiereInstrumento.tipo || ''}` : 'No');
  field('Convenio Marco', datos.convenioMarco?.aplica ? `Sí — ${datos.convenioMarco.nombre || ''}` : 'No');
  field('Base para Posgrado', datos.basePosgrado?.aplica !== 'No' ? `Sí — Programa: ${datos.basePosgrado?.programa || ''}, Universidad: ${datos.basePosgrado?.universidad || ''}` : 'No');

  section('4. PROPIEDAD INTELECTUAL E INNOVACIÓN');
  field('Información Confidencial', datos.infoConfidencial?.aplica ? `Sí — ${datos.infoConfidencial.detalle || ''}` : 'No');
  field('Potencial de PI', datos.potencialPI?.aplica ? `Sí — Oficio: ${datos.potencialPI.oficioDictamen || ''}` : 'No');
  field('Posee Innovación', datos.poseeInnovacion?.aplica ? `Sí — Tipo: ${datos.poseeInnovacion.tipo || ''}` : 'No');

  section('5. ESCALA TRL');
  field('Nivel TRL Seleccionado', datos.trlSeleccionado);

  section('6. RESUMEN Y ABSTRACT');
  multiField('Resumen', datos.resumen);
  field('Palabras Clave', datos.palabrasClave);
  multiField('Abstract', datos.abstract);
  field('Keywords', datos.keywords);

  section('7. EQUIPO DE INVESTIGACIÓN');
  if (datos.investigadoresTEC?.length > 0) {
    doc.autoTable({
      startY: y, margin: { left: margin, right: margin },
      head: [['Nombre', 'Escuela/Depto', 'Horas', 'Rol']],
      body: datos.investigadoresTEC.map(i => [safe(i.nombre), safe(i.escuela || i.departamento), safe(i.horas), safe(i.rol)]),
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 40, 85] }
    });
    y = doc.lastAutoTable.finalY + 6;
  } else { field('Investigadores TEC', 'Ninguno registrado'); }
  if (datos.colaboradoresExternos?.length > 0) {
    checkPage(20);
    doc.setFont('helvetica', 'bold'); doc.text('Colaboradores Externos:', margin, y); y += 5;
    doc.autoTable({
      startY: y, margin: { left: margin, right: margin },
      head: [['Nombre', 'Institución', 'Tipo']],
      body: datos.colaboradoresExternos.map(c => [safe(c.nombre), safe(c.institucion), safe(c.tipo)]),
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 40, 85] }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  section('8. PROBLEMA DE INVESTIGACIÓN');
  multiField('Planteamiento del Problema', datos.problemaInvestigacion);

  section('9. OBJETIVOS DEL PROYECTO');
  multiField('Objetivo General', datos.objetivoGeneral);
  const objs = Array.isArray(datos.objetivosEspecificos) ? datos.objetivosEspecificos : [];
  if (objs.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.text('Objetivos Específicos:', margin, y); y += 5;
    doc.setFont('helvetica', 'normal');
    objs.forEach((o, i) => { if (o && o.trim()) { checkPage(8); const l = doc.splitTextToSize(`${i + 1}. ${o}`, contentW - 6); doc.text(l, margin + 4, y); y += l.length * 4.2 + 1; } });
    y += 2;
  }

  section('10. ESTADO DEL ARTE');
  multiField('Estado del Arte', datos.estadoArte);

  section('11. METODOLOGÍA');
  multiField('Metodología', datos.metodologia);

  section('12. PLAN DE ACCIÓN Y GESTIÓN DE RIESGOS');
  if (datos.actividadesCronograma?.length > 0) {
    doc.autoTable({ startY: y, margin: { left: margin, right: margin }, head: [['Actividad', 'Responsable', 'Inicio', 'Fin']], body: datos.actividadesCronograma.map(a => [safe(a.actividad || a.nombre), safe(a.responsable), safe(a.inicio), safe(a.fin)]), styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 40, 85] } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (datos.riesgosMitigacion?.length > 0) {
    checkPage(20);
    doc.autoTable({ startY: y, margin: { left: margin, right: margin }, head: [['Riesgo', 'Probabilidad', 'Impacto', 'Mitigación']], body: datos.riesgosMitigacion.map(r => [safe(r.riesgo || r.nombre), safe(r.probabilidad), safe(r.impacto), safe(r.mitigacion)]), styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [0, 40, 85] } });
    y = doc.lastAutoTable.finalY + 6;
  }

  section('13. PRESUPUESTO PLURIANUAL');
  if (datos.presupuestoAnual?.length > 0) {
    doc.autoTable({ startY: y, margin: { left: margin, right: margin }, head: [['Año', 'Operativo (₡)', 'Duradero (₡)']], body: datos.presupuestoAnual.map(p => [safe(p.ano), safe(p.operativo || '0'), safe(p.duradero || '0')]), styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [0, 40, 85] } });
    y = doc.lastAutoTable.finalY + 6;
  }

  section('14. PRODUCTOS ACADÉMICOS COMPROMETIDOS');
  field('Rango de Horas', datos.rangoHorasCompromiso);
  if (datos.productos14a) {
    const p = datos.productos14a;
    if (p.opcion1?.check) field('Artículo en revista indexada', `Cantidad: ${p.opcion1.cantidad}, Objetivo: ${p.opcion1.objetivo}`);
    if (p.opcion2?.check) field('Memoria / Ponencia', `Cantidad: ${p.opcion2.cantidad}, Objetivo: ${p.opcion2.objetivo}`);
    if (p.opcion3?.check) field('Libro / Capítulo de libro', `Cantidad: ${p.opcion3.cantidad}, Objetivo: ${p.opcion3.objetivo}`);
    if (p.adicional1) field('Producto adicional 1', p.adicional1);
    if (p.adicional2) field('Producto adicional 2', p.adicional2);
  }

  section('15. ESTRATEGIA DE DIVULGACIÓN Y ASPECTOS ÉTICOS');
  if (datos.divulgacion) {
    const d = datos.divulgacion;
    if (d.cientifica) multiField('Divulgación Científica', d.cientifica);
    if (d.canalesInstitucionales) multiField('Canales Institucionales', d.canalesInstitucionales);
    if (d.socializacion) multiField('Socialización', d.socializacion);
    if (d.mediosMasivos) multiField('Medios Masivos', d.mediosMasivos);
  }
  if (datos.aspectosEticos) {
    const ae = datos.aspectosEticos;
    const eticos = [];
    if (ae.seresHumanos) eticos.push('Seres humanos');
    if (ae.biodiversidad) eticos.push('Biodiversidad');
    if (ae.animales) eticos.push('Animales');
    if (ae.comunidadesIndigenas) eticos.push('Comunidades indígenas');
    field('Aspectos Éticos', eticos.length > 0 ? eticos.join(', ') : 'Ninguno');
  }
  multiField('Hoja de Ruta', datos.hojaRuta);

  section('16. DECLARACIÓN JURADA Y FIRMA');
  field('Resguardo en Repositorio', datos.resguardoCompromiso ? 'Sí' : 'No');
  field('Resguardo de Software', datos.resguardoSoftware ? 'Sí' : 'No');
  multiField('Referencias Bibliográficas', datos.referenciasBibliograficas);
  if (datos.firmaCoordinador) {
    field('Firmado por', datos.firmaCoordinador.nombre);
    field('Cédula', datos.firmaCoordinador.cedula);
    field('Firma Digital', datos.firmaCoordinador.firmadoDigital ? 'Sí' : 'No');
  }

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setFont('helvetica', 'italic');
    doc.text(`Página ${i} de ${totalPages}  |  SGPI — Vicerrectoría de Investigación y Extensión, TEC`, margin, 272);
  }

  doc.save(`Form04_${safe(codigo, 'Propuesta').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}


/* ═══════════════════════════════════════════════════════════════
   2.  EXPORTAR FORM-05  (Plan de Acción y Riesgos)  →  XLSX
   ═══════════════════════════════════════════════════════════════ */
export async function exportarForm05Excel(datos, codigo = '') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGPI — Vicerrectoría de Investigación y Extensión, TEC';
  wb.created = new Date();

  /* ─── Hoja 1: Información General ─── */
  const wsInfo = wb.addWorksheet('Información General');
  wsInfo.columns = [{ width: 30 }, { width: 50 }];

  wsInfo.mergeCells('A1:B1');
  const titleCell = wsInfo.getCell('A1');
  titleCell.value = 'FORMULARIO F-05: PLAN DE ACCIÓN Y GESTIÓN DEL RIESGO';
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { horizontal: 'center' };

  wsInfo.mergeCells('A2:B2');
  wsInfo.getCell('A2').value = 'Instituto Tecnológico de Costa Rica — Vicerrectoría de Investigación y Extensión';
  wsInfo.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF475569' } };
  wsInfo.getCell('A2').alignment = { horizontal: 'center' };

  const infoData = [
    ['Código de Propuesta', safe(codigo)],
    ['Título del Proyecto', safe(datos.nombrePropuesta, 'Sin título')],
    ['Tipo de Iniciativa', safe(datos.tipoIniciativa)],
    ['Duración', safe(datos.duracionMeses)],
    ['Fecha de Generación', hoy()]
  ];
  let row = 4;
  infoData.forEach(([label, val]) => {
    wsInfo.getCell(`A${row}`).value = label;
    wsInfo.getCell(`A${row}`).font = { bold: true };
    wsInfo.getCell(`B${row}`).value = val;
    row++;
  });

  /* ─── Hoja 2: Equipo de Trabajo ─── */
  const wsEquipo = wb.addWorksheet('Equipo de Trabajo');
  wsEquipo.columns = [
    { header: 'Nombre', key: 'nombre', width: 35 },
    { header: 'Iniciales', key: 'iniciales', width: 12 },
    { header: 'Rol', key: 'rol', width: 30 }
  ];
  applyHeaderRow(wsEquipo, 1, 3);

  const integrantes = datos.integrantes || [];
  integrantes.forEach(i => {
    wsEquipo.addRow({ nombre: safe(i.nombre), iniciales: safe(i.iniciales), rol: safe(i.rol) });
  });
  if (integrantes.length > 0) applyDataBorders(wsEquipo, 2, 1 + integrantes.length, 3);

  /* ─── Hoja 3: Plan de Acción y Gestión del Riesgo ─── */
  const wsPlan = wb.addWorksheet('Plan de Acción');

  // Determine number of years from duracionMeses
  const durStr = safe(datos.duracionMeses);
  const numAnios = durStr.includes('12') ? 1 : durStr.includes('36') ? 3 : 2;

  // Build columns: fixed fields + months for each year
  const fixedHeaders = [
    'Objetivo', 'Actividades', 'Resultado Esperado', 'Participantes',
    'Responsabilidad', 'Riesgos Identificados', 'Medidas de Mitigación',
    'Responsable de la Gestión', 'Mes de Inicio', 'Duración (Meses)'
  ];
  const fixedWidths = [12, 25, 20, 12, 14, 20, 20, 14, 10, 10];

  // Build column definitions
  const allCols = [];
  fixedHeaders.forEach((h, idx) => {
    allCols.push({ header: '', key: `f${idx}`, width: fixedWidths[idx] });
  });
  for (let a = 1; a <= numAnios; a++) {
    for (let m = 1; m <= 12; m++) {
      allCols.push({ header: '', key: `a${a}m${m}`, width: 4 });
    }
  }
  wsPlan.columns = allCols;

  const totalCols = fixedHeaders.length + numAnios * 12;

  // Row 1: Title spanning all columns
  wsPlan.mergeCells(1, 1, 1, totalCols);
  const planTitle = wsPlan.getCell(1, 1);
  planTitle.value = 'PLAN DE ACCIÓN Y GESTIÓN DE RIESGOS';
  planTitle.font = TITLE_FONT;
  planTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: Header row 1 — fixed columns span 2 rows, "PERIODO DE EJECUCIÓN" spans years
  const headerRow1 = wsPlan.getRow(2);
  fixedHeaders.forEach((h, idx) => {
    wsPlan.mergeCells(2, idx + 1, 3, idx + 1); // merge rows 2-3 for fixed headers
    const cell = wsPlan.getCell(2, idx + 1);
    cell.value = h.toUpperCase();
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // "PERIODO DE EJECUCIÓN" spanning all year columns in row 2 — but we put each year header
  for (let a = 0; a < numAnios; a++) {
    const startCol = fixedHeaders.length + 1 + a * 12;
    const endCol = startCol + 11;
    wsPlan.mergeCells(2, startCol, 2, endCol);
    const cell = wsPlan.getCell(2, startCol);
    cell.value = `AÑO ${a + 1}`;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_THIN;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Row 3: month numbers under each year
  const headerRow3 = wsPlan.getRow(3);
  for (let a = 0; a < numAnios; a++) {
    for (let m = 0; m < 12; m++) {
      const col = fixedHeaders.length + 1 + a * 12 + m;
      const cell = headerRow3.getCell(col);
      cell.value = m + 1;
      cell.fill = HEADER_FILL;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.border = BORDER_THIN;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  // Data rows
  const acts = datos.actividades || [];
  let dataRow = 4;
  acts.forEach(a => {
    const rowValues = [
      safe(a.objetivo),
      safe(a.actividad),
      safe(a.resultado),
      safe(a.participante),
      safe(a.responsabilidad),
      safe(a.riesgo),
      safe(a.mitigacion),
      safe(a.responsableGestion),
      safe(a.mesInicio),
      safe(a.duracionMesesAct)
    ];

    // Period of execution checkboxes as "X" or ""
    for (let yr = 1; yr <= numAnios; yr++) {
      for (let mo = 1; mo <= 12; mo++) {
        const checked = a.periodoEjecucion?.[`a${yr}`]?.[`m${mo}`];
        rowValues.push(checked ? 'X' : '');
      }
    }

    const excelRow = wsPlan.getRow(dataRow);
    rowValues.forEach((v, idx) => {
      excelRow.getCell(idx + 1).value = v;
      excelRow.getCell(idx + 1).border = BORDER_THIN;
      excelRow.getCell(idx + 1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Left-align text columns
    [1, 2, 3, 6, 7].forEach(col => {
      excelRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    dataRow++;
  });

  const fileName = `Form05_PlanRiesgos_${safe(codigo).replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  await guardarWorkbook(wb, fileName);
}


/* ═══════════════════════════════════════════════════════════════
   3.  EXPORTAR FORM-06  (Presupuesto Operativo)  →  XLSX
   ═══════════════════════════════════════════════════════════════ */
export async function exportarPresupuestoExcel(presupuestos, propuesta, usuario) {
  const totalRubros = Object.values(presupuestos).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  if (totalRubros === 0) {
    alert('No hay objetos de gasto registrados para exportar. Agregue al menos una partida.');
    return;
  }

  const cod = propuesta?.codigoPropuesta || 'FVIE-2026-001';
  const nom = propuesta?.titulo || 'Sin título';
  const autor = usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador Principal';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGPI — VIE, TEC';
  wb.created = new Date();

  const anios = [2027, 2028, 2029];
  let granTotal = 0;
  const resumenData = [];

  /* ─── Una hoja por año ─── */
  anios.forEach((ano, idx) => {
    const filas = presupuestos[ano] || [];
    const subtotal = filas.reduce((a, b) => a + (Number(b.monto) || 0), 0);
    granTotal += subtotal;

    const serv = filas.filter(f => f.categoria === 'Servicios').reduce((a, b) => a + (Number(b.monto) || 0), 0);
    const mat  = filas.filter(f => f.categoria === 'Materiales').reduce((a, b) => a + (Number(b.monto) || 0), 0);
    const bec  = filas.filter(f => f.categoria === 'Becas').reduce((a, b) => a + (Number(b.monto) || 0), 0);
    const eq   = filas.filter(f => f.categoria === 'Equipo').reduce((a, b) => a + (Number(b.monto) || 0), 0);
    resumenData.push({ ano, serv, mat, bec, eq, total: subtotal });

    const ws = wb.addWorksheet(`Año ${idx + 1} (${ano})`);

    // Encabezado
    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = 'FORMULARIO F-06: PRESUPUESTO OPERATIVO DE PROYECTO';
    ws.getCell('A1').font = TITLE_FONT;
    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = `${cod} — ${nom}`;
    ws.getCell('A2').font = { size: 10, italic: true };
    ws.mergeCells('A3:E3');
    ws.getCell('A3').value = `Investigador(a): ${autor}  |  Generado: ${hoy()}`;
    ws.getCell('A3').font = { size: 9, color: { argb: 'FF627D98' } };

    // Tabla de datos
    ws.getRow(5).values = ['Código OG', 'Categoría', 'Detalle de Objeto de Gasto', 'Monto (CRC)', 'Justificación Técnica'];
    ws.columns = [{ width: 16 }, { width: 14 }, { width: 40 }, { width: 18 }, { width: 40 }];
    applyHeaderRow(ws, 5, 5);

    let r = 6;
    filas.forEach(f => {
      ws.getRow(r).values = [f.codigo, f.categoria, f.detalle || '', Number(f.monto) || 0, f.justificacion || ''];
      ws.getCell(`D${r}`).numFmt = '#,##0.00';
      r++;
    });
    if (filas.length > 0) applyDataBorders(ws, 6, 5 + filas.length, 5);

    // Subtotal
    ws.getRow(r).values = ['', '', `Subtotal Año ${idx + 1} (${ano}):`, subtotal, ''];
    ws.getCell(`C${r}`).font = { bold: true };
    ws.getCell(`D${r}`).font = { bold: true };
    ws.getCell(`D${r}`).numFmt = '#,##0.00';
    ws.getCell(`D${r}`).border = BORDER_THIN;
  });

  /* ─── Hoja Resumen Consolidado ─── */
  const wsR = wb.addWorksheet('Resumen Trienal');
  wsR.mergeCells('A1:F1');
  wsR.getCell('A1').value = 'RESUMEN CONSOLIDADO TRIENAL (VIE 2027-2029)';
  wsR.getCell('A1').font = TITLE_FONT;

  wsR.getRow(3).values = ['Año', 'Servicios (CRC)', 'Materiales (CRC)', 'Becas (CRC)', 'Equipo (CRC)', 'Total Anual (CRC)'];
  wsR.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }];
  applyHeaderRow(wsR, 3, 6);

  let rr = 4;
  resumenData.forEach(d => {
    wsR.getRow(rr).values = [d.ano, d.serv, d.mat, d.bec, d.eq, d.total];
    for (let c = 2; c <= 6; c++) {
      wsR.getRow(rr).getCell(c).numFmt = '#,##0.00';
    }
    rr++;
  });
  applyDataBorders(wsR, 4, 3 + resumenData.length, 6);

  // Gran total
  wsR.getRow(rr).values = ['GRAN TOTAL', '', '', '', '', granTotal];
  wsR.getCell(`A${rr}`).font = { bold: true, size: 12 };
  wsR.getCell(`F${rr}`).font = { bold: true, size: 12 };
  wsR.getCell(`F${rr}`).numFmt = '#,##0.00';
  wsR.getCell(`F${rr}`).border = BORDER_THIN;

  const fileName = `Presupuesto_F06_VIE_${cod.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
  await guardarWorkbook(wb, fileName);
}


/* ═══════════════════════════════════════════════════════════════
   4.  DESCARGAR DATOS DE UNA PROPUESTA  →  PDF resumen rápido
   ═══════════════════════════════════════════════════════════════ */
export async function descargarPropuestaPDF(propuestaId, propuestaService) {
  try {
    let datos = null;
    try { datos = await propuestaService.obtenerPropuesta(propuestaId); } catch (_e) {}

    const localKey = `borrador_form04_${propuestaId}`;
    const localData = localStorage.getItem(localKey);
    const local = localData ? JSON.parse(localData) : {};

    const merged = {
      nombreProyecto: datos?.titulo || local.nombreProyecto || '',
      modalidad: local.modalidad || '',
      fechaInicio: datos?.fechaInicio || local.fechaInicio || '',
      fechaFin: datos?.fechaFinalizacion || local.fechaFin || '',
      trlSeleccionado: datos?.nivelTrlActual || local.trlSeleccionado || '',
      resumen: datos?.contenido?.resumen || local.resumen || '',
      palabrasClave: datos?.contenido?.palabrasClave || local.palabrasClave || '',
      abstract: datos?.contenido?.abstract || local.abstract || '',
      keywords: local.keywords || '',
      problemaInvestigacion: datos?.contenido?.problemaInvestigacion || local.problemaInvestigacion || '',
      objetivoGeneral: datos?.contenido?.objetivoGeneral || local.objetivoGeneral || '',
      objetivosEspecificos: local.objetivosEspecificos || [],
      estadoArte: datos?.contenido?.estadoArte || local.estadoArte || '',
      metodologia: datos?.contenido?.metodologia || local.metodologia || '',
      otrasFuentes: local.otrasFuentes || {},
      vinculacionTecnica: local.vinculacionTecnica || {},
      problemasNacionales: local.problemasNacionales || {},
      requiereInstrumento: local.requiereInstrumento || {},
      convenioMarco: local.convenioMarco || {},
      basePosgrado: local.basePosgrado || {},
      infoConfidencial: local.infoConfidencial || {},
      potencialPI: local.potencialPI || {},
      poseeInnovacion: local.poseeInnovacion || {},
      investigadoresTEC: local.investigadoresTEC || [],
      colaboradoresExternos: local.colaboradoresExternos || [],
      actividadesCronograma: local.actividadesCronograma || [],
      riesgosMitigacion: local.riesgosMitigacion || [],
      presupuestoAnual: local.presupuestoAnual || [],
      fuentesAdicionales: local.fuentesAdicionales || {},
      productos14a: local.productos14a || {},
      productos14b: local.productos14b || {},
      rangoHorasCompromiso: local.rangoHorasCompromiso || '',
      divulgacion: local.divulgacion || {},
      aspectosEticos: local.aspectosEticos || {},
      hojaRuta: datos?.contenido?.hojaRuta || local.hojaRuta || '',
      resguardoCompromiso: local.resguardoCompromiso || false,
      resguardoSoftware: local.resguardoSoftware || false,
      referenciasBibliograficas: local.referenciasBibliograficas || '',
      firmaCoordinador: local.firmaCoordinador || {}
    };

    const codigoPropuesta = datos?.codigoPropuesta || `Propuesta-${propuestaId}`;
    exportarForm04PDF(merged, codigoPropuesta);
  } catch (err) {
    console.error('Error al generar PDF:', err);
    alert('Error al generar el PDF. Verifique que la propuesta tenga datos guardados.');
  }
}


/* ═══════════════════════════════════════════════════════════════
   5.  DESCARGAR PLAN Y RIESGOS DE UNA PROPUESTA  →  XLSX
   ═══════════════════════════════════════════════════════════════ */
export async function descargarPlanRiesgoExcel(propuestaId) {
  // Try primary key first, then fallback to borrador key
  const primaryKey = `propuesta_${propuestaId}_plan_riesgos`;
  const borradorKey = `borrador_form05_${propuestaId}`;
  const localKey04 = `borrador_form04_${propuestaId}`;

  const primaryData = localStorage.getItem(primaryKey);
  const borradorData = localStorage.getItem(borradorKey);
  const localData04 = localStorage.getItem(localKey04);

  const local05 = primaryData ? JSON.parse(primaryData) : (borradorData ? JSON.parse(borradorData) : {});
  const local04 = localData04 ? JSON.parse(localData04) : {};

  const datos = {
    nombrePropuesta: local05.nombrePropuesta || local04.nombreProyecto || '',
    tipoIniciativa: local05.tipoIniciativa || local04.modalidad || '',
    duracionMeses: local05.duracionMeses || '',
    integrantes: local05.integrantes || [],
    actividades: local05.actividades || local04.actividadesCronograma || []
  };

  await exportarForm05Excel(datos, `Propuesta-${propuestaId}`);
}


/* ═══════════════════════════════════════════════════════════════
   6.  DESCARGAR PRESUPUESTO OPERATIVO DE UNA PROPUESTA  →  XLSX
   ═══════════════════════════════════════════════════════════════ */
export async function descargarPresupuestoDirectoExcel(propuestaId, propuestaService, usuario) {
  try {
    let presupuestos = null;
    const localKey = `propuesta_${propuestaId}_presupuesto`;
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      try {
        presupuestos = JSON.parse(localRaw);
      } catch (_e) {}
    }

    let propuesta = null;
    if (propuestaService) {
      try {
        propuesta = await propuestaService.obtenerPropuesta(propuestaId);
      } catch (_e) {}
    }

    const tieneFilasLocales = presupuestos && Object.values(presupuestos).some(arr => Array.isArray(arr) && arr.length > 0);
    if (!tieneFilasLocales && propuesta?.presupuesto?.length > 0) {
      presupuestos = { 2027: [], 2028: [], 2029: [] };
      propuesta.presupuesto.forEach((item) => {
        const anio = item.anioEjecucion || 2027;
        if (!presupuestos[anio]) presupuestos[anio] = [];
        presupuestos[anio].push({
          id: item.presupuestoId,
          codigo: item.rubroPresupuestario?.codigo || '0-00-00-00',
          categoria: item.rubroPresupuestario?.nombre || 'General',
          detalle: item.rubroPresupuestario?.descripcion || item.justificacion || '',
          monto: Number(item.montoSolicitado) || 0,
          justificacion: item.justificacion || ''
        });
      });
    }

    if (!presupuestos || Object.values(presupuestos).every(arr => !arr || arr.length === 0)) {
      alert('Esta propuesta aún no tiene objetos de gasto presupuestados en el Formulario 06.');
      return;
    }

    await exportarPresupuestoExcel(presupuestos, propuesta, usuario);
  } catch (err) {
    console.error('Error al exportar presupuesto:', err);
    alert('Error al generar el archivo Excel de presupuesto.');
  }
}
