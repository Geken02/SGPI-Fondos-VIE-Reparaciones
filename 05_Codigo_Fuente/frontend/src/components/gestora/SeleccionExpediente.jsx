import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { expedienteService } from '../../services/expedienteService';

// Las entradas del menú sin código permiten elegir un expediente real.
export default function SeleccionExpediente({ titulo, ruta }) {
  const navigate = useNavigate();
  const [expedientes, setExpedientes] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    expedienteService.obtenerBandeja()
      .then((datos) => { if (!cancelado) setExpedientes(datos.expedientes || []); })
      .catch(() => { if (!cancelado) setError('No se pudieron cargar los expedientes. Comprueba tu sesión y la conexión con el servidor.'); });
    return () => { cancelado = true; };
  }, [intento]);

  return (
    <>
      <h1 className="gv-titulo">{titulo}</h1>
      <p className="gv-subtitulo">Selecciona el expediente con el que deseas trabajar.</p>
      <section className="gv-card role-expediente-selector">
        {error ? <div role="alert"><p>{error}</p><button type="button" className="cie-btn-outline" onClick={() => { setError(''); setExpedientes(null); setIntento((valor) => valor + 1); }}>Reintentar</button></div>
          : expedientes === null ? <p role="status">Cargando expedientes...</p>
            : expedientes.length === 0 ? <p>Aún no hay propuestas enviadas a la VIE.</p>
              : <label>Expediente
                <select aria-label="Expediente" defaultValue="" onChange={(event) => { if (event.target.value) navigate(`${ruta}/${encodeURIComponent(event.target.value)}`); }}>
                  <option value="" disabled>Seleccionar expediente...</option>
                  {expedientes.map((expediente) => <option key={expediente.id} value={expediente.id}>{expediente.id} — {expediente.titulo}</option>)}
                </select>
              </label>}
      </section>
    </>
  );
}
