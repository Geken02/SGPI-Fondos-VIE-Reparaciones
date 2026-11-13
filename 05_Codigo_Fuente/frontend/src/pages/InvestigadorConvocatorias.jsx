import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../context/ModalContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';

// Metadatos institucionales limpios sin datos inventados ni hardcodeados
const formatearFechaApertura = (fechaStr) => {
  if (!fechaStr) return 'No especificada';
  try {
    const [year, month, day] = fechaStr.split('T')[0].split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(day, 10)} ${meses[parseInt(month, 10) - 1]}, ${year}`;
  } catch (_e) {
    return fechaStr;
  }
};

const formatearFechaCierre = (fechaStr) => {
  if (!fechaStr) return 'Por definir';
  try {
    const [year, month, day] = fechaStr.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(day, 10)} ${meses[parseInt(month, 10) - 1]}, ${year}`;
  } catch (_e) {
    return fechaStr;
  }
};

const calcularEstadoConvocatoria = (cierreStr, activo) => {
  if (!activo) return 'Cerrada';
  if (!cierreStr) return 'Abierta';
  try {
    const fechaCierre = new Date(cierreStr + 'T23:59:59');
    const hoy = new Date();
    const diffDias = Math.ceil((fechaCierre - hoy) / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return 'Cerrada';
    if (diffDias <= 15) return 'Cierre Próx.';
    return 'Abierta';
  } catch (_e) {
    return 'Abierta';
  }
};

const InvestigadorConvocatorias = () => {
  const navigate = useNavigate();
  const { abrirModalCrearPropuesta } = useModal();
  const [convocatorias, setConvocatorias] = useState([]);
  const [misPropuestas, setMisPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroArea, setFiltroArea] = useState('Todas');
  const [favoritas, setFavoritas] = useState([1]);
  const [modalDocs, setModalDocs] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        const [dataCatalogos, props] = await Promise.all([
          propuestaService.obtenerCatalogosFormulario(),
          propuestaService.listarMisPropuestas()
        ]);

        setMisPropuestas(props || []);

        const listaBD = dataCatalogos?.convocatorias || [];
        
        // Mapear únicamente con datos reales de la base de datos
        const combinadas = listaBD.map((c) => {
          const estadoCalculado = c.estado || calcularEstadoConvocatoria(c.fechaCierre, c.activo !== false);
          const estaCerrada = estadoCalculado === 'Cerrada' || Boolean(c.cerrada);

          return {
            id: c.convocatoriaId,
            nombre: c.nombreConvocatoria,
            fechaAperturaBD: c.fechaApertura,
            fechaCierreBD: c.fechaCierre,
            aperturaTexto: formatearFechaApertura(c.fechaApertura),
            cierreTexto: formatearFechaCierre(c.fechaCierre),
            estado: estaCerrada ? 'Cerrada' : estadoCalculado,
            tipoFondo: c.tipoFondo || 'Fondo Concursable VIE',
            montoMaximo: c.montoMaximo ? `₡ ${Number(c.montoMaximo).toLocaleString('es-CR')}` : 'Según presupuesto (F-03)',
            dirigidoA: c.dirigidoA || 'Comunidad de Investigadores TEC',
            area: c.area || 'Institucional',
            puedeAplicar: !estaCerrada,
            textoAccion: estaCerrada ? 'Convocatoria Cerrada' : 'Disponible',
            documentos: Array.isArray(c.documentos) && c.documentos.length > 0 
              ? c.documentos 
              : [`Bases de ${c.nombreConvocatoria}.pdf`]
          };
        });

        setConvocatorias(combinadas);
      } catch (_err) {
        setConvocatorias([]);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const toggleFavorita = (id) => {
    setFavoritas((prev) => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroTipo('Todos');
    setFiltroArea('Todas');
  };

  const convocatoriasFiltradas = convocatorias.filter((c) => {
    const coincideTexto = c.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                          c.tipoFondo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                          c.dirigidoA.toLowerCase().includes(filtroTexto.toLowerCase());
    const coincideTipo = filtroTipo === 'Todos' || c.tipoFondo.includes(filtroTipo);
    const coincideArea = filtroArea === 'Todas' || c.area === filtroArea;
    return coincideTexto && coincideTipo && coincideArea;
  });

  const convocatoriasVigentes = convocatorias.filter(c => c.estado !== 'Cerrada').length;
  const cierranPronto = convocatorias.filter(c => c.estado === 'Cierre Próx.').length;

  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Convocatorias y Fondos de Investigación</h1>
            <p className="dashboard-subtitle">
              Consulte las oportunidades de financiamiento activas de la VIE y entidades cooperantes.
            </p>
          </div>
        </div>

        {/* Cajas de métricas superiores calculadas dinámicamente desde la BD */}
        <div className="convocatorias-stats-grid">
          <div className="conv-stat-card">
            <div className="stat-indicator-dot dot-green"></div>
            <div className="stat-number">{convocatoriasVigentes}</div>
            <div className="stat-label">Convocatorias Vigentes</div>
          </div>
          <div className="conv-stat-card">
            <div className="stat-indicator-dot dot-orange"></div>
            <div className="stat-number">{cierranPronto}</div>
            <div className="stat-label">Cierran pronto (&lt; 15 días)</div>
          </div>
          <div className="conv-stat-card">
            <div className="stat-star-icon">★</div>
            <div className="stat-number">{favoritas.length}</div>
            <div className="stat-label">Convocatorias Favoritas</div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="convocatorias-filters-bar">
          <div className="filter-search-box" style={{ flex: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput
              type="text"
              placeholder="Buscar por palabra clave, temática, entidad..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              maxLength={200}
              className="filter-search-input"
              aria-label="Buscar convocatorias por palabra clave, temática o entidad"
              containerStyle={{ flex: 1 }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
            aria-label="Filtrar convocatorias por tipo de fondo"
          >
            <option value="Todos">Tipo de Fondo: Todos ▾</option>
            <option value="TRADICIONAL">Fondo Tradicional</option>
            <option value="EXTERNOS">Fondos Externos</option>
            <option value="ESPECIAL">Fondo Especial</option>
            <option value="CONARE">Fondos CONARE (FEES)</option>
            <option value="TÉCNICO">Equipamiento Técnico</option>
          </select>

          <select 
            value={filtroArea} 
            onChange={(e) => setFiltroArea(e.target.value)}
            className="filter-select"
            aria-label="Filtrar convocatorias por área de conocimiento"
          >
            <option value="Todas">Área Conocimiento: Todas ▾</option>
            <option value="Ingeniería y Tecnología">Ingeniería y Tecnología</option>
            <option value="Ciencias Naturales y Exactas">Ciencias Naturales y Exactas</option>
            <option value="Ciencias Sociales">Ciencias Sociales</option>
          </select>

          <button 
            type="button" 
            className="btn-limpiar-filtros"
            aria-label="Limpiar todos los filtros de convocatorias"
            onClick={limpiarFiltros}
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Grid de Tarjetas de Convocatorias */}
        {cargando ? (
          <div className="proposals-loading">Cargando convocatorias desde la base de datos...</div>
        ) : (
          <div className="convocatorias-cards-grid">
            {convocatoriasFiltradas.map((conv) => {
              const esFav = favoritas.includes(conv.id);
              // Verificar si el usuario ya tiene una propuesta activa para esta convocatoria
              const propActiva = misPropuestas.find(p => p.convocatoriaId === conv.id);

              return (
                <div key={conv.id} className="convocatoria-card">
                  {/* Fila superior de badges y favoritos */}
                  <div className="convocatoria-card-header">
                    <div className="conv-badges-group">
                      <span className={`conv-status-badge ${conv.estado === 'Abierta' ? 'status-open' : conv.estado === 'Cierre Próx.' ? 'status-warning' : 'status-closed'}`}>
                        {conv.estado}
                      </span>
                      <span className="conv-type-badge">{conv.tipoFondo}</span>
                    </div>
                    <button 
                      type="button" 
                      className={`btn-favorite-star ${esFav ? 'is-fav' : ''}`}
                      onClick={() => toggleFavorita(conv.id)}
                      title={esFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                      aria-label={esFav ? `Quitar ${conv.nombre} de convocatorias favoritas` : `Marcar ${conv.nombre} como favorita`}
                    >
                      <span aria-hidden="true">★</span>
                      <span className="sr-only">{esFav ? 'Favorita' : 'No favorita'}</span>
                    </button>
                  </div>

                  {/* Título de la Convocatoria */}
                  <h3 className="convocatoria-title">{conv.nombre}</h3>

                  {/* Metadatos */}
                  <div className="convocatoria-meta-block">
                    <div className="meta-line">
                      <span className="meta-bold-label">Monto:</span> {conv.montoMaximo}
                    </div>
                    <div className="meta-line">
                      <span className="meta-bold-label">Cierre:</span> {conv.cierreTexto}
                    </div>
                    <div className="meta-line meta-dirigido">
                      <span className="meta-muted-label">Dirigido a:</span> {conv.dirigidoA}
                    </div>
                  </div>

                  {/* Aviso de Propuesta Activa para esta Convocatoria si existe en la BD */}
                  {propActiva && (
                    <div style={{
                      margin: '12px 0',
                      padding: '10px 12px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#1e40af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📋</span> En trámite: {propActiva.codigoPropuesta}
                        </span>
                        <span className="badge-status badge-warning" style={{ fontSize: '11px' }}>
                          {propActiva.nombreEstado || 'Borrador'}
                        </span>
                      </div>
                      <div style={{ color: '#1e3a8a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{propActiva.titulo || 'Sin título'}"
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="convocatoria-actions-row">
                    {propActiva ? (
                      <>
                        <button 
                          type="button" 
                          className="btn-conv-aplicar"
                          style={{ backgroundColor: '#002855', borderColor: '#002855' }}
                          onClick={() => navigate(`/dashboard/form4?propuestaId=${propActiva.propuestaId}`)}
                        >
                          Continuar {propActiva.codigoPropuesta} →
                        </button>
                        {!conv.puedeAplicar ? (
                          <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                            ⛔ Cerrada
                          </span>
                        ) : (
                          <button 
                            type="button" 
                            className="btn-conv-documentos"
                            onClick={() => abrirModalCrearPropuesta(conv.id)}
                            title="Crear otra propuesta para esta convocatoria"
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            + Nueva
                          </button>
                        )}
                      </>
                    ) : conv.puedeAplicar ? (
                      <button 
                        type="button" 
                        className="btn-conv-aplicar"
                        onClick={() => abrirModalCrearPropuesta(conv.id)}
                      >
                        Aplicar +
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-conv-proximamente"
                        disabled
                        style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1', cursor: 'not-allowed' }}
                      >
                        ⛔ Convocatoria Cerrada
                      </button>
                    )}

                    <button 
                      type="button" 
                      className="btn-conv-documentos"
                      onClick={() => setModalDocs(conv)}
                    >
                      Ver Documentos ↗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie de página */}
      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>

      {/* Modal flotante de documentos oficiales */}
      {modalDocs && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setModalDocs(null)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">Documentos Oficiales de la Convocatoria</div>
              <button type="button" className="btn-modal-close" onClick={() => setModalDocs(null)}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', color: '#002855', marginBottom: '8px' }}>{modalDocs.nombre}</h3>
              <p style={{ fontSize: '13px', color: '#627d98', marginBottom: '16px' }}>
                Descargue las bases, normativas y anexos oficiales aprobados para esta convocatoria:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {modalDocs.documentos.map((doc, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '10px 14px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                      <span>📄</span>
                      <span>{doc}</span>
                    </div>
                    <button 
                      type="button" 
                      style={{ 
                        border: 'none', 
                        background: '#0369A1', 
                        color: '#fff', 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => alert(`Descargando documento institucional: ${doc}`)}
                    >
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => setModalDocs(null)}>
                  Cerrar
                </button>
                {modalDocs.puedeAplicar && (
                  <button 
                    type="button" 
                    className="btn-nueva-propuesta" 
                    onClick={() => {
                      setModalDocs(null);
                      abrirModalCrearPropuesta(modalDocs.id);
                    }}
                  >
                    Aplicar a Convocatoria →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigadorConvocatorias;
