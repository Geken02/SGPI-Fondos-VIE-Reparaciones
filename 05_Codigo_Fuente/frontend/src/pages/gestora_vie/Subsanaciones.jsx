// src/pages/gestora_vie/Subsanaciones.jsx
// Ventana: Subsanaciones - Gestora VIE
import { useEffect, useMemo, useState } from 'react';
import Icono from '../../components/gestora/Iconos';
import ModalDetalleSubsanacion from '../../components/gestora/ModalDetalleSubsanacion';
import { ESTADOS_SUBSANACION, PESTANAS } from '../../data/subsanacionesConfig';
import { subsanacionService } from '../../services/subsanacionService';
import { formatearFecha } from '../../utils/fechas';

const mensajeDeError = (error) =>
  error.response?.status === 403
    ? 'Tu usuario no tiene el rol de Gestora VIE para ver las subsanaciones.'
    : 'No se pudieron cargar las subsanaciones. Verifica que el servidor esté en ejecución e intenta de nuevo.';

const Subsanaciones = () => {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('PENDIENTES');
  const [busqueda, setBusqueda] = useState('');
  const [escuela, setEscuela] = useState('');
  const [estado, setEstado] = useState('');
  const [detalle, setDetalle] = useState(null); // subsanación abierta en la ventana de detalle

  useEffect(() => {
    document.title = 'Subsanaciones - Gestora VIE';
  }, []);

  // Subsanaciones solicitadas, ya unidas con los datos de su expediente (GET /vie/subsanaciones)
  useEffect(() => {
    let cancelado = false;
    subsanacionService
      .obtenerSubsanaciones()
      .then((datos) => {
        if (!cancelado) setFilas(datos.subsanaciones);
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const conteos = useMemo(
    () => Object.fromEntries(PESTANAS.map((p) => [p.codigo, filas.filter((f) => f.pestana === p.codigo).length])),
    [filas]
  );

  const escuelas = useMemo(() => [...new Set(filas.map((f) => f.escuela))].sort(), [filas]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return filas.filter(
      (f) =>
        f.pestana === pestana &&
        (!texto || f.expedienteId.toLowerCase().includes(texto) || f.titulo.toLowerCase().includes(texto)) &&
        (!escuela || f.escuela === escuela) &&
        (!estado || f.estado === estado)
    );
  }, [filas, pestana, busqueda, escuela, estado]);

  // La gestora aceptó o rechazó una respuesta: se actualiza la fila (y las pestañas) sin recargar
  const alActualizar = (actualizada) => {
    setFilas((prev) => prev.map((f) => (f.subsanacionId === actualizada.subsanacionId ? actualizada : f)));
    setDetalle(actualizada);
  };

  return (
    <>
      <h1 className="gv-titulo">Gestión de subsanaciones</h1>
      <p className="gv-subtitulo">Revisa las observaciones enviadas a los investigadores y gestiona sus respuestas.</p>

      <div className="gv-tabs" role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.codigo}
            type="button"
            role="tab"
            aria-selected={pestana === p.codigo}
            className={`gv-tab ${pestana === p.codigo ? 'activa' : ''}`}
            onClick={() => setPestana(p.codigo)}
          >
            {p.etiqueta} ({cargando || error ? '—' : conteos[p.codigo]})
          </button>
        ))}
      </div>

      <section className="gv-filtros">
        <label className="gv-campo gv-campo-busqueda">
          <Icono nombre="search" tamano={17} />
          <input
            type="text"
            placeholder="Buscar por código o título..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>

        <label className="gv-campo gv-campo-select">
          <select value={escuela} onChange={(e) => setEscuela(e.target.value)}>
            <option value="">Escuela: Todas</option>
            {escuelas.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
          <Icono nombre="chevronDown" tamano={16} />
        </label>

        <label className="gv-campo gv-campo-select">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Estado: Todos</option>
            {Object.entries(ESTADOS_SUBSANACION).map(([codigo, { etiqueta }]) => (
              <option key={codigo} value={codigo}>{etiqueta}</option>
            ))}
          </select>
          <Icono nombre="chevronDown" tamano={16} />
        </label>
      </section>

      <section className="gv-card gv-tabla-contenedor">
        <div className="gv-tabla-scroll">
          <table className="gv-tabla">
            <thead>
              <tr>
                <th>ID</th>
                <th>Título de la propuesta</th>
                <th>Investigador/a</th>
                <th>Fecha de observación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => {
                const est = ESTADOS_SUBSANACION[fila.estado] ?? { etiqueta: fila.estadoDetalle, clase: 'revision' };
                return (
                  <tr key={fila.subsanacionId}>
                    <td>{fila.expedienteId}</td>
                    <td>{fila.titulo}</td>
                    <td>{fila.investigador}</td>
                    <td>{formatearFecha(fila.fechaObservacion, { punto: false })}</td>
                    <td>
                      <span className={`gv-badge ${est.clase}`}>{est.etiqueta}</span>
                    </td>
                    <td>
                      <button type="button" className="gv-btn-ver" onClick={() => setDetalle(fila)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
              {cargando && (
                <tr>
                  <td colSpan={6} className="gv-sin-resultados">Cargando subsanaciones...</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan={6} className="gv-sin-resultados">{error}</td>
                </tr>
              )}
              {!cargando && !error && visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="gv-sin-resultados">
                    {filas.length === 0
                      ? 'Aún no se han solicitado subsanaciones.'
                      : 'No hay subsanaciones que coincidan con los filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="gv-tabla-pie">
          <span className="gv-conteo">
            {visibles.length === 0
              ? 'Mostrando 0 de 0'
              : `Mostrando 1 - ${visibles.length} de ${visibles.length}`}
          </span>
        </div>
      </section>

      {detalle && (
        <ModalDetalleSubsanacion fila={detalle} onCerrar={() => setDetalle(null)} onActualizada={alActualizar} />
      )}
    </>
  );
};

export default Subsanaciones;
