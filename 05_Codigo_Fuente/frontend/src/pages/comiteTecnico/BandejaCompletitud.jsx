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

  const handleAprobarCompletitud = async (propuestaId) => {
    if (!window.confirm('¿Está seguro de aprobar la completitud de esta propuesta?')) {
      return;
    }
    try {
      await comiteTecnicoService.aprobarCompletitud(propuestaId);
      alert('Completitud aprobada');
      cargarPropuestas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al aprobar');
    }
  };

  const handleAsignarEvaluador = async () => {
    cargarPropuestas();
  };

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
                    <div className="doc-list">
                      {propuesta.documentosFaltantes?.includes(1) && <span className="doc-falta">✗ Form-04</span>}
                      {propuesta.documentosFaltantes?.includes(2) && <span className="doc-falta">✗ Form-05</span>}
                      {propuesta.documentosFaltantes?.includes(3) && <span className="doc-falta">✗ Form-06</span>}
                      {propuesta.documentosFaltantes?.includes(5) && <span className="doc-falta">✗ Presupuesto</span>}
                      
                      {!propuesta.documentosFaltantes?.includes(1) && <span className="doc-ok">✓ Form-04</span>}
                      {!propuesta.documentosFaltantes?.includes(2) && <span className="doc-ok">✓ Form-05</span>}
                      {!propuesta.documentosFaltantes?.includes(3) && <span className="doc-ok">✓ Form-06</span>}
                      {!propuesta.documentosFaltantes?.includes(5) && <span className="doc-ok">✓ Presupuesto</span>}
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
                        <>
                          <button
                            onClick={() => setModalAsignacion({ abierto: true, propuesta })}
                            className="btn-asignar"
                          >
                            👥 Asignar
                          </button>
                          <button
                            onClick={() => handleAprobarCompletitud(propuesta.propuestaId)}
                            className="btn-aprobar"
                          >
                            ✓ Aprobar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setModalSubsanacion({ abierto: true, propuesta })}
                          className="btn-subsanar"
                        >
                          ⚠️ Subsanar
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