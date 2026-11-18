import SeleccionExpediente from '../../components/gestora/SeleccionExpediente';
import VisorDocumentoModal from '../../components/VisorDocumentoModal';
// src/pages/gestora_vie/RevisionDocumentos.jsx
// Ventana: Revisión de documentos - Gestora VIE (paso 2 del proceso)
// Ruta: /gestora/expedientes/:expedienteId/documentos
// Datos: GET /vie/expedientes/{codigo}/documentos  ·  Guardar: PUT /vie/expedientes/{codigo}/documentos/revision
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icono from '../../components/gestora/Iconos';
import ModalSolicitarSubsanacion from '../../components/gestora/ModalSolicitarSubsanacion';
import { ESTADOS } from '../../data/estadosExpediente';
import { ESTADOS_REVISION_DOCUMENTO, OPCIONES_REVISION_DOCUMENTO, PASOS } from '../../data/revisionConfig';
import { expedienteService } from '../../services/expedienteService';
import { detalleDeError } from '../../utils/errores';
import { formatearFecha } from '../../utils/fechas';

const RUTA_BANDEJA = '/gestora/expedientes';

const mensajeDeError = (error) =>
  error.response?.status === 403
    ? 'Tu usuario no tiene el rol de Gestora VIE para ver este expediente.'
    : 'No se pudo cargar el expediente. Verifica que el servidor esté en ejecución e intenta de nuevo.';

const VolverALaBandeja = () => (
  <Link to={RUTA_BANDEJA} className="gv-volver" aria-label="Volver a la bandeja principal de expedientes">
    <Icono nombre="arrowLeft" tamano={14} aria-hidden="true" />
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
const DetalleDocumentos = ({ codigo }) => {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cambios, setCambios] = useState({}); // documentoId -> { estado, observaciones } (sin guardar)
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [enviandoCIE, setEnviandoCIE] = useState(false);
  const [documentoAbierto, setDocumentoAbierto] = useState(null);

  useEffect(() => {
    let cancelado = false;
    expedienteService
      .obtenerDocumentos(codigo)
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

  const valorActual = (doc) => cambios[doc.documentoId] ?? { estado: doc.estado, observaciones: doc.observaciones };

  const conteo = useMemo(() => {
    const total = { SIN_REVISAR: 0, CORRECTO: 0, INCOMPLETO: 0, FALTA_FIRMA: 0, FALTANTE: 0 };
    (datos?.documentos ?? []).forEach((doc) => {
      const estado = doc.estado === 'FALTANTE' ? 'FALTANTE' : (cambios[doc.documentoId]?.estado ?? doc.estado);
      total[estado] += 1;
    });
    return total;
  }, [datos, cambios]);

  if (error?.noEncontrado) {
    return <MensajeEstado titulo="Expediente no encontrado" texto={`No existe un expediente enviado con el código ${codigo}.`} />;
  }
  if (error) {
    return <MensajeEstado titulo="No se pudo cargar el expediente" texto={error.mensaje} />;
  }
  if (!datos) {
    return <MensajeEstado titulo="Revisión de documentos" texto="Cargando expediente..." />;
  }

  const { expediente, documentos, subsanacion, envioCie } = datos;
  const estado = ESTADOS[expediente.estado] ?? { etiqueta: expediente.estadoDetalle, clase: 'revision' };
  const pasoActual = Math.max(2, expediente.pasoActual);
  const hayCambios = Object.keys(cambios).length > 0;
  const puedeSolicitar = subsanacion.puede && !hayCambios && !guardando;
  // La elegibilidad viene del backend y usa exactamente las mismas reglas que el POST.
  // Solo se bloquea localmente mientras existan cambios sin guardar.
  const puedeEnviarCIE = envioCie?.puede === true && !hayCambios && !guardando && !enviandoCIE;

  const cambiar = (doc, campos) => {
    setCambios((prev) => {
      const nuevo = { ...valorActual(doc), ...campos };
      const siguiente = { ...prev };
      if (nuevo.estado === doc.estado && nuevo.observaciones === doc.observaciones) delete siguiente[doc.documentoId];
      else siguiente[doc.documentoId] = nuevo;
      return siguiente;
    });
  };

  const guardarRevision = async () => {
    setGuardando(true);
    setAviso(null);
    try {
      const revisiones = Object.entries(cambios).map(([documentoId, c]) => ({
        documentoId: Number(documentoId),
        estado: c.estado,
        observaciones: c.observaciones,
      }));
      setDatos(await expedienteService.guardarRevisionDocumentos(expediente.id, revisiones));
      setCambios({});
      setAviso({ tipo: 'ok', texto: 'Revisión guardada.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: detalleDeError(err, 'No se pudo guardar la revisión. Intenta de nuevo.') });
    } finally {
      setGuardando(false);
    }
  };

  const enviarAlCIE = async () => {
    setEnviandoCIE(true);
    setAviso(null);
    try {
      const resultado = await expedienteService.enviarAlCIE(expediente.id);
      setAviso({ tipo: 'ok', texto: resultado.mensaje || 'El expediente se envió al CIE correctamente.' });
      setDatos(await expedienteService.obtenerDocumentos(expediente.id));
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
      setDatos(await expedienteService.obtenerDocumentos(expediente.id));
    } catch {
      /* si falla la recarga, el aviso ya confirmó que se creó */
    }
  };

  let nota;
  if (hayCambios) nota = 'Guarda la revisión antes de solicitar la subsanación o enviar al CIE.';
  else if (subsanacion.bloqueo) nota = subsanacion.bloqueo;
  else if (!subsanacion.puede) {
    nota = `No hace falta solicitar subsanación: están todos los documentos y el cumplimiento normativo es de ${subsanacion.porcentajeCumplimiento} % (mínimo ${subsanacion.umbral} %).`;
  } else nota = `Corresponde solicitarla. ${subsanacion.motivos.join(' ')}`;

  return (
    <>
      <VolverALaBandeja />
      <h1 className="gv-titulo">Revisión de documentos</h1>
      <p className="gv-subtitulo">Revisa cada documento del expediente y marca si está correcto, incompleto o le falta la firma.</p>

      {/* Datos del expediente */}
      <section className="gv-card gv-expediente-info" aria-label="Información del expediente">
        <div className="gv-expediente-icono" aria-hidden="true">
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
            <span className="gv-badge-punto" aria-hidden="true" />
            {estado.etiqueta}
          </span>
          <span className="gv-expediente-fecha">
            Fecha límite: {expediente.fechaLimite ? formatearFecha(expediente.fechaLimite, { punto: false }) : '—'}
          </span>
        </div>
      </section>

      <section className="gv-card gv-panel-revision" aria-label="Panel de revisión de documentos">
        {/* Pasos */}
        <ol className="gv-pasos" aria-label="Pasos de revisión">
          {PASOS.map((nombre, i) => {
            const numero = i + 1;
            const clase = numero === pasoActual ? 'actual' : numero < pasoActual ? 'hecho' : '';
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

        <p className="gv-resumen-docs">
          {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'} · {conteo.CORRECTO} correctos ·{' '}
          {conteo.INCOMPLETO + conteo.FALTA_FIRMA} con observaciones · {conteo.SIN_REVISAR} sin revisar · {conteo.FALTANTE} faltantes
        </p>

        <div className="gv-tabla-scroll">
          <table className="gv-tabla gv-tabla-compacta">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Archivo</th>
                <th>Cargado</th>
                <th>Estado de revisión</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                if (doc.estado === 'FALTANTE') {
                  const falta = ESTADOS_REVISION_DOCUMENTO.FALTANTE;
                  return (
                    <tr key={doc.id}>
                      <td>{doc.nombre}</td>
                      <td className="gv-texto-vacio" colSpan={2}>Aún no se ha cargado</td>
                      <td><span className={`gv-badge ${falta.clase}`}>{falta.etiqueta}</span></td>
                      <td className="gv-observacion">Documento obligatorio</td>
                    </tr>
                  );
                }
                const actual = valorActual(doc);
                const sinGuardar = !!cambios[doc.documentoId];
                return (
                  <tr key={doc.id}>
                    <td>{doc.nombre}</td>
                    <td className="gv-doc-archivo">
                      <span>{doc.archivo}</span>
                      {doc.cargadoPor && <span className="gv-doc-fecha">por {doc.cargadoPor}</span>}
                      {doc.documentoId && (
                        <button type="button" className="gv-btn-ver" onClick={() => setDocumentoAbierto({ id: doc.documentoId, nombre: doc.archivo || doc.nombre })}>
                          Ver documento
                        </button>
                      )}
                    </td>
                    <td>{formatearFecha(doc.fecha, { punto: false })}</td>
                    <td>
                      <select
                        className="gv-select-simple"
                        aria-label={`Estado de revisión de ${doc.nombre}`}
                        value={actual.estado}
                        onChange={(e) => cambiar(doc, { estado: e.target.value })}
                      >
                        {OPCIONES_REVISION_DOCUMENTO.map((codigoEstado) => (
                          <option key={codigoEstado} value={codigoEstado}>{ESTADOS_REVISION_DOCUMENTO[codigoEstado].etiqueta}</option>
                        ))}
                      </select>
                      {sinGuardar && <span className="gv-chip-manual sin-guardar">Cambio sin guardar</span>}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="gv-input-texto"
                        aria-label={`Observaciones de ${doc.nombre}`}
                        placeholder="Observaciones (opcional)"
                        maxLength={2000}
                        value={actual.observaciones}
                        onChange={(e) => cambiar(doc, { observaciones: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="gv-barra-acciones">
          <Link to={`${RUTA_BANDEJA}/${encodeURIComponent(expediente.id)}/revision`} className="gv-btn-secundario">
            <Icono nombre="arrowLeft" tamano={16} /> Revisión normativa
          </Link>
          <button type="button" className="gv-btn-secundario" disabled={!hayCambios || guardando} onClick={guardarRevision}>
            <Icono nombre="save" tamano={16} /> {guardando ? 'Guardando...' : 'Guardar revisión'}
          </button>
          <button type="button" className="gv-btn-primario" disabled={!puedeSolicitar} onClick={() => setModalAbierto(true)}>
            <Icono nombre="send" tamano={16} /> Solicitar subsanación
          </button>
          <button type="button" className="gv-btn-primario gv-btn-enviar-cie" disabled={!puedeEnviarCIE} onClick={enviarAlCIE}>
            <Icono nombre="send" tamano={16} /> {enviandoCIE ? 'Enviando al CIE...' : 'Enviar expediente al CIE'}
          </button>
        </div>
        <p className="gv-nota-accion gv-nota-derecha">{nota}</p>
        <p className="gv-nota-accion gv-nota-derecha">
          {hayCambios
            ? 'Guarda los cambios de revisión para actualizar la validación de envío.'
            : envioCie?.puede
              ? `El expediente cumple las condiciones del backend para enviarse al CIE (${envioCie.porcentajeCumplimiento} % de cumplimiento).`
              : (envioCie?.motivos ?? ['No fue posible obtener la validación de envío.']).join(' ')}
        </p>
      </section>

      {documentoAbierto && (
        <VisorDocumentoModal documentoId={documentoAbierto.id} nombreArchivo={documentoAbierto.nombre} onClose={() => setDocumentoAbierto(null)} />
      )}
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

const RevisionDocumentos = () => {
  const { expedienteId } = useParams();

  useEffect(() => {
    document.title = 'Revisión de documentos - Gestora VIE';
  }, []);

  if (!expedienteId) return <SeleccionExpediente titulo="Revisión de documentos" ruta="/gestora/revision-documentos" />;

  return <DetalleDocumentos key={expedienteId} codigo={expedienteId} />;
};

export default RevisionDocumentos;
