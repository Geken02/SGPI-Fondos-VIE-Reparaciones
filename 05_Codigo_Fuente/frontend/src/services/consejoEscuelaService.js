import api from './api';

const BASE_PROPUESTAS = '/consejo-escuela/propuestas';
const BASE_ACUERDOS = '/consejo-escuela/acuerdos';
const BASE_VOTACIONES = '/consejo-escuela/votaciones';

const consejoEscuelaService = {
  // Propuestas
  listarPropuestas: async () => {
    const response = await api.get(`${BASE_PROPUESTAS}/`);
    return response.data;
  },

  obtenerPropuesta: async (propuestaId) => {
    const response = await api.get(`${BASE_PROPUESTAS}/${propuestaId}`);
    return response.data;
  },

  // Acuerdos
  listarAcuerdos: async () => {
    const response = await api.get(`${BASE_ACUERDOS}/`);
    return response.data;
  },

  obtenerAcuerdo: async (acuerdoId) => {
    const response = await api.get(`${BASE_ACUERDOS}/${acuerdoId}`);
    return response.data;
  },

  crearAcuerdo: async (datos) => {
    const response = await api.post(`${BASE_ACUERDOS}/`, datos);
    return response.data;
  },

  actualizarAcuerdo: async (acuerdoId, datos) => {
    const response = await api.patch(
      `${BASE_ACUERDOS}/${acuerdoId}`,
      datos
    );
    return response.data;
  },

  // Votaciones
  listarVotaciones: async () => {
    const response = await api.get(`${BASE_VOTACIONES}/`);
    return response.data;
  },

  obtenerVotacion: async (votacionId) => {
    const response = await api.get(`${BASE_VOTACIONES}/${votacionId}`);
    return response.data;
  },

  crearVotacion: async (datos) => {
    const response = await api.post(`${BASE_VOTACIONES}/`, datos);
    return response.data;
  },

  registrarVoto: async (votacionId, datos) => {
    const response = await api.post(
      `${BASE_VOTACIONES}/${votacionId}/votos`,
      datos
    );
    return response.data;
  },

  registrarResultado: async (votacionId, datos) => {
    const response = await api.post(
      `${BASE_VOTACIONES}/${votacionId}/resultado`,
      datos
    );
    return response.data;
  },
};

export default consejoEscuelaService;
