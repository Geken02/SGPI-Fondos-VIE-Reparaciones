// src/data/estadosPropuesta.js
// Mapeo centralizado de los estados de una propuesta.
// Fuente de verdad: tabla estadospropuesta (database/scripts/02_insert_catalogs.sql).
// Cada entrada define el texto visible y la clase CSS del badge (ver styles/dashboard.css).

export const ESTADOS_PROPUESTA = {
  1: { codigo: 'BORRADOR', etiqueta: 'Borrador', clase: 'borrador' },
  // En la BD el código es ENVIADA ("Enviada a VIE"); la interfaz muestra el texto institucional.
  2: { codigo: 'ENVIADA', etiqueta: 'Enviada a Vinculación', clase: 'info' },
  3: { codigo: 'EN_VINCULACION', etiqueta: 'En Evaluación de Vinculación', clase: 'warning' },
  4: { codigo: 'EN_COMITE', etiqueta: 'En Comité Técnico', clase: 'comite' },
  5: { codigo: 'EN_CONSEJO', etiqueta: 'En Consejo de Escuela', clase: 'consejo' },
  6: { codigo: 'EN_CIE', etiqueta: 'En CIE', clase: 'cie' },
  7: { codigo: 'APROBADA', etiqueta: 'Aprobada', clase: 'success' },
  8: { codigo: 'RECHAZADA', etiqueta: 'Rechazada', clase: 'rechazada' },
  9: { codigo: 'CANCELADA', etiqueta: 'Cancelada', clase: 'cancelada' },
};

// Estado derivado (no es un estado persistido en la tabla): propuesta devuelta para corrección.
export const ESTADO_SUBSANACION = { codigo: 'EN_SUBSANACION', etiqueta: 'En Subsanación', clase: 'subsanacion' };

export const ESTADO_BORRADOR = ESTADOS_PROPUESTA[1];

const normalizar = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const buscarPorNombre = (nombreEstado) => {
  const buscado = normalizar(nombreEstado);
  if (!buscado) return null;
  return (
    Object.values(ESTADOS_PROPUESTA).find(
      (estado) => normalizar(estado.etiqueta) === buscado || normalizar(estado.codigo) === buscado
    ) || null
  );
};

/**
 * Devuelve la etiqueta y clase de badge de un estado de propuesta.
 * Prioriza el estadoId (ID real de la base de datos) y usa el nombre como respaldo.
 */
export const obtenerEstadoPropuesta = (estadoId, nombreEstado) => {
  const porId = ESTADOS_PROPUESTA[Number(estadoId)];
  if (porId) return porId;
  const porNombre = buscarPorNombre(nombreEstado);
  if (porNombre) return porNombre;
  return { codigo: null, etiqueta: nombreEstado || ESTADO_BORRADOR.etiqueta, clase: 'info' };
};

/** Clase CSS completa que debe llevar el badge (incluye badge-status). */
export const claseBadgeEstado = (estadoId, nombreEstado) =>
  `badge-status ${obtenerEstadoPropuesta(estadoId, nombreEstado).clase}`;

/** Etiqueta de texto del estado. */
export const etiquetaEstado = (estadoId, nombreEstado) =>
  obtenerEstadoPropuesta(estadoId, nombreEstado).etiqueta;
