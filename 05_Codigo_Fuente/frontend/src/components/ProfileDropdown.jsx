import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Rutas de Configuración y Ayuda según el rol activo.
// VIE y Dirección tienen sus propias ventanas; el CIE usa las generales del sistema.
const RUTAS_CUENTA = {
  gestora: { configuracion: '/gestora/configuracion', ayuda: '/gestora/ayuda' },
  direccion: { configuracion: '/direccion/configuracion', ayuda: '/direccion/ayuda' },
  cie: { configuracion: '/dashboard/configuracion', ayuda: '/dashboard/ayuda' }
};

// Helper para agrupar roles específicos en categorías de enrutamiento
const obtenerGrupoRol = (rol) => {
  if (rol === 'GestoraVIE' || rol === 'CoordinadoraGestora') return 'gestora';
  if (rol === 'DireccionInvestigacion' || rol === 'DirectorInvestigacion' || rol === 'SubdirectorInvestigacion') return 'direccion';
  if (rol === 'MiembroCIE' || rol === 'CoordinadorCIE' || rol === 'PresidenteCIE') return 'cie';
  return null;
};

const ProfileDropdown = ({ isOpen, onClose }) => {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { usuario, logout, rolActivo, cambiarRol, rolesUsuario, formatearNombreRol } = useAuth();

  // Manejo de clic fuera del dropdown para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Accesibilidad: al abrir, mover el foco al primer elemento del menú.
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const primero = dropdownRef.current.querySelector('[role="menuitem"], [role="option"]');
      if (primero) primero.focus();
    }
  }, [isOpen]);

  // Accesibilidad: navegación con flechas y cierre con Escape dentro del menú.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const node = dropdownRef.current;
    if (!node) return;
    const items = Array.from(node.querySelectorAll('[role="menuitem"], [role="option"]'));
    if (items.length === 0) return;
    e.preventDefault();
    const idx = items.indexOf(document.activeElement);
    let siguiente = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
    if (idx === -1) siguiente = e.key === 'ArrowDown' ? 0 : items.length - 1;
    if (siguiente < 0) siguiente = items.length - 1;
    if (siguiente >= items.length) siguiente = 0;
    items[siguiente].focus();
  };

  if (!isOpen) return null;

  // Lista de roles deduplicada
  const rolesDisponibles = Array.isArray(rolesUsuario) ? Array.from(new Set(rolesUsuario)) : [];

  // Datos del usuario con valores por defecto (fallback)
  const nombreMostrar = usuario?.nombre 
    ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() 
    : 'Dr. Andrés Vargas';

  const correoMostrar = usuario?.correo || usuario?.correo_institucional || 'andres.vargas@itcr.ac.cr';

  // Lógica de enrutamiento dinámico según el rol activo
  const grupoRol = obtenerGrupoRol(rolActivo);
  const rutasCuenta = grupoRol ? RUTAS_CUENTA[grupoRol] : null;
  const rutaConfiguracion = rutasCuenta?.configuracion || '/dashboard/configuracion';

  return (
    <div className="profile-popover" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Cabecera del usuario */}
      <div className="profile-popover-header">
        <img 
          src="/perfil.png" 
          alt={nombreMostrar} 
          className="profile-popover-avatar"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="profile-popover-user-info">
          <div className="profile-popover-name">{nombreMostrar}</div>
          <div className="profile-popover-email">{correoMostrar}</div>
          {rolActivo && (
            <div style={{ fontSize: '12px', color: '#486581', marginTop: '2px' }}>
              {formatearNombreRol(rolActivo)}
            </div>
          )}
        </div>
      </div>

      <div className="profile-popover-divider" />

      {/* Selector de Roles: solo se muestra si la cuenta tiene varios roles asignados */}
      {rolesDisponibles.length > 1 && (
        <>
          <div className="profile-popover-roles-section">
            <div className="profile-roles-label">
              <span>Cambiar de Rol</span>
              <span className="profile-roles-badge">
                {rolesDisponibles.length} roles
              </span>
            </div>

            <div className="profile-roles-list" role="listbox" aria-label="Cambiar de rol">
              {rolesDisponibles.map((rol) => {
                const esActivo = rolActivo === rol;
                const labelRol = formatearNombreRol(rol);
                const icono = rol.toLowerCase().includes('vinculacion') 
                  ? '🔍' 
                  : rol.toLowerCase().includes('investigador') 
                    ? '👨‍🔬' 
                    : '👤';

                return (
                  <button
                    key={rol}
                    type="button"
                    role="option"
                    aria-selected={esActivo}
                    className={`profile-role-item ${esActivo ? 'active' : ''}`}
                    onClick={() => {
                      cambiarRol(rol);
                      onClose();
                      navigate('/dashboard');
                    }}
                  >
                    <span className="role-item-icon">{icono}</span>
                    <span className="role-item-name">{labelRol}</span>
                    {esActivo && <span className="role-item-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="profile-popover-divider" />
        </>
      )}

      {/* Enlaces de Menú */}
      <div className="profile-popover-menu" role="menu">
        <button 
          className="profile-menu-item" 
          role="menuitem"
          onClick={() => {
            onClose();
            navigate('/dashboard/perfil');
          }}
        >
          <span>Mi perfil</span>
        </button>
        
        <button 
          className="profile-menu-item"
          role="menuitem"
          onClick={() => {
            onClose();
            navigate(rutaConfiguracion);
          }}
        >
          <span>Configuración</span>
        </button>
        
        {/* Opción de Ayuda condicional según el rol */}
        {rutasCuenta && (
          <button 
            className="profile-menu-item"
            role="menuitem"
            onClick={() => {
              onClose();
              navigate(rutasCuenta.ayuda);
            }}
          >
            <span>Ayuda</span>
          </button>
        )}
      </div>

      <div className="profile-popover-divider" />

      {/* Cerrar Sesión */}
      <button 
        className="profile-popover-logout" 
        onClick={() => {
          onClose();
          logout();
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default ProfileDropdown;