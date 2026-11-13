// src/components/ImpersonationBanner.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ImpersonationBanner() {
  const [rolSimulado, setRolSimulado] = useState(null);

  useEffect(() => {
    setRolSimulado(localStorage.getItem('rol_simulado'));
  }, []);

  // Si no hay rol simulado, no renderizamos nada
  if (!rolSimulado) return null;

  const handleVolver = () => {
    const tokenOriginal = localStorage.getItem('token_original');
    if (tokenOriginal) {
      localStorage.setItem('token', tokenOriginal);
      localStorage.removeItem('token_original');
      localStorage.removeItem('rol_simulado');
      toast.success('Rol original restaurado');
      window.location.href = '/dashboard';
    }
  };

  return (
    <div style={{
      backgroundColor: '#1e293b', // Fondo oscuro discreto (slate-800)
      color: '#e2e8f0',
      padding: '8px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      borderTop: '1px solid #334155',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)', // Sombra hacia arriba
      position: 'fixed',
      bottom: 0, // <-- CAMBIO CLAVE: Pegado abajo
      left: 0,
      right: 0,
      zIndex: 9999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Lado izquierdo: Indicador de estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '20px', 
          height: '20px', 
          borderRadius: '50%', 
          backgroundColor: '#f59e0b', 
          color: '#fff',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          ⚠
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Modo de prueba activo
          </span>
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px' }}>
            Simulando: {rolSimulado}
          </span>
        </div>
      </div>

      {/* Lado derecho: Botón de acción */}
      <button 
        onClick={handleVolver}
        style={{
          backgroundColor: 'transparent',
          color: '#cbd5e1',
          border: '1px solid #475569',
          padding: '6px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#334155';
          e.target.style.color = '#f8fafc';
          e.target.style.borderColor = '#64748b';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#cbd5e1';
          e.target.style.borderColor = '#475569';
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 14 4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
        </svg>
        Restaurar rol original
      </button>
    </div>
  );
}