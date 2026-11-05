// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalProvider } from './context/ModalContext';

// 1. AUTENTICACIÓN
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// 2. DASHBOARD GENERAL Y LAYOUTS
import DashboardLayout from './components/DashboardLayout';

// 2.1 CONSEJO DE ESCUELA (Deryan)
import PropuestasConsejo from './pages/consejoEscuela/PropuestasConsejo';
import VotacionesConsejo from './pages/consejoEscuela/VotacionesConsejo';
import AcuerdosConsejo from './pages/consejoEscuela/AcuerdosConsejo';

// 3. ADMINISTRACIÓN
import AdminPanel from './pages/admin/AdminPanel';
import Catalogos from './pages/admin/Catalogos';
import Usuarios from './pages/admin/Usuarios';
import Convocatoria from './pages/admin/Convocatoria';
import AsignacionGestoras from './pages/admin/AsignacionGestoras';

// 4. COMITÉ TÉCNICO
import ComiteTecnicoLayout from './components/ComiteTecnicoLayout';
import BandejaCompletitud from './pages/comiteTecnico/BandejaCompletitud';
import PropuestasAsignadas from './pages/comiteTecnico/PropuestasAsignadas';
import BandejaEvaluacion from './pages/comiteTecnico/BandejaEvaluacion';
import RubricaDigital from './pages/comiteTecnico/RubricaDigital';
import ExpedientePropuesta from './pages/comiteTecnico/ExpedientePropuesta';
import DictamenFinal from './pages/comiteTecnico/DictamenFinal';

// 5. INVESTIGADOR Y FORMULARIOS
import InvestigadorDashboard from './pages/InvestigadorDashboard';
import InvestigadorPropuestas from './pages/InvestigadorPropuestas';
import InvestigadorConvocatorias from './pages/InvestigadorConvocatorias';
import InvestigadorEquipos from './pages/InvestigadorEquipos';
import InvestigadorFormularios from './pages/InvestigadorFormularios';
import InvestigadorHistorial from './pages/InvestigadorHistorial';
import InvestigadorBuscar from './pages/InvestigadorBuscar';
import FormularioProyecto from './pages/FormularioProyecto';
import FormularioPlanRiesgos from './pages/FormularioPlanRiesgos';
import FormularioPresupuesto from './pages/FormularioPresupuesto';

// 6. VINCULACIÓN
import VinculacionDashboard from './pages/VinculacionDashboard';
import VinculacionDictamenes from './pages/VinculacionDictamenes';
import VinculacionDetalleDictamen from './pages/VinculacionDetalleDictamen';
import VinculacionEvaluar from './pages/VinculacionEvaluar';

// 7. PERFIL, CONFIGURACIÓN Y AYUDA
import Perfil from './pages/Perfil';
import Configuracion from './pages/Configuracion';
import Ayuda from './pages/Ayuda';

// 8. COMITÉ DE EVALUACIÓN INTERNA (CIE)
import LayoutCie from './components/cie/LayoutCie';
import InicioCie from './pages/miembro_cie/InicioCie';
import BandejaCie from './pages/miembro_cie/BandejaCie';
import ExpedienteConsolidado from './pages/miembro_cie/ExpedienteConsolidado';
import RubricaVie from './pages/miembro_cie/RubricaVie';
import ResolucionCie from './pages/miembro_cie/ResolucionCie';
import ResolucionesCie from './pages/miembro_cie/ResolucionesCie';

// 9. GESTORA VIE
import LayoutGestora from './components/gestora/LayoutGestora';
import InicioGestora from './pages/gestora_vie/InicioGestora';
import Expedientes from './pages/gestora_vie/Expedientes';
import RevisionVIE from './pages/gestora_vie/RevisionVIE';
import RevisionDocumentos from './pages/gestora_vie/RevisionDocumentos';
import ValidacionNormativa from './pages/gestora_vie/ValidacionNormativa';
import Subsanaciones from './pages/gestora_vie/Subsanaciones';
import ConfiguracionGestora from './pages/gestora_vie/ConfiguracionGestora';
import AyudaGestora from './pages/gestora_vie/AyudaGestora';

// 10. DIRECCIÓN DE INVESTIGACIÓN
import LayoutDireccion from './components/direccion/LayoutDireccion';
import InicioDireccion from './pages/direccion_investigacion/InicioDireccion';
import DictamenesRecibidos from './pages/direccion_investigacion/DictamenesRecibidos';
import RevisionDictamen from './pages/direccion_investigacion/RevisionDictamen';
import DocumentosOficiales from './pages/direccion_investigacion/DocumentosOficiales';
import NotificacionOficial from './pages/direccion_investigacion/NotificacionOficial';
import ConfiguracionDireccion from './pages/direccion_investigacion/ConfiguracionDireccion';
import AyudaDireccion from './pages/direccion_investigacion/AyudaDireccion';

// 11. OTROS
import PreviewCie from './pages/PreviewCie';

// ESTILOS
import './styles/global.css';
import './styles/comite-tecnico.css';

// ============================================================================
// COMPONENTE: RUTA PROTEGIDA
// ============================================================================
const RutaProtegida = ({ children, rolesPermitidos = [] }) => {
  const { estaAutenticado, cargando, rolActivo } = useAuth();

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#002855', color: '#ffffff', fontFamily: 'Roboto, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/Logo-TEC-Blanco.png" alt="TEC" style={{ height: '48px', marginBottom: '16px' }} />
          <div>Cargando sistema SGPI...</div>
        </div>
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos.length > 0 && rolActivo) {
    const tienePermiso = rolesPermitidos.includes(rolActivo);
    if (!tienePermiso) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// ============================================================================
// COMPONENTE: REDIRECCIÓN INTELIGENTE DE DASHBOARD
// ============================================================================
const DashboardRedirect = () => {
  const { rolActivo } = useAuth();

  if (rolActivo === 'SuperAdministrador' || rolActivo === 'Administrador') {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (rolActivo === 'DirectorInvestigacion' || rolActivo === 'SubdirectorInvestigacion') {
    return <Navigate to="/direccion/dictamenes" replace />;
  }
  if (rolActivo === 'GestoraVIE' || rolActivo === 'CoordinadoraGestora') {
    return <Navigate to="/gestora/expedientes" replace />;
  }
  if (rolActivo === 'MiembroCIE' || rolActivo === 'CoordinadorCIE' || rolActivo === 'PresidenteCIE') {
    return <Navigate to="/cie/bandeja" replace />;
  }
  if (
    rolActivo === 'MiembroComiteTecnico' ||
    rolActivo === 'CoordinadorComiteTecnico'
  ) {
    return <Navigate to="/comite-tecnico/propuestas-asignadas" replace />;
  }
  if (rolActivo === 'AsistenteComiteTecnico') {
    return <Navigate to="/comite-tecnico/bandeja-completitud" replace />;
  }
  if (rolActivo === 'EvaluadorVinculacion' || rolActivo === 'Vinculacion' || rolActivo === 'CoordinadorVinculacion' || (typeof rolActivo === 'string' && rolActivo.toLowerCase().includes('vinculacion'))) {
    return <Navigate to="/dashboard/bandeja-evaluacion" replace />;
  }
  // Redirección para roles del Consejo de Escuela
  if (
    rolActivo === 'AsistenteConsejoEscuela' ||
    rolActivo === 'MiembroConsejoEscuela' ||
    rolActivo === 'ConsejoProfesores' ||
    rolActivo === 'DirectorEscuela'
  ) {
    return <Navigate to="/dashboard/propuestas-consejo" replace />;
  }
  if (rolActivo === 'InvestigadorCoordinador' || rolActivo === 'Investigador' || rolActivo === 'InvestigadorColaborador' || (typeof rolActivo === 'string' && rolActivo.includes('Investigador'))) {
    return <InvestigadorDashboard />;
  }
  
  return <InvestigadorDashboard />;
};

// ============================================================================
// COMPONENTE: REDIRECCIÓN INTELIGENTE DEL COMITÉ TÉCNICO
// ============================================================================
const ComiteTecnicoRedirect = () => {
  const { rolActivo } = useAuth();

  if (rolActivo === 'AsistenteComiteTecnico') {
    return <Navigate to="bandeja-completitud" replace />;
  }
  if (rolActivo === 'MiembroComiteTecnico' || rolActivo === 'CoordinadorComiteTecnico' || rolActivo === 'DirectorEscuela') {
    return <Navigate to="propuestas-asignadas" replace />;
  }

  return <Navigate to="propuestas-asignadas" replace />;
};

// ============================================================================
// COMPONENTE DE REDIRECCIÓN DE RUTAS ANTIGUAS
// ============================================================================
const RedireccionRutaAnterior = ({ origen, destino }) => {
  const { pathname, search, hash } = useLocation();
  let sufijo = pathname.slice(origen.length);
  if (destino === '/direccion') {
    sufijo = sufijo.replace(/^\/documentos(?=\/|$)/, '/documentos-oficiales')
      .replace(/^\/notificaciones(?=\/|$)/, '/notificacion');
  }
  return <Navigate to={`${destino}${sufijo}${search}${hash}`} replace />;
};

// ============================================================================
// COMPONENTE PRINCIPAL: APP
// ============================================================================
const App = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/olvide-mi-contrasena" element={<ForgotPassword />} />
          <Route path="/recuperar-contrasena" element={<ResetPassword />} />
          <Route path="/preview-cie" element={<PreviewCie />} />

          {/* LAYOUT PRINCIPAL DEL DASHBOARD */}
          <Route path="/dashboard" element={
            <RutaProtegida>
              <DashboardLayout />
            </RutaProtegida>
          }>
            <Route index element={<DashboardRedirect />} />
            
            <Route path="perfil" element={<Perfil />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="ayuda" element={<Ayuda />} />

            {/* Rutas Módulo Consejo de Escuela (Deryan) */}
            <Route path="propuestas-consejo" element={<PropuestasConsejo />} />
            <Route path="votaciones-consejo" element={<VotacionesConsejo />} />
            <Route path="acuerdos-consejo" element={<AcuerdosConsejo />} />

            {/* Rutas Módulo Investigador */}
            <Route path="inicio" element={<InvestigadorDashboard />} />
            <Route path="investigador" element={<InvestigadorDashboard />} />
            <Route path="InvestigadorDashboard" element={<InvestigadorDashboard />} />
            <Route path="propuestas" element={<InvestigadorPropuestas />} />
            <Route path="convocatorias" element={<InvestigadorConvocatorias />} />
            <Route path="crear-propuesta" element={<InvestigadorPropuestas />} />
            <Route path="equipo" element={<InvestigadorEquipos />} />
            <Route path="equipos" element={<InvestigadorEquipos />} />
            <Route path="formularios" element={<InvestigadorFormularios />} />
            <Route path="historial" element={<InvestigadorHistorial />} />
            <Route path="buscar" element={<InvestigadorBuscar />} />

            {/* Formularios Oficiales */}
            <Route path="form4" element={<FormularioProyecto />} />
            <Route path="form4/:paso" element={<FormularioProyecto />} />
            <Route path="form5" element={<FormularioPlanRiesgos />} />
            <Route path="presupuesto" element={<FormularioPresupuesto />} />

            {/* Rutas Módulo Vinculación */}
            <Route path="bandeja-evaluacion" element={<VinculacionDashboard />} />
            <Route path="vinculacion" element={<VinculacionDashboard />} />
            <Route path="dictamenes" element={<VinculacionDictamenes />} />
            <Route path="detalle-dictamen" element={<VinculacionDetalleDictamen />} />
            <Route path="evaluar-propuesta" element={<VinculacionEvaluar />} />
            <Route path="evaluaciones" element={<VinculacionDashboard />} />
            
            {/* Rutas de Administración */}
            <Route path="admin" element={<AdminPanel />} />
            <Route path="admin/catalogos" element={<Catalogos />} />
            <Route path="admin/usuarios" element={<Usuarios />} />
            <Route path="admin/convocatoria" element={<Convocatoria />} />
            <Route path="admin/gestoras" element={<AsignacionGestoras />} />
          </Route>

          {/* Accesos directos a Formularios oficiales (nivel raíz) */}
          <Route path="/form5" element={<RutaProtegida><FormularioPlanRiesgos /></RutaProtegida>} />
          <Route path="/presupuesto" element={<RutaProtegida><FormularioPresupuesto /></RutaProtegida>} />
          <Route path="/formulariodeproyecto:paso" element={<RutaProtegida><FormularioProyecto /></RutaProtegida>} />

          {/* MÓDULO DE COMITÉ TÉCNICO */}
          <Route path="/comite-tecnico" element={
            <RutaProtegida rolesPermitidos={[
              'AsistenteComiteTecnico', 'CoordinadorComiteTecnico', 'MiembroComiteTecnico', 
              'DirectorEscuela', 'SuperAdministrador', 'Administrador'
            ]}>
              <ComiteTecnicoLayout />
            </RutaProtegida>
          }>
            <Route index element={<ComiteTecnicoRedirect />} />
            <Route path="bandeja-completitud" element={<BandejaCompletitud />} />
            <Route path="propuestas-asignadas" element={<PropuestasAsignadas />} />
            <Route path="bandeja-evaluacion" element={<BandejaEvaluacion />} />
            <Route path="expediente/:propuestaId" element={<ExpedientePropuesta />} />
            <Route path="dictamen/:propuestaId" element={<DictamenFinal />} />
            <Route path="rubrica/:propuestaId" element={<RubricaDigital />} />
          </Route>

          {/* MÓDULO CIE */}
          <Route path="/cie" element={<RutaProtegida><LayoutCie /></RutaProtegida>}>
            <Route index element={<InicioCie />} />
            <Route path="bandeja" element={<BandejaCie />} />
            <Route path="expediente/:propuestaId" element={<ExpedienteConsolidado />} />
            <Route path="rubrica/:propuestaId" element={<RubricaVie />} />
            <Route path="resolucion/:propuestaId" element={<ResolucionCie />} />
            <Route path="resoluciones" element={<ResolucionesCie />} />
          </Route>

          {/* MÓDULO GESTORA VIE */}
          <Route path="/gestora" element={<RutaProtegida><LayoutGestora /></RutaProtegida>}>
            <Route index element={<InicioGestora />} />
            <Route path="expedientes" element={<Expedientes />} />
            <Route path="revision-vie" element={<RevisionVIE />} />
            <Route path="revision-documentos" element={<RevisionDocumentos />} />
            <Route path="validacion-normativa" element={<ValidacionNormativa />} />
            <Route path="subsanaciones" element={<Subsanaciones />} />
            <Route path="configuracion" element={<ConfiguracionGestora />} />
            <Route path="ayuda" element={<AyudaGestora />} />
          </Route>

          {/* MÓDULO DIRECCIÓN DE INVESTIGACIÓN */}
          <Route path="/direccion" element={<RutaProtegida><LayoutDireccion /></RutaProtegida>}>
            <Route index element={<InicioDireccion />} />
            <Route path="dictamenes" element={<DictamenesRecibidos />} />
            <Route path="revision-dictamen/:propuestaId" element={<RevisionDictamen />} />
            <Route path="documentos-oficiales" element={<DocumentosOficiales />} />
            <Route path="notificacion/:propuestaId" element={<NotificacionOficial />} />
            <Route path="configuracion" element={<ConfiguracionDireccion />} />
            <Route path="ayuda" element={<AyudaDireccion />} />
          </Route>

          {/* Redirecciones de rutas antiguas */}
          <Route path="/gestora-vie/*" element={<RedireccionRutaAnterior origen="/gestora-vie" destino="/gestora" />} />
          <Route path="/miembro-cie/*" element={<RedireccionRutaAnterior origen="/miembro-cie" destino="/cie" />} />
          <Route path="/direccion-investigacion/*" element={<RedireccionRutaAnterior origen="/direccion-investigacion" destino="/direccion" />} />

          {/* RUTA POR DEFECTO (CATCH-ALL) */}
          <Route path="/InvestigadorDashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/vinculacion" element={<Navigate to="/dashboard/bandeja-evaluacion" replace />} />
          <Route path="/bandeja-evaluacion" element={<Navigate to="/dashboard/bandeja-evaluacion" replace />} />
          <Route path="/dictamenes" element={<Navigate to="/dashboard/dictamenes" replace />} />
          <Route path="/equipos" element={<Navigate to="/dashboard/equipos" replace />} />
          <Route path="/equipo" element={<Navigate to="/dashboard/equipos" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ModalProvider>
    </AuthProvider>
  );
};

export default App;
