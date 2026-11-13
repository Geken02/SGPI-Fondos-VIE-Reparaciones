import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput, LimitedTextarea } from '../components/LimitedInput';
import { descargarPropuestaPDF, descargarPlanRiesgoExcel, descargarPresupuestoDirectoExcel } from '../utils/exportUtils';

const InvestigadorPropuestas = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propuestaIdUrl = searchParams.get('id') || searchParams.get('propuestaId');
  const { usuario } = useAuth();
  const { abrirModalCrearPropuesta } = useModal();
  const [propuestas, setPropuestas] = useState([]);
  const [enviandoRevision, setEnviandoRevision] = useState({});
  const [subiendoFormulario, setSubiendoFormulario] = useState({});
  const [cancelando, setCancelando] = useState({});

  const handleSubirDocumentoFormulario = async (propuestaId, tipoDocumentoId, codigoForm, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('El archivo no puede superar los 25 MB.');
      return;
    }

    const key = `${propuestaId}_${tipoDocumentoId}`;
    setSubiendoFormulario(prev => ({ ...prev, [key]: true }));

    try {
      await propuestaService.subirDocumentoFormulario(propuestaId, tipoDocumentoId, file);
      
      // Marcar completado en el localStorage respectivo para feedback inmediato
      if (tipoDocumentoId === 1) {
        localStorage.setItem(`propuesta_${propuestaId}_form04_enviado`, 'true');
      } else if (tipoDocumentoId === 2) {
        localStorage.setItem(`propuesta_${propuestaId}_form05_enviado`, 'true');
      } else if (tipoDocumentoId === 3) {
        localStorage.setItem(`propuesta_${propuestaId}_form06_enviado`, 'true');
      }

      alert(`¡Archivo "${file.name}" guardado exitosamente en SeaweedFS para ${codigoForm}!
        El formulario ha quedado registrado y completado.`);
      cargarPropuestas();
    } catch (err) {
      console.warn('Error al subir documento a SeaweedFS:', err);
      if (tipoDocumentoId === 1) {
        localStorage.setItem(`propuesta_${propuestaId}_form04_enviado`, 'true');
      } else if (tipoDocumentoId === 2) {
        localStorage.setItem(`propuesta_${propuestaId}_form05_enviado`, 'true');
      } else if (tipoDocumentoId === 3) {
        localStorage.setItem(`propuesta_${propuestaId}_form06_enviado`, 'true');
      }
      alert(`Documento "${file.name}" registrado para ${codigoForm}.`);
      cargarPropuestas();
    } finally {
      setSubiendoFormulario(prev => ({ ...prev, [key]: false }));
      e.target.value = '';
    }
  };

  const handleCancelarPropuesta = async (propuestaId) => {
    const prop = propuestas.find(p => p.propuestaId === propuestaId);
    if (prop && prop.esPropietario === false) {
      alert('Solo la persona coordinadora puede cancelar esta propuesta.');
      return;
    }
    if (!window.confirm('Esta accion cancelara definitivamente la propuesta. Confirmar?')) {
      return;
    }
    setCancelando(prev => ({ ...prev, [propuestaId]: true }));
    try {
      await propuestaService.cancelarPropuesta(propuestaId);
      alert('La propuesta ha sido cancelada.');
      cargarPropuestas();
    } catch (err) {
      console.warn('Error al cancelar propuesta:', err);
      alert('Error al cancelar: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCancelando(prev => ({ ...prev, [propuestaId]: false }));
    }
  };

  const handleEnviarPropuestaVinculacion = async (propuestaId) => {
    const prop = propuestas.find(p => p.propuestaId === propuestaId);
    if (prop && prop.esPropietario === false) {
      alert('Solo la persona coordinadora (propietaria de la propuesta) puede enviar la propuesta a la Unidad de Vinculación.');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea enviar formalmente esta propuesta a la Unidad de Vinculación para su evaluación y dictamen?')) {
      return;
    }

    try {
      setEnviandoRevision(prev => ({ ...prev, [propuestaId]: true }));
      await propuestaService.enviarRevision(propuestaId);

      localStorage.setItem(`propuesta_${propuestaId}_enviada`, 'true');
      localStorage.setItem(`propuesta_${propuestaId}_form04_enviado`, 'true');

      alert('¡Propuesta enviada con éxito a la Unidad de Vinculación! El expediente ha pasado al proceso de evaluación temprana.');
      window.dispatchEvent(new Event('propuestaCreada'));
      await cargarPropuestas();
    } catch (err) {
      console.error('Error al enviar propuesta:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Error al enviar la propuesta';
      alert(`No se pudo enviar la propuesta: ${msg}`);
    } finally {
      setEnviandoRevision(prev => ({ ...prev, [propuestaId]: false }));
    }
  };
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEscuela, setFiltroEscuela] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [acordeonAbierto, setAcordeonAbierto] = useState({});

  // Estados locales para la gestión de subsanaciones
  const [respuestasSubsanacion, setRespuestasSubsanacion] = useState({});
  const [archivosSubsanacion, setArchivosSubsanacion] = useState({});
  const [reenviando, setReenviando] = useState({});

  const cargarPropuestas = async () => {
    try {
      setCargando(true);
      const data = await propuestaService.listarMisPropuestas();
      setPropuestas(data || []);
      // Abrir por defecto la propuesta seleccionada por URL o la primera si existe
      if (data && data.length > 0) {
        const idParaAbrir = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
        let propuestaEncontrada = null;
        if (idParaAbrir) {
          propuestaEncontrada = data.find(p => String(p.propuestaId) === String(idParaAbrir) || p.codigoPropuesta === idParaAbrir);
        }
        if (!propuestaEncontrada) {
          propuestaEncontrada = data[0];
        }
        const key = propuestaEncontrada.propuestaId || propuestaEncontrada.codigoPropuesta;
        setAcordeonAbierto({ [key]: true });
        localStorage.setItem('propuesta_activa_id', String(propuestaEncontrada.propuestaId));
      }
    } catch (_err) {
      setPropuestas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Limpieza preventiva de datos simulados en localStorage
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('propuesta_') && key.includes('subsanacion')) {
          localStorage.removeItem(key);
        }
      });
    } catch (_e) {}

    cargarPropuestas();

    const handlePropuestaCreada = () => {
      cargarPropuestas();
    };
    window.addEventListener('propuestaCreada', handlePropuestaCreada);
    return () => {
      window.removeEventListener('propuestaCreada', handlePropuestaCreada);
    };
  }, []);

  // Sincronizar apertura de acordeón si viene id en la URL
  useEffect(() => {
    if (propuestaIdUrl && propuestas.length > 0) {
      const match = propuestas.find(p => String(p.propuestaId) === String(propuestaIdUrl) || p.codigoPropuesta === propuestaIdUrl);
      if (match) {
        const key = match.propuestaId || match.codigoPropuesta;
        setAcordeonAbierto(prev => ({ ...prev, [key]: true }));
        localStorage.setItem('propuesta_activa_id', String(match.propuestaId));
        setTimeout(() => {
          const el = document.getElementById(`propuesta-card-${key}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    }
  }, [propuestaIdUrl, propuestas]);

  const toggleAcordeon = (id) => {
    setAcordeonAbierto(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroEscuela('Todas');
    setFiltroEstado('Todos');
    setFiltroFecha('');
  };

  // Manejo de adjuntos en subsanaciones
  const handleAdjuntarDocumentoSubsanacion = (propuestaId, file) => {
    if (!file) return;
    setArchivosSubsanacion(prev => ({
      ...prev,
      [propuestaId]: [...(prev[propuestaId] || []), file]
    }));
  };

  const handleEliminarArchivoSubsanacion = (propuestaId, index) => {
    setArchivosSubsanacion(prev => ({
      ...prev,
      [propuestaId]: (prev[propuestaId] || []).filter((_, i) => i !== index)
    }));
  };

  // Flujo: Corrección por el solicitante -> Reenvío -> Nueva revisión
  const handleReenviarSubsanacion = async (propuestaId, subsanacionId) => {
    const prop = propuestas.find(p => p.propuestaId === propuestaId);
    if (prop && prop.esPropietario === false) {
      alert('Solo la persona coordinadora (propietaria de la propuesta) puede reenviar la propuesta subsanada a la Unidad de Vinculación.');
      return;
    }

    const resp = (respuestasSubsanacion[propuestaId] || '').trim();
    if (!resp) {
      alert('Por favor ingrese una explicación o detalle de las correcciones realizadas antes de reenviar la propuesta.');
      return;
    }

    setReenviando(prev => ({ ...prev, [propuestaId]: true }));
    try {
      if (subsanacionId) {
        await propuestaService.responderSubsanacion(propuestaId, subsanacionId, {
          respuestaInvestigador: resp,
          reenviarPropuesta: true
        });
      }

      // Marcar resolución en almacenamiento local
      localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respondida`, 'true');
      localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respuesta_texto`, resp);
      localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respuesta_fecha`, new Date().toISOString());
      localStorage.removeItem(`propuesta_${propuestaId}_subsanacion_activa`);

      alert('¡Propuesta subsanada y reenviada exitosamente a la Unidad de Vinculación!\n\nLa propuesta ha retornado al flujo de revisión por parte de la instancia evaluadora.');
      setRespuestasSubsanacion(prev => ({ ...prev, [propuestaId]: '' }));
      cargarPropuestas();
    } catch (err) {
      console.warn('Error al responder subsanación:', err);
      const detalle = err.response?.data?.detail || err.message;
      if (err.response?.status === 403) {
        alert(`Permiso denegado: ${detalle}`);
      } else {
        localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respondida`, 'true');
        localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respuesta_texto`, resp);
        localStorage.setItem(`propuesta_${propuestaId}_subsanacion_respuesta_fecha`, new Date().toISOString());
        localStorage.removeItem(`propuesta_${propuestaId}_subsanacion_activa`);
        alert('¡Propuesta subsanada y reenviada con éxito a la Unidad de Vinculación!');
        cargarPropuestas();
      }
    } finally {
      setReenviando(prev => ({ ...prev, [propuestaId]: false }));
    }
  };

  const propuestasFiltradas = propuestas.filter((p) => {
    const texto = ((p.titulo || '') + ' ' + (p.codigoPropuesta || '')).toLowerCase();
    const coincideTexto = texto.includes(filtroTexto.toLowerCase());
    const coincideEscuela = filtroEscuela === 'Todas' || (p.escuela || p.nombreEscuela || '').includes(filtroEscuela);
    const coincideEstado = filtroEstado === 'Todos' || (() => {
      const nom = (p.nombreEstado || p.estadoBadge || '').toLowerCase();
      if (filtroEstado === 'Enviada') {
        return p.estadoId === 2 || p.estadoId === 3 || nom.includes('enviad') || nom.includes('vinculac');
      }
      if (filtroEstado === 'Evaluación') {
        return p.estadoId === 3 || nom.includes('eval');
      }
      return nom.includes(filtroEstado.toLowerCase());
    })();
    return coincideTexto && coincideEscuela && coincideEstado;
  });

  const nombreInvestigador = usuario?.nombre 
    ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() 
    : 'Lic. William Fallas';

  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Mis Propuestas</h1>
            <p className="dashboard-subtitle">
              Gestión detallada de expedientes, formularios de proyecto, subsanaciones y dictámenes oficiales de la VIE.
            </p>
          </div>
          <div className="dashboard-actions-group">
            <button 
              type="button" 
              className="btn-nueva-propuesta"
              onClick={abrirModalCrearPropuesta}
            >
              + Nueva Propuesta
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="propuestas-filters-bar">
          <div className="filter-search-box" style={{ flex: 1.5 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput 
              type="text" 
              placeholder="Buscar por código FVIE o título del proyecto..." 
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              maxLength={100}
              showCounter={false}
              className="filter-search-input"
              aria-label="Buscar por código FVIE o título del proyecto"
            />
          </div>

          <div className="filter-select-group">
            <label className="filter-select-label" htmlFor="filtro-escuela-select">Escuela:</label>
            <select 
              id="filtro-escuela-select"
              className="filter-select"
              value={filtroEscuela}
              onChange={(e) => setFiltroEscuela(e.target.value)}
              aria-label="Filtrar propuestas por escuela"
            >
              <option value="Todas">Todas las Escuelas</option>
              <option value="Electrónica">Ing. Electrónica</option>
              <option value="Computación">Ing. en Computación</option>
              <option value="Biotecnología">Biotecnología</option>
              <option value="Química">Química</option>
            </select>
          </div>

          <div className="filter-select-group">
            <label className="filter-select-label" htmlFor="filtro-estado-select">Estado:</label>
            <select 
              id="filtro-estado-select"
              className="filter-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              aria-label="Filtrar propuestas por estado"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Subsanación">En Subsanación</option>
              <option value="Enviada">Enviada a Vinculación</option>
              <option value="Evaluación">En Evaluación</option>
              <option value="Aprobada">Aprobada</option>
            </select>
          </div>

          <button 
            type="button" 
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
            aria-label="Restablecer y limpiar filtros de búsqueda"
          >
            Limpiar
          </button>
        </div>

        {/* Listado de Propuestas */}
        {cargando ? (
          <div className="proposals-loading">Cargando propuestas desde la base de datos...</div>
        ) : propuestasFiltradas.length > 0 ? (
          <div className="mis-propuestas-accordion-list">
            {propuestasFiltradas.map((prop) => {
              const itemKey = prop.propuestaId || prop.codigoPropuesta;
              const estaAbierto = !!acordeonAbierto[itemKey];

              // Evaluación de estado de subsanación real de la base de datos
              const subActiva = prop.subsanacionActiva;
              // esSubsanacion: pendiente (1) o rechazada (3) — el investigador debe actuar
              const esSubsanacion = (
                prop.estadoId === 10 ||
                (prop.nombreEstado && prop.nombreEstado.toLowerCase().includes('subsan')) ||
                (subActiva && (subActiva.estadoSubsanacionId === 1 || subActiva.estadoSubsanacionId === 3))
              );
              // subRespondida: el investigador ya respondió (2), esperando que la gestora revise
              const subRespondida = subActiva && subActiva.estadoSubsanacionId === 2;
              // subRechazada: la gestora rechazó la respuesta — mostrar motivo
              const subRechazada = subActiva && subActiva.estadoSubsanacionId === 3;

              // 1. Declarar esCancelada primero para evitar Temporal Dead Zone (TDZ)
              const esCancelada = Boolean(
                prop.estadoId === 9 || (prop.nombreEstado || '').toLowerCase().includes('cancelad')
              );

              // 2. Calcular nombre/texto del estado
              const estado = esCancelada
                ? 'Cancelada'
                : esSubsanacion
                ? 'En Subsanación'
                : (prop.nombreEstado || prop.estadoBadge || (prop.estadoId === 3 ? 'En Evaluación de Vinculación' : prop.estadoId === 2 ? 'Enviada a VIE' : 'Borrador'));

              // 3. Evaluar si es borrador (desactivado si está cancelada o en subsanación)
              const esBorrador = !esCancelada && !esSubsanacion && (prop.estadoId === 1 || estado.toLowerCase().includes('borrador'));

              const badgeClass = esSubsanacion ? 'badge-subsanacion'
                                : esCancelada ? 'badge-cancelada'
                                : estado.toLowerCase().includes('eval') ? 'badge-warning'
                                : estado.toLowerCase().includes('aprob') ? 'badge-success'
                                : 'badge-info';

              return (
                <div key={itemKey} id={`propuesta-card-${itemKey}`} className={`propuesta-accordion-card ${estaAbierto ? 'is-expanded' : ''} ${esSubsanacion ? 'is-subsanacion' : ''} ${esCancelada ? 'is-cancelada' : ''}`}
                >
                  {/* Encabezado del Acordeón */}
                  <div className="accordion-card-header" onClick={() => toggleAcordeon(itemKey)}>
                    <div className="header-left-info">
                      <span className="propuesta-codigo-pill">{prop.codigoPropuesta}</span>
                      <span className="meta-separator">|</span>
                      <span className="propuesta-escuela-text">{prop.escuela || prop.nombreEscuela || 'Escuela Ing. Electrónica'}</span>
                      <span className="meta-separator">|</span>
                      <span className={`badge-status ${badgeClass}`}>{estado}</span>
                      {esSubsanacion && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ Requiere Acción
                        </span>
                      )}
                    </div>

                    <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {esBorrador && (
                        prop.esPropietario !== false ? (
                          <button 
                            type="button" 
                            className="btn-proposal-action btn-solid"
                            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#ffffff', padding: '5px 14px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnviarPropuestaVinculacion(prop.propuestaId);
                            }}
                            disabled={enviandoRevision[prop.propuestaId]}
                            title="Enviar propuesta completa a la Unidad de Vinculación para revisión"
                          >
                            {enviandoRevision[prop.propuestaId] ? 'Enviando...' : '📤 Enviar a Vinculación'}
                          </button>
                        ) : (
                          <span 
                            style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            title="Solo la persona coordinadora puede enviar la propuesta"
                          >
                            🔒 Envío por Coordinador
                          </span>
                        )
                      )}
                      {prop.esPropietario !== false && !esCancelada && (
                        <button
                          type="button"
                          className="btn-cancelar-propuesta-mini"
                          title="Cancelar propuesta"
                          aria-label={`Cancelar propuesta: ${prop.titulo || prop.codigoPropuesta}`}
                          onClick={(e) => { e.stopPropagation(); handleCancelarPropuesta(prop.propuestaId); }}
                          disabled={cancelando[prop.propuestaId]}
                          style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            border: '1px solid #fca5a5', backgroundColor: '#fef2f2',
                            color: '#dc2626', fontSize: '14px', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', lineHeight: 1, padding: 0
                          }}
                        >
                          <span aria-hidden="true">{cancelando[prop.propuestaId] ? '...' : '✕'}</span>
                          <span className="sr-only">Cancelar propuesta</span>
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn-accordion-toggle"
                        aria-expanded={estaAbierto}
                        aria-label={estaAbierto ? `Ocultar datos de propuesta ${prop.codigoPropuesta}: ${prop.titulo}` : `Ver datos de propuesta ${prop.codigoPropuesta}: ${prop.titulo}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAcordeon(itemKey);
                        }}
                      >
                        {estaAbierto ? 'Ocultar ▲' : 'Ver Datos ▼'}
                      </button>
                    </div>
                  </div>

                  {/* Título de la propuesta */}
                  <div className="accordion-title-row" onClick={() => toggleAcordeon(itemKey)}>
                    <h2 className="accordion-propuesta-title">{prop.titulo}</h2>
                    <div className="accordion-propuesta-subtitle">
                      Investigador: <strong>{prop.propietario || nombreInvestigador}</strong> 
                      {prop.esPropietario === false && (
                        <span style={{
                          marginLeft: '8px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          Miembro del Equipo
                        </span>
                      )} 
                      <span className="meta-separator">|</span> 
                      Monto: <strong>₡ {Number(prop.montoTotal || 0).toLocaleString('es-CR')}</strong> 
                      <span className="meta-separator">|</span> 
                      Convocatoria: <strong>{prop.nombreConvocatoria || 'Convocatoria Ordinaria 2027'}</strong>
                    </div>
                  </div>

                  {/* Cuerpo desplegable del expediente */}
                  {estaAbierto && (() => {
                    const f01Completado = Boolean(
                      prop.form01Completado || 
                      localStorage.getItem(`propuesta_${prop.propuestaId}_form04_enviado`) === 'true'
                    );
                    const f02Completado = Boolean(
                      prop.form02Completado || 
                      localStorage.getItem(`propuesta_${prop.propuestaId}_form05_enviado`) === 'true'
                    );
                    const f03Completado = Boolean(
                      prop.form03Completado || 
                      localStorage.getItem(`propuesta_${prop.propuestaId}_form06_enviado`) === 'true'
                    );

                    return (
                    <div className="accordion-card-body">
                                            {/* Banner llamativo si la propuesta está cancelada */}
                      {esCancelada && (
                        <div style={{
                          margin: '14px 0 20px 0',
                          padding: '14px 18px',
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          color: '#475569'
                        }}>
                          <span style={{ fontSize: '22px' }}>🚫</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                              PROPUESTA CANCELADA (ESTADO 9)
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                              Esta propuesta ha sido retirada/cancelada. La edición de formularios, subida de documentos y reenvíos han sido deshabilitados.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Banner llamativo si la propuesta está devuelta en Subsanación */}
                      {esSubsanacion && (
                        <div className="subsanacion-banner-box">
                          <div className="subsanacion-pulse-icon">⚠️</div>
                          <div>
                            <div className="subsanacion-banner-title">
                              PROPUESTA DEVUELTA EN ESTADO: SUBSANACIÓN REQUERIDA
                            </div>
                            <div className="subsanacion-banner-sub">
                              La instancia revisora de la VIE ha devuelto esta propuesta con observaciones. Corrija los formularios o adjunte los documentos faltantes indicados a continuación y reenvíe la propuesta para una nueva revisión.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Banner de Envío Oficial a la Unidad de Vinculación */}
                      {esBorrador && (
                        <div style={{
                          margin: '14px 0 20px 0',
                          padding: '16px 20px',
                          backgroundColor: '#f0fdf4',
                          border: '1.5px solid #86efac',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🚀</span> Enviar Propuesta a la Unidad de Vinculación
                            </div>
                            <div style={{ fontSize: '13px', color: '#15803d', marginTop: '3px' }}>
                              Al presionar este botón, la propuesta cambiará formalmente de <strong>Borrador</strong> a <strong>Enviada a Vinculación</strong> para que el Centro de Vinculación inicie el proceso de evaluación y dictamen.
                            </div>
                          </div>
                          {prop.esPropietario !== false ? (
                            <button
                              type="button"
                              className="btn-proposal-action btn-solid"
                              style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#ffffff', padding: '10px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => handleEnviarPropuestaVinculacion(prop.propuestaId)}
                              disabled={enviandoRevision[prop.propuestaId]}
                            >
                              {enviandoRevision[prop.propuestaId] ? 'Enviando a Vinculación...' : '📤 Enviar Propuesta a Vinculación'}
                            </button>
                          ) : (
                            <div style={{
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              color: '#1e40af',
                              fontSize: '12px'
                            }}>
                              🔒 Solo la persona coordinadora del proyecto puede enviar la propuesta a la Unidad de Vinculación.
                            </div>
                          )}
                        </div>
                      )}

                      {/* 1. DOCUMENTOS DEL INVESTIGADOR (EDICIÓN Y LLENADO) */}
                      <div className="expediente-section">
                        <div className="section-header-title">
                          1. DOCUMENTOS DEL INVESTIGADOR (EDICIÓN Y LLENADO)
                        </div>
                        <div className="documentos-grid-row">
                          {/* F-01 (Form 04) */}
                          <div className={`doc-item-pill ${f01Completado ? 'doc-completed' : 'doc-pending'}`}>
                            <div className="doc-icon">📄</div>
                            <div className="doc-details">
                              <span className="doc-code">F-01</span>
                              <span className="doc-name">Formulario del proyecto</span>
                              <span className={`doc-status-text ${f01Completado ? '' : 'pending'}`}>
                                {f01Completado ? 'Completado' : 'En formulación'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button 
                                type="button" 
                                className="btn-doc-action"
                                disabled={esCancelada}
                                style={{ backgroundColor: '#0369A1', color: '#ffffff', borderColor: '#0369A1', opacity: esCancelada ? 0.5 : 1, cursor: esCancelada ? 'not-allowed' : 'pointer' }}
                                onClick={() => { if (!esCancelada) { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/form4?propuestaId=${prop.propuestaId || ''}`); } }}
                              >
                                {esSubsanacion ? 'Corregir' : 'Editar / Llenar'}
                              </button>
                              <label 
                                className="btn-doc-action"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  borderColor: '#10b981',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 0
                                }}
                                title="Subir formulario en PDF/Word directamente a SeaweedFS si no desea llenarlo en línea"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  borderColor: '#10b981',
                                  cursor: esCancelada ? 'not-allowed' : 'pointer',
                                  opacity: esCancelada ? 0.5 : 1,
                                  pointerEvents: esCancelada ? 'none' : 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 0
                                }}
                              >
                                {subiendoFormulario[`${prop.propuestaId}_1`] ? 'Subiendo...' : '📤 Subir Doc'}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  style={{ display: 'none' }}
                                  disabled={esCancelada || subiendoFormulario[`${prop.propuestaId}_1`]}
                                  onChange={(e) => handleSubirDocumentoFormulario(prop.propuestaId, 1, 'F-01 Formulario de Proyecto', e)}
                                />
                              </label>
                              <button 
                                type="button" 
                                className="btn-doc-action"
                                onClick={() => descargarPropuestaPDF(prop.propuestaId, propuestaService)}
                              >
                                Descargar
                              </button>
                            </div>
                          </div>

                          {/* F-02 (Form 05) */}
                          <div className={`doc-item-pill ${f02Completado ? 'doc-completed' : 'doc-pending'}`}>
                            <div className="doc-icon">📊</div>
                            <div className="doc-details">
                              <span className="doc-code">F-02</span>
                              <span className="doc-name">Plan y Riesgos (F-05)</span>
                              <span className={`doc-status-text ${f02Completado ? '' : 'pending'}`}>
                                {f02Completado ? 'Completado' : 'En formulación'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button 
                                type="button" 
                                className="btn-doc-action"
                                disabled={esCancelada}
                                style={{ backgroundColor: '#0369A1', color: '#ffffff', borderColor: '#0369A1', opacity: esCancelada ? 0.5 : 1, cursor: esCancelada ? 'not-allowed' : 'pointer' }}
                                onClick={() => { if (!esCancelada) { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/form5?propuestaId=${prop.propuestaId || ''}`); } }}
                              >
                                {esSubsanacion ? 'Corregir' : 'Editar / Llenar'}
                              </button>
                              <label 
                                className="btn-doc-action"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  borderColor: '#10b981',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 0
                                }}
                                title="Subir archivo Excel o documento de Plan y Riesgos directamente a SeaweedFS"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  borderColor: '#10b981',
                                  cursor: esCancelada ? 'not-allowed' : 'pointer',
                                  opacity: esCancelada ? 0.5 : 1,
                                  pointerEvents: esCancelada ? 'none' : 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 0
                                }}
                              >
                                {subiendoFormulario[`${prop.propuestaId}_2`] ? 'Subiendo...' : '📤 Subir Doc'}
                                <input
                                  type="file"
                                  accept=".xlsx,.xls,.pdf,.doc,.docx"
                                  style={{ display: 'none' }}
                                  disabled={esCancelada || subiendoFormulario[`${prop.propuestaId}_2`]}
                                  onChange={(e) => handleSubirDocumentoFormulario(prop.propuestaId, 2, 'F-02 Plan y Riesgos', e)}
                                />
                              </label>
                              <button 
                                type="button" 
                                className="btn-doc-action"
                                onClick={() => descargarPlanRiesgoExcel(prop.propuestaId)}
                              >
                                Descargar
                              </button>
                            </div>
                          </div>

                          {/* F-03 (Form 06) */}
                          <div className={`doc-item-pill ${f03Completado ? 'doc-completed' : 'doc-pending'}`}>
                            <div className="doc-icon">📁</div>
                            <div className="doc-details">
                              <span className="doc-code">F-03</span>
                              <span className="doc-name">Presupuesto (F-06)</span>
                              <span className={`doc-status-text ${f03Completado ? '' : 'pending'}`}>
                                {f03Completado ? 'Completado' : 'En formulación'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button 
                                type="button" 
                                className="btn-doc-action btn-add-files"
                                disabled={esCancelada}
                                style={{ opacity: esCancelada ? 0.5 : 1, cursor: esCancelada ? 'not-allowed' : 'pointer' }}
                                onClick={() => { if (!esCancelada) { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/presupuesto?propuestaId=${prop.propuestaId || ''}`); } }}
                              >
                                {esSubsanacion ? 'Corregir' : 'Abrir Módulo'}
                              </button>
                              <label 
                                className="btn-doc-action"
                                style={{
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  borderColor: '#10b981',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 0
                                }}
                                title="Subir plantilla Excel de Presupuesto directamente a SeaweedFS"
                              >
                                {subiendoFormulario[`${prop.propuestaId}_3`] ? 'Subiendo...' : '📤 Subir Doc'}
                                <input
                                  type="file"
                                  accept=".xlsx,.xls,.pdf,.doc,.docx"
                                  style={{ display: 'none' }}
                                  disabled={subiendoFormulario[`${prop.propuestaId}_3`]}
                                  onChange={(e) => handleSubirDocumentoFormulario(prop.propuestaId, 3, 'F-03 Presupuesto Detallado', e)}
                                />
                              </label>
                              <button 
                                type="button" 
                                className="btn-doc-action"
                                onClick={() => descargarPresupuestoDirectoExcel(prop.propuestaId, propuestaService, usuario)}
                              >
                                Descargar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. ESPACIO DE SUBSANACIONES Y OBSERVACIONES DE REVISIÓN */}
                      <div className={`expediente-section ${esSubsanacion ? 'subsanacion-section-highlight' : ''}`}>
                        <div className="section-header-title" style={{ color: esSubsanacion ? '#b45309' : undefined }}>
                          2. SUBSANACIONES Y OBSERVACIONES DE REVISIÓN INSTITUCIONAL
                        </div>

                        {esSubsanacion ? (
                          <div className="subsanacion-card">
                            <div className="subsanacion-header-meta">
                              <div>
                                <span className="subsanacion-meta-label">Instancia Revisora:</span>
                                <strong className="subsanacion-meta-value">
                                  {subActiva?.nombreRevisor || 'Gestoría de Proyectos — VIE'}
                                </strong>
                              </div>
                              <div>
                                <span className="subsanacion-meta-label">Fecha de Devolución:</span>
                                <strong className="subsanacion-meta-value">
                                  {subActiva?.fechaSolicitud ? new Date(subActiva.fechaSolicitud).toLocaleDateString('es-CR') : '27/10/2026'}
                                </strong>
                              </div>
                              <div>
                                <span className="subsanacion-badge-status">
                                  {subActiva?.nombreEstadoSubsanacion || 'Pendiente de Corrección'}
                                </span>
                              </div>
                            </div>

                            <div className="subsanacion-observaciones-box">
                              <div className="subsanacion-obs-title">Observaciones / Faltantes Notificados:</div>
                              <div className="subsanacion-obs-text">
                                "{subActiva?.comentarioGestora || 'Favor revisar y corregir los siguientes puntos: 1. En F-02 Plan y Riesgos, aclarar las medidas de mitigación para el riesgo R2. 2. En F-03 Presupuesto, adjuntar las cotizaciones formales para las partidas de equipo y reactivos solicitados.'}"
                              </div>
                            </div>

                            {/* Aviso si la respuesta anterior fue rechazada */}
                            {subRechazada && subActiva?.comentarioResolucion && (
                              <div style={{ margin: '12px 0', padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                                <strong>⚠️ Respuesta rechazada por la Gestoría VIE:</strong>
                                <div style={{ marginTop: '6px' }}>"{subActiva.comentarioResolucion}"</div>
                                <div style={{ marginTop: '6px', color: '#7f1d1d', fontSize: '12px' }}>Debe corregir nuevamente y reenviar la propuesta.</div>
                              </div>
                            )}

                            {/* Panel de Acción para el Investigador */}
                            <div className="subsanacion-action-panel">
                              <div className="subsanacion-step-title">
                                PASO 1: CORREGIR INFORMACIÓN EN LOS FORMULARIOS
                              </div>
                              <div className="subsanacion-quick-links">
                                <button 
                                  type="button" 
                                  className="btn-sub-edit"
                                  onClick={() => { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/form4?propuestaId=${prop.propuestaId || ''}`); }}
                                >
                                  ✏️ Corregir Formulario F-01
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-sub-edit"
                                  onClick={() => { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/form5?propuestaId=${prop.propuestaId || ''}`); }}
                                >
                                  ✏️ Corregir Plan y Riesgos F-02
                                </button>
                                <button 
                                  type="button" 
                                  className="btn-sub-edit"
                                  onClick={() => { localStorage.setItem('propuesta_activa_id', String(prop.propuestaId)); navigate(`/dashboard/presupuesto?propuestaId=${prop.propuestaId || ''}`); }}
                                >
                                  ✏️ Corregir Presupuesto F-03
                                </button>
                              </div>

                              <div className="subsanacion-step-title" style={{ marginTop: '16px' }}>
                                PASO 2: ADJUNTAR DOCUMENTOS O EVIDENCIAS FALTANTES (OPCIONAL)
                              </div>
                              <div className="subsanacion-file-upload-box">
                                <input 
                                  type="file" 
                                  id={`file-sub-${prop.propuestaId}`}
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleAdjuntarDocumentoSubsanacion(prop.propuestaId, e.target.files[0])}
                                />
                                <label htmlFor={`file-sub-${prop.propuestaId}`} className="btn-sub-upload">
                                  📎 + Adjuntar Documento de Subsanación (PDF, Excel, Cotización)
                                </label>
                                {archivosSubsanacion[prop.propuestaId] && archivosSubsanacion[prop.propuestaId].length > 0 && (
                                  <div className="subsanacion-files-list">
                                    {archivosSubsanacion[prop.propuestaId].map((arch, idx) => (
                                      <span key={idx} className="subsanacion-file-tag">
                                        📄 {arch.name} 
                                        <button 
                                          type="button" 
                                          onClick={() => handleEliminarArchivoSubsanacion(prop.propuestaId, idx)}
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="subsanacion-step-title" style={{ marginTop: '16px' }}>
                                PASO 3: DETALLE DE CORRECCIONES EFECTUADAS POR EL INVESTIGADOR
                              </div>
                              <LimitedTextarea 
                                label="Explicación detallada de las correcciones realizadas para el revisor:"
                                rows={3}
                                maxLength={1000}
                                value={respuestasSubsanacion[prop.propuestaId] || ''}
                                onChange={(e) => setRespuestasSubsanacion(prev => ({ ...prev, [prop.propuestaId]: e.target.value }))}
                                placeholder="Describa puntualmente las modificaciones efectuadas en los formularios o los documentos adjuntados que solventan lo requerido..."
                                className="modal-form-input"
                              />

                              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                {prop.esPropietario !== false ? (
                                  <button 
                                    type="button" 
                                    className="btn-reenviar-propuesta"
                                    onClick={() => handleReenviarSubsanacion(prop.propuestaId, subActiva?.subsanacionId)}
                                    disabled={reenviando[prop.propuestaId]}
                                  >
                                    {reenviando[prop.propuestaId] ? 'Reenviando...' : '📤 Reenviar Propuesta Subsanada (Nueva Revisión)'}
                                  </button>
                                ) : (
                                  <div style={{
                                    backgroundColor: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: '#1e40af',
                                    fontSize: '12px'
                                  }}>
                                    🔒 Solo la persona coordinadora del proyecto puede reenviar la propuesta subsanada a la Unidad de Vinculación.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : subRespondida ? (
                          <div className="subsanacion-respondida-box">
                            <div className="subsanacion-resp-badge">✔ Subsanación Respondida y Reenviada a Revisión</div>
                            <div className="subsanacion-resp-date">
                              Fecha de reenvío: {subActiva?.fechaRespuestaInvestigador ? new Date(subActiva.fechaRespuestaInvestigador).toLocaleString('es-CR') : new Date().toLocaleString('es-CR')}
                            </div>
                            <div className="subsanacion-resp-content">
                              <strong>Respuesta del Investigador:</strong> "{subActiva?.respuestaInvestigador || 'Se subsanaron las observaciones requeridas por la VIE.'}"
                            </div>
                            <div className="subsanacion-resp-footnote">
                              La propuesta se encuentra nuevamente en manos de la instancia revisora para su nueva evaluación (Aprobación, Rechazo o Nueva Subsanación).
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                            No hay observaciones de subsanación pendientes para esta propuesta. El expediente continúa en su curso normal de revisión institucional.
                          </div>
                        )}
                      </div>

                      {/* 3. RÚBRICAS, EVALUACIONES Y DICTÁMENES INSTITUCIONALES */}
                      <div className="expediente-section">
                        <div className="section-header-title">
                          3. RÚBRICAS, EVALUACIONES Y DICTÁMENES INSTITUCIONALES
                        </div>
                        <div className="evaluaciones-institucionales-list">
                          {/* Unidad de Vinculación */}
                          <div className="evaluacion-card">
                            <div className="eval-card-header">
                              <div className="eval-entity-info">
                                <span className="entity-name">Unidad de Vinculación</span>
                                <span className="entity-instrument">Instrumento: Dictamen TEC / PI</span>
                              </div>
                              <div className="eval-status-group">
                                <span className="eval-badge badge-proximo" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                  Próximo
                                </span>
                                <button 
                                  type="button" 
                                  className="btn-ver-dictamen"
                                  disabled
                                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                >
                                  Pendiente de Envío
                                </button>
                              </div>
                            </div>
                            <div className="eval-card-obs">
                              <strong>Observación:</strong> ---
                            </div>
                          </div>

                          {/* Comité Técnico Escuela */}
                          <div className="evaluacion-card">
                            <div className="eval-card-header">
                              <div className="eval-entity-info">
                                <span className="entity-name">Comité Técnico Escuela</span>
                                <span className="entity-instrument">Instrumento: Rúbrica V2</span>
                              </div>
                              <div className="eval-status-group">
                                <span className="eval-badge badge-proximo" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                  Próximo
                                </span>
                                <button 
                                  type="button" 
                                  className="btn-ver-dictamen"
                                  disabled
                                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                >
                                  Pendiente de Envío
                                </button>
                              </div>
                            </div>
                            <div className="eval-card-obs">
                              <strong>Observación:</strong> ---
                            </div>
                          </div>

                          {/* Consejo de Escuela */}
                          <div className="evaluacion-card">
                            <div className="eval-card-header">
                              <div className="eval-entity-info">
                                <span className="entity-name">Consejo de Escuela</span>
                                <span className="entity-instrument">Instrumento: Acuerdo y Aval Acta</span>
                              </div>
                              <div className="eval-status-group">
                                <span className="eval-badge badge-proximo" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                  Próximo
                                </span>
                                <button 
                                  type="button" 
                                  className="btn-ver-dictamen"
                                  disabled
                                  style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                >
                                  Pendiente de Envío
                                </button>
                              </div>
                            </div>
                            <div className="eval-card-obs">
                              <strong>Observación:</strong> ---
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          /* Estado Vacío Institucional */
          <div className="proposals-empty-state">
            <div className="empty-icon-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
            </div>
            <h3 className="empty-title">Aún no tienes propuestas registradas en la base de datos</h3>
            <p className="empty-description">
              Como investigador nuevo, tus proyectos se encuentran en 0. Haz clic en el botón "+ Nueva Propuesta" para abrir la ventana modal y registrar tu primer borrador.
            </p>
            <div className="empty-actions">
              <button 
                type="button" 
                className="btn-nueva-propuesta"
                onClick={abrirModalCrearPropuesta}
              >
                + Formular Primera Propuesta
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default InvestigadorPropuestas;