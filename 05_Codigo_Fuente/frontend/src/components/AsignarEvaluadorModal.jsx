// src/components/AsignarEvaluadorModal.jsx
import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ color: '#002855', marginBottom: '24px' }}>
          Asignar Evaluador
        </h2>
        
        <p style={{ marginBottom: '16px', color: '#64748b' }}>
          <strong>Propuesta:</strong> {propuesta.codigoPropuesta} - {propuesta.titulo}
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Seleccionar Evaluador:
          </label>
          <select
            value={evaluadorSeleccionado}
            onChange={(e) => setEvaluadorSeleccionado(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            <option value="">-- Seleccione un evaluador --</option>
            {evaluadores.map((ev) => (
              <option key={ev.usuarioId} value={ev.usuarioId}>
                {ev.nombre} ({ev.correo})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Comentarios (opcional):
          </label>
          <textarea
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical'
            }}
            placeholder="Instrucciones especiales para el evaluador..."
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={cargando || !evaluadorSeleccionado}
            style={{
              padding: '10px 20px',
              backgroundColor: '#002855',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: cargando ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: cargando || !evaluadorSeleccionado ? 0.5 : 1
            }}
          >
            {cargando ? 'Asignando...' : 'Asignar Evaluador'}
          </button>
        </div>
      </div>
    </div>
  );
}