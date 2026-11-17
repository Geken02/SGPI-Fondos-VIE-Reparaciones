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
    // El nombre 'archivo' debe coincidir EXACTAMENTE con el parametro del backend
    formData.append('archivo', archivo, archivo.name || 'dictamen.pdf');
    
    // El ID 4 corresponde a "Dictamen de Vinculación" en tu tabla TiposDocumento.
    // Si en tu BD es otro número, cámbialo aquí.
    formData.append('tipo_documento_id', '5'); 

    // Obtenemos la URL base y el token
    const baseURL = import.meta.env.VITE_API_URL || 'https://sgpi-fondos-vie-reparaciones.onrender.com';
    const token = localStorage.getItem('token'); // Ajusta si tu token se guarda como 'access_token' u otro nombre

    // Usamos fetch nativo para evitar que los interceptores de Axios rompan el FormData
    const response = await fetch(`${baseURL}/api/propuestas/${propuestaId}/archivos`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
        // ⚠️ CRÍTICO: NO pongas 'Content-Type' aquí. El navegador lo inyecta automáticamente 
        // con el "boundary" correcto que FastAPI necesita para leer el archivo.
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error al subir el dictamen a Supabase S3');
    }

    return await response.json();
  }
};

