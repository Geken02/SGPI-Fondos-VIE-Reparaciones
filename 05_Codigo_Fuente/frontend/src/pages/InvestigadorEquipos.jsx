import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';

const obtenerIniciales = (nombre) => {
  if (!nombre) return 'TEC';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return partes[0].slice(0, 2).toUpperCase();
};

const InvestigadorEquipos = () => {
  const { usuario } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEscuela, setFiltroEscuela] = useState('Todas');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [investigadoresBD, setInvestigadoresBD] = useState([]);

  useEffect(() => {
    const cargarEquiposDesdeBD = async () => {
      try {
        setCargando(true);
        const [misProps, catalogos] = await Promise.all([
          propuestaService.listarMisPropuestas(),
          propuestaService.obtenerCatalogosFormulario()
        ]);

        if (catalogos?.investigadores) {
          setInvestigadoresBD(catalogos.investigadores);
        }

        if (misProps && misProps.length > 0) {
          // Obtener detalle completo de cada propuesta con sus integrantes reales de la BD
          const equiposPromesas = misProps.map(async (p, idx) => {
            let integrantesReales = [];
            try {
              const det = await propuestaService.obtenerPropuesta(p.propuestaId);
              if (det?.integrantes && det.integrantes.length > 0) {
                integrantesReales = det.integrantes.map(inte => ({
                  id: inte.integranteEquipoId || inte.usuarioId,
                  usuarioId: inte.usuarioId,
                  nombre: inte.nombreCompleto || 'Investigador TEC',
                  correo: inte.correoInstitucional || 'usuario@tec.ac.cr',
                  escuela: p.nombreEscuela || usuario?.escuela || 'TEC',
                  rol: inte.rolEquipoId === 1 ? 'Investigador Coordinador' : 'Co-Investigador',
                  esLider: inte.rolEquipoId === 1
                }));
              }
            } catch (_err) {}

            if (integrantesReales.length === 0) {
              integrantesReales = [
                {
                  id: usuario?.id || 1,
                  usuarioId: usuario?.id || 1,
                  nombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador Coordinador',
                  correo: usuario?.correo || 'investigador@tec.ac.cr',
                  escuela: p.codigoEscuela || p.nombreEscuela || usuario?.escuela || 'TEC',
                  rol: 'Investigador Coordinador',
                  esLider: true
                }
              ];
            }

            return {
              propuestaId: p.propuestaId,
              codigo: `EQP-${String(idx + 1).padStart(2, '0')}`,
              nombre: `Equipo: ${p.codigoPropuesta || 'FVIE'}`,
              proyecto: p.titulo,
              lider: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador Principal',
              liderEmail: usuario?.correo || 'investigador@tec.ac.cr',
              totalMiembros: integrantesReales.length,
              estado: p.nombreEstado || 'Activo',
              miembros: integrantesReales
            };
          });

          const equiposCargados = await Promise.all(equiposPromesas);
          setEquipos(equiposCargados);
        } else {
          setEquipos([]);
        }
      } catch (_e) {
        setEquipos([]);
      } finally {
        setCargando(false);
      }
    };

    cargarEquiposDesdeBD();
  }, [usuario]);

  // Modales
  const [modalNuevoMiembro, setModalNuevoMiembro] = useState(false);
  const [modalNuevoGrupo, setModalNuevoGrupo] = useState(false);
  const [errorModalMiembro, setErrorModalMiembro] = useState('');
  const [filtroBusquedaInvestigador, setFiltroBusquedaInvestigador] = useState('');
  const [nuevoMiembro, setNuevoMiembro] = useState({
    usuarioId: null,
    nombre: '',
    correo: '',
    escuela: 'TEC',
    rol: 'Co-Investigador',
    horasSemanales: 10,
    tipoHora: 'VIE'
  });
  const [nuevoGrupo, setNuevoGrupo] = useState({
    nombre: '',
    proyecto: '',
    lider: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}` : 'Lic. William Fallas'
  });

  const handleGestionarEquipo = (eqp) => {
    setEquipoSeleccionado(eqp);
    setFiltroTexto('');
    setFiltroEscuela('Todas');
    setFiltroRol('Todos');
  };

  const handleGuardarMiembro = async (e) => {
    e.preventDefault();
    if (!nuevoMiembro.usuarioId) {
      setErrorModalMiembro('Por favor seleccione un investigador registrado en la base institucional del TEC.');
      return;
    }

    // Verificar si ya está en el equipo
    const yaExiste = equipoSeleccionado?.miembros?.some(m => m.usuarioId === nuevoMiembro.usuarioId);
    if (yaExiste) {
      setErrorModalMiembro('Este investigador ya se encuentra incorporado en este equipo de investigación.');
      return;
    }

    const nuevo = {
      id: nuevoMiembro.usuarioId,
      usuarioId: nuevoMiembro.usuarioId,
      nombre: nuevoMiembro.nombre,
      correo: nuevoMiembro.correo,
      escuela: nuevoMiembro.escuela,
      rol: nuevoMiembro.rol,
      esLider: false
    };

    // Si el equipo corresponde a una propuesta real, guardar en la BD
    if (equipoSeleccionado?.propuestaId) {
      try {
        const payload = {
          integrantes: [
            ...equipoSeleccionado.miembros.map(m => ({
              usuarioId: m.usuarioId || m.id,
              tipoHoraId: 1,
              horasSemanales: 10.0,
              rolEquipoId: m.esLider ? 1 : 2,
              orcid: null
            })),
            {
              usuarioId: nuevo.usuarioId,
              tipoHoraId: 1,
              horasSemanales: 10.0,
              rolEquipoId: 2,
              orcid: null
            }
          ],
          colaboradoresExternos: []
        };
        await propuestaService.guardarEquipoCompleto(equipoSeleccionado.propuestaId, payload);
      } catch (err) {
        console.error('Error al persistir integrante en BD:', err);
      }
    }

    setEquipoSeleccionado(prev => ({
      ...prev,
      totalMiembros: prev.totalMiembros + 1,
      miembros: [...prev.miembros, nuevo]
    }));

    setEquipos(prev => prev.map(eq => 
      eq.codigo === equipoSeleccionado.codigo
        ? { ...eq, totalMiembros: eq.totalMiembros + 1, miembros: [...eq.miembros, nuevo] }
        : eq
    ));

    setModalNuevoMiembro(false);
    setErrorModalMiembro('');
    setFiltroBusquedaInvestigador('');
    setNuevoMiembro({ usuarioId: null, nombre: '', correo: '', escuela: 'TEC', rol: 'Co-Investigador', horasSemanales: 10, tipoHora: 'VIE' });
  };

  const handleEliminarMiembro = (id) => {
    if (!confirm('¿Está seguro de remover a este integrante del equipo de investigación?')) return;
    setEquipoSeleccionado(prev => ({
      ...prev,
      totalMiembros: Math.max(0, prev.totalMiembros - 1),
      miembros: prev.miembros.filter(m => m.id !== id)
    }));

    setEquipos(prev => prev.map(eq => 
      eq.codigo === equipoSeleccionado.codigo
        ? { ...eq, totalMiembros: Math.max(0, eq.totalMiembros - 1), miembros: eq.miembros.filter(m => m.id !== id) }
        : eq
    ));
  };

  const handleCrearGrupo = (e) => {
    e.preventDefault();
    if (!nuevoGrupo.nombre || !nuevoGrupo.proyecto) return;

    const cod = `EQP-0${equipos.length + 1}`;
    const nuevo = {
      codigo: cod,
      nombre: nuevoGrupo.nombre,
      proyecto: nuevoGrupo.proyecto,
      lider: nuevoGrupo.lider,
      liderEmail: usuario?.correo || 'investigador@itcr.ac.cr',
      totalMiembros: 1,
      estado: 'Activo',
      miembros: [
        {
          id: Date.now(),
          nombre: nuevoGrupo.lider,
          correo: usuario?.correo || 'investigador@itcr.ac.cr',
          escuela: 'IE',
          rol: 'Primer Investigador',
          esLider: true
        }
      ]
    };

    setEquipos(prev => [nuevo, ...prev]);
    setModalNuevoGrupo(false);
    setNuevoGrupo({ nombre: '', proyecto: '', lider: '' });
  };

  return (
    <div className="investigador-dashboard-container">
      <div className="dashboard-main-card">
        {equipoSeleccionado ? (
          /* ========================================================
             VISTA 2: DETALLE DE EQUIPO (/equipo según Figma)
             ======================================================== */
          <div className="equipo-detalle-view">
            {/* Breadcrumb superior */}
            <div className="equipo-breadcrumb-bar">
              <button 
                type="button" 
                className="btn-back-breadcrumb"
                onClick={() => setEquipoSeleccionado(null)}
              >
                ‹ Volver a la lista de Equipos
              </button>
              <span className="breadcrumb-meta">| Bloque 1 / 2027 / {equipoSeleccionado.totalMiembros} Miembros</span>
            </div>

            {/* Cabecera del Equipo */}
            <div className="dashboard-header-row" style={{ marginTop: '16px' }}>
              <div className="dashboard-title-group">
                <h1 className="dashboard-main-title">{equipoSeleccionado.nombre}</h1>
                <p className="dashboard-subtitle">
                  Proyecto adscrito: <strong>{equipoSeleccionado.proyecto}</strong> | Total integrantes: <strong>{equipoSeleccionado.totalMiembros} Miembros</strong>
                </p>
              </div>
              <div className="dashboard-actions-group">
                <button 
                  type="button" 
                  className="btn-nueva-propuesta"
                  onClick={() => setModalNuevoMiembro(true)}
                >
                  + Añadir Miembro
                </button>
              </div>
            </div>

            {/* Filtros de Miembros */}
            <div className="propuestas-filters-bar" style={{ marginBottom: '20px' }}>
              <div className="filter-search-box" style={{ flex: 2 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <LimitedInput
                  type="text"
                  placeholder="Buscar integrante por nombre o correo..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  maxLength={100}
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
                <option value="IE">IE (Electrónica)</option>
                <option value="IC">IC (Computación)</option>
                <option value="ITI">ITI</option>
                <option value="AFV">AFV</option>
                <option value="C">C (Química)</option>
              </select>

              <select 
                value={filtroRol} 
                onChange={(e) => setFiltroRol(e.target.value)}
                className="filter-select"
              >
                <option value="Todos">Rol: Todos ▾</option>
                <option value="Primer Investigador">Primer Investigador</option>
                <option value="Co-Investigador">Co-Investigador</option>
                <option value="Asistente TEC">Asistente TEC</option>
                <option value="Colaborador">Colaborador</option>
              </select>

              <button 
                type="button" 
                className="btn-limpiar-filtros"
                onClick={() => alert('Exportando lista de integrantes en formato oficial Excel...')}
              >
                Exportar
              </button>
            </div>

            {/* Tabla de Integrantes */}
            <div className="table-responsive-container">
              <table className="institucional-data-table">
                <thead>
                  <tr>
                    <th>INTEGRANTE / NOMBRE</th>
                    <th>CORREO INSTITUCIONAL</th>
                    <th>ESCUELA</th>
                    <th>ROL EN EQUIPO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {equipoSeleccionado.miembros
                    .filter(m => {
                      const txt = (m.nombre + ' ' + m.correo).toLowerCase();
                      const okTxt = txt.includes(filtroTexto.toLowerCase());
                      const okEsc = filtroEscuela === 'Todas' || m.escuela === filtroEscuela;
                      const okRol = filtroRol === 'Todos' || m.rol.includes(filtroRol);
                      return okTxt && okEsc && okRol;
                    })
                    .map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="member-avatar-circle">
                              {m.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <span style={{ fontWeight: 600, color: '#002855' }}>{m.nombre}</span>
                          </div>
                        </td>
                        <td style={{ color: '#475569' }}>{m.correo}</td>
                        <td>
                          <span className="school-tag-pill">{m.escuela}</span>
                        </td>
                        <td>
                          <span className={`rol-tag-pill ${m.esLider ? 'rol-lider' : ''}`}>
                            {m.rol}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-icon-action"
                            title="Editar miembro"
                            onClick={() => alert(`Editar rol o datos de ${m.nombre}`)}
                          >
                            ✎
                          </button>
                          {!m.esLider && (
                            <button 
                              type="button" 
                              className="btn-icon-action btn-icon-delete"
                              title="Remover del equipo"
                              onClick={() => handleEliminarMiembro(m.id)}
                            >
                              🗑
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================
             VISTA 1: LISTADO GENERAL DE EQUIPOS (/equipos según Figma)
             ======================================================== */
          <div className="equipos-lista-view">
            <div className="dashboard-header-row">
              <div className="dashboard-title-group">
                <h1 className="dashboard-main-title">Equipos de Investigación</h1>
                <p className="dashboard-subtitle">
                  Administra los grupos de trabajo asignados a propuestas activas de investigación.
                </p>
              </div>
              <div className="dashboard-actions-group">
                <button 
                  type="button" 
                  className="btn-nueva-propuesta"
                  onClick={() => setModalNuevoGrupo(true)}
                >
                  + Nuevo Grupo
                </button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="propuestas-filters-bar" style={{ marginBottom: '20px' }}>
              <div className="filter-search-box" style={{ flex: 2 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <LimitedInput
                  type="text"
                  placeholder="Buscar por equipo o investigación..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  maxLength={100}
                  className="filter-search-input"
                  containerStyle={{ flex: 1 }}
                  style={{ border: 'none', outline: 'none', background: 'transparent' }}
                />
              </div>

              <select className="filter-select">
                <option value="All">Código Grupo: All ▾</option>
                <option value="EQP-01">EQP-01</option>
                <option value="EQP-02">EQP-02</option>
                <option value="EQP-03">EQP-03</option>
              </select>

              <select className="filter-select">
                <option value="reciente">Más reciente ▾</option>
                <option value="antiguo">Más antiguo ▾</option>
              </select>

              <button 
                type="button" 
                className="btn-limpiar-filtros"
                onClick={() => setFiltroTexto('')}
              >
                Limpiar
              </button>
            </div>

            {/* Tabla de Equipos */}
            <div className="table-responsive-container">
              <table className="institucional-data-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>NOMBRE DEL GRUPO Y PROYECTO</th>
                    <th>MIEMBROS</th>
                    <th>LÍDER DE GRUPO</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos
                    .filter(eq => (eq.nombre + ' ' + eq.proyecto + ' ' + eq.codigo).toLowerCase().includes(filtroTexto.toLowerCase()))
                    .map((eq) => (
                      <tr key={eq.codigo}>
                        <td>
                          <span className="propuesta-codigo-pill">{eq.codigo}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#002855' }}>{eq.nombre}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>{eq.proyecto}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div className="stacked-avatars">
                              <span className="mini-avatar av-1"></span>
                              <span className="mini-avatar av-2"></span>
                              <span className="mini-avatar av-3"></span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                              ({eq.totalMiembros})
                            </span>
                          </div>
                        </td>
                        <td style={{ color: '#1e293b', fontWeight: 500 }}>{eq.lider}</td>
                        <td>
                          <span className={`badge-status ${eq.estado === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                            {eq.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn-conv-aplicar"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => handleGestionarEquipo(eq)}
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>

      {/* Modal Añadir Miembro */}
      {modalNuevoMiembro && (() => {
        const investigadoresFiltrados = investigadoresBD.filter(u => {
          if (!filtroBusquedaInvestigador) return true;
          const q = filtroBusquedaInvestigador.toLowerCase();
          return (
            (u.nombreCompleto || '').toLowerCase().includes(q) ||
            (u.correo || '').toLowerCase().includes(q) ||
            (u.escuela || '').toLowerCase().includes(q)
          );
        });

        return (
          <div 
            className="crear-propuesta-modal-overlay" 
            onClick={() => { setModalNuevoMiembro(false); setErrorModalMiembro(''); }}
          >
            <div 
              className="crear-propuesta-modal-card" 
              style={{ 
                maxWidth: '600px', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0, 40, 85, 0.3), 0 0 0 1px rgba(0, 40, 85, 0.08)' 
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con gradiente institucional */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, #002855 0%, #0369a1 100%)', 
                  color: '#ffffff', 
                  padding: '20px 24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '10px', 
                    background: 'rgba(255, 255, 255, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.2px', color: '#ffffff' }}>
                      Añadir Integrante al Equipo
                    </h3>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '3px' }}>
                      {equipoSeleccionado?.nombre ? `Equipo: ${equipoSeleccionado.nombre}` : 'Equipo de Investigación'}
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setModalNuevoMiembro(false); setErrorModalMiembro(''); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    color: '#ffffff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                    lineHeight: 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                  aria-label="Cerrar modal"
                >
                  ✕
                </button>
              </div>

              {/* Formulario / Contenido */}
              <form onSubmit={handleGuardarMiembro} style={{ margin: 0 }}>
                <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* Banner de ayuda contextual */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '10px', 
                    padding: '12px 14px', 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #bae6fd', 
                    borderRadius: '8px', 
                    fontSize: '13px', 
                    color: '#0369a1',
                    lineHeight: '1.45'
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>ℹ️</span>
                    <div>
                      Seleccione a un investigador o funcionario docente activo del <strong>padrón institucional del TEC</strong> para incorporarlo formalmente a este equipo.
                    </div>
                  </div>

                  {/* Buscador y Selector de Investigador */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>
                        Investigador Registrado en Base de Datos *
                      </label>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {investigadoresFiltrados.length} encontrados
                      </span>
                    </div>

                    {/* Input de filtro rápido */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <svg 
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} 
                        width="15" 
                        height="15" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Escriba para filtrar por nombre, correo o escuela..."
                        value={filtroBusquedaInvestigador}
                        onChange={(e) => setFiltroBusquedaInvestigador(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 32px',
                          fontSize: '13px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          outline: 'none',
                          background: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Select principal */}
                    <select
                      className="modal-form-select"
                      value={nuevoMiembro.usuarioId || ''}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '13px',
                        border: '1.5px solid ' + (nuevoMiembro.usuarioId ? '#0369a1' : '#cbd5e1'),
                        borderRadius: '8px',
                        background: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onChange={(e) => {
                        setErrorModalMiembro('');
                        const uId = Number(e.target.value);
                        const selUsu = investigadoresBD.find(u => u.usuarioId === uId);
                        if (selUsu) {
                          setNuevoMiembro({
                            ...nuevoMiembro,
                            usuarioId: selUsu.usuarioId,
                            nombre: selUsu.nombreCompleto,
                            correo: selUsu.correo,
                            escuela: selUsu.escuela || 'TEC'
                          });
                        } else {
                          setNuevoMiembro({
                            ...nuevoMiembro,
                            usuarioId: null,
                            nombre: '',
                            correo: '',
                            escuela: 'TEC'
                          });
                        }
                      }}
                    >
                      <option value="">-- Seleccione un Investigador TEC --</option>
                      {investigadoresFiltrados.map(u => (
                        <option key={u.usuarioId} value={u.usuarioId}>
                          {u.nombreCompleto} — {u.correo} ({u.escuela || 'TEC'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tarjeta de preview del Investigador seleccionado */}
                  {nuevoMiembro.usuarioId && nuevoMiembro.nombre && (
                    <div style={{
                      padding: '14px 16px',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      animation: 'fadeInModal 0.2s ease-out'
                    }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#002855',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(0, 40, 85, 0.2)'
                      }}>
                        {obtenerIniciales(nuevoMiembro.nombre)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {nuevoMiembro.nombre}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            ✓ Padrón Institucional TEC
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>✉ {nuevoMiembro.correo}</span>
                          <span>🏫 Instancia: {nuevoMiembro.escuela}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campos secundarios: Rol, Horas y Nombramiento */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px' }}>
                        Rol en el Proyecto *
                      </label>
                      <select
                        className="modal-form-select"
                        value={nuevoMiembro.rol}
                        onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, rol: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '13px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#0f172a',
                          cursor: 'pointer',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Co-Investigador">Co-Investigador</option>
                        <option value="Co-Investigadora">Co-Investigadora</option>
                        <option value="Investigador Asociado">Investigador Asociado</option>
                        <option value="Asistente TEC">Asistente de Investigación TEC</option>
                        <option value="Colaborador">Colaborador Técnico</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px' }}>
                        Dedicación Semanal *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          step="0.5"
                          required
                          value={nuevoMiembro.horasSemanales || 10}
                          onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, horasSemanales: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 48px 10px 12px',
                            fontSize: '13px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ 
                          position: 'absolute', 
                          right: '12px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: '#64748b', 
                          pointerEvents: 'none' 
                        }}>
                          hrs/sem
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mensaje de error / advertencia inline */}
                  {errorModalMiembro && (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#b91c1c',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⚠️</span>
                      <span>{errorModalMiembro}</span>
                    </div>
                  )}
                </div>

                {/* Footer con botones de acción */}
                <div style={{
                  padding: '16px 26px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button 
                    type="button" 
                    className="btn-proposal-action btn-outline"
                    onClick={() => { setModalNuevoMiembro(false); setErrorModalMiembro(''); }}
                    style={{ padding: '9px 18px', fontSize: '13px', borderRadius: '6px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-nueva-propuesta"
                    style={{ 
                      padding: '9px 20px', 
                      fontSize: '13px', 
                      borderRadius: '6px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontWeight: 600
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Guardar Integrante
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Nuevo Grupo */}
      {modalNuevoGrupo && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setModalNuevoGrupo(false)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">+ Crear Nuevo Grupo de Investigación</div>
              <button type="button" className="btn-modal-close" onClick={() => setModalNuevoGrupo(false)}>✕</button>
            </div>
            <form onSubmit={handleCrearGrupo} style={{ padding: '24px' }}>
              <div className="modal-form-group">
                <LimitedInput 
                  label="Nombre del Grupo"
                  required
                  type="text" 
                  maxLength={100}
                  placeholder="Ej: Laboratorio de Inteligencia Artificial Aplicada"
                  className="modal-form-input"
                  value={nuevoGrupo.nombre}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombre: e.target.value })}
                />
              </div>

              <div className="modal-form-group">
                <LimitedInput 
                  label="Proyecto / Temática Adscrita"
                  required
                  type="text" 
                  maxLength={300}
                  placeholder="Ej: Automatización de Diagnóstico por Imágenes"
                  className="modal-form-input"
                  value={nuevoGrupo.proyecto}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, proyecto: e.target.value })}
                />
              </div>

              <div className="modal-form-group">
                <LimitedInput 
                  label="Líder o Investigador Principal"
                  type="text" 
                  maxLength={100}
                  className="modal-form-input"
                  value={nuevoGrupo.lider}
                  onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, lider: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => setModalNuevoGrupo(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-nueva-propuesta">
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestigadorEquipos;
