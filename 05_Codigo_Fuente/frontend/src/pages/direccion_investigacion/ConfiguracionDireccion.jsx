// Configuración — preferencias de la Dirección de Investigación (GET/PUT /direccion-investigacion/configuracion)
import { useEffect, useState } from 'react';
import { direccionService, mensajeErrorDireccion, MODO_DEMO } from '../../services/direccionService';
import { CANALES, FIRMANTES } from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { Icono, EncabezadoPagina, Cargando, ErrorCarga, AvisoExito } from '../../components/direccion/DireccionUi';

const PREFIJO_VALIDO = /^[A-Za-z0-9-]{2,12}$/;

const Formulario = ({ inicial }) => {
  const [config, setConfig] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState('');
  const [errorGuardar, setErrorGuardar] = useState('');
  const [intento, setIntento] = useState(false);

  const cambiar = (campo, valor) => { setConfig((c) => ({ ...c, [campo]: valor })); setExito(''); };
  const alternarCanal = (id) => cambiar('canales',
    config.canales.includes(id) ? config.canales.filter((c) => c !== id) : [...config.canales, id]);

  const prefijoInvalido = !PREFIJO_VALIDO.test(config.prefijoOficio);
  const sinCanales = config.canales.length === 0;

  const guardar = async () => {
    setIntento(true); setErrorGuardar(''); setExito('');
    if (prefijoInvalido || sinCanales) return;
    setGuardando(true);
    try {
      await direccionService.guardarConfiguracion(config);
      setExito('Configuración guardada correctamente.');
    } catch (e) {
      setErrorGuardar(mensajeErrorDireccion(e, 'No se pudo guardar la configuración.'));
    } finally { setGuardando(false); }
  };

  return (
    <>
      <AvisoExito texto={exito} />
      <div className="cie-grid-2">
        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Firma y numeración de oficios</h3>
            <div className="cie-cuerpo dir-formulario">
              <label className="dir-campo">Firmante por defecto
                <select value={config.firmante} onChange={(e) => cambiar('firmante', e.target.value)}>
                  {FIRMANTES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="dir-campo">Prefijo del número de oficio
                <input type="text" value={config.prefijoOficio} maxLength={12} aria-invalid={intento && prefijoInvalido}
                  onChange={(e) => cambiar('prefijoOficio', e.target.value.toUpperCase())} />
              </label>
              {intento && prefijoInvalido && <p className="cie-error" role="alert">Usa entre 2 y 12 letras, números o guiones.</p>}
              <p className="dir-ayuda-campo">Ejemplo de número generado: <strong>{config.prefijoOficio || '—'}-2026-046</strong></p>
            </div>
          </div>
        </div>

        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Canales de notificación</h3>
            <div className="cie-cuerpo">
              <div className="dir-opciones">
                {CANALES.map((c) => (
                  <label key={c.id} className="dir-opcion dir-check">
                    <input type="checkbox" checked={config.canales.includes(c.id)} onChange={() => alternarCanal(c.id)} />
                    <span><strong>{c.etiqueta}</strong><small>{c.detalle}</small></span>
                  </label>
                ))}
                <label className="dir-opcion dir-check">
                  <input type="checkbox" checked={config.copiaGestora} onChange={(e) => cambiar('copiaGestora', e.target.checked)} />
                  <span><strong>Enviar copia a la Persona Gestora de la VIE</strong><small>La Gestora recibe una copia de cada notificación oficial.</small></span>
                </label>
              </div>
              {intento && sinCanales && <p className="cie-error" role="alert">Activa al menos un canal de notificación.</p>}
            </div>
          </div>
        </div>
      </div>

      {MODO_DEMO && (
        <div className="cie-nota">
          <Icono nombre="info" size={16} />
          <div><strong>Modo de demostración</strong><p>Estas preferencias se guardan solo en este navegador hasta que el backend de la Dirección esté disponible.</p></div>
        </div>
      )}
      {errorGuardar && <p className="cie-error cie-error-pagina" role="alert">{errorGuardar}</p>}

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => { setConfig(inicial); setExito(''); setIntento(false); }}>
          Restablecer cambios
        </button>
        <button type="button" className="gv-btn-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar configuración'} <Icono nombre="check" size={16} />
        </button>
      </div>
    </>
  );
};

const ConfiguracionDireccion = () => {
  const { datos, cargando, error, recargar } = useCarga(() => direccionService.obtenerConfiguracion());
  useEffect(() => { document.title = 'Configuración - Dirección de Investigación'; }, []);

  return (
    <>
      <EncabezadoPagina titulo="Configuración"
        subtitulo="Define el firmante, la numeración de oficios y los canales de notificación de la Dirección de Investigación." />
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {cargando && <Cargando texto="Cargando configuración..." />}
      {!cargando && !error && datos && <Formulario inicial={datos} />}
    </>
  );
};

export default ConfiguracionDireccion;
