// src/services/comiteTecnicoService.js
import api from './api';

export const comiteTecnicoService = {
  // ========== ASISTENTE ==========
  
  // Bandeja de completitud
  obtenerBandejaCompletitud: (params = {}) => 
    api.get('/api/comite-tecnico/asistente/bandeja-completitud', { params }),
  
  // Solicitar subsanación
  solicitarSubsanacion: (propuestaId, data) => 
    api.post(`/api/comite-tecnico/asistente/${propuestaId}/solicitar-subsanacion`, data),
  
  // Asignar evaluadores
  asignarEvaluadores: (propuestaId, data) => 
    api.post(`/api/comite-tecnico/asistente/${propuestaId}/asignar-evaluadores`, data),

  obtenerPropuestasAsignadas: (params = {}) => 
    api.get('/api/comite-tecnico/asistente/propuestas-asignadas', { params }),

    // Aprobar completitud (Asistente)
  aprobarCompletitud: (propuestaId) => 
    api.post(`/api/comite-tecnico/asistente/${propuestaId}/aprobar-completitud`),
  
  // ========== PROFESOR EVALUADOR ==========
  
  // Bandeja de evaluación
  obtenerBandejaEvaluacion: () => 
    api.get('/api/comite-tecnico/evaluador/bandeja-evaluacion'),
  
  // Expediente de propuesta
  obtenerExpediente: (propuestaId) => 
    api.get(`/api/comite-tecnico/evaluador/expediente/${propuestaId}`),
  
  
  
  // ========== COORDINADOR ==========
  
  // Consolidar evaluaciones
consolidarEvaluaciones: (propuestaId) => 
  api.get(`/api/comite-tecnico/coordinador/consolidar/${propuestaId}`),

emitirDictamen: (propuestaId, data) => 
  api.post(`/api/comite-tecnico/coordinador/${propuestaId}/emitir-dictamen`, data),

  obtenerEstructuraRubrica: (propuestaId) => 
    api.get(`/api/comite-tecnico/evaluador/rubrica/${propuestaId}`),

  guardarBorrador: (propuestaId, data) => 
    api.post(`/api/comite-tecnico/evaluador/${propuestaId}/guardar-borrador`, data),

enviarEvaluacion: (propuestaId, data) => 
  api.post(`/api/comite-tecnico/evaluaciones/${propuestaId}`, data),

  obtenerDocumentosPropuesta: (propuestaId) => 
    api.get(`/api/comite-tecnico/evaluador/${propuestaId}/documentos`),

  obtenerEstadoIA: () => 
    api.get('/api/comite-tecnico/ia/estado'),

  analizarJustificacionIA: (data) => 
    api.post('/api/comite-tecnico/ia/analizar-justificacion', data),

analizarDocumentoIA: (propuestaId, data) => 
  api.post(`/api/comite-tecnico/ia/analizar-documento/${propuestaId}`, data),

  obtenerEvaluadoresDisponibles: async () => {
    const response = await api.get('/api/comite-tecnico/evaluadores-disponibles');
    return response.data;
  },

  asignarEvaluador: async (propuestaId, evaluadorId, comentarios = '') => {
    const response = await api.post('/api/comite-tecnico/asignar-evaluador', {
      propuestaId,
      evaluadorId,
      comentarios
    });
    return response.data;
  },
};