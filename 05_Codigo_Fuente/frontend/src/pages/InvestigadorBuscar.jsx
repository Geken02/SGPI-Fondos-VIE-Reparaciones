import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';

const InvestigadorBuscar = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [queryActivo, setQueryActivo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroConvocatoria, setFiltroConvocatoria] = useState('Todas');
  const [filtroSede, setFiltroSede] = useState('Todas');
  const [propuestasBD, setPropuestasBD] = useState([]);
  const [convocatoriasBD, setConvocatoriasBD] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const [props, catalogos] = await Promise.all([
          propuestaService.explorarInstitucional(),
          propuestaService.obtenerCatalogosFormulario()
        ]);
        setPropuestasBD(props || []);
        setConvocatoriasBD(catalogos?.convocatorias || []);
      } catch (_err) {
        setPropuestasBD([]);
        setConvocatoriasBD([]);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    setQueryActivo(terminoBusqueda);
  };

  const handleLimpiarBusqueda = () => {
    setTerminoBusqueda('');
    setQueryActivo('');
    setFiltroTipo('Todos');
    setFiltroEstado('Todos');
    setFiltroConvocatoria('Todas');
    setFiltroSede('Todas');
  };

  // Mapear propuestas desde la base de datos
  const itemsPropuestas = propuestasBD.map(p => {
    const esAprob = (p.nombreEstado || '').toLowerCase().includes('aprob');
    const esEval = (p.nombreEstado || '').toLowerCase().includes('eval');
    return {
      id: p.propuestaId,
      tipoItem: 'Propuesta',
      codigo: p.codigoPropuesta,
      escuela: p.nombreEscuela || usuario?.escuela || 'Escuela de Ingeniería',
      estado: p.nombreEstado || 'Borrador',
      estadoTipo: esAprob ? 'success' : esEval ? 'warning' : 'info',
      titulo: p.titulo,
      investigador: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador TEC',
      convocatoria: p.nombreConvocatoria || 'Convocatoria Ordinaria VIE 2027',
      fecha: p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente',
      monto: `₡ ${Number(p.montoTotal || 0).toLocaleString('es-CR')}`,
      evaluacion: p.nombreEstado === 'Borrador' ? 'En formulación' : 'En proceso',
      ruta: `/dashboard/form4?propuestaId=${p.propuestaId}`
    };
  });

  // Mapear convocatorias activas desde la base de datos
  const itemsConvocatorias = convocatoriasBD.map(c => ({
    id: c.convocatoriaId,
    tipoItem: 'Convocatoria',
    codigo: `CONV-2027-${String(c.convocatoriaId).padStart(3, '0')}`,
    escuela: 'Vicerrectoría de Investigación y Extensión',
    estado: 'Convocatoria Abierta',
    estadoTipo: 'success',
    titulo: c.nombreConvocatoria,
    investigador: 'VIE — Fondos Institucionales',
    convocatoria: c.nombreConvocatoria,
    fecha: c.fechaCierre ? `Cierre: ${c.fechaCierre}` : 'Cierre: Por definir',
    monto: 'Fondos VIE / TEC',
    evaluacion: 'Bases y Formularios Oficiales',
    ruta: '/dashboard/convocatorias'
  }));

  // Combinar todos los registros reales de la base de datos
  const todosLosRegistros = [...itemsPropuestas, ...itemsConvocatorias];

  const resultadosFiltrados = todosLosRegistros.filter(item => {
    // Filtro por texto
    if (queryActivo.trim()) {
      const txt = (item.titulo + ' ' + item.codigo + ' ' + item.investigador + ' ' + item.escuela + ' ' + item.convocatoria).toLowerCase();
      if (!txt.includes(queryActivo.toLowerCase())) return false;
    }

    // Filtro por tipo
    if (filtroTipo === 'Propuestas' && item.tipoItem !== 'Propuesta') return false;
    if (filtroTipo === 'Convocatorias' && item.tipoItem !== 'Convocatoria') return false;

    // Filtro por estado
    if (filtroEstado !== 'Todos') {
      if (!item.estado.toLowerCase().includes(filtroEstado.toLowerCase())) return false;
    }

    // Filtro por convocatoria
    if (filtroConvocatoria !== 'Todas') {
      if (!item.convocatoria.toLowerCase().includes(filtroConvocatoria.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Búsqueda Institucional</h1>
            <p className="dashboard-subtitle">
              Exploración unificada de proyectos, expedientes y convocatorias del SGPI.
            </p>
          </div>
        </div>

        {/* Buscador Principal */}
        <form onSubmit={handleBuscar} className="search-main-bar" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }} role="search" aria-label="Búsqueda institucional">
          <div className="filter-search-box" style={{ flex: 1, padding: '10px 16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput
              type="text"
              placeholder="Buscar por código (ej: FVIE-2026-001), título, convocatoria o palabra clave..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              maxLength={200}
              className="filter-search-input"
              containerStyle={{ flex: 1 }}
              style={{ fontSize: '15px', border: 'none', outline: 'none', background: 'transparent' }}
              aria-label="Término de búsqueda de expedientes y convocatorias"
            />
            {terminoBusqueda && (
              <button 
                type="button" 
                onClick={() => { setTerminoBusqueda(''); setQueryActivo(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
                title="Limpiar campo"
                aria-label="Limpiar término de búsqueda"
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Limpiar término de búsqueda</span>
              </button>
            )}
          </div>
          <button type="submit" className="btn-nueva-propuesta" style={{ padding: '0 28px' }} aria-label="Ejecutar búsqueda">
            Buscar
          </button>
        </form>

        {/* Filtros secundarios */}
        <div className="propuestas-filters-bar" style={{ marginBottom: '24px' }} role="group" aria-label="Filtros de búsqueda">
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por tipo de registro"
          >
            <option value="Todos">Filtro tipo: Todos ▾</option>
            <option value="Propuestas">Propuestas</option>
            <option value="Convocatorias">Convocatorias</option>
          </select>

          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por estado del proyecto"
          >
            <option value="Todos">Filtro estado: Todos ▾</option>
            <option value="Borrador">Borrador / En formulación</option>
            <option value="Evaluación">En Evaluación</option>
            <option value="Aprobado">Aprobado / Finalizado</option>
            <option value="Abierta">Convocatorias Abiertas</option>
          </select>

          <select 
            value={filtroConvocatoria} 
            onChange={(e) => setFiltroConvocatoria(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por convocatoria institucional"
          >
            <option value="Todas">Convocatoria: Todas ▾</option>
            <option value="Ordinaria">Convocatoria Ordinaria VIE</option>
            <option value="MICITT">Fondo Incentivos MICITT</option>
            <option value="FEES">Proyectos Fondos FEES</option>
            <option value="Biotecnología">Fondo Semilla Biotecnología</option>
          </select>

          <select 
            value={filtroSede} 
            onChange={(e) => setFiltroSede(e.target.value)}
            className="filter-select"
            aria-label="Filtrar por sede o ubicación"
          >
            <option value="Todas">Ubicación / Sede: Todas ▾</option>
            <option value="Cartago">Sede Central Cartago</option>
            <option value="San José">Sede San José</option>
            <option value="San Carlos">Sede San Carlos</option>
          </select>

          {(queryActivo || filtroTipo !== 'Todos' || filtroEstado !== 'Todos' || filtroConvocatoria !== 'Todas') && (
            <button 
              type="button" 
              className="btn-limpiar-filtros"
              onClick={handleLimpiarBusqueda}
              style={{ padding: '6px 12px', fontSize: '13px' }}
              aria-label="Limpiar todos los filtros y restaurar búsqueda inicial"
            >
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Layout en 2 columnas: Resultados (izq) y Accesos/Filtros Rápidos (der) */}
        <div className="search-layout-columns" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px' }}>
          {/* Columna Izquierda: Resultados */}
          <div className="search-results-list">
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', fontWeight: 500 }}>
              {queryActivo.trim() ? (
                <>Se encontraron <strong style={{ color: '#002855' }}>{resultadosFiltrados.length} resultados</strong> para "{queryActivo}"</>
              ) : (
                <>Exploración institucional: Mostrando <strong style={{ color: '#002855' }}>{resultadosFiltrados.length} registros</strong> activos de la base de datos</>
              )}
            </div>

            {cargando ? (
              <div className="proposals-loading">Consultando registros en tiempo real...</div>
            ) : resultadosFiltrados.length > 0 ? (
              resultadosFiltrados.map((item, index) => (
                <div key={index} className="search-result-card" style={{ 
                  background: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '20px', 
                  marginBottom: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="propuesta-codigo-pill">{item.codigo}</span>
                      <span className="meta-separator">|</span>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{item.escuela}</span>
                      <span className="meta-separator">|</span>
                      <span style={{ fontSize: '12px', color: '#0369A1', fontWeight: 600 }}>{item.tipoItem}</span>
                    </div>
                    <span className={`badge-status ${item.estadoTipo === 'success' ? 'badge-success' : item.estadoTipo === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                      {item.estado}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#002855', margin: '0 0 8px 0' }}>
                    {item.titulo}
                  </h3>

                  <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                    <span>{item.tipoItem === 'Propuesta' ? 'Investigador Principal:' : 'Entidad Convocante:'} <strong>{item.investigador}</strong></span>
                    <span>{item.fecha}</span>
                    <span>{item.monto}</span>
                    {item.evaluacion && <span>Estado técnico: <strong>{item.evaluacion}</strong></span>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn-nueva-propuesta" 
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                      aria-label={`${item.tipoItem === 'Propuesta' ? 'Ver expediente de' : 'Ver convocatoria'} ${item.codigo}: ${item.titulo}`}
                      onClick={() => navigate(item.ruta)}
                    >
                      {item.tipoItem === 'Propuesta' ? 'Ver Expediente →' : 'Ver Convocatoria →'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="proposals-empty-state">
                <div className="empty-icon-circle" aria-hidden="true">🔍</div>
                <h3 className="empty-title">No se encontraron resultados</h3>
                <p className="empty-description">
                  {queryActivo.trim() 
                    ? `No existen registros que coincidan con "${queryActivo}". Prueba con otros términos o limpia los filtros.`
                    : 'No hay expedientes ni convocatorias registradas que coincidan con los filtros seleccionados.'}
                </p>
              </div>
            )}
          </div>

          {/* Columna Derecha: Búsquedas Frecuentes y Enlaces */}
          <div className="search-aside-column">
            <div className="quick-card" style={{ marginBottom: '16px' }}>
              <div className="quick-card-badge">Accesos</div>
              <h3 className="quick-card-title">Registros Clave</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {[
                  { label: 'FVIE-2026-001 (Propuesta en Borrador)', query: 'FVIE-2026-001' },
                  { label: 'Convocatoria Ordinaria VIE 2027', query: 'Convocatoria Ordinaria' },
                  { label: 'Fondo Incentivos MICITT 2027', query: 'MICITT' },
                  { label: 'Proyectos Fondos FEES 2027', query: 'FEES' }
                ].map((item, i) => (
                  <button 
                    key={i} 
                    type="button"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      color: '#0369A1', 
                      cursor: 'pointer',
                      padding: '4px 0'
                    }}
                    onClick={() => {
                      setTerminoBusqueda(item.query);
                      setQueryActivo(item.query);
                    }}
                  >
                    🔍 {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="quick-card" style={{ marginBottom: '16px' }}>
              <div className="quick-card-badge">Filtros</div>
              <h3 className="quick-card-title">Filtros Frecuentes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {[
                  { label: 'Solo Mis Propuestas', tipo: 'Propuestas' },
                  { label: 'Solo Convocatorias Abiertas', tipo: 'Convocatorias' },
                  { label: 'Propuestas en Borrador', estado: 'Borrador' }
                ].map((fil, i) => (
                  <button 
                    key={i}
                    type="button"
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      textAlign: 'left', 
                      fontSize: '13px', 
                      color: '#475569', 
                      cursor: 'pointer',
                      padding: '4px 0'
                    }}
                    onClick={() => {
                      if (fil.tipo) setFiltroTipo(fil.tipo);
                      if (fil.estado) setFiltroEstado(fil.estado);
                    }}
                  >
                    ⚡ {fil.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="quick-card">
              <div className="quick-card-badge">VIE</div>
              <h3 className="quick-card-title">Guías y Plantillas</h3>
              <p className="quick-card-desc">Accede a las instrucciones para la postulación y búsqueda de convocatorias.</p>
              <button 
                type="button" 
                className="btn-nueva-propuesta" 
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => navigate('/dashboard/formularios')}
              >
                Ver Formularios →
              </button>
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

export default InvestigadorBuscar;
