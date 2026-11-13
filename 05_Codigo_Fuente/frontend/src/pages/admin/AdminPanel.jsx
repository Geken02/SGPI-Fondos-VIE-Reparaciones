import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import '../../styles/AdminPanel.css';
import RoleSwitcher from '../../components/RoleSwitcher'; 

export default function AdminPanel() {
  const navigate = useNavigate();
  const { usuario, rolActivo } = useAuth();

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
      if (err.response?.status === 403) {
        console.warn("Acceso denegado al panel de admin. Redirigiendo a tu panel...");
        const rolesComite = ['AsistenteComiteTecnico', 'CoordinadorComiteTecnico', 'MiembroComiteTecnico', 'DirectorEscuela'];
        
        if (rolesComite.includes(rolActivo)) {
          navigate('/comite-tecnico/bandeja-completitud', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
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

  const totalPropuestas = stats.propuestasPorEstado.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  const getPorcentaje = (cantidad) => totalPropuestas === 0 ? 0 : Math.round((cantidad / totalPropuestas) * 100);

  const MAX_PROPUESTAS = 12;
  const MAX_ESCUELAS = 11;
  const MAX_USUARIOS = 30;
  const calcPct = (valor, max) => Math.min(100, Math.round((valor / max) * 100));

  const coloresEstado = {
    'Borrador': 'var(--color-gris, #94a3b8)',
    'Enviada a VIE': 'var(--color-primario, #002855)',
    'En Evaluación de Vinculación': 'var(--color-amarillo, #ca8a04)',
    'En Comité Técnico': 'var(--color-naranja, #f97316)',
    'En Consejo de Escuela': 'var(--color-morado, #a78bfa)',
    'En CIE': 'var(--color-rosa, #ec4899)',
    'Aprobada': 'var(--color-verde, #16a34a)',
    'Rechazada': 'var(--color-rojo, #EF3340)',
    'Cancelada': 'var(--color-gris-oscuro, #64748b)'
  };

  if (cargando) {
    return (
      <main className="admin-loading" aria-live="polite">
        <div className="loading-spinner" role="status">
          <span className="sr-only">Cargando panel de administración...</span>
        </div>
        <p>Cargando panel de administración...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-error" aria-live="assertive" role="alert">
        <p>{error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </main>
    );
  }

  return (
    <main className="admin-container">
      <header className="admin-header">
        <h1 id="titulo-panel">Panel de Administrador</h1>
        <p>Sistema de Gestión de Propuestas de Investigación – Vicerrectoría de Investigación y Extensión (VIE)</p>
      </header>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <section className="stats-row" aria-labelledby="titulo-estadisticas">
        <h2 id="titulo-estadisticas" className="sr-only">Estadísticas Generales del Sistema</h2>
        
        {/* ✅ CORRECCIÓN: tabIndex={0} y role="group" para que el foco se detenga aquí con Tab */}
        <div 
          className="stat-card" 
          tabIndex={0} 
          role="group"
          aria-label={`Tarjeta de estadísticas: ${stats.propuestasActivas} Propuestas Activas`}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
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
          <div 
            className="stat-progress"
            role="progressbar"
            aria-valuenow={calcPct(stats.propuestasActivas, MAX_PROPUESTAS)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${stats.propuestasActivas} propuestas activas de ${MAX_PROPUESTAS} posibles: ${calcPct(stats.propuestasActivas, MAX_PROPUESTAS)} por ciento`}
          >
            <div className="stat-progress-fill" style={{ width: `${calcPct(stats.propuestasActivas, MAX_PROPUESTAS)}%`, background: 'var(--color-primario, #002855)' }}></div>
          </div>
        </div>

        <div 
          className="stat-card" 
          tabIndex={0} 
          role="group"
          aria-label={`Tarjeta de estadísticas: ${stats.escuelasActivas} Escuelas Activas`}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span className="stat-change neutral">→ 0%</span>
          </div>
          <div className="stat-number">{stats.escuelasActivas}</div>
          <div className="stat-label">Escuelas Activas</div>
          <div 
            className="stat-progress"
            role="progressbar"
            aria-valuenow={calcPct(stats.escuelasActivas, MAX_ESCUELAS)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${stats.escuelasActivas} escuelas activas de ${MAX_ESCUELAS}: ${calcPct(stats.escuelasActivas, MAX_ESCUELAS)} por ciento`}
          >
            <div className="stat-progress-fill gray" style={{ width: `${calcPct(stats.escuelasActivas, MAX_ESCUELAS)}%` }}></div>
          </div>
        </div>

        <div 
          className="stat-card" 
          tabIndex={0} 
          role="group"
          aria-label={`Tarjeta de estadísticas: ${stats.usuariosActivos} Usuarios del Sistema`}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
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
          <div 
            className="stat-progress"
            role="progressbar"
            aria-valuenow={calcPct(stats.usuariosActivos, MAX_USUARIOS)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${stats.usuariosActivos} usuarios de ${MAX_USUARIOS} cupos: ${calcPct(stats.usuariosActivos, MAX_USUARIOS)} por ciento`}
          >
            <div className="stat-progress-fill blue" style={{ width: `${calcPct(stats.usuariosActivos, MAX_USUARIOS)}%` }}></div>
          </div>
        </div>

        <div 
          className="stat-card" 
          tabIndex={0} 
          role="group"
          aria-label={`Tarjeta de estadísticas: Convocatoria Activa ${stats.convocatoriaActiva.anio}`}
        >
          <div className="stat-top">
            <div className="stat-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="stat-badge" aria-label="Estado de la convocatoria: Aprobada">Aprobado</span>
          </div>
          <div className="stat-number">{stats.convocatoriaActiva.anio}</div>
          <div className="stat-label">{stats.convocatoriaActiva.nombre}</div>
        </div>
      </section>

      {/* ACCESOS RÁPIDOS */}
      <section className="quick-access-row" aria-labelledby="titulo-accesos">
        <h2 id="titulo-accesos" className="sr-only">Accesos Rápidos a Módulos de Administración</h2>
        
        {/* ✅ CORRECCIÓN: tabIndex={0} explícito para garantizar que el enlace sea focusable */}
        <Link 
          to="/dashboard/admin/catalogos" 
          className="quick-card"
          tabIndex={0}
          aria-label="Acceder a Gestión de Catálogos: administrar Escuelas, Líneas de Investigación, Tipos de Hora y niveles TRL"
        >
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <h3>Gestión de Catálogos</h3>
          <p>Administrar Escuelas, Líneas de Investigación, Tipos de Hora y niveles TRL.</p>
          <div className="btn-access" aria-hidden="true">Acceder →</div>
        </Link>

        <Link 
          to="/dashboard/admin/convocatoria" 
          className="quick-card"
          tabIndex={0}
          aria-label="Acceder a Configuración de Convocatoria: definir fechas límite, plazos de evaluación y bloqueo automático en Orión"
        >
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
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
          <div className="btn-access" aria-hidden="true">Acceder →</div>
        </Link>

        <Link 
          to="/dashboard/admin/gestoras" 
          className="quick-card"
          tabIndex={0}
          aria-label="Acceder a Asignación de Escuelas: asignar escuelas específicas a cada Persona Gestora de la VIE"
        >
          <div className="quick-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
              <path d="M16 11l2 2 4-4"/>
            </svg>
          </div>
          <h3>Asignación de Escuelas</h3>
          <p>Asignar escuelas específicas a cada Persona Gestora de la VIE.</p>
          <div className="btn-access" aria-hidden="true">Acceder →</div>
        </Link>
      </section>

      {/* ESTADO DE PROPUESTAS + ACTIVIDAD RECIENTE */}
      <div className="bottom-row">
        <section className="card proposals-section" aria-labelledby="titulo-estado-propuestas">
          <h2 id="titulo-estado-propuestas">Estado de Propuestas por Módulo</h2>
          <div className="progress-list" role="list" aria-label="Distribución de propuestas por estado">
          {stats.propuestasPorEstado.map((item, index) => (
            <div 
              key={index} 
              className="progress-item" 
              role="listitem"
              tabIndex={0}  {/* ✅ NUEVO: hace que el foco se detenga aquí */}
              aria-label={`${item.estado}: ${item.cantidad} propuestas, ${getPorcentaje(item.cantidad)} por ciento del total`}
            >
              <div className="progress-header">
                <span className="progress-label">{item.estado}</span>
                <span className="progress-stats">{getPorcentaje(item.cantidad)}% ({item.cantidad})</span>
              </div>
              <div 
                className="progress-bar"
                role="progressbar"
                aria-valuenow={getPorcentaje(item.cantidad)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.estado}: ${getPorcentaje(item.cantidad)} por ciento completado`}
              >
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${getPorcentaje(item.cantidad)}%`,
                    background: coloresEstado[item.estado] || 'var(--color-primario, #002855)'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        </section>

        <section className="card activity-section" aria-labelledby="titulo-actividad-reciente">
          <h2 id="titulo-actividad-reciente">Actividad Reciente del Sistema</h2>
          {stats.actividadReciente.length === 0 ? (
            <p className="no-activity">Sin actividad reciente</p>
          ) : (
            <div className="activity-list" role="list" aria-live="polite" aria-label="Lista de actividades recientes del sistema">
                  {stats.actividadReciente.slice(0, 5).map((log) => (
                  <div 
                    key={log.logId} 
                    className="activity-item" 
                    role="listitem"
                    tabIndex={0}  
                    aria-label={`${log.descripcion}, registrado el ${new Date(log.fecha).toLocaleString('es-CR')}`}
                  >
                    <span className="activity-icon" aria-hidden="true">●</span>
                    <div className="activity-content">
                      <p className="activity-desc">{log.descripcion}</p>
                      <p className="activity-date">
                        <time dateTime={log.fecha}>
                          {new Date(log.fecha).toLocaleString('es-CR')}
                        </time>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
          )}
          <Link to="/dashboard/admin/bitacora" className="view-all" tabIndex={0} aria-label="Ver toda la actividad del sistema en la bitácora">
            Ver toda la actividad →
          </Link>
        </section>
      </div>

      {/* Gestión de Usuarios */}
      <section className="card users-section" aria-labelledby="titulo-gestion-usuarios">
        <div className="users-content">
          <div className="users-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="users-info">
            <h3 id="titulo-gestion-usuarios">Gestión de Usuarios y Roles</h3>
            <p>Crear, editar y asignar roles y permisos</p>
          </div>
        </div>
        <Link to="/dashboard/admin/usuarios" className="btn-outline" tabIndex={0} aria-label="Acceder a la gestión de usuarios y roles">
          Acceder →
        </Link>
      </section>

      {/* Modo Global SuperAdmin */}
      <section className="card modo-global-card" aria-labelledby="titulo-modo-global">
        <div className="modo-global-content">
          <div className="modo-global-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="modo-global-info">
            <h3 id="titulo-modo-global">Modo de Acceso Global (SuperAdmin)</h3>
            <p id="desc-simulacion">Simular cualquier rol para pruebas y carga de datos</p>
          </div>
          
          <button 
            className="btn-activar"
            onClick={() => setModalAbierto(true)}
            aria-expanded={modalAbierto}
            aria-controls="modal-role-switcher"
            aria-haspopup="dialog"
            aria-describedby="desc-simulacion"
          >
            {rolSimulado !== 'SuperAdministrador' 
              ? `Simulando: ${rolSimulado} (Cambiar)` 
              : 'Activar →'}
          </button>
        </div>
      </section>

      {/* RoleSwitcher Modal */}
      <div id="modal-role-switcher">
        <RoleSwitcher 
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          onRoleChange={handleSeleccionarRol}
          usuarioActual={{ nombreUsuario: 'Sistema', apellido1Usuario: 'Administrador' }}
        />
      </div>
    </main>
  );
}