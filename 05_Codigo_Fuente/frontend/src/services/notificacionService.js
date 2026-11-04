import api from './api';

export const notificacionService = {
  listarNotificaciones: async () => {
    const response = await api.get('/notificaciones');
    return response.data;
  },

  obtenerConteoNoLeidas: async () => {
    const response = await api.get('/notificaciones/conteo');
    return response.data;
  },

  marcarLeida: async (id) => {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  },

  marcarTodasLeidas: async () => {
    const response = await api.put('/notificaciones/marcar-todas-leidas');
    return response.data;
  }
};
