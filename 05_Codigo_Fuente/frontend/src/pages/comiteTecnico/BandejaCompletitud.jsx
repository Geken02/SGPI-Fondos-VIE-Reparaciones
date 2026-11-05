// src/pages/comiteTecnico/BandejaDeCompletitud.jsx
import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import SubsanacionModal from '../../components/SubsanacionModal';

export default function BandejaDeCompletitud() {
  const [propuestas, setPropuestas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({ total: 0, completas: 0, incompletas: 0 });
  const [cargando, setCargando] = useState(true);
  const [modalSubsanacion, setModalSubsanacion] = useState({ abierto: false, propuesta: null });

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

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#002855', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          Bandeja de Completitud
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
          Revisión inicial de propuestas asignadas al Comité Técnico. Verifique que toda la documentación requerida esté presente.
        </p>
      </div>

      

      {/* Tarjetas de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #002855'
        }}>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#002855', marginBottom: '4px' }}>
            {estadisticas.total}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Propuestas Recibidas
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#002855', marginBottom: '4px' }}>
            {estadisticas.incompletas}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Requieren Subsanación
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #10b981'
        }}>
          <div style={{ fontSize: '36px', fontWeight: '800', color: '#002855', marginBottom: '4px' }}>
            {estadisticas.completas}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Listas para Evaluar
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {cargando ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #002855',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p>Cargando propuestas...</p>
          </div>
        ) : propuestas.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
            <p>No hay propuestas pendientes de revisión</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>ID Propuesta</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Título</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Investigador</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Escuela</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Documentación</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propuestas.map((propuesta) => (
                <tr key={propuesta.propuestaId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      backgroundColor: '#e6f0ff',
                      color: '#002855',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {propuesta.codigoPropuesta}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', color: '#002855' }}>
                    {propuesta.titulo}
                  </td>
                  <td style={{ padding: '16px 20px' }}>{propuesta.investigador}</td>
                  <td style={{ padding: '16px 20px' }}>{propuesta.escuela}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
                      {!propuesta.documentosFaltantes?.includes(1) && <span style={{ color: '#10b981' }}>✓ Form-04</span>}
                      {!propuesta.documentosFaltantes?.includes(2) && <span style={{ color: '#10b981' }}>✓ Form-05</span>}
                      {propuesta.documentosFaltantes?.includes(3) && <span style={{ color: '#ef4444' }}>✗ Form-06</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      backgroundColor: propuesta.esCompleta ? '#d1fae5' : '#fee2e2',
                      color: propuesta.esCompleta ? '#065f46' : '#991b1b'
                    }}>
                      {propuesta.estado}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {!propuesta.esCompleta ? (
                      <button
                        onClick={() => setModalSubsanacion({ abierto: true, propuesta })}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        ⚠️ Subsanar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAprobarCompletitud(propuesta.propuestaId)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Aprobar
                      </button>
                    )}
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
    </div>
  );
}