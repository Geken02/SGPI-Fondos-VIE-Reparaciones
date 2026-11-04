// src/components/gestora/ModalSolicitarSubsanacion.jsx
// Pide confirmación y el texto de la subsanación. Lo usan Validación normativa y Revisión de documentos.
import { useState } from 'react';
import { expedienteService } from '../../services/expedienteService';
import { detalleDeError } from '../../utils/errores';
import Modal from './Modal';

const ModalSolicitarSubsanacion = ({ codigo, evaluacion, onCerrar, onCreada }) => {
  const [comentario, setComentario] = useState(evaluacion.comentarioSugerido);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async () => {
    setEnviando(true);
    setError('');
    try {
      const creada = await expedienteService.solicitarSubsanacion(codigo, comentario);
      onCreada(creada);
    } catch (err) {
      setError(detalleDeError(err, 'No se pudo enviar la solicitud. Intenta de nuevo.'));
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo={`Solicitar subsanación · ${codigo}`}
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" className="gv-btn-secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="button" className="gv-btn-primario" onClick={enviar} disabled={enviando || !comentario.trim()}>
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>
        </>
      }
    >
      <div>
        <strong>Por qué corresponde:</strong>
        <ul className="gv-motivos">
          {evaluacion.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      </div>

      <label className="gv-campo-formulario">
        <span className="gv-etiqueta-campo">Qué debe corregir el investigador (puedes editarlo)</span>
        <textarea
          className="gv-textarea"
          value={comentario}
          maxLength={4000}
          onChange={(e) => setComentario(e.target.value)}
        />
      </label>

      {error && <div className="gv-aviso gv-aviso-error" role="alert">{error}</div>}
    </Modal>
  );
};

export default ModalSolicitarSubsanacion;
