import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileDropdown = ({ isOpen, onClose }) => {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { usuario, logout, rolActivo, cambiarRol, rolesUsuario, formatearNombreRol } = useAuth();

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

  if (!isOpen) return null;

  // Lista de roles para el selector:
  // Exclusivamente los roles reales que el usuario tiene asignados en la base de datos
  const rolesDisponibles = Array.isArray(rolesUsuario) ? Array.from(new Set(rolesUsuario)) : [];

  const nombreMostrar = usuario?.nombre 
    ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() 
    : 'Dr. Andrés Vargas';

  const correoMostrar = usuario?.correo || usuario?.correo_institucional || 'andres.vargas@itcr.ac.cr';

  return (
    <div className="profile-popover" ref={dropdownRef}>
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
            <div style={{ fontSize: '12px', color: '#627d98', marginTop: '2px' }}>
              {formatearNombreRol(rolActivo)}
            </div>
          )}
        </div>
      </div>

      <div className="profile-popover-divider" />

      {/* Selector de Roles: solo se muestra si la cuenta tiene varios roles asignados en la BD */}
      {rolesDisponibles.length > 1 && (
        <>
          <div className="profile-popover-roles-section">
            <div className="profile-roles-label">
              <span>Cambiar de Rol</span>
              <span className="profile-roles-badge">
                {rolesDisponibles.length} roles
              </span>
            </div>

            <div className="profile-roles-list">
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

      {/* Enlaces de Menú (Perfil y Configuración compartidos entre roles) */}
      <div className="profile-popover-menu">
        <button 
          className="profile-menu-item" 
          onClick={() => {
            onClose();
            navigate('/dashboard/perfil');
          }}
        >
          <span>Mi perfil</span>
        </button>
        <button 
          className="profile-menu-item"
          onClick={() => {
            onClose();
            navigate('/dashboard/configuracion');
          }}
        >
          <span>Configuración</span>
        </button>
      </div>

      <div className="profile-popover-divider" />

      {/* Cerrar Sesión en Rojo EF3340 */}
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
