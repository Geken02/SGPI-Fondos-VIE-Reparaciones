// src/pages/comiteTecnico/ExpedientePropuesta.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';

// ============================================================================
// ICONOS SVG
// ============================================================================
const Icon = ({ path, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  // Cálculos basados en disposiciones del PDF
  const totalHoras = propuesta?.totalHorasSemanales || 0;
  const productosMinimos = Math.ceil(totalHoras / 10); // Disp. 2.4.1
  const modalidad = propuesta?.modalidad || '';
  const topePresupuesto = modalidad.includes('Fortalecimiento') ? 2000000 : 
                         modalidad.includes('Desarrollo') ? 5000000 : 4000000;
  const presupuesto = propuesta?.presupuestoSolicitado || 0;
  const presupuestoValido = presupuesto <= topePresupuesto;

  // Roles que pueden evaluar
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
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Cargando expediente...</p>
        </div>
      </div>
    );
  }

  if (error || !propuesta) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2 style={{color: '#ef4444', marginBottom: '16px'}}>Error al cargar el expediente</h2>
          <p style={{color: '#64748b', marginBottom: '24px'}}>{error || 'Propuesta no encontrada'}</p>
          <button onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')} style={styles.btnBack}>
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
            <h2 style={styles.sectionTitle}>Resumen Ejecutivo</h2>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px'}}>
              <MetaCard 
                icon={<Icon path={ICONS.reloj} size={16} />}
                label="Período"
                value={propuesta.periodo || '2027-2028'}
              />
              <MetaCard 
                icon={<Icon path={ICONS.usuario} size={16} />}
                label="Integrantes"
                value={`${propuesta.totalIntegrantes || 0} investigadores`}
              />
              <MetaCard 
                icon={<Icon path={ICONS.etiqueta} size={16} />}
                label="Modalidad"
                value={propuesta.modalidad || 'No especificada'}
              />
            </div>

            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                {propuesta.resumen || 'El resumen de la propuesta no está disponible en este momento. Por favor, consulte el documento Form-04 adjunto.'}
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.3.1:</strong> Todas las iniciativas deben ingresarse a través del sistema Orión. Es requisito indispensable adjuntar la documentación de respaldo completa, utilizando los formatos vigentes aprobados por el CIE.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'fundamentacion':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Fundamentación y Justificación</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                La fundamentación y justificación detallada de esta propuesta se encuentra en el documento Form-04 adjunto. El Comité Técnico evaluará la definición y justificación del problema, estado del arte, y coherencia entre problema y objetivos.
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.11.1.a:</strong> El Comité Técnico evaluará la definición y justificación del problema, estado del arte, y coherencia entre problema y objetivos.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'objetivos':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Objetivos</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                Los objetivos general y específicos de esta propuesta se encuentran detallados en el documento Form-04 adjunto. Los objetivos deben ser coherentes con la problemática planteada y la metodología propuesta.
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.11.1.a:</strong> Se evaluará la coherencia entre el problema planteado y los objetivos propuestos, tanto general como específicos.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'metodologia':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Metodología</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                La metodología detallada de esta propuesta se encuentra en el documento Form-04 adjunto. El Comité Técnico evaluará el rigor metodológico, incluyendo enfoque, alcance, diseño de la investigación, y población de estudio.
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.11.1.a:</strong> Se evaluará el rigor metodológico (enfoque, alcance, diseño de la investigación), población de estudio o definición de usuarios.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'cronograma':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Plan de Acción y Cronograma</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                El plan de acción y cronograma detallado de esta propuesta se encuentra en el documento Form-04 adjunto. El cronograma debe mostrar claridad en las actividades, planificación detallada y trazabilidad de los resultados.
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
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
            <h2 style={styles.sectionTitle}>Presupuesto Operativo</h2>
            
            <div style={{
              ...styles.alertBox, 
              backgroundColor: presupuestoValido ? '#ecfdf5' : '#fef2f2', 
              borderColor: presupuestoValido ? '#10b981' : '#ef4444',
              color: presupuestoValido ? '#065f46' : '#991b1b'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <Icon path={presupuestoValido ? ICONS.check : ICONS.alert} size={16} />
                <strong>Validación presupuestaria (Disp. 4.2 / 5.2)</strong>
              </div>
              <div style={{fontSize: '13px', lineHeight: '1.8'}}>
                <strong>Modalidad:</strong> {modalidad}<br/>
                <strong>Tope máximo según disposición:</strong> ₡{topePresupuesto.toLocaleString()}<br/>
                <strong>Presupuesto solicitado:</strong> ₡{presupuesto.toLocaleString()}<br/>
                <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid currentColor', opacity: 0.8}}>
                  <strong>Estado: {presupuestoValido ? '✓ Dentro del límite permitido' : '✗ Excede el límite establecido'}</strong>
                </div>
              </div>
            </div>

            {presupuesto > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <h3 style={{margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a', fontWeight: '600'}}>
                  Resumen Presupuestario
                </h3>
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0'}}>
                  <span style={{color: '#64748b', fontSize: '13px'}}>Presupuesto total solicitado</span>
                  <span style={{fontWeight: '600', color: '#0f172a', fontSize: '14px'}}>₡{presupuesto.toLocaleString()}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
                  <span style={{color: '#64748b', fontSize: '13px'}}>Tope máximo permitido</span>
                  <span style={{fontWeight: '600', color: presupuestoValido ? '#10b981' : '#ef4444', fontSize: '14px'}}>₡{topePresupuesto.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.3.9:</strong> El presupuesto debe ser coherente con los montos máximos establecidos. Toda compra en bienes duraderos debe formularse obligatoriamente para el primer año de ejecución del proyecto.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'productos':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Productos Académicos Comprometidos</h2>
            
            <div style={{
              ...styles.alertBox, 
              backgroundColor: '#f0f9ff', 
              borderColor: '#0284c7',
              color: '#0c4a6e'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <Icon path={ICONS.info} size={16} />
                <strong>Cálculo según Disposición 2.4.1</strong>
              </div>
              <div style={{fontSize: '13px', lineHeight: '1.8'}}>
                <strong>Total de horas semanales del equipo:</strong> {totalHoras}h<br/>
                <strong>Productos académicos mínimos requeridos:</strong> {productosMinimos} producto{productosMinimos !== 1 ? 's' : ''}<br/>
                <div style={{marginTop: '8px', fontSize: '12px', opacity: 0.9}}>
                  (Escala: 1 producto por cada 10 horas semanales, redondeado hacia arriba)
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', color: '#0f172a', fontWeight: '600'}}>
                Opciones de productos según modalidad
              </h3>
              <p style={{margin: '0 0 12px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6'}}>
                Los productos académicos comprometidos deberán seleccionarse de las listas de opciones definidas según la modalidad:
              </p>
              <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.8'}}>
                <li><strong>Fortalecimiento:</strong> Diagnóstico, estudio de mercado, factibilidad, ensayo de laboratorio, propuesta de línea de investigación, formulación de proyecto, o artículo científico (Sección 3.6)</li>
                <li><strong>Investigación básica/aplicada:</strong> Artículo WoS/Scopus, 2 artículos SciELO/Redalyc, o libro/capítulo de libro (Sección 4.4)</li>
                <li><strong>Desarrollo tecnológico:</strong> Producto de propiedad industrial + productos académicos (Sección 5.5)</li>
              </ul>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
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
            <h2 style={styles.sectionTitle}>Plan de Administración de Riesgos</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                El plan de administración de riesgos detallado de esta propuesta se encuentra en el documento Form-04 adjunto. El plan debe incluir identificación de riesgos, medidas de mitigación y responsables de la gestión.
              </p>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 1.6:</strong> El equipo investigador debe identificar al menos un riesgo por cada actividad definida en el plan de acción. Las medidas de mitigación deben ser prácticas, medibles y coherentes con los recursos disponibles.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      case 'etica':
        return (
          <div>
            <h2 style={styles.sectionTitle}>Aspectos Éticos y Permisos</h2>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <p style={{margin: 0, color: '#334155', fontSize: '14px', lineHeight: '1.7', textAlign: 'justify'}}>
                Los aspectos éticos y permisos requeridos para esta propuesta se encuentran detallados en el documento Form-04 adjunto. La ejecución técnica de las actividades que requieran permisos no podrá iniciar hasta que se cuente con la autorización respectiva.
              </p>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fcd34d',
              marginBottom: '24px'
            }}>
              <h3 style={{margin: '0 0 12px 0', fontSize: '14px', color: '#92400e', fontWeight: '600'}}>
                Marco Legal Aplicable (Disp. 2.10.2)
              </h3>
              <ul style={{margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#78350f', lineHeight: '1.8'}}>
                <li><strong>Ley 9234 (2014):</strong> Investigación con seres humanos - Requiere aprobación del Comité Ético Científico (CEC)</li>
                <li><strong>Ley 7788 (1998):</strong> Biodiversidad - Requiere permisos de CONAGEBIO</li>
                <li><strong>Ley 7451 (2017):</strong> Bienestar Animal - Requiere aprobación de CICUA o COBAB</li>
              </ul>
            </div>

            <div style={styles.infoBox}>
              <Icon path={ICONS.info} size={16} color="#0284c7" />
              <div style={{marginLeft: '8px'}}>
                <strong>Disposición 2.10.2:</strong> La ejecución técnica de las actividades que requieran estos permisos no podrá iniciar hasta que se cuente con la autorización respectiva. El Comité Técnico es responsable de verificar que estos requisitos estén debidamente planteados.
              </div>
            </div>

            <DocumentosRelacionados documentos={propuesta.documentos || []} />
            <NotasRevision notas={notasRevision} setNotas={setNotasRevision} />
          </div>
        );
      
      default:
        return <div style={styles.text}>Seleccione una sección del menú lateral</div>;
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <Icon path={ICONS.flecha} size={16} />
          <span>Volver</span>
        </button>
        <div style={styles.headerContent}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap'}}>
            <h1 style={styles.title}>Expediente: {propuesta.codigoPropuesta}</h1>
            <span style={styles.badge}>{propuesta.estado || 'En Evaluación'}</span>
          </div>
          <p style={styles.subtitle}>{propuesta.titulo}</p>
        </div>
      </div>

      {/* METADATA BAR */}
      <div style={styles.metaBar}>
        <div style={styles.metaItem}>
          <div style={styles.metaIcon}><Icon path={ICONS.usuario} size={16} color="#64748b" /></div>
          <div>
            <span style={styles.metaLabel}>Investigador Principal</span>
            <span style={styles.metaValue}>{propuesta.investigador}</span>
          </div>
        </div>
        <div style={styles.metaItem}>
          <div style={styles.metaIcon}><Icon path={ICONS.edificio} size={16} color="#64748b" /></div>
          <div>
            <span style={styles.metaLabel}>Escuela</span>
            <span style={styles.metaValue}>{propuesta.escuela}</span>
          </div>
        </div>
        <div style={styles.metaItem}>
          <div style={styles.metaIcon}><Icon path={ICONS.etiqueta} size={16} color="#64748b" /></div>
          <div>
            <span style={styles.metaLabel}>Modalidad</span>
            <span style={styles.metaValue}>{propuesta.modalidad}</span>
          </div>
        </div>
        <div style={styles.metaItem}>
          <div style={styles.metaIcon}><Icon path={ICONS.reloj} size={16} color="#64748b" /></div>
          <div>
            <span style={styles.metaLabel}>Horas/Sem</span>
            <span style={styles.metaValue}>{totalHoras}h</span>
          </div>
        </div>
        <div style={styles.metaItem}>
          <div style={styles.metaIcon}><Icon path={ICONS.moneda} size={16} color="#64748b" /></div>
          <div>
            <span style={styles.metaLabel}>Presupuesto</span>
            <span style={styles.metaValue}>₡{presupuesto.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* BOTÓN DE EVALUACIÓN O ESTADO (Condicional por rol y estado) */}
      <div style={{marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px'}}>
        {propuesta.yaEvaluado ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', backgroundColor: '#d1fae5', color: '#065f46',
            borderRadius: '8px', fontWeight: '600', fontSize: '14px', border: '1px solid #a7f3d0'
          }}>
            <Icon path={ICONS.check} size={18} color="#065f46" />
            <span>Evaluación Completada</span>
          </div>
        ) : puedeEvaluar ? (
          <button 
            onClick={() => navigate(`/comite-tecnico/rubrica/${propuestaId}`)}
            style={styles.btnEvaluar}
          >
            <Icon path={ICONS.evaluacion} size={16} color="white" />
            <span>Registrar Evaluación</span>
          </button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569',
            borderRadius: '8px', fontWeight: '500', fontSize: '14px', border: '1px solid #e2e8f0'
          }}>
            <Icon path={ICONS.lock} size={16} color="#64748b" />
            <span>Solo lectura ({rolActivo})</span>
          </div>
        )}
      </div>

      {/* MAIN 2-COLUMN LAYOUT */}
      <div style={styles.grid}>
        
        {/* LEFT: NAVIGATION */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>SECCIONES DEL FORM-04</h3>
          <div style={styles.navList}>
            {secciones.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSeccionActiva(sec.id)}
                style={{
                  ...styles.navItem,
                  ...(seccionActiva === sec.id ? styles.navItemActive : {})
                }}
              >
                <span style={styles.navIcon}>
                  <Icon path={sec.icon} size={16} color={seccionActiva === sec.id ? '#002855' : '#64748b'} />
                </span>
                <span style={{flex: 1, textAlign: 'left'}}>{sec.label}</span>
              </button>
            ))}
          </div>
          
          {/* Integrantes del equipo */}
          {propuesta.integrantes?.length > 0 && (
            <div style={{marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0'}}>
              <h4 style={styles.teamTitle}>
                EQUIPO INVESTIGADOR ({propuesta.integrantes.length})
              </h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {propuesta.integrantes.map((intg, idx) => (
                  <div key={idx} style={{
                    padding: '10px 12px',
                    backgroundColor: intg.esCoordinador ? '#e6f0ff' : '#f8fafc',
                    borderRadius: '6px',
                    borderLeft: intg.esCoordinador ? '3px solid #002855' : '3px solid transparent'
                  }}>
                    <div style={{fontWeight: intg.esCoordinador ? '600' : '500', color: '#0f172a', fontSize: '13px'}}>
                      {intg.nombre}
                    </div>
                    <div style={{fontSize: '12px', color: '#64748b', marginTop: '2px'}}>
                      {intg.horasSemanales}h/semana {intg.esCoordinador && '• Coordinador'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: DOCUMENT VIEWER */}
        <div style={styles.mainContent}>
          <div style={styles.docHeader}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={styles.docHeaderIcon}>
                <Icon path={secciones.find(s => s.id === seccionActiva)?.icon} size={18} color="#002855" />
              </span>
              <h2 style={styles.docHeaderTitle}>
                {secciones.find(s => s.id === seccionActiva)?.label}
              </h2>
            </div>
            <div style={{display: 'flex', gap: '8px'}}>
              <button style={styles.iconBtn} title="Zoom">
                <Icon path={ICONS.zoom} size={14} color="#64748b" />
              </button>
              <button style={styles.iconBtn} title="Descargar">
                <Icon path={ICONS.download} size={14} color="#64748b" />
              </button>
            </div>
          </div>
          <div style={styles.docBody}>
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
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{color: '#64748b'}}>{icon}</div>
    <div>
      <div style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600'}}>{label}</div>
      <div style={{fontSize: '14px', color: '#0f172a', fontWeight: '600'}}>{value}</div>
    </div>
  </div>
);

const DocumentosRelacionados = ({ documentos }) => {
  if (!documentos || documentos.length === 0) {
    return (
      <div style={{marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e2e8f0'}}>
        <h3 style={{fontSize: '12px', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px'}}>
          Documentos relacionados
        </h3>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px'
        }}>
          No hay documentos adjuntos disponibles
        </div>
      </div>
    );
  }

  return (
    <div style={{marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e2e8f0'}}>
      <h3 style={{fontSize: '12px', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px'}}>
        Documentos relacionados ({documentos.length})
      </h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {documentos.map((doc, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#e6f0ff',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#002855',
                fontWeight: '700',
                fontSize: '11px'
              }}>
                <Icon path={ICONS.resumen} size={16} />
              </div>
              <div>
                <div style={{fontSize: '14px', color: '#0f172a', fontWeight: '500'}}>{doc.nombreArchivo || doc.nombreTipo}</div>
                <div style={{fontSize: '12px', color: '#64748b'}}>{doc.nombreTipo || 'Documento'}</div>
              </div>
            </div>
            {doc.urlDescarga && (
              <a href={doc.urlDescarga} download style={{textDecoration: 'none'}}>
                <Icon path={ICONS.download} size={16} color="#64748b" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const NotasRevision = ({ notas, setNotas }) => (
  <div style={{marginTop: '32px', padding: '20px', backgroundColor: '#fef9c3', borderRadius: '8px', border: '1px solid #fcd34d'}}>
    <h3 style={{margin: '0 0 12px 0', fontSize: '14px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600'}}>
      <Icon path={ICONS.evaluacion} size={16} />
      Notas de revisión
    </h3>
    <textarea
      value={notas}
      onChange={(e) => setNotas(e.target.value)}
      placeholder="Agregue observaciones sobre esta sección..."
      style={{
        width: '100%',
        minHeight: '80px',
        padding: '12px',
        border: '1px solid #fcd34d',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'inherit',
        resize: 'vertical',
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}
    />
  </div>
);

// ============================================================================
// ESTILOS
// ============================================================================
const styles = {
  container: { 
    padding: '32px', 
    maxWidth: '1400px', 
    margin: '0 auto', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
    backgroundColor: '#f8fafc', 
    minHeight: '100vh' 
  },
  header: { 
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  backBtn: { 
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'white', 
    border: '1px solid #e2e8f0', 
    color: '#002855', 
    cursor: 'pointer', 
    fontSize: '13px', 
    fontWeight: '500', 
    padding: '8px 14px',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  headerContent: { flex: 1 },
  title: { fontSize: '22px', color: '#0f172a', margin: '0', fontWeight: '600' },
  badge: { 
    backgroundColor: '#fef3c7', 
    color: '#92400e', 
    padding: '4px 10px', 
    borderRadius: '12px', 
    fontSize: '11px', 
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  subtitle: { color: '#64748b', margin: '6px 0 0 0', fontSize: '14px', lineHeight: '1.5' },
  metaBar: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '16px', 
    backgroundColor: 'white', 
    padding: '20px 24px', 
    borderRadius: '8px', 
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px' 
  },
  metaItem: { display: 'flex', alignItems: 'center', gap: '12px' },
  metaIcon: { 
    width: '36px', 
    height: '36px', 
    backgroundColor: '#f1f5f9', 
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  metaLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px', display: 'block' },
  metaValue: { fontSize: '14px', color: '#0f172a', fontWeight: '600', display: 'block', marginTop: '2px' },
  btnEvaluar: { 
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px', 
    backgroundColor: '#002855', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontWeight: '500', 
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },
  grid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' },
  panel: { 
    backgroundColor: 'white', 
    borderRadius: '8px', 
    padding: '20px', 
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0'
  },
  panelTitle: { 
    fontSize: '11px', 
    color: '#64748b', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px', 
    margin: '0 0 12px 0', 
    fontWeight: '700' 
  },
  teamTitle: {
    fontSize: '11px', 
    color: '#64748b', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px', 
    margin: '0 0 12px 0', 
    fontWeight: '700'
  },
  navList: { display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    padding: '10px 12px', 
    border: 'none', 
    background: 'transparent', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    textAlign: 'left', 
    fontSize: '13px', 
    color: '#475569', 
    transition: 'all 0.15s',
    width: '100%'
  },
  navItemActive: { backgroundColor: '#e6f0ff', color: '#002855', fontWeight: '600' },
  navIcon: { 
    width: '24px', 
    height: '24px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    flexShrink: 0
  },
  mainContent: { 
    backgroundColor: 'white', 
    borderRadius: '8px', 
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden', 
    minHeight: '600px' 
  },
  docHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 24px', 
    backgroundColor: '#f8fafc', 
    borderBottom: '1px solid #e2e8f0' 
  },
  docHeaderIcon: {
    width: '32px',
    height: '32px',
    backgroundColor: '#e6f0ff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  docHeaderTitle: {margin: 0, color: '#002855', fontSize: '18px', fontWeight: '600'},
  iconBtn: { 
    background: 'white', 
    border: '1px solid #e2e8f0', 
    borderRadius: '6px', 
    width: '32px', 
    height: '32px', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    transition: 'all 0.15s'
  },
  docBody: { padding: '32px' },
  sectionTitle: { 
    color: '#0f172a', 
    fontSize: '20px', 
    marginBottom: '20px', 
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: '600'
  },
  text: { color: '#334155', lineHeight: '1.7', fontSize: '14px', marginBottom: '16px', textAlign: 'justify' },
  infoBox: { 
    backgroundColor: '#f0f9ff', 
    borderLeft: '3px solid #0284c7', 
    padding: '12px 16px', 
    borderRadius: '6px', 
    fontSize: '13px', 
    color: '#0c4a6e', 
    marginTop: '20px',
    lineHeight: '1.6',
    display: 'flex',
    alignItems: 'flex-start'
  },
  alertBox: { 
    padding: '16px', 
    borderRadius: '6px', 
    fontSize: '13px', 
    marginBottom: '24px', 
    border: '1px solid',
    lineHeight: '1.7'
  },
  loading: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '400px',
    color: '#64748b'
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #002855',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '16px'
  },
  error: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  btnBack: {
    padding: '10px 20px',
    backgroundColor: '#002855',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  }
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