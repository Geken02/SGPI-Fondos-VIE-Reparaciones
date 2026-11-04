// Etiquetas y utilidades de presentación (no son datos: los datos vienen de la API).

// Estado derivado en la bandeja (lo calcula el backend) -> etiqueta y color (clases gv-badge)
export const ESTADOS_BANDEJA = {
  por_evaluar: { etiqueta: 'Por evaluar', clase: 'revision' },
  en_revision: { etiqueta: 'En revisión', clase: 'subsanacion' },
  con_observaciones: { etiqueta: 'Con observaciones', clase: 'pendiente' },
};

// Color según el código del estado de la propuesta (catálogo EstadosPropuesta)
export const claseEstadoPropuesta = (codigo) =>
  ({ EN_CIE: 'revision', APROBADA: 'listo', RECHAZADA: 'pendiente' }[codigo] || 'subsanacion');

// Decisiones que acepta el backend
export const DECISIONES = ['Aprobar', 'Rechazar'];
export const ETIQUETA_DECISION = { Aprobar: 'Aprobada', Rechazar: 'Rechazada' };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const formatearFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MESES[m - 1]} ${y}`;
};

export const formatearMonto = (n) =>
  Number(n).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Promedio ponderado por peso (misma fórmula que el backend)
export const calcularPromedio = (criterios, puntajes) => {
  const pesoTotal = criterios.reduce((a, c) => a + c.peso, 0);
  if (!pesoTotal) return 0;
  const suma = criterios.reduce((a, c) => a + (Number(puntajes[c.criterioId]) || 0) * c.peso, 0);
  return suma / pesoTotal;
};
