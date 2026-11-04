// src/utils/errores.js
// Texto de un error de la API: FastAPI devuelve { detail: "mensaje" } en los errores de negocio.
export const detalleDeError = (error, porDefecto) => {
  const detalle = error.response?.data?.detail;
  return typeof detalle === 'string' ? detalle : porDefecto;
};
