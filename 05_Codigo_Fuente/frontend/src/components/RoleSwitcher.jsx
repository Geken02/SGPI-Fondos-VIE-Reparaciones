// src/components/RoleSwitcher.jsx
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import '../styles/role-switcher.css';

const ROLES_DISPONIBLES = [
  { 
    id: 'SuperAdministrador', 
    nombre: 'Super Administrador', 
    icono: '👑', 
    color: '#9333ea',
    colorBg: '#f3e8ff',
    descripcion: 'Control total del sistema. Gestiona catálogos, usuarios, roles y puede simular cualquier otro rol para pruebas.'
  },
  { 
    id: 'InvestigadorCoordinador', 
    nombre: 'Investigador Coordinador', 
    icono: '🔬', 
    color: '#2563eb',
    colorBg: '#dbeafe',
    descripcion: 'Lidera el equipo de investigación. Elabora y envía la propuesta completa (Form-04, 05, 06) al sistema.'
  },
  { 
    id: 'EvaluadorVinculacion', 
    nombre: 'Evaluador de Vinculación', 
    icono: '🔗', 
    color: '#0891b2',
    colorBg: '#cffafe',
    descripcion: 'Personal del Centro de Vinculación. Evalúa el potencial de innovación, Propiedad Intelectual y nivel TRL.'
  },
  { 
    id: 'AsistenteComiteTecnico', 
    nombre: 'Asistente Comité Técnico', 
    icono: '📋', 
    color: '#059669',
    colorBg: '#d1fae5',
    descripcion: 'Recibe y revisa la completitud del contenido de las propuestas antes de pasarlas a evaluación.'
  },
  { 
    id: 'CoordinadorComiteTecnico', 
    nombre: 'Coordinador Comité Técnico', 
    icono: '🎯', 
    color: '#16a34a',
    colorBg: '#dcfce7',
    descripcion: 'Coordina el proceso de evaluación, consolida notas de evaluadores y emite el dictamen final.'
  },
  { 
    id: 'DirectorEscuela', 
    nombre: 'Director de Escuela', 
    icono: '🏫', 
    color: '#65a30d',
    colorBg: '#ecfccb',
    descripcion: 'Participa en la evaluación técnica de propuestas de su dependencia y valida el aval institucional.'
  },
  { 
    id: 'ProfesorEvaluador', 
    nombre: 'Profesor Evaluador', 
    icono: '📝', 
    color: '#84cc16',
    colorBg: '#f0fdf4',
    descripcion: 'Evalúa la propuesta usando la rúbrica CIE de forma independiente y asigna una calificación.'
  },
  { 
    id: 'AsistenteConsejoEscuela', 
    nombre: 'Asistente Consejo Escuela', 
    icono: '📄', 
    color: '#eab308',
    colorBg: '#fef9c3',
    descripcion: 'Recibe la calificación del Comité Técnico y la enruta al Consejo de Profesores para revisión.'
  },
  { 
    id: 'MiembroConsejoEscuela', 
    nombre: 'Consejo de Profesores', 
    icono: '', 
    color: '#f59e0b',
    colorBg: '#fef3c7',
    descripcion: 'Cuerpo colegiado que analiza la propuesta, aprueba o rechaza mediante votación y genera el aval.'
  },
  { 
    id: 'DireccionEscuela', 
    nombre: 'Dirección Escuela', 
    icono: '️', 
    color: '#d97706',
    colorBg: '#fed7aa',
    descripcion: 'Firma digitalmente el Acuerdo de Consejo (Form-07/08) y comunica el aval oficial a la VIE.'
  },
  { 
    id: 'GestoraVIE', 
    nombre: 'Gestora VIE', 
    icono: '🔍', 
    color: '#ea580c',
    colorBg: '#ffedd5',
    descripcion: 'Revisa contenidos, completitud y envía observaciones a los investigadores antes del CIE.'
  },
  { 
    id: 'MiembroCIE', 
    nombre: 'Miembro CIE', 
    icono: '️', 
    color: '#dc2626',
    colorBg: '#fee2e2',
    descripcion: 'Miembro del Consejo de Investigación y Extensión. Evalúa con rúbrica VIE y determina aprobación o rechazo.'
  },
  { 
    id: 'DireccionInvestigacion', 
    nombre: 'Dirección Investigación', 
    icono: '📢', 
    color: '#be123c',
    colorBg: '#ffe4e6',
    descripcion: 'Recibe los dictámenes del CIE y notifica formalmente la aprobación o rechazo a los investigadores.'
  },
];

const ROLES_POR_PAGINA = 6;

export default function RoleSwitcher({ usuarioActual, isOpen, onClose }) {
  const [paginaActual, setPaginaActual] = useState(0);
  const [rolHovered, setRolHovered] = useState(null);
  const [cargando, setCargando] = useState(false);
  const modalRef = useRef(null);

  const totalPaginas = Math.ceil(ROLES_DISPONIBLES.length / ROLES_POR_PAGINA);
  
  const rolesPagina = ROLES_DISPONIBLES.slice(
    paginaActual * ROLES_POR_PAGINA,
    (paginaActual + 1) * ROLES_POR_PAGINA
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSeleccionarRol = async (rol) => {
    setCargando(true);
    try {
      // Guardar el token original antes de cambiar
      const tokenOriginal = localStorage.getItem('token');
      localStorage.setItem('token_original', tokenOriginal);

      // Llamar al endpoint de impersonación del backend
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenOriginal}`
        },
        body: JSON.stringify({ rol_nombre: rol.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al cambiar de rol');
      }

      const data = await response.json();
      
      // Guardar el nuevo token de simulación
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('rol_simulado', data.rolSimulado);
      
      toast.success(`Simulando: ${data.rolSimulado}`);
      onClose();
      
      // Recargar la aplicación para actualizar el contexto de autenticación
      window.location.href = '/dashboard'; 
      
    } catch (error) {
      console.error('Error en impersonation:', error);
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  };

  const irAPaginaAnterior = () => {
    setPaginaActual(prev => Math.max(0, prev - 1));
    setRolHovered(null);
  };

  const irAPaginaSiguiente = () => {
    setPaginaActual(prev => Math.min(totalPaginas - 1, prev + 1));
    setRolHovered(null);
  };

  if (!isOpen) return null;

  return (
    <div className="role-switcher-overlay">
      <div className="role-modal" ref={modalRef}>
        {/* Header */}
        <div className="role-modal-header">
          <div className="header-info">
            <h2>Modo de Acceso Global</h2>
            <p>Selecciona un rol para simular sus funcionalidades</p>
          </div>
          <button 
            className="btn-cerrar" 
            onClick={onClose} 
            title="Cerrar"
            disabled={cargando}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Contenido principal */}
        <div className="role-modal-body">
          {/* Flecha izquierda */}
          <button 
            className="nav-arrow left"
            onClick={irAPaginaAnterior}
            disabled={paginaActual === 0 || cargando}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Grid de roles */}
          <div className="roles-grid">
            {rolesPagina.map((rol) => (
              <div
                key={rol.id}
                className={`role-card ${rolHovered === rol.id ? 'hovered' : ''} ${cargando ? 'disabled' : ''}`}
                style={{ 
                  '--rol-color': rol.color,
                  '--rol-bg': rol.colorBg
                }}
                onMouseEnter={() => !cargando && setRolHovered(rol.id)}
                onMouseLeave={() => setRolHovered(null)}
                onClick={() => !cargando && handleSeleccionarRol(rol)}
              >
                <div className="role-card-icon">{rol.icono}</div>
                <div className="role-card-name">{rol.nombre}</div>
              </div>
            ))}
          </div>

          {/* Flecha derecha */}
          <button 
            className="nav-arrow right"
            onClick={irAPaginaSiguiente}
            disabled={paginaActual === totalPaginas - 1 || cargando}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Panel de descripción */}
        {rolHovered && !cargando && (
          <div className="role-description-panel">
            <div className="description-content">
              <div className="description-header">
                <span className="description-icon">
                  {ROLES_DISPONIBLES.find(r => r.id === rolHovered)?.icono}
                </span>
                <h3>{ROLES_DISPONIBLES.find(r => r.id === rolHovered)?.nombre}</h3>
              </div>
              <p>{ROLES_DISPONIBLES.find(r => r.id === rolHovered)?.descripcion}</p>
            </div>
          </div>
        )}

        {/* Footer con paginación */}
        <div className="role-modal-footer">
          <div className="pagination-dots">
            {Array.from({ length: totalPaginas }, (_, i) => (
              <button
                key={i}
                className={`dot ${paginaActual === i ? 'active' : ''}`}
                onClick={() => { setPaginaActual(i); setRolHovered(null); }}
                disabled={cargando}
              />
            ))}
          </div>
          <div className="usuario-info">
            👤 {usuarioActual?.nombreUsuario || 'Sistema'} {usuarioActual?.apellido1Usuario || ''}
          </div>
        </div>
      </div>
    </div>
  );
}