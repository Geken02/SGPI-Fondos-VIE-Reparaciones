// src/utils/fechas.js
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// '2026-09-25' -> '25 sep. 2026' (o '25 sep 2026' con { punto: false })
export const formatearFecha = (iso, { punto = true } = {}) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}${punto ? '.' : ''} ${anio}`;
};
