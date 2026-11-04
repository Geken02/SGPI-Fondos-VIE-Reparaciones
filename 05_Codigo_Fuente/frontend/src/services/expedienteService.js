import api from './api';

const BASE = '/vie/expedientes';

export const expedienteService = {
  async obtenerBandeja() {
    const { data } = await api.get(BASE);
    return data;
  },

  async obtenerRevision(codigo) {
    const { data } = await api.get(
      `${BASE}/${encodeURIComponent(codigo)}/revision`
    );
    return data;
  },

  async obtenerDocumentos(codigo) {
    const { data } = await api.get(
      `${BASE}/${encodeURIComponent(codigo)}/documentos`
    );
    return data;
  },

  async guardarRevisionDocumentos(codigo, revisiones) {
    const { data } = await api.put(
      `${BASE}/${encodeURIComponent(codigo)}/documentos/revision`,
      { revisiones }
    );
    return data;
  },

  async obtenerValidacion(codigo) {
    const { data } = await api.get(
      `${BASE}/${encodeURIComponent(codigo)}/validacion`
    );
    return data;
  },

  async guardarRequisitos(codigo, requisitos) {
    const { data } = await api.put(
      `${BASE}/${encodeURIComponent(codigo)}/validacion/requisitos`,
      { cambios: requisitos }
    );
    return data;
  },

  async solicitarSubsanacion(codigo, comentario) {
    const { data } = await api.post(
      `${BASE}/${encodeURIComponent(codigo)}/subsanaciones`,
      { comentario }
    );
    return data;
  },

  async enviarAlCIE(codigo) {
    const { data } = await api.post(`${BASE}/${encodeURIComponent(codigo)}/enviar-cie`);
    return data;
  },
};
