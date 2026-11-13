import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { descargarPropuestaPDF } from '../utils/exportUtils';
import { propuestaService } from '../services/propuestaService';

const VinculacionDetalleDictamen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const propuestaId = location.state?.propuestaId || 1;
  const itemInicial = location.state?.item;

  const [expediente, setExpediente] = useState(itemInicial || null);
  const [dictamen, setDictamen] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      if (propuestaId) {
        try {
          const propData = await vinculacionService.obtenerPropuesta(propuestaId);
          if (propData) setExpediente(propData);
        } catch (_e) {}

        try {
          const dictData = await vinculacionService.obtenerDictamen(propuestaId);
          if (dictData) setDictamen(dictData);
        } catch (_e) {}
      }
    };
    cargarDatos();
  }, [propuestaId]);

  return (
    <div className="vinculacion-detalle-dictamen-container">
      <div className="dashboard-main-card">
        {/* Cabecera y botón de retorno */}
        <div style={{ marginBottom: '12px' }}>
          <button 
            type="button" 
            className="btn-link-volver"
            aria-label="Volver al listado de dictámenes emitidos"
            onClick={() => navigate('/dashboard/dictamenes')}
          >
            ← Volver a dictámenes emitidos
          </button>
        </div>

        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Detalle del Dictamen - {dictamen?.numeroOficio || expediente?.codigoPropuesta || 'FVIE-2027-004'}
            </h1>
            <p className="dashboard-subtitle">
              {expediente?.titulo || 'Energía solar para comunidades rurales'} - {expediente?.investigadorCoordinador || 'Dr. Pedro Sánchez'}
            </p>
          </div>
        </div>

        {/* Dos Columnas */}
        <div className="dashboard-content-columns" style={{ marginTop: '24px' }}>
          {/* Columna Izquierda: Expediente de la Propuesta */}
          <div className="detalle-expediente-col">
            <h2 className="column-title" style={{ fontSize: '20px' }}>Expediente de la Propuesta</h2>
            <div className="expediente-card-box">
              <div className="expediente-meta-item">
                <span className="expediente-meta-label">ID:</span>
                <span className="expediente-meta-value">{expediente?.codigoPropuesta || expediente?.id || 'FVIE-2027-004'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Título:</span>
                <span className="expediente-meta-value">{expediente?.titulo || 'Energía solar para comunidades rurales'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Investigador:</span>
                <span className="expediente-meta-value">{expediente?.investigadorCoordinador || expediente?.investigador || 'Dr. Pedro Sánchez'} | {expediente?.nombreEscuela || 'Escuela de Ingeniería Electrónica'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">TRL Actual:</span>
                <span className="badge-trl">Nivel {expediente?.nivelTrlActual || 3}</span>
              </div>

              <div className="expediente-resumen-block">
                <div className="expediente-resumen-title">Resumen:</div>
                <p className="expediente-resumen-text">
                  {expediente?.resumen || 'Este proyecto propone el diseño e implementación de un sistema de energía solar fotovoltaica para electrificar comunidades rurales aisladas en la zona sur de Costa Rica. Se instalarán paneles solares con sistemas de almacenamiento en baterías de litio para garantizar suministro eléctrico continuo.'}
                </p>
              </div>

              <button 
                type="button" 
                className="btn-proposal-action btn-outline"
                aria-label="Descargar Form-04 completo en formato PDF"
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => descargarPropuestaPDF(propuestaId, propuestaService)}
              >
                📥 Descargar Form-04 completo (PDF)
              </button>
            </div>
          </div>

          {/* Columna Derecha: Dictamen Emitido */}
          <div className="detalle-dictamen-col">
            <h2 className="column-title" style={{ fontSize: '20px' }}>Dictamen de Vinculación Emitido</h2>

            <div className="dictamen-emitido-box">
              {/* Banner Recomendado */}
              <div className="banner-dictamen-recomendado">
                ✓ RECOMENDADO
              </div>

              {/* TRL Evaluado */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">TRL Evaluado</h3>
                <div className="dictamen-item-val" style={{ fontWeight: 600 }}>
                  Nivel 3 → Nivel 6 (Demostración de prototipo en entorno relevante)
                </div>
                <div className="dictamen-item-sub">
                  Avance de 3 niveles según Regla 2.4.1
                </div>
              </div>

              {/* Análisis de PI */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Análisis de Propiedad Intelectual</h3>
                <p className="dictamen-item-parrafo">
                  {dictamen?.contenido || 'La propuesta presenta alta viabilidad técnica. El uso de protocolos y arquitecturas modulares es apropiado para el alcance institucional. No se identificaron restricciones de patentes. Se recomienda registrar el diseño del sistema como propiedad intelectual del TEC.'}
                </p>
              </div>

              {/* Productos Esperados */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Productos Esperados</h3>
                <div className="dictamen-checklist">
                  <div className="checklist-item">✓ Prototipo funcional</div>
                  <div className="checklist-item">✓ Software registrado</div>
                </div>
              </div>

              {/* Documento del Dictamen */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Documento del Dictamen</h3>
                <div 
                  className="documento-adjunto-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Descargar archivo de dictamen: ${dictamen?.rutaArchivo || 'Dictamen_Vinculacion.pdf'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (dictamen?.rutaArchivo) { alert(`El archivo '${dictamen.rutaArchivo}' se descargará del servidor.`); } else { alert('No hay archivo de dictamen adjunto.'); }
                    }
                  }}
                  onClick={() => { if (dictamen?.rutaArchivo) { alert(`El archivo '${dictamen.rutaArchivo}' se descargar\xe1 del servidor. Funcionalidad de almacenamiento de archivos pendiente.`); } else { alert('No hay archivo de dictamen adjunto.'); } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }} aria-hidden="true">📄</span>
                    <div>
                      <div className="doc-nombre">{dictamen?.rutaArchivo || 'Dictamen_Vinculacion_FVIE-2027-004_RobertaSanchez.pdf'}</div>
                      <div className="doc-peso">2.4 MB · Documento oficial firmado</div>
                    </div>
                  </div>
                  <span className="doc-download-icon" aria-hidden="true">📥</span>
                </div>
              </div>

              <div className="perfil-divider" />

              {/* Evaluado por */}
              <div className="dictamen-firma-footer">
                <div className="firma-evaluador">
                  Evaluado por: <strong>{dictamen?.nombreRemitente || 'Lic. Roberta Sánchez | Centro de Vinculación TEC'}</strong>
                </div>
                <div className="firma-fecha">
                  Fecha: {dictamen?.fechaEmision ? new Date(dictamen.fechaEmision).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' }) : '21 de agosto de 2027'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default VinculacionDetalleDictamen;
