
import { NavLink } from 'react-router-dom';
import Header from './Header';
import Icono from './cie/IconoCie';
import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { preferenciasGestoraService } from '../services/preferenciasGestoraService';
import '../styles/dashboard.css';
import '../styles/gestora.css';
import '../styles/gestora-extra.css';
import '../styles/cie.css';
import '../styles/direccion.css';
import '../styles/role-layout.css';

const menus = {
  gestora: [
    { title: 'General', items: [{to:'/gestora', label:'Inicio', end:true}] },
    { title: 'Gestión de propuestas', items: [
      {to:'/gestora/expedientes', label:'Expedientes'},
      {to:'/gestora/revision-vie', label:'Revisión VIE'},
      {to:'/gestora/revision-documentos', label:'Revisión de documentos'},
      {to:'/gestora/validacion-normativa', label:'Validación normativa'},
      {to:'/gestora/subsanaciones', label:'Subsanaciones'}
    ]},
    { title: 'Cuenta', items: [
      {to:'/gestora/configuracion', label:'Configuración'},
      {to:'/gestora/ayuda', label:'Ayuda'}
    ]}
  ],
  cie: [
    { title: 'General', items: [{to:'/cie', label:'Inicio', end:true}] },
    { title: 'Evaluación interna', items: [
      {to:'/cie/bandeja', label:'Bandeja de propuestas'},
      {to:'/cie/resoluciones', label:'Resoluciones'}
    ]}
  ],
  direccion: [
    { title: 'General', items: [{to:'/direccion', label:'Inicio', end:true}] },
    { title: 'Gestión de dictámenes', items: [
      {to:'/direccion/dictamenes', label:'Dictámenes recibidos'},
      {to:'/direccion/documentos-oficiales', label:'Documentos oficiales'},
      {to:'/direccion/notificacion', label:'Notificación oficial'}
    ]},
    { title: 'Cuenta', items: [
      {to:'/direccion/configuracion', label:'Configuración'},
      {to:'/direccion/ayuda', label:'Ayuda'}
    ]}
  ]
};

const labels = { gestora: 'Gestora VIE', cie: 'Comité de Evaluación Interna', direccion: 'Dirección de Investigación' };

export default function RoleLayout({ role }) {
  const [densidad, setDensidad] = useState('normal');
  useEffect(() => {
    if (role !== 'gestora') return undefined;
    let vigente = true;
    preferenciasGestoraService.obtener()
      .then((datos) => {
        if (vigente) {
          setDensidad(datos.densidad || 'normal');
          document.documentElement.dataset.gestoraDensidad = datos.densidad || 'normal';
        }
      })
      .catch(() => { /* La interfaz conserva la densidad normal si el servicio no responde. */ });
    return () => {
      vigente = false;
      delete document.documentElement.dataset.gestoraDensidad;
    };
  }, [role]);

  return (
    <div className={`dashboard-layout role-layout role-layout-${role} ${role === 'gestora' ? `gestora-densidad-${densidad}` : ''}`}>
      <aside className="tec-sidebar">
        <div className="tec-sidebar-logo-container">
          <img src="/Logo-TEC-Blanco.png" alt="Tecnológico de Costa Rica" className="tec-sidebar-logo-img"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/Logo-TEC-Pagina-Interna.png'; }} />
        </div>
        <nav className="tec-sidebar-nav" aria-label={`Menú ${labels[role]}`}>
          {menus[role].map(section => (
            <div className="role-sidebar-section" key={section.title}>
              <div className="sidebar-group-title">{section.title}</div>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  className={({isActive}) => `sidebar-pill-btn ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-pill-icon" aria-hidden="true"><Icono nombre={item.label === 'Inicio' ? 'home' : 'fileText'} tamano={18} /></span>
                  <span className="sidebar-pill-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main-content">
        <Header />
        <main className="main-body role-content"><Outlet /></main>
      </div>
    </div>
  );
}
