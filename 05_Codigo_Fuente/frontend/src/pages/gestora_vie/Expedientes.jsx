// src/pages/gestora_vie/Expedientes.jsx
// Ventana: Expedientes - Gestora VIE
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icono from '../../components/gestora/Iconos';
import { ESTADOS } from '../../data/estadosExpediente';
import { expedienteService } from '../../services/expedienteService';

const FILAS_POR_PAGINA = 5;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// '2026-09-25' -> '25 sep. 2026' (sin fecha -> '—')
const formatearFecha = (iso) => {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}. ${anio}`;
};

const TarjetaResumen = ({ icono, clase, valor, etiqueta }) => (
  <div className="gv-card gv-tarjeta-resumen">
    <div className={`gv-resumen-icono ${clase}`}>
      <Icono nombre={icono} tamano={22} />
    </div>
    <div>
      <div className="gv-resumen-valor">{valor}</div>
      <div className="gv-resumen-etiqueta">{etiqueta}</div>
    </div>
  </div>
);

const RESUMEN_VACIO = { total: 0, enRevision: 0, enSubsanacion: 0, listosCie: 0 };

const mensajeDeError = (error) =>
  error.response?.status === 403
    ? 'Tu usuario no tiene el rol de Gestora VIE para ver esta bandeja.'
    : 'No se pudieron cargar los expedientes. Verifica que el servidor esté en ejecución e intenta de nuevo.';

const Expedientes = () => {
  const navigate = useNavigate();
  const [expedientes, setExpedientes] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [escuela, setEscuela] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    document.title = 'Expedientes - Gestora VIE';
  }, []);

  // Carga de la bandeja desde el backend (propuestas enviadas a la VIE)
  useEffect(() => {
    let cancelado = false;
    expedienteService
      .obtenerBandeja()
      .then((datos) => {
        if (cancelado) return;
        setExpedientes(datos.expedientes);
        setResumen(datos.resumen);
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

  const escuelas = useMemo(
    () => [...new Set(expedientes.map((e) => e.escuela))].sort(),
    [expedientes]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return expedientes.filter((e) => {
      const coincideTexto =
        !texto ||
        e.id.toLowerCase().includes(texto) ||
        e.titulo.toLowerCase().includes(texto) ||
        e.investigador.toLowerCase().includes(texto);
      return coincideTexto && (!escuela || e.escuela === escuela) && (!estado || e.estado === estado);
    });
  }, [expedientes, busqueda, escuela, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + FILAS_POR_PAGINA);

  // Al cambiar un filtro se vuelve a la primera página
  const cambiarFiltro = (setter) => (e) => {
    setter(e.target.value);
    setPagina(1);
  };

  // Mientras carga (o si falló) no se muestra un 0 que parezca dato real
  const valorTarjeta = (n) => (cargando || error ? '—' : n);

  // "Ver" abre la Revisión VIE del expediente (id = código de la propuesta)
  const verExpediente = (id) => {
    navigate(`/gestora/expedientes/${encodeURIComponent(id)}/revision`);
  };

  return (
    <>
      <h1 className="gv-titulo">Bandeja principal de expedientes</h1>
      <p className="gv-subtitulo">Gestiona y da seguimiento a las propuestas de investigación.</p>

      <section className="gv-resumen">
        <TarjetaResumen icono="fileText" clase="azul" valor={valorTarjeta(resumen.total)} etiqueta="Total de expedientes" />
        <TarjetaResumen icono="clock" clase="azul" valor={valorTarjeta(resumen.enRevision)} etiqueta="En revisión" />
        <TarjetaResumen icono="alertCircle" clase="naranja" valor={valorTarjeta(resumen.enSubsanacion)} etiqueta="En subsanación" />
        <TarjetaResumen icono="checkCircle" clase="verde" valor={valorTarjeta(resumen.listosCie)} etiqueta="Listos para CIE" />
      </section>

      <section className="gv-filtros">
        <label className="gv-campo gv-campo-busqueda">
          <Icono nombre="search" tamano={17} />
          <input
            type="text"
            placeholder="Buscar por código, título o investigador..."
            value={busqueda}
            onChange={cambiarFiltro(setBusqueda)}
          />
        </label>

        <label className="gv-campo gv-campo-select">
          <select value={escuela} onChange={cambiarFiltro(setEscuela)}>
            <option value="">Escuela: Todas</option>
            {escuelas.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
          <Icono nombre="chevronDown" tamano={16} />
        </label>

        <label className="gv-campo gv-campo-select">
          <select value={estado} onChange={cambiarFiltro(setEstado)}>
            <option value="">Estado: Todos</option>
            {Object.entries(ESTADOS).map(([codigo, { etiqueta }]) => (
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
                <th>Investigador/a principal</th>
                <th>Escuela</th>
                <th>Estado</th>
                <th>Fecha límite</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.id}</td>
                  <td>{exp.titulo}</td>
                  <td>{exp.investigador}</td>
                  <td>{exp.escuela}</td>
                  <td>
                    <span
                      className={`gv-badge ${(ESTADOS[exp.estado] ?? {}).clase ?? 'revision'}`}
                      title={exp.estadoDetalle}
                    >
                      <span className="gv-badge-punto" />
                      {(ESTADOS[exp.estado] ?? {}).etiqueta ?? exp.estadoDetalle}
                    </span>
                  </td>
                  <td>{formatearFecha(exp.fechaLimite)}</td>
                  <td>
                    <div className="gv-acciones-fila">
                      <button type="button" className="gv-btn-ver" onClick={() => verExpediente(exp.id)}>Ver</button>
                      <button type="button" className="gv-btn-kebab" aria-label="Más acciones">
                        <Icono nombre="moreVertical" tamano={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cargando && (
                <tr>
                  <td colSpan={7} className="gv-sin-resultados">Cargando expedientes...</td>
                </tr>
              )}
              {!cargando && error && (
                <tr>
                  <td colSpan={7} className="gv-sin-resultados">{error}</td>
                </tr>
              )}
              {!cargando && !error && visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="gv-sin-resultados">
                    {expedientes.length === 0
                      ? 'Aún no hay propuestas enviadas a la VIE.'
                      : 'No hay expedientes que coincidan con los filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="gv-tabla-pie">
          <span className="gv-conteo">
            {filtrados.length === 0
              ? 'Mostrando 0 de 0'
              : `Mostrando ${inicio + 1} - ${inicio + visibles.length} de ${filtrados.length}`}
          </span>

          <div className="gv-paginador">
            <button
              type="button"
              className="gv-pagina"
              disabled={paginaActual === 1}
              onClick={() => setPagina(paginaActual - 1)}
              aria-label="Página anterior"
            >
              <Icono nombre="chevronLeft" tamano={15} />
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`gv-pagina ${n === paginaActual ? 'activa' : ''}`}
                onClick={() => setPagina(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="gv-pagina"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
              aria-label="Página siguiente"
            >
              <Icono nombre="chevronRight" tamano={15} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Expedientes;
