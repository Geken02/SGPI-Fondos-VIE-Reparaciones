// Inicio — panel de trabajo de la Dirección de Investigación (basado en InicioCie)
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { direccionService } from '../../services/direccionService';
import { useCarga } from '../../components/cie/useCarga';
import { formatearFecha, RUTA_BASE } from '../../components/direccion/direccionConstantes';
import { EncabezadoPagina, Cargando, ErrorCarga, Icono, EstadoTramiteBadge } from '../../components/direccion/DireccionUi';

const ACCESOS = [
  { to: `${RUTA_BASE}/dictamenes`, icono: 'clipboard', titulo: 'Dictámenes recibidos', texto: 'Revisa las resoluciones emitidas por el CIE.' },
  { to: `${RUTA_BASE}/documentos-oficiales`, icono: 'fileText', titulo: 'Documentos oficiales', texto: 'Genera los oficios de aprobación o rechazo.' },
  { to: `${RUTA_BASE}/notificacion`, icono: 'send', titulo: 'Notificaciones', texto: 'Notifica formalmente a los investigadores.' },
];

const InicioDireccion = () => {
  const { datos, cargando, error, recargar } = useCarga(() => direccionService.listarDictamenes());
  useEffect(() => { document.title = 'Inicio - Dirección de Investigación'; }, []);

  const lista = useMemo(() => (Array.isArray(datos) ? datos : []), [datos]);
  const contar = (e) => lista.filter((d) => d.estado === e).length;

  const indicadores = [
    { etiqueta: 'Dictámenes recibidos', valor: lista.length, icono: 'fileText', clase: 'azul' },
    { etiqueta: 'Por revisar', valor: contar('por_revisar'), icono: 'clock', clase: 'azul' },
    { etiqueta: 'En proceso de documento', valor: contar('en_proceso'), icono: 'clipboard', clase: 'naranja' },
    { etiqueta: 'Notificados', valor: contar('completado'), icono: 'checkCircle', clase: 'verde' },
  ];

  const pendientes = lista
    .filter((d) => d.estado !== 'completado')
    .sort((a, b) => a.fechaDictamen.localeCompare(b.fechaDictamen))
    .slice(0, 5);

  return (
    <div className="cie-inicio">
      <EncabezadoPagina titulo="Inicio"
        subtitulo="Panel de trabajo de la Dirección de Investigación. Recibe los dictámenes del CIE, genera los documentos oficiales y notifica a los investigadores." />

      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando información de la Dirección..." />}

      {!cargando && !error && (
        <>
          <section className="gv-resumen" aria-label="Resumen de dictámenes">
            {indicadores.map((i) => (
              <article className="gv-card gv-tarjeta-resumen" key={i.etiqueta}>
                <div className={`gv-resumen-icono ${i.clase}`}><Icono nombre={i.icono} size={23} /></div>
                <div>
                  <div className="gv-resumen-valor">{i.valor}</div>
                  <div className="gv-resumen-etiqueta">{i.etiqueta}</div>
                </div>
              </article>
            ))}
          </section>

          <section className="dir-accesos" aria-label="Accesos rápidos">
            {ACCESOS.map((a) => (
              <Link key={a.to} className="gv-card cie-inicio-acceso" to={a.to}>
                <span className="cie-inicio-acceso-icono"><Icono nombre={a.icono} size={24} /></span>
                <span className="cie-inicio-acceso-texto"><strong>{a.titulo}</strong><span>{a.texto}</span></span>
                <Icono nombre="arrowRight" size={19} />
              </Link>
            ))}
          </section>

          <section className="gv-card cie-inicio-recientes">
            <div className="cie-inicio-seccion-cabecera">
              <div>
                <h2>Dictámenes pendientes</h2>
                <p>Resoluciones del CIE que aún requieren documento oficial o notificación.</p>
              </div>
              <Link to={`${RUTA_BASE}/dictamenes`} className="cie-inicio-ver-todos">
                Ver todos <Icono nombre="arrowRight" size={15} />
              </Link>
            </div>

            {pendientes.length === 0 ? (
              <div className="gv-sin-resultados">No hay dictámenes pendientes.</div>
            ) : (
              <div className="cie-inicio-lista">
                {pendientes.map((d) => (
                  <article className="cie-inicio-fila" key={d.codigo}>
                    <div className="cie-inicio-fila-icono"><Icono nombre="fileText" size={20} /></div>
                    <div className="cie-inicio-fila-datos">
                      <strong>{d.titulo}</strong>
                      <span>{d.codigo} · {d.investigador}</span>
                      <span>{d.escuela} · Dictamen del {formatearFecha(d.fechaDictamen)}</span>
                    </div>
                    <div className="cie-inicio-fila-estado">
                      <EstadoTramiteBadge estado={d.estado} />
                      <Link to={`${RUTA_BASE}/dictamenes/${encodeURIComponent(d.codigo)}`} className="gv-btn-ver">Revisar</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default InicioDireccion;
