import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icono from '../../components/cie/IconoCie';
import { EncabezadoPagina } from '../../components/cie/CieUi';

const accesos = [
  { titulo: 'Bandeja de expedientes', texto: 'Consultar las propuestas asignadas y su estado de revisión.', icono: 'clipboard', ruta: '/gestora/expedientes', numero: '01' },
  { titulo: 'Validación normativa', texto: 'Verificar requisitos institucionales y documentales.', icono: 'checkCircle', ruta: '/gestora/validacion-normativa', numero: '02' },
  { titulo: 'Gestión de subsanaciones', texto: 'Dar seguimiento a las correcciones solicitadas.', icono: 'fileText', ruta: '/gestora/subsanaciones', numero: '03' },
];
export default function InicioGestora() {
  const { usuario } = useAuth();
  const nombre = usuario?.nombre || 'Persona Gestora';
  return <div className="gestora-inicio">
    <EncabezadoPagina titulo="Inicio" subtitulo="Panel de trabajo de la Persona Gestora VIE. Accede a las tareas de validación y seguimiento de expedientes."/>
    <section className="gestora-bienvenida gv-card" aria-label="Bienvenida al panel de gestora">
      <div className="gestora-bienvenida-icono" aria-hidden="true"><Icono nombre="home" tamano={26}/></div>
      <div><span className="gestora-eyebrow">PANEL DE TRABAJO · FONDOS VIE 2027</span><h2>Bienvenida, {nombre}</h2><p>Desde aquí puedes acceder a la revisión normativa, consultar expedientes y dar seguimiento a las subsanaciones.</p></div>
    </section>
    <div className="gestora-seccion-cabecera"><div><h2>Accesos rápidos</h2><p>Selecciona el proceso que necesitas atender.</p></div></div>
    <section className="gestora-accesos" aria-label="Accesos rápidos a módulos">
      {accesos.map((a) => <Link key={a.ruta} to={a.ruta} className="gv-card gestora-acceso" aria-label={`Acceso rápido ${a.numero}: ${a.titulo}. ${a.texto}`}><div className="gestora-acceso-top"><span className="gestora-acceso-icono" aria-hidden="true"><Icono nombre={a.icono} tamano={22}/></span><span className="gestora-acceso-numero">{a.numero}</span></div><h3>{a.titulo}</h3><p>{a.texto}</p><span className="gestora-acceso-link">Abrir sección <Icono nombre="arrowRight" tamano={16} aria-hidden="true"/></span></Link>)}
    </section>
    <section className="gv-card gestora-nota-inicio" aria-label="Nota informativa sobre el flujo de revisión"><span className="gestora-nota-icono" aria-hidden="true"><Icono nombre="info" tamano={18}/></span><div><strong>Recuerda el flujo de revisión</strong><p>La validación normativa comprueba los requisitos y registra observaciones. Si se necesita una corrección, se solicita subsanación; cuando el expediente cumple, puede continuar hacia el CIE. La Gestora no emite la resolución definitiva.</p></div></section>
    <p className="gestora-pie-nota">Los indicadores de expedientes se mostrarán aquí cuando el panel esté conectado al servicio de datos de la Gestora VIE.</p>
  </div>;
}
