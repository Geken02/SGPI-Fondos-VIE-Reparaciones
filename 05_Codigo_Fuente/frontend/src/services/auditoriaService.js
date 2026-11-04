import api from './api';

export const auditoriaService = {
  consultarBitacora: (params = {}) => api.get('/api/admin/bitacora', { params }),
  verificarIntegridad: (limite = 1000) => api.get('/api/admin/bitacora/integridad', { params: { limite } }),
  detalleLog: (logId) => api.get(`/api/admin/bitacora/${logId}`),
  catalogoEventos: () => api.get('/api/admin/eventos-log'),
  catalogoSeveridades: () => api.get('/api/admin/severidades-log'),
  catalogoSources: () => api.get('/api/admin/sources-log'),
  catalogoObjetos: () => api.get('/api/admin/objetos-log'),
};