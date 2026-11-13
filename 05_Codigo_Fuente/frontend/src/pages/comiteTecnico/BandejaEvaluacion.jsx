// src/pages/comiteTecnico/BandejaEvaluacion.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';

export default function BandejaEvaluacion() {
  const [datos, setDatos] = useState({
    propuestas: [],
    total: 0,
    estadisticas: {
      pendientes: 0,
      enEvaluacion: 0,
      completadas: 0
    }
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const response = await comiteTecnicoService.obtenerBandejaEvaluacion();
      
      const propuestas = response.data.propuestas || [];
      const estadisticas = {
        pendientes: propuestas.filter(p => p.estado?.toLowerCase() === 'pendiente').length,
        enEvaluacion: propuestas.filter(p => p.estado?.toLowerCase() === 'en evaluación').length,
        completadas: propuestas.filter(p => p.estado?.toLowerCase() === 'completada').length
      };
      
      setDatos({ propuestas, total: propuestas.length, estadisticas });
    } catch (err) {
      console.error('Error cargando bandeja de evaluación:', err);
    } finally {
      setCargando(false);
    }
  };

  const getEstadoClase = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente': return 'gray';
      case 'en evaluación': return 'warning';
      case 'completada': return 'success';
      default: return 'gray';
    }
  };

  if (cargando) {
    return (
      <div className="comite-loading">
        <div className="spinner"></div>
        <p>Cargando bandeja de evaluación...</p>
      </div>
    );
  }

  return (
    <div className="bandeja-evaluacion">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Bandeja de Evaluación</h1>
          <p>Evaluación independiente de propuestas asignadas. Cada evaluador debe completar su rúbrica de forma confidencial.</p>
        </div>
        
      </div>

      {/* Estadísticas */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="stat-number">{datos.total}</div>
          <div className="stat-label">Propuestas Asignadas</div>
        </div>

        <div className="stat-card stat-warning">
          <div className="stat-icon-wrapper icon-amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="stat-number">{datos.estadisticas.pendientes}</div>
          <div className="stat-label">Pendientes de Evaluar</div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon-wrapper icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="stat-number">{datos.estadisticas.completadas}</div>
          <div className="stat-label">Evaluaciones Completadas</div>
        </div>
      </div>

      {/* Tabla de propuestas */}
      <div className="tabla-container">
        <div className="tabla-header">
          <h2>Propuestas Asignadas para Evaluación</h2>
        </div>
        
        {datos.propuestas.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No tienes propuestas asignadas en este momento.</p>
          </div>
        ) : (
          <table className="tabla-moderna">
            <thead>
              <tr>
                <th>ID Propuesta</th>
                <th>Título</th>
                <th>Fecha de Asignación</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.propuestas.map((prop) => (
                <tr key={prop.evaluacionId}>
                  <td>
                    <span className="codigo-badge">{prop.codigoPropuesta}</span>
                  </td>
                  <td className="titulo-celda" title={prop.titulo}>
                    {prop.titulo}
                  </td>
                  <td>
                    {prop.fechaAsignacion 
                      ? new Date(prop.fechaAsignacion).toLocaleDateString('es-CR') 
                      : '-'}
                  </td>
                  <td>
                    <span className={`estado-badge ${getEstadoClase(prop.estado)}`}>
                      {prop.estado || 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link 
                      to={`/comite-tecnico/expediente/${prop.propuestaId}?evaluacionId=${prop.evaluacionId}`}
                      className="btn-primary-sm"
                    >
                      {prop.estado?.toLowerCase() === 'completada' ? 'Ver Evaluación' : 
                       prop.estado?.toLowerCase() === 'en evaluación' ? 'Continuar Evaluación' : 
                       'Evaluar con Rúbrica-02'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}