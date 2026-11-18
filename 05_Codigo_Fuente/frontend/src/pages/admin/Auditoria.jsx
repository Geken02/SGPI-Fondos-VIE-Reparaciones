import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Modal from '../../components/Modal';
import LogDetalleModal from '../../components/LogDetalleModal';
import '../../styles/auditoria.css';

const NOMBRES_SEVERIDAD = {
  1: { nombre: 'Informativa', clase: 'severidad-info' },
  2: { nombre: 'Advertencia', clase: 'severidad-warning' },
  3: { nombre: 'Error', clase: 'severidad-error' },
  4: { nombre: 'Crítica', clase: 'severidad-critical' },
};

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [tamanoPagina] = useState(50);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [severidadId, setSeveridadId] = useState('');

  // Modal de detalle
  const [logSeleccionado, setLogSeleccionado] = useState(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  useEffect(() => {
    cargarActividad();
  }, [pagina, busqueda, fechaInicio, fechaFin, usuarioId, severidadId]);

  const cargarActividad = async () => {
    setCargando(true);
    try {
      const params = {
        pagina,
        tamanoPagina,
        busqueda: busqueda || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        usuarioId: usuarioId || undefined,
        severidadId: severidadId || undefined,
      };

      const response = await adminService.listarActividad(params);
      setLogs(response.data.items || []);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      console.error('Error cargando actividad del sistema:', error);
      setLogs([]);
      setTotalRegistros(0);
    } finally {
      setCargando(false);
    }
  };

  const handleVerDetalle = (log) => {
    setLogSeleccionado(log);
    setModalDetalleAbierto(true);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const totalPaginas = Math.ceil(totalRegistros / tamanoPagina);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFechaInicio('');
    setFechaFin('');
    setUsuarioId('');
    setSeveridadId('');
    setPagina(1);
  };

  return (
    <div className="auditoria-container">
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <ol className="breadcrumbs-list">
          <li><Link to="/dashboard">Inicio</Link></li>
          <li className="breadcrumb-separator" aria-hidden="true">›</li>
          <li aria-current="page">Actividad del Sistema</li>
        </ol>
      </nav>

      <header className="auditoria-header">
        <h1 id="titulo-auditoria">Actividad del Sistema</h1>
        <p>Historial de auditoría y trazabilidad de operaciones</p>
      </header>

      {/* Panel de Filtros */}
      <div className="auditoria-filtros">
        <div className="filtro-busqueda">
          <svg className="filtro-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            id="busqueda-auditoria"
            className="filtro-input"
            aria-label="Buscar en descripción de logs"
            placeholder="Buscar en descripción..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
          {busqueda && (
            <button
              type="button"
              className="filtro-clear"
              onClick={() => { setBusqueda(''); setPagina(1); }}
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="filtro-fecha">
          <label htmlFor="fecha-inicio" className="filtro-label">Desde:</label>
          <input
            type="date"
            id="fecha-inicio"
            className="filtro-input"
            value={fechaInicio}
            onChange={(e) => { setFechaInicio(e.target.value); setPagina(1); }}
          />
        </div>

        <div className="filtro-fecha">
          <label htmlFor="fecha-fin" className="filtro-label">Hasta:</label>
          <input
            type="date"
            id="fecha-fin"
            className="filtro-input"
            value={fechaFin}
            onChange={(e) => { setFechaFin(e.target.value); setPagina(1); }}
          />
        </div>

        <div className="filtro-select-group">
          <label htmlFor="filtro-severidad" className="filtro-label">Severidad:</label>
          <select
            id="filtro-severidad"
            className="filtro-select"
            value={severidadId}
            onChange={(e) => { setSeveridadId(e.target.value); setPagina(1); }}
            aria-label="Filtrar por severidad"
          >
            <option value="">Todas</option>
            <option value="1">Informativa</option>
            <option value="2">Advertencia</option>
            <option value="3">Error</option>
            <option value="4">Crítica</option>
          </select>
        </div>

        <div className="filtro-select-group">
          <label htmlFor="filtro-usuario" className="filtro-label">Usuario ID:</label>
          <input
            type="number"
            id="filtro-usuario"
            className="filtro-input"
            placeholder="ID de usuario"
            value={usuarioId}
            onChange={(e) => { setUsuarioId(e.target.value); setPagina(1); }}
            min="1"
          />
        </div>

        <button
          className="btn-limpiar-filtros"
          onClick={limpiarFiltros}
          aria-label="Limpiar todos los filtros"
          title="Limpiar filtros"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6"/>
          </svg>
          Limpiar
        </button>
      </div>

      {/* Tabla de Logs */}
      <div className="tabla-container">
        {cargando ? (
          <div className="tabla-loading" role="status" aria-live="polite">
            <div className="spinner"></div>
            <p>Cargando actividad del sistema...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="tabla-vacia" role="status">
            <p>No se encontraron registros de actividad</p>
          </div>
        ) : (
          <table className="tabla-auditoria" aria-label="Registro de actividad del sistema">
            <caption className="sr-only">
              Tabla de logs de auditoría con fecha, usuario, evento, severidad y descripción
            </caption>
            <thead>
              <tr>
                <th scope="col">FECHA</th>
                <th scope="col">USUARIO</th>
                <th scope="col">EVENTO</th>
                <th scope="col">SEVERIDAD</th>
                <th scope="col">DESCRIPCIÓN</th>
                <th scope="col">REFERENCIA</th>
                <th scope="col">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const severidadInfo = NOMBRES_SEVERIDAD[log.severidadId] || { nombre: 'Desconocida', clase: 'severidad-unknown' };
                return (
                  <tr key={log.logId}>
                    <td className="fecha-celda">
                      {formatearFecha(log.creadoEn)}
                    </td>
                    <td className="usuario-celda">
                      {log.nombreUsuario || 'Sistema'}
                      {log.usuarioId && (
                        <span className="usuario-id">#{log.usuarioId}</span>
                      )}
                    </td>
                    <td>
                      <span className="evento-badge">
                        {log.nombreEvento || `Evento #${log.tipoEventoId}`}
                      </span>
                    </td>
                    <td>
                      <span className={`severidad-badge ${severidadInfo.clase}`} aria-label={`Severidad: ${severidadInfo.nombre}`}>
                        {severidadInfo.nombre}
                      </span>
                    </td>
                    <td className="descripcion-celda" title={log.descripcion}>
                      {log.descripcion}
                    </td>
                    <td className="referencia-celda">
                      {log.descripcionReferencia1 && (
                        <div className="referencia-item">
                          <span className="referencia-label">{log.descripcionReferencia1}:</span>
                          <span className="referencia-valor">{log.referenciaId1}</span>
                        </div>
                      )}
                      {log.descripcionReferencia2 && (
                        <div className="referencia-item">
                          <span className="referencia-label">{log.descripcionReferencia2}:</span>
                          <span className="referencia-valor">{log.referenciaId2}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-ver-detalle"
                        onClick={() => handleVerDetalle(log)}
                        aria-label={`Ver detalles del log ${log.logId}`}
                        title="Ver detalles completos"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="paginacion" role="navigation" aria-label="Paginación de registros de auditoría">
        <div className="paginacion-info">
          Mostrando {logs.length > 0 ? ((pagina - 1) * tamanoPagina + 1) : 0}-
          {Math.min(pagina * tamanoPagina, totalRegistros)} de {totalRegistros} registros
        </div>
        <div className="paginacion-botones">
          <button
            className="btn-paginacion"
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
            aria-label="Ir a la página anterior"
          >
            ← Anterior
          </button>
          {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              className={`btn-paginacion ${pagina === num ? 'active' : ''}`}
              onClick={() => setPagina(num)}
              aria-label={`Ir a la página ${num}`}
              aria-current={pagina === num ? 'page' : undefined}
            >
              {num}
            </button>
          ))}
          <button
            className="btn-paginacion"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(pagina + 1)}
            aria-label="Ir a la página siguiente"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Modal de Detalle del Log */}
      {modalDetalleAbierto && logSeleccionado && (
        <LogDetalleModal
          log={logSeleccionado}
          onClose={() => {
            setModalDetalleAbierto(false);
            setLogSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}