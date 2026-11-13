// Ventana 2: Revisión de dictamen (GET /direccion-investigacion/dictamenes/:codigo)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { direccionService } from '../../services/direccionService';
import { formatearFechaHora, promedioPonderado, RUTA_BASE } from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import {
  Icono, EstadoTramiteBadge, DecisionBadge, EncabezadoPagina, VolverALaBandeja, Cargando, ErrorCarga,
} from '../../components/direccion/DireccionUi';

const TABS = ['Resumen', 'Dictamen del CIE', 'Documentos', 'Historial'];

const RevisionDictamen = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Dictamen del CIE');
  const { datos: d, cargando, error, recargar } = useCarga(() => direccionService.obtenerDictamen(codigo), [codigo]);

  useEffect(() => { document.title = 'Revisión de dictamen - Dirección de Investigación'; }, []);

  if (cargando) return <><VolverALaBandeja /><Cargando texto="Cargando dictamen..." /></>;
  if (error) return <><VolverALaBandeja /><ErrorCarga error={error} alReintentar={error.estado === 404 ? null : recargar} /></>;

  const promedio = promedioPonderado(d.criterios);
  const eventos = [
    { fecha: d.fechaDictamen, texto: `Resolución del CIE: ${d.decision === 'Aprobar' ? 'aprobada' : 'rechazada'}`, responsable: 'CIE' },
    ...(d.historial ?? []).map((h) => ({ fecha: h.fecha, texto: h.estado, responsable: h.responsable })),
  ];

  return (
    <>
      <VolverALaBandeja />
      <EncabezadoPagina titulo="Revisión de dictamen"
        subtitulo="Consulta el detalle del dictamen y la información de la propuesta." />

      <section className="gv-card gv-expediente-info" aria-label="Información del dictamen">
        <div className="gv-expediente-icono" aria-hidden="true"><Icono nombre="fileText" size={26} /></div>
        <div className="gv-expediente-datos">
          <div className="gv-expediente-codigo">{d.codigo}</div>
          <div className="gv-expediente-titulo">{d.titulo}</div>
          <div className="cie-meta">
            <span><Icono nombre="usuario" size={14} aria-hidden="true" />{d.investigador}</span>
            <span><Icono nombre="escuela" size={14} aria-hidden="true" />{d.escuela}</span>
            <span><Icono nombre="calendar" size={14} aria-hidden="true" />{formatearFechaHora(d.fechaDictamen)}</span>
          </div>
        </div>
        <div className="gv-expediente-lateral"><EstadoTramiteBadge estado={d.estado} /></div>
      </section>

      <section className="gv-card dir-panel" aria-label="Detalle del dictamen">
        <div className="cie-tabs" role="tablist" aria-label="Pestañas de revisión de dictamen">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t}
              className={tab === t ? 'activa' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Resumen' && (
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Resumen de la propuesta</h3>
            <dl className="cie-dl">
              {[['Título:', d.titulo], ['Investigador principal:', d.investigador], ['Escuela:', d.escuela],
                ['Fecha del dictamen:', formatearFechaHora(d.fechaDictamen)]].map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
              <div><dt>Decisión del CIE:</dt><dd><DecisionBadge decision={d.decision} /></dd></div>
              <div><dt>Estado del trámite:</dt><dd><EstadoTramiteBadge estado={d.estado} /></dd></div>
            </dl>
          </div>
        )}

        {tab === 'Dictamen del CIE' && (
          <>
            <div className="cie-grid-2">
              <div className="dir-subcard">
                <h3 className="gv-subcard-titulo">Decisión del CIE</h3>
                <dl className="cie-dl">
                  <div><dt>Decisión:</dt><dd><DecisionBadge decision={d.decision} /></dd></div>
                  <div><dt>Fecha de resolución:</dt><dd>{formatearFechaHora(d.fechaDictamen)}</dd></div>
                  <div><dt>Justificación:</dt><dd>{d.justificacion}</dd></div>
                  <div><dt>Observaciones:</dt><dd>{d.observaciones || 'No se registran observaciones.'}</dd></div>
                </dl>
              </div>

              <div className="dir-subcard">
                <h3 className="gv-subcard-titulo">Rúbrica VIE (resumen)</h3>
                <div className="cie-criterios">
                  <div className="cie-criterios-head"><span>Criterio</span><span>Peso · Puntaje</span></div>
                  {d.criterios.map((c) => (
                    <div className="cie-criterio" key={c.nombre}>
                      <span>{c.nombre}</span>
                      <span><span className="cie-peso">{c.peso}%</span> · <b>{c.puntaje.toFixed(1)}</b></span>
                    </div>
                  ))}
                  <div className="cie-promedio"><strong>Promedio</strong><strong>{promedio.toFixed(1)} / 5</strong></div>
                </div>
              </div>
            </div>

            <div className="dir-subcard">
              <h3 className="gv-subcard-titulo">Documentos del expediente</h3>
              <ul className="dir-chips">
                {d.documentos.map((doc) => (
                  <li key={doc.documentoId}><Icono nombre="fileText" size={14} />{doc.nombre}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {tab === 'Documentos' && (
          <div className="gv-tabla-scroll">
            <table className="gv-tabla">
              <thead><tr><th>Archivo</th><th>Origen</th></tr></thead>
              <tbody>
                {d.documentos.map((doc) => <tr key={doc.documentoId}><td>{doc.nombre}</td><td>Expediente consolidado</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Historial' && (
          <div className="gv-tabla-scroll">
            <table className="gv-tabla">
              <thead><tr><th>Fecha</th><th>Evento</th><th>Responsable</th></tr></thead>
              <tbody>
                {eventos.map((e, i) => <tr key={i}><td>{formatearFechaHora(e.fecha)}</td><td>{e.texto}</td><td>{e.responsable}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`${RUTA_BASE}/dictamenes`)} aria-label="Volver a la bandeja de dictámenes">
          <Icono nombre="arrowLeft" size={15} aria-hidden="true" />Volver a la bandeja
        </button>
        <div className="dir-acciones-der">
          {d.estado === 'completado' ? (
            <span className="dir-nota-estado"><Icono nombre="checkCircle" size={16} aria-hidden="true" />Este dictamen ya fue notificado.</span>
          ) : (
            <button type="button" className="gv-btn-primario" onClick={() => navigate(`${RUTA_BASE}/documentos-oficiales/${d.codigo}`)} aria-label="Generar documento oficial para esta propuesta">
              Generar documento oficial <Icono nombre="arrowRight" size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default RevisionDictamen;
