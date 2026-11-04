// src/components/gestora/ModalDetalleSubsanacion.jsx
// Detalle de una subsanación. Si el investigador ya respondió, la gestora puede aceptar o rechazar la respuesta.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ESTADOS_SUBSANACION } from '../../data/subsanacionesConfig';
import { subsanacionService } from '../../services/subsanacionService';
import { detalleDeError } from '../../utils/errores';
import { formatearFecha } from '../../utils/fechas';
import Modal from './Modal';

const fecha = (iso) => (iso ? formatearFecha(iso, { punto: false }) : '—');

const ModalDetalleSubsanacion = ({ fila, onCerrar, onActualizada }) => {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const est = ESTADOS_SUBSANACION[fila.estado] ?? { etiqueta: fila.estadoDetalle, clase: 'revision' };

  const resolver = async (accion) => {
    setProcesando(true);
    setError('');
    try {
      const actualizada = await subsanacionService.resolver(fila.subsanacionId, accion, accion === 'RECHAZAR' ? motivo : '');
      setRechazando(false);
      setMotivo('');
      onActualizada(actualizada);
    } catch (err) {
      setError(detalleDeError(err, 'No se pudo guardar la decisión. Intenta de nuevo.'));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal
      titulo={`Subsanación · ${fila.expedienteId}`}
      onCerrar={onCerrar}
      pie={
        <>
          <Link to={`/gestora/validacion-normativa/${encodeURIComponent(fila.expedienteId)}`} className="gv-btn-secundario">
            Abrir validación normativa
          </Link>
          <button type="button" className="gv-btn-primario" onClick={onCerrar}>
            Cerrar
          </button>
        </>
      }
    >
      <div>
        <div className="gv-detalle-titulo">{fila.titulo}</div>
        <div className="gv-detalle-meta">
          {fila.investigador} · {fila.escuela} · <span className={`gv-badge ${est.clase}`}>{est.etiqueta}</span>
        </div>
      </div>

      <section>
        <div className="gv-etiqueta-campo">Solicitud de la gestora · {fecha(fila.fechaObservacion)} · {fila.gestora}</div>
        <p className="gv-texto-largo">{fila.comentarioGestora}</p>
      </section>

      <section>
        <div className="gv-etiqueta-campo">Respuesta del investigador · {fecha(fila.fechaRespuesta)}</div>
        {fila.respuestaInvestigador ? (
          <p className="gv-texto-largo">{fila.respuestaInvestigador}</p>
        ) : (
          <p className="gv-texto-vacio">El investigador aún no ha respondido.</p>
        )}
      </section>

      {fila.comentarioResolucion && (
        <section>
          <div className="gv-etiqueta-campo">Motivo del rechazo · {fecha(fila.fechaResolucion)}</div>
          <p className="gv-texto-largo">{fila.comentarioResolucion}</p>
        </section>
      )}

      {fila.puedeResolver && (
        <section className="gv-resolver">
          <div className="gv-etiqueta-campo">¿La respuesta resuelve lo solicitado?</div>
          {!rechazando ? (
            <div className="gv-acciones-resolver">
              <button type="button" className="gv-btn-primario" disabled={procesando} onClick={() => resolver('ACEPTAR')}>
                Aceptar respuesta
              </button>
              <button type="button" className="gv-btn-peligro" disabled={procesando} onClick={() => setRechazando(true)}>
                Rechazar respuesta
              </button>
            </div>
          ) : (
            <>
              <label className="gv-campo-formulario">
                <span className="gv-etiqueta-campo">Motivo del rechazo (se le indicará al investigador)</span>
                <textarea className="gv-textarea" value={motivo} maxLength={4000} onChange={(e) => setMotivo(e.target.value)} />
              </label>
              <div className="gv-acciones-resolver">
                <button type="button" className="gv-btn-secundario" disabled={procesando} onClick={() => setRechazando(false)}>
                  Volver
                </button>
                <button
                  type="button"
                  className="gv-btn-peligro"
                  disabled={procesando || !motivo.trim()}
                  onClick={() => resolver('RECHAZAR')}
                >
                  Confirmar rechazo
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {error && <div className="gv-aviso gv-aviso-error" role="alert">{error}</div>}
    </Modal>
  );
};

export default ModalDetalleSubsanacion;
