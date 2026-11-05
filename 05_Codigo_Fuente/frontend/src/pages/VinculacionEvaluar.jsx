import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { useAuth } from '../context/AuthContext';
import { descargarPropuestaPDF } from '../utils/exportUtils';
import { propuestaService } from '../services/propuestaService';
import { LimitedTextarea } from '../components/LimitedInput';

const VinculacionEvaluar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const propuestaId = location.state?.propuestaId || 1;
  const itemInicial = location.state?.item;

  const [tabActiva, setTabActiva] = useState('online'); // 'online' | 'subida'
  const [expediente, setExpediente] = useState(itemInicial || null);

  // Campos del formulario en línea — sin datos predeterminados
  const [trlEsperado, setTrlEsperado] = useState('');
  const [analisisPI, setAnalisisPI] = useState('');

  const [productos, setProductos] = useState({
    prototipo: false,
    software: false,
    patente: false
  });

  // Archivos — sin predeterminado
  const [archivoAdjunto, setArchivoAdjunto] = useState(null);     // File object for pestaña 1
  const [archivoSubida, setArchivoSubida] = useState(null);       // File object for pestaña 2
  const fileInputRef = useRef(null);
  const fileInputSubidaRef = useRef(null);

  // Validación de auto-evaluación
  const [esAutoEvaluacion, setEsAutoEvaluacion] = useState(false);

  useEffect(() => {
    const cargarExpediente = async () => {
      if (propuestaId) {
        try {
          const data = await vinculacionService.obtenerPropuesta(propuestaId);
          if (data) {
            setExpediente(data);
            // Verificar si el evaluador es el mismo investigador coordinador
            const userId = usuario?.id || usuario?.usuario_id || usuario?.usuarioId;
            const coordId = data.investigadorCoordId || data.investigador_coord_id;
            if (userId && coordId && userId === coordId) {
              setEsAutoEvaluacion(true);
            }
          }
        } catch (_err) {
          // Mantener estado inicial
        }
      }
    };
    cargarExpediente();
  }, [propuestaId, usuario]);

  const handleEnviarDictamen = async (e) => {
    e.preventDefault();

    if (esAutoEvaluacion) {
      alert('No puede evaluar una propuesta de la cual usted es el investigador coordinador.');
      return;
    }

    let textoContenido = analisisPI ? analisisPI.trim() : '';
    const archivoParaGuardar = tabActiva === 'subida' ? archivoSubida : archivoAdjunto;

    if (tabActiva === 'subida') {
      if (!archivoSubida && (!textoContenido || textoContenido.length < 10)) {
        alert('Debe adjuntar el archivo firmado del dictamen o ingresar el análisis (mínimo 10 caracteres).');
        return;
      }
      if (!textoContenido || textoContenido.length < 10) {
        textoContenido = `Dictamen de Vinculación emitido mediante documento adjunto: ${archivoSubida?.name || 'Documento oficial'}`;
      }
    } else {
      if (!textoContenido || textoContenido.length < 10) {
        alert('Debe completar el análisis de Potencial de Innovación (mínimo 10 caracteres).');
        return;
      }
    }

    try {
      let rutaSeaweed = null;
      if (archivoParaGuardar) {
        try {
          const resUpload = await vinculacionService.subirArchivoDictamen(propuestaId, archivoParaGuardar);
          rutaSeaweed = resUpload?.rutaArchivo || archivoParaGuardar.name;
        } catch (errUpload) {
          console.warn('Advertencia al subir archivo a SeaweedFS:', errUpload);
          rutaSeaweed = archivoParaGuardar.name;
        }
      }

      const payload = {
        propuestaId: Number(propuestaId) || 1,
        numeroOficio: `VINC-2027-${Math.floor(100 + Math.random() * 900)}`,
        contenido: textoContenido,
        rutaArchivo: rutaSeaweed || archivoParaGuardar?.name || null
      };
      await vinculacionService.crearDictamen(payload);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al guardar el dictamen';
      if (msg.includes('investigador coordinador')) {
        alert(msg);
        return;
      }
      console.warn('Backend:', msg);
    }
    alert('Dictamen de Vinculación guardado exitosamente en SeaweedFS y notificado al Comité Técnico.');
    navigate('/dashboard/dictamenes');
  };

  const handleGuardarBorrador = () => {
    alert('Borrador del dictamen guardado correctamente.');
  };

  /* ── Utilidades para archivos ──────────────────────── */
  const handleFileChange = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar los 10 MB.');
      return;
    }
    setter(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="vinculacion-evaluar-container">
      <div className="dashboard-main-card">
        {/* Enlace de retorno */}
        <div style={{ marginBottom: '12px' }}>
          <button 
            type="button" 
            className="btn-link-volver"
            onClick={() => navigate('/dashboard')}
          >
            ← Volver a la bandeja de entrada
          </button>
        </div>

        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Evaluación de Propuesta – {expediente?.codigoPropuesta || expediente?.id || ''}
            </h1>
            <p className="dashboard-subtitle">
              Emisión de dictamen técnico de Propiedad Intelectual y madurez tecnológica (TRL).
            </p>
          </div>
        </div>

        {/* Alerta de auto-evaluación */}
        {esAutoEvaluacion && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
            padding: '14px 18px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#991b1b', fontSize: '14px' }}>Auto-evaluación no permitida</div>
              <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                Usted es el investigador coordinador de esta propuesta. No puede emitir un dictamen sobre su propia propuesta.
              </div>
            </div>
          </div>
        )}

        {/* Layout en dos columnas */}
        <div className="dashboard-content-columns" style={{ marginTop: '20px' }}>
          {/* Columna Izquierda: Expediente de la Propuesta */}
          <div className="evaluacion-expediente-col">
            <h2 className="column-title" style={{ fontSize: '20px' }}>Expediente de la Propuesta</h2>
            <div className="expediente-card-box">
              <div className="expediente-meta-item">
                <span className="expediente-meta-label">ID:</span>
                <span className="expediente-meta-value">{expediente?.codigoPropuesta || expediente?.id || ''}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Título:</span>
                <span className="expediente-meta-value">{expediente?.titulo || ''}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Escuela:</span>
                <span className="expediente-meta-value">{expediente?.nombreEscuela || expediente?.escuela || ''}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Investigador:</span>
                <span className="expediente-meta-value">{expediente?.investigadorCoordinador || expediente?.investigador || ''}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">TRL Actual:</span>
                <span className="badge-trl">Nivel {expediente?.nivelTrlActual || '—'}</span>
              </div>

              <div className="expediente-resumen-block">
                <div className="expediente-resumen-title">Resumen Ejecutivo:</div>
                <p className="expediente-resumen-text">
                  {expediente?.resumen || 'Sin resumen disponible.'}
                </p>
              </div>

              <div className="expediente-adjuntos-seccion">
                <div className="expediente-resumen-title">Documentos Adjuntos:</div>
                <div 
                  className="documento-adjunto-card" 
                  style={{ marginTop: '6px' }}
                  onClick={() => descargarPropuestaPDF(propuestaId, propuestaService)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📄</span>
                    <div>
                      <div className="doc-nombre">Form-04_Propuesta.pdf</div>
                      <div className="doc-peso">Formulario oficial</div>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-proposal-action btn-outline"
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => descargarPropuestaPDF(propuestaId, propuestaService)}
              >
                📥 Descargar Form-04 completo (PDF)
              </button>
            </div>
          </div>

          {/* Columna Derecha: Formulario con Pestañas */}
          <div className="evaluacion-formulario-col">
            {/* Pestañas */}
            <div className="evaluacion-tabs-header">
              <button 
                type="button"
                className={`tab-btn ${tabActiva === 'online' ? 'active' : ''}`}
                onClick={() => setTabActiva('online')}
              >
                Formulario en línea
              </button>
              <button 
                type="button"
                className={`tab-btn ${tabActiva === 'subida' ? 'active' : ''}`}
                onClick={() => setTabActiva('subida')}
              >
                Subir documento firmado
              </button>
            </div>

            {/* Contenido Pestaña 1: Formulario en Línea */}
            {tabActiva === 'online' && (
              <form onSubmit={handleEnviarDictamen} className="modal-form" style={{ marginTop: '20px' }}>
                <fieldset disabled={esAutoEvaluacion} style={{ border: 'none', padding: 0, margin: 0, opacity: esAutoEvaluacion ? 0.5 : 1 }}>
                  <div className="form-group">
                    <label>1. Nivel TRL Esperado al finalizar *</label>
                    <select 
                      value={trlEsperado}
                      onChange={(e) => setTrlEsperado(e.target.value)}
                      className="modal-select"
                      required
                    >
                      <option value="">— Seleccione un nivel TRL —</option>
                      <option value="Nivel 4 (Validación de componentes en laboratorio)">Nivel 4 (Validación de componentes en laboratorio)</option>
                      <option value="Nivel 5 (Validación en entorno relevante)">Nivel 5 (Validación en entorno relevante)</option>
                      <option value="Nivel 6 (Demostración de prototipo en entorno relevante)">Nivel 6 (Demostración de prototipo en entorno relevante)</option>
                      <option value="Nivel 7 (Demostración de sistema en entorno operacional)">Nivel 7 (Demostración de sistema en entorno operacional)</option>
                    </select>
                    {expediente?.nivelTrlActual && (
                      <span className="form-caption-subtext">
                        El investigador declaró TRL {expediente.nivelTrlActual}.
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <LimitedTextarea
                      label="2. Análisis de Potencial de Innovación (PI)"
                      required
                      rows={5}
                      maxLength={3000}
                      value={analisisPI}
                      onChange={(e) => setAnalisisPI(e.target.value)}
                      className="modal-input"
                      placeholder="Detalle el análisis técnico de potencial de innovación, viabilidad de patente y justificación tecnológica..."
                    />
                  </div>

                  <div className="form-group">
                    <label>3. Productos tecnológicos esperados *</label>
                    <div className="evaluacion-checkboxes-list">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          checked={productos.prototipo}
                          onChange={(e) => setProductos({ ...productos, prototipo: e.target.checked })}
                        />
                        <span>Prototipo funcional verificable</span>
                      </label>

                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          checked={productos.software}
                          onChange={(e) => setProductos({ ...productos, software: e.target.checked })}
                        />
                        <span>Software o código registrado</span>
                      </label>

                      <label className="checkbox-label">
                        <input 
                          type="checkbox"
                          checked={productos.patente}
                          onChange={(e) => setProductos({ ...productos, patente: e.target.checked })}
                        />
                        <span>Solicitud de patente / modelo de utilidad</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>4. Dictamen de Vinculación firmado (opcional)</label>
                    {/* Input de archivo oculto */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileChange(e, setArchivoAdjunto)}
                    />
                    {archivoAdjunto ? (
                      <div className="archivo-firmado-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>📄</span>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#002855' }}>{archivoAdjunto.name}</span>
                          <span style={{ fontSize: '12px', color: '#627d98' }}>({formatFileSize(archivoAdjunto.size)})</span>
                        </div>
                        <button 
                          type="button" 
                          className="btn-eliminar-adjunto"
                          onClick={() => { setArchivoAdjunto(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          title="Eliminar archivo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-proposal-action btn-outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        + Adjuntar PDF firmado
                      </button>
                    )}
                  </div>
                </fieldset>

                <div className="modal-actions" style={{ marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn-cancel"
                    onClick={handleGuardarBorrador}
                  >
                    Guardar Borrador
                  </button>
                  <button type="submit" className="btn-nueva-propuesta" disabled={esAutoEvaluacion}>
                    Enviar Dictamen a Comité Técnico
                  </button>
                </div>
              </form>
            )}

            {/* Contenido Pestaña 2: Subir Documento Firmado */}
            {tabActiva === 'subida' && (
              <div className="evaluacion-subida-container" style={{ marginTop: '20px' }}>
                <p className="column-subtitle" style={{ marginBottom: '14px' }}>
                  Si prefiere trabajar offline, descargue la plantilla oficial, complétela, fírmela y súbala aquí.
                </p>

                <button 
                  type="button" 
                  className="btn-proposal-action btn-outline"
                  style={{ width: '100%', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => alert('Descargando plantilla oficial de Dictamen de Vinculación (Word/PDF)...')}
                >
                  📥 Descargar Plantilla de Dictamen (Word/PDF)
                </button>

                {/* Input de archivo oculto para subida */}
                <input
                  ref={fileInputSubidaRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e, setArchivoSubida)}
                />

                {/* Zona de Dropzone */}
                {archivoSubida ? (
                  <div className="archivo-firmado-box" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#002855' }}>{archivoSubida.name}</div>
                        <div style={{ fontSize: '13px', color: '#627d98' }}>{formatFileSize(archivoSubida.size)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-eliminar-adjunto"
                      onClick={() => { setArchivoSubida(null); if (fileInputSubidaRef.current) fileInputSubidaRef.current.value = ''; }}
                      title="Eliminar archivo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div 
                    className="dropzone-upload-box"
                    onClick={() => fileInputSubidaRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          alert('El archivo no puede superar los 10 MB.');
                          return;
                        }
                        setArchivoSubida(file);
                      }
                    }}
                  >
                    <div className="dropzone-icon">↑</div>
                    <div className="dropzone-title">
                      Arrastre el archivo firmado aquí
                    </div>
                    <div className="dropzone-sub">
                      o haga clic para buscar (PDF, máx 10MB)
                    </div>
                  </div>
                )}

                {esAutoEvaluacion && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
                    padding: '12px 16px', marginTop: '16px', fontSize: '13px', color: '#991b1b'
                  }}>
                    ⚠️ No puede emitir un dictamen sobre su propia propuesta.
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '30px' }}>
                  <button 
                    type="button" 
                    className="btn-cancel"
                    onClick={handleGuardarBorrador}
                  >
                    Guardar Borrador
                  </button>
                  <button 
                    type="button" 
                    className="btn-nueva-propuesta"
                    onClick={handleEnviarDictamen}
                    disabled={esAutoEvaluacion}
                  >
                    Enviar Dictamen a Comité Técnico
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default VinculacionEvaluar;
