// src/components/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const Sidebar = () => {
  const { rolActivo } = useAuth();
  const { modalCrearPropuestaAbierto, abrirModalCrearPropuesta } = useModal();
  const location = useLocation();

  // ==========================================
  // DETECCIÓN DE TODOS LOS ROLES
  // ==========================================
  const esAdministrador = rolActivo === 'SuperAdministrador' || rolActivo === 'Administrador';
  
  const esAsistenteComite = rolActivo === 'AsistenteComiteTecnico';
  const esCoordinadorComite = rolActivo === 'CoordinadorComiteTecnico';
  const esMiembroComite = rolActivo === 'MiembroComiteTecnico';
  const esDirectorEscuela = rolActivo === 'DirectorEscuela';
  
  // Agrupación de Consejo de Escuela (según la lógica de Deryan)
  const esConsejoEscuela = [
    'AsistenteConsejoEscuela',
    'MiembroConsejoEscuela',
    'ConsejoProfesores',
    'DirectorEscuela' // Nota: DirectorEscuela también tiene acceso a Comité Técnico
  ].includes(rolActivo);
  
  const esVinculacion = rolActivo === 'EvaluadorVinculacion' || rolActivo === 'Vinculacion' || rolActivo === 'CoordinadorVinculacion';
  
  const esMiembroCIE = rolActivo === 'MiembroCIE';
  const esCoordinadorCIE = rolActivo === 'CoordinadorCIE';
  const esPresidenteCIE = rolActivo === 'PresidenteCIE';
  const esCIE = esMiembroCIE || esCoordinadorCIE || esPresidenteCIE;
  
  const esGestoraVIE = rolActivo === 'GestoraVIE';
  const esCoordinadoraGestora = rolActivo === 'CoordinadoraGestora';
  const esGestora = esGestoraVIE || esCoordinadoraGestora;
  
  const esDirectorInvestigacion = rolActivo === 'DireccionInvestigacion';
  const esSubdirectorInvestigacion = rolActivo === 'SubdirectorInvestigacion';
  const esDireccion = esDirectorInvestigacion || esSubdirectorInvestigacion;
  
  const esInvestigador = rolActivo === 'InvestigadorCoordinador' || rolActivo === 'Investigador' || rolActivo === 'InvestigadorColaborador';

  console.log("🔍 ROL ACTIVO DETECTADO:", rolActivo);
  console.log("🔍 ¿ES DIRECCIÓN?:", esDireccion);

  const isItemActive = (path, isRouterActive) => {
    if (isRouterActive) return true;
    if (path === '/comite-tecnico/propuestas-asignadas' && location.pathname.includes('/expediente/')) return true;
    if (path === '/comite-tecnico/propuestas-asignadas' && location.pathname.includes('/dictamen/')) return true;
    if (path === '/dashboard/dictamenes' && location.pathname.includes('/detalle-dictamen')) return true;
    return false;
  };

  // ==========================================
  // ICONOS SVG REUTILIZABLES
  // ==========================================
  const IconoInicio = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
  const IconoBuscar = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
  const IconoDocumento = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
  const IconoChecklist = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
  const IconoEvaluacion = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
  const IconoUsuarios = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
  const IconoConfig = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
  const IconoCalendario = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
  const IconoEscuela = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>;
  const IconoMas = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
  const IconoEquipo = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
  const IconoHistorial = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
  const IconoVotacion = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
  const IconoCarpeta = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
  const IconoDictamen = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
  const IconoResolucion = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

  // ==========================================
  // RENDERIZADO CONDICIONAL DEL MENÚ
  // ==========================================
  const renderMenu = () => {
    // 1. ADMINISTRADOR
    if (esAdministrador) {
      return (
        <>
          <div className="sidebar-group-title">Administración</div>
          <NavLink to="/dashboard/admin" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoConfig}</span>
            <span className="sidebar-pill-label">Panel de Administrador</span>
          </NavLink>
          <NavLink to="/dashboard/admin/catalogos" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDocumento}</span>
            <span className="sidebar-pill-label">Gestión de Catálogos</span>
          </NavLink>
          <NavLink to="/dashboard/admin/usuarios" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoUsuarios}</span>
            <span className="sidebar-pill-label">Usuarios y Roles</span>
          </NavLink>
          <NavLink to="/dashboard/admin/convocatoria" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCalendario}</span>
            <span className="sidebar-pill-label">Configuración de Convocatoria</span>
          </NavLink>
          <NavLink to="/dashboard/admin/gestoras" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoEscuela}</span>
            <span className="sidebar-pill-label">Asignación de Escuelas</span>
          </NavLink>
        </>
      );
    }

    // 2. COMITÉ TÉCNICO - ASISTENTE
    if (esAsistenteComite) {
      return (
        <>
          <div className="sidebar-group-title">Comité Técnico</div>
          <NavLink to="/comite-tecnico/propuestas-asignadas" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCarpeta}</span>
            <span className="sidebar-pill-label">Propuestas Asignadas</span>
          </NavLink>
          <NavLink to="/comite-tecnico/bandeja-completitud" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoChecklist}</span>
            <span className="sidebar-pill-label">Bandeja de Completitud</span>
          </NavLink>
        </>
      );
    }

    // 3. COMITÉ TÉCNICO - COORDINADOR (Solo gestión, NO evaluación)
    if (esCoordinadorComite) {
      return (
        <>
          <div className="sidebar-group-title">Comité Técnico</div>
          <NavLink to="/comite-tecnico/propuestas-asignadas" className={({ isActive }) => `sidebar-pill-btn ${isItemActive('/comite-tecnico/propuestas-asignadas', isActive) ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCarpeta}</span>
            <span className="sidebar-pill-label">Gestión de Propuestas</span>
          </NavLink>
        </>
      );
    }

    // 4. COMITÉ TÉCNICO - MIEMBRO (Evaluadores)
    if (esMiembroComite) {
      return (
        <>
          <div className="sidebar-group-title">Comité Técnico</div>
          <NavLink to="/comite-tecnico/propuestas-asignadas" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCarpeta}</span>
            <span className="sidebar-pill-label">Propuestas Asignadas</span>
          </NavLink>
          <NavLink to="/comite-tecnico/bandeja-evaluacion" className={({ isActive }) => `sidebar-pill-btn ${isItemActive('/comite-tecnico/bandeja-evaluacion', isActive) ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoEvaluacion}</span>
            <span className="sidebar-pill-label">Bandeja de Evaluación</span>
          </NavLink>
        </>
      );
    }

    // 5. CONSEJO DE ESCUELA (Lógica unificada de Deryan)
    if (esConsejoEscuela) {
      return (
        <>
          <div className="sidebar-group-title">Consejo de Escuela</div>
          <NavLink to="/dashboard/propuestas-consejo" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDocumento}</span>
            <span className="sidebar-pill-label">Propuestas</span>
          </NavLink>
          <NavLink to="/dashboard/votaciones-consejo" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoVotacion}</span>
            <span className="sidebar-pill-label">Votaciones</span>
          </NavLink>
          <NavLink to="/dashboard/acuerdos-consejo" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoChecklist}</span>
            <span className="sidebar-pill-label">Acuerdos</span>
          </NavLink>
        </>
      );
    }

    // 6. VINCULACIÓN
    if (esVinculacion) {
      return (
        <>
          <div className="sidebar-group-title">General</div>
          <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoInicio}</span>
            <span className="sidebar-pill-label">Inicio</span>
          </NavLink>
          <div className="sidebar-group-title">Evaluación</div>
          <NavLink to="/dashboard/bandeja-evaluacion" className={({ isActive }) => `sidebar-pill-btn ${isItemActive('/dashboard/bandeja-evaluacion', isActive) ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoEvaluacion}</span>
            <span className="sidebar-pill-label">Bandeja de evaluación</span>
          </NavLink>
          <NavLink to="/dashboard/dictamenes" className={({ isActive }) => `sidebar-pill-btn ${isItemActive('/dashboard/dictamenes', isActive) ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDictamen}</span>
            <span className="sidebar-pill-label">Mis dictámenes</span>
          </NavLink>
        </>
      );
    }

    // 7. CIE (Comité de Evaluación Interna)
    if (esCIE) {
      return (
        <>
          <div className="sidebar-group-title">Comité de Evaluación Interna</div>
          <NavLink to="/cie/bandeja" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoEvaluacion}</span>
            <span className="sidebar-pill-label">Bandeja de Expedientes</span>
          </NavLink>
          <NavLink to="/cie/resoluciones" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoResolucion}</span>
            <span className="sidebar-pill-label">Resoluciones</span>
          </NavLink>
        </>
      );
    }

    // 8. GESTORA VIE
    if (esGestora) {
      return (
        <>
          <div className="sidebar-group-title">Gestora VIE</div>
          <NavLink to="/gestora/expedientes" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCarpeta}</span>
            <span className="sidebar-pill-label">Expedientes</span>
          </NavLink>
          <NavLink to="/gestora/subsanaciones" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoChecklist}</span>
            <span className="sidebar-pill-label">Subsanaciones</span>
          </NavLink>
          <NavLink to="/gestora/configuracion" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoConfig}</span>
            <span className="sidebar-pill-label">Configuración</span>
          </NavLink>
        </>
      );
    }

    // 9. DIRECCIÓN DE INVESTIGACIÓN
    if (esDireccion) {
      return (
        <>
          <div className="sidebar-group-title">Dirección de Investigación</div>
          <NavLink to="/direccion/dictamenes" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDictamen}</span>
            <span className="sidebar-pill-label">Dictámenes Recibidos</span>
          </NavLink>
          <NavLink to="/direccion/documentos-oficiales" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDocumento}</span>
            <span className="sidebar-pill-label">Documentos Oficiales</span>
          </NavLink>
          <NavLink to="/direccion/configuracion" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoConfig}</span>
            <span className="sidebar-pill-label">Configuración</span>
          </NavLink>
        </>
      );
    }

    // 10. INVESTIGADOR
    if (esInvestigador) {
      return (
        <>
          <div className="sidebar-group-title">General</div>
          <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoInicio}</span>
            <span className="sidebar-pill-label">Inicio</span>
          </NavLink>
          <NavLink to="/dashboard/buscar" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoBuscar}</span>
            <span className="sidebar-pill-label">Buscar</span>
          </NavLink>

          <div className="sidebar-group-title">Mis Proyectos</div>
          <NavLink to="/dashboard/convocatorias" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoCalendario}</span>
            <span className="sidebar-pill-label">Convocatorias activas</span>
          </NavLink>
          <button
            type="button"
            onClick={abrirModalCrearPropuesta}
            className={`sidebar-pill-btn ${modalCrearPropuestaAbierto ? 'active' : ''}`}
            style={{ border: '1px solid var(--tec-azul-principal, #002855)', background: '#ffffff', textAlign: 'left', cursor: 'pointer' }}
          >
            <span className="sidebar-pill-icon">{IconoMas}</span>
            <span className="sidebar-pill-label">Crear propuesta</span>
          </button>
          <NavLink to="/dashboard/equipos" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoEquipo}</span>
            <span className="sidebar-pill-label">Equipo de investigación</span>
          </NavLink>
          <NavLink to="/dashboard/formularios" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDocumento}</span>
            <span className="sidebar-pill-label">Formularios</span>
          </NavLink>
          <NavLink to="/dashboard/historial" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoHistorial}</span>
            <span className="sidebar-pill-label">Historial</span>
          </NavLink>
          <NavLink to="/dashboard/propuestas" className={({ isActive }) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
            <span className="sidebar-pill-icon">{IconoDocumento}</span>
            <span className="sidebar-pill-label">Mis propuestas</span>
          </NavLink>
        </>
      );
    }

    // 11. SIN MENÚ
    return (
      <div style={{ padding: '24px 16px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', textAlign: 'center' }}>
        Sin menú para el rol actual
      </div>
    );
  };

  return (
    <aside className="tec-sidebar">
      <div className="tec-sidebar-logo-container">
        <img 
          src="/Logo-TEC-Blanco.png" 
          alt="Tecnológico de Costa Rica" 
          className="tec-sidebar-logo-img"
          onError={(e) => { e.target.src = '/Logo-TEC-Pagina-Interna.png'; }}
        />
      </div>

      <nav className="tec-sidebar-nav">
        {renderMenu()}
      </nav>
    </aside>
  );
};

export default Sidebar;