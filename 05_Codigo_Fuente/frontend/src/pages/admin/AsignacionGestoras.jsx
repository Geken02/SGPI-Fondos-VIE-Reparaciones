// src/pages/admin/AsignacionGestoras.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, catalogoService } from '../../services';
import '../../styles/asignacion-gestoras.css';

export default function AsignacionGestoras() {
  const [gestoras, setGestoras] = useState([]);
  const [gestoraSeleccionada, setGestoraSeleccionada] = useState('');
  const [escuelasDisponibles, setEscuelasDisponibles] = useState([]);
  const [escuelasAsignadas, setEscuelasAsignadas] = useState([]);
  const [busquedaDisponibles, setBusquedaDisponibles] = useState('');
  const [busquedaAsignadas, setBusquedaAsignadas] = useState('');
  const [escuelasSeleccionadas, setEscuelasSeleccionadas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState(null);
  const [todasEscuelas, setTodasEscuelas] = useState([]);

    useEffect(() => {
  cargarGestoras();
  cargarEscuelas();
}, []);

useEffect(() => {
  if (gestoraSeleccionada && todasEscuelas.length > 0) {
    cargarAsignaciones(gestoraSeleccionada);
  } else if (!gestoraSeleccionada) {
    setEscuelasAsignadas([]);
    setEscuelasDisponibles(todasEscuelas);  
  }
}, [gestoraSeleccionada, todasEscuelas]);

  const cargarGestoras = async () => {
    try {
      const response = await adminService.listarUsuarios({
        pagina: 1,
        tamanoPagina: 100,
        incluirInactivos: false,
      });
      
      const usuarios = response.data.items || [];
      // Filtrar solo usuarios con rol GestoraVIE
      const gestorasVIE = usuarios.filter(u => 
        u.roles?.some(r => r.nombreRol === 'GestoraVIE')
      );
      
      setGestoras(gestorasVIE);
    } catch (error) {
      console.error('Error cargando gestoras:', error);
    }
  };

  const cargarEscuelas = async () => {
  try {
    const response = await catalogoService.listar('escuelas', {
      pagina: 1,
      tamanoPagina: 100,
    });
    setTodasEscuelas(response.data.items || []);  
  } catch (error) {
    console.error('Error cargando escuelas:', error);
  }
};

const cargarAsignaciones = async (gestoraId) => {
  setCargando(true);
  try {
    const response = await adminService.listarAsignacionesGestora();
    const todasAsignaciones = response.data || [];
    
    const asignacionesGestora = todasAsignaciones.filter(
      a => a.gestoraVIEId === parseInt(gestoraId) && a.activo === true
    );
    
    const escuelasAsignadasIds = asignacionesGestora.map(a => a.escuelaId);
    
    const asignadas = todasEscuelas.filter(e => escuelasAsignadasIds.includes(e.escuelaId));
    const disponibles = todasEscuelas.filter(e => !escuelasAsignadasIds.includes(e.escuelaId));
    
    setEscuelasAsignadas(asignadas);
    setEscuelasDisponibles(disponibles);
  } catch (error) {
    console.error('Error cargando asignaciones:', error);
    setEscuelasAsignadas([]);
    setEscuelasDisponibles(todasEscuelas);
  } finally {
    setCargando(false);
  }
};

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSeleccionarEscuela = (escuelaId) => {
    setEscuelasSeleccionadas(prev => 
      prev.includes(escuelaId)
        ? prev.filter(id => id !== escuelaId)
        : [...prev, escuelaId]
    );
  };

 const handleMoverADerecha = () => {
  const escuelasAMover = escuelasDisponibles.filter(e => 
    escuelasSeleccionadas.includes(e.escuelaId)
  );
  
  setEscuelasAsignadas(prev => [...prev, ...escuelasAMover]);
  setEscuelasDisponibles(prev => 
    prev.filter(e => !escuelasSeleccionadas.includes(e.escuelaId))
  );
  setEscuelasSeleccionadas([]);
};

const handleMoverAIzquierda = (escuelaId) => {
  const escuela = escuelasAsignadas.find(e => e.escuelaId === escuelaId);
  if (escuela) {
    setEscuelasDisponibles(prev => [...prev, escuela]);
    setEscuelasAsignadas(prev => prev.filter(e => e.escuelaId !== escuelaId));
  }
};


  const handleGuardar = async () => {
  if (!gestoraSeleccionada) {
    mostrarToast('Debe seleccionar una gestora', 'error');
    return;
  }

  setGuardando(true);
  try {
    const response = await adminService.listarAsignacionesGestora();
    const todasAsignaciones = response.data || [];
    
    const asignacionesActuales = todasAsignaciones.filter(
      a => a.gestoraVIEId === parseInt(gestoraSeleccionada) && a.activo === true
    );

    for (const asignacion of asignacionesActuales) {
      try {
        await adminService.eliminarAsignacionGestora(asignacion.asignacionId);
      } catch (error) {
        console.warn(`No se pudo eliminar asignación ${asignacion.asignacionId}:`, error);
      }
    }

    for (const escuela of escuelasAsignadas) {
      try {
        await adminService.crearAsignacionGestora({
          escuelaId: escuela.escuelaId,
          gestoraVIEId: parseInt(gestoraSeleccionada),
        });
      } catch (error) {
        console.warn(`No se pudo asignar escuela ${escuela.escuelaId}:`, error);
      }
    }

    mostrarToast('Asignaciones guardadas exitosamente');
    
    // 👇 Recargar desde la BD usando `todasEscuelas` como base
    await cargarAsignaciones(gestoraSeleccionada);
  } catch (error) {
    console.error('Error guardando asignaciones:', error);
    const detail = error.response?.data?.detail;
    const mensajeError = typeof detail === 'string' ? detail : 'Error al guardar las asignaciones';
    mostrarToast(mensajeError, 'error');
  } finally {
    setGuardando(false);
  }
};

  const handleCancelar = () => {
    setGestoraSeleccionada('');
    setEscuelasAsignadas([]);
    setEscuelasSeleccionadas([]);
  };

  // Filtrar escuelas por búsqueda
  const escuelasDisponiblesFiltradas = escuelasDisponibles.filter(e =>
    e.nombreEscuela.toLowerCase().includes(busquedaDisponibles.toLowerCase())
  );

  const escuelasAsignadasFiltradas = escuelasAsignadas.filter(e =>
    e.nombreEscuela.toLowerCase().includes(busquedaAsignadas.toLowerCase())
  );

  return (
    <div className="asignacion-container">
      {toast && (
        <div className={`toast ${toast.tipo}`}>
          <span className="toast-icon">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/dashboard">Comité técnico</Link>
        <span className="breadcrumb-separator">›</span>
        <span>Asignación de Escuelas a Gestoras VIE</span>
      </div>

      {/* Header */}
      <div className="asignacion-header">
        <h1>Asignación de Escuelas a Gestoras VIE</h1>
        <p>Seleccione una gestora y asigne las escuelas correspondientes.</p>
      </div>

            {/* Selector de Gestora */}
      <div className="card selector-card">
        <label className="form-label">
          Seleccionar Gestora VIE: <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <select
          className={`form-select ${!gestoraSeleccionada && gestoras.length > 0 ? 'vacio' : ''}`}
          value={gestoraSeleccionada}
          onChange={(e) => setGestoraSeleccionada(e.target.value)}
        >
          <option value="">
            {gestoras.length === 0 
              ? 'No hay gestoras VIE registradas en el sistema' 
              : 'Seleccione una gestora...'}
          </option>
          {gestoras.map(gestora => (
            <option key={gestora.usuarioId} value={gestora.usuarioId}>
              {gestora.nombreUsuario} {gestora.apellido1Usuario} {gestora.apellido2Usuario}
            </option>
          ))}
        </select>
        {!gestoraSeleccionada && gestoras.length > 0 && (
          <p className="selector-aviso">
            ⚠️ Debe seleccionar una gestora para poder asignar escuelas
          </p>
        )}
        {gestoras.length === 0 && (
          <p className="selector-aviso error">
            No existen usuarios con el rol "GestoraVIE". Cree un usuario con ese rol primero.
          </p>
        )}
      </div>

      {/* Dos columnas */}
      <div className="dos-columnas">
        {/* Escuelas Disponibles */}
        <div className="card columna-izquierda">
          <h2>Escuelas disponibles ({escuelasDisponiblesFiltradas.length})</h2>
          
          <div className="buscador">
            <svg className="buscador-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar escuela..."
              value={busquedaDisponibles}
              onChange={(e) => setBusquedaDisponibles(e.target.value)}
              className="buscador-input"
            />
          </div>

          <div className="lista-escuelas">
            {escuelasDisponiblesFiltradas.map(escuela => (
              <div key={escuela.escuelaId} className="escuela-item">
                <input
                  type="checkbox"
                  checked={escuelasSeleccionadas.includes(escuela.escuelaId)}
                  onChange={() => handleSeleccionarEscuela(escuela.escuelaId)}
                  className="escuela-checkbox"
                />
                <span className="escuela-nombre">{escuela.nombreEscuela}</span>
              </div>
            ))}
          </div>

          <div className="lista-footer">
            Mostrando {escuelasDisponiblesFiltradas.length} de {escuelasDisponibles.length} escuelas
          </div>
        </div>

        {/* Botones de movimiento */}
        <div className="botones-movimiento">
          <button 
            className="btn-mover" 
            onClick={handleMoverADerecha}
            disabled={escuelasSeleccionadas.length === 0}
            title="Mover seleccionadas a asignadas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button 
            className="btn-mover" 
            onClick={() => {
              // Mover todas las asignadas de vuelta
              escuelasAsignadas.forEach(e => handleMoverAIzquierda(e.escuelaId));
            }}
            title="Mover todas a disponibles"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
        </div>

        {/* Escuelas Asignadas */}
        <div className="card columna-derecha">
          <h2>Escuelas asignadas ({escuelasAsignadasFiltradas.length})</h2>
          
          <div className="buscador">
            <svg className="buscador-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar escuela..."
              value={busquedaAsignadas}
              onChange={(e) => setBusquedaAsignadas(e.target.value)}
              className="buscador-input"
            />
          </div>

          <div className="lista-escuelas">
            {escuelasAsignadasFiltradas.map(escuela => (
              <div key={escuela.escuelaId} className="escuela-item asignada">
                <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span className="escuela-nombre">{escuela.nombreEscuela}</span>
                <button 
                  className="btn-quitar"
                  onClick={() => handleMoverAIzquierda(escuela.escuelaId)}
                  title="Quitar de asignadas"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="lista-footer">
            {escuelasAsignadasFiltradas.length} escuelas seleccionadas
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="form-actions">
        <button className="btn-cancel" onClick={handleCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={handleGuardar} disabled={guardando || !gestoraSeleccionada}>
          {guardando && <div className="spinner-small"></div>}
          Guardar Asignación
        </button>
      </div>
    </div>
  );
}