// Ventana 1: Bandeja de dictámenes recibidos (GET /direccion-investigacion/dictamenes)
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { direccionService } from '../../services/direccionService';
import { ESTADOS_TRAMITE, formatearFecha, RUTA_BANDEJA } from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import {
  Icono, EstadoTramiteBadge, DecisionBadge, EncabezadoPagina, Cargando, ErrorCarga, AvisoExito,
} from '../../components/direccion/DireccionUi';

const POR_PAGINA = 8;

const DictamenesRecibidos = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { datos, cargando, error, recargar } = useCarga(() => direccionService.listarDictamenes());
  const [busqueda, setBusqueda] = useState('');
  const [escuela, setEscuela] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => { document.title = 'Dictámenes recibidos - Dirección de Investigación'; }, []);

  const lista = useMemo(() => datos || [], [datos]);
  const escuelas = useMemo(() => [...new Set(lista.map((d) => d.escuela))].sort(), [lista]);
  const contar = (e) => lista.filter((d) => d.estado === e).length;

  const resumen = [
    { icono: 'fileText', clase: 'azul', valor: lista.length, etiqueta: 'Total de dictámenes' },
    { icono: 'clock', clase: 'azul', valor: contar('por_revisar'), etiqueta: 'Por revisar' },
    { icono: 'clipboard', clase: 'naranja', valor: contar('en_proceso'), etiqueta: 'En proceso de documento' },
    { icono: 'checkCircle', clase: 'verde', valor: contar('completado'), etiqueta: 'Notificados' },
  ];

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((d) =>
      (!escuela || d.escuela === escuela) && (!estado || d.estado === estado) &&
      (!q || [d.codigo, d.titulo, d.investigador, d.escuela].some((c) => c.toLowerCase().includes(q))));
  }, [lista, busqueda, escuela, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);

  const cambiar = (setter) => (e) => { setter(e.target.value); setPagina(1); };
  const limpiar = () => { setBusqueda(''); setEscuela(''); setEstado(''); setPagina(1); };

  return (
    <>
      <EncabezadoPagina titulo="Bandeja de dictámenes recibidos"
        subtitulo="Consulta los dictámenes enviados por el CIE y gestiona la emisión de los documentos oficiales." />

      <AvisoExito texto={state?.mensaje} />
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando dictámenes..." />}

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
              <input type="text" placeholder="Buscar por código, título, investigador o escuela..."
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
                {Object.entries(ESTADOS_TRAMITE).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
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
                    <th>Código</th><th>Título de la propuesta</th><th>Investigador/a principal</th><th>Escuela</th>
                    <th>Fecha de dictamen</th><th>Decisión del CIE</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((d) => (
                    <tr key={d.propuestaId}>
                      <td>{d.codigo}</td>
                      <td>{d.titulo}</td>
                      <td>{d.investigador}</td>
                      <td>{d.escuela}</td>
                      <td>{formatearFecha(d.fechaDictamen)}</td>
                      <td><DecisionBadge decision={d.decision} /></td>
                      <td><EstadoTramiteBadge estado={d.estado} /></td>
                      <td>
                        <button type="button" className="gv-btn-ver"
                          onClick={() => navigate(`${RUTA_BANDEJA}/${d.codigo}`)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                  {visibles.length === 0 && (
                    <tr><td colSpan={8} className="gv-sin-resultados">
                      {lista.length === 0 ? 'Aún no se han recibido dictámenes del CIE.' : 'No hay dictámenes que coincidan con los filtros.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="gv-tabla-pie">
              <span className="gv-conteo">
                {filtrados.length === 0 ? 'Mostrando 0 de 0'
                  : `Mostrando ${inicio + 1} - ${inicio + visibles.length} de ${filtrados.length}`}
              </span>
              <div className="gv-paginador">
                <button type="button" className="gv-pagina" disabled={paginaActual === 1}
                  onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior"><Icono nombre="chevronLeft" size={14} /></button>
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <button key={i} type="button" className={`gv-pagina ${paginaActual === i + 1 ? 'activa' : ''}`}
                    onClick={() => setPagina(i + 1)}>{i + 1}</button>
                ))}
                <button type="button" className="gv-pagina" disabled={paginaActual === totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente"><Icono nombre="chevronRight" size={14} /></button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DictamenesRecibidos;
