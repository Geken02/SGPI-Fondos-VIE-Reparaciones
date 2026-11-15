import api from './api';

export const propuestaService = {
  listarMisPropuestas: async () => {
    try {
      const response = await api.get('/investigador/propuestas/');
      return response.data || [];
    } catch (error) {
      console.warn('Error al listar propuestas de investigador:', error);
      return [];
    }
  },

  explorarInstitucional: async () => {
    try {
      const response = await api.get('/investigador/propuestas/explorar');
      return response.data || [];
    } catch (_err) {
      return propuestaService.listarMisPropuestas();
    }
  },

  obtenerPropuesta: async (id) => {
    const response = await api.get(`/investigador/propuestas/${id}`);
    return response.data;
  },

  crearPropuesta: async (datos) => {
    const response = await api.post('/investigador/propuestas/', datos);
    return response.data;
  },

  obtenerCatalogosFormulario: async () => {
    try {
      const response = await api.get('/investigador/propuestas/catalogos/formulario');
      return response.data;
    } catch (_err) {
      return { convocatorias: [], escuelas: [] };
    }
  },

  actualizarCabecera: async (id, datos) => {
    const response = await api.put(`/investigador/propuestas/${id}`, datos);
    return response.data;
  },

  guardarContenido: async (id, datos) => {
    const response = await api.put(`/investigador/propuestas/${id}/contenido`, datos);
    return response.data;
  },

  guardarDeclaraciones: async (id, datos) => {
    const response = await api.put(`/investigador/propuestas/${id}/declaraciones`, datos);
    return response.data;
  },

  
  guardarEquipoCompleto: async (id, datos) => {
    const response = await api.put(`/investigador/propuestas/${id}/equipo-completo`, datos);
    return response.data;
  },

  obtenerEquipo: async (id) => {
    try {
      const response = await api.get(`/investigador/propuestas/${id}/equipo`);
      return response.data;
    } catch (_e) {
      return { integrantes: [], colaboradoresExternos: [] };
    }
  },

  guardarPresupuestoCompleto: async (id, rubros) => {
    const response = await api.put(`/investigador/propuestas/${id}/presupuesto`, rubros);
    return response.data;
  },

  enviarRevision: async (id) => {
    const response = await api.post(`/investigador/propuestas/${id}/enviar`);
    return response.data;
  },

  obtenerSubsanaciones: async (propuestaId) => {
    try {
      const response = await api.get(`/investigador/propuestas/${propuestaId}/subsanaciones`);
      return response.data || [];
    } catch (err) {
      console.warn('Error al obtener subsanaciones:', err);
      return [];
    }
  },

  responderSubsanacion: async (propuestaId, subsanacionId, datos) => {
    const response = await api.post(`/investigador/propuestas/${propuestaId}/subsanaciones/${subsanacionId}/responder`, datos);
    return response.data;
  },

  simularSubsanacion: async (propuestaId, comentarioGestora) => {
    const response = await api.post(`/investigador/propuestas/${propuestaId}/subsanaciones/simular`, {
      comentarioGestora
    });
    return response.data;
    },


  cancelarPropuesta: async (propuestaId) => {
    const response = await api.patch(`/investigador/propuestas/${propuestaId}/cancelar`);
    return response.data;
  },

  subirDocumentoFormulario: async (propuestaId, tipoDocumentoId, archivo) => {
    const formData = new FormData();
    // El tercer parámetro (nombre) es crucial para que el backend lo reconozca como archivo
    formData.append('archivo', archivo, archivo.name || 'documento.pdf');
    formData.append('tipo_documento_id', String(tipoDocumentoId));

    // Obtenemos la URL base de tu configuración de Axios para mantener la consistencia
    const baseURL = api.defaults.baseURL || 'https://sgpi-fondos-vie-reparaciones.onrender.com';
    
    // Obtenemos el token manualmente (ajusta 'token' si lo guardas como 'access_token' u otro nombre)
    const token = localStorage.getItem('token');

    // Usamos fetch nativo para evitar que los interceptores de Axios corrompan el FormData
    const response = await fetch(`${baseURL}/api/propuestas/${propuestaId}/archivos`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Lanzamos el error en el mismo formato que Axios para que tu catch lo maneje igual
      throw { response: { status: response.status, data: errorData } };
    }

    return await response.json();
  }
};
