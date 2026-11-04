// src/components/direccion/DireccionUi.jsx — piezas compartidas por las ventanas de la Dirección de Investigación
// Reutiliza los componentes del CIE (mismo diseño) y agrega lo propio de este rol.
import { Link } from 'react-router-dom';
import IconoBase from '../cie/IconoCie';
import { ESTADOS_TRAMITE, DECISIONES_CIE, RUTA_BANDEJA } from './direccionConstantes';

export { Cargando, ErrorCarga, EncabezadoPagina, Radio, AreaTexto } from '../cie/CieUi';

const PATHS = {
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5" /></>,
};

export const Icono = ({ nombre, size = 16 }) =>
  PATHS[nombre] ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[nombre]}
    </svg>
  ) : (
    <IconoBase nombre={nombre} tamano={size} />
  );

// Los estados se indican con punto + texto (no solo con color) para cumplir con daltonismo/WCAG
export const EstadoTramiteBadge = ({ estado }) => {
  const e = ESTADOS_TRAMITE[estado] || { etiqueta: estado, clase: 'revision' };
  return <span className={`dir-badge ${e.clase}`}><span className="dir-badge-punto" />{e.etiqueta}</span>;
};

export const DecisionBadge = ({ decision }) => {
  const e = DECISIONES_CIE[decision] || { etiqueta: decision, clase: 'revision' };
  return (
    <span className={`dir-badge ${e.clase}`}>
      <Icono nombre={decision === 'Rechazar' ? 'alertCircle' : 'checkCircle'} size={12} />{e.etiqueta}
    </span>
  );
};

export const VolverALaBandeja = () => (
  <Link to={RUTA_BANDEJA} className="gv-volver">
    <Icono nombre="arrowLeft" size={14} />Volver a la bandeja
  </Link>
);

export const AvisoExito = ({ texto }) =>
  texto ? <div className="cie-aviso" role="status"><Icono nombre="checkCircle" size={18} />{texto}</div> : null;

// Tarjeta de resumen del dictamen (usada en Documentos oficiales y Notificación)
export const ResumenDictamen = ({ dictamen, children }) => (
  <section className="gv-card dir-resumen-dictamen">
    <div className="dir-resumen-principal">
      <div className="dir-resumen-codigo">{dictamen.codigo}</div>
      <div className="dir-resumen-titulo">{dictamen.titulo}</div>
    </div>
    <div className="dir-resumen-dato">
      <span>Decisión del CIE</span><DecisionBadge decision={dictamen.decision} />
    </div>
    <div className="dir-resumen-dato">
      <span>Fecha de resolución</span><strong>{new Date(dictamen.fechaDictamen).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')}</strong>
    </div>
    <div className="dir-resumen-dato">
      <span>Investigador principal</span><strong>{dictamen.investigador}</strong>
    </div>
    {children}
  </section>
);
