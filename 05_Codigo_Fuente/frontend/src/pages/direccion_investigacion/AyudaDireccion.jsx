// Ayuda — guía de uso para la Dirección de Investigación
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RUTA_BASE } from '../../components/direccion/direccionConstantes';
import { Icono, EncabezadoPagina } from '../../components/direccion/DireccionUi';

const PASOS = [
  { icono: 'clipboard', titulo: '1. Revisar el dictamen', texto: 'Abre un dictamen de la bandeja y verifica la decisión del CIE, la justificación y la rúbrica VIE.', ruta: 'dictamenes' },
  { icono: 'fileText', titulo: '2. Generar el documento', texto: 'Elige el tipo de oficio según la decisión, revisa la vista previa y genera el documento.', ruta: 'documentos-oficiales' },
  { icono: 'send', titulo: '3. Notificar', texto: 'Revisa el mensaje y envía la notificación formal al investigador.', ruta: 'notificacion' },
];

const PREGUNTAS = [
  ['¿Qué significan los estados de un dictamen?', 'Por revisar: el CIE emitió la resolución y aún no se trabaja. En proceso: ya se generó al menos un documento oficial. Completado: el investigador ya fue notificado.'],
  ['¿Puedo generar un oficio distinto a la decisión del CIE?', 'No. El oficio de aprobación solo está disponible para resoluciones aprobadas y el de rechazo para las rechazadas. El oficio con observaciones puede usarse en ambos casos.'],
  ['¿Por qué no puedo enviar la notificación?', 'Se requiere al menos un documento oficial generado y un mensaje no vacío. Además, un dictamen ya notificado no puede notificarse de nuevo.'],
  ['¿Cómo cambio el firmante o el prefijo del número de oficio?', 'En Configuración. Los cambios se aplican a los documentos que generes a partir de ese momento.'],
  ['¿Dónde veo las resoluciones anteriores?', 'En la bandeja de dictámenes recibidos puedes filtrar por escuela y estado, y buscar por código, título o investigador.'],
];

const GLOSARIO = [
  ['CIE', 'Consejo de Investigación y Extensión: órgano que emite la resolución final.'],
  ['VIE', 'Vicerrectoría de Investigación y Extensión.'],
  ['Dictamen', 'Resolución del CIE sobre una propuesta (aprobada o rechazada).'],
  ['Oficio', 'Documento oficial con número consecutivo que comunica la resolución.'],
  ['Rúbrica VIE', 'Criterios ponderados con los que el CIE evalúa cada propuesta.'],
];

const AyudaDireccion = () => {
  useEffect(() => { document.title = 'Ayuda - Dirección de Investigación'; }, []);

  return (
    <>
      <EncabezadoPagina titulo="Ayuda"
        subtitulo="Guía rápida para recibir dictámenes del CIE, generar documentos oficiales y notificar a los investigadores." />

      <section className="dir-accesos" aria-label="Flujo de trabajo">
        {PASOS.map((p) => (
          <Link key={p.ruta} className="gv-card cie-inicio-acceso" to={`${RUTA_BASE}/${p.ruta}`} aria-label={`${p.titulo}: ${p.texto}`}>
            <span className="cie-inicio-acceso-icono" aria-hidden="true"><Icono nombre={p.icono} size={24} /></span>
            <span className="cie-inicio-acceso-texto"><strong>{p.titulo}</strong><span>{p.texto}</span></span>
            <Icono nombre="arrowRight" size={19} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <div className="cie-grid-2">
        <div className="dir-subcard">
          <h3 className="gv-subcard-titulo">Preguntas frecuentes</h3>
          <div className="dir-faq">
            {PREGUNTAS.map(([q, r]) => (
              <details key={q}><summary>{q}</summary><p>{r}</p></details>
            ))}
          </div>
        </div>

        <div className="cie-columna">
          <div className="dir-subcard">
            <h3 className="gv-subcard-titulo">Glosario</h3>
            <dl className="cie-dl">
              {GLOSARIO.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
            </dl>
          </div>
          <div className="cie-nota">
            <Icono nombre="help" size={16} aria-hidden="true" />
            <div><strong>¿Necesitas más ayuda?</strong><p>Si el problema persiste, comunícate con la persona administradora del sistema indicando el código de la propuesta.</p></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AyudaDireccion;
