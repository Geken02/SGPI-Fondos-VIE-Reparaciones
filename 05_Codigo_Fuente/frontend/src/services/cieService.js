// src/services/cieService.js — API del Miembro del CIE (backend: /miembro-cie/*)
import api from './api';

const BASE = '/miembro-cie';

export const cieService = {
  listarExpedientes: async () => (await api.get(`${BASE}/expedientes`)).data,
  obtenerExpediente: async (codigo) => (await api.get(`${BASE}/expedientes/${codigo}`)).data,
  obtenerRubrica: async () => (await api.get(`${BASE}/rubrica`)).data,
  obtenerEvaluacion: async (codigo) => (await api.get(`${BASE}/expedientes/${codigo}/evaluacion`)).data,
  guardarEvaluacion: async (codigo, datos) => (await api.put(`${BASE}/expedientes/${codigo}/evaluacion`, datos)).data,
  emitirResolucion: async (codigo, datos) => (await api.post(`${BASE}/expedientes/${codigo}/resolucion`, datos)).data,
  listarResoluciones: async () => (await api.get(`${BASE}/resoluciones`)).data,
};

// Mensaje legible a partir de un error de axios
export const mensajeError = (error, porDefecto = 'No se pudo completar la operación.') => {
  const detalle = error?.response?.data?.detail;
  if (typeof detalle === 'string') return detalle;
  if (Array.isArray(detalle) && detalle[0]?.msg) return detalle[0].msg;
  if (error?.response?.status === 403) return 'No tienes permiso para esta acción (se requiere el rol MiembroCIE).';
  if (error?.response?.status === 404) return 'No se encontró el recurso solicitado.';
  if (!error?.response) return 'No hay conexión con el servidor.';
  return porDefecto;
};
