// src/data/revisionConfig.js
// Configuración visual de la ventana Revisión VIE (etiquetas, colores y pasos).
// Los DATOS (requisitos, documentos, expediente) vienen del backend: GET /vie/expedientes/{codigo}/revision

export const ESTADOS_REQUISITO = {
  CUMPLE: { etiqueta: 'Cumple', clase: 'listo' },
  NO_CUMPLE: { etiqueta: 'No cumple', clase: 'pendiente' },
  EN_REVISION: { etiqueta: 'En revisión', clase: 'revision' },
  NO_APLICA: { etiqueta: 'No aplica', clase: 'noaplica' },
};

export const ESTADOS_DOCUMENTO = {
  CARGADO: { etiqueta: 'Cargado', clase: 'listo' },
  FALTANTE: { etiqueta: 'Falta', clase: 'pendiente' },
};

export const PASOS = ['Revisión normativa', 'Revisión documentos', 'Subsanaciones', 'Envío al CIE'];

// Estado de revisión de cada documento (ventana Revisión de documentos)
export const ESTADOS_REVISION_DOCUMENTO = {
  SIN_REVISAR: { etiqueta: 'Sin revisar', clase: 'revision' },
  CORRECTO: { etiqueta: 'Correcto', clase: 'listo' },
  INCOMPLETO: { etiqueta: 'Incompleto', clase: 'subsanacion' },
  FALTA_FIRMA: { etiqueta: 'Falta firma', clase: 'subsanacion' },
  FALTANTE: { etiqueta: 'Falta', clase: 'pendiente' },
};

// Opciones que puede elegir la gestora para un documento cargado
export const OPCIONES_REVISION_DOCUMENTO = ['SIN_REVISAR', 'CORRECTO', 'INCOMPLETO', 'FALTA_FIRMA'];
