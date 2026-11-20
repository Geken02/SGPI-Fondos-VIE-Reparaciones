// src/services/authService.js
import api from './api';

export const authService = {
  login: async (data) => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  obtenerPerfil: async () => {
    const response = await api.get('/api/auth/perfil');
    return response.data;
  },

  actualizarPerfil: async (datos) => {
    // Nota: Verifica si tu backend espera '/api/auth/perfil' o '/auth/perfil'
    const response = await api.put('/api/auth/perfil', datos); 
    return response.data;
  },

  // ✅ NUEVA FUNCIÓN AGREGADA: Sube la foto de perfil al backend
  actualizarFotoPerfil: async (usuarioId, archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);

    // Esta ruta debe coincidir exactamente con la que creamos en el backend
    const response = await api.post(`/api/usuarios/${usuarioId}/foto-perfil`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
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