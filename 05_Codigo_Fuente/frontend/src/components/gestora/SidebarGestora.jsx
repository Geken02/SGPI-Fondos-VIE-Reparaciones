// src/components/gestora/SidebarGestora.jsx
import { NavLink } from 'react-router-dom';
import Icono from './Iconos';

// Para agregar, renombrar o quitar botones se edita solo este arreglo.
const SECCIONES = [
  {
    titulo: 'General',
    items: [
      { path: '/gestora', label: 'Inicio', icono: 'home', end: true },
    ],
  },
  {
    titulo: 'Gestión VIE',
    items: [
      { path: '/gestora/expedientes', label: 'Expedientes', icono: 'clipboard' },
      { path: '/gestora/validacion-normativa', label: 'Validación Normativa', icono: 'shield' },
      { path: '/gestora/subsanaciones', label: 'Subsanaciones', icono: 'alertTriangle' },
      { path: '/gestora/reportes', label: 'Reportes', icono: 'barChart' },
    ],
  },
];

const ITEMS_INFERIORES = [
  { path: '/gestora/configuracion', label: 'Configuración', icono: 'sliders' },
  { path: '/gestora/ayuda', label: 'Ayuda', icono: 'help' },
];

const claseItem = ({ isActive }) => `gv-menu-item ${isActive ? 'activo' : ''}`;

const ItemMenu = ({ item }) => (
  <NavLink to={item.path} end={item.end} className={claseItem}>
    <Icono nombre={item.icono} tamano={17} />
    <span>{item.label}</span>
  </NavLink>
);

const SidebarGestora = () => {
  return (
    <aside className="gv-sidebar">
      <nav className="gv-sidebar-nav">
        {SECCIONES.map((seccion) => (
          <div key={seccion.titulo} className="gv-seccion">
            <div className="gv-seccion-titulo">{seccion.titulo}</div>
            {seccion.items.map((item) => (
              <ItemMenu key={item.path} item={item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="gv-sidebar-inferior">
        {ITEMS_INFERIORES.map((item) => (
          <ItemMenu key={item.path} item={item} />
        ))}
      </div>
    </aside>
  );
};

export default SidebarGestora;
