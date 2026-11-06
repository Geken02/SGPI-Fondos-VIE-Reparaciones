// src/pages/miembro_cie/RubricaVie.jsx
// Ventana 3: Rúbrica VIE digital
//   GET /miembro-cie/rubrica · GET/PUT /miembro-cie/expedientes/:codigo/evaluacion
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { cieService, mensajeError } from '../../services/cieService';
import { calcularPromedio, RECOMENDACIONES_CIE } from '../../components/cie/cieConstantes';
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
  const [requisitos, setRequisitos] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [recomendacion, setRecomendacion] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  useEffect(() => { document.title = 'Rúbrica VIE - Miembro del CIE'; }, []);

  // Precarga la evaluación previamente registrada (si existe)
  useEffect(() => {
    if (!datos) return;
    const previa = datos.evaluacion;
    setPuntajes(previa.existe ? Object.fromEntries(previa.puntajes.map((p) => [p.criterioId, p.puntaje])) : {});
    setRequisitos(previa.existe ? Object.fromEntries(previa.puntajes.map((p) => [p.criterioId, p.requisitoCumplido])) : {});
    setObservaciones(previa.observaciones || '');
    setRecomendacion(previa.recomendacion || '');
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
  const opciones = escala.opciones || [0, 6, 8, 10];
  const completos = criterios.every((c) => puntajes[c.criterioId] !== undefined && puntajes[c.criterioId] !== '') && criterios.filter((c) => c.esRequisitoObligatorio).every((c) => requisitos[c.criterioId] === true || requisitos[c.criterioId] === false);
  const promedio = calcularPromedio(criterios, puntajes);
  const faltaRecomendacion = recomendacion === '';

  const guardar = async () => {
    setIntento(true);
    setErrorGuardar('');
    if (!completos || faltaRecomendacion) return;
    setGuardando(true);
    try {
      await cieService.guardarEvaluacion(codigo, {
        puntajes: criterios.map((c) => ({ criterioId: c.criterioId, puntaje: Number(puntajes[c.criterioId]), requisitoCumplido: c.esRequisitoObligatorio ? requisitos[c.criterioId] : null })),
        observaciones: observaciones.trim() || null,
        recomendacion,
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
                    <span>{i + 1}. {c.nombre} <small className="cie-peso">({c.peso}%)</small>{c.esRequisitoObligatorio && <small className="cie-obligatorio"> · Requisito obligatorio</small>}</span>
                    <select value={puntajes[c.criterioId] ?? ''} aria-label={`Puntaje: ${c.nombre}`}
                      aria-invalid={intento && puntajes[c.criterioId] === undefined}
                      onChange={(ev) => setPuntajes({ ...puntajes, [c.criterioId]: ev.target.value === '' ? '' : Number(ev.target.value) })}>
                      <option value="">Seleccionar</option>
                      {opciones.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {c.esRequisitoObligatorio && (
                      <select
                        value={requisitos[c.criterioId] === true ? 'si' : requisitos[c.criterioId] === false ? 'no' : ''}
                        aria-label={`Cumplimiento del requisito: ${c.nombre}`}
                        onChange={(ev) => setRequisitos({ ...requisitos, [c.criterioId]: ev.target.value === '' ? undefined : ev.target.value === 'si' })}
                      >
                        <option value="">¿Cumple?</option>
                        <option value="si">Sí cumple</option>
                        <option value="no">No cumple</option>
                      </select>
                    )}
                  </div>
                ))}
                <div className="cie-promedio">
                  <strong>Promedio ponderado</strong>
                  <strong>{completos ? `${promedio.toFixed(1)} / ${escala.maximo}` : '—'}</strong>
                </div>
              </div>
            )}
            {intento && !completos && <p className="cie-error cie-pad" role="alert">Completa los puntajes y marca el cumplimiento de cada requisito obligatorio.</p>}
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
              <h3 className="gv-subcard-titulo">Recomendación de la evaluación</h3>
              <div className="cie-cuerpo">
                <div className="cie-radios">
                  {RECOMENDACIONES_CIE.map((opcion) => (
                    <Radio key={opcion} name="recomendacion-cie" value={opcion}
                      checked={recomendacion === opcion} onChange={setRecomendacion}>{opcion}</Radio>
                  ))}
                </div>
                {intento && faltaRecomendacion && <p className="cie-error" role="alert">Selecciona una recomendación.</p>}
                <p className="cie-ayuda">La recomendación queda registrada junto con el promedio ponderado. La decisión definitiva de aprobar o rechazar se toma en el siguiente paso.</p>
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
        <button type="button" className="gv-btn-primario" onClick={guardar} disabled={guardando || criterios.length === 0 || !completos || faltaRecomendacion}>
          {guardando ? 'Guardando...' : 'Guardar rúbrica y continuar'} <Icono nombre="arrowRight" size={16} />
        </button>
      </div>
    </>
  );
};

export default RubricaVie;
