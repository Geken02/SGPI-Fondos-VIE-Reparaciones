import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';

const InvestigadorDashboard = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { abrirModalCrearPropuesta } = useModal();
  const [propuestas, setPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEscuela, setFiltroEscuela] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const cargarPropuestas = async () => {
    try {
      setCargando(true);
      const data = await propuestaService.listarMisPropuestas();
      setPropuestas(Array.isArray(data) ? data : []);
    } catch (_err) {
      // Como el usuario es nuevo, se inicializa la lista vacía (en 0)
      setPropuestas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPropuestas();

    // Actualizar cuando se crea una nueva propuesta desde el modal flotante
    const handlePropuestaCreada = () => {
      cargarPropuestas();
    };
    window.addEventListener('propuestaCreada', handlePropuestaCreada);
    return () => {
      window.removeEventListener('propuestaCreada', handlePropuestaCreada);
    };
  }, []);



  // Filtrado de propuestas
  const listaPropuestas = Array.isArray(propuestas) ? propuestas : [];
  const propuestasFiltradas = listaPropuestas.filter((p) => {
    const texto = (p.titulo || '') + ' ' + (p.codigoPropuesta || '');
    const cumpleTexto = texto.toLowerCase().includes(filtroTexto.toLowerCase());
    const cumpleEscuela = filtroEscuela === 'Todas' || (p.escuela || p.nombreEscuela || '').includes(filtroEscuela);
    const cumpleEstado = filtroEstado === 'Todos' || (() => {
      const nom = (p.estado || p.nombreEstado || p.estadoBadge || '').toLowerCase();
      if (filtroEstado === 'En proceso') {
        return p.estadoId !== 7 && p.estadoId !== 8 && p.estadoId !== 9;
      }
      if (filtroEstado === 'Aprobada') {
        return p.estadoId === 7 || nom.includes('aprob');
      }
      if (filtroEstado === 'Rechazada') {
        return p.estadoId === 8 || nom.includes('rechaz');
      }
      if (filtroEstado === 'Cancelada') {
        return p.estadoId === 9 || nom.includes('cancel');
      }
      return nom.includes(filtroEstado.toLowerCase());
    })();
    return cumpleTexto && cumpleEscuela && cumpleEstado;
  });

  // Métricas de estado para el gráfico y KPIs:
  // - Cancelada: Estado 9 o nombre conteniendo "cancelad"
  // - Aprobada: Estado 7 o nombre conteniendo "aprobad"
  // - Rechazada: Estado 8 o nombre conteniendo "rechazad"
  // - En proceso: Cualquier otro estado (Borrador, Enviada, Vinculación, En Comité, Subsanación, etc.)
  const totalPropuestas = listaPropuestas.length;

  const canceladas = listaPropuestas.filter((p) =>
    p.estadoId === 9 || (p.nombreEstado || '').toLowerCase().includes('cancelad')
  ).length;

  const aprobadas = listaPropuestas.filter((p) =>
    (p.estadoId === 7 || (p.nombreEstado || '').toLowerCase().includes('aprobad')) &&
    p.estadoId !== 9 && !(p.nombreEstado || '').toLowerCase().includes('cancelad')
  ).length;

  const rechazadas = listaPropuestas.filter((p) =>
    (p.estadoId === 8 || (p.nombreEstado || '').toLowerCase().includes('rechazad')) &&
    p.estadoId !== 9 && !(p.nombreEstado || '').toLowerCase().includes('cancelad')
  ).length;

  const enProceso = Math.max(0, totalPropuestas - (aprobadas + rechazadas + canceladas));

  const pctProceso = totalPropuestas > 0 ? (enProceso / totalPropuestas) * 100 : 0;
  const pctAprobadas = totalPropuestas > 0 ? (aprobadas / totalPropuestas) * 100 : 0;
  const pctRechazadas = totalPropuestas > 0 ? (rechazadas / totalPropuestas) * 100 : 0;
  const pctCanceladas = totalPropuestas > 0 ? (canceladas / totalPropuestas) * 100 : 0;

  const fondosAsignados = listaPropuestas.length > 0 
    ? `₡ ${listaPropuestas.reduce((acc, curr) => acc + (parseFloat(curr.montoTotal) || 0), 0).toLocaleString('es-CR')}` 
    : '₡ 0';

  const porcentajeEjecutado = 0;

  const dictamenesCie = 0;
  const dictamenesFavorables = 0;
  const dictamenesConMod = 0;
  const dictamenesRechazados = 0;

  return (
    <div className="investigador-dashboard-container">
      {/* Tarjeta Contenedora Principal Blanca */}
      <div className="dashboard-main-card">
        {/* Encabezado del Resumen General (H1) */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Resumen General de Investigación</h1>
            <p className="dashboard-subtitle">
              Vista consolidada de sus propuestas, ejecución presupuestaria y dictámenes oficiales.
            </p>
          </div>

          <div className="dashboard-actions-group">
            {/* Botón principal oficial 0369A1 */}
            <button 
              type="button"
              className="btn-nueva-propuesta"
              onClick={abrirModalCrearPropuesta}
            >
              + Nueva Propuesta
            </button>
          </div>
        </div>

        {/* Fila de Tarjetas KPI / Métricas */}
        <div className="kpi-cards-grid">
          {/* Tarjeta 1: ESTADO DE PROPUESTAS (Gráfico Donut) */}
          <div className="kpi-card">
            <div className="kpi-card-label">ESTADO DE PROPUESTAS</div>
            <div className="kpi-donut-layout">
              {/* Gráfico Donut SVG */}
              <div className="donut-chart-wrapper">
                <svg viewBox="0 0 36 36" className="donut-svg" role="img" aria-label="Gráfico de distribución de propuestas por estado">
                  {/* Pista circular de fondo */}
                  <path
                    className="donut-bg-track"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {totalPropuestas > 0 ? (
                    <>
                      {/* Segmento 1: En proceso (todo lo que no es 7, 8 ni 9) */}
                      {enProceso > 0 && (
                        <path
                          className="donut-segment segment-revision"
                          strokeDasharray={`${pctProceso}, 100`}
                          strokeDashoffset="25"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                      {/* Segmento 2: Aprobadas (Estado 7) */}
                      {aprobadas > 0 && (
                        <path
                          className="donut-segment segment-aprobadas"
                          strokeDasharray={`${pctAprobadas}, 100`}
                          strokeDashoffset={`${25 - pctProceso}`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                      {/* Segmento 3: Rechazadas (Estado 8) */}
                      {rechazadas > 0 && (
                        <path
                          className="donut-segment segment-rechazadas"
                          strokeDasharray={`${pctRechazadas}, 100`}
                          strokeDashoffset={`${25 - (pctProceso + pctAprobadas)}`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                      {/* Segmento 4: Canceladas (Estado 9) */}
                      {canceladas > 0 && (
                        <path
                          className="donut-segment segment-canceladas"
                          strokeDasharray={`${pctCanceladas}, 100`}
                          strokeDashoffset={`${25 - (pctProceso + pctAprobadas + pctRechazadas)}`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      )}
                    </>
                  ) : (
                    <path
                      className="donut-segment-empty"
                      strokeDasharray="100, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <div className="donut-center-value">{totalPropuestas}</div>
              </div>

              {/* Leyenda */}
              <div className="kpi-legend">
                <div className="kpi-legend-row">
                  <span className="dot dot-cyan" style={{ background: '#0284c7', backgroundColor: '#0284c7' }}></span>
                  <span className="legend-text"><strong>{enProceso}</strong> En proceso</span>
                </div>
                <div className="kpi-legend-row">
                  <span className="dot dot-dark" style={{ background: '#002855', backgroundColor: '#002855' }}></span>
                  <span className="legend-text"><strong>{aprobadas}</strong> Aprobadas</span>
                </div>
                <div className="kpi-legend-row">
                  <span className="dot dot-coral" style={{ background: '#EF3340', backgroundColor: '#EF3340' }}></span>
                  <span className="legend-text"><strong>{rechazadas}</strong> Rechazadas</span>
                </div>
                <div className="kpi-legend-row">
                  <span className="dot dot-gray" style={{ background: '#94a3b8', backgroundColor: '#94a3b8' }}></span>
                  <span className="legend-text"><strong>{canceladas}</strong> Canceladas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: FONDOS ASIGNADOS 2026 */}
          <div className="kpi-card">
            <div className="kpi-card-label">FONDOS ASIGNADOS 2026</div>
            <div className="kpi-big-number">{fondosAsignados}</div>
            <div className="kpi-progress-section">
              <div className="kpi-progress-label">
                Ejecutado: <strong>{porcentajeEjecutado}%</strong>
              </div>
              <div className="kpi-progress-track">
                <div 
                  className="kpi-progress-fill" 
                  style={{ width: `${porcentajeEjecutado}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: DICTÁMENES EMITIDOS (CIE) */}
          <div className="kpi-card">
            <div className="kpi-card-label">DICTÁMENES EMITIDOS (CIE)</div>
            <div className="kpi-cie-layout">
              <div className="cie-big-number">{dictamenesCie}</div>
              <div className="cie-breakdown">
                <div className="cie-item">
                  <strong>{dictamenesFavorables}</strong> Favorables
                </div>
                <div className="cie-item">
                  <strong>{dictamenesConMod}</strong> Con Modificaciones
                </div>
                <div className="cie-item">
                  <strong>{dictamenesRechazados}</strong> Rechazado
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Dos Columnas: Propuestas Recientes y Avisos */}
        <div className="dashboard-content-columns">
          {/* Columna Izquierda: Propuestas en Gestión Reciente (H2) */}
          <div className="proposals-column">
            <div className="column-header">
              <h2 className="column-title">Propuestas en Gestión Reciente</h2>
              <p className="column-subtitle">
                Seguimiento de formularios y estado de evaluación del Consejo de Escuela y CIE.
              </p>
            </div>

            {/* Barra de Filtros */}
            <div className="proposals-filters-bar">
              <div className="filter-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <LimitedInput
                  type="text"
                  placeholder="Buscar propuesta..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  maxLength={200}
                  className="filter-search-input"
                  containerStyle={{ flex: 1 }}
                  style={{ border: 'none', outline: 'none', background: 'transparent' }}
                />
              </div>

              <select 
                value={filtroEscuela} 
                onChange={(e) => setFiltroEscuela(e.target.value)}
                className="filter-select"
              >
                <option value="Todas">Escuela: Todas ▾</option>
                <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                <option value="Ingeniería en Computación">Ingeniería en Computación</option>
                <option value="Química">Química</option>
              </select>

              <select 
                value={filtroEstado} 
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="filter-select"
              >
                <option value="Todos">Estado: Todos ▾</option>
                <option value="En proceso">En proceso</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Borrador">Borrador</option>
              </select>
            </div>

            {/* Listado de Propuestas o Estado Vacío (Nuevo Usuario en 0) */}
            <div className="proposals-list">
              {cargando ? (
                <div className="proposals-loading">Cargando propuestas del investigador...</div>
              ) : propuestasFiltradas.length > 0 ? (
                propuestasFiltradas.map((prop) => (
                  <div key={prop.propuestaId} className="proposal-item-card">
                    {/* Encabezado de la tarjeta con Badges */}
                    <div className="proposal-card-top">
                      <span className={`badge-status ${prop.tipoBadge || 'info'}`}>
                        {(prop.estadoId === 2 || prop.nombreEstado === 'Enviada a VIE' || prop.estadoBadge === 'Enviada a VIE') ? 'Enviada a Vinculación' : (prop.estadoBadge || prop.nombreEstado || 'BORRADOR')}
                      </span>
                      <span className="proposal-code">
                        {prop.codigoPropuesta}
                      </span>
                    </div>

                    {/* Título de la propuesta (H3) */}
                    <h3 
                      className="proposal-card-title"
                      style={{ cursor: 'pointer' }}
                      title="Ver detalle en Mis Propuestas"
                      onClick={() => {
                        if (prop.propuestaId) {
                          localStorage.setItem('propuesta_activa_id', String(prop.propuestaId));
                        }
                        navigate(`/dashboard/propuestas?id=${prop.propuestaId || prop.codigoPropuesta}`);
                      }}
                    >
                      {prop.titulo}
                    </h3>

                    {/* Metadatos (Body/Caption) */}
                    <div className="proposal-card-meta">
                      <span>Propietario: <strong>{prop.propietario || `${usuario?.nombre || 'Lic. William'} ${usuario?.apellido1 || 'Fallas'}`}</strong></span>
                      <span className="meta-separator">|</span>
                      <span>Fecha: {prop.fecha || (prop.fechaCreacion ? new Date(prop.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente')}</span>
                    </div>

                    {/* Pie de tarjeta con progreso y botón de acción */}
                    <div className="proposal-card-footer">
                      <div className="proposal-progress-pill">
                        {prop.form01Completado 
                          ? (prop.form02Completado && prop.form03Completado 
                              ? 'Formularios: Completados (3/3)' 
                              : 'Formularios: F-01 completado (1/3)')
                          : (prop.progresoTexto || 'Formularios (F01 - F03): En formulación')}
                      </div>
                      <button 
                        type="button"
                        className={`btn-proposal-action ${prop.accionTipo === 'outline' ? 'btn-outline' : 'btn-solid'}`}
                        onClick={() => {
                          if (prop.propuestaId) {
                            localStorage.setItem('propuesta_activa_id', String(prop.propuestaId));
                          }
                          navigate(`/dashboard/propuestas?id=${prop.propuestaId || prop.codigoPropuesta}`);
                        }}
                      >
                        {prop.accionTexto || 'Ver Detalle'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                /* Estado vacío para usuario nuevo sin propuestas */
                <div className="proposals-empty-state">
                  <div className="empty-icon-circle">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0369A1" strokeWidth="1.5" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <h3 className="empty-title">No cuentas con propuestas registradas actualmente</h3>
                  <p className="empty-description">
                    Como investigador nuevo, tus proyectos se encuentran en 0. Haz clic en el botón para crear tu primera propuesta para los fondos VIE.
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
          </div>

          {/* Columna Derecha: Avisos y Accesos Rápido (H2) */}
          <div className="quick-access-column">
            <div className="column-header">
              <h2 className="column-title">Avisos y Accesos Rápido</h2>
              <p className="column-subtitle">Herramientas frecuentes de la VIE.</p>
            </div>

            <div className="quick-access-cards">
              {/* Aviso 1: Convocatoria */}
              <div 
                className="quick-card"
                onClick={() => alert('Información oficial de la Convocatoria Fondos VIE 2026. Cierre: 30 de Noviembre.')}
              >
                <div className="quick-card-icon">📅</div>
                <div className="quick-card-content">
                  <div className="quick-card-title">Convocatoria VIE 2026</div>
                  <div className="quick-card-sub">Cierra el 30 de Noviembre</div>
                </div>
              </div>

              {/* Aviso 2: Plantillas */}
              <div 
                className="quick-card"
                onClick={() => alert('Descargando plantilla oficial de Presupuesto (Formato F02 - Fondos VIE)...')}
              >
                <div className="quick-card-icon">🧩</div>
                <div className="quick-card-content">
                  <div className="quick-card-title">Plantillas de Presupuesto</div>
                  <div className="quick-card-sub">Descargar formato oficial F02</div>
                </div>
              </div>

              {/* Aviso 3: Reglamento */}
              <div 
                className="quick-card"
                onClick={() => alert('Abriendo Reglamento General de Investigación y Extensión del ITCR.')}
              >
                <div className="quick-card-icon">📖</div>
                <div className="quick-card-content">
                  <div className="quick-card-title">Reglamento de Investigación</div>
                  <div className="quick-card-sub">Guía y normativa vigente</div>
                </div>
              </div>
            </div>

            {/* Enlace de Contacto */}
            <div className="help-link-container">
              <Link to="/dashboard/ayuda" className="help-link">
                ¿Necesitas ayuda? Contactar a la VIE →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pie de página institucional */}
      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>


    </div>
  );
};

export default InvestigadorDashboard;
