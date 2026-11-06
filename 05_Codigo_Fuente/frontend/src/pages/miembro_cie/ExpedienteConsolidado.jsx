// src/pages/miembro_cie/ExpedienteConsolidado.jsx
// Ventana 2: Expediente consolidado (GET /miembro-cie/expedientes/:codigo)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cieService } from '../../services/cieService';
import { formatearFecha, formatearMonto } from '../../components/cie/cieConstantes';
import { useCarga } from '../../components/cie/useCarga';
import {
  Icono, CabeceraExpediente, Pasos, EncabezadoPagina, VolverALaBandeja, Cargando, ErrorCarga,
} from '../../components/cie/CieUi';

const TABS = ['Información general', 'Formulario Form-04', 'Documentos', 'Dictámenes', 'Historial'];

const Vacio = ({ texto }) => <p className="gv-sin-resultados">{texto}</p>;

const ExpedienteConsolidado = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS[0]);
  const { datos: e, cargando, error, recargar } = useCarga(() => cieService.obtenerExpediente(codigo), [codigo]);

  useEffect(() => { document.title = 'Expediente consolidado - Miembro del CIE'; }, []);

  if (cargando) return <><VolverALaBandeja /><Cargando texto="Cargando expediente..." /></>;
  if (error) return <><VolverALaBandeja /><ErrorCarga error={error} alReintentar={error.estado === 404 ? null : recargar} /></>;

  const filas = [
    ['Título:', e.titulo],
    ['Investigador principal:', e.investigador],
    ['Escuela:', e.escuela],
    e.modalidad && ['Modalidad:', e.modalidad],
    ['Monto total:', formatearMonto(e.montoTotal)],
    e.nivelTrlActual != null && ['TRL actual / esperado:', `${e.nivelTrlActual} / ${e.nivelTrlEsperado ?? '—'}`],
    e.fechaInicio && ['Fecha de inicio:', formatearFecha(e.fechaInicio)],
    e.fechaFinalizacion && ['Fecha de fin:', formatearFecha(e.fechaFinalizacion)],
  ].filter(Boolean);

  return (
    <>
      <VolverALaBandeja />
      <EncabezadoPagina titulo="Expediente consolidado"
        subtitulo="Consulta el resumen, los dictámenes y el historial antes de evaluar con la rúbrica VIE." />

      <CabeceraExpediente expediente={e} />

      <section className="gv-card gv-panel-revision">
        <Pasos actual={1} />

        <div className="cie-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t}
              className={tab === t ? 'activa' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Información general' && (
          <div className="cie-grid-2">
            <div className="gv-subcard">
              <h3 className="gv-subcard-titulo">Resumen de la propuesta</h3>
              <dl className="cie-dl">
                {filas.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
              </dl>
            </div>

            <div className="gv-subcard">
              <h3 className="gv-subcard-titulo">Observaciones de la Gestora VIE</h3>
              {(e.subsanaciones ?? []).length === 0 ? (
                <Vacio texto="La Gestora VIE no ha registrado observaciones." />
              ) : (
                <ul className="cie-checklist">
                  {(e.subsanaciones ?? []).map((s) => (
                    <li key={s.subsanacionId} className="cie-subsanacion">
                      <div>
                        <strong>{formatearFecha(s.fechaSolicitud)}</strong>
                        <p>{s.comentarioGestora}</p>
                        {s.respuestaInvestigador && (
                          <p className="cie-respuesta">Respuesta ({formatearFecha(s.fechaRespuesta)}): {s.respuestaInvestigador}</p>
                        )}
                      </div>
                      <span className={`gv-badge ${s.pendiente ? 'pendiente' : 'listo'}`}>
                        <span className="gv-badge-punto" />{s.pendiente ? 'Sin respuesta' : 'Respondida'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'Formulario Form-04' && (
          !e.contenidoPropuesta ? <Vacio texto="La propuesta no tiene contenido estructurado del Form-04 registrado." /> : (
            <div className="cie-grid-2">
              {[
                ['Resumen', e.contenidoPropuesta.resumen],
                ['Palabras clave', e.contenidoPropuesta.palabrasClave],
                ['Problema de investigación', e.contenidoPropuesta.problemaInvestigacion],
                ['Objetivo general', e.contenidoPropuesta.objetivoGeneral],
                ['Objetivos específicos', e.contenidoPropuesta.objetivosEspecificos],
                ['Estado del arte', e.contenidoPropuesta.estadoArte],
                ['Metodología', e.contenidoPropuesta.metodologia],
                ['Estrategia de divulgación', e.contenidoPropuesta.estrategiaDivulgacion],
                ['Hoja de ruta', e.contenidoPropuesta.hojaRuta],
              ].filter(([, valor]) => valor).map(([titulo, valor]) => (
                <article className="gv-subcard" key={titulo}>
                  <h3 className="gv-subcard-titulo">{titulo}</h3>
                  <p className="cie-texto-documento">{valor}</p>
                </article>
              ))}
            </div>
          )
        )}

        {tab === 'Documentos' && ((e.documentos ?? []).length === 0 ? <Vacio texto="El expediente no tiene documentos cargados." /> : (
          <div className="gv-tabla-scroll">
            <table className="gv-tabla">
              <thead><tr><th>Archivo</th><th>Tipo</th><th>Fecha de carga</th></tr></thead>
              <tbody>
                {(e.documentos ?? []).map((d) => (
                  <tr key={d.documentoId}><td>{d.nombreArchivo}</td><td>{d.tipo}</td><td>{formatearFecha(d.fechaCarga)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {tab === 'Dictámenes' && ((e.dictamenes ?? []).length === 0 ? <Vacio texto="Aún no hay dictámenes registrados." /> : (
          <div className="cie-lista-tarjetas">
            {(e.dictamenes ?? []).map((d) => (
              <div key={d.dictamenId} className="gv-subcard cie-tarjeta">
                <div className="cie-tarjeta-cabeza">
                  <strong>Dictamen {d.tipo || ''}{d.numeroOficio ? ` · Oficio ${d.numeroOficio}` : ''}</strong>
                  <span>{formatearFecha(d.fechaEmision)} · {d.remitente}</span>
                </div>
                <p>{d.contenido}</p>
              </div>
            ))}
          </div>
        ))}

        {tab === 'Historial' && ((e.historial ?? []).length === 0 ? <Vacio texto="Sin cambios de estado registrados." /> : (
          <div className="gv-tabla-scroll">
            <table className="gv-tabla">
              <thead><tr><th>Fecha</th><th>De</th><th>A</th><th>Responsable</th><th>Observaciones</th></tr></thead>
              <tbody>
                {(e.historial ?? []).map((h, i) => (
                  <tr key={i}>
                    <td>{formatearFecha(h.fecha)}</td><td>{h.estadoAnterior || '—'}</td><td>{h.estadoNuevo}</td>
                    <td>{h.responsable}</td><td>{h.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate('/cie/expedientes')}>
          <Icono nombre="arrowLeft" size={15} />Volver a la bandeja
        </button>
        {e.resuelta ? (
          <button type="button" className="gv-btn-primario" onClick={() => navigate('/cie/resoluciones')}>
            Ver en el historial de resoluciones <Icono nombre="arrowRight" size={16} />
          </button>
        ) : (
          <button type="button" className="gv-btn-primario"
            onClick={() => navigate(`/cie/expedientes/${codigo}/rubrica`)}>
            Evaluar con rúbrica VIE <Icono nombre="arrowRight" size={16} />
          </button>
        )}
      </div>
    </>
  );
};

export default ExpedienteConsolidado;

