import { useEffect, useState } from 'react';
import './propuestasConsejo.css';
import consejoEscuelaService from '../../services/consejoEscuelaService';

const PropuestasConsejo = () => {
  const [propuestas, setPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [propuestaSeleccionada, setPropuestaSeleccionada] = useState(null);

  const cargarPropuestas = async () => {
    try {
      setCargando(true);
      setError('');

      const datos = await consejoEscuelaService.listarPropuestas();

      console.log('Propuestas recibidas por React:', datos);
      console.log('¿Es un arreglo?', Array.isArray(datos));

      setPropuestas(Array.isArray(datos) ? datos : []);
    } catch (err) {
      console.error('Error al cargar las propuestas:', err);

      setError(
        err.response?.data?.detail ||
          'No fue posible cargar las propuestas del Consejo.'
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPropuestas();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No definida';

    return new Date(fecha).toLocaleDateString('es-CR');
  };

  const formatearMonto = (monto) => {
    if (monto === null || monto === undefined) return 'No definido';

    return Number(monto).toLocaleString('es-CR', {
      style: 'currency',
      currency: 'CRC',
    });
  };

  return (
    <div className="propuestas-consejo">
      <div className="pagina-encabezado">
        <div>
          <h1>Propuestas del Consejo de Escuela</h1>
          <p>
            Consulta las propuestas de investigación y su información
            correspondiente.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarPropuestas}
          disabled={cargando}
        >
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {cargando && (
        <p className="mensaje-cargando">
          Cargando propuestas...
        </p>
      )}

      {!cargando && error && (
        <div className="mensaje-error">
          <p>{error}</p>

          <button type="button" onClick={cargarPropuestas}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && propuestas.length === 0 && (
        <div className="mensaje-vacio">
          <h3>No hay propuestas disponibles</h3>
          <p>
            Actualmente no se encontraron propuestas para consultar.
          </p>
        </div>
      )}

      {propuestaSeleccionada && (
        <div className="detalle-propuesta">
          <h2>Detalle de la propuesta</h2>

          <p><strong>Código:</strong> {propuestaSeleccionada.codigoPropuesta}</p>
          <p><strong>Título:</strong> {propuestaSeleccionada.titulo}</p>
          <p><strong>Estado:</strong> {propuestaSeleccionada.estadoNombre}</p>
          <p><strong>Monto solicitado:</strong> {formatearMonto(propuestaSeleccionada.montoTotal)}</p>
          <p><strong>Fecha de inicio:</strong> {formatearFecha(propuestaSeleccionada.fechaInicio)}</p>
          <p><strong>Fecha de finalización:</strong> {formatearFecha(propuestaSeleccionada.fechaFinalizacion)}</p>
          <p><strong>Fecha de creación:</strong> {formatearFecha(propuestaSeleccionada.fechaCreacion)}</p>

          <button
            type="button"
            onClick={() => setPropuestaSeleccionada(null)}
          >
            Cerrar detalle
          </button>
        </div>
      )}

      {!cargando && !error && propuestas.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla-propuestas">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Estado</th>
                <th>Monto solicitado</th>
                <th>Fecha de inicio</th>
                <th>Fecha de finalización</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {propuestas.map((propuesta) => (
                <tr key={propuesta.propuestaId}>
                  <td>
                    {propuesta.codigoPropuesta || 'Sin código'}
                  </td>

                  <td>{propuesta.titulo || 'Sin título'}</td>

                  <td>
                    {propuesta.estadoNombre ||
                      propuesta.estadoCodigo ||
                      'Sin estado'}
                  </td>

                  <td>{formatearMonto(propuesta.montoTotal)}</td>

                  <td>{formatearFecha(propuesta.fechaInicio)}</td>

                  <td>{formatearFecha(propuesta.fechaFinalizacion)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setPropuestaSeleccionada(propuesta)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PropuestasConsejo;




