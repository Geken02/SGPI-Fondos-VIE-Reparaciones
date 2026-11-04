// src/components/rubrica/AnalisisIA.jsx
import { useState } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService'; // Ajusta la ruta si es necesario

export default function AnalisisIA({ propuestaId, rubricaData, onAplicarSugerencias }) {
  const [analizando, setAnalizando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [sugerencias, setSugerencias] = useState(null);
  const [error, setError] = useState('');
  
  const analizarDocumento = async () => {
    setAnalizando(true);
    setError('');
    setSugerencias(null);
    setProgreso('🔄 Enviando documento a la IA...');

    try {
      // Detectar la modalidad de la propuesta
      const tipoModalidad = rubricaData?.nombreRubrica || 
                            rubricaData?.tipoModalidad || 
                            rubricaData?.modalidad ||
                            'Investigación Básica y Aplicada';
      
      console.log('📋 Modalidad enviada:', tipoModalidad);

      // Construir criterios reales por sección COMO OBJETOS (no solo strings)
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

    console.log('📤 Payload enviado a IA:', payload); // Verifica en consola que sean solo strings

    const res = await comiteTecnicoService.analizarDocumentoIA(propuestaId, payload);


      if (res.data.error) {
        setError(res.data.error);
        setProgreso('');
      } else {
        setSugerencias(res.data.sugerencias);
        setProgreso(`✅ Análisis completado. Calificación estimada: ${res.data.calificacionEstimada}/10`);
      }
    } catch (err) {
      console.error('Error:', err);
      const msg = err.response?.data?.detail || err.message || 'Error desconocido';
      
      // Formatear el error de Pydantic para que sea legible
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
    <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
      <button
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
        {analizando ? '⏳ Analizando...' : '🤖 Analizar documento con IA'}
      </button>

      {progreso && !error && (
        <div style={{ marginTop: '12px', color: '#0369a1', fontSize: '14px' }}>
          <p>{progreso}</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '14px', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '6px' }}>
          <p style={{ whiteSpace: 'pre-wrap' }}>❌ {error}</p>
        </div>
      )}

      {sugerencias && (
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '12px' }}>Sugerencias de calificación automática</h3>
          
          {Object.entries(sugerencias).map(([seccionId, seccion]) => (
            <div key={seccionId} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
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
              fontSize: '14px'
            }}
          >
            Aplicar sugerencias a la rúbrica
          </button>
        </div>
      )}
    </div>
  );
}