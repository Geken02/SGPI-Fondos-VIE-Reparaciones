import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import SubsanacionModal from '../../components/SubsanacionModal';
import AsignarEvaluadorModal from '../../components/AsignarEvaluadorModal';
import '../../styles/bandejacompletitud.css';

export default function BandejaDeCompletitud() {
  const [propuestas, setPropuestas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({ total: 0, completas: 0, incompletas: 0 });
  const [cargando, setCargando] = useState(true);
  const [modalSubsanacion, setModalSubsanacion] = useState({ abierto: false, propuesta: null });
  const [modalAsignacion, setModalAsignacion] = useState({ abierto: false, propuesta: null });

  useEffect(() => {
    cargarPropuestas();
  }, []);

  const cargarPropuestas = async () => {
    try {
      setCargando(true);
      const response = await comiteTecnicoService.obtenerBandejaCompletitud();
      const data = response.data;
      const listaPropuestas = Array.isArray(data) ? data : (data.propuestas || []);
      const stats = data.estadisticas || { total: 0, completas: 0, incompletas: 0 };
      
      setPropuestas(listaPropuestas);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando propuestas:', error);
      setPropuestas([]);
      setEstadisticas({ total: 0, completas: 0, incompletas: 0 });
    } finally {
      setCargando(false);
    }
  };

  const handleSolicitarSubsanacion = async (datos) => {
    try {
      await comiteTecnicoService.solicitarSubsanacion(datos.propuestaId, {
        detalle: datos.detalle,
        documentosFaltantes: datos.documentosFaltantes
      });
      alert('Solicitud de subsanación enviada correctamente');
      setModalSubsanacion({ abierto: false, propuesta: null });
      cargarPropuestas();
    } catch (error) {
      console.error('Error al solicitar subsanación:', error);
      alert(error.response?.data?.detail || 'Error al enviar la solicitud');
    }
  };

  const handleAsignarEvaluador = async () => {
    cargarPropuestas();
  };

  // Iconos reutilizables para mantener el código limpio
  const IconoCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const IconoCross = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const IconoUsuarios = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const IconoAdvertencia = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  return (
    <div className="bandeja-container">
      <div className="bandeja-header">
        <h1 className="bandeja-title">Bandeja de Completitud</h1>
        <p className="bandeja-subtitle">
          Revisión inicial de propuestas asignadas al Comité Técnico. Verifique que toda la documentación requerida esté presente.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{estadisticas.total}</div>
          <div className="stat-label">Propuestas Recibidas</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-value">{estadisticas.incompletas}</div>
          <div className="stat-label">Requieren Subsanación</div>
        </div>

        <div className="stat-card success">
          <div className="stat-value">{estadisticas.completas}</div>
          <div className="stat-label">Listas para Evaluar</div>
        </div>
      </div>

      <div className="tabla-container">
        {cargando ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando propuestas...</p>
          </div>
        ) : propuestas.length === 0 ? (
          <div className="empty-state">
            <p>No hay propuestas pendientes de revisión</p>
          </div>
        ) : (
          <table className="tabla-bandeja">
            <thead>
              <tr>
                <th>ID Propuesta</th>
                <th>Título</th>
                <th>Investigador</th>
                <th>Escuela</th>
                <th>Documentación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propuestas.map((propuesta) => (
                <tr key={propuesta.propuestaId}>
                  <td>
                    <span className="codigo-badge">
                      {propuesta.codigoPropuesta}
                    </span>
                  </td>
                  <td className="titulo-celda">
                    {propuesta.titulo}
                  </td>
                  <td>{propuesta.investigador}</td>
                  <td>{propuesta.escuela}</td>
                  <td>
                    <div className="doc-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Documentos Faltantes */}
                      {propuesta.documentosFaltantes?.includes(1) && (
                        <span className="doc-falta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCross /> Form-04
                        </span>
                      )}
                      {propuesta.documentosFaltantes?.includes(2) && (
                        <span className="doc-falta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCross /> Form-05
                        </span>
                      )}
                      {propuesta.documentosFaltantes?.includes(3) && (
                        <span className="doc-falta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCross /> Form-06
                        </span>
                      )}
                      {propuesta.documentosFaltantes?.includes(5) && (
                        <span className="doc-falta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCross /> Dictamen de Vinculación
                        </span>
                      )}
                      
                      {/* Documentos Presentes */}
                      {!propuesta.documentosFaltantes?.includes(1) && (
                        <span className="doc-ok" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCheck /> Form-04
                        </span>
                      )}
                      {!propuesta.documentosFaltantes?.includes(2) && (
                        <span className="doc-ok" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCheck /> Form-05
                        </span>
                      )}
                      {!propuesta.documentosFaltantes?.includes(3) && (
                        <span className="doc-ok" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCheck /> Form-06
                        </span>
                      )}
                      {!propuesta.documentosFaltantes?.includes(5) && (
                        <span className="doc-ok" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconoCheck /> Dictamen de Vinculación
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`estado-badge ${propuesta.esCompleta ? 'completa' : 'incompleta'}`}>
                      {propuesta.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-cell">
                      {propuesta.esCompleta ? (
                        <button
                          onClick={() => setModalAsignacion({ abierto: true, propuesta })}
                          className="btn-asignar"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                        >
                          <IconoUsuarios /> Asignar
                        </button>
                      ) : (
                        <button
                          onClick={() => setModalSubsanacion({ abierto: true, propuesta })}
                          className="btn-subsanar"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                        >
                          <IconoAdvertencia /> Subsanar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalSubsanacion.abierto && (
        <SubsanacionModal
          isOpen={modalSubsanacion.abierto}
          onClose={() => setModalSubsanacion({ abierto: false, propuesta: null })}
          propuesta={modalSubsanacion.propuesta}
          onSubmit={handleSolicitarSubsanacion}
        />
      )}
      
      {modalAsignacion.abierto && (
        <AsignarEvaluadorModal
          isOpen={modalAsignacion.abierto}
          onClose={() => setModalAsignacion({ abierto: false, propuesta: null })}
          propuesta={modalAsignacion.propuesta}
          onAsignar={handleAsignarEvaluador}
        />
      )}
    </div>
  );
}