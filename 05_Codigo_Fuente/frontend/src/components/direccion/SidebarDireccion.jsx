// src/components/direccion/SidebarDireccion.jsx
import { NavLink } from 'react-router-dom';
import { Icono } from './DireccionUi';
import { RUTA_BASE } from './direccionConstantes';

const SECCIONES = [
  { titulo: 'General', items: [
    { path: RUTA_BASE, label: 'Inicio', icono: 'home', end: true },
  ] },
  { titulo: 'Gestión Dirección', items: [
    { path: `${RUTA_BASE}/dictamenes`, label: 'Dictámenes recibidos', icono: 'clipboard' },
    { path: `${RUTA_BASE}/documentos`, label: 'Documentos oficiales', icono: 'fileText' },
    { path: `${RUTA_BASE}/notificaciones`, label: 'Notificaciones', icono: 'send' },
  ] },
];

// Botones al pie del menú (clase gv-sidebar-inferior, igual que el diseño base)
const ITEMS_INFERIORES = [
  { path: `${RUTA_BASE}/configuracion`, label: 'Configuración', icono: 'settings' },
  { path: `${RUTA_BASE}/ayuda`, label: 'Ayuda', icono: 'help' },
];

const claseItem = ({ isActive }) => `gv-menu-item ${isActive ? 'activo' : ''}`;

const ItemMenu = ({ item }) => (
  <NavLink to={item.path} end={item.end} className={claseItem}>
    <Icono nombre={item.icono} size={17} />
    <span>{item.label}</span>
  </NavLink>
);

const SidebarDireccion = () => (
  <aside className="gv-sidebar">
    <nav className="gv-sidebar-nav" aria-label="Navegación de la Dirección de Investigación">
      {SECCIONES.map((s) => (
        <div key={s.titulo} className="gv-seccion">
          <div className="gv-seccion-titulo">{s.titulo}</div>
          {s.items.map((item) => <ItemMenu key={item.path} item={item} />)}
        </div>
      ))}
    </nav>

    <div className="gv-sidebar-inferior">
      {ITEMS_INFERIORES.map((item) => <ItemMenu key={item.path} item={item} />)}
    </div>
  </aside>
);

export default SidebarDireccion;
