import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';

const InvestigadorEquipos = () => {
  const { usuario } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEscuela, setFiltroEscuela] = useState('Todas');
  const [filtroRol, setFiltroRol] = useState('Todos');

  useEffect(() => {
    const cargarEquiposDesdeBD = async () => {
      try {
        setCargando(true);
        const misProps = await propuestaService.listarMisPropuestas();
        if (misProps && misProps.length > 0) {
          const dinams = misProps.map((p, idx) => ({
            codigo: `EQP-${String(idx + 1).padStart(2, '0')}`,
            nombre: `Equipo: ${p.codigoPropuesta || 'FVIE'}`,
            proyecto: p.titulo,
            lider: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador Principal',
            liderEmail: usuario?.correo || 'investigador@tec.ac.cr',
            totalMiembros: 1,
            estado: p.nombreEstado || 'Activo',
            miembros: [
              {
                id: 1,
                nombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : 'Investigador Principal',
                correo: usuario?.correo || 'investigador@tec.ac.cr',
                escuela: p.codigoEscuela || p.escuela || usuario?.escuela || 'TEC',
                rol: 'Primer Investigador',
                esLider: true
              }
            ]
          }));
          setEquipos(dinams);
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
  const [nuevoMiembro, setNuevoMiembro] = useState({
    nombre: '',
    correo: '',
    escuela: 'IE',
    rol: 'Co-Investigador'
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

  const handleGuardarMiembro = (e) => {
    e.preventDefault();
    if (!nuevoMiembro.nombre || !nuevoMiembro.correo) return;

    const nuevo = {
      id: Date.now(),
      nombre: nuevoMiembro.nombre,
      correo: nuevoMiembro.correo,
      escuela: nuevoMiembro.escuela,
      rol: nuevoMiembro.rol,
      esLider: nuevoMiembro.rol === 'Primer Investigador'
    };

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
    setNuevoMiembro({ nombre: '', correo: '', escuela: 'IE', rol: 'Co-Investigador' });
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
      {modalNuevoMiembro && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setModalNuevoMiembro(false)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">+ Añadir Miembro al Equipo</div>
              <button type="button" className="btn-modal-close" onClick={() => setModalNuevoMiembro(false)}>✕</button>
            </div>
            <form onSubmit={handleGuardarMiembro} style={{ padding: '24px' }}>
              <div className="modal-form-group">
                <LimitedInput 
                  label="Nombre Completo"
                  required
                  type="text" 
                  maxLength={50}
                  placeholder="Ej: Ing. Laura Mora Solano"
                  className="modal-form-input"
                  value={nuevoMiembro.nombre}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, nombre: e.target.value })}
                />
              </div>

              <div className="modal-form-group">
                <LimitedInput 
                  label="Correo Institucional"
                  required
                  type="email" 
                  maxLength={100}
                  placeholder="lmora@itcr.ac.cr"
                  className="modal-form-input"
                  value={nuevoMiembro.correo}
                  onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, correo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="modal-form-group">
                  <label className="modal-form-label">Escuela / Departamento</label>
                  <select 
                    className="modal-form-select"
                    value={nuevoMiembro.escuela}
                    onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, escuela: e.target.value })}
                  >
                    <option value="IE">IE (Electrónica)</option>
                    <option value="IC">IC (Computación)</option>
                    <option value="ITI">ITI</option>
                    <option value="AFV">AFV</option>
                    <option value="C">C (Química)</option>
                    <option value="BI">BI (Biotecnología)</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">Rol en el Equipo</label>
                  <select 
                    className="modal-form-select"
                    value={nuevoMiembro.rol}
                    onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, rol: e.target.value })}
                  >
                    <option value="Co-Investigador">Co-Investigador</option>
                    <option value="Co-Investigadora">Co-Investigadora</option>
                    <option value="Asistente TEC">Asistente TEC</option>
                    <option value="Colaborador">Colaborador</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => setModalNuevoMiembro(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-nueva-propuesta">
                  Guardar Integrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
