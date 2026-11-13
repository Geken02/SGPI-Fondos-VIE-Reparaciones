// src/components/cie/CieUi.jsx — piezas compartidas por las ventanas del Miembro del CIE
import { Link } from 'react-router-dom';
import { ESTADOS_BANDEJA, claseEstadoPropuesta, formatearFecha } from './cieConstantes';
import IconoBase from './IconoCie';

export const RUTA_BANDEJA = '/cie/expedientes';

// Íconos extra (estilo línea) que no existen en gestora/Iconos.jsx
const PATHS = {
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></>,
  escuela: <><path d="M3 10 12 5l9 5-9 5z" /><path d="M7 12.5V17c0 1 2.2 2 5 2s5-1 5-2v-4.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.5" /></>,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  arrowLeft: <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>,
  arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
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

// Estado derivado de la bandeja (por_evaluar / en_revision / con_observaciones)
export const EstadoBadge = ({ estado }) => {
  const e = ESTADOS_BANDEJA[estado] || { etiqueta: estado, clase: 'revision' };
  return (
    <span className={`gv-badge ${e.clase}`}>
      <span className="gv-badge-punto" aria-hidden="true" />{e.etiqueta}
    </span>
  );
};

// Estado de la propuesta según el catálogo (nombre viene de la BD)
export const EstadoPropuestaBadge = ({ codigo, nombre }) => (
  <span className={`gv-badge ${claseEstadoPropuesta(codigo)}`}>
    <span className="gv-badge-punto" aria-hidden="true" />{nombre}
  </span>
);

export const Cargando = ({ texto = 'Cargando...' }) => (
  <div className="gv-card cie-estado" role="status">{texto}</div>
);

export const ErrorCarga = ({ error, alReintentar }) => (
  <div className="gv-card cie-estado cie-estado-error" role="alert">
    <p>{error.mensaje}</p>
    {alReintentar && <button type="button" className="cie-btn-outline" onClick={alReintentar}>Reintentar</button>}
  </div>
);

export const VolverALaBandeja = () => (
  <Link to={RUTA_BANDEJA} className="gv-volver" aria-label="Volver a la bandeja de propuestas del CIE">
    <Icono nombre="arrowLeft" size={14} aria-hidden="true" />
    Volver a la bandeja
  </Link>
);

export const EncabezadoPagina = ({ titulo, subtitulo }) => (
  <>
    <h1 className="gv-titulo">{titulo}</h1>
    <p className="gv-subtitulo">{subtitulo}</p>
  </>
);

const PASOS = ['Expediente', 'Evaluación', 'Resolución', 'Dictamen'];

export const Pasos = ({ actual }) => (
  <ol className="gv-pasos" aria-label="Pasos del proceso de resolución del CIE">
    {PASOS.map((nombre, i) => {
      const n = i + 1;
      return (
        <li key={nombre} className={`gv-paso ${n === actual ? 'actual' : ''} ${n < actual ? 'hecho' : ''}`}>
          <span className="gv-paso-numero">{n}</span>
          <span className="gv-paso-nombre">{nombre}</span>
        </li>
      );
    })}
  </ol>
);

export const CabeceraExpediente = ({ expediente }) => (
  <section className="gv-card gv-expediente-info" aria-label="Información del expediente">
    <div className="gv-expediente-icono" aria-hidden="true"><Icono nombre="fileText" size={26} /></div>
    <div className="gv-expediente-datos">
      <div className="gv-expediente-codigo">{expediente.codigo}</div>
      <div className="gv-expediente-titulo">{expediente.titulo}</div>
      <div className="cie-meta">
        <span><Icono nombre="usuario" size={14} aria-hidden="true" />{expediente.investigador}</span>
        <span><Icono nombre="escuela" size={14} aria-hidden="true" />{expediente.escuela}</span>
      </div>
    </div>
    <div className="gv-expediente-lateral">
      <EstadoPropuestaBadge codigo={expediente.estadoCodigo} nombre={expediente.estadoNombre} />
      <span className="gv-expediente-fecha">Fecha límite: {formatearFecha(expediente.fechaLimite)}</span>
    </div>
  </section>
);

export const Radio = ({ name, value, checked, onChange, children }) => (
  <label className="cie-radio">
    <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
    <span>{children}</span>
  </label>
);

export const AreaTexto = ({ value, onChange, placeholder, max = 1000, invalido = false }) => (
  <div className="cie-textarea-wrap">
    <textarea value={value} maxLength={max} placeholder={placeholder} aria-invalid={invalido}
      className={invalido ? 'invalido' : ''} onChange={(e) => onChange(e.target.value)} />
    <span className="cie-contador">{value.length}/{max}</span>
  </div>
);
