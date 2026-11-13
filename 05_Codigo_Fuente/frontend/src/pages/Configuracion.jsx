import { useState } from 'react';

const Configuracion = () => {
  // Estados de switches de notificación con persistencia
  const [alertasCorreo, setAlertasCorreo] = useState(() => {
    const s = localStorage.getItem('cfg_alertasCorreo');
    return s !== null ? JSON.parse(s) : true;
  });
  const [actualizacionesInvestigacion, setActualizacionesInvestigacion] = useState(() => {
    const s = localStorage.getItem('cfg_actualizacionesInvestigacion');
    return s !== null ? JSON.parse(s) : true;
  });
  const [fechasLimite, setFechasLimite] = useState(() => {
    const s = localStorage.getItem('cfg_fechasLimite');
    return s !== null ? JSON.parse(s) : true;
  });
  const [diasAnticipacion, setDiasAnticipacion] = useState(() => {
    return localStorage.getItem('cfg_diasAnticipacion') || '3 días antes';
  });
  const [aperturaConvocatorias, setAperturaConvocatorias] = useState(() => {
    const s = localStorage.getItem('cfg_aperturaConvocatorias');
    return s !== null ? JSON.parse(s) : true;
  });

  // Lista de asistentes delegados persistente
  const [asistentes, setAsistentes] = useState(() => {
    try {
      const guardado = localStorage.getItem('cfg_asistentes');
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [filtroAsistente, setFiltroAsistente] = useState('');
  const [filtroPermiso, setFiltroPermiso] = useState('Todos');

  // Formulario lateral de asistente
  const [asistenteForm, setAsistenteForm] = useState({
    id: '',
    nombre: '',
    permisos: 'Solo lectura'
  });
  const [editando, setEditando] = useState(false);

  const toggleAlertasCorreo = (val) => {
    setAlertasCorreo(val);
    localStorage.setItem('cfg_alertasCorreo', JSON.stringify(val));
  };
  const toggleActualizaciones = (val) => {
    setActualizacionesInvestigacion(val);
    localStorage.setItem('cfg_actualizacionesInvestigacion', JSON.stringify(val));
  };
  const toggleFechasLimite = (val) => {
    setFechasLimite(val);
    localStorage.setItem('cfg_fechasLimite', JSON.stringify(val));
  };
  const changeDiasAnticipacion = (val) => {
    setDiasAnticipacion(val);
    localStorage.setItem('cfg_diasAnticipacion', val);
  };
  const toggleAperturaConvocatorias = (val) => {
    setAperturaConvocatorias(val);
    localStorage.setItem('cfg_aperturaConvocatorias', JSON.stringify(val));
  };

  const handleSeleccionarEditar = (asistente) => {
    setAsistenteForm(asistente);
    setEditando(true);
  };

  const handleGuardarAsistente = (e) => {
    e.preventDefault();
    if (!asistenteForm.id || !asistenteForm.nombre) return;

    let nuevaLista;
    if (editando) {
      nuevaLista = asistentes.map(a => a.id === asistenteForm.id ? asistenteForm : a);
    } else {
      nuevaLista = [...asistentes, asistenteForm];
    }
    setAsistentes(nuevaLista);
    localStorage.setItem('cfg_asistentes', JSON.stringify(nuevaLista));

    setAsistenteForm({ id: '', nombre: '', permisos: 'Solo lectura' });
    setEditando(false);
  };

  const handleCancelar = () => {
    setAsistenteForm({ id: '', nombre: '', permisos: 'Solo lectura' });
    setEditando(false);
  };

  const asistentesFiltrados = asistentes.filter(a => {
    const coincideTexto = a.nombre.toLowerCase().includes(filtroAsistente.toLowerCase()) || a.id.includes(filtroAsistente);
    const coincidePermiso = filtroPermiso === 'Todos' || a.permisos === filtroPermiso;
    return coincideTexto && coincidePermiso;
  });

  return (
    <div className="configuracion-page-container">
      <div className="dashboard-main-card">
        {/* Sección 1: Notificaciones */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Notificaciones</h1>
            <p className="dashboard-subtitle">
              Configura cómo y cuándo deseas recibir alertas sobre tus convocatorias e investigaciones.
            </p>
          </div>
        </div>

        <div className="config-notificaciones-list">
          {/* Alertas de correo */}
          <div className="config-toggle-item">
            <div className="toggle-info">
              <div className="toggle-title">Alertas de correo</div>
              <div className="toggle-description">Recibir resúmenes y notificaciones directas en tu cuenta institucional.</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={alertasCorreo} 
                onChange={(e) => toggleAlertasCorreo(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Actualizaciones de investigación */}
          <div className="config-toggle-item">
            <div className="toggle-info">
              <div className="toggle-title">Actualizaciones de investigación</div>
              <div className="toggle-description">Avisos cuando los dictámenes o evaluaciones cambian de estado.</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={actualizacionesInvestigacion} 
                onChange={(e) => toggleActualizaciones(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Fechas límite */}
          <div className="config-toggle-item">
            <div className="toggle-info">
              <div className="toggle-title">Fechas límite</div>
              <div className="toggle-description">Recordatorios antes del cierre de entregas y revisiones.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <select 
                value={diasAnticipacion}
                onChange={(e) => changeDiasAnticipacion(e.target.value)}
                className="filter-select"
                style={{ padding: '4px 10px', fontSize: '13px' }}
              >
                <option value="1 día antes">1 día antes</option>
                <option value="3 días antes">3 días antes</option>
                <option value="5 días antes">5 días antes</option>
                <option value="1 semana antes">1 semana antes</option>
              </select>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={fechasLimite} 
                  onChange={(e) => toggleFechasLimite(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* Apertura de Convocatorias */}
          <div className="config-toggle-item">
            <div className="toggle-info">
              <div className="toggle-title">Apertura de Convocatorias</div>
              <div className="toggle-description">Aviso inmediato al publicarse nuevas bases oficiales de fondos VIE.</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={aperturaConvocatorias} 
                onChange={(e) => toggleAperturaConvocatorias(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        <div className="perfil-divider" style={{ margin: '32px 0' }} />

        {/* Sección 2: Delegación de permisos a asistentes */}
        <div className="config-asistentes-section">
          <div className="column-header">
            <h2 className="column-title">Delegación de permisos a asistentes</h2>
            <p className="column-subtitle">
              Permite a asistentes de investigación apoyar en el llenado de formularios o lectura de expedientes.
            </p>
          </div>

          <div className="config-asistentes-grid">
            {/* Tabla izquierda */}
            <div className="config-asistentes-tabla-col">
              {/* Barra de herramientas */}
              <div className="proposals-filters-bar">
                <div className="filter-search-box">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o ID..."
                    value={filtroAsistente}
                    onChange={(e) => setFiltroAsistente(e.target.value)}
                    className="filter-search-input"
                  />
                </div>

                <select 
                  value={filtroPermiso} 
                  onChange={(e) => setFiltroPermiso(e.target.value)}
                  className="filter-select"
                >
                  <option value="Todos">Permisos: Todos ▾</option>
                  <option value="Todos">Todos</option>
                  <option value="Solo lectura">Solo lectura</option>
                  <option value="Edición y lectura">Edición y lectura</option>
                </select>

                <button 
                  type="button" 
                  className="btn-nueva-propuesta"
                  onClick={() => {
                    setAsistenteForm({ id: '', nombre: '', permisos: 'Solo lectura' });
                    setEditando(false);
                  }}
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  + Añadir Asistente
                </button>
              </div>

              {/* Tabla de asistentes */}
              <div className="vinculacion-table-wrapper">
                <table className="vinculacion-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NOMBRE COMPLETO</th>
                      <th>PERMISOS</th>
                      <th>ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistentesFiltrados.length > 0 ? (
                      asistentesFiltrados.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.id}</strong></td>
                          <td>{item.nombre}</td>
                          <td>
                            <span className="badge-permiso">
                              {item.permisos}
                            </span>
                          </td>
                          <td>
                            <button 
                              type="button" 
                              className="btn-proposal-action btn-outline"
                              style={{ padding: '4px 12px', fontSize: '12px' }}
                              onClick={() => handleSeleccionarEditar(item)}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '32px 16px', color: '#627d98' }}>
                          No hay asistentes delegados registrados. Haz clic en "+ Añadir Asistente" para incorporar uno.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tarjeta lateral de Asistente */}
            <div className="config-asistente-card-form">
              <h3 className="modal-title">Asistente</h3>
              <p className="column-subtitle" style={{ marginBottom: '16px' }}>
                Asigne o modifique los permisos de acceso.
              </p>

              <form onSubmit={handleGuardarAsistente} className="modal-form">
                <div className="form-group">
                  <label>Identificación</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 01020010"
                    value={asistenteForm.id}
                    onChange={(e) => setAsistenteForm({ ...asistenteForm, id: e.target.value })}
                    className="modal-input"
                    disabled={editando}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sofía Aguilar"
                    value={asistenteForm.nombre}
                    onChange={(e) => setAsistenteForm({ ...asistenteForm, nombre: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Nivel de Permiso</label>
                  <select
                    value={asistenteForm.permisos}
                    onChange={(e) => setAsistenteForm({ ...asistenteForm, permisos: e.target.value })}
                    className="modal-select"
                  >
                    <option value="Solo lectura">Solo lectura</option>
                    <option value="Edición y lectura">Edición y lectura</option>
                    <option value="Todos">Todos</option>
                  </select>
                </div>

                <div className="modal-actions" style={{ marginTop: '16px' }}>
                  {editando && (
                    <button type="button" className="btn-cancel" onClick={handleCancelar}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn-nueva-propuesta" style={{ width: editando ? 'auto' : '100%' }}>
                    {editando ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
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

export default Configuracion;
