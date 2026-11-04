// src/pages/comiteTecnico/PropuestasAsignadas.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';

export default function PropuestasAsignadas() {
  const { rolActivo } = useAuth();
  const navigate = useNavigate();
  const [propuestas, setPropuestas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarPropuestas();
  }, [rolActivo]);

  const cargarPropuestas = async () => {
    try {
      setCargando(true);
      // El backend ya filtra según el rol del usuario autenticado
      const response = await comiteTecnicoService.obtenerPropuestasAsignadas();
      const data = response.data;
      const lista = Array.isArray(data) ? data : (data.items || []);
      setPropuestas(lista);
    } catch (error) {
      console.error('Error cargando propuestas:', error);
      setPropuestas([]);
    } finally {
      setCargando(false);
    }
  };

  const propuestasFiltradas = propuestas.filter(p => 
    p.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigoPropuesta?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEstadoColor = (estado) => {
    const colores = {
      'Pendiente': { bg: '#fef3c7', color: '#92400e' },
      'En progreso': { bg: '#dbeafe', color: '#1e40af' },
      'Completada': { bg: '#d1fae5', color: '#065f46' },
      'Asignada': { bg: '#e6f0ff', color: '#002855' }
    };
    return colores[estado] || { bg: '#f1f5f9', color: '#475569' };
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Propuestas Asignadas</h1>
        <p style={styles.subtitle}>
          {rolActivo === 'AsistenteComiteTecnico' && 'Vista de todas las propuestas en el flujo del Comité Técnico.'}
          {rolActivo === 'CoordinadorComiteTecnico' && 'Propuestas con completitud aprobada, listas para asignación de evaluadores o emisión de dictamen.'}
          {rolActivo === 'MiembroComiteTecnico' && 'Propuestas asignadas a usted para evaluación técnica.'}
          {rolActivo === 'DirectorEscuela' && 'Propuestas de su escuela asignadas para evaluación.'}
        </p>
      </div>

      {/* Buscador */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por título o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Tabla */}
      <div style={styles.tableContainer}>
        {cargando ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Cargando propuestas...</p>
          </div>
        ) : propuestasFiltradas.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No hay propuestas asignadas</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadTr}>
                <th style={styles.th}>Código</th>
                <th style={styles.th}>Título</th>
                <th style={styles.th}>Evaluadores</th>
                <th style={styles.th}>Fecha Asignación</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propuestasFiltradas.map((propuesta) => {
                const estadoColor = getEstadoColor(propuesta.estado);
                return (
                  <tr key={propuesta.propuestaId} style={styles.tbodyTr}>
                    <td style={styles.td}>
                      <span style={styles.codigoBadge}>
                        {propuesta.codigoPropuesta}
                      </span>
                    </td>
                    <td style={{...styles.td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500', color: '#002855'}}>
                      {propuesta.titulo}
                    </td>
                    <td style={{...styles.td, color: '#475569', fontSize: '14px'}}>
                      {propuesta.evaluadores || 'Sin asignar'}
                    </td>
                    <td style={{...styles.td, color: '#64748b', fontSize: '14px'}}>
                      {propuesta.fechaAsignacion ? new Date(propuesta.fechaAsignacion).toLocaleDateString('es-CR') : '-'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: estadoColor.bg,
                        color: estadoColor.color
                      }}>
                        {propuesta.estado}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button
                          onClick={() => navigate(`/comite-tecnico/expediente/${propuesta.propuestaId}`)}
                          style={styles.btnVer}
                        >
                          Ver expediente
                        </button>
                        
                        {/* Solo el Coordinador ve este botón cuando el estado es Completada */}
                        {rolActivo === 'CoordinadorComiteTecnico' && propuesta.estado === 'Completada' && (
                          <button
                            onClick={() => navigate(`/comite-tecnico/dictamen/${propuesta.propuestaId}`)}
                            style={styles.btnDictamen}
                          >
                            Emitir dictamen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================
const styles = {
  container: { padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  header: { marginBottom: '32px' },
  title: { color: '#002855', fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' },
  subtitle: { color: '#64748b', fontSize: '15px', margin: 0 },
  searchBar: { backgroundColor: 'white', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '12px' },
  searchInputWrapper: { flex: 1, position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' },
  searchInput: { width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' },
  tableContainer: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  theadTr: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  th: { padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' },
  tbodyTr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '16px 20px', fontSize: '14px', color: '#334155' },
  codigoBadge: { backgroundColor: '#e6f0ff', color: '#002855', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' },
  btnVer: { padding: '8px 16px', backgroundColor: '#002855', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  btnDictamen: { padding: '8px 16px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  loading: { padding: '80px 20px', textAlign: 'center', color: '#64748b' },
  spinner: { border: '3px solid #f3f4f6', borderTop: '3px solid #002855', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
  emptyState: { padding: '80px 20px', textAlign: 'center', color: '#64748b' }
};

// Animación de spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}