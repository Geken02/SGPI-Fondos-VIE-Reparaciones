// src/data/subsanacionesConfig.js
// Configuración visual de la ventana Subsanaciones (pestañas y etiquetas de estado).
// Los DATOS vienen del backend: GET /vie/subsanaciones (ver subsanacion_service.py).

export const PESTANAS = [
  { codigo: 'PENDIENTES', etiqueta: 'Pendientes' },
  { codigo: 'EN_PROCESO', etiqueta: 'En proceso' },
  { codigo: 'COMPLETADAS', etiqueta: 'Completadas' },
];

export const ESTADOS_SUBSANACION = {
  PENDIENTE: { etiqueta: 'Pendiente', clase: 'pendiente' },
  RECHAZADA: { etiqueta: 'Rechazada', clase: 'pendiente' },
  EN_PROCESO: { etiqueta: 'En proceso', clase: 'revision' },
  COMPLETADA: { etiqueta: 'Completada', clase: 'listo' },
};
