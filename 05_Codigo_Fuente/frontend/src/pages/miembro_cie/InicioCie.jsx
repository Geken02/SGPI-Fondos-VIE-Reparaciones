import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cieService } from '../../services/cieService';
import { useCarga } from '../../components/cie/useCarga';
import {
  EncabezadoPagina,
  Cargando,
  ErrorCarga,
  Icono,
  EstadoBadge,
} from '../../components/cie/CieUi';

const InicioCie = () => {
  const {
    datos: expedientes,
    cargando,
    error,
    recargar,
  } = useCarga(() => cieService.listarExpedientes());

  useEffect(() => {
    document.title = 'Inicio - Miembro del CIE';
  }, []);

  const lista = useMemo(
    () => (Array.isArray(expedientes) ? expedientes : []),
    [expedientes]
  );

  const indicadores = [
    {
      etiqueta: 'Pendientes de resolución',
      valor: lista.length,
      icono: 'fileText',
      clase: 'azul',
    },
    {
      etiqueta: 'Por evaluar',
      valor: lista.filter((p) => p.estado === 'por_evaluar').length,
      icono: 'clock',
      clase: 'azul',
    },
    {
      etiqueta: 'En revisión',
      valor: lista.filter((p) => p.estado === 'en_revision').length,
      icono: 'clipboard',
      clase: 'naranja',
    },
    {
      etiqueta: 'Con observaciones',
      valor: lista.filter((p) => p.estado === 'con_observaciones').length,
      icono: 'alertCircle',
      clase: 'rojo',
    },
  ];

  const recientes = [...lista]
    .sort((a, b) => {
      const fechaA = a.fechaLimite || '9999-12-31';
      const fechaB = b.fechaLimite || '9999-12-31';
      return fechaA.localeCompare(fechaB);
    })
    .slice(0, 5);

  return (
    <div className="cie-inicio">
      <EncabezadoPagina
        titulo="Inicio"
        subtitulo="Panel de trabajo del Consejo de Investigación y Extensión (CIE). Consulta los expedientes pendientes y continúa con las tareas de resolución."
      />

      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando información del CIE..." />}

      {!cargando && !error && (
        <>
          <section className="gv-resumen" aria-label="Resumen de expedientes">
            {indicadores.map((item) => (
              <article className="gv-card gv-tarjeta-resumen" key={item.etiqueta}>
                <div className={`gv-resumen-icono ${item.clase}`}>
                  <Icono nombre={item.icono} size={23} />
                </div>
                <div>
                  <div className="gv-resumen-valor">{item.valor}</div>
                  <div className="gv-resumen-etiqueta">{item.etiqueta}</div>
                </div>
              </article>
            ))}
          </section>

          <section className="cie-inicio-accesos" aria-label="Accesos rápidos">
            <Link className="gv-card cie-inicio-acceso" to="/cie/expedientes">
              <span className="cie-inicio-acceso-icono">
                <Icono nombre="clipboard" size={24} />
              </span>
              <span className="cie-inicio-acceso-texto">
                <strong>Consultar expedientes</strong>
                <span>Revisa propuestas pendientes y continúa su evaluación.</span>
              </span>
              <Icono nombre="arrowRight" size={19} />
            </Link>

            <Link className="gv-card cie-inicio-acceso" to="/cie/resoluciones">
              <span className="cie-inicio-acceso-icono">
                <Icono nombre="checkCircle" size={24} />
              </span>
              <span className="cie-inicio-acceso-texto">
                <strong>Consultar resoluciones</strong>
                <span>Accede al registro de resoluciones emitidas.</span>
              </span>
              <Icono nombre="arrowRight" size={19} />
            </Link>
          </section>

          <section className="gv-card cie-inicio-recientes">
            <div className="cie-inicio-seccion-cabecera">
              <div>
                <h2>Expedientes pendientes</h2>
                <p>Propuestas que requieren seguimiento del CIE.</p>
              </div>
              <Link to="/cie/expedientes" className="cie-inicio-ver-todos">
                Ver todos <Icono nombre="arrowRight" size={15} />
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="gv-sin-resultados">
                No hay expedientes pendientes de resolución.
              </div>
            ) : (
              <div className="cie-inicio-lista">
                {recientes.map((propuesta) => (
                  <article className="cie-inicio-fila" key={propuesta.codigo}>
                    <div className="cie-inicio-fila-icono">
                      <Icono nombre="fileText" size={20} />
                    </div>
                    <div className="cie-inicio-fila-datos">
                      <strong>{propuesta.titulo}</strong>
                      <span>
                        {propuesta.codigo} · {propuesta.investigador}
                      </span>
                      <span>{propuesta.escuela}</span>
                    </div>
                    <div className="cie-inicio-fila-estado">
                      <EstadoBadge estado={propuesta.estado} />
                      <Link
                        to={`/cie/expedientes/${encodeURIComponent(propuesta.codigo)}`}
                        className="gv-btn-ver"
                      >
                        Revisar
                      </Link>
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

export default InicioCie;
