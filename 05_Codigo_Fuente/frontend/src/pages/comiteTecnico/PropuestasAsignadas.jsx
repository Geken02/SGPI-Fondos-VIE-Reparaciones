import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import '../../styles/PropuestasAsignadas.css'; 

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
      const data = await comiteTecnicoService.obtenerPropuestasAsignadas(busqueda);
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

  // ✅ Ahora devuelve una clase CSS en lugar de un objeto de estilos
  const getEstadoClass = (estado) => {
    const clases = {
      'Pendiente': 'estado-pendiente',
      'En progreso': 'estado-progreso',
      'Completada': 'estado-completada',
      'Asignada': 'estado-asignada',
      'Dictamen Emitido': 'estado-dictamen'
    };
    return clases[estado] || 'estado-default';
  };

  return (
    <div className="propuestas-asignadas-container">
      <div className="propuestas-header">
        <h1 className="propuestas-title">Propuestas Asignadas</h1>
        <p className="propuestas-subtitle">
          {rolActivo === 'AsistenteComiteTecnico' && 'Vista de todas las propuestas en el flujo del Comité Técnico.'}
          {rolActivo === 'CoordinadorComiteTecnico' && 'Propuestas con completitud aprobada, listas para asignación de evaluadores o emisión de dictamen.'}
          {rolActivo === 'MiembroComiteTecnico' && 'Propuestas asignadas a usted para evaluación técnica.'}
          {rolActivo === 'DirectorEscuela' && 'Propuestas de su escuela asignadas para evaluación.'}
        </p>
      </div>

      <div className="propuestas-search-bar">
        <div className="propuestas-search-input-wrapper">
          <span className="propuestas-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por título o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="propuestas-search-input"
            aria-label="Buscar propuestas por título o código"
          />
        </div>
      </div>

      <div className="propuestas-table-container">
        {cargando ? (
          <div className="propuestas-loading">
            <div className="propuestas-spinner"></div>
            <p>Cargando propuestas...</p>
          </div>
        ) : propuestasFiltradas.length === 0 ? (
          <div className="propuestas-empty-state">
            <p>No hay propuestas asignadas</p>
          </div>
        ) : (
          <table className="propuestas-table">
            <thead>
              <tr className="propuestas-thead-tr">
                <th className="propuestas-th">Código</th>
                <th className="propuestas-th">Título</th>
                <th className="propuestas-th">Evaluadores</th>
                <th className="propuestas-th">Fecha Asignación</th>
                <th className="propuestas-th">Estado</th>
                <th className="propuestas-th">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {propuestasFiltradas.map((propuesta) => {
                return (
                  <tr key={propuesta.propuestaId} className="propuestas-tbody-tr">
                    <td className="propuestas-td">
                      <span className="propuestas-codigo-badge">
                        {propuesta.codigoPropuesta}
                      </span>
                    </td>
                    <td className="propuestas-td propuestas-titulo-celda">
                      {propuesta.titulo}
                    </td>
                    <td className="propuestas-td">
                      {propuesta.evaluadores || 'Sin asignar'}
                    </td>
                    <td className="propuestas-td">
                      {propuesta.fechaAsignacion ? new Date(propuesta.fechaAsignacion).toLocaleDateString('es-CR') : '-'}
                    </td>
                    <td className="propuestas-td">
                      <span className={`propuestas-estado-badge ${getEstadoClass(propuesta.estado)}`}>
                        {propuesta.estado}
                      </span>
                    </td>
                    <td className="propuestas-td">
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button
                          onClick={() => navigate(`/comite-tecnico/expediente/${propuesta.propuestaId}`)}
                          className="propuestas-btn-ver"
                        >
                          Ver expediente
                        </button>
                        
                        {rolActivo === 'CoordinadorComiteTecnico' && propuesta.estado === 'Completada' && (
                          <button
                            onClick={() => navigate(`/comite-tecnico/dictamen/${propuesta.propuestaId}`)}
                            className="propuestas-btn-dictamen"
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