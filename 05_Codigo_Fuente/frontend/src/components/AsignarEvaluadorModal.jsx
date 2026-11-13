import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';
import '../styles/AsignarEvaluadorModal.css';

export default function AsignarEvaluadorModal({ isOpen, onClose, propuesta, onAsignar }) {
  const [evaluadores, setEvaluadores] = useState([]);
  const [evaluadorSeleccionado, setEvaluadorSeleccionado] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarEvaluadores();
    }
  }, [isOpen]);

  const cargarEvaluadores = async () => {
    try {
      const data = await comiteTecnicoService.obtenerEvaluadoresDisponibles();
      setEvaluadores(data);
    } catch (error) {
      console.error('Error cargando evaluadores:', error);
    }
  };

  const handleAsignar = async () => {
    if (!evaluadorSeleccionado) {
      alert('Debe seleccionar un evaluador');
      return;
    }

    setCargando(true);
    try {
      await comiteTecnicoService.asignarEvaluador(
        propuesta.propuestaId,
        parseInt(evaluadorSeleccionado),
        comentarios
      );
      onAsignar();
      onClose();
    } catch (error) {
      console.error('Error asignando:', error);
      alert(error.response?.data?.detail || 'Error al asignar evaluador');
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="asignar-modal-overlay" onClick={onClose}>
      <div 
        className="asignar-modal-container" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="asignar-modal-title">
          Asignar Evaluador
        </h2>
        
        <p className="asignar-modal-info">
          <strong>Propuesta:</strong> {propuesta.codigoPropuesta} - {propuesta.titulo}
        </p>

        <div className="asignar-form-group">
          <label htmlFor="evaluador-select" className="asignar-label">
            Seleccionar Evaluador: <span style={{color: '#ef4444'}}>*</span>
          </label>
          <select
            id="evaluador-select"
            value={evaluadorSeleccionado}
            onChange={(e) => setEvaluadorSeleccionado(e.target.value)}
            className="asignar-select"
            aria-required="true"
          >
            <option value="">-- Seleccione un evaluador --</option>
            {evaluadores.map((ev) => (
              <option key={ev.usuarioId} value={ev.usuarioId}>
                {ev.nombre} ({ev.correo})
              </option>
            ))}
          </select>
        </div>

        <div className="asignar-form-group">
          <label htmlFor="comentarios-textarea" className="asignar-label">
            Comentarios (opcional):
          </label>
          <textarea
            id="comentarios-textarea"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
            className="asignar-textarea"
            placeholder="Instrucciones especiales para el evaluador..."
          />
        </div>

        <div className="asignar-actions">
          <button
            type="button"
            onClick={onClose}
            className="asignar-btn-cancel"
            aria-label="Cancelar asignación"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAsignar}
            disabled={cargando || !evaluadorSeleccionado}
            className="asignar-btn-submit"
            aria-label={cargando ? 'Asignando evaluador' : 'Confirmar asignación de evaluador'}
          >
            {cargando ? 'Asignando...' : 'Asignar Evaluador'}
          </button>
        </div>
      </div>
    </div>
  );
}