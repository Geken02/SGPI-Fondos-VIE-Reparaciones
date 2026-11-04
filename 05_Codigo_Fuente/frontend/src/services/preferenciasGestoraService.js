import api from './api';

export const preferenciasGestoraService = {
  async obtener() {
    const { data } = await api.get('/vie/preferencias');
    return data;
  },
  async guardar(preferencias) {
    const { data } = await api.put('/vie/preferencias', preferencias);
    return data;
  },
};
