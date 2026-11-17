import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import '../../styles/DictamenFinal.css';

const Icon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {path}
  </svg>
);

const ICONS = {
  flecha: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  documento: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  usuario: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
};

export default function DictamenFinal() {
  const { propuestaId } = useParams();
  const navigate = useNavigate();
  
  const [datos, setDatos] = useState(null);
  const [recomendacion, setRecomendacion] = useState('');
  const [contenido, setContenido] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarConsolidacion();
  }, [propuestaId]);

  const cargarConsolidacion = async () => {
    try {
      setCargando(true);
      const response = await comiteTecnicoService.consolidarEvaluaciones(propuestaId);
      setDatos(response.data);
    } catch (error) {
      console.error('Error cargando consolidación:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleEmitirDictamen = async () => {
    if (!contenido.trim()) {
      alert('El contenido del dictamen es obligatorio');
      return;
    }
    if (!recomendacion) {
      alert('Debe seleccionar una recomendación');
      return;
    }

    if (!window.confirm(`¿Está seguro de emitir el dictamen ${recomendacion === 'RECOMIENDA' ? 'RECOMENDANDO' : 'NO RECOMENDANDO'} la propuesta? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setEnviando(true);
      await comiteTecnicoService.emitirDictamen(propuestaId, {
        contenido,
        observaciones,
        recomienda: recomendacion === 'RECOMIENDA'
      });
      alert('Dictamen emitido correctamente');
      navigate('/comite-tecnico/propuestas-asignadas');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.detail || 'Error al emitir dictamen');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="dictamen-container">
        <div className="dictamen-loading">
          <div className="dictamen-spinner"></div>
          <p>Cargando consolidación de evaluaciones...</p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="dictamen-container">
        <div className="dictamen-error">
          <h2>No se pudo cargar la consolidación</h2>
          <button onClick={() => navigate('/comite-tecnico/propuestas-asignadas')} className="dictamen-btn-back">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const calificacionFinal = datos.calificacionFinal || 0;
  const calificacionPorcentaje = (calificacionFinal * 100).toFixed(1);
  const esRecomendable = calificacionFinal >= 0.70;

  return (
    <div className="dictamen-container">
      {/* HEADER */}
      <div className="dictamen-header">
        <button onClick={() => navigate(-1)} className="dictamen-back-btn">
          <Icon path={ICONS.flecha} size={16} />
          <span>Volver</span>
        </button>
        <div className="dictamen-header-content">
          <div className="dictamen-title-row">
            <h1 className="dictamen-title">Dictamen Final: {datos.codigoPropuesta}</h1>
            <span className={`dictamen-badge ${esRecomendable ? 'recomendable' : 'no-recomendable'}`}>
              {esRecomendable ? 'Recomendable' : 'No Recomendable'}
            </span>
          </div>
          <p className="dictamen-subtitle">{datos.titulo}</p>
        </div>
      </div>

      {/* RESUMEN DE EVALUACIONES */}
      <div className="dictamen-card">
        <h2 className="dictamen-card-title">
          <Icon path={ICONS.documento} size={20} color="#002855" />
          Consolidación de Evaluaciones
        </h2>

        <div className="dictamen-summary-grid">
          <div className="dictamen-summary-card">
            <div className="dictamen-summary-value">{datos.totalEvaluadores || 0}</div>
            <div className="dictamen-summary-label">Evaluadores</div>
          </div>
          <div className="dictamen-summary-card">
            <div className="dictamen-summary-value" style={{ color: calificacionFinal >= 0.70 ? '#10b981' : '#ef4444' }}>
              {calificacionPorcentaje}%
            </div>
            <div className="dictamen-summary-label">Calificación Final</div>
          </div>
          <div className="dictamen-summary-card">
            <div className="dictamen-summary-value" style={{ fontSize: '18px', color: esRecomendable ? '#10b981' : '#ef4444' }}>
              {esRecomendable ? '≥ 70%' : '< 70%'}
            </div>
            <div className="dictamen-summary-label">Umbral de aprobación</div>
          </div>
        </div>

        {datos.evaluaciones && datos.evaluaciones.length > 0 && (
          <div style={{marginTop: '24px'}}>
            <h3 className="dictamen-subtitle-text">Evaluaciones individuales</h3>
            <table className="dictamen-table">
              <thead>
                <tr>
                  <th>Evaluador</th>
                  <th style={{textAlign: 'center'}}>Calificación</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {datos.evaluaciones.map((ev, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div className="dictamen-avatar-icon">
                          <Icon path={ICONS.usuario} size={14} />
                        </div>
                        {ev.evaluador}
                      </div>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <span className={`dictamen-calificacion-badge ${ev.calificacion >= 0.70 ? 'aprobado' : 'rechazado'}`}>
                        {(ev.calificacion * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      {ev.fechaEvaluacion ? new Date(ev.fechaEvaluacion).toLocaleDateString('es-CR') : 'Pendiente'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORMULARIO DE DICTAMEN */}
      <div className="dictamen-card">
        <h2 className="dictamen-card-title">
          <Icon path={ICONS.documento} size={20} color="#002855" />
          Emitir Dictamen del Comité Técnico
        </h2>

        <div className="dictamen-form-group">
          <label className="dictamen-label">
            Recomendación del Comité Técnico <span style={{color: '#ef4444'}}>*</span>
          </label>
          <div className="dictamen-radio-group">
            <button
              type="button"
              onClick={() => setRecomendacion('RECOMIENDA')}
              className={`dictamen-radio-btn ${recomendacion === 'RECOMIENDA' ? 'active-green' : ''}`}
            >
              <Icon path={ICONS.check} size={20} color={recomendacion === 'RECOMIENDA' ? 'white' : '#10b981'} />
              <span>RECOMIENDA</span>
            </button>
            <button
              type="button"
              onClick={() => setRecomendacion('NO RECOMIENDA')}
              className={`dictamen-radio-btn ${recomendacion === 'NO RECOMIENDA' ? 'active-red' : ''}`}
            >
              <Icon path={ICONS.x} size={20} color={recomendacion === 'NO RECOMIENDA' ? 'white' : '#ef4444'} />
              <span>NO RECOMIENDA</span>
            </button>
          </div>
          <div className="dictamen-helper-text">
            <Icon path={ICONS.info} size={14} color="#64748b" />
            <span>La calificación mínima para recomendar es 70% (0.70). Calificación actual: {calificacionPorcentaje}%</span>
          </div>
        </div>

        <div className="dictamen-form-group">
          <label className="dictamen-label">
            Contenido del Dictamen <span style={{color: '#ef4444'}}>*</span>
          </label>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Redacte el dictamen final del Comité Técnico, incluyendo los fundamentos de la decisión, aspectos destacados de la propuesta y recomendaciones..."
            className="dictamen-textarea"
            rows={8}
          />
          <div className="dictamen-char-count">{contenido.length} caracteres</div>
        </div>

        <div className="dictamen-form-group">
          <label className="dictamen-label">
            Observaciones adicionales (opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones adicionales para el CIE..."
            className="dictamen-textarea"
            rows={4}
          />
        </div>

        <div className="dictamen-actions">
          <button
            type="button"
            onClick={() => navigate('/comite-tecnico/propuestas-asignadas')}
            className="dictamen-btn-cancel"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEmitirDictamen}
            disabled={enviando || !contenido.trim() || !recomendacion}
            className="dictamen-btn-submit"
          >
            {enviando ? 'Emitiendo...' : 'Emitir Dictamen'}
          </button>
        </div>
      </div>
    </div>
  );
}