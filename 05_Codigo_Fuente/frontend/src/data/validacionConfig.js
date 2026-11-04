// src/data/validacionConfig.js
// Configuración visual de la ventana Validación normativa (etiquetas, colores e íconos).
// Los DATOS (requisitos, estados, documentos) vienen del backend: GET /vie/expedientes/{codigo}/validacion

export const ESTADOS_VALIDACION = {
  CUMPLE: { etiqueta: 'Cumple', clase: 'cumple', icono: 'check' },
  NO_CUMPLE: { etiqueta: 'No cumple', clase: 'nocumple', icono: 'close' },
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'pend', icono: 'clock' },
  NO_APLICA: { etiqueta: 'No aplica', clase: 'noaplica', icono: 'close' },
};

export const COLORES_LEYENDA = {
  CUMPLE: '#2f9e6b',
  NO_CUMPLE: '#e5484d',
  PENDIENTE: '#f59e0b',
  NO_APLICA: '#9fb3cc',
};

export const ESTADOS_DOCUMENTO = {
  CARGADO: { etiqueta: 'Cargado', clase: 'listo' },
  FALTANTE: { etiqueta: 'Falta', clase: 'pendiente' },
};

// Ícono y color de cada grupo de la lista de verificación (el id lo define el backend)
export const GRUPOS_VISUAL = {
  generales: { icono: 'fileText', color: 'azul' },
  eticos: { icono: 'shield', color: 'morado' },
  financieros: { icono: 'dollar', color: 'turquesa' },
  tecnicos: { icono: 'settings', color: 'naranja' },
};

export const PASOS = ['Validación normativa', 'Revisión de documentos', 'Subsanaciones', 'Envío al CIE'];
