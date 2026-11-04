// src/data/estadosExpediente.js
// Etiqueta y color de cada estado de la bandeja. Los códigos vienen del backend
// (expediente_service.calcular_estado_gestion).
export const ESTADOS = {
  EN_REVISION: { etiqueta: 'En revisión', clase: 'revision' },
  EN_SUBSANACION: { etiqueta: 'En subsanación', clase: 'subsanacion' },
  LISTO_CIE: { etiqueta: 'Listo para CIE', clase: 'listo' },
  APROBADA: { etiqueta: 'Aprobada', clase: 'aprobada' },
  RECHAZADA: { etiqueta: 'Rechazada', clase: 'rechazada' },
  CANCELADA: { etiqueta: 'Cancelada', clase: 'cancelada' },
};
