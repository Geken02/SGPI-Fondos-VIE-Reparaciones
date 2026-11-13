import { useState, useEffect } from 'react';
import { propuestaService } from '../services/propuestaService';

const InvestigadorHistorial = () => {
  const [proyectosCerrados, setProyectosCerrados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroAno, setFiltroAno] = useState('Todos');

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        setCargando(true);
        const data = await propuestaService.listarMisPropuestas();
        // Filtrar propuestas cerradas o finiquitadas desde la base de datos
        const cerradas = (data || []).filter(p => 
          p.estadoId === 5 || 
          (p.nombreEstado || '').toLowerCase().includes('cerrad') ||
          (p.nombreEstado || '').toLowerCase().includes('concluid') ||
          (p.nombreEstado || '').toLowerCase().includes('finiquit')
        );
        setProyectosCerrados(cerradas);
      } catch (_err) {
        setProyectosCerrados([]);
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  const proyectosFiltrados = proyectosCerrados.filter((p) => {
    if (filtroAno === 'Todos') return true;
    const anioProp = p.fechaCreacion ? new Date(p.fechaCreacion).getFullYear() : null;
    return String(anioProp) === String(filtroAno);
  });

  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Historial de Proyectos CERRADOS</h1>
            <p className="dashboard-subtitle">
              Historial y descargas de expedientes cerrados de convocatorias anteriores (2020-2026).
            </p>
          </div>
          <div className="dashboard-actions-group">
            <button 
              type="button" 
              className="btn-nueva-propuesta"
              aria-label="Descargar todos los expedientes y finiquitos cerrados en formato ZIP"
              disabled={proyectosCerrados.length === 0}
              style={{ opacity: proyectosCerrados.length === 0 ? 0.6 : 1 }}
              onClick={() => {
                if (proyectosCerrados.length > 0) {
                  alert('Descargando archivo ZIP con todos los expedientes y finiquitos cerrados...');
                }
              }}
            >
              Descargar Todo
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Expedientes Cerrados */}
        <div className="convocatorias-stats-grid" style={{ marginBottom: '24px' }}>
          <div className="conv-stat-card" role="region" aria-label={`Total de expedientes cerrados: ${proyectosCerrados.length}`}>
            <div className={`stat-indicator-dot ${proyectosCerrados.length > 0 ? 'dot-green' : 'dot-blue'}`} aria-hidden="true"></div>
            <div className="stat-number">{proyectosCerrados.length} Expedientes</div>
            <div className="stat-label">Historial Convocatorias Registradas</div>
          </div>
          <div className="conv-stat-card" role="region" aria-label="Procesos al día">
            <div className="stat-indicator-dot dot-blue" aria-hidden="true"></div>
            <div className="stat-number">{proyectosCerrados.length > 0 ? '100% Al día' : '0 Pendientes'}</div>
            <div className="stat-label">Sin Procesos pendientes</div>
          </div>
        </div>

        {/* Barra de Filtro de Años */}
        <div className="propuestas-filters-bar" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#002855' }}>Fecha y Fondos:</span>
            <select 
              value={filtroAno} 
              onChange={(e) => setFiltroAno(e.target.value)}
              className="filter-select"
              aria-label="Filtrar por año o convocatoria"
            >
              <option value="Todos">Todos los años (2020-2026) ▾</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="2024">Año 2024</option>
            </select>
          </div>
        </div>

        {/* Listado de Proyectos Cerrados */}
        {cargando ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Consultando historial de expedientes en la base de datos...
          </div>
        ) : proyectosFiltrados.length > 0 ? (
          <div className="historial-cards-list">
            {proyectosFiltrados.map((item) => (
              <div key={item.codigoPropuesta || item.propuestaId} className="historial-card">
                <div className="historial-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="historial-tag-badge">CERRADO</span>
                    <span className="meta-separator">|</span>
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                      Código: {item.codigoPropuesta}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Cierre Oficial: <strong>{item.fechaEnvio || 'Registrado'}</strong>
                  </div>
                </div>

                <h2 className="historial-card-title">{item.titulo}</h2>

                <div className="historial-card-meta">
                  <span>Convocatoria: <strong>{item.nombreConvocatoria || 'Convocatoria Oficial'}</strong></span>
                  <span className="meta-separator">|</span>
                  <span>Escuela: <strong>{item.nombreEscuela || item.escuela || 'TEC'}</strong></span>
                  <span className="meta-separator">|</span>
                  <span>Monto: <strong>₡ {Number(item.montoTotal || 0).toLocaleString('es-CR')}</strong></span>
                </div>

                <div className="historial-card-actions">
                  <button 
                    type="button" 
                    className="btn-historial-action btn-outline"
                    aria-label={`Descargar informe final oficial para ${item.codigoPropuesta}: ${item.titulo}`}
                    onClick={() => alert(`Descargando Informe Final Oficial para ${item.codigoPropuesta}`)}
                  >
                    Informe Final
                  </button>
                  <button 
                    type="button" 
                    className="btn-historial-action btn-primary"
                    aria-label={`Descargar acta de finiquito FVIE para ${item.codigoPropuesta}: ${item.titulo}`}
                    onClick={() => alert(`Descargando Acta de Finiquito FVIE para ${item.codigoPropuesta}`)}
                  >
                    Finiquito FVIE →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="proposals-empty-state" style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }} aria-hidden="true">📁</div>
            <h3 style={{ fontSize: '18px', color: '#002855', margin: '0 0 8px 0', fontWeight: 600 }}>
              No tienes proyectos cerrados o finiquitados
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
              Los expedientes que completen todo el ciclo de investigación, cuenten con informe final aprobado y acta de finiquito oficial de la VIE se archivarán automáticamente en esta sección.
            </p>
          </div>
        )}
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default InvestigadorHistorial;
