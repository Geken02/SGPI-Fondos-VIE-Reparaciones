import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput } from '../components/LimitedInput';
import { exportarForm05Excel } from '../utils/exportUtils';
import IconoCie from '../components/cie/IconoCie';

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

  if (usuarioActual?.nombre) {
    const nomCoord = `${usuarioActual.nombre} ${usuarioActual.apellido1 || ''}`.trim();
    agregar(nomCoord, 'Persona coordinadora', usuarioActual.id, usuarioActual.id, usuarioActual.escuela || 'TEC');
  }

  if (propData?.integrantes && Array.isArray(propData.integrantes)) {
    propData.integrantes.forEach((inte, i) => {
      agregar(inte.nombreCompleto, inte.rolEquipoId === 1 ? 'Persona coordinadora' : 'Co-Investigador(a)', inte.integranteEquipoId || (i + 1), inte.usuarioId, 'TEC');
    });
  }

  if (propData?.colaboradoresExternos && Array.isArray(propData.colaboradoresExternos)) {
    propData.colaboradoresExternos.forEach((col, i) => {
      agregar(col.nombreCompleto, col.rolProyecto || 'Colaborador externo', col.colaboradorExternoId || ('ext_' + i), null, col.institucion || 'Externa');
    });
  }

  if (form04Data?.investigadoresTEC && Array.isArray(form04Data.investigadoresTEC)) {
    form04Data.investigadoresTEC.forEach((inv) => {
      if (inv.nombre) agregar(inv.nombre, inv.rol || 'Co-Investigador(a)', inv.id, inv.usuarioId, inv.instancia || 'TEC');
    });
  }

  if (form04Data?.colaboradoresExternos && Array.isArray(form04Data.colaboradoresExternos)) {
    form04Data.colaboradoresExternos.forEach((col) => {
      if (col.nombre) agregar(col.nombre, 'Colaborador externo', col.id, null, col.institucion || 'Externa');
    });
  }

  return lista;
};

const FormularioPlanRiesgos = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propuestaIdUrl = searchParams.get('propuestaId') || searchParams.get('id');

  const [nombrePropuesta, setNombrePropuesta] = useState('');
  const [tipoIniciativa, setTipoIniciativa] = useState('Investigación básica o aplicada');
  const [duracionMeses, setDuracionMeses] = useState('24 Meses');

  const [integrantes, setIntegrantes] = useState([]);
  const [nuevoIntegrante, setNuevoIntegrante] = useState({ nombre: '', iniciales: '', rol: 'Colaborador técnico' });
  const [mostrarModalNuevoIntegrante, setMostrarModalNuevoIntegrante] = useState(false);
  const [investigadoresBD, setInvestigadoresBD] = useState([]);
  const [tipoMiembroModal, setTipoMiembroModal] = useState('tec');
  const [errorModalIntegrante, setErrorModalIntegrante] = useState('');
  const [filtroBusquedaInvestigador, setFiltroBusquedaInvestigador] = useState('');

  const [actividades, setActividades] = useState([]);
  const [objetivosEspecificos, setObjetivosEspecificos] = useState([]);
  const [catalogosAux, setCatalogosAux] = useState({ tiposResponsabilidad: [], tiposHora: [], rolesEquipo: [] });
  
  const isInitialMountF5 = useRef(true);
  const lastSyncedActividadesF5 = useRef('');
  const autosavePlanTimer = useRef(null);
  const ultimoPlanGuardado = useRef('');

  const [guardadoMsg, setGuardadoMsg] = useState('Cargando datos...');
  const [guardando, setGuardando] = useState(false);

  const crearPeriodoVacio = () => {
    const periodo = {};
    for (let a = 1; a <= 3; a++) {
      periodo[`a${a}`] = {};
      for (let m = 1; m <= 12; m++) periodo[`a${a}`][`m${m}`] = false;
    }
    return periodo;
  };

  const actualizarPeriodoDesdeMeses = (act, mesIni, durMeses) => {
    const inicio = parseInt(mesIni, 10);
    const duracion = parseInt(durMeses, 10);
    if (isNaN(inicio) || inicio < 1) return;
    const dur = !isNaN(duracion) && duracion >= 1 ? duracion : 1;
    const fin = inicio + dur - 1;
    if (!act.periodoEjecucion) act.periodoEjecucion = crearPeriodoVacio();
    for (let a = 1; a <= 3; a++) {
      for (let m = 1; m <= 12; m++) {
        act.periodoEjecucion[`a${a}`][`m${m}`] = false;
      }
    }
    act.a1 = false; act.a2 = false; act.a3 = false;
    for (let mesAbs = inicio; mesAbs <= fin && mesAbs <= 36; mesAbs++) {
      const a = Math.floor((mesAbs - 1) / 12) + 1;
      const m = ((mesAbs - 1) % 12) + 1;
      if (a <= 3) {
        act.periodoEjecucion[`a${a}`][`m${m}`] = true;
        act[`a${a}`] = true;
      }
    }
  };

  const resolverTipoHoraId = useCallback(() => {
    const horas = catalogosAux.tiposHora || [];
    const vye = horas.find(h => (h.codigoTipo || '').toUpperCase() === 'VIE') || horas[0];
    return vye ? vye.tipoHoraId : 1;
  }, [catalogosAux.tiposHora]);

  const resolverRolEquipoId = useCallback((rolTexto) => {
    const roles = catalogosAux.rolesEquipo || [];
    const norm = (rolTexto || '').toLowerCase();
    const buscar = (kw) => roles.find(r => (r.nombreRol || '').toLowerCase().includes(kw));
    let rol;
    if (norm.includes('coordinad')) rol = buscar('coordin');
    else if (norm.includes('asistente')) rol = buscar('asistente') || buscar('investig') || buscar('co-investig');
    else rol = buscar('investig') || buscar('co-investig') || buscar('coordin');
    if (!rol) rol = roles[1] || roles[0];
    return rol ? rol.rolEquipoId : 1;
  }, [catalogosAux.rolesEquipo]);

  const resolverTipoResponsabilidadId = useCallback((texto) => {
    const tipos = catalogosAux.tiposResponsabilidad || [];
    const norm = (texto || '').trim().toLowerCase();
    if (!norm) return null;
    const exacto = tipos.find(t => (t.nombreTipoResponsabilidad || '').toLowerCase() === norm);
    if (exacto) return exacto.tipoResponsabilidadId;
    const alias = { colabora: 'participa', participar: 'participa', ejecuta: 'ejecuta', supervisa: 'supervisa', asesora: 'asesora' };
    const destino = alias[norm] || norm;
    const aprox = tipos.find(t => (t.nombreTipoResponsabilidad || '').toLowerCase().includes(destino));
    return aprox ? aprox.tipoResponsabilidadId : null;
  }, [catalogosAux.tiposResponsabilidad]);

  // ✅ CONSTRUIR PAYLOAD SEGURO
  const construirPayloadPlan = useCallback(() => {
    const objetivos = (objetivosEspecificos || [])
      .filter(desc => (desc || '').trim() !== '')
      .map((desc, idx) => ({
        numeroObjetivo: idx + 1,
        descripcion: (desc || '').trim()
      }));

    const buscarIntegrante = (iniciales) =>
      (integrantes || []).find(m => (m.iniciales || '').toUpperCase().trim() === (iniciales || '').toUpperCase().trim());

    const actividadesPayload = (actividades || []).map((act) => {
      let indice = null;
      const coincidencia = /OE\s*(\d+)/i.exec(act.objetivo || '');
      if (coincidencia) indice = Math.max(0, parseInt(coincidencia[1], 10) - 1);

      const participantes = [];
      const integrante = buscarIntegrante(act.participante);
      const tipoRespId = resolverTipoResponsabilidadId(act.responsabilidad);
      if (integrante?.usuarioId && tipoRespId) {
        participantes.push({ usuarioId: integrante.usuarioId, tipoResponsabilidadId: tipoRespId });
      }

      const responsable = buscarIntegrante(act.responsableGestion);
      const riesgos = [];
      if ((act.riesgo || '').trim()) {
        riesgos.push({
          descripcionRiesgo: act.riesgo.trim(),
          probabilidad: null,
          impacto: null,
          medidas: (act.mitigacion || '').trim()
            ? [{
                descripcionMedida: act.mitigacion.trim(),
                usuarioResponsableId: responsable?.usuarioId || null,
                esPermisoEtico: false
              }]
            : []
        });
      }

      return {
        objetivoEspecificoIndice: indice,
        descripcionActividad: (act.actividad || '').trim(),
        resultadoEsperado: (act.resultado || '').trim(),
        mesInicio: parseInt(act.mesInicio, 10) || 1,
        duracionMeses: parseFloat(act.duracionMesesAct) || 1,
        participantes,
        riesgos
      };
    }).filter(a =>
      a.descripcionActividad || a.resultadoEsperado || a.participantes.length > 0 || a.riesgos.length > 0
    );

    return { objetivosEspecificos: objetivos, actividades: actividadesPayload };
  }, [objetivosEspecificos, actividades, integrantes, resolverTipoResponsabilidadId]);

  useEffect(() => {
    if (usuario?.nombre && integrantes.length === 0) {
      const nombreCompleto = `${usuario.nombre} ${usuario.apellido1 || ''}`.trim();
      const inits = `${(usuario.nombre || '')[0] || ''}${(usuario.apellido1 || '')[0] || ''}`.toUpperCase();
      setIntegrantes([{ id: 1, nombre: nombreCompleto, iniciales: inits || 'IP', rol: 'Persona coordinadora' }]);
    }
  }, [usuario]);

  // ✅ CARGA INICIAL DE DATOS
  useEffect(() => {
    const cargarPropuestaBD = async () => {
      let id = propuestaIdUrl;
      if (!id) {
        id = localStorage.getItem('propuesta_activa_id');
        if (!id) {
          try {
            const misProps = await propuestaService.listarMisPropuestas();
            if (misProps && misProps.length > 0) {
              id = String(misProps[0].propuestaId);
              localStorage.setItem('propuesta_activa_id', id);
            }
          } catch (_e) {}
        }
        if (id) navigate(`/dashboard/form5?propuestaId=${id}`, { replace: true });
      }

      if (!id) return;
      localStorage.setItem('propuesta_activa_id', String(id));
      setGuardadoMsg('Cargando datos...');

      let form04Data = null;
      let actsDesdeBD = null;
      try {
        const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
        if (rawF4) form04Data = JSON.parse(rawF4);
      } catch (_e) {}

      try {
        const [prop, catalogos] = await Promise.all([
          propuestaService.obtenerPropuesta(id).catch(() => null),
          propuestaService.obtenerCatalogosFormulario().catch(() => null)
        ]);

        const tiposRespCatalogo = catalogos?.tiposResponsabilidad || [];
        if (catalogos) {
          setInvestigadoresBD(catalogos.investigadores || []);
          setCatalogosAux({
            tiposResponsabilidad: catalogos.tiposResponsabilidad || [],
            tiposHora: catalogos.tiposHora || [],
            rolesEquipo: catalogos.rolesEquipo || []
          });
        }
        if (prop) {
          if (prop.titulo) setNombrePropuesta(prop.titulo);
          if (prop.modalidad) setTipoIniciativa(prop.modalidad);
        }

        // 1. Cargar Objetivos (Prioridad: Form04 Local > BD Contenido > BD PlanAccion)
        if (form04Data?.objetivosEspecificos && Array.isArray(form04Data.objetivosEspecificos)) {
          setObjetivosEspecificos(form04Data.objetivosEspecificos.filter(Boolean));
        } else if (prop?.contenido?.objetivosEspecificos) {
          const objs = prop.contenido.objetivosEspecificos.split(';\n').filter(Boolean);
          if (objs.length > 0) setObjetivosEspecificos(objs);
        } else if (prop?.planAccion?.objetivosEspecificos?.length > 0) {
          setObjetivosEspecificos(prop.planAccion.objetivosEspecificos.map(o => o.descripcion || ''));
        }

        const miembrosCompletos = construirIntegrantesDeEquipo(prop, form04Data, usuario);
        if (miembrosCompletos.length > 0) setIntegrantes(miembrosCompletos);

        // 2. Cargar Actividades desde la BD
        if (prop?.planAccion?.actividades?.length > 0) {
          const idxObjetivo = new Map(
            (prop.planAccion.objetivosEspecificos || []).map((o, i) => [o.objetivoEspecificoId, i])
          );
          const tipoRespPorId = new Map(
            tiposRespCatalogo.map(t => [t.tipoResponsabilidadId, t.nombreTipoResponsabilidad])
          );
          const inicialesPorUsuario = new Map();
          miembrosCompletos.forEach(m => { if (m.usuarioId) inicialesPorUsuario.set(m.usuarioId, m.iniciales); });

          actsDesdeBD = prop.planAccion.actividades.map((a, i) => {
            const riesgo = (a.riesgos && a.riesgos[0]) || null;
            const medida = (riesgo?.medidas && riesgo.medidas[0]) || null;
            const participante = (a.participantes && a.participantes[0]) || null;
            const act = {
              id: a.actividadId || Date.now() + i,
              objetivo: idxObjetivo.has(a.objetivoEspecificoId) ? `OE ${idxObjetivo.get(a.objetivoEspecificoId) + 1}` : '',
              actividad: a.descripcionActividad || '',
              resultado: a.resultadoEsperado || '',
              participante: participante ? (inicialesPorUsuario.get(participante.usuarioId) || '') : '',
              responsabilidad: participante ? (tipoRespPorId.get(participante.tipoResponsabilidadId) || '') : '',
              riesgo: riesgo ? (riesgo.descripcionRiesgo || '') : '',
              mitigacion: medida ? (medida.descripcionMedida || '') : '',
              responsableGestion: medida ? (inicialesPorUsuario.get(medida.usuarioResponsableId) || '') : '',
              mesInicio: a.mesInicio || '',
              duracionMesesAct: a.duracionMeses || '',
              periodoEjecucion: crearPeriodoVacio()
            };
            actualizarPeriodoDesdeMeses(act, a.mesInicio, a.duracionMeses);
            return act;
          });
        }
      } catch (_e) {
        console.error("Error cargando propuesta:", _e);
      }

      // 3. Fusionar con LocalStorage (si es más reciente)
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
        }

        if (form04Data?.actividadesCronograma && Array.isArray(form04Data.actividadesCronograma) && form04Data.actividadesCronograma.length > 0) {
          const f4Time = form04Data.fechaGuardado ? new Date(form04Data.fechaGuardado).getTime() : 0;
          const f5Time = l?.fechaGuardado ? new Date(l.fechaGuardado).getTime() : 0;
          if (!actsCargadas || f4Time >= f5Time) actsCargadas = form04Data.actividadesCronograma;
        }

        if ((!actsCargadas || actsCargadas.length === 0) && actsDesdeBD && actsDesdeBD.length > 0) {
          actsCargadas = actsDesdeBD;
        }

        if (actsCargadas && actsCargadas.length > 0) {
          setActividades(actsCargadas);
          lastSyncedActividadesF5.current = JSON.stringify(actsCargadas);
        }
      } catch (_e) {}

      setGuardadoMsg('Listo para editar');
      isInitialMountF5.current = false;
    };
    
    cargarPropuestaBD();
  }, [propuestaIdUrl]);

  // ✅ AUTOGUARDADO LOCAL (LocalStorage)
  useEffect(() => {
    if (isInitialMountF5.current) return;
    const serialized = JSON.stringify(actividades);
    if (serialized === lastSyncedActividadesF5.current) return;
    lastSyncedActividadesF5.current = serialized;

    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (!id || id === 'undefined') return;

    try {
      const ahora = new Date().toISOString();
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

      const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
      const f4Data = rawF4 ? JSON.parse(rawF4) : {};
      f4Data.actividadesCronograma = actividades;
      f4Data.fechaGuardado = ahora;
      localStorage.setItem(`borrador_form04_${id}`, JSON.stringify(f4Data));
      localStorage.setItem('borrador_form04_ultimo', JSON.stringify(f4Data));

      window.dispatchEvent(new CustomEvent('sgpi_matrices_sync', { detail: { propuestaId: String(id), actividades: actividades, fuente: 'form05' } }));
    } catch (_e) {}
  }, [actividades, nombrePropuesta, tipoIniciativa, duracionMeses, integrantes]);

  // ✅ AUTOGUARDADO EN BASE DE DATOS (Blindado contra payloads vacíos)
  useEffect(() => {
    if (isInitialMountF5.current) return;
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (!id || id === 'undefined') return;

    // 🛡️ GUARDIA CRÍTICA: No enviar nada si no hay datos (evita borrar la BD en el primer render)
    if (actividades.length === 0 && objetivosEspecificos.length === 0) return;

    const payload = construirPayloadPlan();
    const serializado = JSON.stringify(payload);
    if (serializado === ultimoPlanGuardado.current) return;

    if (autosavePlanTimer.current) clearTimeout(autosavePlanTimer.current);
    autosavePlanTimer.current = setTimeout(async () => {
      try {
        setGuardadoMsg('Guardando en la nube...');
        await propuestaService.guardarPlanAccion(id, payload);
        ultimoPlanGuardado.current = serializado;
        setGuardadoMsg('Autoguardado en la nube');
      } catch (err) {
        console.warn('Error en autoguardado del Plan de Acción:', err);
        setGuardadoMsg('Error al autoguardar');
      }
    }, 1500);

    return () => { if (autosavePlanTimer.current) clearTimeout(autosavePlanTimer.current); };
  }, [actividades, objetivosEspecificos, integrantes, propuestaIdUrl, construirPayloadPlan]);

  // Sincronización entre pestañas
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
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    const dataToSave = { nombrePropuesta, tipoIniciativa, duracionMeses, integrantes, actividades, fechaGuardado: new Date().toISOString() };

    if (id) {
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(dataToSave));
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
        await propuestaService.actualizarCabecera(id, { titulo: nombrePropuesta || 'Iniciativa de Investigación' });

        try {
          const payloadPlan = construirPayloadPlan();
          await propuestaService.guardarPlanAccion(id, payloadPlan);
          ultimoPlanGuardado.current = JSON.stringify(payloadPlan);
          setGuardadoMsg('Guardado en la nube');
        } catch (err) {
          console.warn('⚠️ No se pudo guardar el Plan de Acción en la BD:', err);
          setGuardadoMsg('Error al guardar en la nube');
        }

        try {
          const { generarBlobForm05Excel, subirBlobASupabase } = await import('../utils/exportUtils');
          const blob = await generarBlobForm05Excel(dataToSave, id);
          if (blob && blob.size > 0) {
            await subirBlobASupabase(propuestaService, id, 2, blob, `Form05_${id}.xlsx`);
          }
        } catch (err) {
          console.warn('⚠️ No se pudo subir Form-05 a Supabase:', err);
        }

      } catch (_e) {}
    }
    localStorage.setItem('propuesta_plan_riesgos_ultimo', JSON.stringify(dataToSave));
    window.dispatchEvent(new Event('propuestaCreada'));
    setGuardando(false);
    alert('¡Borrador del Plan de Acción y Gestión del Riesgo (Form-05) guardado con éxito!');
  };

  const handleEnviarPlan = async () => {
    setGuardando(true);
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    const dataToSave = { nombrePropuesta, tipoIniciativa, duracionMeses, integrantes, actividades, fechaGuardado: new Date().toISOString() };

    if (id) {
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(dataToSave));
      localStorage.setItem(`borrador_form05_${id}`, JSON.stringify(dataToSave));
      localStorage.setItem(`propuesta_${id}_form05_enviado`, 'true');
      
      try {
        const { generarBlobForm05Excel, subirBlobASupabase } = await import('../utils/exportUtils');
        const blob = await generarBlobForm05Excel(dataToSave, id);
        if (blob && blob.size > 0) {
          await subirBlobASupabase(propuestaService, id, 2, blob, `Form05_${id}.xlsx`);
        }
      } catch (err) {
        console.warn('⚠️ No se pudo subir Form-05 a Supabase al enviar:', err);
      }

      try {
        const payloadPlan = construirPayloadPlan();
        await propuestaService.guardarPlanAccion(id, payloadPlan);
        ultimoPlanGuardado.current = JSON.stringify(payloadPlan);
      } catch (err) {
        console.warn('⚠️ No se pudo guardar el Plan de Acción al enviar:', err);
        alert('No se pudo persistir el Plan de Acción (Form-05) en la base de datos. Intente nuevamente antes de continuar.');
        setGuardando(false);
        return;
      }
    }
    window.dispatchEvent(new Event('propuestaCreada'));
    alert('¡Plan de Acción y Gestión del Riesgo guardado y enviado exitosamente!');
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

    if (!inicialesFinal) inicialesFinal = obtenerIniciales(nombreFinal);

    const yaExiste = integrantes.some(m => 
      (usuarioIdFinal && m.usuarioId === usuarioIdFinal) ||
      (m.nombre && m.nombre.toLowerCase().trim() === nombreFinal.toLowerCase().trim())
    );

    if (yaExiste) {
      setErrorModalIntegrante('Esta persona ya se encuentra incorporada en el equipo.');
      return;
    }

    const nuevo = { id: usuarioIdFinal || Date.now(), usuarioId: usuarioIdFinal, nombre: nombreFinal, iniciales: inicialesFinal, rol: rolFinal, escuela: escuelaFinal };
    const nuevaLista = [...integrantes, nuevo];
    setIntegrantes(nuevaLista);

    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (id) {
      try {
        const tipoHoraId = resolverTipoHoraId();
        const payload = {
          integrantes: nuevaLista.filter(m => m.usuarioId).map(m => ({
            usuarioId: m.usuarioId,
            tipoHoraId,
            horasSemanales: 10.0,
            rolEquipoId: resolverRolEquipoId(m.rol),
            orcid: null
          })),
          colaboradoresExternos: nuevaLista.filter(m => !m.usuarioId && m.id !== 1).map(m => {
            const partes = (m.nombre || '').trim().split(/\s+/).filter(Boolean);
            return {
              nombreColaborador: partes[0] || (m.nombre || '').trim(),
              apellido1Colaborador: partes[1] || null,
              apellido2Colaborador: partes.length > 2 ? partes.slice(2).join(' ') : null,
              idOrcid: null,
              institucionEmpresa: m.escuela || 'Institución Externa'
            };
          })
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
    const nueva = { id: Date.now(), objetivo: '', actividad: '', resultado: '', participante: '', responsabilidad: '', riesgo: '', mitigacion: '', responsableGestion: '', mesInicio: '', duracionMesesAct: '', periodoEjecucion: crearPeriodoVacio() };
    setActividades([...actividades, nueva]);
  };

  const handleEliminarActividad = (id) => {
    if (!confirm('¿Está seguro de que desea eliminar esta actividad?')) return;
    setActividades(actividades.filter(a => a.id !== id));
  };

  const handleTogglePeriodo = (actIndex, anio, mes) => {
    const copia = [...actividades];
    const key = `a${anio}`;
    const mKey = `m${mes}`;
    if (!copia[actIndex].periodoEjecucion) copia[actIndex].periodoEjecucion = crearPeriodoVacio();
    if (!copia[actIndex].periodoEjecucion[key]) copia[actIndex].periodoEjecucion[key] = {};
    copia[actIndex].periodoEjecucion[key][mKey] = !copia[actIndex].periodoEjecucion[key][mKey];
    setActividades(copia);
  };

  const numAnios = duracionMeses === '12 Meses' ? 1 : duracionMeses === '24 Meses' ? 2 : 3;

  return (
    <div className="formulario-proyecto-master-wrapper">
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
        <h1 className="step-main-title" style={{ fontSize: '24px', marginBottom: '24px' }}>Plan de Acción y Gestión del Riesgo de una Iniciativa de Investigación</h1>

        <div className="form-section-box">
          <h2 className="section-title-h2">1. Encabezado de la Propuesta</h2>
          <div className="form-three-cols-grid">
            <div className="form-group-block" style={{ flex: 2 }}>
              <LimitedInput label="Nombre de la propuesta" required type="text" className="form-text-input" value={nombrePropuesta} onChange={(e) => setNombrePropuesta(e.target.value)} maxLength={300} />
            </div>
            <div className="form-group-block">
              <label className="form-field-label">Tipo de iniciativa *</label>
              <select className="form-text-input" value={tipoIniciativa} onChange={(e) => setTipoIniciativa(e.target.value)}>
                <option value="Investigación básica o aplicada">Investigación básica o aplicada</option>
                <option value="Desarrollo tecnológico">Desarrollo tecnológico</option>
                <option value="Iniciativa de vinculación">Iniciativa de vinculación</option>
              </select>
            </div>
            <div className="form-group-block">
              <label className="form-field-label">Duración (Meses) *</label>
              <select className="form-text-input" value={duracionMeses} onChange={(e) => setDuracionMeses(e.target.value)}>
                <option value="12 Meses">12 Meses</option>
                <option value="24 Meses">24 Meses</option>
                <option value="36 Meses">36 Meses</option>
              </select>
            </div>
          </div>
        </div>

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
                    <td><span className="propuesta-codigo-pill" >{int.iniciales}</span></td>
                    <td>{int.rol}</td>
                    <td style={{ textAlign: 'center' }}>
                      {i > 0 && (
                        <button type="button" className="btn-icon-action btn-icon-delete" onClick={() => setIntegrantes(integrantes.filter(item => item.id !== int.id))} title="Remover participante"><IconoCie nombre="trash" tamano={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>MES DE INICIO</th>
                  <th rowSpan={2} style={{ width: '70px', minWidth: '70px' }}>DURACIÓN (MESES)</th>
                  {Array.from({ length: numAnios }, (_, a) => (<th key={`anio-${a+1}`} colSpan={12} style={{ textAlign: 'center' }}>{`AÑO ${a + 1}`}</th>))}
                  <th rowSpan={2} style={{ width: '40px', textAlign: 'center' }}></th>
                </tr>
                <tr>
                  {Array.from({ length: numAnios }, (_, a) => Array.from({ length: 12 }, (_, m) => (<th key={`a${a+1}-m${m+1}`} style={{ width: '28px', minWidth: '28px', textAlign: 'center', fontSize: '10px', padding: '2px' }}>{m + 1}</th>)))}
                </tr>
              </thead>
              <tbody>
                {actividades.length === 0 ? (
                  <tr><td colSpan={11 + numAnios * 12} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>No hay actividades registradas aún en el cronograma. Haz clic en <strong>+ Agregar Actividad al Cronograma</strong> para comenzar.</td></tr>
                ) : (
                  actividades.map((act, i) => (
                  <tr key={act.id}>
                    <td>
                      {objetivosEspecificos.length > 0 ? (
                        <select value={act.objetivo || ''} className="form-table-input" style={{ cursor: 'pointer', fontSize: '12px' }} onChange={(e) => { const copia = [...actividades]; copia[i].objetivo = e.target.value; setActividades(copia); }}>
                          <option value="">— OE —</option>
                          {objetivosEspecificos.map((oe, idx) => {
                            const tLimpio = (oe || '').trim();
                            if (!tLimpio) return null;
                            const clave = `OE ${idx + 1}`;
                            return <option key={idx} value={clave} title={`${clave}: ${tLimpio}`}>{clave}</option>;
                          })}
                          {act.objetivo && !objetivosEspecificos.some((_, idx) => `OE ${idx + 1}` === act.objetivo) && (<option value={act.objetivo}>{act.objetivo}</option>)}
                        </select>
                      ) : (
                        <LimitedInput value={act.objetivo} maxLength={20} showCounter={false} className="form-table-input" onChange={(e) => { const copia = [...actividades]; copia[i].objetivo = e.target.value; setActividades(copia); }} />
                      )}
                    </td>
                    <td><LimitedInput value={act.actividad} maxLength={500} showCounter={false} className="form-table-input" onChange={(e) => { const copia = [...actividades]; copia[i].actividad = e.target.value; setActividades(copia); }} /></td>
                    <td><LimitedInput value={act.resultado} maxLength={500} showCounter={false} className="form-table-input" onChange={(e) => { const copia = [...actividades]; copia[i].resultado = e.target.value; setActividades(copia); }} /></td>
                    <td>
                      <select className="form-table-input" value={act.participante} onChange={(e) => { const copia = [...actividades]; copia[i].participante = e.target.value; setActividades(copia); }}>
                        <option value="">—</option>
                        {integrantes.map(int => (<option key={int.id} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>))}
                      </select>
                    </td>
                    <td>
                      <select className="form-table-input" value={act.responsabilidad} onChange={(e) => { const copia = [...actividades]; copia[i].responsabilidad = e.target.value; setActividades(copia); }}>
                        <option value="">—</option>
                        {(catalogosAux.tiposResponsabilidad.length > 0
                          ? catalogosAux.tiposResponsabilidad.map(t => t.nombreTipoResponsabilidad)
                          : ['Ejecuta', 'Supervisa', 'Participa', 'Asesora']
                        ).map((opcion) => (
                          <option key={opcion} value={opcion}>{opcion}</option>
                        ))}
                      </select>
                    </td>
                    <td><LimitedInput value={act.riesgo} maxLength={500} showCounter={false} className="form-table-input" onChange={(e) => { const copia = [...actividades]; copia[i].riesgo = e.target.value; setActividades(copia); }} /></td>
                    <td><LimitedInput value={act.mitigacion} maxLength={500} showCounter={false} className="form-table-input" onChange={(e) => { const copia = [...actividades]; copia[i].mitigacion = e.target.value; setActividades(copia); }} /></td>
                    <td>
                      <select className="form-table-input" value={act.responsableGestion} onChange={(e) => { const copia = [...actividades]; copia[i].responsableGestion = e.target.value; setActividades(copia); }}>
                        <option value="">—</option>
                        {integrantes.map(int => (<option key={int.id} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>))}
                      </select>
                    </td>
                    <td><input type="number" min="1" max="36" className="form-table-input" style={{ width: '50px', textAlign: 'center' }} value={act.mesInicio || ''} onChange={(e) => { const copia = [...actividades]; copia[i].mesInicio = e.target.value; actualizarPeriodoDesdeMeses(copia[i], e.target.value, copia[i].duracionMesesAct); setActividades(copia); }} /></td>
                    <td><input type="number" min="1" max="36" className="form-table-input" style={{ width: '50px', textAlign: 'center' }} value={act.duracionMesesAct || ''} onChange={(e) => { const copia = [...actividades]; copia[i].duracionMesesAct = e.target.value; actualizarPeriodoDesdeMeses(copia[i], copia[i].mesInicio, e.target.value); setActividades(copia); }} /></td>
                    {Array.from({ length: numAnios }, (_, a) => Array.from({ length: 12 }, (_, m) => {
                      const checked = act.periodoEjecucion?.[`a${a+1}`]?.[`m${m+1}`] || false;
                      return (<td key={`${act.id}-a${a+1}-m${m+1}`} style={{ textAlign: 'center', padding: '1px' }}><input type="checkbox" checked={checked} aria-label={`Actividad ${i + 1}, Año ${a + 1}, Mes ${m + 1}`} onChange={() => handleTogglePeriodo(i, a + 1, m + 1)} style={{ cursor: 'pointer', width: '14px', height: '14px' }} /></td>);
                    }))}
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" className="btn-icon-action btn-icon-delete" onClick={() => handleEliminarActividad(act.id)} title="Eliminar fila" aria-label={`Eliminar fila de actividad ${i + 1}`}><span aria-hidden="true"><IconoCie nombre="close" tamano={14} /></span><span className="sr-only">Eliminar fila</span></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
          <button type="button" className="btn-add-table-row" aria-label="Agregar nueva fila de actividad al cronograma" onClick={handleAgregarFilaActividad}>+ Agregar Actividad</button>
        </div>

        <div className="vie-reminder-box">
          <span className="reminder-icon"><IconoCie nombre="check" tamano={14} /></span>
          <div className="reminder-text"><strong>Recordatorio VIE:</strong> Dentro de la programación de actividades se deben incluir obligatoriamente las giras de campo y los informes de avance. Además, deberá registrarse cualquier pasantía nacional o internacional que se requiera para el desarrollo del proyecto.</div>
        </div>

        <div className="form-footer-action-bar">
          <div className="footer-left">
            <button type="button" className="btn-form-nav btn-outline" onClick={() => { const idProp = propuestaIdUrl || localStorage.getItem('propuesta_activa_id') || ''; exportarForm05Excel({ nombrePropuesta, tipoIniciativa, duracionMeses, integrantes, actividades }, idProp ? `Propuesta-${idProp}` : 'Form05'); }}><IconoCie nombre="download" tamano={14} /> Descargar Excel</button>
          </div>
          <div className="footer-center">
            <button type="button" className="btn-form-nav btn-outline" onClick={handleGuardarBorrador} disabled={guardando}>Guardar Borrador</button>
          </div>
          <div className="footer-right">
            <button type="button" className="btn-form-nav btn-primary" onClick={handleEnviarPlan} disabled={guardando}>Enviar Plan</button>
          </div>
        </div>
      </div>

      {mostrarModalNuevoIntegrante && (() => {
        const filtradosBD = investigadoresBD.filter(u => {
          if (!filtroBusquedaInvestigador) return true;
          const q = filtroBusquedaInvestigador.toLowerCase();
          return (u.nombreCompleto || '').toLowerCase().includes(q) || (u.correo || '').toLowerCase().includes(q) || (u.escuela || '').toLowerCase().includes(q);
        });

        return (
          <div className="crear-propuesta-modal-overlay" onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }}>
            <div className="crear-propuesta-modal-card" style={{ maxWidth: '580px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 40, 85, 0.3), 0 0 0 1px rgba(0, 40, 85, 0.08)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ background: 'linear-gradient(135deg, #002855 0%, #0369a1 100%)', color: '#ffffff', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                  </div>
                  <div><h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>+ Añadir Miembro al Equipo</h3><div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>Se incorporará al equipo y estará disponible para asignar en actividades y riesgos</div></div>
                </div>
                <button type="button" onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }} style={{ background: 'rgba(255, 255, 255, 0.12)', border: 'none', color: '#ffffff', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '15px', lineHeight: 1 }} aria-label="Cerrar modal"><IconoCie nombre="close" tamano={14} /></button>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 24px' }}>
                <button type="button" onClick={() => { setTipoMiembroModal('tec'); setErrorModalIntegrante(''); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, border: 'none', borderBottom: tipoMiembroModal === 'tec' ? '2.5px solid #002855' : '2.5px solid transparent', color: tipoMiembroModal === 'tec' ? '#002855' : '#64748b', background: 'transparent', cursor: 'pointer' }}><IconoCie nombre="escuela" tamano={14} /> Investigador TEC (Base de Datos)</button>
                <button type="button" onClick={() => { setTipoMiembroModal('externo'); setErrorModalIntegrante(''); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, border: 'none', borderBottom: tipoMiembroModal === 'externo' ? '2.5px solid #002855' : '2.5px solid transparent', color: tipoMiembroModal === 'externo' ? '#002855' : '#64748b', background: 'transparent', cursor: 'pointer' }}><IconoCie nombre="link" tamano={14} /> Colaborador Externo</button>
              </div>

              <form onSubmit={handleAgregarIntegrante} style={{ margin: 0 }}>
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {tipoMiembroModal === 'tec' ? (
                    <>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>Seleccionar Investigador TEC *</label>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{filtradosBD.length} disponibles</span>
                        </div>
                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                          <input type="text" placeholder="Filtrar por nombre, correo o escuela..." value={filtroBusquedaInvestigador} onChange={(e) => setFiltroBusquedaInvestigador(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 30px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}><IconoCie nombre="search" tamano={12} /></span>
                        </div>
                        <select className="modal-form-select" value={nuevoIntegrante.usuarioId || ''} required style={{ width: '100%', padding: '10px 12px', fontSize: '13px', border: '1.5px solid ' + (nuevoIntegrante.usuarioId ? '#0369a1' : '#cbd5e1'), borderRadius: '8px', background: '#ffffff', color: '#0f172a', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }} onChange={(e) => {
                          setErrorModalIntegrante('');
                          const uId = Number(e.target.value);
                          const sel = investigadoresBD.find(u => u.usuarioId === uId);
                          if (sel) setNuevoIntegrante({ ...nuevoIntegrante, usuarioId: sel.usuarioId, nombre: sel.nombreCompleto, iniciales: obtenerIniciales(sel.nombreCompleto), escuela: sel.escuela || 'TEC' });
                          else setNuevoIntegrante({ ...nuevoIntegrante, usuarioId: null, nombre: '', iniciales: '', escuela: 'TEC' });
                        }}>
                          <option value="">-- Seleccionar Investigador Registrado --</option>
                          {filtradosBD.map(u => (<option key={u.usuarioId} value={u.usuarioId}>{u.nombreCompleto} — {u.correo} ({u.escuela || 'TEC'})</option>))}
                        </select>
                      </div>
                      {nuevoIntegrante.usuarioId && nuevoIntegrante.nombre && (
                        <div style={{ padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#002855', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>{nuevoIntegrante.iniciales || 'TEC'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{nuevoIntegrante.nombre}</div><div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}><IconoCie nombre="check" tamano={12} /> Funcionario Verificado TEC — Instancia: {nuevoIntegrante.escuela}</div></div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="modal-form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>Nombre Completo del Colaborador Externo *</label>
                        <input type="text" required placeholder="Ej: Dra. Elena Morales Castillo" className="form-text-input" value={nuevoIntegrante.nombre} onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, nombre: e.target.value, iniciales: obtenerIniciales(e.target.value) })} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                      <div className="modal-form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>Institución o Empresa que Representa *</label>
                        <input type="text" placeholder="Ej: Ministerio de Salud / Universidad de Costa Rica" className="form-text-input" value={nuevoIntegrante.institucion} onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, institucion: e.target.value })} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>Iniciales *</label>
                      <input type="text" required maxLength={6} placeholder="EMC" className="form-text-input" value={nuevoIntegrante.iniciales} onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, iniciales: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#002855', marginBottom: '6px', display: 'block' }}>Rol en el Proyecto *</label>
                      <select className="modal-form-select" value={nuevoIntegrante.rol} onChange={(e) => setNuevoIntegrante({ ...nuevoIntegrante, rol: e.target.value })} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#ffffff', cursor: 'pointer' }}>
                        <option value="Co-Investigador(a)">Co-Investigador(a)</option>
                        <option value="Persona coordinadora">Persona coordinadora</option>
                        <option value="Investigador Asociado">Investigador Asociado</option>
                        <option value="Asistente TEC">Asistente TEC</option>
                        <option value="Colaborador técnico">Colaborador técnico</option>
                      </select>
                    </div>
                  </div>

                  {errorModalIntegrante && (
                    <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><IconoCie nombre="alertTriangle" tamano={14} /><span>{errorModalIntegrante}</span></div>
                  )}
                </div>

                <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn-proposal-action btn-outline" onClick={() => { setMostrarModalNuevoIntegrante(false); setErrorModalIntegrante(''); }} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px' }}>Cancelar</button>
                  <button type="submit" className="btn-nueva-propuesta" style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><IconoCie nombre="check" tamano={14} />Guardar Integrante</button>
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