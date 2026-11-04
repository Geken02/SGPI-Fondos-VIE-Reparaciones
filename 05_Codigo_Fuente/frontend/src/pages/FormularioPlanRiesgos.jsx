import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';
import { exportarForm05Excel } from '../utils/exportUtils';

const FormularioPlanRiesgos = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propuestaIdUrl = searchParams.get('propuestaId') || searchParams.get('id');

  // Estados de la propuesta (en blanco listos para llenado)
  const [nombrePropuesta, setNombrePropuesta] = useState('');
  const [tipoIniciativa, setTipoIniciativa] = useState('Investigación básica o aplicada');
  const [duracionMeses, setDuracionMeses] = useState('24 Meses');

  // Integrantes e Iniciales
  const [integrantes, setIntegrantes] = useState([]);
  const [nuevoIntegrante, setNuevoIntegrante] = useState({ nombre: '', iniciales: '', rol: 'Colaborador técnico' });
  const [mostrarModalNuevoIntegrante, setMostrarModalNuevoIntegrante] = useState(false);

  // Plan de Acción y Matriz de Riesgos
  const [actividades, setActividades] = useState([]);

  const [guardadoMsg, setGuardadoMsg] = useState('Borrador listo para formulación');
  const [guardando, setGuardando] = useState(false);

  // Helper: crear objeto vacío de periodo de ejecución
  const crearPeriodoVacio = () => {
    const periodo = {};
    for (let a = 1; a <= 3; a++) {
      periodo[`a${a}`] = {};
      for (let m = 1; m <= 12; m++) {
        periodo[`a${a}`][`m${m}`] = false;
      }
    }
    return periodo;
  };

  // Inicializar usuario como coordinador
  useEffect(() => {
    if (usuario?.nombre && integrantes.length === 0) {
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido1 || ''}`.trim();
      const inits = `${(usuario.nombre || '')[0] || ''}${(usuario.apellido1 || '')[0] || ''}`.toUpperCase();
      setIntegrantes([
        { id: 1, nombre: nombreCompleto, iniciales: inits || 'IP', rol: 'Persona coordinadora' }
      ]);
    }
  }, [usuario]);

  // Cargar propuesta desde la base de datos o almacenamiento local
  useEffect(() => {
    const cargarPropuestaBD = async () => {
      let id = propuestaIdUrl;
      if (!id) {
        id = localStorage.getItem('propuesta_activa_id');
        if (!id) {
          try {
            const misProps = await propuestaService.obtenerMisPropuestas();
            if (misProps && misProps.length > 0) {
              id = String(misProps[0].propuestaId);
              localStorage.setItem('propuesta_activa_id', id);
            }
          } catch (_e) {}
        }
        if (id) {
          navigate(`/dashboard/form5?propuestaId=${id}`, { replace: true });
        }
      }

      if (!id) return;
      localStorage.setItem('propuesta_activa_id', String(id));

      // 1. Cargar datos locales de Form-05 si existen
      try {
        const localRaw = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
        if (localRaw) {
          const l = JSON.parse(localRaw);
          if (l.nombrePropuesta) setNombrePropuesta(l.nombrePropuesta);
          if (l.tipoIniciativa) setTipoIniciativa(l.tipoIniciativa);
          if (l.duracionMeses) setDuracionMeses(l.duracionMeses);
          if (l.integrantes && l.integrantes.length > 0) setIntegrantes(l.integrantes);
          if (l.actividades && l.actividades.length > 0) setActividades(l.actividades);
          setGuardadoMsg('Borrador cargado');
        }
      } catch (_e) {}

      // 2. Cargar datos oficiales de la propuesta
      try {
        const prop = await propuestaService.obtenerPropuesta(id);
        console.log(prop);
        if (prop) {
          if (prop.titulo) setNombrePropuesta(prop.titulo);
          if (prop.modalidad) setTipoIniciativa(prop.modalidad);
          if (prop.integrantes && prop.integrantes.length > 0) {
            setIntegrantes(prev => {
              if (prev.length > 1) return prev;
              return prop.integrantes.map((inte, idx) => ({
                id: inte.integranteEquipoId || idx + 1,
                nombre: inte.nombreCompleto || 'Investigador',
                iniciales: (inte.nombreCompleto || 'INV').split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(),
                rol: inte.rolEquipoId === 1 ? 'Persona coordinadora' : 'Colaborador técnico'
              }));
            });
          }
        }
      } catch (_e) {
        // En blanco
      }
    };
    cargarPropuestaBD();
  }, [propuestaIdUrl]);

  const handleGuardarBorrador = async () => {
    setGuardando(true);
    const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');

    const dataToSave = {
      nombrePropuesta,
      tipoIniciativa,
      duracionMeses,
      integrantes,
      actividades,
      fechaGuardado: new Date().toISOString()
    };

    if (id) {
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(dataToSave));
      // También guardar como borrador_form05 para compatibilidad con exportUtils
      localStorage.setItem(`borrador_form05_${id}`, JSON.stringify(dataToSave));
      try {
        await propuestaService.actualizarCabecera(id, {
          titulo: nombrePropuesta || 'Iniciativa de Investigación'
        });
      } catch (_e) {}
    }
    localStorage.setItem('propuesta_plan_riesgos_ultimo', JSON.stringify(dataToSave));

    window.dispatchEvent(new Event('propuestaCreada'));
    setGuardadoMsg('Guardado');
    setGuardando(false);
    alert('¡Borrador del Plan de Acción y Gestión del Riesgo (Form-05) guardado con éxito!');
  };

  const handleEnviarPlan = async () => {
    setGuardando(true);
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    const dataToSave = {
      nombrePropuesta,
      tipoIniciativa,
      duracionMeses,
      integrantes,
      actividades,
      fechaGuardado: new Date().toISOString()
    };

    if (id) {
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(dataToSave));
      localStorage.setItem(`borrador_form05_${id}`, JSON.stringify(dataToSave));
      localStorage.setItem(`propuesta_${id}_form05_enviado`, 'true');
    }
    window.dispatchEvent(new Event('propuestaCreada'));
    alert('\u00a1Plan de Acci\u00f3n y Gesti\u00f3n del Riesgo enviado exitosamente a la VIE!');
    setGuardando(false);
    navigate('/dashboard/propuestas');
  };

  const handleAgregarIntegrante = (e) => {
    e.preventDefault();
    if (!nuevoIntegrante.nombre || !nuevoIntegrante.iniciales) return;
    setIntegrantes([...integrantes, { id: Date.now(), ...nuevoIntegrante }]);
    setNuevoIntegrante({ nombre: '', iniciales: '', rol: 'Colaborador técnico' });
    setMostrarModalNuevoIntegrante(false);
  };

  const handleAgregarFilaActividad = () => {
    const nueva = {
      id: Date.now(),
      objetivo: '',
      actividad: '',
      resultado: '',
      participante: '',
      responsabilidad: '',
      riesgo: '',
      mitigacion: '',
      responsableGestion: '',
      mesInicio: '',
      duracionMesesAct: '',
      periodoEjecucion: crearPeriodoVacio()
    };
    setActividades([...actividades, nueva]);
  };

  const handleEliminarActividad = (id) => {
    setActividades(actividades.filter(a => a.id !== id));
  };

  const handleTogglePeriodo = (actIndex, anio, mes) => {
    const copia = [...actividades];
    const key = `a${anio}`;
    const mKey = `m${mes}`;
    if (!copia[actIndex].periodoEjecucion) {
      copia[actIndex].periodoEjecucion = crearPeriodoVacio();
    }
    if (!copia[actIndex].periodoEjecucion[key]) {
      copia[actIndex].periodoEjecucion[key] = {};
    }
    copia[actIndex].periodoEjecucion[key][mKey] = !copia[actIndex].periodoEjecucion[key][mKey];
    setActividades(copia);
  };

  // Determinar cuántos años mostrar
  const numAnios = duracionMeses === '12 Meses' ? 1 : duracionMeses === '24 Meses' ? 2 : 3;

  return (
    <div className="formulario-proyecto-master-wrapper">
      {/* Header Institucional */}
      <div className="form-top-banner">
        <div className="form-banner-left">
          <span className="form-banner-tec-title">TEC | SGPI — Formulario de Plan de Acción y Gestión del Riesgo (VIE 2027)</span>
        </div>
        <div className="form-banner-right">
          <span className="autoguardado-badge">
            <span className="dot-pulse"></span>
            {guardando ? 'Guardando...' : guardadoMsg}
          </span>
        </div>
      </div>

      <div className="form-paper-container">
        <h1 className="step-main-title" style={{ fontSize: '24px', marginBottom: '24px' }}>
          Plan de Acción y Gestión del Riesgo de una Iniciativa de Investigación
        </h1>

        {/* 1. Encabezado de la Propuesta */}
        <div className="form-section-box">
          <h2 className="section-title-h2">1. Encabezado de la Propuesta</h2>
          <div className="form-three-cols-grid">
            <div className="form-group-block" style={{ flex: 2 }}>
              <LimitedInput
                label="Nombre de la propuesta"
                required
                type="text"
                className="form-text-input"
                value={nombrePropuesta}
                onChange={(e) => setNombrePropuesta(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="form-group-block">
              <label className="form-field-label">Tipo de iniciativa *</label>
              <select
                className="form-text-input"
                value={tipoIniciativa}
                onChange={(e) => setTipoIniciativa(e.target.value)}
              >
                <option value="Investigación básica o aplicada">Investigación básica o aplicada</option>
                <option value="Desarrollo tecnológico">Desarrollo tecnológico</option>
                <option value="Iniciativa de vinculación">Iniciativa de vinculación</option>
              </select>
            </div>
            <div className="form-group-block">
              <label className="form-field-label">Duración (Meses) *</label>
              <select
                className="form-text-input"
                value={duracionMeses}
                onChange={(e) => setDuracionMeses(e.target.value)}
              >
                <option value="12 Meses">12 Meses</option>
                <option value="24 Meses">24 Meses</option>
                <option value="36 Meses">36 Meses</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Registro de Integrantes e Iniciales */}
        <div className="form-section-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 className="section-title-h2" style={{ margin: 0 }}>2. Registro de Integrantes e Iniciales</h2>
            <button 
              type="button" 
              className="btn-link-action"
              onClick={() => setMostrarModalNuevoIntegrante(true)}
            >
              + Añadir
            </button>
          </div>
          <div className="table-responsive-container">
            <table className="institucional-data-table">
              <thead>
                <tr>
                  <th>Nombre Completo del Participante</th>
                  <th style={{ width: '15%' }}>Iniciales</th>
                  <th>Rol de Referencia</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {integrantes.map((int, i) => (
                  <tr key={int.id}>
                    <td><strong>{int.nombre}</strong></td>
                    <td>
                      <span className="propuesta-codigo-pill" style={{ background: '#f1f5f9', color: '#1e293b' }}>
                        {int.iniciales}
                      </span>
                    </td>
                    <td style={{ color: '#475569' }}>{int.rol}</td>
                    <td style={{ textAlign: 'center' }}>
                      {i > 0 && (
                        <button
                          type="button"
                          className="btn-icon-action btn-icon-delete"
                          onClick={() => setIntegrantes(integrantes.filter(item => item.id !== int.id))}
                          title="Remover participante"
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Plan de Acción y Matriz de Riesgos */}
        <div className="form-section-box">
          <h2 className="section-title-h2">3. Plan de Acción y Matriz de Riesgos</h2>
          <div className="table-responsive-container" style={{ overflowX: 'auto' }}>
            <table className="institucional-data-table" style={{ minWidth: numAnios === 3 ? '2200px' : numAnios === 2 ? '1800px' : '1400px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>OBJETIVO</th>
                  <th rowSpan={2} style={{ minWidth: '140px' }}>ACTIVIDADES</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>RESULTADO ESPERADO</th>
                  <th rowSpan={2} style={{ width: '80px', minWidth: '80px' }}>PARTICIPANTES</th>
                  <th rowSpan={2} style={{ width: '90px', minWidth: '90px' }}>RESPONSABILIDAD</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>RIESGOS IDENTIFICADOS</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>MEDIDAS DE MITIGACIÓN</th>
                  <th rowSpan={2} style={{ width: '90px', minWidth: '90px' }}>RESPONSABLE DE LA GESTIÓN</th>
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>MES DE INICIO DE ACTIVIDAD</th>
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>DURACIÓN (MESES)</th>
                  {Array.from({ length: numAnios }, (_, a) => (
                    <th key={`anio-${a+1}`} colSpan={12} style={{ textAlign: 'center' }}>{`AÑO ${a + 1}`}</th>
                  ))}
                  <th rowSpan={2} style={{ width: '40px', textAlign: 'center' }}></th>
                </tr>
                <tr>
                  {Array.from({ length: numAnios }, (_, a) =>
                    Array.from({ length: 12 }, (_, m) => (
                      <th key={`a${a+1}-m${m+1}`} style={{ width: '28px', minWidth: '28px', textAlign: 'center', fontSize: '10px', padding: '2px' }}>
                        {m + 1}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {actividades.length === 0 ? (
                  <tr>
                    <td colSpan={11 + numAnios * 12} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No hay actividades registradas aún en el cronograma. Haz clic en <strong>+ Agregar Actividad al Cronograma</strong> para comenzar.
                    </td>
                  </tr>
                ) : (
                  actividades.map((act, i) => (
                  <tr key={act.id}>
                    <td>
                      <LimitedInput 
                        value={act.objetivo}
                        maxLength={20}
                        showCounter={false}
                        className="form-table-input"
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].objetivo = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <LimitedInput 
                        value={act.actividad}
                        maxLength={500}
                        showCounter={false}
                        className="form-table-input"
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].actividad = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <LimitedInput 
                        value={act.resultado}
                        maxLength={500}
                        showCounter={false}
                        className="form-table-input"
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].resultado = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <select 
                        className="form-table-input"
                        value={act.participante}
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].participante = e.target.value;
                          setActividades(copia);
                        }}
                      >
                        <option value="">—</option>
                        {integrantes.map(int => (
                          <option key={int.id} value={int.iniciales}>{int.iniciales}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select 
                        className="form-table-input"
                        value={act.responsabilidad}
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].responsabilidad = e.target.value;
                          setActividades(copia);
                        }}
                      >
                        <option value="">—</option>
                        <option value="Ejecuta">Ejecuta</option>
                        <option value="Supervisa">Supervisa</option>
                        <option value="Colabora">Colabora</option>
                      </select>
                    </td>
                    <td>
                      <LimitedInput 
                        value={act.riesgo}
                        maxLength={500}
                        showCounter={false}
                        className="form-table-input"
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].riesgo = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <LimitedInput 
                        value={act.mitigacion}
                        maxLength={500}
                        showCounter={false}
                        className="form-table-input"
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].mitigacion = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <select 
                        className="form-table-input"
                        value={act.responsableGestion}
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].responsableGestion = e.target.value;
                          setActividades(copia);
                        }}
                      >
                        <option value="">—</option>
                        {integrantes.map(int => (
                          <option key={int.id} value={int.iniciales}>{int.iniciales}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        className="form-table-input"
                        style={{ width: '50px', textAlign: 'center' }}
                        value={act.mesInicio || ''}
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].mesInicio = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        className="form-table-input"
                        style={{ width: '50px', textAlign: 'center' }}
                        value={act.duracionMesesAct || ''}
                        onChange={(e) => {
                          const copia = [...actividades];
                          copia[i].duracionMesesAct = e.target.value;
                          setActividades(copia);
                        }}
                      />
                    </td>
                    {Array.from({ length: numAnios }, (_, a) =>
                      Array.from({ length: 12 }, (_, m) => {
                        const checked = act.periodoEjecucion?.[`a${a+1}`]?.[`m${m+1}`] || false;
                        return (
                          <td key={`${act.id}-a${a+1}-m${m+1}`} style={{ textAlign: 'center', padding: '1px' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTogglePeriodo(i, a + 1, m + 1)}
                              style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                            />
                          </td>
                        );
                      })
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        className="btn-icon-action btn-icon-delete"
                        onClick={() => handleEliminarActividad(act.id)}
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
          <button 
            type="button" 
            className="btn-add-table-row"
            onClick={handleAgregarFilaActividad}
          >
            + Agregar Actividad
          </button>
        </div>

        {/* Recordatorio VIE */}
        <div className="vie-reminder-box">
          <span className="reminder-icon">✔</span>
          <div className="reminder-text">
            <strong>Recordatorio VIE:</strong> Dentro de la programación de actividades se deben incluir obligatoriamente las giras de campo y los informes de avance. Además, deberá registrarse cualquier pasantía nacional o internacional que se requiera para el desarrollo del proyecto.
          </div>
        </div>

        {/* Botones Inferiores */}
        <div className="form-footer-action-bar">
          <div className="footer-left">
            <button 
              type="button" 
              className="btn-form-nav btn-outline"
              onClick={() => {
                const idProp = propuestaIdUrl || localStorage.getItem('propuesta_activa_id') || '';
                exportarForm05Excel({ nombrePropuesta, tipoIniciativa, duracionMeses, integrantes, actividades }, idProp ? `Propuesta-${idProp}` : 'Form05');
              }}
            >
              📥 Descargar Excel
            </button>
          </div>
          <div className="footer-center">
            <button 
              type="button" 
              className="btn-form-nav btn-outline"
              onClick={handleGuardarBorrador}
              disabled={guardando}
            >
              Guardar Borrador
            </button>
          </div>
          <div className="footer-right">
            <button 
              type="button" 
              className="btn-form-nav btn-primary"
              onClick={handleEnviarPlan}
              disabled={guardando}
            >
              Enviar Plan
            </button>
          </div>
        </div>
      </div>

      {/* Modal Añadir Participante */}
      {mostrarModalNuevoIntegrante && (
        <div className="crear-propuesta-modal-overlay" onClick={() => setMostrarModalNuevoIntegrante(false)}>
          <div className="crear-propuesta-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="crear-propuesta-modal-header">
              <div className="modal-header-title">+ Añadir Participante al Registro</div>
              <button type="button" className="btn-modal-close" onClick={() => setMostrarModalNuevoIntegrante(false)}>✕</button>
            </div>
            <form onSubmit={handleAgregarIntegrante} style={{ padding: '24px' }}>
              <div className="modal-form-group">
                <LimitedInput 
                  label="Nombre Completo del Participante"
                  required
                  maxLength={50}
                  placeholder="Ej: Lic. Esteban Mora Rojas"
                  className="modal-form-input"
                  value={nuevoIntegrante.nombre}
                  onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, nombre: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div className="modal-form-group">
                  <LimitedInput 
                    label="Iniciales"
                    required
                    maxLength={5}
                    placeholder="EMR"
                    className="modal-form-input"
                    value={nuevoIntegrante.iniciales}
                    onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, iniciales: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-form-label">Rol de Referencia</label>
                  <select 
                    className="modal-form-select"
                    value={nuevoIntegrante.rol}
                    onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, rol: e.target.value })}
                  >
                    <option value="Persona coordinadora">Persona coordinadora</option>
                    <option value="Co-Investigador(a)">Co-Investigador(a)</option>
                    <option value="Asistente TEC">Asistente TEC</option>
                    <option value="Colaborador técnico">Colaborador técnico</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => setMostrarModalNuevoIntegrante(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-nueva-propuesta">
                  Añadir Participante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioPlanRiesgos;
