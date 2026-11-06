// Ventana 4: Notificación oficial (POST /direccion-investigacion/dictamenes/:codigo/notificacion)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { direccionService, construirNotificacion, mensajeErrorDireccion } from '../../services/direccionService';
import {
  TIPOS_NOTIFICACION, CANALES, RUTA_BASE, formatearFechaHora, tipoPorDecision,
} from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { useDictamenSeleccionado } from '../../components/direccion/useDictamenSeleccionado';
import {
  Icono, EncabezadoPagina, Cargando, ErrorCarga, Radio, AreaTexto, ResumenDictamen,
} from '../../components/direccion/DireccionUi';

const FormularioNotificacion = ({ dictamen, config, lista, cambiarDictamen }) => {
  const navigate = useNavigate();
  const docs = useCarga(() => direccionService.listarDocumentos(dictamen.codigo), [dictamen.codigo]);
  const tipoInicial = tipoPorDecision(TIPOS_NOTIFICACION, dictamen.decision);
  const [tipo, setTipo] = useState(tipoInicial);
  const [mensaje, setMensaje] = useState(construirNotificacion(dictamen, tipoInicial));
  const [seleccion, setSeleccion] = useState(null); // null = todos los adjuntos
  const [vista, setVista] = useState(false);
  const [intento, setIntento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [resultadoEnvio, setResultadoEnvio] = useState(null);
  const [reintentando, setReintentando] = useState(null);
  const [notificado, setNotificado] = useState(dictamen.estado === 'completado');

  const cambiarTipo = (t) => { setTipo(t); setMensaje(construirNotificacion(dictamen, t)); };

  const generados = docs.datos || [];
  const elegidos = seleccion ?? generados.map((g) => g.documentoId);
  const alternar = (id) => setSeleccion(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]);

  const yaNotificado = notificado;
  const sinAdjunto = generados.length === 0;
  const mensajeVacio = mensaje.trim() === '';
  const canales = CANALES.filter((c) => config.canales.includes(c.id));
  const asunto = `Resolución del CIE — ${dictamen.codigo}`;

  const reintentar = async (envioCorreoId) => {
    setReintentando(envioCorreoId); setErrorEnvio('');
    try {
      const r = await direccionService.reintentarEnvioCorreo(envioCorreoId);
      setResultadoEnvio((actual) => ({
        ...actual,
        canales: (actual?.canales || []).map((c) => c.envioCorreoId === envioCorreoId
          ? { ...c, estado: r.estado, mensaje: r.mensaje, intentos: r.intentos }
          : c),
      }));
     if (r.estado === 'FALLIDO') {
  setErrorEnvio(r.mensaje || 'El correo sigue sin poder enviarse.');
} else {
  setNotificado(true);
}
      setErrorEnvio(mensajeErrorDireccion(e, 'No se pudo reintentar el correo.'));
    } finally {
      setReintentando(null);
    }
  };

  const enviar = async () => {
    setIntento(true); setErrorEnvio('');
    if (mensajeVacio || sinAdjunto || canales.length === 0) return;
    setEnviando(true);
    try {
      const r = await direccionService.enviarNotificacion(dictamen.codigo, {
        tipo, asunto, codigo: dictamen.codigo, mensaje: mensaje.trim(), canales: canales.map((c) => c.id), documentoIds: elegidos,
        copiaGestora: config.copiaGestora,
      });
      setResultadoEnvio(r);
      setNotificado(true);
      const fallidos = (r.canales || []).filter((c) => c.estado === 'FALLIDO');
      if (fallidos.length) {
        setErrorEnvio(fallidos.map((c) => `${c.canal}: ${c.mensaje}`).join(' '));
      } else {
        setErrorEnvio('');
      }
    } catch (e) {
      setErrorEnvio(mensajeErrorDireccion(e, 'No se pudo enviar la notificación.'));
    } finally { setEnviando(false); }
  };

  return (
    <>
      <ResumenDictamen dictamen={dictamen} />
      <div className="dir-selector">
        <label htmlFor="dir-propuesta-n">Propuesta de trabajo</label>
        <select id="dir-propuesta-n" value={dictamen.codigo} onChange={(e) => cambiarDictamen(e.target.value)}>
          {lista.map((d) => <option key={d.codigo} value={d.codigo}>{d.codigo} — {d.titulo}</option>)}
        </select>
      </div>

      {yaNotificado && (
        <div className="cie-nota" role="status">
          <Icono nombre="info" size={16} />
          <div><strong>Este dictamen ya fue notificado</strong><p>Puedes consultar el contenido, pero no se enviará una nueva notificación.</p></div>
        </div>
      )}

      <div className="cie-grid-2">
        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Tipo de notificación</h3>
            <div className="cie-cuerpo">
              <div className="dir-opciones">
                {TIPOS_NOTIFICACION.map((t) => (
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

          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Adjuntos</h3>
            {docs.cargando ? <p className="cie-pad">Cargando...</p> : sinAdjunto ? (
              <div className="cie-nota">
                <Icono nombre="alertCircle" size={16} />
                <div>
                  <strong>No hay documentos generados</strong>
                  <p>Genera primero el oficio en <Link className="cie-enlace" to={`${RUTA_BASE}/documentos-oficiales/${dictamen.codigo}`}>Documentos oficiales</Link>.</p>
                </div>
              </div>
            ) : (
              <ul className="dir-docs">
                {generados.map((g) => (
                  <li key={g.documentoId}>
                    <input type="checkbox" checked={elegidos.includes(g.documentoId)} onChange={() => alternar(g.documentoId)}
                      aria-label={`Adjuntar ${g.nombre}`} />
                    <div><strong>{g.nombre}</strong><span>{g.numeroOficio} · {formatearFechaHora(g.fecha)}</span></div>
                  </li>
                ))}
              </ul>
            )}
            {intento && sinAdjunto && <p className="cie-error cie-pad" role="alert">Genera al menos un documento oficial antes de notificar.</p>}
          </div>
        </div>

        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Contenido de la notificación</h3>
            <div className="cie-cuerpo">
              <AreaTexto value={mensaje} onChange={setMensaje} invalido={intento && mensajeVacio} max={2000}
                placeholder="Redacta el mensaje para el investigador..." />
              {intento && mensajeVacio && <p className="cie-error" role="alert">El mensaje no puede estar vacío.</p>}
              <p className="dir-canales">
                <Icono nombre="mail" size={14} />
                Se enviará por: {canales.length ? canales.map((c) => c.etiqueta).join(' y ') : 'ningún canal (actívalos en Configuración)'}.
              </p>
            </div>
          </div>

          {vista && (
            <div className="dir-subcard">
              <h3 className="gv-subcard-titulo">Vista previa</h3>
              <div className="cie-cuerpo">
                <p className="dir-asunto"><strong>Asunto:</strong> {asunto}</p>
                <pre className="dir-vista-previa">{mensaje}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {errorEnvio && <p className="cie-error cie-error-pagina" role="alert">{errorEnvio}</p>}
      {resultadoEnvio && (
        <div className="cie-nota" role="status">
          <Icono nombre="info" size={16} />
          <div>
            <strong>Resultado de entrega</strong>
            <ul>
              {(resultadoEnvio.canales || []).map((canal, i) => (
                <li key={`${canal.canal}-${i}`}>
                  <strong>{canal.canal}:</strong> {canal.estado} — {canal.mensaje}
                  {canal.estado === 'FALLIDO' && canal.envioCorreoId && (
                    <button type="button" className="cie-btn-outline" onClick={() => reintentar(canal.envioCorreoId)}
                      disabled={reintentando !== null}>
                      {reintentando === canal.envioCorreoId ? 'Reintentando...' : 'Reintentar correo'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p>La aceptación SMTP confirma que el servidor recibió el mensaje, no que el destinatario lo haya leído.</p>
          </div>
        </div>
      )}

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`${RUTA_BASE}/documentos-oficiales/${dictamen.codigo}`)}>
          <Icono nombre="arrowLeft" size={15} />Volver a documentos
        </button>
        <div className="dir-acciones-der">
          <button type="button" className="cie-btn-outline" onClick={() => setVista((v) => !v)} aria-pressed={vista}>
            <Icono nombre="eye" size={15} />{vista ? 'Ocultar vista previa' : 'Vista previa'}
          </button>
          <button type="button" className="gv-btn-primario" onClick={enviar} disabled={enviando || yaNotificado}>
            <Icono nombre="send" size={15} />{enviando ? 'Enviando...' : 'Enviar notificación'}
          </button>
        </div>
      </div>
    </>
  );
};

const NotificacionOficial = () => {
  const { lista, detalle, elegido, cambiar } = useDictamenSeleccionado(`${RUTA_BASE}/notificacion`);
  const config = useCarga(() => direccionService.obtenerConfiguracion());

  useEffect(() => { document.title = 'Notificación oficial - Dirección de Investigación'; }, []);

  const cargando = lista.cargando || detalle.cargando || config.cargando;
  const error = lista.error || detalle.error || config.error;

  return (
    <>
      <EncabezadoPagina titulo="Notificación oficial" subtitulo="Envía la notificación formal a los responsables de la propuesta." />
      {error && <ErrorCarga error={error} alReintentar={() => { lista.recargar(); detalle.recargar(); config.recargar(); }} />}
      {cargando && <Cargando texto="Cargando información del dictamen..." />}
      {!cargando && !error && !elegido && <div className="gv-card cie-estado">No hay dictámenes recibidos para notificar.</div>}
      {!cargando && !error && detalle.datos && (
        <FormularioNotificacion key={detalle.datos.codigo} dictamen={detalle.datos} config={config.datos} lista={lista.datos} cambiarDictamen={cambiar} />
      )}
    </>
  );
};

export default NotificacionOficial;
