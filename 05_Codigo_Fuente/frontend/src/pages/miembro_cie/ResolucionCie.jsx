// src/pages/miembro_cie/ResolucionCie.jsx
// Ventana 4: Resolución del CIE (POST /miembro-cie/expedientes/:codigo/resolucion)
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { cieService, mensajeError } from '../../services/cieService';
import { DECISIONES, ETIQUETA_DECISION } from '../../components/cie/cieConstantes';
import { useCarga } from '../../components/cie/useCarga';
import {
  Icono, Pasos, CabeceraExpediente, Radio, AreaTexto, EncabezadoPagina, VolverALaBandeja, Cargando, ErrorCarga,
} from '../../components/cie/CieUi';

const R = 52;
const CIRC = 2 * Math.PI * R;

const cargar = async (codigo) => {
  const [expediente, rubrica, evaluacion] = await Promise.all([
    cieService.obtenerExpediente(codigo),
    cieService.obtenerRubrica(),
    cieService.obtenerEvaluacion(codigo),
  ]);
  return { expediente, rubrica, evaluacion };
};

const ResolucionCie = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { datos, cargando, error, recargar } = useCarga(() => cargar(codigo), [codigo]);

  const [decision, setDecision] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [intento, setIntento] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [errorEmitir, setErrorEmitir] = useState('');

  useEffect(() => { document.title = 'Resolución del CIE - Miembro del CIE'; }, []);

  if (cargando) return <><VolverALaBandeja /><Cargando texto="Cargando resultado..." /></>;
  if (error) return <><VolverALaBandeja /><ErrorCarga error={error} alReintentar={error.estado === 404 ? null : recargar} /></>;

  const { expediente, rubrica, evaluacion } = datos;
  if (expediente.resuelta) return <Navigate to="/cie/resoluciones" replace />;
  if (!rubrica.configurada || evaluacion.estado !== 'Completada') return (
    <><VolverALaBandeja /><EncabezadoPagina titulo="Resolución del CIE" subtitulo="Revisión de requisitos para emitir la resolución." />
      <div className="gv-card cie-estado" role="status">Para emitir una resolución se requiere una rúbrica institucional validada y una evaluación completada. La API actual permite guardar únicamente borradores.</div>
    </>
  );
  if (!evaluacion.existe) return <Navigate to={`/cie/expedientes/${codigo}/rubrica`} replace />;

  const maximo = rubrica.escala.maximo;
  const calificacion = evaluacion.calificacion ?? 0;
  const puntajePor = Object.fromEntries(evaluacion.puntajes.map((p) => [p.criterioId, p.puntaje]));
  const faltaJustificacion = justificacion.trim() === '';
  const faltaDecision = decision === '';

  const emitir = async () => {
    setIntento(true);
    setErrorEmitir('');
    if (faltaJustificacion || faltaDecision) return;
    setEmitiendo(true);
    try {
      await cieService.emitirResolucion(codigo, { decision, justificacion: justificacion.trim() });
      navigate('/cie/resoluciones', {
        state: { mensaje: `Resolución de ${codigo} emitida (${ETIQUETA_DECISION[decision].toLowerCase()}) y enviada a la Dirección de Investigación.` },
      });
    } catch (e) {
      setErrorEmitir(mensajeError(e, 'No se pudo emitir la resolución.'));
    } finally {
      setEmitiendo(false);
    }
  };

  return (
    <>
      <VolverALaBandeja />
      <EncabezadoPagina titulo="Resolución del CIE"
        subtitulo="Revisa el resultado de la rúbrica y determina si la propuesta se aprueba o se rechaza." />

      <CabeceraExpediente expediente={expediente} />

      <section className="gv-card gv-panel-revision">
        <Pasos actual={3} />

        <div className="cie-grid-2 cie-grid-res">
          <div className="gv-subcard">
            <h3 className="gv-subcard-titulo">Resultado de la evaluación</h3>
            <div className="cie-resultado">
              <div className="cie-donut">
                <svg viewBox="0 0 120 120" role="img" aria-label={`Promedio ${calificacion.toFixed(1)} de ${maximo}`}>
                  <defs>
                    <linearGradient id="cieGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0f9d8a" /><stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r={R} fill="none" stroke="#e2eef0" strokeWidth="11" />
                  <circle cx="60" cy="60" r={R} fill="none" stroke="url(#cieGrad)" strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={`${(calificacion / maximo) * CIRC} ${CIRC}`} transform="rotate(-90 60 60)" />
                </svg>
                <div className="cie-donut-centro"><strong>{calificacion.toFixed(1)}/{maximo}</strong><span>Promedio general</span></div>
              </div>
              <ul className="cie-resumen-criterios">
                {rubrica.criterios.map((c) => (
                  <li key={c.criterioId}>
                    <span><Icono nombre="check" size={12} />{c.nombre}</span>
                    <b>{Number(puntajePor[c.criterioId] ?? 0).toFixed(1)}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="gv-subcard cie-consideraciones">
            <h3 className="gv-subcard-titulo"><Icono nombre="info" size={16} /> Observaciones de la rúbrica</h3>
            <p className="cie-obs">{evaluacion.observaciones || 'No registraste observaciones en la rúbrica.'}</p>
            <p className="cie-obs cie-obs-nota">La resolución será recibida por la Dirección de Investigación, que notificará a los investigadores.</p>
          </div>
        </div>

        <div className="cie-grid-2 cie-grid-dec">
          <div className="gv-subcard">
            <h3 className="gv-subcard-titulo">Decisión del CIE</h3>
            <div className="cie-cuerpo">
              <div className="cie-radios">
                {DECISIONES.map((r) => (
                  <Radio key={r} name="decision" value={r} checked={decision === r} onChange={setDecision}>{r}</Radio>
                ))}
              </div>
              {intento && faltaDecision && <p className="cie-error" role="alert">Selecciona una decisión.</p>}
            </div>
          </div>
          <div className="gv-subcard">
            <h3 className="gv-subcard-titulo">Justificación de la decisión</h3>
            <div className="cie-cuerpo">
              <AreaTexto value={justificacion} onChange={setJustificacion} invalido={intento && faltaJustificacion} max={4000}
                placeholder="Ingrese la justificación de la decisión del comité..." />
              {intento && faltaJustificacion && <p className="cie-error" role="alert">Ingresa la justificación para emitir la resolución.</p>}
            </div>
          </div>
        </div>
      </section>

      {errorEmitir && <p className="cie-error cie-error-pagina" role="alert">{errorEmitir}</p>}

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`/cie/expedientes/${codigo}/rubrica`)}>
          <Icono nombre="arrowLeft" size={15} />Volver a la rúbrica
        </button>
        <button type="button" className="gv-btn-primario" onClick={emitir} disabled={emitiendo}>
          {emitiendo ? 'Emitiendo...' : 'Emitir resolución'} <Icono nombre="arrowRight" size={16} />
        </button>
      </div>
    </>
  );
};

export default ResolucionCie;
