import api from './api';

export const vinculacionService = {
  listarPropuestas: async () => {
    try {
      const response = await api.get('/vinculacion/propuestas');
      return response.data || [];
    } catch (error) {
      console.warn('Error al listar propuestas de vinculación:', error);
      return [];
    }
  },

  obtenerPropuesta: async (id) => {
    const response = await api.get(`/vinculacion/propuestas/${id}`);
    return response.data;
  },

  listarTiposDictamen: async () => {
    try {
      const response = await api.get('/vinculacion/tipos-dictamen');
      return response.data || [];
    } catch (error) {
      console.warn('Error al obtener tipos de dictamen:', error);
      return [];
    }
  },

  crearDictamen: async (datos) => {
    const response = await api.post('/vinculacion/dictamenes', datos);
    return response.data;
  },

  obtenerDictamen: async (propuestaId) => {
    try {
      const response = await api.get(`/vinculacion/propuestas/${propuestaId}/dictamen`);
      return response.data;
    } catch (_error) {
      return null;
    }
  },

  listarDictamenes: async () => {
    try {
      const response = await api.get('/vinculacion/dictamenes');
      return response.data || [];
    } catch (error) {
      console.warn('Error al listar dictámenes de vinculación:', error);
      return [];
    }
  },
  subirArchivoDictamen: async (propuestaId, archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('tipo_documento_id', 5); // 5 = Dictamen_Vinculacion
    
   
    const response = await api.post(`/api/propuestas/${propuestaId}/archivos`, formData);
    
    return response.data;
  }
};

