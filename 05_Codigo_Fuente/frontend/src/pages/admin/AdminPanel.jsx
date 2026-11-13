// src/pages/admin/AdminPanel.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import '../../styles/AdminPanel.css';
import RoleSwitcher from '../../components/RoleSwitcher'; 

export default function AdminPanel() {
  // ... el resto de tu código sigue igual ...
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [stats, setStats] = useState({
    propuestasActivas: 0,
    crecimientoPropuestas: '0%',
    escuelasActivas: 0,
    usuariosActivos: 0,
    convocatoriaActiva: { nombre: 'Cargando...', anio: 2024 },
    propuestasPorEstado: [],
    actividadReciente: []
  });
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rolSimulado, setRolSimulado] = useState('SuperAdministrador');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);

      // Conectar con el endpoint del dashboard
      const response = await adminService.obtenerEstadisticasDashboard();
      const data = response.data;

      setStats({
        propuestasActivas: data.propuestasActivas || 0,
        crecimientoPropuestas: data.crecimientoPropuestas || '0%',
        escuelasActivas: data.escuelasActivas || 0,
        usuariosActivos: data.usuariosActivos || 0,
        convocatoriaActiva: data.convocatoriaActiva || { nombre: 'Sin convocatoria', anio: 2024 },
        propuestasPorEstado: data.propuestasPorEstado || [],
        actividadReciente: data.actividadReciente || []
      });

    } catch (err) {
      // 🔹 AQUÍ ESTÁ LA SOLUCIÓN: Si el backend dice 403, redirigimos al usuario
      if (err.response?.status === 403) {
        console.warn("Acceso denegado al panel de admin. Redirigiendo a tu panel...");
        const roles = usuario?.roles?.map(r => r.nombreRol) || [];
        
        if (roles.includes('AsistenteComiteTecnico') || 
            roles.includes('CoordinadorComiteTecnico') || 
            roles.includes('MiembroComiteTecnico') || 
            roles.includes('DirectorEscuela')) {
          navigate('/comite-tecnico/bandeja-completitud', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return; // Salimos de la función para no mostrar el error en pantalla
      }
      
      console.error('Error cargando dashboard:', err);
      setError('Error al cargar los datos del panel');
    } finally {
      setCargando(false);
    }
  };

  const handleSeleccionarRol = (nuevoRol) => {
    setRolSimulado(nuevoRol);
    console.log(`🎭 Simulando acciones como: ${nuevoRol}`);
  };

  // Calcular total para porcentajes
  const totalPropuestas = stats.propuestasPorEstado.reduce((sum, item) => sum + item.cantidad, 0);
  const getPorcentaje = (cantidad) => totalPropuestas === 0 ? 0 : Math.round((cantidad / totalPropuestas) * 100);

  // Colores para estados
  const coloresEstado = {
    'Borrador': '#94a3b8',
    'Enviada a VIE': '#002855',
    'En Evaluación de Vinculación': '#ca8a04',
    'En Comité Técnico': '#f97316',
    'En Consejo de Escuela': '#a78bfa',
    'En CIE': '#ec4899',
    'Aprobada': '#16a34a',
    'Rechazada': '#EF3340',
    'Cancelada': '#64748b'
  };

  if (cargando) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Título */}
      <div className="admin-header">
        <h1>Panel de Administrador</h1>
        <p>Sistema de Gestión de Propuestas de Investigación – Vicerrectoría de Investigación y Extensión (VIE)</p>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS - MANTENER ESTRUCTURA ORIGINAL */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span className={`stat-change ${stats.crecimientoPropuestas.includes('+') ? 'positive' : 'negative'}`}>
              {stats.crecimientoPropuestas}
            </span>
          </div>
          <div className="stat-number">{stats.propuestasActivas}</div>
          <div className="stat-label">Propuestas Activas</div>
          <div className="stat-progress">
            <div className="stat-progress-fill" style={{ width: '70%', background: '#002855' }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="stat-change neutral">→ 0%</span>
          </div>
          <div className="stat-number">{stats.escuelasActivas}</div>
          <div className="stat-label">Escuelas Activas</div>
          <div className="stat-progress">
            <div className="stat-progress-fill gray" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="stat-change positive">↗ 8%</span>
          </div>
          <div className="stat-number">{stats.usuariosActivos}</div>
          <div className="stat-label">Usuarios del Sistema</div>
          <div className="stat-progress">
            <div className="stat-progress-fill blue" style={{ width: '80%' }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="stat-badge">Aprobado</span>
          </div>
          <div className="stat-number">{stats.convocatoriaActiva.anio}</div>
          <div className="stat-label">{stats.convocatoriaActiva.nombre}</div>
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="quick-access-row">
        <Link to="/dashboard/admin/catalogos" className="quick-card">
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <h3>Gestión de Catálogos</h3>
          <p>Administrar Escuelas, Líneas de Investigación, Tipos de Hora y niveles TRL.</p>
          <div className="btn-access">Acceder →</div>
        </Link>

        <Link to="/dashboard/admin/convocatoria" className="quick-card">
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </div>
          <h3>Configuración de Convocatoria</h3>
          <p>Definir fechas límite, plazos de evaluación y bloqueo automático en Orión.</p>
          <div className="btn-access">Acceder →</div>
        </Link>

        <Link to="/dashboard/admin/gestoras" className="quick-card">
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M16 11l2 2 4-4"/>
            </svg>
          </div>
          <h3>Asignación de Escuelas</h3>
          <p>Asignar escuelas específicas a cada Persona Gestora de la VIE.</p>
          <div className="btn-access">Acceder →</div>
        </Link>
      </div>

      {/* ESTADO DE PROPUESTAS + ACTIVIDAD RECIENTE */}
      <div className="bottom-row">
        <div className="card proposals-section">
          <h2>Estado de Propuestas por Módulo</h2>
          <div className="progress-list">
            {stats.propuestasPorEstado.map((item, index) => (
              <div key={index} className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">{item.estado}</span>
                  <span className="progress-stats">{getPorcentaje(item.cantidad)}% ({item.cantidad})</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${getPorcentaje(item.cantidad)}%`,
                      background: coloresEstado[item.estado] || '#002855'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card activity-section">
          <h2>Actividad Reciente del Sistema</h2>
          {stats.actividadReciente.length === 0 ? (
            <p className="no-activity">Sin actividad reciente</p>
          ) : (
            <div className="activity-list">
              {stats.actividadReciente.slice(0, 5).map((log) => (
                <div key={log.logId} className="activity-item">
                  <span className="activity-icon"></span>
                  <div className="activity-content">
                    <p className="activity-desc">{log.descripcion}</p>
                    <p className="activity-date">
                      {new Date(log.fecha).toLocaleString('es-CR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/dashboard/admin/bitacora" className="view-all">Ver toda la actividad →</Link>
        </div>
      </div>

      {/* Gestión de Usuarios */}
      <div className="card users-section">
        <div className="users-content">
          <div className="users-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="users-info">
            <h3>Gestión de Usuarios y Roles</h3>
            <p>Crear, editar y asignar roles y permisos</p>
          </div>
        </div>
        <Link to="/dashboard/admin/usuarios" className="btn-outline">Acceder →</Link>
      </div>

      {/* Modo Global SuperAdmin */}
      <div className="card modo-global-card">
        <div className="modo-global-content">
          <div className="modo-global-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="modo-global-info">
            <h3>Modo de Acceso Global (SuperAdmin)</h3>
            <p>Simular cualquier rol para pruebas y carga de datos</p>
          </div>
          
          <button 
            className="btn-activar"
            onClick={() => setModalAbierto(true)}
          >
            {rolSimulado !== 'SuperAdministrador' 
              ? `Simulando: ${rolSimulado} (Cambiar)` 
              : 'Activar →'}
          </button>
        </div>
      </div>

      {/* RoleSwitcher Modal */}
      <RoleSwitcher 
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onRoleChange={handleSeleccionarRol}
        usuarioActual={{ nombreUsuario: 'Sistema', apellido1Usuario: 'Administrador' }}
      />
    </div>
  );
}