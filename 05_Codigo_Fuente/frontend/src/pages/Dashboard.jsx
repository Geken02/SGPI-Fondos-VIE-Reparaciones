// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';
import InvestigadorDashboard from './InvestigadorDashboard';
import VinculacionDashboard from './VinculacionDashboard';

const Dashboard = () => {
  const { esVinculacion, esInvestigador, usuario } = useAuth();

  // Si el rol activo es Vinculación, renderiza el panel de Vinculación.
  if (esVinculacion) {
    return <VinculacionDashboard />;
  }

  // Si el rol activo es Investigador, renderiza la pantalla de inicio del Investigador.
  if (esInvestigador) {
    return <InvestigadorDashboard />;
  }

  // Fallback para usuarios sin un rol activo específico de estos dos
  return (
    <div className="dashboard-main-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '24px', color: '#002855', marginBottom: '12px' }}>
        Bienvenido al Sistema SGPI
      </h2>
      <p style={{ color: '#627d98', fontSize: '15px', marginBottom: '8px' }}>
        Hola, <strong>{usuario?.nombre || 'Usuario'}</strong>.
      </p>
      <p style={{ color: '#627d98', fontSize: '15px' }}>
        Su usuario no cuenta con un rol activo asignado de Investigador ni Evaluador de Vinculación.
        <br />
        Por favor, seleccione una opción del menú lateral o contacte al administrador del sistema.
      </p>
    </div>
  );
};

export default Dashboard;