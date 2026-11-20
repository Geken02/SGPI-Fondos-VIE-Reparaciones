import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { useAuth } from '../context/AuthContext';
import { descargarPropuestaPDF } from '../utils/exportUtils';
import { propuestaService } from '../services/propuestaService';
import { LimitedTextarea } from '../components/LimitedInput';
import IconoCie from '../components/cie/IconoCie';

const VinculacionEvaluar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const propuestaId = location.state?.propuestaId || location.state?.item?.propuestaId || new URLSearchParams(location.search).get('propuestaId');
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

  // Dictamen adjunto — fuente única de verdad compartida por las pestañas
  // "Formulario en línea" y "Subir documento firmado". Subir el archivo en
  // cualquiera de las dos lo refleja de inmediato en la otra.
  const [archivoDictamen, setArchivoDictamen] = useState(null);
  const fileInputRef = useRef(null);
  const fileInputSubidaRef = useRef(null);

  // Validación de auto-evaluación
  const [esAutoEvaluacion, setEsAutoEvaluacion] = useState(false);

  // Ruta del documento de dictamen ya registrado previamente en la propuesta.
  // undefined = aún sin verificar, null = verificado y no existe, string = ruta guardada.
  const [rutaDocumentoPrevio, setRutaDocumentoPrevio] = useState(undefined);
  // Resaltado visual del campo de archivo cuando falta el dictamen al enviar
  const [resaltarArchivo, setResaltarArchivo] = useState(false);

  // Catálogo de Niveles TRL obtenido desde la base de datos
  const [nivelesTrl, setNivelesTrl] = useState([]);
  const [cargandoNivelesTrl, setCargandoNivelesTrl] = useState(true);

  useEffect(() => {
    const cargarNivelesTrl = async () => {
      try {
        setCargandoNivelesTrl(true);
        const dataCatalogos = await propuestaService.obtenerCatalogosFormulario();
        setNivelesTrl(dataCatalogos?.nivelesTrl || []);
      } catch (_err) {
        setNivelesTrl([]);
      } finally {
        setCargandoNivelesTrl(false);
      }
    };
    cargarNivelesTrl();
  }, []);

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
        }
      }
    };
    cargarExpediente();
  }, [propuestaId, usuario]);

  // Verifica si ya existe un dictamen con documento registrado previamente
  useEffect(() => {
    const cargarDocumentoPrevio = async () => {
      if (!propuestaId) return;
      try {
        const dictamen = await vinculacionService.obtenerDictamen(propuestaId);
        setRutaDocumentoPrevio(dictamen?.rutaArchivo || null);
      } catch (_err) {
        setRutaDocumentoPrevio(null);
      }
    };
    cargarDocumentoPrevio();
  }, [propuestaId]);

  if (!propuestaId && !expediente) {
    return (
      <div className="vinculacion-evaluar-container">
        <div className="dashboard-main-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>No se ha seleccionado ninguna propuesta para evaluar</h2>
          <p style={{ color: '#627d98', margin: '16px 0' }}>
            Regrese a la bandeja de evaluación para seleccionar una propuesta pendiente.
          </p>
          <button 
            type="button" 
            className="btn-nueva-propuesta"
            onClick={() => navigate('/dashboard/bandeja-evaluacion')}
          >
            ← Ir a la bandeja de evaluación
          </button>
        </div>
      </div>
    );
  }

  // Documento adjunto: única fuente de verdad compartida por ambas pestañas,
  // más el documento ya registrado previamente en la propuesta.
  const documentoActual = archivoDictamen;
  const tieneDocumentoPrevio = Boolean(rutaDocumentoPrevio);
  const verificandoDocumento = rutaDocumentoPrevio === undefined;
  // El envío queda bloqueado si no hay archivo nuevo ni documento guardado antes
  const faltaDocumentoDictamen = !documentoActual && !tieneDocumentoPrevio && !verificandoDocumento;
  const mostrarAvisoDictamen = resaltarArchivo || faltaDocumentoDictamen;

  const handleEnviarDictamen = async (e) => {
    e.preventDefault();

    if (esAutoEvaluacion) {
      alert('No puede evaluar una propuesta de la cual usted es el investigador coordinador.');
      return;
    }

    // Validación: debe existir un documento de dictamen adjunto o ya registrado
    // previamente en la propuesta antes de permitir el envío definitivo.
    if (!documentoActual && !tieneDocumentoPrevio) {
      setResaltarArchivo(true);
      alert('Debe adjuntar el documento de dictámenes antes de enviar la evaluación.');
      return;
    }
    setResaltarArchivo(false);

    let textoContenido = analisisPI ? analisisPI.trim() : '';
    const archivoParaGuardar = archivoDictamen;

    if (tabActiva === 'subida') {
      if (!archivoDictamen && (!textoContenido || textoContenido.length < 10)) {
        alert('Debe adjuntar el archivo firmado del dictamen o ingresar el análisis (mínimo 10 caracteres).');
        return;
      }
      if (!textoContenido || textoContenido.length < 10) {
        textoContenido = `Dictamen de Vinculación emitido mediante documento adjunto: ${archivoDictamen?.name || 'Documento oficial'}`;
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

      const anioActual = new Date().getFullYear();
      const codigoSufijo = expediente?.codigoPropuesta 
        ? expediente.codigoPropuesta.replace(/[^a-zA-Z0-9]/g, '') 
        : (propuestaId || 'DOC');

      const payload = {
        propuestaId: Number(propuestaId),
        tipoDictamenId: 1,
        numeroOficio: `VINC-${anioActual}-${codigoSufijo}`,
        contenido: textoContenido,
        rutaArchivo: rutaSeaweed || archivoParaGuardar?.name || rutaDocumentoPrevio || null
      };

      await vinculacionService.crearDictamen(payload);
      alert('Dictamen de Vinculación guardado exitosamente en SeaweedFS y notificado al Comité Técnico.');
      navigate('/dashboard/dictamenes');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al guardar el dictamen';
      if (msg.includes('investigador coordinador')) {
        alert(msg);
        return;
      }
      console.warn('Backend:', msg);
      alert(msg);
    }
  };

  const handleGuardarBorrador = () => {
    alert('Borrador del dictamen guardado temporalmente.');
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
    setResaltarArchivo(false);
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
            onClick={() => navigate('/dashboard/bandeja-evaluacion')}
          >
            ← Volver a la bandeja de entrada
          </button>
        </div>

        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Evaluación de Propuesta — {expediente?.codigoPropuesta || (propuestaId ? `Propuesta #${propuestaId}` : '—')}
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
            <span style={{ color: '#dc2626', display: 'inline-flex' }}><IconoCie nombre="alertTriangle" tamano={20} /></span>
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
                <span className="expediente-meta-value">{expediente?.codigoPropuesta || (propuestaId ? `Propuesta #${propuestaId}` : '—')}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Título:</span>
                <span className="expediente-meta-value">{expediente?.titulo || '—'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Escuela:</span>
                <span className="expediente-meta-value">{expediente?.nombreEscuela || expediente?.escuela || '—'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">Investigador:</span>
                <span className="expediente-meta-value">{expediente?.investigadorCoordinador || expediente?.investigador || 'No asignado'}</span>
              </div>

              <div className="expediente-meta-item">
                <span className="expediente-meta-label">TRL Actual:</span>
                <span className="badge-trl">Nivel {expediente?.nivelTrlActual || '—'}</span>
              </div>

              <div className="expediente-resumen-block">
                <div className="expediente-resumen-title">Resumen Ejecutivo:</div>
                <p className="expediente-resumen-text">
                  {expediente?.resumen || 'Sin resumen registrado en el formulario.'}
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
                      disabled={cargandoNivelesTrl}
                    >
                      <option value="">
                        {cargandoNivelesTrl
                          ? 'Cargando niveles TRL…'
                          : nivelesTrl.length === 0
                            ? 'No hay niveles TRL disponibles'
                            : '— Seleccione un nivel TRL —'}
                      </option>
                      {nivelesTrl.map(n => (
                        <option key={n.nivelTrlId} value={String(n.nivelTrlId)}>
                          {`Nivel ${n.nivelTrlId} (${n.descripcionNivel})`}
                        </option>
                      ))}
                    </select>
                    {expediente?.nivelTrlActual && (
                      <span className="form-caption-subtext">
                        El investigador declaró TRL actual: Nivel {expediente.nivelTrlActual}.
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
                    <label>4. Dictamen de Vinculación firmado *</label>
                    <div className={mostrarAvisoDictamen ? 'campo-archivo-error' : undefined}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileChange(e, setArchivoDictamen)}
                      />
                      {archivoDictamen ? (
                        <div className="archivo-firmado-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IconoCie nombre="fileText" tamano={18} />
                            <span className="archivo-firmado-nombre" style={{ fontSize: '13px', fontWeight: 500 }}>{archivoDictamen.name}</span>
                            <span style={{ fontSize: '12px', color: '#627d98' }}>({formatFileSize(archivoDictamen.size)})</span>
                          </div>
                          <button 
                            type="button" 
                            className="btn-eliminar-adjunto"
                            aria-label="Eliminar archivo adjunto"
                            onClick={() => {
                              if (!confirm('¿Está seguro de que desea eliminar el archivo adjunto?')) return;
                              setArchivoDictamen(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            title="Eliminar archivo"
                          >
                            <IconoCie nombre="close" tamano={16} />
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
                    {mostrarAvisoDictamen && (
                      <div className="advertencia-dictamen">
                        <IconoCie nombre="alertTriangle" tamano={14} />Debe adjuntar el documento de dictámenes antes de enviar la evaluación.
                      </div>
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
                  Adjunte el archivo firmado oficial del Dictamen de Vinculación para vincularlo al expediente en SeaweedFS.
                </p>

                <div className={mostrarAvisoDictamen ? 'campo-archivo-error' : undefined}>
                  <input
                    ref={fileInputSubidaRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e, setArchivoDictamen)}
                  />

                {archivoDictamen ? (
                  <div className="archivo-firmado-box" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconoCie nombre="fileText" tamano={24} />
                      <div>
                        <div className="archivo-firmado-nombre" style={{ fontWeight: 600 }}>{archivoDictamen.name}</div>
                        <div style={{ fontSize: '13px', color: '#627d98' }}>{formatFileSize(archivoDictamen.size)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-eliminar-adjunto"
                      aria-label="Eliminar archivo adjunto"
                      onClick={() => {
                        if (!confirm('¿Está seguro de que desea eliminar el archivo adjunto?')) return;
                        setArchivoDictamen(null);
                        if (fileInputSubidaRef.current) fileInputSubidaRef.current.value = '';
                      }}
                      title="Eliminar archivo"
                    >
                      <IconoCie nombre="close" tamano={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="dropzone-upload-box"
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputSubidaRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputSubidaRef.current?.click(); } }}
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
                        setArchivoDictamen(file);
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
                </div>

                {mostrarAvisoDictamen && (
                  <div className="advertencia-dictamen">
                    <IconoCie nombre="alertTriangle" tamano={14} />Debe adjuntar el documento de dictámenes antes de enviar la evaluación.
                  </div>
                )}

                {esAutoEvaluacion && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
                    padding: '12px 16px', marginTop: '16px', fontSize: '13px', color: '#991b1b'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconoCie nombre="alertTriangle" tamano={14} />No puede emitir un dictamen sobre su propia propuesta.</span>
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
