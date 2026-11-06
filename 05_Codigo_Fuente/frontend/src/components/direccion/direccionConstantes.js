// Etiquetas y utilidades de presentación de la Dirección de Investigación (no son datos: vienen del servicio/API).
export { formatearFecha } from '../cie/cieConstantes';

export const RUTA_BASE = '/direccion';
export const RUTA_BANDEJA = `${RUTA_BASE}/dictamenes`;

// Estado del trámite dentro de la Dirección
export const ESTADOS_TRAMITE = {
  por_revisar: { etiqueta: 'Por revisar', clase: 'revision' },
  en_proceso: { etiqueta: 'En proceso', clase: 'proceso' },
  completado: { etiqueta: 'Completado', clase: 'listo' },
};

// Decisión del CIE
export const DECISIONES_CIE = {
  Aprobar: { etiqueta: 'Aprobado', clase: 'listo' },
  Rechazar: { etiqueta: 'Rechazado', clase: 'pendiente' },
};

// Tipos de documento oficial (según la decisión del CIE) y su plantilla
export const TIPOS_DOCUMENTO = [
  { id: 'aprobacion', decision: 'Aprobar', titulo: 'Oficio de aprobación',
    descripcion: 'Documento oficial que comunica la aprobación de la propuesta.' },
  { id: 'rechazo', decision: 'Rechazar', titulo: 'Oficio de rechazo',
    descripcion: 'Documento oficial que comunica el rechazo de la propuesta.' },
];

export const PLANTILLAS = [
  { id: 'aprobacion', nombre: 'Oficio de aprobación VIE' },
  { id: 'rechazo', nombre: 'Oficio de rechazo VIE' },
];

export const FIRMANTES = ['Director/a de Investigación', 'Vicerrector/a de Investigación y Extensión'];

export const TIPOS_NOTIFICACION = [
  { id: 'aprobacion', decision: 'Aprobar', titulo: 'Notificación de aprobación',
    descripcion: 'Informa la aprobación de la propuesta y los próximos pasos.' },
  { id: 'rechazo', decision: 'Rechazar', titulo: 'Notificación de rechazo',
    descripcion: 'Informa el rechazo de la propuesta y la justificación.' },
];

export const tipoPorDecision = (lista, decision) =>
  (lista.find((t) => t.decision === decision) || lista[0]).id;

export const formatearFechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const f = d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  const h = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${f} · ${h}`;
};

export const promedioPonderado = (criterios) => {
  const peso = criterios.reduce((a, c) => a + c.peso, 0);
  return peso ? criterios.reduce((a, c) => a + c.puntaje * c.peso, 0) / peso : 0;
};
