import { useState } from 'react';

export default function LogDetalleModal({ log, onClose }) {
  const [tabActiva, setTabActiva] = useState('generales');

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-CR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatearJSON = (datos) => {
    if (!datos) return 'Sin datos';
    try {
      return JSON.stringify(datos, null, 2);
    } catch {
      return String(datos);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content log-detalle-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-info">
            <h2>Detalle de Registro de Auditoría</h2>
            <p className="log-id">Log ID: #{log.logId}</p>
          </div>
          <button
            className="btn-cerrar"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs" role="tablist">
          <button
            className={`tab-btn ${tabActiva === 'generales' ? 'active' : ''}`}
            onClick={() => setTabActiva('generales')}
            role="tab"
            aria-selected={tabActiva === 'generales'}
          >
            Información General
          </button>
          <button
            className={`tab-btn ${tabActiva === 'datos' ? 'active' : ''}`}
            onClick={() => setTabActiva('datos')}
            role="tab"
            aria-selected={tabActiva === 'datos'}
            disabled={!log.datosAnteriores && !log.datosNuevos}
          >
            Datos Cambiados
          </button>
        </div>

        {/* Contenido */}
        <div className="modal-body">
          {tabActiva === 'generales' && (
            <div className="detalle-generales">
              <div className="detalle-grid">
                <div className="detalle-item">
                  <span className="detalle-label">Fecha y Hora:</span>
                  <span className="detalle-valor">{formatearFecha(log.creadoEn)}</span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Usuario:</span>
                  <span className="detalle-valor">
                    {log.nombreUsuario || 'Sistema'}
                    {log.usuarioId && <span className="usuario-id">#{log.usuarioId}</span>}
                  </span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Evento:</span>
                  <span className="detalle-valor">
                    {log.nombreEvento || `Evento #${log.tipoEventoId}`}
                  </span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Severidad:</span>
                  <span className={`detalle-valor severidad-badge severidad-${log.severidadId}`}>
                    {log.nombreSeveridad || `Nivel ${log.severidadId}`}
                  </span>
                </div>
                <div className="detalle-item">
                  <span className="detalle-label">Origen:</span>
                  <span className="detalle-valor">{log.nombreSource || `Source #${log.sourceId}`}</span>
                </div>
                <div className="detalle-item full-width">
                  <span className="detalle-label">Descripción:</span>
                  <span className="detalle-valor descripcion-completa">{log.descripcion}</span>
                </div>
                {log.objetoId1 && (
                  <div className="detalle-item">
                    <span className="detalle-label">Objeto Principal:</span>
                    <span className="detalle-valor">
                      {log.nombreObjeto1 || 'Objeto'} #{log.objetoId1}
                    </span>
                  </div>
                )}
                {log.objetoId2 && (
                  <div className="detalle-item">
                    <span className="detalle-label">Objeto Secundario:</span>
                    <span className="detalle-valor">
                      {log.nombreObjeto2 || 'Objeto'} #{log.objetoId2}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActiva === 'datos' && (
            <div className="detalle-datos">
              {log.datosAnteriores && (
                <div className="datos-bloque">
                  <h3 className="datos-titulo datos-anteriores-titulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    Datos Anteriores
                  </h3>
                  <pre className="datos-json">{formatearJSON(log.datosAnteriores)}</pre>
                </div>
              )}
              {log.datosNuevos && (
                <div className="datos-bloque">
                  <h3 className="datos-titulo datos-nuevos-titulo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Datos Nuevos
                  </h3>
                  <pre className="datos-json">{formatearJSON(log.datosNuevos)}</pre>
                </div>
              )}
              {!log.datosAnteriores && !log.datosNuevos && (
                <p className="sin-datos">Este registro no contiene datos de cambios</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}