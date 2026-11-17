import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cieService } from '../../services/cieService';
import { formatearFecha } from '../../components/cie/cieConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { Icono, EncabezadoPagina, Cargando, ErrorCarga } from '../../components/cie/CieUi';

const POR_PAGINA = 8;

const ResolucionesCie = () => {
  const { datos, cargando, error, recargar } = useCarga(() => cieService.listarResoluciones());
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    document.title = 'Resoluciones - Miembro del CIE';
  }, []);

  const historial = useMemo(
    () => Array.isArray(datos) ? datos : [],
    [datos]
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return historial;

    return historial.filter((r) =>
      [r.codigo, r.titulo, r.numeroOficio, r.contenido]
        .some((campo) => String(campo ?? '').toLowerCase().includes(q))
    );
  }, [historial, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  const cambiarBusqueda = (e) => {
    setBusqueda(e.target.value);
    setPagina(1);
    setAbierta(null);
  };

  const irA = (n) => {
    setPagina(n);
    setAbierta(null);
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Historial de resoluciones"
        subtitulo="Consulta de resoluciones registradas por el CIE."
      />

      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando resoluciones..." />}

      {!cargando && !error && (
        <>
          <div className="gv-resumen" role="region" aria-label="Resumen de resoluciones">
            <div className="gv-card gv-tarjeta-resumen" role="region" aria-label={`Resoluciones registradas: ${historial.length}`}>
              <div className="gv-resumen-icono azul" aria-hidden="true">
                <Icono nombre="fileText" size={24} />
              </div>
              <div>
                <div className="gv-resumen-valor">{historial.length}</div>
                <div className="gv-resumen-etiqueta">Resoluciones registradas</div>
              </div>
            </div>
          </div>

          <div className="gv-filtros" role="search" aria-label="Búsqueda de resoluciones">
            <label className="gv-campo gv-campo-busqueda">
              <Icono nombre="search" size={16} aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar por código, título, oficio o contenido..."
                value={busqueda}
                onChange={cambiarBusqueda}
                aria-label="Buscar resolución por código, título, oficio o contenido"
              />
            </label>
            <button
              type="button"
              className="cie-btn-outline"
              aria-label="Limpiar término de búsqueda de resoluciones"
              onClick={() => {
                setBusqueda('');
                setPagina(1);
                setAbierta(null);
              }}
            >
              <Icono nombre="sliders" size={15} aria-hidden="true" />
              Limpiar búsqueda
            </button>
          </div>

          <div className="gv-card gv-tabla-contenedor">
            <div className="gv-tabla-scroll">
              <table className="gv-tabla">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Título de la propuesta</th>
                    <th>Número de oficio</th>
                    <th>Fecha de emisión</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => {
                    const id = r.dictamenId ?? r.propuestaId ?? r.codigo;
                    const expandida = abierta === id;

                    return (
                      <Fragment key={id}>
                        <tr>
                          <td>{r.codigo || '—'}</td>
                          <td>{r.titulo || 'Sin título disponible'}</td>
                          <td>{r.numeroOficio || 'No indicado'}</td>
                          <td>{r.fechaEmision ? formatearFecha(r.fechaEmision) : '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="gv-btn-ver"
                              aria-label={`${expandida ? 'Ocultar' : 'Ver'} detalle de resolución para propuesta ${r.codigo}`}
                              aria-expanded={expandida}
                              onClick={() => setAbierta(expandida ? null : id)}
                            >
                              {expandida ? 'Ocultar detalle' : 'Ver detalle'}
                            </button>
                          </td>
                        </tr>
                        {expandida && (
                          <tr className="cie-fila-detalle">
                            <td colSpan={5}>
                              <div className="cie-detalle">
                                <strong>Contenido de la resolución</strong>
                                <p style={{ whiteSpace: 'pre-wrap' }}>
                                  {r.contenido || 'La resolución no tiene contenido registrado.'}
                                </p>
                                {r.rutaArchivo && (
                                  <p>
                                    Archivo asociado: {r.rutaArchivo}
                                  </p>
                                )}
                                <Link
                                  to={`/cie/expedientes/${r.codigo}`}
                                  className="cie-enlace"
                                  aria-label={`Ver expediente consolidado de ${r.codigo}`}
                                >
                                  Ver expediente consolidado
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}

                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="gv-sin-resultados">
                        {historial.length === 0
                          ? 'Aún no hay resoluciones registradas.'
                          : 'No hay resoluciones que coincidan con la búsqueda.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="gv-tabla-pie">
              <span className="gv-conteo">
                {filtradas.length === 0
                  ? 'Mostrando 0 de 0'
                  : `Mostrando ${inicio + 1} - ${inicio + visibles.length} de ${filtradas.length}`}
              </span>
              <div className="gv-paginador">
                <button
                  type="button"
                  className="gv-pagina"
                  disabled={paginaActual === 1}
                  onClick={() => irA(paginaActual - 1)}
                  aria-label="Página anterior"
                >
                  <Icono nombre="chevronLeft" size={14} aria-hidden="true" />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`gv-pagina ${paginaActual === i + 1 ? 'activa' : ''}`}
                    onClick={() => irA(i + 1)}
                    aria-label={`Página ${i + 1}`}
                    aria-current={paginaActual === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="gv-pagina"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => irA(paginaActual + 1)}
                  aria-label="Página siguiente"
                >
                  <Icono nombre="chevronRight" size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ResolucionesCie;
