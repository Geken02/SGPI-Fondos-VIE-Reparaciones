// src/components/cie/HeaderCie.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Icono from './IconoCie';

const obtenerIniciales = (nombre) =>
  nombre
    .replace(/^(Lic\.|Dr\.|Dra\.|Ing\.|M\.Sc\.)\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const HeaderCie = () => {
  const { usuario, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const nombre = usuario ? `${usuario.nombre} ${usuario.apellido1}` : '';

  return (
    <header className="gv-header">
      <div className="gv-header-marca">
        <img src="/Logo-TEC-Pagina-Interna.png" alt="Tecnológico de Costa Rica" />
      </div>

      <div className="gv-header-bienvenida">
        <span className="gv-bienvenida-nombre">Bienvenido, {nombre}</span>
        <span className="gv-bienvenida-rol">Miembro del CIE</span>
      </div>

      <div className="gv-header-acciones">
        <label className="gv-buscador">
          <Icono nombre="search" tamano={15} />
          <input type="text" placeholder="Buscar expedientes, propuestas..." />
        </label>

        <button type="button" className="gv-btn-icono" aria-label="Notificaciones">
          <Icono nombre="bell" tamano={18} />
          <span className="gv-punto-notificacion" />
        </button>

        <div className="gv-avatar-contenedor">
          <button
            type="button"
            className="gv-avatar"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label="Menú de usuario"
          >
            {obtenerIniciales(nombre)}
          </button>
          {menuAbierto && (
            <div className="gv-menu-usuario">
              <button type="button" onClick={logout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderCie;
