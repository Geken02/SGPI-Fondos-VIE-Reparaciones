import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';
import IconoCie from '../components/cie/IconoCie';
import { claseBadgeEstado } from '../data/estadosPropuesta';
import SiglaVie from '../components/SiglaVie';

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
  // Catálogos de filtros obtenidos desde la base de datos
  const [catalogos, setCatalogos] = useState({ escuelas: [], estadosPropuesta: [], campus: [] });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const [props, dataCatalogos] = await Promise.all([
          propuestaService.explorarInstitucional(),
          propuestaService.obtenerCatalogosFormulario()
        ]);
        setPropuestasBD(props || []);
        setConvocatoriasBD(dataCatalogos?.convocatorias || []);
        setCatalogos({
          escuelas: dataCatalogos?.escuelas || [],
          estadosPropuesta: dataCatalogos?.estadosPropuesta || [],
          campus: dataCatalogos?.campus || []
        });
      } catch (_err) {
        setPropuestasBD([]);
        setConvocatoriasBD([]);
        setCatalogos({ escuelas: [], estadosPropuesta: [], campus: [] });
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

  // Mapeo de la escuela de cada propuesta hacia su campus (catálogo de la BD)
  const mapaEscuelaCampus = new Map(
    catalogos.escuelas.map(e => [e.nombreEscuela, e.nombreCampus])
  );

  // Mapear propuestas desde la base de datos
  const itemsPropuestas = propuestasBD.map(p => {
    const nombreEscuela = p.nombreEscuela || usuario?.escuela || 'Escuela de Ingeniería';
    return {
      id: p.propuestaId,
      tipoItem: 'Propuesta',
      estadoId: p.estadoId,
      codigo: p.codigoPropuesta,
      escuela: nombreEscuela,
      campus: mapaEscuelaCampus.get(nombreEscuela) || null,
      estado: p.nombreEstado || 'Borrador',
      estadoClase: claseBadgeEstado(p.estadoId, p.nombreEstado),
      titulo: p.titulo,
      investigador: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador TEC',
      convocatoria: p.nombreConvocatoria || 'Convocatoria Ordinaria V\u200BI\u200BE 2027',
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
    estadoId: null,
    codigo: `CONV-2027-${String(c.convocatoriaId).padStart(3, '0')}`,
    escuela: 'Vicerrectoría de Investigación y Extensión',
    campus: mapaEscuelaCampus.get('Vicerrectoría de Investigación y Extensión') || null,
    estado: 'Convocatoria Abierta',
    estadoClase: 'badge-status success',
    titulo: c.nombreConvocatoria,
    investigador: 'V\u200BI\u200BE — Fondos Institucionales',
    convocatoria: c.nombreConvocatoria,
    fecha: c.fechaCierre ? `Cierre: ${c.fechaCierre}` : 'Cierre: Por definir',
    monto: 'Fondos V\u200BI\u200BE / TEC',
    evaluacion: 'Bases y Formularios Oficiales',
    ruta: '/dashboard/convocatorias'
  }));

  // Combinar todos los registros reales de la base de datos
  const todosLosRegistros = [...itemsPropuestas, ...itemsConvocatorias];

  // Opciones de filtro construidas desde la base de datos
  const opcionesTipo = Array.from(new Set(todosLosRegistros.map(i => i.tipoItem)));
  const opcionesEstado = catalogos.estadosPropuesta.map(e => ({
    value: String(e.estadoPropuestaId),
    label: e.nombreEstadoPropuesta
  }));
  const opcionesConvocatoria = convocatoriasBD.map(c => c.nombreConvocatoria);
  const opcionesSede = catalogos.campus.map(c => c.nombreCampus);

  // Filtros rápidos construidos con valores reales de la BD
  const estadoBorrador = opcionesEstado.find(o => o.label.toLowerCase().includes('borrador'));
  const filtrosFrecuentes = [
    ...(opcionesTipo.includes('Propuesta') ? [{ label: 'Solo Mis Propuestas', tipo: 'Propuesta' }] : []),
    ...(opcionesTipo.includes('Convocatoria') ? [{ label: 'Solo Convocatorias Abiertas', tipo: 'Convocatoria' }] : []),
    ...(estadoBorrador ? [{ label: 'Propuestas en Borrador', estado: estadoBorrador.value }] : [])
  ];

  const resultadosFiltrados = todosLosRegistros.filter(item => {
    // Filtro por texto
    if (queryActivo.trim()) {
      const txt = (item.titulo + ' ' + item.codigo + ' ' + item.investigador + ' ' + item.escuela + ' ' + item.convocatoria).toLowerCase();
      if (!txt.includes(queryActivo.toLowerCase())) return false;
    }

    // Filtro por tipo (valores reales de los registros: Propuesta / Convocatoria)
    if (filtroTipo !== 'Todos' && item.tipoItem !== filtroTipo) return false;

    // Filtro por estado (IDs reales de la tabla estadospropuesta)
    if (filtroEstado !== 'Todos') {
      const label = opcionesEstado.find(o => o.value === filtroEstado)?.label || '';
      const coincide = String(item.estadoId) === filtroEstado
        || (label && item.estado.toLowerCase().includes(label.toLowerCase()));
      if (!coincide) return false;
    }

    // Filtro por convocatoria (nombres reales de la tabla convocatorias)
    if (filtroConvocatoria !== 'Todas' && item.convocatoria !== filtroConvocatoria) return false;

    // Filtro por sede/campus (catálogo campus de la BD)
    if (filtroSede !== 'Todas' && item.campus !== filtroSede) return false;

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
        <form onSubmit={handleBuscar} className="search-main-bar" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div className="filter-search-box" style={{ flex: 1, padding: '10px 16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput
              type="text"
              placeholder="Buscar por código (ej: FVIE-2026-001), título, convocatoria o palabra clave..."
              value={terminoBusqueda}
              onChange={(e) => setTerminoBusqueda(e.target.value)}
              maxLength={200}
              showCounter={false}
              className="filter-search-input"
              containerStyle={{ flex: 1, margin: 0, padding: 0 }}
              style={{ fontSize: '15px', border: 'none', outline: 'none', background: 'transparent' }}
            />
            {terminoBusqueda && (
              <button 
                type="button" 
                onClick={() => { setTerminoBusqueda(''); setQueryActivo(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
                title="Limpiar campo"
              >
                <IconoCie nombre="close" tamano={16} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-nueva-propuesta" style={{ padding: '0 28px' }}>
            Buscar
          </button>
        </form>

        {/* Filtros secundarios */}
        <div className="propuestas-filters-bar" style={{ marginBottom: '24px' }}>
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
            disabled={cargando}
          >
            <option value="Todos">Filtro tipo: Todos ▾</option>
            {opcionesTipo.map((tipo) => (
              <option key={tipo} value={tipo}>{`${tipo}s`}</option>
            ))}
          </select>

          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filter-select"
            disabled={cargando}
          >
            <option value="Todos">Filtro estado: Todos ▾</option>
            {opcionesEstado.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <select 
            value={filtroConvocatoria} 
            onChange={(e) => setFiltroConvocatoria(e.target.value)}
            className="filter-select"
            disabled={cargando}
          >
            <option value="Todas">Convocatoria: Todas ▾</option>
            {opcionesConvocatoria.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>

          <select 
            value={filtroSede} 
            onChange={(e) => setFiltroSede(e.target.value)}
            className="filter-select"
            disabled={cargando}
          >
            <option value="Todas">Ubicación / Sede: Todas ▾</option>
            {opcionesSede.map((sede) => (
              <option key={sede} value={sede}>{sede}</option>
            ))}
          </select>

          {(queryActivo || filtroTipo !== 'Todos' || filtroEstado !== 'Todos' || filtroConvocatoria !== 'Todas') && (
            <button 
              type="button" 
              className="btn-limpiar-filtros"
              onClick={handleLimpiarBusqueda}
              style={{ padding: '6px 12px', fontSize: '13px' }}
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
                    <span className={item.estadoClase}>
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
                      onClick={() => navigate(item.ruta)}
                    >
                      {item.tipoItem === 'Propuesta' ? 'Ver Expediente →' : 'Ver Convocatoria →'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="proposals-empty-state">
                <div className="empty-icon-circle"><IconoCie nombre="search" tamano={24} /></div>
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
                  { label: 'Convocatoria Ordinaria V\u200BI\u200BE 2027', query: 'Convocatoria Ordinaria' },
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
                    <IconoCie nombre="search" tamano={14} /> {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="quick-card" style={{ marginBottom: '16px' }}>
              <div className="quick-card-badge">Filtros</div>
              <h3 className="quick-card-title">Filtros Frecuentes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {filtrosFrecuentes.map((fil, i) => (
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
                    <IconoCie nombre="zap" tamano={13} /> {fil.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="quick-card">
              <div className="quick-card-badge"><SiglaVie /></div>
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
