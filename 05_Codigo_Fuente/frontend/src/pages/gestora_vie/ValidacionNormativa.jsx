// src/pages/gestora_vie/ValidacionNormativa.jsx
// Ventana: Validación Normativa - Gestora VIE
// Rutas: /gestora/validacion-normativa  y  /gestora/validacion-normativa/:expedienteId
// Los datos vienen del backend: GET /vie/expedientes (selector) y GET /vie/expedientes/{codigo}/validacion
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icono from '../../components/gestora/Iconos';
import ModalSolicitarSubsanacion from '../../components/gestora/ModalSolicitarSubsanacion';
import { ESTADOS } from '../../data/estadosExpediente';
import {
  COLORES_LEYENDA,
  ESTADOS_DOCUMENTO,
  ESTADOS_VALIDACION,
  GRUPOS_VISUAL,
  PASOS,
} from '../../data/validacionConfig';
import { expedienteService } from '../../services/expedienteService';
import { detalleDeError } from '../../utils/errores';
import { formatearFecha } from '../../utils/fechas';

const RUTA_BANDEJA = '/gestora/expedientes';
const RUTA_VALIDACION = '/gestora/validacion-normativa';
const OPCIONES_ESTADO = ['CUMPLE', 'NO_CUMPLE', 'PENDIENTE', 'NO_APLICA'];

const mensajeDeError = (error) => {
  if (error.response?.status === 403) return 'Tu usuario no tiene el rol de Gestora VIE para ver esta información.';
  return 'No se pudo cargar la información. Verifica que el servidor esté en ejecución e intenta de nuevo.';
};

const VolverALaBandeja = () => (
  <Link to={RUTA_BANDEJA} className="gv-volver" aria-label="Volver a la bandeja principal de expedientes">
    <Icono nombre="arrowLeft" tamano={14} aria-hidden="true" />
    Volver a la bandeja
  </Link>
);

const MensajeEstado = ({ titulo, texto }) => (
  <>
    <VolverALaBandeja />
    <div className="gv-card gv-en-construccion" role="status">
      <h1 className="gv-titulo">{titulo}</h1>
      <p className="gv-subtitulo">{texto}</p>
    </div>
  </>
);

const InsigniaEstado = ({ estado }) => {
  const est = ESTADOS_VALIDACION[estado];
  return (
    <span className={`gv-badge ${est.clase}`}>
      <span className="gv-estado-ico" aria-hidden="true">
        <Icono nombre={est.icono} tamano={10} />
      </span>
      {est.etiqueta}
    </span>
  );
};

const Donut = ({ porcentaje }) => {
  const radio = 52;
  const circunferencia = 2 * Math.PI * radio;
  const trazo = (porcentaje / 100) * circunferencia;
  return (
    <div className="gv-donut" role="img" aria-label={`Gráfico de cumplimiento general: ${porcentaje}%`}>
      <svg viewBox="0 0 120 120" width="130" height="130" aria-hidden="true">
        <circle cx="60" cy="60" r={radio} fill="none" stroke="#e1e8f5" strokeWidth="12" />
        {porcentaje > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radio}
            fill="none"
            stroke="#2f9e6b"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${trazo} ${circunferencia - trazo}`}
            transform="rotate(-90 60 60)"
          />
        )}
      </svg>
      <div className="gv-donut-centro">
        <strong>{porcentaje}%</strong>
        <span>Cumplimiento general</span>
      </div>
    </div>
  );
};

// Bloque con los datos base del expediente: al presionarlo se abre la lista para cambiar de expediente.
const SelectorExpediente = ({ lista, actual, children }) => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const contenedor = useRef(null);

  // Cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarSiEsFuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    const cerrarConEscape = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiEsFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('mousedown', cerrarSiEsFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  const filtrados = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    if (!texto) return lista;
    return lista.filter(
      (e) =>
        e.id.toLowerCase().includes(texto) ||
        e.titulo.toLowerCase().includes(texto) ||
        e.investigador.toLowerCase().includes(texto)
    );
  }, [lista, filtro]);

  const alternar = () => {
    setFiltro('');
    setAbierto((v) => !v);
  };

  const elegir = (id) => {
    setAbierto(false);
    if (id !== actual) navigate(`${RUTA_VALIDACION}/${encodeURIComponent(id)}`);
  };

  return (
    <div className="gv-selector" ref={contenedor}>
      <button
        type="button"
        className="gv-selector-trigger"
        aria-haspopup="true"
        aria-expanded={abierto}
        title="Cambiar de expediente"
        onClick={alternar}
      >
        {children}
      </button>

      {abierto && (
        <div className="gv-selector-panel">
          <label className="gv-campo gv-selector-busqueda">
            <Icono nombre="search" tamano={16} />
            <input
              type="text"
              placeholder="Buscar por código, título o investigador..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              autoFocus
            />
          </label>

          <ul className="gv-selector-lista" aria-label="Expedientes disponibles">
            {filtrados.map((exp) => {
              const est = ESTADOS[exp.estado] ?? { etiqueta: exp.estadoDetalle, clase: 'revision' };
              const esActual = exp.id === actual;
              return (
                <li key={exp.id}>
                  <button
                    type="button"
                    className={`gv-selector-item ${esActual ? 'actual' : ''}`}
                    aria-current={esActual ? 'true' : undefined}
                    onClick={() => elegir(exp.id)}
                  >
                    <span className="gv-selector-item-texto">
                      <span className="gv-selector-codigo">{exp.id}</span>
                      <span className="gv-selector-titulo">{exp.titulo}</span>
                      <span className="gv-selector-investigador">{exp.investigador}</span>
                    </span>
                    <span className={`gv-badge ${est.clase}`}>{est.etiqueta}</span>
                    {esActual && (
                      <span className="gv-selector-check">
                        <Icono nombre="check" tamano={14} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtrados.length === 0 && (
              <li className="gv-selector-vacio">
                {lista.length === 0 ? 'Aún no hay expedientes enviados.' : 'No hay expedientes que coincidan.'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// Fila desplegable para cambiar el estado y las observaciones de un requisito
const EditorRequisito = ({ req, actual, onAplicar, onRestablecer, onCerrar }) => {
  const [estado, setEstado] = useState(actual.estado);
  const [observaciones, setObservaciones] = useState(actual.observaciones);

  return (
    <tr className="gv-editor-fila">
      <td colSpan={4}>
        <div className="gv-editor">
          <div className="gv-editor-sistema">
            Calculado por el sistema: <strong>{ESTADOS_VALIDACION[req.estadoSistema].etiqueta}</strong>
            {req.observacionesSistema ? ` — ${req.observacionesSistema}` : ''}
          </div>
          <div className="gv-editor-campos">
            <label className="gv-campo-formulario">
              <span className="gv-etiqueta-campo">Estado</span>
              <select className="gv-select-simple" value={estado} onChange={(e) => setEstado(e.target.value)}>
                {OPCIONES_ESTADO.map((codigo) => (
                  <option key={codigo} value={codigo}>{ESTADOS_VALIDACION[codigo].etiqueta}</option>
                ))}
              </select>
            </label>
            <label className="gv-campo-formulario gv-campo-ancho">
              <span className="gv-etiqueta-campo">Observaciones</span>
              <textarea
                className="gv-textarea gv-textarea-corto"
                value={observaciones}
                maxLength={2000}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </label>
          </div>
          <div className="gv-editor-acciones">
            {actual.manual && (
              <button type="button" className="gv-btn-secundario" onClick={onRestablecer}>
                Volver al valor del sistema
              </button>
            )}
            <button type="button" className="gv-btn-secundario" onClick={onCerrar}>Cerrar</button>
            <button type="button" className="gv-btn-primario" onClick={() => onAplicar(estado, observaciones)}>
              Aplicar
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

// Detalle de un expediente. Se monta de nuevo (key) al cambiar de expediente.
const DetalleValidacion = ({ codigo, lista }) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cerrados, setCerrados] = useState({});
  const [cambios, setCambios] = useState({}); // id -> { estado, observaciones } | { restablecer: true } (sin guardar)
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviandoCIE, setEnviandoCIE] = useState(false);

  useEffect(() => {
    let cancelado = false;
    expedienteService
      .obtenerValidacion(codigo)
      .then((respuesta) => {
        if (!cancelado) setDatos(respuesta);
      })
      .catch((err) => {
        if (!cancelado) setError({ noEncontrado: err.response?.status === 404, mensaje: mensajeDeError(err) });
      });
    return () => {
      cancelado = true;
    };
  }, [codigo]);

  // Valor que se muestra de un requisito: lo guardado, o el cambio que aún no se guarda
  const valorActual = (req) => {
    const cambio = cambios[req.id];
    if (!cambio) return { estado: req.estado, observaciones: req.observaciones, manual: req.manual, sinGuardar: false };
    if (cambio.restablecer) {
      return { estado: req.estadoSistema, observaciones: req.observacionesSistema, manual: false, sinGuardar: true };
    }
    return { estado: cambio.estado, observaciones: cambio.observaciones, manual: true, sinGuardar: true };
  };

  const resumen = useMemo(() => {
    const conteo = { CUMPLE: 0, NO_CUMPLE: 0, PENDIENTE: 0, NO_APLICA: 0 };
    (datos?.grupos ?? []).forEach((g) =>
      g.requisitos.forEach((r) => {
        const cambio = cambios[r.id];
        const estado = !cambio ? r.estado : cambio.restablecer ? r.estadoSistema : cambio.estado;
        conteo[estado] += 1;
      })
    );
    const evaluables = conteo.CUMPLE + conteo.NO_CUMPLE + conteo.PENDIENTE;
    const porcentaje = evaluables === 0 ? 100 : Math.round((conteo.CUMPLE / evaluables) * 100);
    return { conteo, porcentaje };
  }, [datos, cambios]);

  if (error?.noEncontrado) {
    return <MensajeEstado titulo="Expediente no encontrado" texto={`No existe un expediente enviado con el código ${codigo}.`} />;
  }
  if (error) {
    return <MensajeEstado titulo="No se pudo cargar el expediente" texto={error.mensaje} />;
  }
  if (!datos) {
    return <MensajeEstado titulo="Validación normativa" texto="Cargando expediente..." />;
  }

  const { expediente, grupos, documentos, subsanacion } = datos;
  const estadoExpediente = ESTADOS[expediente.estado] ?? { etiqueta: expediente.estadoDetalle, clase: 'revision' };
  const nSubsanar = resumen.conteo.NO_CUMPLE;
  const hayCambios = Object.keys(cambios).length > 0;
  const puedeSolicitar = subsanacion.puede && !hayCambios && !guardando && !enviandoCIE;
  const estadoFinal = ['APROBADA', 'RECHAZADA', 'CANCELADA'].includes(expediente.estado);
  const yaEnviadoCIE = expediente.estado === 'LISTO_CIE';
  const puedeEnviarCIE = resumen.porcentaje >= 90 && !subsanacion.bloqueo && expediente.estado !== 'EN_SUBSANACION' && !hayCambios && !guardando && !enviandoCIE && !estadoFinal && !yaEnviadoCIE;

  const alternarGrupo = (id) => setCerrados((prev) => ({ ...prev, [id]: !prev[id] }));

  const aplicarCambio = (req, estado, observaciones) => {
    setCambios((prev) => {
      const siguiente = { ...prev };
      const igualAlGuardado = estado === req.estado && observaciones.trim() === (req.observaciones || '');
      if (igualAlGuardado) delete siguiente[req.id];
      else siguiente[req.id] = { estado, observaciones };
      return siguiente;
    });
    setEditando(null);
  };

  const restablecer = (req) => {
    setCambios((prev) => {
      const siguiente = { ...prev };
      if (req.manual) siguiente[req.id] = { restablecer: true };
      else delete siguiente[req.id];
      return siguiente;
    });
    setEditando(null);
  };

  const guardarCambios = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const payload = Object.entries(cambios).map(([id, c]) =>
        c.restablecer ? { id, estado: null, observaciones: '' } : { id, estado: c.estado, observaciones: c.observaciones }
      );
      const respuesta = await expedienteService.guardarRequisitos(expediente.id, payload);
      setDatos(respuesta);
      setCambios({});
      setEditando(null);
      setAviso({ tipo: 'ok', texto: 'Cambios guardados.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: detalleDeError(err, 'No se pudieron guardar los cambios. Intenta de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const enviarAlCIE = async () => {
    setEnviandoCIE(true);
    setAviso(null);
    try {
      const resultado = await expedienteService.enviarAlCIE(expediente.id);
      setDatos((prev) => prev ? {
        ...prev,
        expediente: {
          ...prev.expediente,
          estado: 'LISTO_CIE',
          estadoDetalle: resultado.estadoDetalle || 'En CIE',
          pasoActual: 4,
        },
      } : prev);
      setAviso({ tipo: 'ok', texto: resultado.mensaje || 'El expediente se envió al CIE correctamente.' });
      try {
        const [actualizado, bandeja] = await Promise.all([
          expedienteService.obtenerValidacion(expediente.id),
          expedienteService.obtenerBandeja(),
        ]);
        setDatos(actualizado);
        setLista(bandeja.expedientes);
      } catch {
        // La remisión ya se confirmó; no ocultar el éxito si falla una actualización posterior.
      }
    } catch (err) {
      setAviso({ tipo: 'error', texto: detalleDeError(err, 'No se pudo enviar el expediente al CIE. Verifica las condiciones e inténtalo de nuevo.') });
    } finally {
      setEnviandoCIE(false);
    }
  };

  const alCrearSubsanacion = async () => {
    setModalAbierto(false);
    setAviso({
      tipo: 'ok',
      texto: 'Subsanación solicitada. La encontrarás en la pestaña "Pendientes" de Subsanaciones.',
      enlace: { to: '/gestora/subsanaciones', etiqueta: 'Ir a Subsanaciones' },
    });
    try {
      setDatos(await expedienteService.obtenerValidacion(expediente.id));
    } catch {
      /* si falla la recarga, el aviso ya confirmó que se creó */
    }
  };

  // Explica por qué el botón de subsanación está (o no) disponible
  let nota;
  if (hayCambios) nota = 'Guarda los cambios antes de solicitar la subsanación.';
  else if (subsanacion.bloqueo) nota = subsanacion.bloqueo;
  else if (!subsanacion.puede) {
    nota = `No hace falta solicitar subsanación: el expediente tiene sus documentos y cumple el ${datos.porcentajeCumplimiento} % (mínimo ${subsanacion.umbral} %).`;
  } else nota = `Corresponde solicitarla. ${subsanacion.motivos.join(' ')}`;

  let notaEnvioCIE;
  if (hayCambios) notaEnvioCIE = 'Guarda los cambios de validación antes de enviar el expediente.';
  else if (yaEnviadoCIE) notaEnvioCIE = 'Este expediente ya fue remitido al CIE.';
  else if (estadoFinal) notaEnvioCIE = 'El expediente tiene un estado final y no puede remitirse de nuevo.';
  else if (subsanacion.bloqueo || expediente.estado === 'EN_SUBSANACION') notaEnvioCIE = 'Resuelve y cierra la subsanación antes de enviar al CIE.';
  else if (resumen.porcentaje < 90) notaEnvioCIE = `Se requiere al menos 90 % de cumplimiento. Actualmente: ${resumen.porcentaje} %.`;
  else notaEnvioCIE = 'Cumple las condiciones para remitir el expediente al CIE.';

  return (
    <>
      <VolverALaBandeja />

      <div className="gv-titulo-bloque">
        <div className="gv-expediente-icono">
          <Icono nombre="fileText" tamano={26} />
        </div>
        <div>
          <h1 className="gv-titulo">Validación normativa</h1>
          <p className="gv-subtitulo">Verifica el cumplimiento de requisitos y gestiona las subsanaciones.</p>
        </div>
      </div>

      {/* Datos del expediente: al presionar el bloque de la izquierda se elige otro expediente */}
      <section className="gv-card gv-val-expediente">
        <SelectorExpediente lista={lista} actual={expediente.id}>
          <span className="gv-expediente-codigo">
            {expediente.id}
            <span className="gv-selector-hint">
              Cambiar expediente <Icono nombre="chevronDown" tamano={14} />
            </span>
          </span>
          <span className="gv-expediente-titulo">{expediente.titulo}</span>
          <span className="gv-val-meta">
            <span><Icono nombre="user" tamano={14} /> Investigador principal: {expediente.investigador}</span>
            <span><Icono nombre="building" tamano={14} /> Escuela: {expediente.escuela}</span>
            <span>
              <Icono nombre="calendar" tamano={14} /> Fecha de ingreso: {expediente.fechaIngreso ? formatearFecha(expediente.fechaIngreso, { punto: false }) : '—'}
            </span>
          </span>
        </SelectorExpediente>

        <div className="gv-val-expediente-lateral">
          <span className={`gv-badge ${estadoExpediente.clase}`} title={expediente.estadoDetalle}>{estadoExpediente.etiqueta}</span>
          <div className="gv-chips">
            <span className="gv-chip"><Icono nombre="fileText" tamano={13} /> Convocatoria: {expediente.convocatoria}</span>
            {expediente.tipo && (
              <span className="gv-chip"><Icono nombre="tag" tamano={13} /> Tipo: {expediente.tipo}</span>
            )}
          </div>
        </div>
      </section>

      {/* Pasos */}
      <ol className="gv-pasos gv-pasos-suelto">
        {PASOS.map((nombre, i) => {
          const numero = i + 1;
          const clase = numero === expediente.pasoActual ? 'actual' : numero < expediente.pasoActual ? 'hecho' : '';
          return (
            <li key={nombre} className={`gv-paso ${clase}`}>
              <span className="gv-paso-numero">{numero}</span>
              <span className="gv-paso-nombre">{nombre}</span>
            </li>
          );
        })}
      </ol>

      {aviso && (
        <div className={`gv-aviso gv-aviso-${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          <span>{aviso.texto}</span>
          {aviso.enlace && <Link to={aviso.enlace.to} className="gv-aviso-enlace">{aviso.enlace.etiqueta}</Link>}
        </div>
      )}

      <div className="gv-val-grid">
        {/* Lista de verificación */}
        <section className="gv-card gv-verificacion">
          <h2 className="gv-seccion-h2">Lista de verificación normativa</h2>
          <p className="gv-seccion-sub">
            Revisa cada requisito y marca su estado. Puedes registrar observaciones o solicitar subsanaciones en los casos necesarios.
          </p>

          <div className="gv-tabla-scroll">
            <table className="gv-tabla gv-tabla-compacta">
              <thead>
                <tr>
                  <th>Requisito</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              {grupos.map((grupo) => {
                const visual = GRUPOS_VISUAL[grupo.id] ?? { icono: 'fileText', color: 'azul' };
                const cerrado = !!cerrados[grupo.id];
                const completados = grupo.requisitos.filter((r) => {
                  const { estado } = valorActual(r);
                  return estado === 'CUMPLE' || estado === 'NO_APLICA';
                }).length;
                return (
                  <tbody key={grupo.id}>
                    <tr className={`gv-grupo ${visual.color}`}>
                      <td colSpan={4}>
                        <div className="gv-grupo-cabecera">
                          <span className="gv-grupo-icono"><Icono nombre={visual.icono} tamano={15} /></span>
                          <span className="gv-grupo-titulo">{grupo.titulo}</span>
                          <span className="gv-grupo-chip">{completados} / {grupo.requisitos.length} completados</span>
                          <button
                            type="button"
                            className="gv-grupo-toggle"
                            aria-expanded={!cerrado}
                            aria-label={cerrado ? 'Expandir sección' : 'Contraer sección'}
                            onClick={() => alternarGrupo(grupo.id)}
                          >
                            <Icono nombre={cerrado ? 'chevronDown' : 'chevronUp'} tamano={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {!cerrado &&
                      grupo.requisitos.map((req) => {
                        const actual = valorActual(req);
                        return [
                          <tr key={req.id}>
                            <td>{req.nombre}</td>
                            <td>
                              <InsigniaEstado estado={actual.estado} />
                              {actual.sinGuardar ? (
                                <span className="gv-chip-manual sin-guardar">Cambio sin guardar</span>
                              ) : actual.manual ? (
                                <span className="gv-chip-manual">Marcado por la gestora</span>
                              ) : null}
                            </td>
                            <td className="gv-observacion">{actual.observaciones || '—'}</td>
                            <td>
                              <div className="gv-acciones-fila">
                                <button
                                  type="button"
                                  className="gv-btn-ver gv-btn-ver-icono"
                                  aria-label={`Revisar ${req.nombre}`}
                                  aria-expanded={editando === req.id}
                                  onClick={() => setEditando(editando === req.id ? null : req.id)}
                                >
                                  <Icono nombre="eye" tamano={14} /> Revisar
                                </button>
                              </div>
                            </td>
                          </tr>,
                          editando === req.id && (
                            <EditorRequisito
                              key={`${req.id}-editor`}
                              req={req}
                              actual={actual}
                              onAplicar={(estado, observaciones) => aplicarCambio(req, estado, observaciones)}
                              onRestablecer={() => restablecer(req)}
                              onCerrar={() => setEditando(null)}
                            />
                          ),
                        ];
                      })}
                  </tbody>
                );
              })}
            </table>
          </div>
        </section>

        {/* Columna derecha */}
        <div className="gv-val-lateral">
          <section className="gv-card gv-lateral-card">
            <h2 className="gv-seccion-h2">Resumen de validación</h2>
            <div className="gv-resumen-validacion">
              <Donut porcentaje={resumen.porcentaje} />
              <ul className="gv-leyenda">
                {Object.entries(ESTADOS_VALIDACION).map(([codigoEstado, { etiqueta }]) => (
                  <li key={codigoEstado}>
                    <span className="gv-leyenda-punto" style={{ background: COLORES_LEYENDA[codigoEstado] }} />
                    <span className="gv-leyenda-etiqueta">{etiqueta}</span>
                    <span className="gv-leyenda-valor">{resumen.conteo[codigoEstado]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="gv-aviso-info">
              <Icono nombre="info" tamano={16} />
              {nSubsanar > 0 ? (
                <span>
                  {nSubsanar === 1 ? 'Existe ' : 'Existen '}
                  <strong>{nSubsanar} {nSubsanar === 1 ? 'requisito' : 'requisitos'}</strong>{' '}
                  que {nSubsanar === 1 ? 'requiere' : 'requieren'} subsanación para continuar con el proceso.
                </span>
              ) : (
                <span>No hay requisitos que requieran subsanación.</span>
              )}
            </div>
          </section>

          <section className="gv-card gv-lateral-card">
            <h2 className="gv-seccion-h2">Documentos del expediente</h2>
            <ul className="gv-docs-expediente">
              {documentos.map((doc) => {
                const est = ESTADOS_DOCUMENTO[doc.estado];
                return (
                  <li key={doc.id}>
                    <span className="gv-doc-icono"><Icono nombre="fileText" tamano={16} /></span>
                    <span className="gv-doc-texto">
                      <span className="gv-doc-nombre">{doc.nombre}</span>
                      <span className="gv-doc-fecha">
                        {doc.fecha ? formatearFecha(doc.fecha, { punto: false }) : 'Aún no se ha cargado'}
                      </span>
                    </span>
                    <span className={`gv-badge ${est.clase}`}>{est.etiqueta}</span>
                  </li>
                );
              })}
            </ul>
            <Link to={`${RUTA_BANDEJA}/${encodeURIComponent(expediente.id)}/documentos`} className="gv-enlace-seccion">
              Ir a la revisión de documentos <Icono nombre="arrowRight" tamano={14} />
            </Link>
          </section>

          <section className="gv-card gv-lateral-card">
            <h2 className="gv-seccion-h2">Acciones disponibles</h2>
            <button type="button" className="gv-btn-primario gv-btn-bloque" disabled={!puedeSolicitar} onClick={() => setModalAbierto(true)}>
              <Icono nombre="send" tamano={16} /> Solicitar subsanación
            </button>
            <button type="button" className="gv-btn-secundario gv-btn-bloque" disabled={!hayCambios || guardando || enviandoCIE} onClick={guardarCambios}>
              <Icono nombre="save" tamano={16} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" className="gv-btn-primario gv-btn-bloque gv-btn-enviar-cie" disabled={!puedeEnviarCIE} onClick={enviarAlCIE}>
              <Icono nombre="send" tamano={16} /> {enviandoCIE ? 'Enviando al CIE...' : yaEnviadoCIE ? 'Enviado al CIE' : 'Enviar expediente al CIE'}
            </button>
            <p className="gv-nota-accion">{nota}</p>
            <p className="gv-nota-accion">{notaEnvioCIE}</p>
          </section>
        </div>
      </div>

      {modalAbierto && (
        <ModalSolicitarSubsanacion
          codigo={expediente.id}
          evaluacion={subsanacion}
          onCerrar={() => setModalAbierto(false)}
          onCreada={alCrearSubsanacion}
        />
      )}
    </>
  );
};

const ValidacionNormativa = () => {
  const { expedienteId } = useParams();
  const navigate = useNavigate();
  const [lista, setLista] = useState(null); // null = todavía cargando
  const [errorLista, setErrorLista] = useState('');

  useEffect(() => {
    document.title = 'Validación Normativa - Gestora VIE';
  }, []);

  // Lista de expedientes enviados: alimenta el selector y el expediente inicial
  useEffect(() => {
    let cancelado = false;
    expedienteService
      .obtenerBandeja()
      .then((datos) => {
        if (!cancelado) setLista(datos.expedientes);
      })
      .catch((err) => {
        if (!cancelado) setErrorLista(mensajeDeError(err));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Al entrar desde el menú lateral (sin código en la ruta) se abre el expediente más reciente
  useEffect(() => {
    if (!expedienteId && lista && lista.length > 0) {
      navigate(`${RUTA_VALIDACION}/${encodeURIComponent(lista[0].id)}`, { replace: true });
    }
  }, [expedienteId, lista, navigate]);

  if (!expedienteId) {
    if (errorLista) return <MensajeEstado titulo="No se pudo cargar la información" texto={errorLista} />;
    if (lista === null) return <MensajeEstado titulo="Validación normativa" texto="Cargando expedientes..." />;
    if (lista.length === 0) {
      return (
        <MensajeEstado
          titulo="Aún no hay expedientes para validar"
          texto="Cuando una persona investigadora envíe una propuesta a la VIE, podrás validarla aquí."
        />
      );
    }
    return null; // redirigiendo al primer expediente
  }

  return <DetalleValidacion key={expedienteId} codigo={expedienteId} lista={lista ?? []} />;
};

export default ValidacionNormativa;
