// src/components/ComiteTecnicoLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from './ImpersonationBanner';

const ComiteTecnicoLayout = () => {
  return (
    <div className="dashboard-layout">
      {/* Skip link para navegación por teclado: se oculta hasta que el usuario presiona Tab */}
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      <ImpersonationBanner />
      <Sidebar />
      
      <div className="main-content">
        <Header />
        
        <main className="main-body" id="contenido-principal" aria-label="Contenido principal de la página">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ComiteTecnicoLayout;