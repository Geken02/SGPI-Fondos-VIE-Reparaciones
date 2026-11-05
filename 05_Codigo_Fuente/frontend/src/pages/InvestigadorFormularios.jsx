import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LimitedInput } from '../components/LimitedInput';
import { propuestaService } from '../services/propuestaService';
import { descargarPropuestaPDF, descargarPlanRiesgoExcel, descargarPresupuestoDirectoExcel } from '../utils/exportUtils';

/* ──────────────────────────── utilidades ──────────────────────────── */
const FORM_TYPES = [
  {
    codigo: 'Form 04',
    nombre: 'Formulario de Proyecto',
    descripcion: 'Datos generales, objetivos, justificación y compromisos',
    tipo: 'Oficial VIE',
    route: '/dashboard/form4',
  },
  {
    codigo: 'Form 05',
    nombre: 'Plan de Acciones y Gestión del Riesgo',
    descripcion: 'Matriz de planificación y gestión estratégica del riesgo',
    tipo: 'Planificación',
    route: '/dashboard/form5',
  },
  {
    codigo: 'Form 06',
    nombre: 'Presupuesto Operativo Trienal',
    descripcion: 'Desglose de partidas, justificación y calculadora VIE',
    tipo: 'Financiero',
    route: '/dashboard/presupuesto',
  },
];

function formatFecha(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

/* ──────────────────────────── componente ──────────────────────────── */
const InvestigadorFormularios = () => {
  const navigate = useNavigate();

  /* ── estado ────────────────────────────────────────────────────── */
  const [propuestas, setPropuestas]   = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('Todos');
  const [filtroTipo, setFiltroTipo]   = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [modalVistaDoc, setModalVistaDoc] = useState(null);
  const [modalNuevo, setModalNuevo]       = useState(false);

  /* ── cargar propuestas reales ──────────────────────────────────── */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = await propuestaService.listarMisPropuestas();
        if (vivo) setPropuestas(Array.isArray(lista) ? lista : []);
      } catch (err) {
        console.warn('No se pudieron cargar las propuestas:', err);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  /* ── generar filas dinámicas ───────────────────────────────────── */
  const formularios = propuestas.flatMap((p) => {
    const propId   = p.propuestaId || p.id || p.propuesta_id;
    const titulo   = p.titulo || p.nombre || 'Sin título';
    const codigoPr = p.codigoPropuesta || p.codigo || (propId ? `FVIE-${propId}` : 'Sin código');
    const fecha    = p.fechaCreacion || p.fechaEnvio || p.fecha_actualizacion || p.updated_at || p.fecha_creacion || p.created_at || '';

    return FORM_TYPES.map((ft) => ({
      key:          `${ft.codigo}-${propId}`,
      codigo:       ft.codigo,
      nombre:       ft.nombre,
      descripcion:  `${titulo} (${codigoPr})`,
      tipo:         ft.tipo,
      actualizacion: formatFecha(fecha),
      propuestaId:  propId,
      route:        ft.route,
    }));
  });

  /* ── filtrado ──────────────────────────────────────────────────── */
  const formulariosFiltrados = formularios.filter((f) => {
    const txt = (f.codigo + ' ' + f.nombre + ' ' + f.descripcion).toLowerCase();
    const okTxt  = txt.includes(filtroTexto.toLowerCase());
    const okCod  = filtroCodigo === 'Todos' || f.codigo.includes(filtroCodigo);
    const okTipo = filtroTipo === 'Todos' || f.tipo === filtroTipo;
    return okTxt && okCod && okTipo;
  });

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroCodigo('Todos');
    setFiltroTipo('Todos');
    setFiltroFecha('');
  };

  /* ── navegar a formulario ──────────────────────────────────────── */
  const handleEditar = (item) => {
    navigate(`${item.route}?propuestaId=${item.propuestaId}`);
  };

  /* ══════════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Mis Formularios</h1>
            <p className="dashboard-subtitle">
              Formularios asociados a tus propuestas activas. Selecciona uno para editar o descargar.
            </p>
          </div>
          <div className="dashboard-actions-group">
            <button
              type="button"
              className="btn-nueva-propuesta"
              onClick={() => setModalNuevo(true)}
            >
              + Nuevo
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="propuestas-filters-bar" style={{ marginBottom: '24px' }}>
          <div className="filter-search-box" style={{ flex: 1.8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <LimitedInput
              type="text"
              placeholder="Buscar por código, nombre o propuesta..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              maxLength={200}
              className="filter-search-input"
              containerStyle={{ flex: 1 }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          <select
            value={filtroCodigo}
            onChange={(e) => setFiltroCodigo(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Formulario: Todos ▾</option>
            <option value="Form 04">Form 04</option>
            <option value="Form 05">Form 05</option>
            <option value="Form 06">Form 06</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Tipo: Todos ▾</option>
            <option value="Oficial VIE">Oficial VIE</option>
            <option value="Planificación">Planificación</option>
            <option value="Financiero">Financiero</option>
          </select>

          <LimitedInput
            type="text"
            placeholder="Desde - Hasta"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            maxLength={50}
            showCounter={false}
            className="filter-date-input"
            containerStyle={{ width: '150px' }}
          />

          <button
            type="button"
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>
        </div>

        {/* Tabla de Formularios */}
        <div className="table-responsive-container">
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <p style={{ fontSize: '15px' }}>Cargando formularios...</p>
            </div>
          ) : formulariosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📋</span>
              {propuestas.length === 0 ? (
                <>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>No tienes propuestas aún</p>
                  <p style={{ fontSize: '13px' }}>
                    Crea una propuesta desde el <strong>Dashboard</strong> o la sección <strong>Mis Propuestas</strong> para que aparezcan tus formularios aquí.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: '15px' }}>No se encontraron formularios con los filtros aplicados.</p>
              )}
            </div>
          ) : (
            <table className="institucional-data-table">
              <thead>
                <tr>
                  <th>FORMULARIO</th>
                  <th>PROPUESTA</th>
                  <th>ÚLTIMA ACTUALIZACIÓN</th>
                  <th style={{ textAlign: 'center' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {formulariosFiltrados.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <span className="propuesta-codigo-pill">{item.codigo}</span>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{item.nombre}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#002855' }}>{item.descripcion}</div>
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>
                      {item.actualizacion}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => setModalVistaDoc(item)}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => handleEditar(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-table-action btn-table-action-primary"
                          onClick={() => {
                          if (item.codigo === 'Form 04') {
                            descargarPropuestaPDF(item.propuestaId, propuestaService);
                          } else if (item.codigo === 'Form 05') {
                            descargarPlanRiesgoExcel(item.propuestaId, propuestaService);
                          } else if (item.codigo === 'Form 06') {
                            descargarPresupuestoDirectoExcel(item.propuestaId, propuestaService, usuario);
                          }
                        }}
                        >
                          Descargar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>

      {/* Modal Vista Previa Documento */}
      {modalVistaDoc && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setModalVistaDoc(null)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">Vista Previa: {modalVistaDoc.codigo}</div>
              <button type="button" className="btn-modal-close" onClick={() => setModalVistaDoc(null)}>✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '32px' }}>📄</span>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#002855', margin: 0 }}>{modalVistaDoc.nombre}</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{modalVistaDoc.descripcion}</p>
                </div>
              </div>

              <div className="success-meta-card">
                <div className="meta-row">
                  <span className="meta-title">Tipo de Formulario:</span>
                  <span className="meta-val">{modalVistaDoc.tipo}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-title">Última Actualización:</span>
                  <span className="meta-val">{modalVistaDoc.actualizacion}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-title">Entidad Emisora:</span>
                  <span className="meta-val">Vicerrectoría de Investigación y Extensión</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => setModalVistaDoc(null)}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn-nueva-propuesta"
                  onClick={() => {
                    const doc = modalVistaDoc;
                    setModalVistaDoc(null);
                    handleEditar(doc);
                  }}
                >
                  Abrir Formulario Digital →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Formularios Oficiales (+ Nuevo) */}
      {modalNuevo && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setModalNuevo(false)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">
                <span style={{ fontSize: '18px', marginRight: '6px' }}>+</span>
                Formular Nuevo Documento Institucional
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setModalNuevo(false)}>✕</button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: 0, marginBottom: '20px', lineHeight: 1.5 }}>
                Selecciona cuál de los 3 formularios oficiales de la VIE deseas comenzar a formular digitalmente:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {/* Opción 1: Formulario 04 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setModalNuevo(false);
                    const pId = localStorage.getItem('propuesta_activa_id'); navigate(`/dashboard/form4${pId ? `?propuestaId=${pId}` : ''}`);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px' }}>📄</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="propuesta-codigo-pill">Form 04</span>
                        <strong style={{ color: '#002855', fontSize: '15px' }}>Formulario de Proyecto</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                        Asistente oficial de 16 pasos (Identificación, TRL, Objetivos, Metodología, Compromisos).
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-table-action btn-table-action-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Formular →
                  </button>
                </div>

                {/* Opción 2: Formulario 05 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setModalNuevo(false);
                    const pId = localStorage.getItem('propuesta_activa_id'); navigate(`/dashboard/form5${pId ? `?propuestaId=${pId}` : ''}`);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px' }}>📊</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="propuesta-codigo-pill">Form 05</span>
                        <strong style={{ color: '#002855', fontSize: '15px' }}>Plan de Acciones y Gestión del Riesgo</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                        Cronograma detallado por objetivos, asignación de responsables y matriz de mitigación.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-table-action btn-table-action-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Formular →
                  </button>
                </div>

                {/* Opción 3: Formulario 06 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setModalNuevo(false);
                    const pId = localStorage.getItem('propuesta_activa_id'); navigate(`/dashboard/presupuesto${pId ? `?propuestaId=${pId}` : ''}`);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '28px' }}>💰</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="propuesta-codigo-pill">Form 06</span>
                        <strong style={{ color: '#002855', fontSize: '15px' }}>Presupuesto Operativo Trienal</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                        Desglose financiero por partidas OG y calculadora de asistencia estudiantil (Tarifa VIE).
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-table-action btn-table-action-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Formular →
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-proposal-action btn-outline"
                  onClick={() => setModalNuevo(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigadorFormularios;
