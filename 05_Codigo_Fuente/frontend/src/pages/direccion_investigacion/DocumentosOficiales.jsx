// Ventana 3: Generación de documentos oficiales (POST /direccion-investigacion/dictamenes/:codigo/documentos)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { direccionService, construirOficio, mensajeErrorDireccion } from '../../services/direccionService';
import {
  TIPOS_DOCUMENTO, PLANTILLAS, FIRMANTES, RUTA_BASE, formatearFecha, formatearFechaHora, tipoPorDecision,
} from '../../components/direccion/direccionConstantes';
import { useCarga } from '../../components/cie/useCarga';
import { useDictamenSeleccionado } from '../../components/direccion/useDictamenSeleccionado';
import {
  Icono, EncabezadoPagina, Cargando, ErrorCarga, Radio, ResumenDictamen, AvisoExito,
} from '../../components/direccion/DireccionUi';

const hoy = () => new Date().toISOString().slice(0, 10);

const descargar = async (doc) => {
  try {
    const archivo = await direccionService.descargarDocumento(
      doc.documentoId,
    );

    const url = URL.createObjectURL(archivo);

    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nombre || `documento-${doc.documentoId}.txt`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } catch (error) {
    window.alert(
      mensajeErrorDireccion(error, 'No se pudo descargar el documento.'),
    );
  }
};

const FormularioDocumento = ({ dictamen, config, cambiarDictamen, lista }) => {
  const navigate = useNavigate();
  const docs = useCarga(() => direccionService.listarDocumentos(dictamen.codigo), [dictamen.codigo]);
  const [tipo, setTipo] = useState(tipoPorDecision(TIPOS_DOCUMENTO, dictamen.decision));
  const [plantilla, setPlantilla] = useState(tipoPorDecision(TIPOS_DOCUMENTO, dictamen.decision));
  const [fecha, setFecha] = useState(hoy());
  const [firmante, setFirmante] = useState(config.firmante);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [errorGenerar, setErrorGenerar] = useState('');

  useEffect(() => {
    const t = tipoPorDecision(TIPOS_DOCUMENTO, dictamen.decision);
    setTipo(t); setPlantilla(t); setMensaje(''); setErrorGenerar('');
  }, [dictamen.codigo, dictamen.decision]);

  const def = TIPOS_DOCUMENTO.find((t) => t.id === tipo);
  const incoherente = def.decision && def.decision !== dictamen.decision;
  const vista = construirOficio(dictamen, {
    tipo, numeroOficio: `${config.prefijoOficio}-2026-###`, fechaEmision: fecha, firmante,
  });

  const cambiarTipo = (t) => { setTipo(t); setPlantilla(t); };

  const generar = async () => {
    setErrorGenerar(''); setMensaje('');
    if (incoherente) return;
    setGenerando(true);
    try {
      const doc = await direccionService.generarDocumento(dictamen.codigo, {
        tipo, plantilla, firmante, prefijoOficio: config.prefijoOficio, fechaEmision: fecha,
      });
      setMensaje(`Documento ${doc.numeroOficio} generado correctamente.`);
      docs.recargar();
    } catch (e) {
      setErrorGenerar(mensajeErrorDireccion(e, 'No se pudo generar el documento.'));
    } finally { setGenerando(false); }
  };

  const generados = docs.datos || [];

  return (
    <>
      <ResumenDictamen dictamen={dictamen} />
      <div className="dir-selector">
        <label htmlFor="dir-propuesta">Propuesta de trabajo</label>
        <select id="dir-propuesta" value={dictamen.codigo} onChange={(e) => cambiarDictamen(e.target.value)} aria-label="Seleccionar propuesta de trabajo">
          {lista.map((d) => <option key={d.codigo} value={d.codigo}>{d.codigo} — {d.titulo}</option>)}
        </select>
      </div>

      <AvisoExito texto={mensaje} />

      <div className="cie-grid-2">
        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Tipo de documento</h3>
            <div className="cie-cuerpo">
              <div className="dir-opciones" role="radiogroup" aria-label="Tipo de documento oficial">
                {TIPOS_DOCUMENTO.map((t) => (
                  <div key={t.id} className="dir-opcion">
                    <Radio name="tipoDocumento" value={t.id} checked={tipo === t.id} onChange={cambiarTipo}>
                      <strong>{t.titulo}</strong>
                    </Radio>
                    <p>{t.descripcion}</p>
                  </div>
                ))}
              </div>
              {incoherente && (
                <p className="cie-error" role="alert">
                  El CIE {dictamen.decision === 'Aprobar' ? 'aprobó' : 'rechazó'} esta propuesta: este tipo de oficio no corresponde a la decisión.
                </p>
              )}
            </div>
          </div>

          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Vista previa del documento</h3>
            <div className="cie-cuerpo">
              <pre className="dir-vista-previa" tabIndex={0} aria-label="Vista previa del oficio">{vista}</pre>
              {errorGenerar && <p className="cie-error" role="alert">{errorGenerar}</p>}
              <button type="button" className="gv-btn-primario dir-btn-completo" onClick={generar} disabled={generando || incoherente} aria-label="Generar documento oficial">
                <Icono nombre="fileText" size={16} aria-hidden="true" />{generando ? 'Generando...' : 'Generar documento'}
              </button>
            </div>
          </div>
        </div>

        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Datos del documento</h3>
            <div className="cie-cuerpo dir-formulario">
              <div className="dir-fila-2">
                <label className="dir-campo">Fecha de emisión
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de emisión del documento" />
                </label>
                <label className="dir-campo">Número de oficio
                  <input type="text" value="Se asigna al generar" readOnly aria-label="Número de oficio asignado" />
                </label>
              </div>
              <label className="dir-campo">Firmante
                <select value={firmante} onChange={(e) => setFirmante(e.target.value)} aria-label="Seleccionar firmante institucional">
                  {[...new Set([config.firmante, ...FIRMANTES])].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="dir-campo">Plantilla
                <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} aria-label="Seleccionar plantilla de documento">
                  {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Documentos generados</h3>
            {docs.cargando ? <p className="cie-pad">Cargando...</p> : generados.length === 0 ? (
              <p className="gv-sin-resultados">Aún no se han generado documentos para esta propuesta.</p>
            ) : (
              <ul className="dir-docs">
                {generados.map((g) => (
                  <li key={g.documentoId}>
                    <Icono nombre="fileText" size={20} aria-hidden="true" />
                    <div><strong>{g.nombre}</strong><span>{g.numeroOficio} · {formatearFechaHora(g.fecha)}</span></div>
                    <button type="button" className="gv-btn-ver" onClick={() => descargar(g)} aria-label={`Descargar ${g.nombre}`}>
                      <Icono nombre="download" size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="cie-acciones">
        <button type="button" className="cie-btn-outline" onClick={() => navigate(`${RUTA_BASE}/dictamenes/${dictamen.codigo}`)} aria-label="Volver a la revisión del dictamen">
          <Icono nombre="arrowLeft" size={15} aria-hidden="true" />Volver al dictamen
        </button>
        <button type="button" className="gv-btn-primario" disabled={generados.length === 0}
          onClick={() => navigate(`${RUTA_BASE}/notificacion/${dictamen.codigo}`)} aria-label="Continuar a notificación oficial">
          Continuar a notificación <Icono nombre="arrowRight" size={16} aria-hidden="true" />
        </button>
      </div>
    </>
  );
};

const DocumentosOficiales = () => {
  const { lista, detalle, elegido, cambiar } = useDictamenSeleccionado(`${RUTA_BASE}/documentos-oficiales`);
  const config = useCarga(() => direccionService.obtenerConfiguracion());

  useEffect(() => { document.title = 'Documentos oficiales - Dirección de Investigación'; }, []);

  const cargando = lista.cargando || detalle.cargando || config.cargando;
  const error = lista.error || detalle.error || config.error;

  return (
    <>
      <EncabezadoPagina titulo="Generación de documentos oficiales"
        subtitulo="Prepara y genera los documentos oficiales según la resolución del CIE." />
      {error && <ErrorCarga error={error} alReintentar={() => { lista.recargar(); detalle.recargar(); config.recargar(); }} />}
      {cargando && <Cargando texto="Cargando información del dictamen..." />}
      {!cargando && !error && !elegido && <div className="gv-card cie-estado">No hay dictámenes recibidos para generar documentos.</div>}
      {!cargando && !error && detalle.datos && (
        <FormularioDocumento dictamen={detalle.datos} config={config.datos} lista={lista.datos} cambiarDictamen={cambiar} />
      )}
    </>
  );
};

export default DocumentosOficiales;
