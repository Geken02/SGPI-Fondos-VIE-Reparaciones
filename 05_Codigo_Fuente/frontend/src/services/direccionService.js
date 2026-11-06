// src/services/direccionService.js
// Servicio conectado a la API real de Dirección de Investigación.

import api from './api';
import {
  TIPOS_DOCUMENTO,
  TIPOS_NOTIFICACION,
} from '../components/direccion/direccionConstantes';

const BASE = '/direccion-investigacion';

// Los datos de demostración quedan desactivados.
export const MODO_DEMO = false;

export const CONFIG_INICIAL = {
  firmante: 'Director/a de Investigación',
  prefijoOficio: 'DI-OF',
};

const TIPOS_DOCUMENTO_API = {
  aprobacion: 'Oficio_Direccion_Investigacion',
  rechazo: 'Oficio_Direccion_Investigacion',
  observaciones: 'Oficio_Direccion_Investigacion',
};

const TIPOS_NOTIFICACION_API = {
  aprobacion: 'Aprobacion_Propuesta',
  rechazo: 'Rechazo_Propuesta',
  observaciones: 'Solicitud_Subsanacion',
};


const normalizarDecision = (tipo, contenido = '') => {
  const texto = `${String(tipo || '')}\n${String(contenido || '')}`.toLowerCase();

  // Primero se respeta la decisión explícita del CIE.
  const decision = texto.match(
    /decisi[oó]n(?:\s+del\s+cie)?\s*:\s*(aprobar|rechazar)/i
  );

  if (decision?.[1] === 'aprobar') return 'Aprobar';
  if (decision?.[1] === 'rechazar') return 'Rechazar';

  // Se comprueba primero el rechazo para evitar confundir
  // "no favorable" con "favorable".
  if (
    /\b(no\s+(?:es\s+)?favorable|desfavorable|rechazada|rechazado|se rechaza)\b/i.test(texto)
  ) {
    return 'Rechazar';
  }

  if (
    /\b(aprobada|aprobado|se aprueba|favorable)\b/i.test(texto)
  ) {
    return 'Aprobar';
  }

  return 'Sin decisión registrada';
};


const normalizarDictamen = (d) => ({
  propuestaId: d.propuestaId,
  dictamenId: d.dictamenId,
  codigo: d.codigo || '',
  titulo: d.titulo || '',
  investigador: d.investigador || '',
  escuela: d.escuela || '',
  fechaDictamen: d.fechaEmision || null,
  numeroOficio: d.numeroOficio || '',
  decision: normalizarDecision(d.decision || d.tipo, d.contenido),
  estado: d.estado || 'por_revisar',
});

const normalizarDetalle = (respuesta) => {
  const dictamen = respuesta.dictamen || {};

  return {
    propuestaId: respuesta.propuestaId,
    dictamenId: dictamen.dictamenId,
    codigo: respuesta.codigo || '',
    titulo: respuesta.titulo || '',
    investigador: respuesta.investigador || '',
    escuela: respuesta.escuela || '',
    fechaDictamen: dictamen.fechaEmision || null,
    numeroOficio: dictamen.numeroOficio || '',
    decision: normalizarDecision(respuesta.decision || dictamen.tipo, dictamen.contenido),
    estado: respuesta.estado || 'por_revisar',
    justificacion: respuesta.justificacion || dictamen.contenido || '',
    observaciones: respuesta.observaciones || '',
    criterios: Array.isArray(respuesta.criterios) ? respuesta.criterios : [],
    documentos: Array.isArray(respuesta.documentos) ? respuesta.documentos.map(normalizarDocumento) : [],
    historial: Array.isArray(respuesta.historial)
      ? respuesta.historial
      : [],
  };
};

const normalizarDocumento = (doc) => {
  const ruta = doc.rutaArchivo || '';
  const nombreRuta = ruta.split(/[\\/]/).pop() || doc.nombre || '';
  const nombre = doc.nombre || nombreRuta;

  return {
    documentoId: doc.documentoId,
    nombre,
    fecha: doc.fechaCarga || doc.fechaEmision || null,
    numeroOficio: nombreRuta.replace(/\.txt$/i, ''),
    contenido: doc.contenido || '',
    rutaArchivo: ruta,
  };
};

export const construirOficio = (
  d,
  { tipo, numeroOficio, fechaEmision, firmante },
) => {
  const plantilla = TIPOS_DOCUMENTO.find((t) => t.id === tipo);

  return [
    plantilla?.titulo?.toUpperCase() || 'DOCUMENTO OFICIAL',
    `Oficio: ${numeroOficio}`,
    `Fecha de emisión: ${fechaEmision}`,
    '',
    `Propuesta: ${d.titulo || d.codigo}`,
    `Código: ${d.codigo}`,
    '',
    d.justificacion || '',
    '',
    'Atentamente,',
    firmante,
    'Dirección de Investigación',
  ].join('\n');
};

export const construirNotificacion = (d, tipo) => {
  const titulo = TIPOS_NOTIFICACION.find((t) => t.id === tipo)?.titulo
    || 'Notificación de actualización';

  return [
    `Estimado(a) ${d.investigador || 'investigador(a)'}:`,
    '',
    `Se le comunica una actualización relacionada con la propuesta "${d.titulo}" (${d.codigo}).`,
    `Tipo de notificación: ${titulo}.`,
    '',
    'Atentamente,',
    'Dirección de Investigación',
  ].join('\n');
};

export const direccionService = {
  async listarDictamenes() {
    const { data } = await api.get(`${BASE}/dictamenes`);
    return data.map(normalizarDictamen);
  },

  async obtenerDictamen(codigo) {
    const { data } = await api.get(
      `${BASE}/dictamenes/${encodeURIComponent(codigo)}`,
    );

    return normalizarDetalle(data);
  },

  async listarDocumentos(codigo) {
    const { data } = await api.get(
      `${BASE}/dictamenes/${encodeURIComponent(codigo)}/documentos`,
    );

    return data.map(normalizarDocumento);
  },

  async descargarDocumento(documentoId) {
    const { data } = await api.get(
      `${BASE}/documentos/${documentoId}/descargar`,
      {
        responseType: 'blob',
      },
    );

    return data;
  },

  async generarDocumento(codigo, datos) {
    const tipoApi = TIPOS_DOCUMENTO_API[datos.tipo];

    if (!tipoApi) {
      throw new Error('El tipo de documento solicitado no está configurado.');
    }

    const fecha = datos.fechaEmision;

    // El backend espera una fecha ISO: YYYY-MM-DD.
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error(
        'La fecha de emisión debe enviarse en formato YYYY-MM-DD.',
      );
    }

    const payload = {
      tipo: tipoApi,
      fechaEmision: fecha || null,
      firmante: datos.firmante,
      prefijoOficio: datos.prefijoOficio || CONFIG_INICIAL.prefijoOficio,
      // Vacío para que el backend genere su contenido predeterminado.
      plantilla: '',
    };

    const { data } = await api.post(
      `${BASE}/dictamenes/${encodeURIComponent(codigo)}/documentos`,
      payload,
    );

    return {
      ...data,
      fecha: data.fechaEmision || null,
    };
  },

  async enviarNotificacion(codigo, datos) {
    const tipoApi = TIPOS_NOTIFICACION_API[datos.tipo];

    if (!tipoApi) {
      throw new Error('El tipo de notificación solicitado no está configurado.');
    }

    const payload = {
      tipo: tipoApi,
      mensaje: datos.mensaje,
      asunto: datos.asunto || `Resolución del CIE — ${datos.codigo || ''}`.trim(),
    };

    const { data } = await api.post(
      `${BASE}/dictamenes/${encodeURIComponent(codigo)}/notificacion`,
      payload,
    );

    return {
      ...data,
      destinatario: data.destinatario || codigo,
      tipo: TIPOS_NOTIFICACION.find((t) => t.id === datos.tipo)?.titulo,
    };
  },

  async obtenerConfiguracion() {
    const { data } = await api.get(`${BASE}/configuracion`);

    return {
      ...CONFIG_INICIAL,
      ...(data.configuracion || {}),
    };
  },

  async guardarConfiguracion(config) {
    const { data } = await api.put(`${BASE}/configuracion`, {
      configuracion: config,
    });

    return {
      ...CONFIG_INICIAL,
      ...(data.configuracion || {}),
    };
  },
};

export const mensajeErrorDireccion = (
  error,
  porDefecto = 'No se pudo completar la operación.',
) => {
  const detalle = error?.response?.data?.detail;

  if (typeof detalle === 'string') return detalle;

  if (error?.response?.status === 401) {
    return 'La sesión no es válida o ha expirado. Inicia sesión nuevamente.';
  }

  if (error?.response?.status === 403) {
    return 'No tienes permiso para esta acción. Se requiere el rol DireccionInvestigacion o SuperAdministrador.';
  }

  if (error?.response?.status === 404) {
    return 'No se encontró el recurso solicitado.';
  }

  if (error?.response?.status === 409) {
    return detalle || 'La operación no se puede completar con los datos actuales.';
  }

  if (!error?.response) {
    return 'No hay conexión con el servidor. Verifica que el backend esté activo.';
  }

  return porDefecto;
};