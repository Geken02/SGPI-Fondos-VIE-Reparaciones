// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

// ============================================================================
// HELPERS
// ============================================================================
export const formatearNombreRol = (rol) => {
  if (!rol) return 'Sin rol asignado';
  const rolStr = typeof rol === 'string' ? rol : (rol.nombreRol || rol.rol || '');
  
  const mapa = {
    'InvestigadorCoordinador': 'Profesor - Investigador Coordinador',
    'InvestigadorColaborador': 'Profesor - Investigador Colaborador',
    'Investigador': 'Profesor - Investigador',
    'EvaluadorVinculacion': 'Evaluador de Vinculación',
    'Vinculacion': 'Evaluador de Vinculación',
    'SuperAdministrador': 'Administrador del Sistema',
    'MiembroComiteTecnico': 'Miembro Comité Técnico',
    'CoordinadorComiteTecnico': 'Coordinador Comité Técnico',
    'AsistenteComiteTecnico': 'Asistente Comité Técnico',
    'GestoraVIE': 'Gestora VIE',
    'CoordinadoraGestora': 'Coordinadora Gestora',
    'MiembroCIE': 'Miembro CIE',
    'PresidenteCIE': 'Presidente CIE',
    'CoordinadorCIE': 'Coordinador CIE',
    'DirectorEscuela': 'Director de Escuela',
    'DirectorInvestigacion': 'Director de Investigación',
    'SubdirectorInvestigacion': 'Subdirector de Investigación',
    'AsistenteConsejoEscuela': 'Asistente Consejo de Escuela',
    'MiembroConsejoEscuela': 'Miembro Consejo de Escuela',
    'ConsejoProfesores': 'Consejo de Profesores'
  };
  
  return mapa[rolStr] || rolStr;
};

const normalizarUsuario = (datos) => {
  if (!datos) return null;
  
  let rolesArray = [];
  if (Array.isArray(datos.roles)) {
    rolesArray = datos.roles
      .map(r => typeof r === 'string' ? r : (r.nombreRol || r.rol || ''))
      .filter(Boolean);
    rolesArray = Array.from(new Set(rolesArray));
  }

  return {
    ...datos,
    id: datos.usuario_id || datos.usuarioId || datos.id || 1,
    nombre: datos.nombre || datos.nombreUsuario || '',
    apellido1: datos.apellido1 || datos.apellido1Usuario || '',
    apellido2: datos.apellido2 || datos.apellido2Usuario || '',
    correo: datos.correo_institucional || datos.correoInstitucional || datos.correo || '',
    roles: rolesArray,
    escuela: datos.nombre_escuela || datos.nombreEscuela || '',
    escuela_id: datos.escuela_id || datos.escuelaId || null
  };
};

// ============================================================================
// PROVIDER
// ============================================================================
export const AuthProvider = ({ children }) => {
  // 1. Inicializar estado, PRIORIZANDO la suplantación (impersonation) si existe
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario');
      return guardado ? normalizarUsuario(JSON.parse(guardado)) : null;
    } catch {
      return null;
    }
  });
  
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [cargando, setCargando] = useState(true);
  
  const [rolActivo, setRolActivo] = useState(() => {
    // PRIORIDAD 1: Rol simulado (Impersonation desde el RoleSwitcher)
    const rolSimulado = localStorage.getItem('rol_simulado');
    if (rolSimulado) return rolSimulado;
    
    // PRIORIDAD 2: Rol guardado previamente por el usuario
    const guardado = localStorage.getItem('rolActivo');
    return typeof guardado === 'string' ? guardado : null;
  });

  const determinarRolInicial = (roles) => {
    // Si hay suplantación activa, ignoramos la lógica normal y devolvemos el simulado
    const rolSimulado = localStorage.getItem('rol_simulado');
    if (rolSimulado) return rolSimulado;

    if (!roles || roles.length === 0) return null;
    const rolGuardado = localStorage.getItem('rolActivo');
    if (rolGuardado && roles.includes(rolGuardado)) {
      return rolGuardado;
    }
    return roles[0];
  };

  const cargarPerfil = async () => {
    try {
      const perfilRaw = await authService.obtenerPerfil();
      const perfil = normalizarUsuario(perfilRaw);
      setUsuario(perfil);
      localStorage.setItem('usuario', JSON.stringify(perfil));
      
      const rolSeleccionado = determinarRolInicial(perfil.roles);
      setRolActivo(rolSeleccionado);
      
      // Solo guardamos rolActivo en localStorage si NO estamos en modo simulación
      if (!localStorage.getItem('rol_simulado')) {
        if (rolSeleccionado) {
          localStorage.setItem('rolActivo', rolSeleccionado);
        } else {
          localStorage.removeItem('rolActivo');
        }
      }
      return perfil; // ✅ MEJORA: Retorna el perfil para que el llamador pueda validarlo
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      authService.logout();
      setToken(null);
      setUsuario(null);
      setRolActivo(null);
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('rolActivo');
      localStorage.removeItem('rol_simulado');
      localStorage.removeItem('token_original');
      return null; // ✅ MEJORA: Retorna null en caso de error
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) {
      cargarPerfil();
    } else {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (correo, contrasena) => {
    const response = await authService.login({ correo, contrasena });
    const tokenRecibido = response.token_acceso || response.access_token || response.token_Acceso;

    // ✅ MEJORA: Validación temprana del token
    if (!tokenRecibido) {
      throw new Error('El servidor no devolvió un token de acceso.');
    }

    localStorage.setItem('token', tokenRecibido);
    setToken(tokenRecibido);

    // ✅ MEJORA: Captura y valida el perfil retornado, evitando el closure stale de `usuario`
    const perfil = await cargarPerfil();
    if (!perfil) {
      throw new Error('No se pudo cargar el perfil del usuario.');
    }
    
    return perfil;
  };

  const logout = () => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('rolActivo');
    // Limpiar datos de suplantación al cerrar sesión
    localStorage.removeItem('rol_simulado');
    localStorage.removeItem('token_original');
    
    setToken(null);
    setUsuario(null);
    setRolActivo(null);
    window.location.href = '/login';
  };

  const cambiarRol = (nuevoRol) => {
    const rolNombre = typeof nuevoRol === 'string' ? nuevoRol : (nuevoRol?.nombreRol || '');
    const rolesUsuario = Array.isArray(usuario?.roles) ? usuario.roles : [];
    
    // Si estamos en modo simulación, no permitimos cambiar de rol manualmente desde aquí
    if (localStorage.getItem('rol_simulado')) {
      console.warn('No se puede cambiar de rol manualmente mientras se simula otro rol.');
      return;
    }

    if (rolNombre && rolesUsuario.includes(rolNombre)) {
      setRolActivo(rolNombre);
      localStorage.setItem('rolActivo', rolNombre);
    }
  };

  // Determinar roles disponibles para el usuario
  const rolesUsuario = Array.isArray(usuario?.roles) ? usuario.roles : [];
  const rolActivoStr = typeof rolActivo === 'string' ? rolActivo : '';

  // Roles específicos del Consejo de Escuela (Agregados de Deryan)
  const esAsistenteConsejo = rolActivoStr === 'AsistenteConsejoEscuela';
  const esConsejoProfesores = rolActivoStr === 'ConsejoProfesores';
  const esDirectorEscuela = rolActivoStr === 'DirectorEscuela';

  // GARANTÍA: Verificaciones de rol basadas SIEMPRE en el rolActivo (soporta suplantación)
  const esAdministrador = rolActivoStr === 'SuperAdministrador' || rolActivoStr === 'Administrador';
  const esInvestigador = rolActivoStr.includes('Investigador');
  const esVinculacion = rolActivoStr.includes('Vinculacion');
  const esComiteTecnico = rolActivoStr.includes('ComiteTecnico') || esDirectorEscuela;
  const esCIE = rolActivoStr.includes('CIE');
  const esGestora = rolActivoStr.includes('Gestora');
  const esDireccion = rolActivoStr.includes('Direccion') || rolActivoStr.includes('Investigacion');
  const estaAutenticado = !!token;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        login,
        logout,
        estaAutenticado,
        cargando,
        rolActivo: rolActivo || (rolesUsuario.length > 0 ? rolesUsuario[0] : null),
        cambiarRol,
        rolesUsuario,
        esAdministrador,
        esInvestigador,
        esVinculacion,
        esComiteTecnico,
        esCIE,
        esGestora,
        esDireccion,
        esAsistenteConsejo,    // <-- Agregado para el Sidebar/App
        esConsejoProfesores,   // <-- Agregado para el Sidebar/App
        esDirectorEscuela,     // <-- Agregado para el Sidebar/App
        formatearNombreRol,
        cargarPerfil
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};