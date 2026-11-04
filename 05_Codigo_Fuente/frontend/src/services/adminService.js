import api from './api';

export const adminService = {
  // === USUARIOS ===
  listarUsuarios: (params = {}) => api.get('/api/admin/usuarios', { params }),
  obtenerUsuario: (id) => api.get(`/api/admin/usuarios/${id}`),
  crearUsuario: (data) => api.post('/api/admin/usuarios', data),
  actualizarUsuario: (id, data) => api.patch(`/api/admin/usuarios/${id}`, data),
  cambiarEstadoUsuario: (id, activo) => api.put(`/api/admin/usuarios/${id}/estado`, { activo }),
  resetearContrasena: (id, nuevaContrasena) => api.put(`/api/admin/usuarios/${id}/contrasena`, { nuevaContrasena }),

  // === ROLES DE USUARIO ===
  obtenerRolesUsuario: (usuarioId) => api.get(`/api/admin/usuarios/${usuarioId}/roles`),
  asignarRol: (usuarioId, data) => api.post(`/api/admin/usuarios/${usuarioId}/roles`, data),
  revocarRol: (usuarioId, usuarioRolId) => api.delete(`/api/admin/usuarios/${usuarioId}/roles/${usuarioRolId}`),

  // === CATÁLOGO DE ROLES ===
  listarRoles: (params = {}) => api.get('/api/admin/roles', { params }),
  crearRol: (data) => api.post('/api/admin/roles', data),
  actualizarRol: (id, data) => api.patch(`/api/admin/roles/${id}`, data),
  cambiarEstadoRol: (id, activo) => api.put(`/api/admin/roles/${id}/estado`, { activo }),

  // === PERMISOS ===
  listarPermisos: (params = {}) => api.get('/api/admin/permisos', { params }),
  crearPermiso: (data) => api.post('/api/admin/permisos', data),
  obtenerPermisosRol: (rolId) => api.get(`/api/admin/roles/${rolId}/permisos`),
  reemplazarPermisosRol: (rolId, data) => api.put(`/api/admin/roles/${rolId}/permisos`, data),

  // === ACCESIBILIDAD ===
  obtenerPreferencias: (usuarioId) => api.get(`/api/admin/accesibilidad/${usuarioId}`),
  guardarPreferencias: (usuarioId, data) => api.put(`/api/admin/accesibilidad/${usuarioId}`, data),

  // === GESTORÍA VIE ===
  listarAsignacionesGestora: (params = {}) => 
    api.get('/api/admin/asignaciones-gestora', { params }),
  
  crearAsignacionGestora: (data) => 
    api.post('/api/admin/asignaciones-gestora', data),
  
  eliminarAsignacionGestora: (id) => 
    api.delete(`/api/admin/asignaciones-gestora/${id}`),

    obtenerEstadisticasDashboard: () => api.get('/api/admin/dashboard/estadisticas'),
  
  obtenerActividadSistema: (params = {}) => 
    api.get('/api/admin/dashboard/actividad', { params }),
  
  obtenerTimelinePropuestas: (meses = 6) => 
    api.get('/api/admin/dashboard/estadisticas/propuestas/timeline', { 
      params: { meses } 
    }),
  
  obtenerDistribucionEscuelas: () => 
    api.get('/api/admin/dashboard/estadisticas/escuelas/distribucion'),
};