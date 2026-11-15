import ExcelJS from 'exceljs';

export const importarExcelOficial = async (file, rubricaData) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const ws = workbook.worksheets[0];
  const evaluaciones = {};
  const errores = [];
  let criteriosProcesados = 0;

  // Mapeo de criterios de la BD para hacer matching
  const criteriosBD = rubricaData.estructuraRubrica.secciones.flatMap(s => s.criterios);

  // Recorrer filas (Empezamos en la 11, que es donde inician los criterios según nuestro generador)
  ws.eachRow((row, rowNumber) => {
    if (rowNumber < 11) return; // Saltar encabezados

    const celdaCriterio = row.getCell(1).value;
    if (!celdaCriterio || typeof celdaCriterio !== 'string') return;

    // Detectar fin de la tabla
    if (celdaCriterio.includes('CALIFICACIÓN FINAL') || celdaCriterio.includes('PRODUCTOS ACADÉMICOS')) return;
    if (celdaCriterio.toLowerCase().includes('subtotal')) return;

    // Limpiar nombre (quitar "⛔ " si es obligatorio)
    const nombreLimpio = celdaCriterio.replace(/^⛔\s*/, '').trim();

    // Buscar en la BD
    const criterioBD = criteriosBD.find(c => 
      c.nombre.toLowerCase().replace(/\s+/g, ' ') === nombreLimpio.toLowerCase().replace(/\s+/g, ' ')
    );

    if (criterioBD) {
      const nivel = row.getCell(7).value; // Columna G
      const puntaje = row.getCell(8).value; // Columna H
      const justificacion = row.getCell(9).value; // Columna I

      // Validación básica
      const nivelesValidos = ['Deficiente', 'Regular', 'Bueno', 'Excelente'];
      if (nivel && !nivelesValidos.includes(nivel)) {
        errores.push(`Fila ${rowNumber}: Nivel "${nivel}" inválido para "${nombreLimpio}".`);
        return;
      }

      evaluaciones[criterioBD.id] = {
        nivel: nivel || '',
        puntaje: puntaje !== null && puntaje !== undefined ? parseFloat(puntaje) : null,
        justificacion: justificacion || '',
        justificacionRequerida: (puntaje < 10) || criterioBD.es_requisito_obligatorio
      };
      criteriosProcesados++;
    }
  });

  return { evaluaciones, errores, criteriosProcesados };
};