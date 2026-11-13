// Ventana 4: Notificación oficial (POST /direccion-investigacion/dictamenes/:codigo/notificacion)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { direccionService, construirNotificacion, mensajeErrorDireccion } from '../../services/direccionService';
import {
  TIPOS_NOTIFICACION, RUTA_BASE, tipoPorDecision,
} from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { useDictamenSeleccionado } from '../../components/direccion/useDictamenSeleccionado';
import {
  Icono, EncabezadoPagina, Cargando, ErrorCarga, Radio, AreaTexto, ResumenDictamen,
} from '../../components/direccion/DireccionUi';

const FormularioNotificacion = ({ dictamen, lista, cambiarDictamen }) => {
  const navigate = useNavigate();
  const docs = useCarga(() => direccionService.listarDocumentos(dictamen.codigo), [dictamen.codigo]);
  const tipoInicial = tipoPorDecision(TIPOS_NOTIFICACION, dictamen.decision);
  const [tipo, setTipo] = useState(tipoInicial);
  const [mensaje, setMensaje] = useState(construirNotificacion(dictamen, tipoInicial));
  const [vista, setVista] = useState(false);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [exito, setExito] = useState('');
  const [notificado, setNotificado] = useState(dictamen.estado === 'completado');

  const cambiarTipo = (t) => { setTipo(t); setMensaje(construirNotificacion(dictamen, t)); };

  const sinOficio = !docs.cargando && (docs.datos || []).length === 0;
  const mensajeVacio = mensaje.trim() === '';
  const asunto = `Resolución del CIE — ${dictamen.codigo}`;

  const enviar = async () => {
    setIntento(true); setErrorEnvio(''); setExito('');
    if (mensajeVacio || sinOficio) return;
    setEnviando(true);
    try {
      await direccionService.enviarNotificacion(dictamen.codigo, {
        tipo, asunto, codigo: dictamen.codigo, mensaje: mensaje.trim(),
      });
      setNotificado(true);
      setExito('Notificación registrada. El investigador la verá dentro del sistema.');
    } catch (e) {
      setErrorEnvio(mensajeErrorDireccion(e, 'No se pudo enviar la notificación.'));
    } finally { setEnviando(false); }
  };

  return (
    <>
      <ResumenDictamen dictamen={dictamen} />
      <div className="dir-selector">
        <label htmlFor="dir-propuesta-n">Propuesta de trabajo</label>
        <select id="dir-propuesta-n" value={dictamen.codigo} onChange={(e) => cambiarDictamen(e.target.value)} aria-label="Seleccionar propuesta de trabajo">
          {lista.map((d) => <option key={d.codigo} value={d.codigo}>{d.codigo} — {d.titulo}</option>)}
        </select>
      </div>

      {notificado && !exito && (
        <div className="cie-nota" role="status">
          <Icono nombre="info" size={16} aria-hidden="true" />
          <div><strong>Este dictamen ya fue notificado</strong><p>Puedes consultar el contenido, pero no se enviará una nueva notificación.</p></div>
        </div>
      )}

      <div className="cie-grid-2">
        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Tipo de notificación</h3>
            <div className="cie-cuerpo">
              <div className="dir-opciones" role="radiogroup" aria-label="Tipo de notificación">
                {TIPOS_NOTIFICACION.filter((t) => t.decision === dictamen.decision).map((t) => (
                  <div key={t.id} className="dir-opcion">
                    <Radio name="tipoNotificacion" value={t.id} checked={tipo === t.id} onChange={cambiarTipo}>
                      <strong>{t.titulo}</strong>
                    </Radio>
                    <p>{t.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sinOficio && (
            <div className="cie-nota">
              <Icono nombre="alertCircle" size={16} aria-hidden="true" />
              <div>
                <strong>No hay documentos generados</strong>
                <p>Genera primero el oficio en <Link className="cie-enlace" to={`${RUTA_BASE}/documentos-oficiales/${dictamen.codigo}`}>Documentos oficiales</Link>.</p>
              </div>
            </div>
          )}
          {intento && sinOficio && <p className="cie-error cie-pad" role="alert">Genera al menos un documento oficial antes de notificar.</p>}
        </div>

        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Contenido de la notificación</h3>
            <div className="cie-cuerpo">
              <AreaTexto value={mensaje} onChange={setMensaje} invalido={intento && mensajeVacio} max={2000}
                placeholder="Redacta el mensaje para el investigador..." aria-label="Contenido del mensaje de notificación para el investigador" />
              {intento && mensajeVacio && <p className="cie-error" role="alert">El mensaje no puede estar vacío.</p>}
              <p className="dir-canales">
                <Icono nombre="info" size={14} aria-hidden="true" />
                Se registrará como notificación dentro del sistema para el investigador.
              </p>
            </div>
          </div>

          {vista && (
            <div className="dir-subcard">
              <h3 className="gv-subcard-titulo">Vista previa</h3>
              <div className="cie-cuerpo">
                <p className="dir-asunto"><strong>Asunto:</strong> {asunto}</p>
                <pre className="dir-vista-previa" tabIndex={0} aria-label="Vista previa del mensaje de notificación">{mensaje}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorEnvio && <p className="cie-error cie-error-pagina" role="alert">{errorEnvio}</p>}
      {exito && (
        <div className="cie-nota" role="status">
          <Icono nombre="info" size={16} />
          <div><strong>{exito}</strong></div>
        </div>
      )}

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`${RUTA_BASE}/documentos-oficiales/${dictamen.codigo}`)} aria-label="Volver a generación de documentos oficiales">
          <Icono nombre="arrowLeft" size={15} aria-hidden="true" />Volver a documentos
        </button>
        <div className="dir-acciones-der">
          <button type="button" className="cie-btn-outline" onClick={() => setVista((v) => !v)} aria-pressed={vista} aria-label={vista ? 'Ocultar vista previa del mensaje' : 'Mostrar vista previa del mensaje'}>
            <Icono nombre="eye" size={15} aria-hidden="true" />{vista ? 'Ocultar vista previa' : 'Vista previa'}
          </button>
          <button type="button" className="gv-btn-primario" onClick={enviar} disabled={enviando || notificado} aria-label="Enviar notificación oficial al investigador">
            <Icono nombre="send" size={15} aria-hidden="true" />{enviando ? 'Enviando...' : 'Enviar notificación'}
          </button>
        </div>
      </div>
    </>
  );
};

const NotificacionOficial = () => {
  const { lista, detalle, elegido, cambiar } = useDictamenSeleccionado(`${RUTA_BASE}/notificacion`);

  useEffect(() => { document.title = 'Notificación oficial - Dirección de Investigación'; }, []);

  const cargando = lista.cargando || detalle.cargando;
  const error = lista.error || detalle.error;

  return (
    <>
      <EncabezadoPagina titulo="Notificación oficial" subtitulo="Envía la notificación formal a los responsables de la propuesta." />
      {error && <ErrorCarga error={error} alReintentar={() => { lista.recargar(); detalle.recargar(); }} />}
      {cargando && <Cargando texto="Cargando información del dictamen..." />}
      {!cargando && !error && !elegido && <div className="gv-card cie-estado">No hay dictámenes recibidos para notificar.</div>}
      {!cargando && !error && detalle.datos && (
        <FormularioNotificacion key={detalle.datos.codigo} dictamen={detalle.datos} lista={lista.datos} cambiarDictamen={cambiar} />
      )}
    </>
  );
};

export default NotificacionOficial;
