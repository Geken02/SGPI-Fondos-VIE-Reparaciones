// src/pages/admin/Convocatoria.jsx
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
  
  // Estados para modal de etapas
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
      // Cargar TODAS las convocatorias (sin límite de 1)
      const response = await catalogoService.listar('convocatorias', {
        pagina: 1,
        tamanoPagina: 100, // Aumentar límite
        incluirInactivos: true,
      });

      const todasConvocatorias = response.data.items || [];
      setConvocatorias(todasConvocatorias);

      // Seleccionar la primera activa o la primera de la lista
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
    
    // Cargar las etapas de esta convocatoria
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
      // Filtrar solo las etapas de esta convocatoria
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
      await cargarConvocatorias(); // Recargar lista
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

  // Funciones para gestión de etapas
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

  const handleEliminarEtapa = async (etapaId) => {
    if (!window.confirm('¿Está seguro de eliminar esta etapa?')) return;

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

  if (cargando) {
    return (
      <div className="convocatoria-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando configuración de convocatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="convocatoria-container">
      {toast && (
        <div className={`toast ${toast.tipo}`}>
          <span className="toast-icon">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/dashboard">Comité técnico</Link>
        <span className="breadcrumb-separator">›</span>
        <span>Configuración de Convocatoria</span>
      </div>

      {/* Header */}
      <div className="convocatoria-header">
        <h1>Configuración de Convocatoria</h1>
        <p>Definir fechas límite, plazos de evaluación y bloqueo automático en Orión.</p>
      </div>

      {/* Selector de Convocatorias - Versión Compacta */}
<div className="convocatorias-compactas">
  {convocatorias.map((conv) => {
    const estado = calcularEstado(conv);
    const isSelected = convocatoriaSeleccionada?.convocatoriaId === conv.convocatoriaId;
    return (
      <div
        key={conv.convocatoriaId}
        className={`convocatoria-tab ${isSelected ? 'seleccionada' : ''}`}
        onClick={() => seleccionarConvocatoria(conv)}
        title={`${conv.nombreConvocatoria}\n${formatearFecha(conv.fechaApertura)} - ${formatearFecha(conv.fechaCierre)}`}
      >
        <span className="tab-nombre">{conv.nombreConvocatoria}</span>
        <span className={`tab-estado ${estado.color}`}>{estado.texto}</span>
      </div>
    );
  })}
  <span className="convocatorias-contador">
    {convocatorias.length} {convocatorias.length === 1 ? 'convocatoria' : 'convocatorias'}
  </span>
</div>

      {convocatoriaSeleccionada && (
        <>
          {/* Timeline HORIZONTAL */}
          <div className="card timeline-card">
            <div className="timeline-header">
              <h2>Calendario de la Convocatoria</h2>
              <span className={`estado-badge estado-${calcularEstado(convocatoriaSeleccionada).color}`}>
                {convocatoriaSeleccionada.nombreConvocatoria}
              </span>
            </div>

            {etapas.length === 0 ? (
              <div className="timeline-vacio">
                <p>No hay etapas configuradas. Agrega etapas para visualizar el calendario completo.</p>
              </div>
            ) : (
              <div className="timeline-horizontal">
                {/* 1. Punto de INICIO */}
                <div className="timeline-step">
                  <div className="step-connector"></div>
                  <div className="step-dot azul"></div>
                  <div className="step-content">
                    <div className="step-title">Inicio</div>
                    <div className="step-date">{formatearFecha(formData.fechaApertura)}</div>
                    <div className="step-status completada">Abierto</div>
                  </div>
                </div>

                {/* 2. Etapas Dinámicas */}
                {etapas.map((etapa) => {
                  const ahora = new Date();
                  const inicioEtapa = new Date(etapa.fechaInicio);
                  const finEtapa = new Date(etapa.fechaFin);
                  
                  let estadoEtapa = 'pendiente';
                  let textoEstado = 'Pendiente';
                  
                  if (ahora > finEtapa) {
                    estadoEtapa = 'completada';
                    textoEstado = 'Completada';
                  } else if (ahora >= inicioEtapa && ahora <= finEtapa) {
                    estadoEtapa = 'en-curso';
                    textoEstado = 'En curso';
                  }

                  return (
                    <div key={etapa.etapaId} className="timeline-step">
                      <div className="step-connector"></div>
                      <div className={`step-dot ${estadoEtapa}`}></div>
                      <div className="step-content">
                        <div className="step-title">
                          {etapa.nombreEtapa}
                          {etapa.esBloqueante && <span className="badge-bloqueante">BLOQ</span>}
                        </div>
                        <div className="step-date">
                          {formatearFecha(etapa.fechaInicio)} <br/> al {formatearFecha(etapa.fechaFin)}
                        </div>
                        <div className={`step-status ${estadoEtapa}`}>
                          {textoEstado}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Punto de CIERRE */}
                <div className="timeline-step">
                  <div className="step-connector"></div>
                  <div className="step-dot rojo"></div>
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
                  <label className="form-label">Fecha de inicio</label>
                  <div className="input-with-icon">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fechaApertura}
                      onChange={(e) => handleChange('fechaApertura', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de cierre</label>
                  <div className="input-with-icon">
                    <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.fechaCierre}
                      onChange={(e) => handleChange('fechaCierre', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Plazos de Evaluación - AHORA DINÁMICO */}
            <div className="card etapas-card">
              <div className="etapas-header">
                <h2>Plazos de Evaluación (Etapas)</h2>
                <button className="btn-small" onClick={() => handleAbrirModalEtapa()}>
                  + Agregar Etapa
                </button>
              </div>
              
              {etapas.length === 0 ? (
                <div className="etapas-vacias">
                  <p>No hay etapas configuradas para esta convocatoria</p>
                </div>
              ) : (
                <div className="etapas-lista">
                  {etapas.map((etapa) => (
                    <div key={etapa.etapaId} className="etapa-item">
                      <div className="etapa-info">
                        <div className="etapa-nombre">
                          {etapa.nombreEtapa}
                          {etapa.esBloqueante && <span className="etapa-badge bloqueante">Bloqueante</span>}
                        </div>
                        <div className="etapa-fechas">
                          {formatearFecha(etapa.fechaInicio)} → {formatearFecha(etapa.fechaFin)}
                        </div>
                      </div>
                      <div className="etapa-acciones">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleAbrirModalEtapa(etapa)}
                          title="Editar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="btn-icon danger" 
                          onClick={() => handleEliminarEtapa(etapa.etapaId)}
                          title="Eliminar"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                <span className="toggle-label">Bloqueo automático al cierre</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.bloqueoAutomatico}
                    onChange={(e) => handleChange('bloqueoAutomatico', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <span className="toggle-label">Notificar a usuarios 48h antes del cierre</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.notificar48h}
                    onChange={(e) => handleChange('notificar48h', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha de bloqueo programado</label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fechaBloqueoOrion}
                    onChange={(e) => handleChange('fechaBloqueoOrion', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Hora de bloqueo</label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <input
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
            <button className="btn-cancel" onClick={handleCancelar} disabled={guardando}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleGuardar} disabled={guardando}>
              {guardando && <div className="spinner-small"></div>}
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
          <label className="form-label">
            Nombre de la Etapa <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={formDataEtapa.nombreEtapa}
            onChange={(e) => setFormDataEtapa(prev => ({ ...prev, nombreEtapa: e.target.value }))}
            placeholder="Ej: Evaluación Comité Técnico"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Fecha de Inicio <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={formDataEtapa.fechaInicio}
              onChange={(e) => setFormDataEtapa(prev => ({ ...prev, fechaInicio: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Fecha de Fin <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={formDataEtapa.fechaFin}
              onChange={(e) => setFormDataEtapa(prev => ({ ...prev, fechaFin: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
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
          <button className="btn-primary" onClick={handleGuardarEtapa} disabled={cargandoEtapa}>
            {cargandoEtapa && <div className="spinner-small"></div>}
            {etapaEditando ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  );
}