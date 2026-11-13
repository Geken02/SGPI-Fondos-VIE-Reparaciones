import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { LimitedInput } from '../components/LimitedInput';

const VinculacionDictamenes = () => {
  const navigate = useNavigate();
  const [dictamenes, setDictamenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('Todos');
  const [filtroDpto, setFiltroDpto] = useState('Todos');

  useEffect(() => {
    cargarDictamenes();
  }, []);

  const cargarDictamenes = async () => {
    try {
      setCargando(true);
      const data = await vinculacionService.listarDictamenes();
      if (data && Array.isArray(data) && data.length > 0) {
        setDictamenes(data.map(d => ({
          id: d.numeroOficio || `DICT-VINC-00${d.dictamenId}`,
          dictamenId: d.dictamenId,
          propuestaId: d.propuestaId,
          titulo: `Propuesta #${d.propuestaId}`,
          estado: 'Emitido',
          tipoBadge: 'aprobado',
          escuela: 'TEC',
          investigador: d.nombreRemitente || 'Evaluador de Vinculación',
          fecha: d.fechaEmision ? new Date(d.fechaEmision).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente',
          accion: 'Ver dictamen'
        })));
      } else {
        setDictamenes([]);
      }
    } catch (_err) {
      setDictamenes([]);
    } finally {
      setCargando(false);
    }
  };

  const dictamenesFiltrados = dictamenes.filter(d => {
    const texto = `${d.id} ${d.titulo} ${d.investigador}`.toLowerCase();
    const coincideTexto = texto.includes(filtroTexto.toLowerCase());
    const coincideResultado = filtroResultado === 'Todos' || d.estado === filtroResultado;
    const coincideDpto = filtroDpto === 'Todos' || d.escuela === filtroDpto;
    return coincideTexto && coincideResultado && coincideDpto;
  });

  const totalDictamenes = dictamenes.length;
  const recomendados = dictamenes.filter(d => (d.estado || '').toLowerCase().includes('aprob') || (d.estado || '').toLowerCase().includes('recom') || (d.tipoBadge || '') === 'aprobado').length;
  const noRecomendados = dictamenes.filter(d => (d.estado || '').toLowerCase().includes('rechaz') || (d.tipoBadge || '') === 'rechazado').length;

  return (
    <div className="vinculacion-dictamenes-container">
      <div className="dashboard-main-card">
        {/* Cabecera */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Dictámenes Emitidos - Centro de Vinculación</h1>
            <p className="dashboard-subtitle">
              Propuestas evaluadas y dictámenes adjuntados al expediente institucional.
            </p>
          </div>
        </div>

        {/* 3 KPIs dinámicos */}
        <div className="kpi-cards-grid">
          <div className="kpi-card">
            <div className="kpi-card-label">DICTÁMENES EMITIDOS</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{totalDictamenes}</span>
              <span className="kpi-stat-icon">📄</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-label">RECOMENDADOS</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{recomendados}</span>
              <span className="kpi-stat-icon" style={{ color: '#16a34a' }}>✓</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-label">NO RECOMENDADOS</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{noRecomendados}</span>
              <span className="kpi-stat-icon" style={{ color: '#EF3340' }}>✕</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="proposals-filters-bar" style={{ marginTop: '24px' }}>
          <div className="filter-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput
              type="text"
              placeholder="Buscar en dictámenes emitidos..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              maxLength={200}
              className="filter-search-input"
              containerStyle={{ flex: 1 }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          <select 
            value={filtroResultado} 
            onChange={(e) => setFiltroResultado(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Resultado: Todos ▾</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
          </select>

          <select 
            value={filtroDpto} 
            onChange={(e) => setFiltroDpto(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Dpto: Todos ▾</option>
            <option value="IE">IE</option>
            <option value="MIT">MIT</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="vinculacion-table-wrapper">
          <table className="vinculacion-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>TÍTULO DE LA PROPUESTA</th>
                <th>ESTADO</th>
                <th>ESCUELA</th>
                <th>INVESTIGADOR</th>
                <th>FECHA</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#627d98' }}>
                    Cargando dictámenes de vinculación...
                  </td>
                </tr>
              ) : dictamenesFiltrados.length > 0 ? (
                dictamenesFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span 
                        className="code-link" 
                        onClick={() => navigate('/dashboard/detalle-dictamen', { state: { propuestaId: item.propuestaId, item } })}
                      >
                        {item.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#002855' }}>
                      {item.titulo}
                    </td>
                    <td>
                      <span className={`badge-dictamen-${item.tipoBadge}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td>
                      <span className="badge-escuela-abbr">{item.escuela}</span>
                    </td>
                    <td>{item.investigador}</td>
                    <td>{item.fecha}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-proposal-action btn-outline"
                        onClick={() => navigate('/dashboard/detalle-dictamen', { state: { propuestaId: item.propuestaId, item } })}
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                      >
                        Ver dictamen
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#627d98' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '28px', color: '#0369A1' }}>📄</div>
                      <div style={{ fontSize: '16px', fontWeight: 500, color: '#002855' }}>
                        No se han emitido dictámenes todavía
                      </div>
                      <div style={{ fontSize: '13px', color: '#829ab1', maxWidth: '460px', lineHeight: 1.4 }}>
                        Los dictámenes de vinculación emitidos y firmados para el Comité Técnico se archivarán y mostrarán en esta sección.
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="table-pagination-footer">
          <span className="pagination-info">
            Mostrando {dictamenesFiltrados.length > 0 ? 1 : 0} a {dictamenesFiltrados.length} de {dictamenes.length} dictámenes emitidos
          </span>
          <div className="pagination-controls">
            <button type="button" className="btn-page-nav" disabled>‹</button>
            <span className="page-current">1</span>
            <button type="button" className="btn-page-nav" disabled>›</button>
          </div>
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default VinculacionDictamenes;
