import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from './LimitedInput';

const CrearPropuestaModal = ({ isOpen, onClose, onPropuestaCreada }) => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Estados del formulario
  const [convocatorias, setConvocatorias] = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [convocatoriaId, setConvocatoriaId] = useState(1);
  const [titulo, setTitulo] = useState('');
  const [escuelaId, setEscuelaId] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estado de éxito
  const [creadaExitosa, setCreadaExitosa] = useState(false);
  const [propuestaCreadaData, setPropuestaCreadaData] = useState(null);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        setCargandoCatalogos(true);
        const data = await propuestaService.obtenerCatalogosFormulario();
        if (data?.convocatorias?.length > 0) {
          setConvocatorias(data.convocatorias);
          setConvocatoriaId(data.convocatorias[0].convocatoriaId);
        } else {
          // Fallback con nombres institucionales VIE
          setConvocatorias([
            { convocatoriaId: 1, nombreConvocatoria: 'Convocatoria Ordinaria VIE 2027' },
            { convocatoriaId: 2, nombreConvocatoria: 'Fondo Incentivos MICITT 2027' },
            { convocatoriaId: 3, nombreConvocatoria: 'Fondo Semilla Biotecnología' },
            { convocatoriaId: 4, nombreConvocatoria: 'Proyectos Fondos FEES 2027' },
            { convocatoriaId: 5, nombreConvocatoria: 'Equipamiento Científico VIE' }
          ]);
        }

        if (data?.escuelas?.length > 0) {
          setEscuelas(data.escuelas);
          const escuelaUsuario = data.escuelas.find(e => e.escuelaId === (usuario?.escuela_id || usuario?.escuelaId));
          if (escuelaUsuario) {
            setEscuelaId(escuelaUsuario.escuelaId);
          } else {
            setEscuelaId(data.escuelas[0].escuelaId);
          }
        } else {
          // Fallback institucional
          setEscuelas([
            { escuelaId: 2, nombreEscuela: 'Escuela de Ingeniería Electrónica (EL)', codigoEscuela: 'EL' },
            { escuelaId: 1, nombreEscuela: 'Escuela de Ingeniería en Computación (IC)', codigoEscuela: 'IC' },
            { escuelaId: 3, nombreEscuela: 'Escuela de Química (QU)', codigoEscuela: 'QU' },
            { escuelaId: 6, nombreEscuela: 'Escuela de Biotecnología (BI)', codigoEscuela: 'BI' }
          ]);
          setEscuelaId(2);
        }
      } catch (err) {
        console.warn('No se pudieron obtener catálogos de base de datos, usando predeterminados:', err);
      } finally {
        setCargandoCatalogos(false);
      }
    };

    if (isOpen) {
      cargarCatalogos();
      setCreadaExitosa(false);
      setPropuestaCreadaData(null);
      setTitulo('');
      setErrorMsg('');
    }
  }, [isOpen, usuario]);

  if (!isOpen) return null;

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('Por favor ingresa un título para la propuesta.');
      return;
    }
    if (titulo.trim().length < 5) {
      setErrorMsg('El título preliminar debe tener al menos 5 caracteres.');
      return;
    }

    try {
      setGuardando(true);
      setErrorMsg('');

      const payload = {
        titulo: titulo.trim(),
        convocatoriaId: Number(convocatoriaId) || 1,
        escuelaId: Number(escuelaId) || 1,
        montoTotal: '0',
        nivelTrlActual: 3,
        nivelTrlEsperado: 6
      };

      const resultado = await propuestaService.crearPropuesta(payload);
      
      const convSeleccionada = convocatorias.find(c => c.convocatoriaId === Number(convocatoriaId));
      const escSeleccionada = escuelas.find(e => e.escuelaId === Number(escuelaId));

      setPropuestaCreadaData({
        propuestaId: resultado?.propuestaId,
        codigoPropuesta: resultado?.codigoPropuesta || `FVIE-2027-${Math.floor(100 + Math.random() * 900)}`,
        titulo: resultado?.titulo || titulo.trim(),
        convocatoria: convSeleccionada?.nombreConvocatoria || 'Convocatoria Ordinaria VIE 2027',
        escuela: escSeleccionada?.nombreEscuela || 'Escuela de Ingeniería Electrónica'
      });

      setCreadaExitosa(true);
      if (resultado?.propuestaId) {
        localStorage.setItem('propuesta_activa_id', String(resultado.propuestaId));
      }

      // Notificar a toda la interfaz que se creó una propuesta para refrescar tablas, conteos y notificaciones
      window.dispatchEvent(new Event('propuestaCreada'));
      if (onPropuestaCreada) {
        onPropuestaCreada(resultado);
      }
    } catch (err) {
      console.error('Error al registrar propuesta en BD:', err);
      let mensajeError = 'Ocurrió un error al guardar la propuesta en la base de datos.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          mensajeError = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          mensajeError = err.response.data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
        }
      }
      setErrorMsg(mensajeError);
    } finally {
      setGuardando(false);
    }
  };

  const nombreInvestigador = usuario?.nombre 
    ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() 
    : 'Lic. William Fallas';

  return (
    <div className="crear-propuesta-modal-overlay">
      <div className="crear-propuesta-modal-card">
        {/* Cabecera azul institucional */}
        <div className="crear-propuesta-modal-header">
          <div className="modal-header-title">
            <span style={{ fontSize: '18px', marginRight: '6px' }}>+</span>
            Crear Nueva Propuesta
          </div>
          <button 
            type="button" 
            className="btn-modal-close" 
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Vista de éxito */}
        {creadaExitosa ? (
          <div className="crear-propuesta-success-body">
            <div className="success-icon-badge">✓</div>
            <h2 className="success-modal-title">¡Propuesta Creada con Éxito!</h2>
            <p className="success-modal-subtitle">
              Se ha registrado formalmente el nuevo borrador de investigación en la base de datos de la VIE.
            </p>

            <div className="success-propuesta-code-box">
              <span className="code-label">CÓDIGO OFICIAL ASIGNADO</span>
              <span className="code-value">{propuestaCreadaData?.codigoPropuesta}</span>
            </div>

            <div className="success-meta-card">
              <div className="meta-row">
                <span className="meta-title">Título:</span>
                <span className="meta-val">{propuestaCreadaData?.titulo}</span>
              </div>
              <div className="meta-row">
                <span className="meta-title">Convocatoria:</span>
                <span className="meta-val">{propuestaCreadaData?.convocatoria}</span>
              </div>
              <div className="meta-row">
                <span className="meta-title">Escuela Encargada:</span>
                <span className="meta-val">{propuestaCreadaData?.escuela}</span>
              </div>
              <div className="meta-row">
                <span className="meta-title">Investigador Propietario:</span>
                <span className="meta-val">{nombreInvestigador} (Tú)</span>
              </div>
              <div className="meta-row">
                <span className="meta-title">Estado Inicial:</span>
                <span className="meta-val" style={{ color: '#0369A1', fontWeight: 600 }}>Borrador / Formulación</span>
              </div>
            </div>

            <div className="success-actions-row" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-proposal-action btn-outline"
                onClick={() => {
                  onClose();
                  navigate('/dashboard/propuestas');
                }}
              >
                Ver en Mis Propuestas
              </button>
              <button 
                type="button" 
                className="btn-nueva-propuesta"
                onClick={() => {
                  onClose();
                  if (propuestaCreadaData?.propuestaId) {
                    navigate(`/dashboard/form4?propuestaId=${propuestaCreadaData.propuestaId}`);
                  } else {
                    navigate('/dashboard/form4');
                  }
                }}
              >
                Llenar Formulario 04 (Digital) →
              </button>
            </div>
          </div>
        ) : (
          /* Formulario flotante de creación */
          <form onSubmit={handleCrear}>
            <div className="crear-propuesta-modal-body">
              <p className="modal-instructions">
                Ingresa los datos principales para el borrador. Podrás sumar formularios (Form-04, Form-05, etc.) tras crear la propuesta.
              </p>

              {errorMsg && (
                <div className="alert-error-box" style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '6px', color: '#b91c1c', fontSize: '13px' }}>
                  {errorMsg}
                </div>
              )}

              {/* Convocatoria */}
              <div className="form-group-modal">
                <label className="form-label-modal">Convocatoria *</label>
                <select 
                  className="form-input-modal"
                  value={convocatoriaId}
                  onChange={(e) => setConvocatoriaId(e.target.value)}
                  disabled={guardando}
                >
                  {convocatorias.map((c) => (
                    <option key={c.convocatoriaId} value={c.convocatoriaId}>
                      {c.nombreConvocatoria}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título preliminar */}
              <div className="form-group-modal">
                <LimitedInput 
                  label="Título preliminar de la propuesta"
                  placeholder="Escribe el título de la investigación..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={300}
                  disabled={guardando}
                  required
                  className="form-input-modal"
                />
              </div>

              {/* Escuela o Instituto Encargado */}
              <div className="form-group-modal">
                <label className="form-label-modal">Escuela o Instituto Encargado *</label>
                <select 
                  className="form-input-modal"
                  value={escuelaId}
                  onChange={(e) => setEscuelaId(e.target.value)}
                  disabled={guardando}
                >
                  {escuelas.map((e) => (
                    <option key={e.escuelaId} value={e.escuelaId}>
                      {e.nombreEscuela}
                    </option>
                  ))}
                </select>
              </div>

              {/* Investigador Principal (Propietario) */}
              <div className="form-group-modal">
                <label className="form-label-modal">Investigador Principal (Propietario)</label>
                <div className="investigador-propietario-box">
                  <div className="propietario-avatar-circle">
                    {nombreInvestigador.charAt(0) || 'I'}
                  </div>
                  <div className="propietario-info">
                    <span className="propietario-nombre">{nombreInvestigador} (Tú)</span>
                    <span className="propietario-rol">Profesor - Investigador Coordinador</span>
                  </div>
                </div>
                <div className="link-incorporar-equipo">
                  + Incorporar co-propietario o integrantes del equipo luego de crear
                </div>
              </div>
            </div>

            {/* Acciones del pie */}
            <div className="crear-propuesta-modal-footer">
              <button 
                type="button" 
                className="btn-modal-cancelar"
                onClick={onClose}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-modal-crear"
                disabled={guardando}
              >
                {guardando ? 'Guardando en BD...' : 'Crear Propuesta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CrearPropuestaModal;
