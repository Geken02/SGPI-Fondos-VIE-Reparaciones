import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';
import { exportarForm05Excel } from '../utils/exportUtils';

const obtenerIniciales = (nombre) => {
  if (!nombre) return 'TEC';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return partes[0].slice(0, 2).toUpperCase();
};

const construirIntegrantesDeEquipo = (propData, form04Data, usuarioActual) => {
  const lista = [];
  const nombresVistos = new Set();

  const agregar = (nombre, rol, id, usuarioId, escuela) => {
    if (!nombre) return;
    const norm = nombre.trim().toLowerCase();
    if (nombresVistos.has(norm)) return;
    nombresVistos.add(norm);

    lista.push({
      id: id || Date.now() + Math.random(),
      usuarioId: usuarioId || null,
      nombre: nombre.trim(),
      iniciales: obtenerIniciales(nombre),
      rol: rol || 'Colaborador técnico',
      escuela: escuela || 'TEC'
    });
  };

  // 1. Coordinador actual
  if (usuarioActual?.nombre) {
    const nomCoord = `${usuarioActual.nombre} ${usuarioActual.apellido1 || ''}`.trim();
    agregar(nomCoord, 'Persona coordinadora', usuarioActual.id, usuarioActual.id, usuarioActual.escuela || 'TEC');
  }

  // 2. Integrantes de la BD
  if (propData?.integrantes && Array.isArray(propData.integrantes)) {
    propData.integrantes.forEach((inte, i) => {
      agregar(
        inte.nombreCompleto, 
        inte.rolEquipoId === 1 ? 'Persona coordinadora' : 'Co-Investigador(a)',
        inte.integranteEquipoId || (i + 1),
        inte.usuarioId,
        'TEC'
      );
    });
  }

  // 3. Colaboradores externos de la BD
  if (propData?.colaboradoresExternos && Array.isArray(propData.colaboradoresExternos)) {
    propData.colaboradoresExternos.forEach((col, i) => {
      agregar(
        col.nombreCompleto,
        col.rolProyecto || 'Colaborador externo',
        col.colaboradorExternoId || ('ext_' + i),
        null,
        col.institucion || 'Externa'
      );
    });
  }

  // 4. Datos de Form-04 local si existen
  if (form04Data?.investigadoresTEC && Array.isArray(form04Data.investigadoresTEC)) {
    form04Data.investigadoresTEC.forEach((inv) => {
      if (inv.nombre) {
        agregar(inv.nombre, inv.rol || 'Co-Investigador(a)', inv.id, inv.usuarioId, inv.instancia || 'TEC');
      }
    });
  }

  if (form04Data?.colaboradoresExternos && Array.isArray(form04Data.colaboradoresExternos)) {
    form04Data.colaboradoresExternos.forEach((col) => {
      if (col.nombre) {
        agregar(col.nombre, 'Colaborador externo', col.id, null, col.institucion || 'Externa');
      }
    });
  }

  return lista;
};

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
  const [investigadoresBD, setInvestigadoresBD] = useState([]);
  const [tipoMiembroModal, setTipoMiembroModal] = useState('tec');
  const [errorModalIntegrante, setErrorModalIntegrante] = useState('');
  const [filtroBusquedaInvestigador, setFiltroBusquedaInvestigador] = useState('');

  // Plan de Acción y Matriz de Riesgos
  const [actividades, setActividades] = useState([]);
  const [objetivosEspecificos, setObjetivosEspecificos] = useState([]);
  const isInitialMountF5 = useRef(true);
  const lastSyncedActividadesF5 = useRef('');

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

      // 1. Cargar datos locales de Form-04 si existen
      let form04Data = null;
      try {
        const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
        if (rawF4) form04Data = JSON.parse(rawF4);
      } catch (_e) {}

      // 2. Cargar catálogos y propuesta desde BD
      try {
        const [prop, catalogos] = await Promise.all([
          propuestaService.obtenerPropuesta(id).catch(() => null),
          propuestaService.obtenerCatalogosFormulario().catch(() => null)
        ]);

        if (catalogos?.investigadores) {
          setInvestigadoresBD(catalogos.investigadores);
        }

        if (prop) {
          if (prop.titulo) setNombrePropuesta(prop.titulo);
          if (prop.modalidad) setTipoIniciativa(prop.modalidad);
        }

        if (form04Data?.objetivosEspecificos && Array.isArray(form04Data.objetivosEspecificos)) {
          setObjetivosEspecificos(form04Data.objetivosEspecificos.filter(Boolean));
        } else if (prop?.contenido?.objetivosEspecificos) {
          const objs = prop.contenido.objetivosEspecificos.split(';\n').filter(Boolean);
          if (objs.length > 0) setObjetivosEspecificos(objs);
        }

        const miembrosCompletos = construirIntegrantesDeEquipo(prop, form04Data, usuario);
        if (miembrosCompletos.length > 0) {
          setIntegrantes(miembrosCompletos);
        }
      } catch (_e) {}

      // 3. Cargar datos locales de Form-05 y sincronizar actividades con Form-04
      try {
        let actsCargadas = null;
        let l = null;
        const localRaw = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
        if (localRaw) {
          l = JSON.parse(localRaw);
          if (l.nombrePropuesta) setNombrePropuesta(l.nombrePropuesta);
          if (l.tipoIniciativa) setTipoIniciativa(l.tipoIniciativa);
          if (l.duracionMeses) setDuracionMeses(l.duracionMeses);
          if (l.actividades && l.actividades.length > 0) actsCargadas = l.actividades;
          if (l.integrantes && l.integrantes.length > 0) {
            setIntegrantes(prev => {
              const mapa = new Map();
              prev.forEach(m => mapa.set((m.nombre || '').toLowerCase().trim(), m));
              l.integrantes.forEach(m => {
                const k = (m.nombre || '').toLowerCase().trim();
                if (!mapa.has(k)) mapa.set(k, m);
              });
              return Array.from(mapa.values());
            });
          }
          setGuardadoMsg('Borrador cargado');
        }

        // Si Form-04 tiene actividades guardadas, comparar fechas para usar la versión más reciente
        if (form04Data?.actividadesCronograma && Array.isArray(form04Data.actividadesCronograma) && form04Data.actividadesCronograma.length > 0) {
          const f4Time = form04Data.fechaGuardado ? new Date(form04Data.fechaGuardado).getTime() : 0;
          const f5Time = l?.fechaGuardado ? new Date(l.fechaGuardado).getTime() : 0;
          if (!actsCargadas || f4Time >= f5Time) {
            actsCargadas = form04Data.actividadesCronograma;
          }
        }

        if (actsCargadas && actsCargadas.length > 0) {
          setActividades(actsCargadas);
          lastSyncedActividadesF5.current = JSON.stringify(actsCargadas);
        }
      } catch (_e) {}
    };
    cargarPropuestaBD().finally(() => {
      isInitialMountF5.current = false;
    });
  }, [propuestaIdUrl]);

  // Sincronización continua de la matriz con Form-04
  useEffect(() => {
    if (isInitialMountF5.current) return;
    const serialized = JSON.stringify(actividades);
    if (serialized === lastSyncedActividadesF5.current) return;
    lastSyncedActividadesF5.current = serialized;

    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (!id || id === 'undefined') return;

    try {
      const ahora = new Date().toISOString();
      // 1. Guardar en Form 05
      const rawF5 = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
      const f5Data = rawF5 ? JSON.parse(rawF5) : {};
      f5Data.actividades = actividades;
      f5Data.nombrePropuesta = nombrePropuesta || f5Data.nombrePropuesta;
      f5Data.tipoIniciativa = tipoIniciativa || f5Data.tipoIniciativa;
      f5Data.duracionMeses = duracionMeses || f5Data.duracionMeses;
      f5Data.integrantes = integrantes || f5Data.integrantes;
      f5Data.fechaGuardado = ahora;
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(f5Data));
      localStorage.setItem(`borrador_form05_${id}`, JSON.stringify(f5Data));

      // 2. Mantener sincronizado borrador de Form 04
      const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
      const f4Data = rawF4 ? JSON.parse(rawF4) : {};
      f4Data.actividadesCronograma = actividades;
      f4Data.fechaGuardado = ahora;
      localStorage.setItem(`borrador_form04_${id}`, JSON.stringify(f4Data));
      localStorage.setItem('borrador_form04_ultimo', JSON.stringify(f4Data));

      // 3. Emitir evento de sincronización para cualquier vista de Form 04
      window.dispatchEvent(new CustomEvent('sgpi_matrices_sync', {
        detail: { propuestaId: String(id), actividades: actividades, fuente: 'form05' }
      }));
    } catch (_e) {}
  }, [actividades, nombrePropuesta, tipoIniciativa, duracionMeses, integrantes]);

  // Escuchar sincronización de actividades provenientes de Form-04
  useEffect(() => {
    const handleSync = (e) => {
      const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
      if (!id || !e.detail || e.detail.fuente === 'form05') return;
      if (String(e.detail.propuestaId) === String(id) && Array.isArray(e.detail.actividades)) {
        const serialized = JSON.stringify(e.detail.actividades);
        if (serialized !== lastSyncedActividadesF5.current) {
          lastSyncedActividadesF5.current = serialized;
          setActividades(e.detail.actividades);
        }
      }
    };

    const handleStorage = (e) => {
      const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
      if (!id) return;
      if (e.key === `borrador_form04_${id}`) {
        try {
          const raw = localStorage.getItem(`borrador_form04_${id}`);
          if (raw) {
            const data = JSON.parse(raw);
            if (data.actividadesCronograma && Array.isArray(data.actividadesCronograma)) {
              const serialized = JSON.stringify(data.actividadesCronograma);
              if (serialized !== lastSyncedActividadesF5.current) {
                lastSyncedActividadesF5.current = serialized;
                setActividades(data.actividadesCronograma);
              }
            }
          }
        } catch (_e) {}
      }
    };

    window.addEventListener('sgpi_matrices_sync', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('sgpi_matrices_sync', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
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
        const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
        const f4Data = rawF4 ? JSON.parse(rawF4) : {};
        f4Data.actividadesCronograma = dataToSave.actividades;
        f4Data.fechaGuardado = dataToSave.fechaGuardado;
        localStorage.setItem(`borrador_form04_${id}`, JSON.stringify(f4Data));
        localStorage.setItem('borrador_form04_ultimo', JSON.stringify(f4Data));
      } catch (_e) {}
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
      try {
        const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
        const f4Data = rawF4 ? JSON.parse(rawF4) : {};
        f4Data.actividadesCronograma = dataToSave.actividades;
        f4Data.fechaGuardado = dataToSave.fechaGuardado;
        localStorage.setItem(`borrador_form04_${id}`, JSON.stringify(f4Data));
        localStorage.setItem('borrador_form04_ultimo', JSON.stringify(f4Data));
      } catch (_e) {}
    }
    window.dispatchEvent(new Event('propuestaCreada'));
    alert('¡Plan de Acción y Gestión del Riesgo guardado exitosamente!');
    setGuardando(false);
    navigate('/dashboard/propuestas');
  };

  const handleAgregarIntegrante = async (e) => {
    e.preventDefault();
    setErrorModalIntegrante('');

    let nombreFinal = '';
    let usuarioIdFinal = null;
    let rolFinal = nuevoIntegrante.rol || 'Co-Investigador(a)';
    let inicialesFinal = nuevoIntegrante.iniciales || '';
    let escuelaFinal = 'TEC';

    if (tipoMiembroModal === 'tec') {
      if (!nuevoIntegrante.usuarioId) {
        setErrorModalIntegrante('Por favor seleccione un investigador registrado en la base de datos institucional.');
        return;
      }
      usuarioIdFinal = nuevoIntegrante.usuarioId;
      nombreFinal = nuevoIntegrante.nombre;
      escuelaFinal = nuevoIntegrante.escuela || 'TEC';
    } else {
      if (!nuevoIntegrante.nombre.trim()) {
        setErrorModalIntegrante('Por favor ingrese el nombre completo del colaborador externo.');
        return;
      }
      nombreFinal = nuevoIntegrante.nombre.trim();
      escuelaFinal = nuevoIntegrante.institucion || 'Externa';
    }

    if (!inicialesFinal) {
      inicialesFinal = obtenerIniciales(nombreFinal);
    }

    // Verificar si ya existe en la lista de integrantes
    const yaExiste = integrantes.some(m => 
      (usuarioIdFinal && m.usuarioId === usuarioIdFinal) ||
      (m.nombre && m.nombre.toLowerCase().trim() === nombreFinal.toLowerCase().trim())
    );

    if (yaExiste) {
      setErrorModalIntegrante('Esta persona ya se encuentra incorporada en el equipo.');
      return;
    }

    const nuevo = {
      id: usuarioIdFinal || Date.now(),
      usuarioId: usuarioIdFinal,
      nombre: nombreFinal,
      iniciales: inicialesFinal,
      rol: rolFinal,
      escuela: escuelaFinal
    };

    const nuevaLista = [...integrantes, nuevo];
    setIntegrantes(nuevaLista);

    // Persistir en backend si existe id de propuesta
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (id) {
      try {
        const payload = {
          integrantes: nuevaLista.filter(m => m.usuarioId).map(m => ({
            usuarioId: m.usuarioId,
            tipoHoraId: 1,
            horasSemanales: 10.0,
            rolEquipoId: (m.rol || '').toLowerCase().includes('coordinad') ? 1 : (m.rol || '').toLowerCase().includes('asistente') ? 3 : 2,
            orcid: null
          })),
          colaboradoresExternos: nuevaLista.filter(m => !m.usuarioId && m.id !== 1).map(m => ({
            nombreCompleto: m.nombre,
            institucion: m.escuela || 'Institución Externa',
            rolProyecto: m.rol,
            correoElectronico: null
          }))
        };
        await propuestaService.guardarEquipoCompleto(id, payload);
      } catch (err) {
        console.warn('Error al sincronizar integrante con BD desde Form-05:', err);
      }
    }

    setMostrarModalNuevoIntegrante(false);
    setErrorModalIntegrante('');
    setFiltroBusquedaInvestigador('');
    setNuevoIntegrante({ usuarioId: null, nombre: '', iniciales: '', rol: 'Co-Investigador(a)', escuela: 'TEC', institucion: '' });
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
            <button type="button" className="btn-nueva-propuesta" style={{ padding: "6px 16px", fontSize: "13px" }} onClick={() => { setMostrarModalNuevoIntegrante(true); setErrorModalIntegrante(""); }}>+ Añadir Miembro</button>
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
          <div style={{ marginBottom: "12px" }}><h2 className="section-title-h2" style={{ margin: 0 }}>3. Plan de Acción y Matriz de Riesgos</h2></div>
          <div className="table-responsive-container" style={{ overflowX: 'auto' }}>
            <table className="institucional-data-table" style={{ minWidth: numAnios === 3 ? '2200px' : numAnios === 2 ? '1800px' : '1400px' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>OBJETIVO</th>
                  <th rowSpan={2} style={{ minWidth: '140px' }}>ACTIVIDADES</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>RESULTADO ESPERADO</th>
                  <th rowSpan={2} style={{ width: "130px", minWidth: "130px" }}>PARTICIPANTES</th>
                  <th rowSpan={2} style={{ width: '90px', minWidth: '90px' }}>RESPONSABILIDAD</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>RIESGOS IDENTIFICADOS</th>
                  <th rowSpan={2} style={{ minWidth: '120px' }}>MEDIDAS DE MITIGACIÓN</th>
                  <th rowSpan={2} style={{ width: "140px", minWidth: "140px" }}>RESPONSABLE DE GESTIÓN</th>
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
                      {objetivosEspecificos.length > 0 ? (
                        <select
                          value={act.objetivo || ''}
                          className="form-table-input"
                          style={{ background: '#ffffff', cursor: 'pointer', fontSize: '12px' }}
                          onChange={(e) => {
                            const copia = [...actividades];
                            copia[i].objetivo = e.target.value;
                            setActividades(copia);
                          }}
                        >
                          <option value="">— OE —</option>
                          {objetivosEspecificos.map((oe, idx) => {
                            const tLimpio = (oe || '').trim();
                            const clave = `OE ${idx + 1}`;
                            return (
                              <option key={idx} value={clave} title={`${clave}: ${tLimpio}`}>
                                {clave}
                              </option>
                            );
                          })}
                          {act.objetivo && !objetivosEspecificos.some((_, idx) => `OE ${idx + 1}` === act.objetivo) && (
                            <option value={act.objetivo}>{act.objetivo}</option>
                          )}
                        </select>
                      ) : (
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
                      )}
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
                          <option key={int.id} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>
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
                          <option key={int.id} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>
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
                              aria-label={`Actividad ${i + 1}, Año ${a + 1}, Mes ${m + 1}`}
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
                        aria-label={`Eliminar fila de actividad ${i + 1}`}
                      >
                        <span aria-hidden="true">✕</span>
                        <span className="sr-only">Eliminar fila</span>
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
            aria-label="Agregar nueva fila de actividad al cronograma"
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

      {/* Modal Añadir Miembro / Participante Mejorado */}
      {mostrarModalNuevoIntegrante && (() => {
        const filtradosBD = investigadoresBD.filter(u => {
          if (!filtroBusquedaInvestigador) return true;
          const q = filtroBusquedaInvestigador.toLowerCase();
          return (
            (u.nombreCompleto || '').toLowerCase().includes(q) ||
            (u.correo || '').toLowerCase().includes(q) ||
            (u.escuela || '').toLowerCase().includes(q)
          );
        });

        return (
          <div 
            className="crear-propuesta-modal-overlay" 
            onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }}
          >
            <div 
              className="crear-propuesta-modal-card" 
              style={{ 
                maxWidth: '580px', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0, 40, 85, 0.3), 0 0 0 1px rgba(0, 40, 85, 0.08)' 
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con gradiente institucional */}
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, #002855 0%, #0369a1 100%)', 
                  color: '#ffffff', 
                  padding: '18px 24px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: 'rgba(255, 255, 255, 0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                      + Añadir Miembro al Equipo
                    </h3>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                      Se incorporará al equipo y estará disponible para asignar en actividades y riesgos
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: 'none',
                    color: '#ffffff',
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '15px',
                    lineHeight: 1
                  }}
                  aria-label="Cerrar modal"
                >
                  ✕
                </button>
              </div>

              {/* Selector de Tipo de Integrante */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
                <button
                  type="button"
                  onClick={() => { setTipoMiembroModal('tec'); setErrorModalIntegrante(''); }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: tipoMiembroModal === 'tec' ? '2.5px solid #002855' : '2.5px solid transparent',
                    color: tipoMiembroModal === 'tec' ? '#002855' : '#64748b',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  🏫 Investigador TEC (Base de Datos)
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoMiembroModal('externo'); setErrorModalIntegrante(''); }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: tipoMiembroModal === 'externo' ? '2.5px solid #002855' : '2.5px solid transparent',
                    color: tipoMiembroModal === 'externo' ? '#002855' : '#64748b',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  🌐 Colaborador Externo
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleAgregarIntegrante} style={{ margin: 0 }}>
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {tipoMiembroModal === 'tec' ? (
                    <>
                      {/* Búsqueda rápida de investigador TEC */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>
                            Seleccionar Investigador TEC *
                          </label>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {filtradosBD.length} disponibles
                          </span>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                          <input
                            type="text"
                            placeholder="Filtrar por nombre, correo o escuela..."
                            value={filtroBusquedaInvestigador}
                            onChange={(e) => setFiltroBusquedaInvestigador(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px 8px 30px',
                              fontSize: '13px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              outline: 'none',
                              background: '#f8fafc',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}>🔍</span>
                        </div>

                        <select
                          className="modal-form-select"
                          value={nuevoIntegrante.usuarioId || ''}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '13px',
                            border: '1.5px solid ' + (nuevoIntegrante.usuarioId ? '#0369a1' : '#cbd5e1'),
                            borderRadius: '8px',
                            background: '#ffffff',
                            color: '#0f172a',
                            cursor: 'pointer',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          onChange={(e) => {
                            setErrorModalIntegrante('');
                            const uId = Number(e.target.value);
                            const sel = investigadoresBD.find(u => u.usuarioId === uId);
                            if (sel) {
                              setNuevoIntegrante({
                                ...nuevoIntegrante,
                                usuarioId: sel.usuarioId,
                                nombre: sel.nombreCompleto,
                                iniciales: obtenerIniciales(sel.nombreCompleto),
                                escuela: sel.escuela || 'TEC'
                              });
                            } else {
                              setNuevoIntegrante({
                                ...nuevoIntegrante,
                                usuarioId: null,
                                nombre: '',
                                iniciales: '',
                                escuela: 'TEC'
                              });
                            }
                          }}
                        >
                          <option value="">-- Seleccionar Investigador Registrado --</option>
                          {filtradosBD.map(u => (
                            <option key={u.usuarioId} value={u.usuarioId}>
                              {u.nombreCompleto} — {u.correo} ({u.escuela || 'TEC'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tarjeta de preview de usuario seleccionado */}
                      {nuevoIntegrante.usuarioId && nuevoIntegrante.nombre && (
                        <div style={{
                          padding: '12px 14px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#002855',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '15px',
                            flexShrink: 0
                          }}>
                            {nuevoIntegrante.iniciales || 'TEC'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                              {nuevoIntegrante.nombre}
                            </div>
                            <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                              ✓ Funcionario Verificado TEC — Instancia: {nuevoIntegrante.escuela}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Colaborador Externo */}
                      <div className="modal-form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>
                          Nombre Completo del Colaborador Externo *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Dra. Elena Morales Castillo"
                          className="form-text-input"
                          value={nuevoIntegrante.nombre}
                          onChange={(e) => setNuevoIntegrante({ 
                            ...nuevoIntegrante, 
                            nombre: e.target.value,
                            iniciales: obtenerIniciales(e.target.value)
                          })}
                          style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div className="modal-form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>
                          Institución o Empresa que Representa *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Ministerio de Salud / Universidad de Costa Rica"
                          className="form-text-input"
                          value={nuevoIntegrante.institucion}
                          onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, institucion: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Campos de Iniciales y Rol */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>
                        Iniciales *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="EMC"
                        className="form-text-input"
                        value={nuevoIntegrante.iniciales}
                        onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, iniciales: e.target.value.toUpperCase() })}
                        style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>
                        Rol en el Proyecto *
                      </label>
                      <select
                        className="modal-form-select"
                        value={nuevoIntegrante.rol}
                        onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, rol: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <option value="Co-Investigador(a)">Co-Investigador(a)</option>
                        <option value="Persona coordinadora">Persona coordinadora</option>
                        <option value="Investigador Asociado">Investigador Asociado</option>
                        <option value="Asistente TEC">Asistente TEC</option>
                        <option value="Colaborador técnico">Colaborador técnico</option>
                      </select>
                    </div>
                  </div>

                  {/* Alerta de error */}
                  {errorModalIntegrante && (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      color: '#b91c1c',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⚠️</span>
                      <span>{errorModalIntegrante}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: '16px 24px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button 
                    type="button" 
                    className="btn-proposal-action btn-outline"
                    onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }}
                    style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-nueva-propuesta"
                    style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>✓</span>
                    Guardar Integrante
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FormularioPlanRiesgos;
