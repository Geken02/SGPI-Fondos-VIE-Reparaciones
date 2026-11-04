import api from './api';

// Lista de todos los catálogos disponibles para generar menús o validaciones
export const CLAVES_CATALOGOS = [
  'lineas-investigacion', 'tipos-hora', 'niveles-trl', 'modalidades',
  'tipos-innovacion', 'roles-equipo', 'tipos-responsabilidad', 'rubros',
  'tipos-documento', 'tipos-financiamiento', 'entidades-emisoras',
  'entes-regulatorios', 'estados-aval', 'estados-subsanacion',
  'tipos-acuerdo', 'tipos-producto', 'tipos-evaluacion',
  'tipos-recomendacion', 'estados-evaluacion', 'tipos-dictamen',
  'campus', 'escuelas', 'estados-propuesta', 'modulos',
  'tamanios-fuente', 'filtros-daltonismo', 'configuraciones',
  'convocatorias', 'etapas',
];

export const catalogoService = {
  // Método genérico que funciona para cualquier catálogo
  listar: (clave, params = {}) => api.get(`/api/admin/${clave}`, { params }),
  obtener: (clave, id) => api.get(`/api/admin/${clave}/${id}`),
  crear: (clave, data) => api.post(`/api/admin/${clave}`, data),
  actualizar: (clave, id, data) => api.patch(`/api/admin/${clave}/${id}`, data),
  cambiarEstado: (clave, id, activo) => api.put(`/api/admin/${clave}/${id}/estado`, { activo }),

  // Métodos específicos (azúcar sintáctico) para los más usados en el Dashboard
  escuelas: {
    listar: (params) => api.get('/api/admin/escuelas', { params }),
    crear: (data) => api.post('/api/admin/escuelas', data),
  },
  
  campus: {
    listar: (params) => api.get('/api/admin/campus', { params }),
  },

  convocatorias: {
    listar: (params) => api.get('/api/admin/convocatorias', { params }),
  },
};