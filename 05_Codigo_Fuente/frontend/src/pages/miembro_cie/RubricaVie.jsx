// src/pages/miembro_cie/RubricaVie.jsx
// Ventana 3: Rúbrica VIE digital
//   GET /cie/rubrica · GET/PUT /cie/expedientes/:codigo/evaluacion
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { cieService, mensajeError } from '../../services/cieService';
import { DECISIONES, calcularPromedio } from '../../components/cie/cieConstantes';
import { useCarga } from '../../components/cie/useCarga';
import {
  Icono, Pasos, CabeceraExpediente, Radio, AreaTexto, EncabezadoPagina, VolverALaBandeja, Cargando, ErrorCarga,
} from '../../components/cie/CieUi';

const cargar = async (codigo) => {
  const [expediente, rubrica, evaluacion] = await Promise.all([
    cieService.obtenerExpediente(codigo),
    cieService.obtenerRubrica(),
    cieService.obtenerEvaluacion(codigo),
  ]);
  return { expediente, rubrica, evaluacion };
};

const RubricaVie = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { datos, cargando, error, recargar } = useCarga(() => cargar(codigo), [codigo]);

  const [puntajes, setPuntajes] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [decision, setDecision] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => { document.title = 'Rúbrica VIE - Miembro del CIE'; }, []);

  // Precarga el borrador guardado (si existe)
  useEffect(() => {
    if (!datos) return;
    const previa = datos.evaluacion;
    setPuntajes(previa.existe ? Object.fromEntries(previa.puntajes.map((p) => [p.criterioId, p.puntaje])) : {});
    setObservaciones(previa.observaciones || '');
    setDecision(previa.decision || '');
  }, [datos]);

  if (cargando) return <><VolverALaBandeja /><Cargando texto="Cargando rúbrica..." /></>;
  if (error) return <><VolverALaBandeja /><ErrorCarga error={error} alReintentar={error.estado === 404 ? null : recargar} /></>;

  const { expediente, rubrica } = datos;
  if (expediente.resuelta) return <Navigate to="/cie/resoluciones" replace />;
  if (!rubrica.configurada) return (
    <><VolverALaBandeja /><EncabezadoPagina titulo="Rúbrica VIE digital" subtitulo="Configuración institucional pendiente." />
      <div className="gv-card cie-estado" role="status">La API todavía no proporciona una rúbrica CIE completa con su escala de calificación validada. El cierre de la evaluación permanece pendiente de esa configuración.</div>
    </>
  );

  const { criterios, escala } = rubrica;
  const opciones = Array.from({ length: Math.floor(escala.maximo - escala.minimo) + 1 }, (_, i) => escala.minimo + i);
  const completos = criterios.every((c) => puntajes[c.criterioId] !== undefined && puntajes[c.criterioId] !== '');
  const promedio = calcularPromedio(criterios, puntajes);
  const faltaDecision = decision === '';

  const guardar = async () => {
    setIntento(true);
    setErrorGuardar('');
    if (!completos || faltaDecision) return;
    setGuardando(true);
    try {
      await cieService.guardarEvaluacion(codigo, {
        puntajes: criterios.map((c) => ({ criterioId: c.criterioId, puntaje: Number(puntajes[c.criterioId]) })),
        observaciones: observaciones.trim() || null,
        decision,
      });
      navigate(`/cie/expedientes/${codigo}/resolucion`);
    } catch (e) {
      setErrorGuardar(mensajeError(e, 'No se pudo guardar la rúbrica.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <VolverALaBandeja />
      <EncabezadoPagina titulo="Rúbrica VIE digital"
        subtitulo="Evalúa la propuesta con la rúbrica VIE y registra tus observaciones técnicas y estratégicas." />

      <CabeceraExpediente expediente={expediente} />

      <section className="gv-card gv-panel-revision">
        <Pasos actual={2} />

        <div className="cie-grid-2 cie-grid-eval">
          <div className="gv-subcard">
            <h3 className="gv-subcard-titulo">Criterios de evaluación</h3>
            <p className="cie-ayuda">Asigna un puntaje de {escala.minimo} a {escala.maximo} a cada criterio.</p>
            {criterios.length === 0 ? (
              <p className="gv-sin-resultados">La rúbrica del CIE no tiene criterios configurados.</p>
            ) : (
              <div className="cie-criterios">
                <div className="cie-criterios-head"><span>Criterio (peso)</span><span>Puntaje</span></div>
                {criterios.map((c, i) => (
                  <div key={c.criterioId} className="cie-criterio">
                    <span>{i + 1}. {c.nombre} <small className="cie-peso">({c.peso}%)</small></span>
                    <select value={puntajes[c.criterioId] ?? ''} aria-label={`Puntaje: ${c.nombre}`}
                      aria-invalid={intento && puntajes[c.criterioId] === undefined}
                      onChange={(ev) => setPuntajes({ ...puntajes, [c.criterioId]: ev.target.value === '' ? '' : Number(ev.target.value) })}>
                      <option value="">Seleccionar</option>
                      {opciones.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
                <div className="cie-promedio">
                  <strong>Promedio ponderado</strong>
                  <strong>{completos ? `${promedio.toFixed(1)} / ${escala.maximo}` : '—'}</strong>
                </div>
              </div>
            )}
            {intento && !completos && <p className="cie-error cie-pad" role="alert">Califica todos los criterios para continuar.</p>}
          </div>

          <div className="cie-columna">
            <div className="gv-subcard">
              <h3 className="gv-subcard-titulo">Observaciones técnicas y estratégicas</h3>
              <div className="cie-cuerpo">
                <AreaTexto value={observaciones} onChange={setObservaciones}
                  placeholder="Ingrese sus observaciones sobre la propuesta..." max={4000} />
              </div>
            </div>
            <div className="gv-subcard">
              <h3 className="gv-subcard-titulo">Recomendación final</h3>
              <div className="cie-cuerpo">
                <div className="cie-radios">
                  {DECISIONES.map((r) => (
                    <Radio key={r} name="recomendacion" value={r} checked={decision === r} onChange={setDecision}>{r}</Radio>
                  ))}
                </div>
                {intento && faltaDecision && <p className="cie-error" role="alert">Selecciona una recomendación.</p>}
                <div className="cie-nota">
                  <Icono nombre="info" size={18} />
                  <p>La recomendación será utilizada por la Dirección de Investigación para generar el documento oficial.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {errorGuardar && <p className="cie-error cie-error-pagina" role="alert">{errorGuardar}</p>}

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`/cie/expedientes/${codigo}`)}>
          <Icono nombre="arrowLeft" size={15} />Volver al expediente
        </button>
        <button type="button" className="gv-btn-primario" onClick={guardar} disabled={guardando || criterios.length === 0}>
          {guardando ? 'Guardando...' : 'Guardar rúbrica y continuar'} <Icono nombre="arrowRight" size={16} />
        </button>
      </div>
    </>
  );
};

export default RubricaVie;
