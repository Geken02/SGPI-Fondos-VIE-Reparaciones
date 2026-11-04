// src/pages/miembro_cie/BandejaCie.jsx
// Ventana 1: Expedientes pendientes de resolución (GET /cie/expedientes)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cieService } from '../../services/cieService';
import { ESTADOS_BANDEJA, formatearFecha } from '../../components/cie/cieConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { Icono, EstadoBadge, EncabezadoPagina, Cargando, ErrorCarga } from '../../components/cie/CieUi';

const POR_PAGINA = 8;

const BandejaCie = () => {
  const navigate = useNavigate();
  const { datos, cargando, error, recargar } = useCarga(() => cieService.listarExpedientes());
  const [busqueda, setBusqueda] = useState('');
  const [escuela, setEscuela] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => { document.title = 'Expedientes - Miembro del CIE'; }, []);

  const lista = useMemo(() => datos || [], [datos]);
  const escuelas = useMemo(() => [...new Set(lista.map((p) => p.escuela))].sort(), [lista]);
  const contar = (e) => lista.filter((p) => p.estado === e).length;

  const resumen = [
    { icono: 'fileText', clase: 'azul', valor: lista.length, etiqueta: 'Pendientes de resolución' },
    { icono: 'clock', clase: 'azul', valor: contar('por_evaluar'), etiqueta: 'Por evaluar' },
    { icono: 'clipboard', clase: 'naranja', valor: contar('en_revision'), etiqueta: 'En revisión' },
    { icono: 'alertCircle', clase: 'rojo', valor: contar('con_observaciones'), etiqueta: 'Con observaciones' },
  ];

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((p) =>
      (!escuela || p.escuela === escuela) &&
      (!estado || p.estado === estado) &&
      (!q || [p.codigo, p.titulo, p.investigador].some((c) => c.toLowerCase().includes(q))));
  }, [lista, busqueda, escuela, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  const cambiar = (setter) => (e) => { setter(e.target.value); setPagina(1); };
  const limpiar = () => { setBusqueda(''); setEscuela(''); setEstado(''); setPagina(1); };

  return (
    <>
      <EncabezadoPagina titulo="Expedientes para resolución"
        subtitulo="Revisa los expedientes consolidados, evalúalos con la rúbrica VIE y emite la resolución del CIE." />

      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando expedientes..." />}

      {!cargando && !error && (
        <>
          <div className="gv-resumen">
            {resumen.map((r) => (
              <div key={r.etiqueta} className="gv-card gv-tarjeta-resumen">
                <div className={`gv-resumen-icono ${r.clase}`}><Icono nombre={r.icono} size={24} /></div>
                <div>
                  <div className="gv-resumen-valor">{r.valor}</div>
                  <div className="gv-resumen-etiqueta">{r.etiqueta}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="gv-filtros">
            <label className="gv-campo gv-campo-busqueda">
              <Icono nombre="search" size={16} />
              <input type="text" placeholder="Buscar por código, título, investigador..."
                value={busqueda} onChange={cambiar(setBusqueda)} />
            </label>
            <label className="gv-campo gv-campo-select">
              <select value={escuela} onChange={cambiar(setEscuela)} aria-label="Filtrar por escuela">
                <option value="">Escuela: Todas</option>
                {escuelas.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <Icono nombre="chevronDown" size={16} />
            </label>
            <label className="gv-campo gv-campo-select">
              <select value={estado} onChange={cambiar(setEstado)} aria-label="Filtrar por estado">
                <option value="">Estado: Todos</option>
                {Object.entries(ESTADOS_BANDEJA).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
              </select>
              <Icono nombre="chevronDown" size={16} />
            </label>
            <button type="button" className="cie-btn-outline" onClick={limpiar}>
              <Icono nombre="sliders" size={15} />Limpiar filtros
            </button>
          </div>

          <div className="gv-card gv-tabla-contenedor">
            <div className="gv-tabla-scroll">
              <table className="gv-tabla">
                <thead>
                  <tr>
                    <th>ID</th><th>Título de la propuesta</th><th>Investigador/a principal</th>
                    <th>Escuela</th><th>Fecha límite</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((p) => (
                    <tr key={p.propuestaId}>
                      <td>{p.codigo}</td>
                      <td>{p.titulo}</td>
                      <td>{p.investigador}</td>
                      <td>{p.escuela}</td>
                      <td>{formatearFecha(p.fechaLimite)}</td>
                      <td><EstadoBadge estado={p.estado} /></td>
                      <td>
                        <button type="button" className="gv-btn-ver"
                          onClick={() => navigate(`/cie/expedientes/${p.codigo}`)}>
                          Revisar expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                  {visibles.length === 0 && (
                    <tr><td colSpan={7} className="gv-sin-resultados">
                      {lista.length === 0 ? 'No hay expedientes pendientes de resolución.'
                        : 'No hay expedientes pendientes que coincidan con los filtros.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="gv-tabla-pie">
              <span className="gv-conteo">
                {filtradas.length === 0 ? 'Mostrando 0 de 0'
                  : `Mostrando ${inicio + 1} - ${inicio + visibles.length} de ${filtradas.length}`}
              </span>
              <div className="gv-paginador">
                <button type="button" className="gv-pagina" disabled={paginaActual === 1}
                  onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior">
                  <Icono nombre="chevronLeft" size={14} />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <button key={i} type="button" className={`gv-pagina ${paginaActual === i + 1 ? 'activa' : ''}`}
                    onClick={() => setPagina(i + 1)}>{i + 1}</button>
                ))}
                <button type="button" className="gv-pagina" disabled={paginaActual === totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente">
                  <Icono nombre="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default BandejaCie;
