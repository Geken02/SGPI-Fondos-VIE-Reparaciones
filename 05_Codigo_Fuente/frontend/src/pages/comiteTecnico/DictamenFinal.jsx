// src/pages/comiteTecnico/DictamenFinal.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';

const Icon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Cargando consolidación de evaluaciones...</p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2 style={{color: '#ef4444'}}>No se pudo cargar la consolidación</h2>
          <button onClick={() => navigate('/comite-tecnico/propuestas-asignadas')} style={styles.btnBack}>
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
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <Icon path={ICONS.flecha} size={16} />
          <span>Volver</span>
        </button>
        <div style={styles.headerContent}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap'}}>
            <h1 style={styles.title}>Dictamen Final: {datos.codigoPropuesta}</h1>
            <span style={{
              ...styles.badge,
              backgroundColor: esRecomendable ? '#d1fae5' : '#fee2e2',
              color: esRecomendable ? '#065f46' : '#991b1b'
            }}>
              {esRecomendable ? 'Recomendable' : 'No Recomendable'}
            </span>
          </div>
          <p style={styles.subtitle}>{datos.titulo}</p>
        </div>
      </div>

      {/* RESUMEN DE EVALUACIONES */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          <Icon path={ICONS.documento} size={20} color="#002855" />
          Consolidación de Evaluaciones
        </h2>

        {/* Tarjetas de resumen */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryValue}>{datos.totalEvaluadores || 0}</div>
            <div style={styles.summaryLabel}>Evaluadores</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{
              ...styles.summaryValue,
              color: calificacionFinal >= 0.70 ? '#10b981' : '#ef4444'
            }}>
              {calificacionPorcentaje}%
            </div>
            <div style={styles.summaryLabel}>Calificación Final</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{
              ...styles.summaryValue,
              fontSize: '18px',
              color: esRecomendable ? '#10b981' : '#ef4444'
            }}>
              {esRecomendable ? '≥ 70%' : '< 70%'}
            </div>
            <div style={styles.summaryLabel}>Umbral de aprobación</div>
          </div>
        </div>

        {/* Tabla de evaluadores */}
        {datos.evaluaciones && datos.evaluaciones.length > 0 && (
          <div style={{marginTop: '24px'}}>
            <h3 style={styles.subTitle}>Evaluaciones individuales</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Evaluador</th>
                  <th style={{...styles.th, textAlign: 'center'}}>Calificación</th>
                  <th style={styles.th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {datos.evaluaciones.map((ev, idx) => (
                  <tr key={idx}>
                    <td style={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <div style={styles.avatarIcon}>
                          <Icon path={ICONS.usuario} size={14} />
                        </div>
                        {ev.evaluador}
                      </div>
                    </td>
                    <td style={{...styles.td, textAlign: 'center'}}>
                      <span style={{
                        ...styles.calificacionBadge,
                        backgroundColor: ev.calificacion >= 0.70 ? '#d1fae5' : '#fee2e2',
                        color: ev.calificacion >= 0.70 ? '#065f46' : '#991b1b'
                      }}>
                        {(ev.calificacion * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={styles.td}>
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
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          <Icon path={ICONS.documento} size={20} color="#002855" />
          Emitir Dictamen del Comité Técnico
        </h2>

        {/* Selección de recomendación */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Recomendación del Comité Técnico <span style={{color: '#ef4444'}}>*</span>
          </label>
          <div style={styles.radioGroup}>
            <button
              type="button"
              onClick={() => setRecomendacion('RECOMIENDA')}
              style={{
                ...styles.radioBtn,
                ...(recomendacion === 'RECOMIENDA' ? styles.radioBtnActiveGreen : {})
              }}
            >
              <Icon path={ICONS.check} size={20} color={recomendacion === 'RECOMIENDA' ? 'white' : '#10b981'} />
              <span>RECOMIENDA</span>
            </button>
            <button
              type="button"
              onClick={() => setRecomendacion('NO RECOMIENDA')}
              style={{
                ...styles.radioBtn,
                ...(recomendacion === 'NO RECOMIENDA' ? styles.radioBtnActiveRed : {})
              }}
            >
              <Icon path={ICONS.x} size={20} color={recomendacion === 'NO RECOMIENDA' ? 'white' : '#ef4444'} />
              <span>NO RECOMIENDA</span>
            </button>
          </div>
          <div style={styles.helperText}>
            <Icon path={ICONS.info} size={14} color="#64748b" />
            <span>La calificación mínima para recomendar es 70% (0.70). Calificación actual: {calificacionPorcentaje}%</span>
          </div>
        </div>

        {/* Contenido del dictamen */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Contenido del Dictamen <span style={{color: '#ef4444'}}>*</span>
          </label>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Redacte el dictamen final del Comité Técnico, incluyendo los fundamentos de la decisión, aspectos destacados de la propuesta y recomendaciones..."
            style={styles.textarea}
            rows={8}
          />
          <div style={styles.charCount}>{contenido.length} caracteres</div>
        </div>

        {/* Observaciones adicionales */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Observaciones adicionales (opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones adicionales para el CIE..."
            style={styles.textarea}
            rows={4}
          />
        </div>

        {/* Botones de acción */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate('/comite-tecnico/propuestas-asignadas')}
            style={styles.btnCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEmitirDictamen}
            disabled={enviando || !contenido.trim() || !recomendacion}
            style={{
              ...styles.btnSubmit,
              opacity: (enviando || !contenido.trim() || !recomendacion) ? 0.5 : 1,
              cursor: (enviando || !contenido.trim() || !recomendacion) ? 'not-allowed' : 'pointer'
            }}
          >
            {enviando ? 'Emitiendo...' : 'Emitir Dictamen'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
  header: { marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', color: '#002855', cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: '8px 14px', borderRadius: '6px' },
  headerContent: { flex: 1 },
  title: { fontSize: '22px', color: '#0f172a', margin: '0', fontWeight: '600' },
  badge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  subtitle: { color: '#64748b', margin: '6px 0 0 0', fontSize: '14px', lineHeight: '1.5' },
  card: { backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', marginBottom: '24px' },
  cardTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', color: '#002855', margin: '0 0 20px 0', fontWeight: '600', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  summaryCard: { padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' },
  summaryValue: { fontSize: '32px', fontWeight: '700', color: '#002855', marginBottom: '4px' },
  summaryLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' },
  subTitle: { fontSize: '14px', color: '#0f172a', fontWeight: '600', marginBottom: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: '700' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#334155' },
  avatarIcon: { width: '28px', height: '28px', backgroundColor: '#e6f0ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#002855' },
  calificacionBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '8px' },
  radioGroup: { display: 'flex', gap: '12px', marginBottom: '8px' },
  radioBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#475569', transition: 'all 0.2s' },
  radioBtnActiveGreen: { backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' },
  radioBtnActiveRed: { backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' },
  helperText: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginTop: '8px' },
  textarea: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'white', boxSizing: 'border-box' },
  charCount: { fontSize: '12px', color: '#64748b', textAlign: 'right', marginTop: '4px' },
  actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' },
  btnCancel: { padding: '10px 20px', backgroundColor: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' },
  btnSubmit: { padding: '10px 24px', backgroundColor: '#002855', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', transition: 'opacity 0.2s' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748b' },
  spinner: { border: '3px solid #f3f4f6', borderTop: '3px solid #002855', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 0.8s linear infinite', marginBottom: '16px' },
  error: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  btnBack: { marginTop: '16px', padding: '10px 20px', backgroundColor: '#002855', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}