import { useState } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';

// Iconos SVG
const IconBot = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>;
const IconSpinner = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

export default function AnalisisIA({ propuestaId, rubricaData, onAplicarSugerencias }) {
  const [analizando, setAnalizando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [sugerencias, setSugerencias] = useState(null);
  const [error, setError] = useState('');
  
  const analizarDocumento = async () => {
    setAnalizando(true);
    setError('');
    setSugerencias(null);
    setProgreso('Enviando documento a la IA...');

    try {
      const tipoModalidad = rubricaData?.nombreRubrica || rubricaData?.tipoModalidad || rubricaData?.modalidad || 'Investigación Básica y Aplicada';
      
      const criteriosPorSeccion = {};
      if (rubricaData?.estructuraRubrica?.secciones) {
        rubricaData.estructuraRubrica.secciones.forEach(seccion => {
          criteriosPorSeccion[seccion.id] = seccion.criterios.map(c => c.nombre);
        });
      }

      const payload = {
        tipoModalidad: tipoModalidad,
        criteriosPorSeccion: criteriosPorSeccion
      };

      const res = await comiteTecnicoService.analizarDocumentoIA(propuestaId, payload);

      if (res.data.error) {
        setError(res.data.error);
        setProgreso('');
      } else {
        setSugerencias(res.data.sugerencias);
        setProgreso(`Análisis completado. Calificación estimada: ${res.data.calificacionEstimada}/10`);
      }
    } catch (err) {
      console.error('Error:', err);
      const msg = err.response?.data?.detail || err.message || 'Error desconocido';
      let errorMsg = msg;
      if (Array.isArray(msg)) {
        errorMsg = msg.map(e => `${e.loc.join('.')}: ${e.msg}`).join('\n');
      }
      setError(`Error al analizar: ${errorMsg}`);
      setProgreso('');
    } finally {
      setAnalizando(false);
    }
  };

  const aplicarTodas = () => {
    if (sugerencias && onAplicarSugerencias) {
      onAplicarSugerencias(sugerencias);
    }
  };

  return (
    <div className="analisis-ia-container" style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
      <button
        className="btn-analizar"
        onClick={analizarDocumento}
        disabled={analizando}
        style={{
          padding: '10px 20px',
          backgroundColor: analizando ? '#94a3b8' : '#0284c7',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: analizando ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px'
        }}
      >
        {analizando ? <><IconSpinner /> Analizando...</> : <><IconBot /> Analizar documento con IA</>}
      </button>

      {progreso && !error && (
        <div className="progreso-text" style={{ marginTop: '12px', color: '#0369a1', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconCheck /> <p style={{ margin: 0 }}>{progreso}</p>
        </div>
      )}

      {error && (
        <div className="error-box" style={{ marginTop: '12px', color: '#dc2626', fontSize: '14px', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <IconAlert /> <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</p>
        </div>
      )}

      {sugerencias && (
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '12px' }}>Sugerencias de calificación automática</h3>
          
          {Object.entries(sugerencias).map(([seccionId, seccion]) => (
            <div key={seccionId} className="sugerencia-card" style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '14px', color: '#002855', marginBottom: '8px' }}>{seccion.seccionNombre}</h4>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                {seccion.criterios.map((c, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < seccion.criterios.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <strong>{c.criterioNombre}</strong>: Puntaje sugerido {c.puntajeSugerido}/10 ({c.nivelSugerido})
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>"{c.justificacion}"</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button 
            className="btn-aplicar"
            onClick={aplicarTodas}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              marginTop: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <IconCheck /> Aplicar sugerencias a la rúbrica
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .high-contrast-mode .analisis-ia-container {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .btn-analizar {
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .btn-aplicar {
          background: #000000 !important;
          color: #00ff00 !important;
          border: 2px solid #00ff00 !important;
        }
        .high-contrast-mode .sugerencia-card {
          background: #000000 !important;
          border: 1px solid #ffffff !important;
          color: #ffffff !important;
        }
        .high-contrast-mode .error-box {
          background: #000000 !important;
          color: #ff0000 !important;
          border: 2px solid #ff0000 !important;
        }
        .high-contrast-mode .progreso-text {
          color: #ffff00 !important;
        }
      `}</style>
    </div>
  );
}