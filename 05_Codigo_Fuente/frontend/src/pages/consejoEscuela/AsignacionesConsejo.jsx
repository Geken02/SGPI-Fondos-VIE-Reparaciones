import { useEffect, useState } from 'react';
import consejoEscuelaService from '../../services/consejoEscuelaService';
import './asignacionesConsejo.css';

const AsignacionesConsejo = () => {
  const [propuestas, setPropuestas] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);

  const [propuestaSeleccionada, setPropuestaSeleccionada] = useState('');
  const [miembrosSeleccionados, setMiembrosSeleccionados] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError('');
        const [propuestasData, miembrosData] = await Promise.all([
          consejoEscuelaService.listarPropuestas(),
          consejoEscuelaService.listarMiembrosDisponibles(),
        ]);
        setPropuestas(propuestasData);
        setMiembros(miembrosData);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('No fue posible cargar las propuestas o los miembros.');
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const cargarAsignaciones = async () => {
      if (!propuestaSeleccionada) {
        setAsignaciones([]);
        return;
      }
      try {
        setError('');
        const data = await consejoEscuelaService.listarAsignaciones(propuestaSeleccionada);
        setAsignaciones(data);
      } catch (err) {
        console.error('Error al cargar asignaciones:', err);
        setError('No fue posible cargar las asignaciones de la propuesta.');
      }
    };
    cargarAsignaciones();
  }, [propuestaSeleccionada]);

  const cambiarSeleccionMiembro = (usuarioId) => {
    setMiembrosSeleccionados((actuales) =>
      actuales.includes(usuarioId)
        ? actuales.filter((id) => id !== usuarioId)
        : [...actuales, usuarioId]
    );
  };

  const manejarAsignacion = async () => {
    if (!propuestaSeleccionada) return setError('Primero debe seleccionar una propuesta.');
    if (miembrosSeleccionados.length === 0) return setError('Seleccione al menos un miembro para asignar.');

    try {
      setProcesando(true);
      setError('');
      setMensaje('');
      await consejoEscuelaService.asignarMiembros(propuestaSeleccionada, miembrosSeleccionados);
      const actualizadas = await consejoEscuelaService.listarAsignaciones(propuestaSeleccionada);
      setAsignaciones(actualizadas);
      setMiembrosSeleccionados([]);
      setMensaje('Los miembros fueron asignados correctamente.');
    } catch (err) {
      console.error('Error al asignar miembros:', err);
      setError(err.response?.data?.detail || 'No fue posible asignar los miembros seleccionados.');
    } finally {
      setProcesando(false);
    }
  };

  const manejarDesactivacion = async (usuarioId) => {
    if (!window.confirm('¿Desea desactivar la asignación de este miembro?')) return;
    try {
      setError('');
      setMensaje('');
      await consejoEscuelaService.desactivarAsignacion(propuestaSeleccionada, usuarioId);
      const actualizadas = await consejoEscuelaService.listarAsignaciones(propuestaSeleccionada);
      setAsignaciones(actualizadas);
      setMensaje('La asignación fue desactivada correctamente.');
    } catch (err) {
      console.error('Error al desactivar asignación:', err);
      setError(err.response?.data?.detail || 'No fue posible desactivar la asignación.');
    }
  };

  if (cargando) return <div className="asignaciones-container"><p>Cargando información...</p></div>;

  return (
    <div className="asignaciones-container">
      <div className="asignaciones-header">
        <h1>Asignación de Miembros del Consejo</h1>
        <p>Seleccione una propuesta y asigne los miembros del Consejo de Profesores encargados de revisarla.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {mensaje && <div className="alert alert-success">{mensaje}</div>}

      <div className="card">
        <div className="form-group">
          <label htmlFor="propuesta" className="form-label">Propuesta</label>
          <select
            id="propuesta"
            value={propuestaSeleccionada}
            onChange={(e) => {
              setPropuestaSeleccionada(e.target.value);
              setMiembrosSeleccionados([]);
              setError('');
              setMensaje('');
            }}
            className="form-select"
          >
            <option value="">Seleccione una propuesta</option>
            {propuestas.map((propuesta) => (
              <option key={propuesta.propuestaId} value={propuesta.propuestaId}>
                {propuesta.codigoPropuesta ? `${propuesta.codigoPropuesta} - ${propuesta.titulo}` : propuesta.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {propuestaSeleccionada && (
        <>
          <div className="card">
            <h2 className="card-title">Miembros disponibles</h2>
            {miembros.length === 0 ? (
              <p style={{ color: '#64748b' }}>No hay miembros disponibles para asignar.</p>
            ) : (
              <div className="miembros-lista">
                {miembros.map((miembro) => {
                  const yaAsignado = asignaciones.some((a) => a.usuarioId === miembro.usuarioId);
                  return (
                    <label key={miembro.usuarioId} className={`miembro-item ${yaAsignado ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={miembrosSeleccionados.includes(miembro.usuarioId)}
                        disabled={yaAsignado}
                        onChange={() => cambiarSeleccionMiembro(miembro.usuarioId)}
                      />
                      <div className="miembro-info">
                        <p className="miembro-nombre">{miembro.nombreCompleto}</p>
                        <p className="miembro-correo">{miembro.correoInstitucional}</p>
                        {yaAsignado && <p className="miembro-estado">Ya asignado a esta propuesta</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={manejarAsignacion}
              disabled={procesando || miembrosSeleccionados.length === 0}
              className="btn btn-primary"
            >
              {procesando ? 'Asignando...' : 'Asignar miembros seleccionados'}
            </button>
          </div>

          <div className="card">
            <h2 className="card-title">Miembros actualmente asignados</h2>
            {asignaciones.length === 0 ? (
              <p style={{ color: '#64748b' }}>Esta propuesta todavía no tiene miembros asignados.</p>
            ) : (
              <div className="tabla-contenedor">
                <table className="tabla-asignaciones">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo institucional</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asignaciones.map((asignacion) => (
                      <tr key={asignacion.usuarioId}>
                        <td>{asignacion.nombreCompleto}</td>
                        <td>{asignacion.correoInstitucional}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => manejarDesactivacion(asignacion.usuarioId)}
                            className="btn btn-danger"
                          >
                            Desactivar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AsignacionesConsejo;