import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vinculacionService } from '../services/vinculacionService';
import { LimitedInput } from '../components/LimitedInput';
import { useAuth } from '../context/AuthContext';

const VinculacionDashboard = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [propuestas, setPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [filtroDpto, setFiltroDpto] = useState('Todos');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const data = await vinculacionService.listarPropuestas();
      if (data && Array.isArray(data) && data.length > 0) {
        // Filtrar propuestas donde el evaluador es el mismo investigador coordinador
        const usuarioId = usuario?.id || usuario?.usuario_id || usuario?.usuarioId;
        const propuestasFiltradas = data.filter(p => {
          const coordId = p.investigadorCoordId || p.investigador_coord_id;
          return !coordId || coordId !== usuarioId;
        });
        setPropuestas(data.map(p => ({
          id: p.codigoPropuesta || `FVIE-2027-00${p.propuestaId}`,
          propuestaId: p.propuestaId,
          titulo: p.titulo,
          estado: p.tieneDictamenVinculacion ? 'Completada' : 'Pendiente',
          escuela: p.nombreEscuela ? p.nombreEscuela.slice(0, 3).toUpperCase() : 'IE',
          investigador: p.investigadorCoordinador || 'Investigador TEC',
          fecha: '22 ago 2027',
          accion: p.tieneDictamenVinculacion ? 'Ver Dictamen' : 'Evaluar',
          tipoAccion: p.tieneDictamenVinculacion ? 'outline' : 'primary'
        })));
      } else {
        setPropuestas([]);
      }
    } catch (_err) {
      setPropuestas([]);
    } finally {
      setCargando(false);
    }
  };

  const handleAccion = (item) => {
    if (item.estado === 'Completada' || item.accion === 'Ver Dictamen') {
      navigate('/dashboard/detalle-dictamen', { state: { propuestaId: item.propuestaId, item } });
    } else {
      navigate('/dashboard/evaluar-propuesta', { state: { propuestaId: item.propuestaId, item } });
    }
  };

  const propuestasFiltradas = propuestas.filter(p => {
    const texto = `${p.id} ${p.titulo} ${p.investigador}`.toLowerCase();
    const coincideTexto = texto.includes(filtroTexto.toLowerCase());
    const coincideEstado = filtroEstado === 'Todas' || p.estado === filtroEstado;
    const coincideDpto = filtroDpto === 'Todos' || p.escuela === filtroDpto;
    return coincideTexto && coincideEstado && coincideDpto;
  });

  const totalAsignadas = propuestas.length;
  const pendientes = propuestas.filter(p => (p.estado || '').toLowerCase().includes('pend') || !p.tieneDictamenVinculacion).length;
  const completadas = propuestas.filter(p => (p.estado || '').toLowerCase().includes('comp') || p.tieneDictamenVinculacion).length;

  return (
    <div className="vinculacion-dashboard-container">
      <div className="dashboard-main-card">
        {/* Cabecera */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Bandeja de Evaluación – Centro de Vinculación</h1>
            <p className="dashboard-subtitle">
              Propuestas de Desarrollo Tecnológico asignadas para revisión ordinaria.
            </p>
          </div>
        </div>

        

        {/* Fila de 3 Tarjetas KPI */}
        <div className="kpi-cards-grid">
          <div className="kpi-card">
            <div className="kpi-card-label">PROPUESTAS ASIGNADAS</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{totalAsignadas}</span>
              <span className="kpi-stat-icon">📋</span>
            </div>
          </div>

          <div className="kpi-card kpi-card-highlight">
            <div className="kpi-card-label">PENDIENTES POR EVALUAR</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{pendientes}</span>
              <span className="kpi-stat-icon" style={{ color: '#0369A1' }}>⭕</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-label">EVALUACIONES COMPLETADAS</div>
            <div className="kpi-stat-row">
              <span className="kpi-big-number">{completadas}</span>
              <span className="kpi-stat-icon" style={{ color: '#16a34a' }}>✓</span>
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
              placeholder="Buscar por código, título, investigador..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              maxLength={200}
              className="filter-search-input"
              containerStyle={{ flex: 1 }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filter-select"
          >
            <option value="Todas">Estado: Todas ▾</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En curso">En curso</option>
            <option value="Completada">Completada</option>
          </select>

          <select 
            value={filtroDpto} 
            onChange={(e) => setFiltroDpto(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Dpto: Todos ▾</option>
            <option value="IE">IE (Electrónica)</option>
            <option value="IC">IC (Computación)</option>
            <option value="ATI">ATI</option>
            <option value="MIT">MIT</option>
          </select>
        </div>

        {/* Tabla de Bandeja de Evaluación */}
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
                    Cargando propuestas asignadas a Vinculación...
                  </td>
                </tr>
              ) : propuestasFiltradas.length > 0 ? (
                propuestasFiltradas.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="code-link" onClick={() => handleAccion(item)}>
                        {item.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: '#002855', maxWidth: '320px' }}>
                      {item.titulo}
                    </td>
                    <td>
                      <span className={`badge-status-vinculacion ${item.estado.toLowerCase().replace(' ', '-')}`}>
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
                        className={`btn-proposal-action ${item.tipoAccion === 'outline' ? 'btn-outline' : 'btn-solid'}`}
                        onClick={() => handleAccion(item)}
                        style={{ padding: '6px 16px', fontSize: '13px' }}
                      >
                        {item.accion}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#627d98' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '28px', color: '#0369A1' }}>📋</div>
                      <div style={{ fontSize: '16px', fontWeight: 500, color: '#002855' }}>
                        No hay propuestas asignadas actualmente
                      </div>
                      <div style={{ fontSize: '13px', color: '#829ab1', maxWidth: '460px', lineHeight: 1.4 }}>
                        Como evaluador nuevo de Vinculación, las propuestas de Desarrollo Tecnológico aparecerán aquí una vez que sean remitidas formalmente por las escuelas o el Comité Técnico.
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
            Mostrando {propuestasFiltradas.length > 0 ? 1 : 0} a {propuestasFiltradas.length} de {propuestas.length} propuestas asignadas
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

export default VinculacionDashboard;
