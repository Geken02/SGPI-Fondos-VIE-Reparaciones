import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import '../../styles/ExpedientePropuesta.css';

// ============================================================================
// ICONOS SVG (Sin cambios)
// ============================================================================
const Icon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {path}
  </svg>
);

const ICONS = {
  resumen: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  fundamentacion: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  objetivos: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
  metodologia: <><path d="M6 18L18 6"/><path d="M6 6l12 12"/><circle cx="12" cy="12" r="3"/></>,
  cronograma: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  presupuesto: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  productos: <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
  riesgos: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  etica: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  usuario: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  edificio: <><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 9h2"/><path d="M9 13h2"/><path d="M9 17h2"/><path d="M13 9h2"/><path d="M13 13h2"/><path d="M13 17h2"/></>,
  etiqueta: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  reloj: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  moneda: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  flecha: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  zoom: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  evaluacion: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  alert: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
};

export default function ExpedientePropuesta() {
  const { propuestaId } = useParams();
  const navigate = useNavigate();
  const { rolActivo } = useAuth();
  
  const [propuesta, setPropuesta] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('resumen');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [notasRevision, setNotasRevision] = useState('');

  useEffect(() => {
    cargarExpediente();
  }, [propuestaId]);

  const cargarExpediente = async () => {
    try {
      setCargando(true);
      setError(null);
      const response = await comiteTecnicoService.obtenerExpediente(propuestaId);
      setPropuesta(response.data);
    } catch (err) {
      console.error('Error cargando expediente:', err);
      setError('No se pudo cargar el expediente. Verifique que tenga permisos para ver esta propuesta.');
    } finally {
      setCargando(false);
    }
  };

  const totalHoras = propuesta?.totalHorasSemanales || 0;
  const productosMinimos = Math.ceil(totalHoras / 10);
  const modalidad = propuesta?.modalidad || '';
  const topePresupuesto = modalidad.includes('Fortalecimiento') ? 2000000 : 
                         modalidad.includes('Desarrollo') ? 5000000 : 4000000;
  const presupuesto = propuesta?.presupuestoTotal || 0;
  const presupuestoValido = presupuesto <= topePresupuesto;

  const puedeEvaluar = ['MiembroComiteTecnico', 'DirectorEscuela', 'SuperAdministrador', 'Administrador'].includes(rolActivo);

  const secciones = [
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: ICONS.resumen },
    { id: 'fundamentacion', label: 'Fundamentación y Justificación', icon: ICONS.fundamentacion },
    { id: 'objetivos', label: 'Objetivos', icon: ICONS.objetivos },
    { id: 'metodologia', label: 'Metodología', icon: ICONS.metodologia },
    { id: 'cronograma', label: 'Plan de Acción y Cronograma', icon: ICONS.cronograma },
    { id: 'presupuesto', label: 'Presupuesto Operativo', icon: ICONS.presupuesto },
    { id: 'productos', label: 'Productos Académicos', icon: ICONS.productos },
    { id: 'riesgos', label: 'Gestión de Riesgos', icon: ICONS.riesgos },
    { id: 'etica', label: 'Aspectos Éticos', icon: ICONS.etica },
  ];

  if (cargando) {
    return (
      <div className="exp-container">
        <div className="exp-loading">
          <div className="exp-spinner"></div>
          <p>Cargando expediente...</p>
        </div>
      </div>
    );
  }

  if (error || !propuesta) {
    return (
      <div className="exp-container">
        <div className="exp-error">
          <h2>Error al cargar el expediente</h2>
          <p>{error || 'Propuesta no encontrada'}</p>
          <button onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')} className="exp-btn-back">
            ← Volver a la bandeja
          </button>
        </div>
      </div>
    );
  }

  const renderContenido = () => {
    switch (seccionActiva) {
      case 'resumen':
        return (
          <div>
            <h2 className="exp-section-title">Resumen Ejecutivo</h2>
            <div className="exp-meta-grid">
              <MetaCard icon={<Icon path={ICONS.reloj} size={16} />} label="Período" value={propuesta.periodo || '2027-2029'} />
              <MetaCard icon={<Icon path={ICONS.usuario} size={16} />} label="Integrantes" value={`${propuesta.totalIntegrantes || 0} investigadores`} />
              <MetaCard icon={<Icon path={ICONS.etiqueta} size={16} />} label="Modalidad" value={propuesta.modalidad || 'No especificada'} />
            </div>
            <div className="exp-text-block">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {propuesta.resumen || 'El resumen de la propuesta no está disponible en este momento.'}
              </p>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'fundamentacion':
        return (
          <div>
            <h2 className="exp-section-title">Fundamentación y Justificación</h2>
            <div className="exp-text-block">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {propuesta.resumen || 'La fundamentación detallada se encuentra en el documento Form-04 adjunto.'}
              </p>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'objetivos':
        return (
          <div>
            <h2 className="exp-section-title">Objetivos</h2>
            <div className="exp-text-block">
              {propuesta.objetivosEspecificos ? (
                <ul className="exp-list">
                  {propuesta.objetivosEspecificos.split(';\n').filter(Boolean).map((obj, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.5' }}>{obj.trim()}</li>
                  ))}
                </ul>
              ) : (
                <p>Los objetivos específicos no están disponibles en este momento.</p>
              )}
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'metodologia':
        return (
          <div>
            <h2 className="exp-section-title">Metodología</h2>
            <div className="exp-text-block">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {propuesta.metodologia || 'La metodología detallada se encuentra en el documento Form-04 adjunto.'}
              </p>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'cronograma':
        return (
          <div>
            <h2 className="exp-section-title">Plan de Acción y Cronograma</h2>
            <div className="exp-text-block">
              <p>El plan de acción y cronograma detallado se encuentra en el documento <strong>Form-05 (Plan de Acción y Riesgos)</strong> adjunto a este expediente.</p>
            </div>
            <div className="exp-info-box">
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div>
                <strong>Disposición 2.3.8:</strong> El equipo proponente deberá considerar dentro de la planificación, el realizar la gestión de las compras internacionales y de equipo, en el primer semestre del proyecto.
              </div>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'presupuesto':
        return (
          <div>
            <h2 className="exp-section-title">Presupuesto Operativo</h2>
            
            <div className={`exp-alert-box ${presupuestoValido ? 'success' : 'danger'}`}>
              <div className="exp-alert-header">
                <Icon path={presupuestoValido ? ICONS.check : ICONS.alert} size={16} />
                <strong>Validación presupuestaria (Disp. 4.2 / 5.2)</strong>
              </div>
              <div className="exp-alert-content">
                <strong>Modalidad:</strong> {modalidad}<br/>
                <strong>Tope máximo según disposición:</strong> ₡{topePresupuesto.toLocaleString()}<br/>
                <strong>Presupuesto total solicitado:</strong> ₡{presupuesto.toLocaleString()}<br/>
                <div className="exp-alert-divider">
                  <strong>Estado: {presupuestoValido ? '✓ Dentro del límite permitido' : '✗ Excede el límite establecido'}</strong>
                </div>
              </div>
            </div>

            {propuesta.presupuestoDesglose && Object.keys(propuesta.presupuestoDesglose).length > 0 && (
              <div className="exp-summary-box">
                <h3 className="exp-summary-title">Desglose por Año de Ejecución</h3>
                <table className="exp-table-simple">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Operativo</th>
                      <th>Bienes Duraderos</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(propuesta.presupuestoDesglose).map(([anio, datos]) => (
                      <tr key={anio}>
                        <td><strong>{anio}</strong></td>
                        <td>₡{datos.operativo.toLocaleString()}</td>
                        <td>₡{datos.duradero.toLocaleString()}</td>
                        <td><strong>₡{datos.total.toLocaleString()}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="exp-info-box">
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div>
                <strong>Disposición 2.3.9:</strong> Toda compra en bienes duraderos debe formularse obligatoriamente para el primer año de ejecución del proyecto.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'productos':
        return (
          <div>
            <h2 className="exp-section-title">Productos Académicos Comprometidos</h2>
            
            <div className="exp-alert-box info">
              <div className="exp-alert-header">
                <Icon path={ICONS.info} size={16} />
                <strong>Cálculo según Disposición 2.4.1</strong>
              </div>
              <div className="exp-alert-content">
                <strong>Total de horas semanales del equipo:</strong> {totalHoras}h<br/>
                <strong>Productos académicos mínimos requeridos:</strong> {productosMinimos} producto{productosMinimos !== 1 ? 's' : ''}<br/>
                <div style={{marginTop: '8px', fontSize: '12px', opacity: 0.9}}>
                  (Escala: 1 producto por cada 10 horas semanales, redondeado hacia arriba)
                </div>
              </div>
            </div>

            <div className="exp-info-box">
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div>
                <strong>Disposición 2.4.1:</strong> La cantidad de productos finales obligatorios se calculará, exclusivamente, sobre la suma total de horas semanales asignadas al equipo de trabajo independientemente del tipo de horas.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'riesgos':
        return (
          <div>
            <h2 className="exp-section-title">Plan de Administración de Riesgos</h2>
            <div className="exp-text-block">
              <p>El plan de administración de riesgos detallado se encuentra en el documento <strong>Form-05 (Plan de Acción y Riesgos)</strong> adjunto a este expediente.</p>
            </div>
            <div className="exp-info-box">
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div>
                <strong>Disposición 1.6:</strong> El equipo investigador debe identificar al menos un riesgo por cada actividad definida en el plan de acción.
              </div>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'etica':
        return (
          <div>
            <h2 className="exp-section-title">Aspectos Éticos y Permisos</h2>
            <div className="exp-alert-box warning">
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', color: 'inherit', fontWeight: '600'}}>
                Marco Legal Aplicable (Disp. 2.10.2)
              </h3>
              <ul className="exp-list">
                <li><strong>Ley 9234 (2014):</strong> Investigación con seres humanos - Requiere aprobación del Comité Ético Científico (CEC)</li>
                <li><strong>Ley 7788 (1998):</strong> Biodiversidad - Requiere permisos de CONAGEBIO</li>
                <li><strong>Ley 7451 (2017):</strong> Bienestar Animal - Requiere aprobación de CICUA o COBAB</li>
              </ul>
            </div>
            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      default:
        return <div className="exp-text">Seleccione una sección del menú lateral</div>;
    }
  };

  return (
    <div className="exp-container">
      {/* HEADER */}
      <div className="exp-header">
        <button onClick={() => navigate(-1)} className="exp-back-btn">
          <Icon path={ICONS.flecha} size={16} />
          <span>Volver</span>
        </button>
        <div className="exp-header-content">
          <div className="exp-title-row">
            <h1 className="exp-title">Expediente: {propuesta.codigoPropuesta}</h1>
            <span className="exp-badge">{propuesta.estado || 'En Evaluación'}</span>
          </div>
          <p className="exp-subtitle">{propuesta.titulo}</p>
        </div>
      </div>

      {/* METADATA BAR */}
      <div className="exp-meta-bar">
        <div className="exp-meta-item">
          <div className="exp-meta-icon"><Icon path={ICONS.usuario} size={16} /></div>
          <div>
            <span className="exp-meta-label">Investigador Principal</span>
            <span className="exp-meta-value">{propuesta.investigador}</span>
          </div>
        </div>
        <div className="exp-meta-item">
          <div className="exp-meta-icon"><Icon path={ICONS.edificio} size={16} /></div>
          <div>
            <span className="exp-meta-label">Escuela</span>
            <span className="exp-meta-value">{propuesta.escuela}</span>
          </div>
        </div>
        <div className="exp-meta-item">
          <div className="exp-meta-icon"><Icon path={ICONS.etiqueta} size={16} /></div>
          <div>
            <span className="exp-meta-label">Modalidad</span>
            <span className="exp-meta-value">{propuesta.modalidad}</span>
          </div>
        </div>
        <div className="exp-meta-item">
          <div className="exp-meta-icon"><Icon path={ICONS.reloj} size={16} /></div>
          <div>
            <span className="exp-meta-label">Horas/Sem</span>
            <span className="exp-meta-value">{totalHoras}h</span>
          </div>
        </div>
        <div className="exp-meta-item">
          <div className="exp-meta-icon"><Icon path={ICONS.moneda} size={16} /></div>
          <div>
            <span className="exp-meta-label">Presupuesto</span>
            <span className="exp-meta-value">₡{presupuesto.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* BOTÓN DE EVALUACIÓN O ESTADO */}
      <div className="exp-eval-row">
        {propuesta.yaEvaluado ? (
          <div className="exp-status-box completed">
            <Icon path={ICONS.check} size={18} color="#065f46" />
            <span>Evaluación Completada</span>
          </div>
        ) : puedeEvaluar ? (
          <button 
            onClick={() => navigate(`/comite-tecnico/rubrica/${propuestaId}`)}
            className="exp-btn-evaluar"
          >
            <Icon path={ICONS.evaluacion} size={16} color="white" />
            <span>Registrar Evaluación</span>
          </button>
        ) : (
          <div className="exp-status-box readonly">
            <Icon path={ICONS.lock} size={16} color="#64748b" />
            <span>Solo lectura ({rolActivo})</span>
          </div>
        )}
      </div>

      {/* MAIN 2-COLUMN LAYOUT */}
      <div className="exp-grid">
        {/* LEFT: NAVIGATION */}
        <div className="exp-panel">
          <h3 className="exp-panel-title">SECCIONES DEL FORM-04</h3>
          <div className="exp-nav-list">
            {secciones.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSeccionActiva(sec.id)}
                className={`exp-nav-item ${seccionActiva === sec.id ? 'active' : ''}`}
              >
                <span className="exp-nav-icon">
                  <Icon path={sec.icon} size={16} color={seccionActiva === sec.id ? '#002855' : '#64748b'} />
                </span>
                <span className="exp-nav-label">{sec.label}</span>
              </button>
            ))}
          </div>
          
          {propuesta.integrantes?.length > 0 && (
            <div className="exp-team-section">
              <h4 className="exp-team-title">EQUIPO INVESTIGADOR ({propuesta.integrantes.length})</h4>
              <div className="exp-team-list">
                {propuesta.integrantes.map((intg, idx) => (
                  <div key={idx} className={`exp-team-item ${intg.esCoordinador ? 'coordinador' : ''}`}>
                    <div className="exp-team-nombre">{intg.nombre}</div>
                    <div className="exp-team-meta">
                      {intg.horasSemanales}h/semana {intg.esCoordinador && '• Coordinador'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: DOCUMENT VIEWER */}
        <div className="exp-main-content">
          <div className="exp-doc-header">
            <div className="exp-doc-header-left">
              <span className="exp-doc-header-icon">
                <Icon path={secciones.find(s => s.id === seccionActiva)?.icon} size={18} color="#002855" />
              </span>
              <h2 className="exp-doc-header-title">
                {secciones.find(s => s.id === seccionActiva)?.label}
              </h2>
            </div>
            <div className="exp-doc-header-actions">
              <button className="exp-icon-btn" title="Zoom">
                <Icon path={ICONS.zoom} size={14} />
              </button>
              <button className="exp-icon-btn" title="Descargar">
                <Icon path={ICONS.download} size={14} />
              </button>
            </div>
          </div>
          <div className="exp-doc-body">
            {renderContenido()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================
const MetaCard = ({ icon, label, value }) => (
  <div className="exp-meta-card">
    <div className="exp-meta-card-icon">{icon}</div>
    <div>
      <div className="exp-meta-card-label">{label}</div>
      <div className="exp-meta-card-value">{value}</div>
    </div>
  </div>
);

const DocumentosRelacionados = ({ documentos }) => {
  if (!documentos || documentos.length === 0) {
    return (
      <div className="exp-docs-section">
        <h3 className="exp-docs-title">Documentos relacionados</h3>
        <div className="exp-docs-empty">No hay documentos adjuntos disponibles</div>
      </div>
    );
  }

  return (
    <div className="exp-docs-section">
      <h3 className="exp-docs-title">Documentos relacionados ({documentos.length})</h3>
      <div className="exp-docs-list">
        {documentos.map((doc, idx) => (
          <div key={idx} className="exp-doc-item">
            <div className="exp-doc-item-left">
              <div className="exp-doc-icon-box">
                <Icon path={ICONS.resumen} size={16} />
              </div>
              <div>
                <div className="exp-doc-nombre">{doc.nombreArchivo || doc.nombreTipo}</div>
                <div className="exp-doc-tipo">{doc.nombreTipo || 'Documento'}</div>
              </div>
            </div>
            {doc.urlDescarga && (
              <a href={doc.urlDescarga} download className="exp-doc-download" aria-label={`Descargar ${doc.nombreArchivo || doc.nombreTipo}`}>
                <Icon path={ICONS.download} size={16} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const NotasRevision = ({ notas, setNotas }) => (
  <div className="exp-notas-section">
    <h3 className="exp-notas-title">
      <Icon path={ICONS.evaluacion} size={16} />
      Notas de revisión
    </h3>
    <textarea
      value={notas}
      onChange={(e) => setNotas(e.target.value)}
      placeholder="Agregue observaciones sobre esta sección..."
      className="exp-notas-textarea"
      aria-label="Notas de revisión"
    />
  </div>
);