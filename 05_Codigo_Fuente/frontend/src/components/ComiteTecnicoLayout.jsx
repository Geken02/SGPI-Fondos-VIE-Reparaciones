// src/components/ComiteTecnicoLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from './ImpersonationBanner';

const ComiteTecnicoLayout = () => {
  return (
    <div className="dashboard-layout">
      <ImpersonationBanner />
      <Sidebar />
      
      <div className="main-content">
        <Header />  {/* ← ESTO ES LO QUE PROBABLEMENTE FALTA */}
        
        <main className="main-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ComiteTecnicoLayout;