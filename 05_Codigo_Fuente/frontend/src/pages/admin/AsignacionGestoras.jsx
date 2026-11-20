import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, catalogoService } from '../../services';
import '../../styles/asignacion-gestoras.css';
import SiglaVie from '../../components/SiglaVie';

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
  const [anuncio, setAnuncio] = useState('');

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
    // ✅ MEJORA: 4 segundos para dar tiempo suficiente al lector de pantalla
    setTimeout(() => setToast(null), 4000); 
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
    if (escuelasAMover.length === 0) return;

    setEscuelasAsignadas(prev => [...prev, ...escuelasAMover]);
    setEscuelasDisponibles(prev =>
      prev.filter(e => !escuelasSeleccionadas.includes(e.escuelaId))
    );
    setEscuelasSeleccionadas([]);
    setAnuncio(`Se movieron ${escuelasAMover.length} ${escuelasAMover.length === 1 ? 'escuela a' : 'escuelas a'} la lista de asignadas.`);
  };

  const handleMoverAIzquierda = (escuelaId) => {
    const escuela = escuelasAsignadas.find(e => e.escuelaId === escuelaId);
    if (escuela) {
      setEscuelasDisponibles(prev => [...prev, escuela]);
      setEscuelasAsignadas(prev => prev.filter(e => e.escuelaId !== escuelaId));
      setAnuncio(`Se quitó la escuela ${escuela.nombreEscuela} de la lista de asignadas.`);
    }
  };

  const handleMoverTodasAIzquierda = () => {
    if (escuelasAsignadas.length === 0) return;
    const cantidad = escuelasAsignadas.length;
    setEscuelasDisponibles(prev => [...prev, ...escuelasAsignadas]);
    setEscuelasAsignadas([]);
    setAnuncio(`Se quitaron las ${cantidad} escuelas de la lista de asignadas.`);
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
      mostrarToast('Asignaciones guardadas exitosamente', 'success');
      setAnuncio(`Asignaciones guardadas correctamente. ${escuelasAsignadas.length} escuelas asignadas.`);
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
    setAnuncio('Formulario cancelado. Seleccione una nueva gestora.');
  };

  const escuelasDisponiblesFiltradas = escuelasDisponibles.filter(e =>
    e.nombreEscuela.toLowerCase().includes(busquedaDisponibles.toLowerCase())
  );
  const escuelasAsignadasFiltradas = escuelasAsignadas.filter(e =>
    e.nombreEscuela.toLowerCase().includes(busquedaAsignadas.toLowerCase())
  );

  return (
    <div className="asignacion-container">
      {/* ✅ MEJORA: Toast con role dinámico (alert para errores, status para éxito) */}
      {toast && (
        <div 
          className={`toast ${toast.tipo}`} 
          role={toast.tipo === 'error' ? 'alert' : 'status'} 
          aria-live={toast.tipo === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <span className="toast-icon" aria-hidden="true">
            {toast.tipo === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      {/* ✅ MEJORA: aria-atomic="true" asegura que se lea la frase completa, no solo la parte cambiada */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {anuncio}
      </div>

      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <ol className="breadcrumbs-list">
          <li><Link to="/dashboard">Inicio</Link></li>
          <li className="breadcrumb-separator" aria-hidden="true">›</li>
          <li aria-current="page">Asignación de Escuelas a Gestoras <SiglaVie /></li>
        </ol>
      </nav>

      <header className="asignacion-header">
        <h1 id="titulo-principal">Asignación de Escuelas a Gestoras <SiglaVie /></h1>
        <p id="subtitulo-principal">Seleccione una gestora y asigne las escuelas correspondientes.</p>
      </header>

      {/* Selector de Gestora */}
      <div className="card selector-card">
        <label className="form-label" htmlFor="select-gestora">
          Seleccionar Gestora <SiglaVie />: <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span><span className="sr-only"> (obligatorio)</span>
        </label>
        <select
          id="select-gestora"
          className={`form-select ${!gestoraSeleccionada && gestoras.length > 0 ? 'vacio' : ''}`}
          value={gestoraSeleccionada}
          onChange={(e) => setGestoraSeleccionada(e.target.value)}
          aria-required="true"
          aria-invalid={!gestoraSeleccionada && gestoras.length > 0}
          aria-describedby={
            !gestoraSeleccionada && gestoras.length > 0
              ? 'aviso-gestora'
              : gestoras.length === 0
                ? 'error-gestoras'
                : undefined
          }
        >
          <option value="">
            {gestoras.length === 0
              ? 'No hay gestoras V\u200BI\u200BE registradas en el sistema'
              : 'Seleccione una gestora...'}
          </option>
          {gestoras.map(gestora => (
            <option key={gestora.usuarioId} value={gestora.usuarioId}>
              {gestora.nombreUsuario} {gestora.apellido1Usuario} {gestora.apellido2Usuario}
            </option>
          ))}
        </select>
        {!gestoraSeleccionada && gestoras.length > 0 && (
          <p id="aviso-gestora" className="selector-aviso" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Debe seleccionar una gestora para poder asignar escuelas
          </p>
        )}
        {gestoras.length === 0 && (
          <p id="error-gestoras" className="selector-aviso error" role="alert">
            No existen usuarios con el rol "GestoraVIE". Cree un usuario con ese rol primero.
          </p>
        )}
      </div>

      {/* Dos columnas con botones de transferencia centrados */}
      <div className="dos-columnas">
        {/* Escuelas Disponibles */}
        <div className="card columna-izquierda">
          <h2 id="titulo-disponibles">Escuelas disponibles ({escuelasDisponiblesFiltradas.length})</h2>
          <div className="buscador">
            <label htmlFor="busqueda-disponibles" className="sr-only">Buscar en escuelas disponibles</label>
            <svg className="buscador-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              id="busqueda-disponibles"
              placeholder="Buscar escuela..."
              value={busquedaDisponibles}
              onChange={(e) => setBusquedaDisponibles(e.target.value)}
              className="buscador-input"
              aria-describedby="titulo-disponibles"
            />
          </div>

          <div className="lista-escuelas" role="list" aria-labelledby="titulo-disponibles">
            {escuelasDisponiblesFiltradas.length === 0 ? (
              <p className="lista-vacia" role="status">No hay escuelas disponibles que coincidan con la búsqueda</p>
            ) : (
              escuelasDisponiblesFiltradas.map(escuela => {
                const seleccionada = escuelasSeleccionadas.includes(escuela.escuelaId);
                const chkId = `chk-disp-${escuela.escuelaId}`;
                return (
                  <label
                    key={escuela.escuelaId}
                    htmlFor={chkId}
                    className={`escuela-item ${seleccionada ? 'seleccionada' : ''}`}
                  >
                    <input
                      id={chkId}
                      type="checkbox"
                      checked={seleccionada}
                      onChange={() => handleSeleccionarEscuela(escuela.escuelaId)}
                      className="escuela-checkbox"
                      aria-label={`Seleccionar escuela ${escuela.nombreEscuela} para mover a asignadas`}
                    />
                    <span className="escuela-nombre">{escuela.nombreEscuela}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="lista-footer" aria-hidden="true">
            Mostrando {escuelasDisponiblesFiltradas.length} de {escuelasDisponibles.length} escuelas
          </div>
        </div>

        {/* ✅ Botones de movimiento centrados verticalmente */}
        <div className="botones-movimiento" role="group" aria-label="Controles para mover escuelas entre listas">
          <button
            className="btn-mover"
            onClick={handleMoverADerecha}
            disabled={escuelasSeleccionadas.length === 0}
            aria-label={`Mover ${escuelasSeleccionadas.length} escuelas seleccionadas a la lista de asignadas`}
            title="Mover seleccionadas a asignadas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <button
            className="btn-mover"
            onClick={handleMoverTodasAIzquierda}
            disabled={escuelasAsignadas.length === 0}
            aria-label="Quitar todas las escuelas de la lista de asignadas"
            title="Mover todas a disponibles"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
        </div>

        {/* Escuelas Asignadas */}
        <div className="card columna-derecha">
          <h2 id="titulo-asignadas">Escuelas asignadas ({escuelasAsignadasFiltradas.length})</h2>
          <div className="buscador">
            <label htmlFor="busqueda-asignadas" className="sr-only">Buscar en escuelas asignadas</label>
            <svg className="buscador-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              id="busqueda-asignadas"
              placeholder="Buscar escuela..."
              value={busquedaAsignadas}
              onChange={(e) => setBusquedaAsignadas(e.target.value)}
              className="buscador-input"
              aria-describedby="titulo-asignadas"
            />
          </div>

          <div className="lista-escuelas" role="list" aria-labelledby="titulo-asignadas">
            {escuelasAsignadasFiltradas.length === 0 ? (
              <p className="lista-vacia" role="status">No hay escuelas asignadas</p>
            ) : (
              escuelasAsignadasFiltradas.map(escuela => (
                <div key={escuela.escuelaId} className="escuela-item asignada" role="listitem">
                  <svg className="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span className="escuela-nombre">{escuela.nombreEscuela}</span>
                  <button
                    className="btn-quitar"
                    onClick={() => handleMoverAIzquierda(escuela.escuelaId)}
                    aria-label={`Quitar escuela ${escuela.nombreEscuela} de la lista de asignadas`}
                    title="Quitar de asignadas"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="lista-footer" aria-hidden="true">
            {escuelasAsignadasFiltradas.length} escuelas en la lista
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="form-actions">
        <button className="btn-cancel" onClick={handleCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={handleGuardar}
          disabled={guardando || !gestoraSeleccionada}
          aria-busy={guardando}
          aria-label={guardando ? 'Guardando asignaciones, por favor espere' : 'Guardar asignación de escuelas'}
        >
          {guardando && <div className="spinner-small" aria-hidden="true"></div>}
          Guardar Asignación
        </button>
      </div>
    </div>
  );
}