import api from './api';

const BASE = '/vie/subsanaciones';

export const subsanacionService = {
  async obtenerSubsanaciones() {
    const { data } = await api.get(BASE);
    return data;
  },

  async resolver(subsanacionId, accion, comentario = '') {
    const { data } = await api.patch(
      `${BASE}/${encodeURIComponent(subsanacionId)}/resolver`,
      { accion, comentario }
    );
    return data;
  },
};
