import { useState, useEffect, useRef } from 'react';
import { notificacionService } from '../services/notificacionService';

const NotificationsDropdown = ({ isOpen, onClose, onActualizarConteo }) => {
  const dropdownRef = useRef(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarNotificaciones = async () => {
    try {
      setCargando(true);
      const data = await notificacionService.listarNotificaciones();
      setNotificaciones(data || []);
      if (onActualizarConteo) {
        const noLeidas = (data || []).filter(n => !n.leida).length;
        onActualizarConteo(noLeidas);
      }
    } catch (_err) {
      setNotificaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarNotificaciones();
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
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

  const handleMarcarLeida = async (id, e) => {
    e.stopPropagation();
    try {
      await notificacionService.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      if (onActualizarConteo) {
        onActualizarConteo(prev => Math.max(0, prev - 1));
      }
    } catch (_err) {
      // Ignorar error
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await notificacionService.marcarTodasLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      if (onActualizarConteo) {
        onActualizarConteo(0);
      }
    } catch (_err) {
      // Ignorar error
    }
  };

  if (!isOpen) return null;

  const noLeidasCount = notificaciones.filter(n => !n.leida).length;

  return (
    <div className="notifications-popover" ref={dropdownRef}>
      <div className="notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#002855' }}>
          Notificaciones {noLeidasCount > 0 && <span style={{ color: '#EF3340', fontSize: '13px' }}>({noLeidasCount})</span>}
        </h3>
        {noLeidasCount > 0 && (
          <button 
            type="button" 
            onClick={handleMarcarTodasLeidas}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0369A1', 
              fontSize: '12px', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Marcar todas leídas
          </button>
        )}
      </div>

      <div className="notifications-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
        {cargando ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#627d98', fontSize: '13px' }}>
            Cargando notificaciones...
          </div>
        ) : notificaciones.length > 0 ? (
          notificaciones.map((item) => (
            <div 
              key={item.id} 
              className={`notification-card ${item.leida ? 'leida' : 'no-leida'}`}
              onClick={(e) => !item.leida && handleMarcarLeida(item.id, e)}
              style={{
                cursor: item.leida ? 'default' : 'pointer',
                backgroundColor: item.leida ? '#ffffff' : '#f0f7fc',
                borderLeft: item.leida ? '3px solid transparent' : '3px solid #0369A1',
                padding: '10px 12px',
                marginBottom: '6px',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {!item.leida && <span style={{ color: '#EF3340', fontSize: '10px', marginTop: '4px' }}>●</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: item.leida ? 500 : 700, fontSize: '13px', color: '#002855' }}>
                    {item.asunto}
                  </div>
                  <div style={{ fontSize: '12px', color: '#486581', marginTop: '2px', lineHeight: 1.3 }}>
                    {item.cuerpo}
                  </div>
                  {item.fechaEnvio && (
                    <div style={{ fontSize: '11px', color: '#829ab1', marginTop: '4px' }}>
                      {new Date(item.fechaEnvio).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#627d98', fontSize: '13px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
            No tienes notificaciones registradas.
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'center' }}>
        <button 
          className="btn-view-all-notifications" 
          onClick={onClose}
          style={{ width: '100%', border: 'none', background: 'none', color: '#0369A1', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
