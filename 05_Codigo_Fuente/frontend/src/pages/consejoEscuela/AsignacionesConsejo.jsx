
import { useEffect, useState } from 'react';
import consejoEscuelaService from '../../services/consejoEscuelaService';

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

  // Cargar propuestas y miembros disponibles
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

  // Cargar asignaciones cuando se selecciona una propuesta
  useEffect(() => {
    const cargarAsignaciones = async () => {
      if (!propuestaSeleccionada) {
        setAsignaciones([]);
        return;
      }

      try {
        setError('');
        const data = await consejoEscuelaService.listarAsignaciones(
          propuestaSeleccionada
        );

        setAsignaciones(data);
      } catch (err) {
        console.error('Error al cargar asignaciones:', err);
        setError('No fue posible cargar las asignaciones de la propuesta.');
      }
    };

    cargarAsignaciones();
  }, [propuestaSeleccionada]);

  // Seleccionar o deseleccionar un miembro
  const cambiarSeleccionMiembro = (usuarioId) => {
    setMiembrosSeleccionados((actuales) =>
      actuales.includes(usuarioId)
        ? actuales.filter((id) => id !== usuarioId)
        : [...actuales, usuarioId]
    );
  };

  // Asignar miembros seleccionados
  const manejarAsignacion = async () => {
    if (!propuestaSeleccionada) {
      setError('Primero debe seleccionar una propuesta.');
      return;
    }

    if (miembrosSeleccionados.length === 0) {
      setError('Seleccione al menos un miembro para asignar.');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setMensaje('');

      await consejoEscuelaService.asignarMiembros(
        propuestaSeleccionada,
        miembrosSeleccionados
      );

      const actualizadas = await consejoEscuelaService.listarAsignaciones(
        propuestaSeleccionada
      );

      setAsignaciones(actualizadas);
      setMiembrosSeleccionados([]);
      setMensaje('Los miembros fueron asignados correctamente.');
    } catch (err) {
      console.error('Error al asignar miembros:', err);
      setError(
        err.response?.data?.detail ||
          'No fue posible asignar los miembros seleccionados.'
      );
    } finally {
      setProcesando(false);
    }
  };

  // Desactivar una asignación
  const manejarDesactivacion = async (usuarioId) => {
    const confirmar = window.confirm(
      '¿Desea desactivar la asignación de este miembro?'
    );

    if (!confirmar) return;

    try {
      setError('');
      setMensaje('');

      await consejoEscuelaService.desactivarAsignacion(
        propuestaSeleccionada,
        usuarioId
      );

      const actualizadas = await consejoEscuelaService.listarAsignaciones(
        propuestaSeleccionada
      );

      setAsignaciones(actualizadas);
      setMensaje('La asignación fue desactivada correctamente.');
    } catch (err) {
      console.error('Error al desactivar asignación:', err);
      setError(
        err.response?.data?.detail ||
          'No fue posible desactivar la asignación.'
      );
    }
  };

  if (cargando) {
    return <div className="p-6">Cargando información...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Asignación de Miembros del Consejo
        </h1>

        <p className="mt-2 text-gray-600">
          Seleccione una propuesta y asigne los miembros del Consejo de
          Profesores encargados de revisarla.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-4 rounded-md bg-green-100 p-3 text-green-700">
          {mensaje}
        </div>
      )}

      {/* Selección de propuesta */}
      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <label
          htmlFor="propuesta"
          className="mb-2 block font-semibold"
        >
          Propuesta
        </label>

        <select
          id="propuesta"
          value={propuestaSeleccionada}
          onChange={(e) => {
            setPropuestaSeleccionada(e.target.value);
            setMiembrosSeleccionados([]);
            setError('');
            setMensaje('');
          }}
          className="w-full rounded-md border p-2"
        >
          <option value="">Seleccione una propuesta</option>

          {propuestas.map((propuesta) => (
            <option
              key={propuesta.propuestaId}
              value={propuesta.propuestaId}
            >
              {propuesta.codigoPropuesta
                ? `${propuesta.codigoPropuesta} - ${propuesta.titulo}`
                : propuesta.titulo}
            </option>
          ))}
        </select>
      </div>

      {propuestaSeleccionada && (
        <>
          {/* Miembros disponibles */}
          <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Miembros disponibles
            </h2>

            {miembros.length === 0 ? (
              <p className="text-gray-500">
                No hay miembros disponibles para asignar.
              </p>
            ) : (
              <div className="space-y-3">
                {miembros.map((miembro) => {
                  const yaAsignado = asignaciones.some(
                    (asignacion) =>
                      asignacion.usuarioId === miembro.usuarioId
                  );

                  return (
                    <label
                      key={miembro.usuarioId}
                      className={`flex items-center gap-3 rounded-md border p-3 ${
                        yaAsignado
                          ? 'cursor-not-allowed bg-gray-100 opacity-60'
                          : 'cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          miembrosSeleccionados.includes(
                            miembro.usuarioId
                          )
                        }
                        disabled={yaAsignado}
                        onChange={() =>
                          cambiarSeleccionMiembro(miembro.usuarioId)
                        }
                      />

                      <div>
                        <p className="font-medium">
                          {miembro.nombreCompleto}
                        </p>

                        <p className="text-sm text-gray-500">
                          {miembro.correoInstitucional}
                        </p>

                        {yaAsignado && (
                          <p className="text-xs text-green-700">
                            Ya asignado a esta propuesta
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={manejarAsignacion}
              disabled={
                procesando || miembrosSeleccionados.length === 0
              }
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {procesando ? 'Asignando...' : 'Asignar miembros'}
            </button>
          </div>

          {/* Asignaciones actuales */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Miembros asignados
            </h2>

            {asignaciones.length === 0 ? (
              <p className="text-gray-500">
                Esta propuesta todavía no tiene miembros asignados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Correo institucional</th>
                      <th className="p-3">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {asignaciones.map((asignacion) => (
                      <tr
                        key={asignacion.usuarioId}
                        className="border-b"
                      >
                        <td className="p-3">
                          {asignacion.nombreCompleto}
                        </td>

                        <td className="p-3">
                          {asignacion.correoInstitucional}
                        </td>

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() =>
                              manejarDesactivacion(asignacion.usuarioId)
                            }
                            className="rounded-md bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
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