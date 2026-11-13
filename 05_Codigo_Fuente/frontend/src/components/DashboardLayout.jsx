import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CrearPropuestaModal from './CrearPropuestaModal';
import { useModal } from '../context/ModalContext';
import '../styles/dashboard.css';
import ImpersonationBanner from '../components/ImpersonationBanner';

const DashboardLayout = () => {
  const { modalCrearPropuestaAbierto, cerrarModalCrearPropuesta } = useModal();

  return (
    <div className="dashboard-layout">
      {/* ✅ CAMBIO: Skip link para navegación por teclado. 
          Se oculta hasta que el usuario presiona Tab. */}
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

      <CrearPropuestaModal 
        isOpen={modalCrearPropuestaAbierto} 
        onClose={cerrarModalCrearPropuesta} 
      />
    </div>
  );
};

export default DashboardLayout;