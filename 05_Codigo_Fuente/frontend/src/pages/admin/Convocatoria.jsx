import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogoService } from '../../services/catalogoService';
import Modal from '../../components/Modal';
import '../../styles/convocatoria.css';

export default function Convocatoria() {
  const [convocatorias, setConvocatorias] = useState([]);
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [formData, setFormData] = useState({
    nombreConvocatoria: '',
    fechaApertura: '',
    fechaCierre: '',
    fechaBloqueoOrion: '',
    horaBloqueo: '00:00',
    bloqueoAutomatico: true,
    notificar48h: true,
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);

  const [modalEtapaAbierto, setModalEtapaAbierto] = useState(false);
  const [etapaEditando, setEtapaEditando] = useState(null);
  const [formDataEtapa, setFormDataEtapa] = useState({
    nombreEtapa: '',
    fechaInicio: '',
    fechaFin: '',
    esBloqueante: false,
  });
  const [cargandoEtapa, setCargandoEtapa] = useState(false);

  useEffect(() => {
    cargarConvocatorias();
  }, []);

  const cargarConvocatorias = async () => {
    setCargando(true);
    try {
      const response = await catalogoService.listar('convocatorias', {
        pagina: 1,
        tamanoPagina: 100,
        incluirInactivos: true,
      });
      const todasConvocatorias = response.data.items || [];
      setConvocatorias(todasConvocatorias);
      const activa = todasConvocatorias.find(c => c.activo) || todasConvocatorias[0];
      if (activa) {
        await seleccionarConvocatoria(activa);
      }
    } catch (error) {
      console.error('Error cargando convocatorias:', error);
      mostrarToast('Error al cargar las convocatorias', 'error');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarConvocatoria = async (convocatoria) => {
    setConvocatoriaSeleccionada(convocatoria);
    setFormData({
      nombreConvocatoria: convocatoria.nombreConvocatoria || '',
      fechaApertura: convocatoria.fechaApertura ? convocatoria.fechaApertura.split('T')[0] : '',
      fechaCierre: convocatoria.fechaCierre ? convocatoria.fechaCierre.split('T')[0] : '',
      fechaBloqueoOrion: convocatoria.fechaBloqueoOrion ? convocatoria.fechaBloqueoOrion.split('T')[0] : '',
      horaBloqueo: '00:00',
      bloqueoAutomatico: true,
      notificar48h: true,
    });
    await cargarEtapas(convocatoria.convocatoriaId);
  };

  const cargarEtapas = async (convocatoriaId) => {
    try {
      const response = await catalogoService.listar('etapas', {
        pagina: 1,
        tamanoPagina: 100,
        incluirInactivos: true,
      });
      const todasEtapas = response.data.items || [];
      const etapasConvocatoria = todasEtapas.filter(e => e.convocatoriaId === convocatoriaId);
      setEtapas(etapasConvocatoria);
    } catch (error) {
      console.error('Error cargando etapas:', error);
      setEtapas([]);
    }
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const handleGuardar = async () => {
    if (!convocatoriaSeleccionada) {
      mostrarToast('No hay convocatoria seleccionada', 'error');
      return;
    }
    setGuardando(true);
    try {
      const fechaBloqueoCompleta = formData.fechaBloqueoOrion
        ? `${formData.fechaBloqueoOrion}T${formData.horaBloqueo}:00`
        : null;
      const datosActualizados = {
        nombreConvocatoria: formData.nombreConvocatoria,
        fechaApertura: formData.fechaApertura,
        fechaCierre: formData.fechaCierre,
        fechaBloqueoOrion: fechaBloqueoCompleta,
      };
      await catalogoService.actualizar('convocatorias', convocatoriaSeleccionada.convocatoriaId, datosActualizados);
      mostrarToast('Convocatoria actualizada exitosamente');
      await cargarConvocatorias();
    } catch (error) {
      console.error('Error guardando convocatoria:', error);
      const detail = error.response?.data?.detail;
      const mensajeError = typeof detail === 'string' ? detail : 'Error al guardar la convocatoria';
      mostrarToast(mensajeError, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    if (convocatoriaSeleccionada) {
      setFormData({
        nombreConvocatoria: convocatoriaSeleccionada.nombreConvocatoria || '',
        fechaApertura: convocatoriaSeleccionada.fechaApertura ? convocatoriaSeleccionada.fechaApertura.split('T')[0] : '',
        fechaCierre: convocatoriaSeleccionada.fechaCierre ? convocatoriaSeleccionada.fechaCierre.split('T')[0] : '',
        fechaBloqueoOrion: convocatoriaSeleccionada.fechaBloqueoOrion ? convocatoriaSeleccionada.fechaBloqueoOrion.split('T')[0] : '',
        horaBloqueo: '00:00',
        bloqueoAutomatico: true,
        notificar48h: true,
      });
    }
  };

  const handleAbrirModalEtapa = (etapa = null) => {
    if (etapa) {
      setEtapaEditando(etapa);
      setFormDataEtapa({
        nombreEtapa: etapa.nombreEtapa || '',
        fechaInicio: etapa.fechaInicio ? etapa.fechaInicio.split('T')[0] : '',
        fechaFin: etapa.fechaFin ? etapa.fechaFin.split('T')[0] : '',
        esBloqueante: etapa.esBloqueante || false,
      });
    } else {
      setEtapaEditando(null);
      setFormDataEtapa({
        nombreEtapa: '',
        fechaInicio: '',
        fechaFin: '',
        esBloqueante: false,
      });
    }
    setModalEtapaAbierto(true);
  };

  const handleGuardarEtapa = async () => {
    if (!formDataEtapa.nombreEtapa || !formDataEtapa.fechaInicio || !formDataEtapa.fechaFin) {
      mostrarToast('Todos los campos son obligatorios', 'error');
      return;
    }
    setCargandoEtapa(true);
    try {
      const datosEtapa = {
        convocatoriaId: convocatoriaSeleccionada.convocatoriaId,
        nombreEtapa: formDataEtapa.nombreEtapa,
        fechaInicio: `${formDataEtapa.fechaInicio}T00:00:00`,
        fechaFin: `${formDataEtapa.fechaFin}T23:59:59`,
        esBloqueante: formDataEtapa.esBloqueante,
      };
      if (etapaEditando) {
        await catalogoService.actualizar('etapas', etapaEditando.etapaId, datosEtapa);
        mostrarToast('Etapa actualizada exitosamente');
      } else {
        await catalogoService.crear('etapas', datosEtapa);
        mostrarToast('Etapa creada exitosamente');
      }
      setModalEtapaAbierto(false);
      await cargarEtapas(convocatoriaSeleccionada.convocatoriaId);
    } catch (error) {
      console.error('Error guardando etapa:', error);
      const detail = error.response?.data?.detail;
      const mensajeError = Array.isArray(detail)
        ? detail.map(d => d.msg).join(', ')
        : (typeof detail === 'string' ? detail : 'Error al guardar la etapa');
      mostrarToast(mensajeError, 'error');
    } finally {
      setCargandoEtapa(false);
    }
  };

  const handleEliminarEtapa = async (etapaId, nombreEtapa) => {
    if (!window.confirm(`¿Está seguro de eliminar la etapa "${nombreEtapa}"?`)) return;
    try {
      await catalogoService.eliminar('etapas', etapaId);
      mostrarToast('Etapa eliminada exitosamente');
      await cargarEtapas(convocatoriaSeleccionada.convocatoriaId);
    } catch (error) {
      console.error('Error eliminando etapa:', error);
      mostrarToast('Error al eliminar la etapa', 'error');
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calcularEstado = (convocatoria) => {
    if (!convocatoria) return { texto: 'Sin convocatoria', color: 'gray' };
    const ahora = new Date();
    const inicio = new Date(convocatoria.fechaApertura);
    const cierre = new Date(convocatoria.fechaCierre);
    if (ahora < inicio) return { texto: 'Próxima', color: 'blue' };
    if (ahora >= inicio && ahora <= cierre) return { texto: 'VIGENTE', color: 'green' };
    return { texto: 'Cerrada', color: 'red' };
  };

  const calcularEstadoEtapa = (etapa) => {
    const ahora = new Date();
    const inicioEtapa = new Date(etapa.fechaInicio);
    const finEtapa = new Date(etapa.fechaFin);
    if (ahora > finEtapa) return { clase: 'completada', texto: 'Completada' };
    if (ahora >= inicioEtapa && ahora <= finEtapa) return { clase: 'en-curso', texto: 'En curso' };
    return { clase: 'pendiente', texto: 'Pendiente' };
  };

  if (cargando) {
    return (
      <div className="convocatoria-container">
        <div className="loading-state" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Cargando configuración de convocatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="convocatoria-container">
      {toast && (
        <div className={`toast ${toast.tipo}`} role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <ol className="breadcrumbs-list">
         <li><Link to="/dashboard">Inicio</Link></li>
          <li className="breadcrumb-separator" aria-hidden="true">›</li>
          <li aria-current="page">Configuración de Convocatoria</li>
        </ol>
      </nav>

      <header className="convocatoria-header">
        <h1 id="titulo-convocatoria">Configuración de Convocatoria</h1>
        <p>Definir fechas límite, plazos de evaluación y bloqueo automático en Orión.</p>
      </header>

      {/* ✅ Selector convertido en tablist accesible */}
      <div className="convocatorias-compactas" role="tablist" aria-label="Selector de convocatorias">
        {convocatorias.map((conv) => {
          const estado = calcularEstado(conv);
          const isSelected = convocatoriaSeleccionada?.convocatoriaId === conv.convocatoriaId;
          return (
            <button
              key={conv.convocatoriaId}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`convocatoria-tab ${isSelected ? 'seleccionada' : ''}`}
              onClick={() => seleccionarConvocatoria(conv)}
              aria-label={`${conv.nombreConvocatoria}, estado ${estado.texto}, del ${formatearFecha(conv.fechaApertura)} al ${formatearFecha(conv.fechaCierre)}`}
            >
              <span className="tab-nombre">{conv.nombreConvocatoria}</span>
              <span className={`tab-estado ${estado.color}`} aria-hidden="true">{estado.texto}</span>
            </button>
          );
        })}
        <span className="convocatorias-contador">
          {convocatorias.length} {convocatorias.length === 1 ? 'convocatoria' : 'convocatorias'}
        </span>
      </div>

      {convocatoriaSeleccionada && (
        <>
          {/* Timeline HORIZONTAL accesible */}
          <div className="card timeline-card">
            <div className="timeline-header">
              <h2 id="titulo-timeline">Calendario de la Convocatoria</h2>
              <span className={`estado-badge estado-${calcularEstado(convocatoriaSeleccionada).color}`} aria-label={`Estado actual: ${calcularEstado(convocatoriaSeleccionada).texto}`}>
                {convocatoriaSeleccionada.nombreConvocatoria}
              </span>
            </div>

            {etapas.length === 0 ? (
              <div className="timeline-vacio" role="status">
                <p>No hay etapas configuradas. Agrega etapas para visualizar el calendario completo.</p>
              </div>
            ) : (
              <div className="timeline-horizontal" role="list" aria-labelledby="titulo-timeline">
                {/* 1. Punto de INICIO */}
                <div
                  className="timeline-step"
                  role="listitem"
                  aria-label={`Inicio de la convocatoria el ${formatearFecha(formData.fechaApertura)}, estado abierto`}
                >
                  <div className="step-connector" aria-hidden="true"></div>
                  <div className="step-dot azul" aria-hidden="true"></div>
                  <div className="step-content">
                    <div className="step-title">Inicio</div>
                    <div className="step-date">{formatearFecha(formData.fechaApertura)}</div>
                    <div className="step-status completada">Abierto</div>
                  </div>
                </div>

                {/* 2. Etapas Dinámicas */}
                {etapas.map((etapa) => {
                  const estadoEtapa = calcularEstadoEtapa(etapa);
                  return (
                    <div
                      key={etapa.etapaId}
                      className="timeline-step"
                      role="listitem"
                      aria-label={`Etapa ${etapa.nombreEtapa}, del ${formatearFecha(etapa.fechaInicio)} al ${formatearFecha(etapa.fechaFin)}, estado ${estadoEtapa.texto}${etapa.esBloqueante ? ', etapa bloqueante' : ''}`}
                    >
                      <div className="step-connector" aria-hidden="true"></div>
                      <div className={`step-dot ${estadoEtapa.clase}`} aria-hidden="true"></div>
                      <div className="step-content">
                        <div className="step-title">
                          {etapa.nombreEtapa}
                          {etapa.esBloqueante && <span className="badge-bloqueante">BLOQ</span>}
                        </div>
                        <div className="step-date">
                          {formatearFecha(etapa.fechaInicio)} <br/> al {formatearFecha(etapa.fechaFin)}
                        </div>
                        <div className={`step-status ${estadoEtapa.clase}`}>
                          {estadoEtapa.texto}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Punto de CIERRE */}
                <div
                  className="timeline-step"
                  role="listitem"
                  aria-label={`Cierre de la convocatoria el ${formatearFecha(formData.fechaCierre)}`}
                >
                  <div className="step-connector" aria-hidden="true"></div>
                  <div className="step-dot rojo" aria-hidden="true"></div>
                  <div className="step-content">
                    <div className="step-title">Cierre</div>
                    <div className="step-date">{formatearFecha(formData.fechaCierre)}</div>
                    <div className="step-status pendiente">Finaliza</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fechas de Convocatoria */}
          <div className="fechas-grid">
            <div className="card">
              <h2>Fechas de Convocatoria</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="fecha-apertura">Fecha de inicio</label>
                  <div className="input-with-icon">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      id="fecha-apertura"
                      type="date"
                      className="form-input"
                      value={formData.fechaApertura}
                      onChange={(e) => handleChange('fechaApertura', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="fecha-cierre">Fecha de cierre</label>
                  <div className="input-with-icon">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      id="fecha-cierre"
                      type="date"
                      className="form-input"
                      value={formData.fechaCierre}
                      onChange={(e) => handleChange('fechaCierre', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Plazos de Evaluación */}
            <div className="card etapas-card">
              <div className="etapas-header">
                <h2 id="titulo-etapas">Plazos de Evaluación (Etapas)</h2>
                <button className="btn-small" onClick={() => handleAbrirModalEtapa()} aria-haspopup="dialog">
                  + Agregar Etapa
                </button>
              </div>

              {etapas.length === 0 ? (
                <div className="etapas-vacias" role="status">
                  <p>No hay etapas configuradas para esta convocatoria</p>
                </div>
              ) : (
                <div className="etapas-lista" role="list" aria-labelledby="titulo-etapas">
                  {etapas.map((etapa) => (
                    <div key={etapa.etapaId} className="etapa-item" role="listitem">
                      <div className="etapa-info">
                        <div className="etapa-nombre">
                          {etapa.nombreEtapa}
                          {etapa.esBloqueante && <span className="etapa-badge bloqueante" aria-label="Etapa bloqueante">Bloqueante</span>}
                        </div>
                        <div className="etapa-fechas">
                          {formatearFecha(etapa.fechaInicio)} → {formatearFecha(etapa.fechaFin)}
                        </div>
                      </div>
                      <div className="etapa-acciones">
                        <button
                          className="btn-icon"
                          onClick={() => handleAbrirModalEtapa(etapa)}
                          aria-label={`Editar etapa ${etapa.nombreEtapa}`}
                          aria-haspopup="dialog"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleEliminarEtapa(etapa.etapaId, etapa.nombreEtapa)}
                          aria-label={`Eliminar etapa ${etapa.nombreEtapa}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bloqueo Automático */}
          <div className="card bloqueo-card">
            <h2>Configuración de Bloqueo Automático</h2>
            <p className="descripcion-bloqueo">
              Activar el bloqueo automático del sistema Orión al finalizar el período de convocatoria.
            </p>

            <div className="toggle-group">
              <div className="toggle-item">
                <span className="toggle-label" id="label-bloqueo-auto">Bloqueo automático al cierre</span>
                <label className="toggle-switch" htmlFor="toggle-bloqueo-auto">
                  <input
                    id="toggle-bloqueo-auto"
                    type="checkbox"
                    role="switch"
                    aria-checked={formData.bloqueoAutomatico}
                    aria-labelledby="label-bloqueo-auto"
                    checked={formData.bloqueoAutomatico}
                    onChange={(e) => handleChange('bloqueoAutomatico', e.target.checked)}
                  />
                  <span className="toggle-slider" aria-hidden="true"></span>
                </label>
              </div>

              <div className="toggle-item">
                <span className="toggle-label" id="label-notificar-48h">Notificar a usuarios 48h antes del cierre</span>
                <label className="toggle-switch" htmlFor="toggle-notificar-48h">
                  <input
                    id="toggle-notificar-48h"
                    type="checkbox"
                    role="switch"
                    aria-checked={formData.notificar48h}
                    aria-labelledby="label-notificar-48h"
                    checked={formData.notificar48h}
                    onChange={(e) => handleChange('notificar48h', e.target.checked)}
                  />
                  <span className="toggle-slider" aria-hidden="true"></span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="fecha-bloqueo">Fecha de bloqueo programado</label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input
                    id="fecha-bloqueo"
                    type="date"
                    className="form-input"
                    value={formData.fechaBloqueoOrion}
                    onChange={(e) => handleChange('fechaBloqueoOrion', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="hora-bloqueo">Hora de bloqueo</label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <input
                    id="hora-bloqueo"
                    type="time"
                    className="form-input"
                    value={formData.horaBloqueo}
                    onChange={(e) => handleChange('horaBloqueo', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="form-actions">
            <button className="btn-cancel" onClick={handleCancelar} disabled={guardando} aria-label="Cancelar cambios y restaurar valores originales">
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleGuardar}
              disabled={guardando}
              aria-busy={guardando}
              aria-label={guardando ? 'Guardando cambios, por favor espere' : 'Guardar cambios de la convocatoria'}
            >
              {guardando && <div className="spinner-small" aria-hidden="true"></div>}
              Guardar Cambios
            </button>
          </div>
        </>
      )}

      {/* Modal para crear/editar etapa */}
      <Modal
        isOpen={modalEtapaAbierto}
        onClose={() => setModalEtapaAbierto(false)}
        title={etapaEditando ? 'Editar Etapa' : 'Nueva Etapa'}
        size="medium"
      >
        <div className="form-group">
          <label className="form-label" htmlFor="etapa-nombre">
            Nombre de la Etapa <span style={{ color: '#dc2626' }} aria-hidden="true">*</span>
          </label>
          <input
            id="etapa-nombre"
            type="text"
            className="form-input"
            value={formDataEtapa.nombreEtapa}
            onChange={(e) => setFormDataEtapa(prev => ({ ...prev, nombreEtapa: e.target.value }))}
            placeholder="Ej: Evaluación Comité Técnico"
            required
            aria-required="true"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="etapa-inicio">
              Fecha de Inicio <span style={{ color: '#dc2626' }} aria-hidden="true">*</span>
            </label>
            <input
              id="etapa-inicio"
              type="date"
              className="form-input"
              value={formDataEtapa.fechaInicio}
              onChange={(e) => setFormDataEtapa(prev => ({ ...prev, fechaInicio: e.target.value }))}
              required
              aria-required="true"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="etapa-fin">
              Fecha de Fin <span style={{ color: '#dc2626' }} aria-hidden="true">*</span>
            </label>
            <input
              id="etapa-fin"
              type="date"
              className="form-input"
              value={formDataEtapa.fechaFin}
              onChange={(e) => setFormDataEtapa(prev => ({ ...prev, fechaFin: e.target.value }))}
              required
              aria-required="true"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-checkbox" htmlFor="etapa-bloqueante">
            <input
              id="etapa-bloqueante"
              type="checkbox"
              checked={formDataEtapa.esBloqueante}
              onChange={(e) => setFormDataEtapa(prev => ({ ...prev, esBloqueante: e.target.checked }))}
            />
            <span>Etapa bloqueante (impide avanzar hasta completarse)</span>
          </label>
        </div>

        <div className="form-actions">
          <button className="btn-cancel" onClick={() => setModalEtapaAbierto(false)} disabled={cargandoEtapa}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleGuardarEtapa}
            disabled={cargandoEtapa}
            aria-busy={cargandoEtapa}
          >
            {cargandoEtapa && <div className="spinner-small" aria-hidden="true"></div>}
            {etapaEditando ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  );
}