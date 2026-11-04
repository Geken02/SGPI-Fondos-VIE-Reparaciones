// src/components/cie/SidebarCie.jsx
import { NavLink } from 'react-router-dom';
import Icono from './IconoCie';

const SECCIONES = [
  {
    titulo: 'General',
    items: [
      { path: '/cie', label: 'Inicio', icono: 'home', end: true },
    ],
  },
  {
    titulo: 'Gestión CIE',
    items: [
      { path: '/cie/expedientes', label: 'Expedientes', icono: 'clipboard' },
      { path: '/cie/resoluciones', label: 'Resoluciones', icono: 'checkCircle' },
    ],
  },
];

const claseItem = ({ isActive }) => `gv-menu-item ${isActive ? 'activo' : ''}`;

const ItemMenu = ({ item }) => (
  <NavLink to={item.path} end={item.end} className={claseItem}>
    <Icono nombre={item.icono} tamano={17} />
    <span>{item.label}</span>
  </NavLink>
);

const SidebarCie = () => (
  <aside className="gv-sidebar">
    <nav className="gv-sidebar-nav" aria-label="Navegación del CIE">
      {SECCIONES.map((seccion) => (
        <div key={seccion.titulo} className="gv-seccion">
          <div className="gv-seccion-titulo">{seccion.titulo}</div>
          {seccion.items.map((item) => (
            <ItemMenu key={item.path} item={item} />
          ))}
        </div>
      ))}
    </nav>
  </aside>
);

export default SidebarCie;
