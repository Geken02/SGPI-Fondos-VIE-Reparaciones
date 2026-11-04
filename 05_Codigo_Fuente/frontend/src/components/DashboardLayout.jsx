// src/components/DashboardLayout.jsx
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
      <ImpersonationBanner />
      <Sidebar />

      <div className="main-content">
        <Header />

        <main className="main-body">
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