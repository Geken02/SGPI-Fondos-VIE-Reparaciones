import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { descargarPropuestaPDF } from '../utils/exportUtils';
import { propuestaService } from '../services/propuestaService';
import IconoCie from '../components/cie/IconoCie';

const VinculacionDetalleDictamen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const propuestaId = location.state?.propuestaId || location.state?.item?.propuestaId || new URLSearchParams(location.search).get('propuestaId');
  const itemInicial = location.state?.item;

  const [expediente, setExpediente] = useState(itemInicial || null);
  const [dictamen, setDictamen] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!propuestaId) {
        setCargando(false);
        return;
      }
      try {
        setCargando(true);
        const [propData, dictData] = await Promise.all([
          vinculacionService.obtenerPropuesta(propuestaId).catch(() => null),
          vinculacionService.obtenerDictamen(propuestaId).catch(() => null)
        ]);
        if (propData) setExpediente(propData);
        if (dictData) setDictamen(dictData);
      } catch (_e) {
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [propuestaId]);

  if (!propuestaId && !expediente) {
    return (
      <div className="vinculacion-detalle-dictamen-container">
        <div className="dashboard-main-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>No se ha seleccionado ninguna propuesta</h2>
          <p style={{ color: '#627d98', margin: '16px 0' }}>
            Seleccione una propuesta evaluada desde la bandeja de dictámenes para ver sus detalles.
          </p>
          <button 
            type="button" 
            className="btn-nueva-propuesta"
            onClick={() => navigate('/dashboard/dictamenes')}
          >
            ← Ir a dictámenes emitidos
          </button>
        </div>
      </div>
    );
  }

  const nombreArchivoDoc = dictamen?.rutaArchivo ? dictamen.rutaArchivo.split('/').pop() : null;

  const handleDescargarDocumentoDictamen = () => {
    if (!dictamen?.rutaArchivo) {
      alert('Esta evaluación fue completada mediante el formulario en línea sin documento externo adjunto.');
      return;
    }
    const url = dictamen.rutaArchivo.startsWith('http') 
      ? dictamen.rutaArchivo 
      : `/api/propuestas/${propuestaId}/archivos/${encodeURIComponent(nombreArchivoDoc)}`;
    window.open(url, '_blank');
  };

  const tieneDeclaraciones = expediente?.poseeInnovacion || expediente?.tienePotencialPI || expediente?.requiereInstrumentoJuridico || expediente?.tieneInformacionConfidencial;

  return (
    <div className="vinculacion-detalle-dictamen-container">
      <div className="dashboard-main-card">
        {/* Cabecera y botón de retorno */}
        <div style={{ marginBottom: '12px' }}>
          <button 
            type="button" 
            className="btn-link-volver"
            onClick={() => navigate('/dashboard/dictamenes')}
          >
            ← Volver a dictámenes emitidos
          </button>
        </div>

        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Detalle del Dictamen — {dictamen?.numeroOficio || expediente?.codigoPropuesta || `Propuesta #${propuestaId}`}
            </h1>
            <p className="dashboard-subtitle">
              {expediente?.titulo || 'Cargando expediente...'} {expediente?.investigadorCoordinador ? `— ${expediente.investigadorCoordinador}` : ''}
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
                <span className="expediente-meta-value">{expediente?.codigoPropuesta || expediente?.id || (propuestaId ? `Propuesta #${propuestaId}` : '—')}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Título:</span>
                <span className="expediente-meta-value">{expediente?.titulo || '—'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Investigador:</span>
                <span className="expediente-meta-value">
                  {expediente?.investigadorCoordinador || expediente?.investigador || 'No asignado'}
                  {expediente?.nombreEscuela ? ` | ${expediente.nombreEscuela}` : ''}
                </span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">TRL Declarado:</span>
                <span className="badge-trl">Nivel {expediente?.nivelTrlActual || '—'}</span>
              </div>

              {expediente?.lineaInvestigacion && (
                <div className="expediente-meta-item">
                  <span className="expediente-meta-label">Línea de Inv.:</span>
                  <span className="expediente-meta-value">{expediente.lineaInvestigacion}</span>
                </div>
              )}

              <div className="expediente-resumen-block">
                <div className="expediente-resumen-title">Resumen:</div>
                <p className="expediente-resumen-text">
                  {expediente?.resumen || 'Sin resumen registrado en el formulario institucional.'}
                </p>
              </div>

              <button 
                type="button" 
                className="btn-proposal-action btn-outline"
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => descargarPropuestaPDF(propuestaId, propuestaService)}
              >
                <IconoCie nombre="download" tamano={16} />Descargar Form-04 completo (PDF)
              </button>
            </div>
          </div>

          {/* Columna Derecha: Dictamen Emitido */}
          <div className="detalle-dictamen-col">
            <h2 className="column-title" style={{ fontSize: '20px' }}>Dictamen de Vinculación Emitido</h2>

            <div className="dictamen-emitido-box">
              {/* Banner */}
              <div className="banner-dictamen-recomendado">
                <IconoCie nombre="checkCircle" tamano={16} />DICTAMEN DE VINCULACIÓN EMITIDO
              </div>

              {/* TRL Evaluado */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Madurez Tecnológica (TRL)</h3>
                <div className="dictamen-item-val" style={{ fontWeight: 600 }}>
                  Nivel {expediente?.nivelTrlActual || '—'} → Nivel {expediente?.nivelTrlEsperado || '—'}
                </div>
                <div className="dictamen-item-sub">
                  {expediente?.nivelTrlActual && expediente?.nivelTrlEsperado
                    ? `Avance proyectado de ${expediente.nivelTrlEsperado - expediente.nivelTrlActual} niveles`
                    : 'Evaluación de madurez tecnológica registrada en el expediente'}
                </div>
              </div>

              {/* Análisis de PI */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Análisis de Propiedad Intelectual</h3>
                <p className="dictamen-item-parrafo">
                  {dictamen?.contenido || 'Sin observaciones de análisis adicionales registradas.'}
                </p>
              </div>

              {/* Declaraciones de Innovación y PI */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Componentes y Declaraciones Técnicas</h3>
                <div className="dictamen-checklist">
                  {expediente?.poseeInnovacion && (
                    <div className="checklist-item"><IconoCie nombre="check" tamano={14} />Componente de innovación: {expediente.tipoInnovacion || 'Declarada'}</div>
                  )}
                  {expediente?.tienePotencialPI && (
                    <div className="checklist-item"><IconoCie nombre="check" tamano={14} />Potencial de Propiedad Intelectual identificado</div>
                  )}
                  {expediente?.requiereInstrumentoJuridico && (
                    <div className="checklist-item"><IconoCie nombre="check" tamano={14} />Requiere instrumento jurídico o convenio</div>
                  )}
                  {expediente?.tieneInformacionConfidencial && (
                    <div className="checklist-item"><IconoCie nombre="check" tamano={14} />Contiene información confidencial</div>
                  )}
                  {!tieneDeclaraciones && (
                    <div className="checklist-item checklist-item-empty">
                      No se registraron declaraciones adicionales de PI o innovación para esta propuesta.
                    </div>
                  )}
                </div>
              </div>

              {/* Documento del Dictamen */}
              <div className="dictamen-seccion-item">
                <h3 className="dictamen-item-title">Documento Oficial del Dictamen</h3>
                {nombreArchivoDoc ? (
                  <div 
                    className="documento-adjunto-card"
                    onClick={handleDescargarDocumentoDictamen}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconoCie nombre="fileText" tamano={20} />
                      <div>
                        <div className="doc-nombre">{nombreArchivoDoc}</div>
                        <div className="doc-peso">Documento oficial adjuntado al dictamen</div>
                      </div>
                    </div>
                    <span className="doc-download-icon"><IconoCie nombre="download" tamano={20} /></span>
                  </div>
                ) : (
                  <div className="documento-adjunto-card doc-electronico-card" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconoCie nombre="edit" tamano={20} />
                      <div>
                        <div className="doc-nombre">Dictamen registrado electrónicamente</div>
                        <div className="doc-peso">Emitido mediante el formulario institucional en línea</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="perfil-divider" />

              {/* Evaluado por */}
              <div className="dictamen-firma-footer">
                <div className="firma-evaluador">
                  Evaluado por: <strong>{dictamen?.nombreRemitente || 'Evaluador de Vinculación TEC'}</strong>
                </div>
                <div className="firma-fecha">
                  Fecha: {dictamen?.fechaEmision ? new Date(dictamen.fechaEmision).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
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
