import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';
import ProfileDropdown from './ProfileDropdown';
import { notificacionService } from '../services/notificacionService';

const Header = () => {
  const { usuario, rolActivo, formatearNombreRol } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [noLeidasCount, setNoLeidasCount] = useState(0);
  const [altoContraste, setAltoContraste] = useState(false);


  useEffect(() => {
    const preferencia = localStorage.getItem('altoContraste') === 'true';
    setAltoContraste(preferencia);
    if (preferencia) {
      document.body.classList.add('high-contrast-mode');
    }
  }, []);

  const toggleAltoContraste = () => {
    const nuevoEstado = !altoContraste;
    setAltoContraste(nuevoEstado);
    if (nuevoEstado) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
    localStorage.setItem('altoContraste', String(nuevoEstado));
  };

  useEffect(() => {
    const consultarNoLeidas = async () => {
      try {
        const datos = await notificacionService.obtenerConteoNoLeidas();
        setNoLeidasCount(datos?.noLeidas || 0);
      } catch (_e) {
        setNoLeidasCount(0);
      }
    };
    
    consultarNoLeidas();

    const handleActualizar = () => consultarNoLeidas();
    window.addEventListener('propuestaCreada', handleActualizar);
    
    return () => window.removeEventListener('propuestaCreada', handleActualizar);
  }, []);

  const nombreMostrar = usuario?.nombre 
    ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() 
    : 'Usuario';

  const rolMostrar = formatearNombreRol ? formatearNombreRol(rolActivo) : (usuario?.roles?.[0]?.nombreRol || 'Usuario');

  return (
    <header className="tec-header">
      <div className="tec-header-welcome">
        <h1 className="welcome-title">Bienvenido, {nombreMostrar}</h1>
        <p className="welcome-role">{rolMostrar}</p>
      </div>

      <div className="tec-header-actions">
        <div className="tec-search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar propuestas, expedientes..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="search-input"
            aria-label="Buscar propuestas y expedientes"
          />
        </div>

        <button 
          type="button"
          className="btn-alto-contraste"
          onClick={toggleAltoContraste}
          aria-pressed={altoContraste}
          aria-label={altoContraste ? 'Desactivar modo de alto contraste' : 'Activar modo de alto contraste'}
          title={altoContraste ? 'Desactivar alto contraste' : 'Activar alto contraste'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path>
          </svg>
          <span className="sr-only">{altoContraste ? 'Alto contraste activado' : 'Alto contraste desactivado'}</span>
        </button>

        <div className="header-icon-container">
          <button 
            type="button"
            className="btn-notification-bell"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            aria-label={`Notificaciones${noLeidasCount > 0 ? `, ${noLeidasCount} no leídas` : ''}`}
            aria-expanded={showNotifications}
            aria-haspopup="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {noLeidasCount > 0 && (
              <span className="notification-badge-dot" aria-hidden="true"></span>
            )}
          </button>

          <NotificationsDropdown 
            isOpen={showNotifications} 
            onClose={() => setShowNotifications(false)} 
            onActualizarConteo={setNoLeidasCount}
          />
        </div>

        <div className="header-avatar-container">
          <button 
            type="button"
            className="btn-user-avatar"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            aria-label={`Abrir menú de perfil de ${nombreMostrar}`}
            aria-expanded={showProfile}
            aria-haspopup="true"
          >
            <img 
              src="/perfil.png" 
              alt={`Foto de perfil de ${nombreMostrar}`} 
              className="user-avatar-img"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreMostrar)}&background=002855&color=fff`;
              }}
            />
          </button>

          <ProfileDropdown 
            isOpen={showProfile} 
            onClose={() => setShowProfile(false)} 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;