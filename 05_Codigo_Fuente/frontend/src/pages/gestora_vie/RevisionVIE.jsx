import SeleccionExpediente from '../../components/gestora/SeleccionExpediente';
// src/pages/gestora_vie/RevisionVIE.jsx
// Ventana: Revisión VIE - Gestora VIE
// Se abre desde "Ver" en la bandeja: /gestora/expedientes/:expedienteId/revision
// Los datos vienen del backend: GET /vie/expedientes/{codigo}/revision
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icono from '../../components/gestora/Iconos';
import { ESTADOS } from '../../data/estadosExpediente';
import { ESTADOS_DOCUMENTO, ESTADOS_REQUISITO, PASOS } from '../../data/revisionConfig';
import { expedienteService } from '../../services/expedienteService';
import { formatearFecha } from '../../utils/fechas';

const RUTA_BANDEJA = '/gestora/expedientes';

const mensajeDeError = (error) =>
  error.response?.status === 403
    ? 'Tu usuario no tiene el rol de Gestora VIE para ver este expediente.'
    : 'No se pudo cargar el expediente. Verifica que el servidor esté en ejecución e intenta de nuevo.';

const VolverALaBandeja = () => (
  <Link to={RUTA_BANDEJA} className="gv-volver">
    <Icono nombre="arrowLeft" tamano={14} />
    Volver a la bandeja
  </Link>
);

const MensajeEstado = ({ titulo, texto }) => (
  <>
    <VolverALaBandeja />
    <div className="gv-card gv-en-construccion">
      <h1 className="gv-titulo">{titulo}</h1>
      <p className="gv-subtitulo">{texto}</p>
    </div>
  </>
);

// Detalle de un expediente. Se monta de nuevo (key) al cambiar de expediente.
const DetalleRevision = ({ codigo }) => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    expedienteService
      .obtenerRevision(codigo)
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

  if (error?.noEncontrado) {
    return <MensajeEstado titulo="Expediente no encontrado" texto={`No existe un expediente enviado con el código ${codigo}.`} />;
  }
  if (error) {
    return <MensajeEstado titulo="No se pudo cargar el expediente" texto={error.mensaje} />;
  }
  if (!datos) {
    return <MensajeEstado titulo="Revisión normativa" texto="Cargando expediente..." />;
  }

  const { expediente, requisitos, documentos } = datos;
  const estado = ESTADOS[expediente.estado] ?? { etiqueta: expediente.estadoDetalle, clase: 'revision' };

  // Paso 2: revisión de los documentos del expediente
  const irSiguientePaso = () => {
    navigate(`${RUTA_BANDEJA}/${encodeURIComponent(expediente.id)}/documentos`);
  };

  return (
    <>
      <VolverALaBandeja />
      <h1 className="gv-titulo">Revisión normativa</h1>
      <p className="gv-subtitulo">Verifica el cumplimiento de requisitos y gestiona las subsanaciones.</p>

      {/* Datos del expediente */}
      <section className="gv-card gv-expediente-info">
        <div className="gv-expediente-icono">
          <Icono nombre="fileText" tamano={26} />
        </div>

        <div className="gv-expediente-datos">
          <div className="gv-expediente-codigo">{expediente.id}</div>
          <div className="gv-expediente-titulo">{expediente.titulo}</div>
          <div className="gv-expediente-meta">
            Investigador principal: {expediente.investigador} · Escuela: {expediente.escuela}
          </div>
        </div>

        <div className="gv-expediente-lateral">
          <span className={`gv-badge ${estado.clase}`} title={expediente.estadoDetalle}>
            <span className="gv-badge-punto" />
            {estado.etiqueta}
          </span>
          <span className="gv-expediente-fecha">
            Fecha límite: {expediente.fechaLimite ? formatearFecha(expediente.fechaLimite, { punto: false }) : '—'}
          </span>
        </div>
      </section>

      <section className="gv-card gv-panel-revision">
        {/* Pasos */}
        <ol className="gv-pasos">
          {PASOS.map((nombre, i) => {
            const numero = i + 1;
            const clase =
              numero === expediente.pasoActual ? 'actual' : numero < expediente.pasoActual ? 'hecho' : '';
            return (
              <li key={nombre} className={`gv-paso ${clase}`}>
                <span className="gv-paso-numero">{numero}</span>
                <span className="gv-paso-nombre">{nombre}</span>
              </li>
            );
          })}
        </ol>

        <div className="gv-revision-grid">
          {/* Requisitos normativos */}
          <div className="gv-subcard">
            <h2 className="gv-subcard-titulo">Requisitos normativos</h2>
            <table className="gv-tabla gv-tabla-compacta">
              <thead>
                <tr>
                  <th>Requisito</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {requisitos.map((req) => {
                  const est = ESTADOS_REQUISITO[req.estado];
                  return (
                    <tr key={req.id}>
                      <td>{req.nombre}</td>
                      <td>
                        <span className={`gv-badge ${est.clase}`}>
                          <span className="gv-badge-punto" />
                          {est.etiqueta}
                        </span>
                      </td>
                      <td className="gv-observacion">{req.observaciones || 'Sin observaciones'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Documentación adjunta + botón siguiente */}
          <div className="gv-revision-lateral">
            <div className="gv-subcard">
              <h2 className="gv-subcard-titulo">Documentación adjunta</h2>
              <ul className="gv-documentos">
                {documentos.map((doc) => {
                  const est = ESTADOS_DOCUMENTO[doc.estado];
                  return (
                    <li key={doc.id}>
                      <span className={`gv-doc-icono ${doc.estado === 'FALTANTE' ? 'falta' : ''}`}>
                        <Icono nombre="fileText" tamano={16} />
                      </span>
                      <span className="gv-doc-nombre">{doc.nombre}</span>
                      <span className={`gv-badge ${est.clase}`}>{est.etiqueta}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button type="button" className="gv-btn-primario" onClick={irSiguientePaso}>
              Siguiente: Revisión de documentos
              <Icono nombre="arrowRight" tamano={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

const RevisionVIE = () => {
  const { expedienteId } = useParams();

  useEffect(() => {
    document.title = 'Revisión VIE - Gestora VIE';
  }, []);

  if (!expedienteId) return <SeleccionExpediente titulo="Revisión VIE" ruta="/gestora/revision-vie" />;

  return <DetalleRevision key={expedienteId} codigo={expedienteId} />;
};

export default RevisionVIE;
