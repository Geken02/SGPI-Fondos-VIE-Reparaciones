// src/services/authService.js
import api from './api';

export const authService = {
  login: async (data) => {
    // 👇 ASEGÚRATE QUE DIGA '/api/auth/login'
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  obtenerPerfil: async () => {
    const response = await api.get('/api/auth/perfil');
    return response.data;
  },

  actualizarPerfil: async (datos) => {
    const response = await api.put('/auth/perfil', datos);
    return response.data;
  },

  solicitarRecuperacion: async (data) => {
    const response = await api.post('/api/auth/recuperacion', data);
    return response.data;
  },

  verificarToken: async (token) => {
    const response = await api.get(`/api/auth/recuperacion/verificar/${token}`);
    return response.data;
  },

  recuperarContrasena: async (token, data) => {
    const response = await api.post(`/api/auth/recuperacion/reset/${token}`, data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  },


  obtenerDashboardUsuario: () => api.get('/api/auth/me/dashboard'),
};