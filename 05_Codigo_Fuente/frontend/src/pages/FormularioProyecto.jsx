import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput, LimitedTextarea } from '../components/LimitedInput';
import { exportarForm04PDF } from '../utils/exportUtils';

const FormularioProyecto = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { paso: pasoParam } = useParams();
  const [searchParams] = useSearchParams();

  // Obtener propuestaId de query params si viene especificado
  const propuestaIdUrl = searchParams.get('propuestaId') || searchParams.get('id');

  // Paso actual (1 a 16)
  const [pasoActual, setPasoActual] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('Borrador listo para formulación');
  const [envioExitoso, setEnvioExitoso] = useState(false);
  const [esPropietario, setEsPropietario] = useState(true);

  // Estados del Formulario Form-04 (en blanco para llenado por el investigador)
  // Paso 1: Identificación y Modalidad
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [modalidad, setModalidad] = useState('Investigación básica'); // 'Investigación básica', 'Investigación aplicada', 'Investigación básica y aplicada', 'Desarrollo tecnológico'

  // Paso 2: Financiación previa, vinculación y problemas nacionales
  const [otrasFuentes, setOtrasFuentes] = useState({ aplica: false, detalle: '' });
  const [vinculacionTecnica, setVinculacionTecnica] = useState({ aplica: false, detalle: '' });
  const [problemasNacionales, setProblemasNacionales] = useState({ aplica: false, detalle: '' });

  // Paso 3: Instrumentos Jurídicos, Convenios y Posgrados
  const [requiereInstrumento, setRequiereInstrumento] = useState({ aplica: false, tipo: 'Convenio Nacional' });
  const [convenioMarco, setConvenioMarco] = useState({ aplica: false, nombre: '' });
  const [basePosgrado, setBasePosgrado] = useState({ 
    aplica: 'No', 
    candidato: '', 
    programa: '', 
    universidad: '' 
  });

  // Paso 4: Propiedad Intelectual, Confidencialidad e Innovación
  const [infoConfidencial, setInfoConfidencial] = useState({ aplica: false, detalle: '' });
  const [potencialPI, setPotencialPI] = useState({ aplica: false, oficioDictamen: '' });
  const [poseeInnovacion, setPoseeInnovacion] = useState({ aplica: false, tipo: 'de Proceso' });

  // Paso 5: Escala TRL (1 a 9)
  const [trlSeleccionado, setTrlSeleccionado] = useState(1);

  // Paso 6: Resumen, Abstract y Palabras Clave
  const [resumen, setResumen] = useState('');
  const [palabrasClave, setPalabrasClave] = useState('');
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');

  // Paso 7: Equipo de Investigación
  const [investigadoresTEC, setInvestigadoresTEC] = useState([]);
  const [investigadoresDisponibles, setInvestigadoresDisponibles] = useState([]);
  const [rolesEquipoDisponibles, setRolesEquipoDisponibles] = useState([]);
  const [colaboradoresExternos, setColaboradoresExternos] = useState([]);

  // Paso 8: Problema de Investigación
  const [problemaInvestigacion, setProblemaInvestigacion] = useState('');

  // Paso 9: Objetivos del Proyecto
  const [objetivoGeneral, setObjetivoGeneral] = useState('');
  const [objetivosEspecificos, setObjetivosEspecificos] = useState(['']);

  // Paso 10: Estado del Arte
  const [estadoArte, setEstadoArte] = useState('');

  // Paso 11: Metodología
  const [metodologia, setMetodologia] = useState('');

  // Paso 12: Plan de Acción y Gestión de Riesgos (Sin datos predeterminados)
  const [actividadesCronograma, setActividadesCronograma] = useState([]);
  const [riesgosMitigacion, setRiesgosMitigacion] = useState([]);
  const isInitialMount = useRef(true);
  const lastSyncedActividades = useRef('');

  // Paso 13: Presupuesto Plurianual Solicitado (Recursos VIE)
  const [presupuestoAnual, setPresupuestoAnual] = useState([
    { ano: 'Año 1', operativo: '', duradero: '' },
    { ano: 'Año 2', operativo: '', duradero: '' },
    { ano: 'Año 3', operativo: '', duradero: '' }
  ]);
  const [fuentesAdicionales, setFuentesAdicionales] = useState({
    externo: { ano1: '', ano2: '', ano3: '', oficio: '' },
    contrapartida: { ano1: '', ano2: '', ano3: '', oficio: '' }
  });
  const [archivoPlanRiesgos, setArchivoPlanRiesgos] = useState(null);
  const fileInputPlanRef = useRef(null);

  // Paso 14a: Productos Académicos (Investigación Básica / Aplicada)
  const [rangoHorasCompromiso, setRangoHorasCompromiso] = useState('');
  const [productos14a, setProductos14a] = useState({
    opcion1: { check: false, cantidad: 0, objetivo: '' },
    opcion2: { check: false, cantidad: 0, objetivo: '' },
    opcion3: { check: false, cantidad: 0, objetivo: '' },
    adicional1: '',
    adicional2: ''
  });

  // Paso 14b: Activos de Propiedad Industrial y Productos (Desarrollo Tecnológico)
  const [productos14b, setProductos14b] = useState({
    patente: { check: false, cantidad: 0, consecutivo: '' },
    diseno: { check: false, cantidad: 0, consecutivo: '' },
    software: { check: false, cantidad: 0, consecutivo: '' },
    secreto: { check: false, cantidad: 0, consecutivo: '' },
    obtencion: { check: false, cantidad: 0, consecutivo: '' },
    marca: { check: false, cantidad: 0, consecutivo: '' },
    circuito: { check: false, cantidad: 0, consecutivo: '' },
    otros: { check: false, cantidad: 0, consecutivo: '' },
    articulo: { check: false, cantidad: 0, objetivo: '' },
    memoria: { check: false, cantidad: 0, objetivo: '' },
    paquete: { check: false, cantidad: 0, objetivo: '' },
    norma: { check: false, cantidad: 0, objetivo: '' }
  });

  // Paso 15: Estrategia de Divulgación, Aspectos Éticos y Hoja de Ruta
  const [divulgacion, setDivulgacion] = useState({
    cientifica: '',
    canalesInstitucionales: '',
    socializacion: '',
    mediosMasivos: ''
  });
  const [aspectosEticos, setAspectosEticos] = useState({
    seresHumanos: false,
    biodiversidad: false,
    animales: false,
    comunidadesIndigenas: false,
    acuerdoComision: ''
  });
  const [hojaRuta, setHojaRuta] = useState('');

  // Paso 16: Resguardo, Referencias y Declaración Jurada
  const [resguardoCompromiso, setResguardoCompromiso] = useState(false);
  const [resguardoSoftware, setResguardoSoftware] = useState(false);
  const [referenciasBibliograficas, setReferenciasBibliograficas] = useState('');
  const [firmaCoordinador, setFirmaCoordinador] = useState({
    nombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido1 || ''}`.trim() : '',
    cedula: '',
    firmadoDigital: false
  });

  // Cálculo dinámico de horas semanales totales comprometidas
  const totalHorasSemanales = useMemo(() => {
    let sum = 0;
    for (const inv of investigadoresTEC) {
      if (inv && inv.horas) {
        const match = String(inv.horas).match(/\d+(\.\d+)?/);
        if (match) {
          sum += parseFloat(match[0]);
        }
      }
    }
    return sum > 0 ? sum : 12;
  }, [investigadoresTEC]);

  // Inicializar coordinador cuando carga el usuario
  
  useEffect(() => {
    const cargarCatInvestigadores = async () => {
      try {
        const cat = await propuestaService.obtenerCatalogosFormulario();
        if (cat?.investigadores) {
          setInvestigadoresDisponibles(cat.investigadores);
        }
        if (cat?.rolesEquipo) {
          setRolesEquipoDisponibles(cat.rolesEquipo);
        }
      } catch (_e) {
        console.warn('Error cargando catálogo de investigadores:', _e);
      }
    };
    cargarCatInvestigadores();
  }, []);

  useEffect(() => {
    if (usuario?.nombre && investigadoresTEC.length === 0) {
      setInvestigadoresTEC([
        {
          id: 1,
          nombre: `${usuario.nombre} ${usuario.apellido1 || ''}`.trim(),
          orcid: '',
          instancia: usuario.escuela || 'Escuela Base TEC',
          rol: 'Coordinador(a)',
          horas: '10 h (VIE)',
          nombramiento: new Date().getFullYear().toString()
        }
      ]);
      setFirmaCoordinador(prev => ({
        ...prev,
        nombre: `${usuario.nombre} ${usuario.apellido1 || ''}`.trim()
      }));
    }
  }, [usuario]);

  // Cargar datos de la propuesta desde la base de datos o almacenamiento local
  useEffect(() => {
    const cargarPropuestaBD = async () => {
      let id = propuestaIdUrl && propuestaIdUrl !== 'undefined' ? propuestaIdUrl : null;
      if (!id) {
        id = localStorage.getItem('propuesta_activa_id');
        if (!id || id === 'undefined') {
          try {
            const misProps = await propuestaService.listarMisPropuestas();
            if (misProps && misProps.length > 0) {
              id = String(misProps[0].propuestaId);
              localStorage.setItem('propuesta_activa_id', id);
            }
          } catch (_e) {}
        }
        if (id && id !== 'undefined') {
          navigate(`/dashboard/form4?propuestaId=${id}`, { replace: true });
        }
      }

      if (!id || id === 'undefined') return;
      localStorage.setItem('propuesta_activa_id', String(id));

      // 1. Cargar primero de localStorage si existe borrador local previo
      try {
        const localRaw = localStorage.getItem(`borrador_form04_${id}`);
        if (localRaw) {
          const l = JSON.parse(localRaw);
          if (l.nombreProyecto) setNombreProyecto(l.nombreProyecto);
          if (l.modalidad) setModalidad(l.modalidad);
          if (l.fechaInicio) setFechaInicio(l.fechaInicio);
          if (l.fechaFin) setFechaFin(l.fechaFin);
          if (l.trlSeleccionado) setTrlSeleccionado(l.trlSeleccionado);
          if (l.resumen) setResumen(l.resumen);
          if (l.palabrasClave) setPalabrasClave(l.palabrasClave);
          if (l.abstract) setAbstract(l.abstract);
          if (l.keywords) setKeywords(l.keywords);
          if (l.problemaInvestigacion) setProblemaInvestigacion(l.problemaInvestigacion);
          if (l.objetivoGeneral) setObjetivoGeneral(l.objetivoGeneral);
          if (l.objetivosEspecificos && l.objetivosEspecificos.length > 0) setObjetivosEspecificos(l.objetivosEspecificos);
          if (l.estadoArte) setEstadoArte(l.estadoArte);
          if (l.metodologia) setMetodologia(l.metodologia);
          if (l.hojaRuta) setHojaRuta(l.hojaRuta);
          if (l.divulgacion) setDivulgacion(l.divulgacion);
          if (l.aspectosEticos) setAspectosEticos(l.aspectosEticos);
          if (l.otrasFuentes) setOtrasFuentes(l.otrasFuentes);
          if (l.vinculacionTecnica) setVinculacionTecnica(l.vinculacionTecnica);
          if (l.problemasNacionales) setProblemasNacionales(l.problemasNacionales);
          if (l.requiereInstrumento) setRequiereInstrumento(l.requiereInstrumento);
          if (l.convenioMarco) setConvenioMarco(l.convenioMarco);
          if (l.basePosgrado) setBasePosgrado(l.basePosgrado);
          if (l.infoConfidencial) setInfoConfidencial(l.infoConfidencial);
          if (l.potencialPI) setPotencialPI(l.potencialPI);
          if (l.poseeInnovacion) setPoseeInnovacion(l.poseeInnovacion);
          if (l.resguardoCompromiso !== undefined) setResguardoCompromiso(l.resguardoCompromiso);
          if (l.resguardoSoftware !== undefined) setResguardoSoftware(l.resguardoSoftware);
          if (l.referenciasBibliograficas) setReferenciasBibliograficas(l.referenciasBibliograficas);
          if (l.presupuestoAnual) setPresupuestoAnual(l.presupuestoAnual);
          if (l.fuentesAdicionales) setFuentesAdicionales(l.fuentesAdicionales);
          if (l.investigadoresTEC && Array.isArray(l.investigadoresTEC) && l.investigadoresTEC.length > 0) {
            setInvestigadoresTEC(l.investigadoresTEC);
          }
          if (l.colaboradoresExternos && Array.isArray(l.colaboradoresExternos)) {
            setColaboradoresExternos(l.colaboradoresExternos);
          }
          let actsCargadas = null;
          if (l.actividadesCronograma && Array.isArray(l.actividadesCronograma) && l.actividadesCronograma.length > 0) {
            actsCargadas = l.actividadesCronograma;
          }
          // Sincronizar con Form-05 si Form-05 tiene actividades más recientes o Form-04 no las tiene
          try {
            const rawF5 = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
            if (rawF5) {
              const f5 = JSON.parse(rawF5);
              if (f5.actividades && Array.isArray(f5.actividades) && f5.actividades.length > 0) {
                const f5Time = f5.fechaGuardado ? new Date(f5.fechaGuardado).getTime() : 0;
                const f4Time = l?.fechaGuardado ? new Date(l.fechaGuardado).getTime() : 0;
                if (!actsCargadas || f5Time >= f4Time) {
                  actsCargadas = f5.actividades;
                }
              }
            }
          } catch (_e) {}
          if (actsCargadas && actsCargadas.length > 0) {
            setActividadesCronograma(actsCargadas);
            lastSyncedActividades.current = JSON.stringify(actsCargadas);
          }
          if (l.riesgosMitigacion && Array.isArray(l.riesgosMitigacion) && l.riesgosMitigacion.length > 0) {
            setRiesgosMitigacion(l.riesgosMitigacion);
          }
          if (l.rangoHorasCompromiso) setRangoHorasCompromiso(l.rangoHorasCompromiso);
          if (l.firmaCoordinador) setFirmaCoordinador(prev => ({ ...prev, ...l.firmaCoordinador }));
          if (l.productos14a) setProductos14a(prev => ({ ...prev, ...l.productos14a }));
          if (l.productos14b) setProductos14b(prev => ({ ...prev, ...l.productos14b }));
          setMensajeGuardado('Borrador cargado');
        }
      } catch (_e) {}

      // 2. Cargar de la base de datos oficial
      try {
        const prop = await propuestaService.obtenerPropuesta(id);
        if (prop) {
          if (prop.esPropietario !== undefined) setEsPropietario(Boolean(prop.esPropietario));
          if (prop.titulo) setNombreProyecto(prop.titulo);
          if (prop.fechaInicio) setFechaInicio(prop.fechaInicio);
          if (prop.fechaFinalizacion) setFechaFin(prop.fechaFinalizacion);
          if (prop.modalidad) setModalidad(prop.modalidad);
          if (prop.nivelTrlActual) setTrlSeleccionado(prop.nivelTrlActual);
          
          if (prop.contenido) {
            if (prop.contenido.resumen) setResumen(prop.contenido.resumen);
            if (prop.contenido.palabrasClave) setPalabrasClave(prop.contenido.palabrasClave);
            if (prop.contenido.abstract) setAbstract(prop.contenido.abstract);
            if (prop.contenido.problemaInvestigacion) setProblemaInvestigacion(prop.contenido.problemaInvestigacion);
            if (prop.contenido.objetivoGeneral) setObjetivoGeneral(prop.contenido.objetivoGeneral);
            if (prop.contenido.objetivosEspecificos) {
              const objs = prop.contenido.objetivosEspecificos.split(';\n').filter(Boolean);
              if (objs.length > 0) setObjetivosEspecificos(objs);
            }
            if (prop.contenido.estadoArte) setEstadoArte(prop.contenido.estadoArte);
            if (prop.contenido.metodologia) setMetodologia(prop.contenido.metodologia);
            if (prop.contenido.hojaRuta) setHojaRuta(prop.contenido.hojaRuta);
            if (prop.contenido.estrategiaDivulgacion) {
              try {
                const parsed = JSON.parse(prop.contenido.estrategiaDivulgacion);
                if (parsed) setDivulgacion(prev => ({ ...prev, ...parsed }));
              } catch (_) {
                setDivulgacion(prev => ({ ...prev, cientifica: prop.contenido.estrategiaDivulgacion }));
              }
            }
          }

          if (prop.declaraciones) {
            setOtrasFuentes(prev => ({ ...prev, aplica: !!prop.declaraciones.tieneFinanciamientoPrevio }));
            setVinculacionTecnica(prev => ({ ...prev, aplica: !!prop.declaraciones.tieneContinuidadProyecto }));
            setRequiereInstrumento(prev => ({ ...prev, aplica: !!prop.declaraciones.requiereInstrumentoJuridico }));
            setBasePosgrado(prev => ({ ...prev, aplica: prop.declaraciones.tieneBasePosgrado ? 'Sí' : 'No' }));
            setInfoConfidencial(prev => ({ ...prev, aplica: !!prop.declaraciones.tieneInformacionConfidencial }));
            setPotencialPI(prev => ({ ...prev, aplica: !!prop.declaraciones.tienePotencialPI }));
            setPoseeInnovacion(prev => ({ ...prev, aplica: !!prop.declaraciones.poseeInnovacion }));
            setResguardoCompromiso(!!prop.declaraciones.aceptaResguardoRepositorio);
          }

          if (prop.integrantes && Array.isArray(prop.integrantes) && prop.integrantes.length > 0) {
            setInvestigadoresTEC(prop.integrantes.map(inte => ({
              id: inte.integranteEquipoId || inte.usuarioId,
              usuarioId: inte.usuarioId,
              nombre: inte.nombreCompleto || '',
              correo: inte.correoInstitucional || '',
              orcid: inte.orcid || '',
              instancia: inte.instancia || usuario?.escuela || 'TEC',
              rol: inte.rolEquipoId === 1 ? 'Coordinador(a)' : 'Co-Investigador(a)',
              rolEquipoId: inte.rolEquipoId || 2,
              horas: `${inte.horasSemanales || 10} h (VIE)`,
              nombramiento: String(new Date().getFullYear())
            })));
          }

          if (prop.colaboradoresExternos && Array.isArray(prop.colaboradoresExternos) && prop.colaboradoresExternos.length > 0) {
            setColaboradoresExternos(prop.colaboradoresExternos.map(col => ({
              id: col.colaboradorId,
              nombre: col.nombreColaborador || '',
              apellido1: col.apellido1Colaborador || '',
              apellido2: col.apellido2Colaborador || '',
              orcid: col.idOrcid || '',
              institucion: col.institucionEmpresa || ''
            })));
          }
          setMensajeGuardado('Sincronizado con BD');
        }
      } catch (_e) {
        console.warn('No se pudo sincronizar desde el backend:', _e);
      }
    };

    cargarPropuestaBD().finally(() => {
      isInitialMount.current = false;
    });
  }, [propuestaIdUrl]);

  // Sincronización continua de la matriz de Paso 12 con Form-05 (Plan de Acción y Riesgos)
  useEffect(() => {
    if (isInitialMount.current) return;
    const serialized = JSON.stringify(actividadesCronograma);
    if (serialized === lastSyncedActividades.current) return;
    lastSyncedActividades.current = serialized;

    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (!id || id === 'undefined') return;

    try {
      const ahora = new Date().toISOString();
      // 1. Guardar en Form 05
      const rawF5 = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
      const f5Data = rawF5 ? JSON.parse(rawF5) : {};
      f5Data.actividades = actividadesCronograma;
      f5Data.nombrePropuesta = nombreProyecto || f5Data.nombrePropuesta;
      f5Data.tipoIniciativa = modalidad || f5Data.tipoIniciativa;
      f5Data.fechaGuardado = ahora;
      localStorage.setItem(`propuesta_${id}_plan_riesgos`, JSON.stringify(f5Data));
      localStorage.setItem(`borrador_form05_${id}`, JSON.stringify(f5Data));

      // 2. Mantener actualizado el borrador Form 04 local
      const rawF4 = localStorage.getItem(`borrador_form04_${id}`);
      if (rawF4) {
        const f4Data = JSON.parse(rawF4);
        f4Data.actividadesCronograma = actividadesCronograma;
        f4Data.fechaGuardado = ahora;
        localStorage.setItem(`borrador_form04_${id}`, JSON.stringify(f4Data));
      }

      // 3. Emitir evento de sincronización para cualquier vista activa de Form 05
      window.dispatchEvent(new CustomEvent('sgpi_matrices_sync', {
        detail: { propuestaId: String(id), actividades: actividadesCronograma, fuente: 'form04' }
      }));
    } catch (_e) {}
  }, [actividadesCronograma, nombreProyecto, modalidad]);

  // Escuchar sincronización de actividades provenientes de Form-05
  useEffect(() => {
    const handleSync = (e) => {
      const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
      if (!id || !e.detail || e.detail.fuente === 'form04') return;
      if (String(e.detail.propuestaId) === String(id) && Array.isArray(e.detail.actividades)) {
        const serialized = JSON.stringify(e.detail.actividades);
        if (serialized !== lastSyncedActividades.current) {
          lastSyncedActividades.current = serialized;
          setActividadesCronograma(e.detail.actividades);
        }
      }
    };

    const handleStorage = (e) => {
      const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
      if (!id) return;
      if (e.key === `propuesta_${id}_plan_riesgos` || e.key === `borrador_form05_${id}`) {
        try {
          const raw = localStorage.getItem(`propuesta_${id}_plan_riesgos`);
          if (raw) {
            const data = JSON.parse(raw);
            if (data.actividades && Array.isArray(data.actividades)) {
              const serialized = JSON.stringify(data.actividades);
              if (serialized !== lastSyncedActividades.current) {
                lastSyncedActividades.current = serialized;
                setActividadesCronograma(data.actividades);
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

  // Sincronizar paso con URL param si existe
  useEffect(() => {
    if (pasoParam) {
      const num = parseInt(pasoParam.replace(/\D/g, ''), 10);
      if (num >= 1 && num <= 16) {
        setPasoActual(num);
      }
    }
  }, [pasoParam]);

  // Helper: crear objeto vacío de periodo de ejecución por meses (Form 05)
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

  // Número de años del proyecto (derivado de fechas de la propuesta o por defecto 3)
  const numAniosCronograma = (() => {
    if (fechaInicio && fechaFin) {
      const d1 = new Date(fechaInicio);
      const d2 = new Date(fechaFin);
      const diff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      if (diff <= 12) return 1;
      if (diff <= 24) return 2;
      return 3;
    }
    return 3;
  })();

  // Obtener lista consolidada de participantes para selectores
  const obtenerIntegrantesLista = () => {
    const lista = [];
    const vistos = new Set();
    if (usuario?.nombre) {
      const nomCoord = `${usuario.nombre} ${usuario.apellido1 || ''}`.trim();
      const inits = ((usuario.nombre[0] || '') + (usuario.apellido1 ? usuario.apellido1[0] : '')).toUpperCase() || 'IP';
      vistos.add(nomCoord.toLowerCase());
      lista.push({ nombre: nomCoord, iniciales: inits, rol: 'Persona coordinadora' });
    }
    (investigadoresTEC || []).forEach(inv => {
      const nom = (inv.nombre || '').trim();
      if (nom && !vistos.has(nom.toLowerCase())) {
        vistos.add(nom.toLowerCase());
        const partes = nom.split(/\s+/);
        const inits = partes.length >= 2 ? (partes[0][0] + partes[1][0]).toUpperCase() : nom.slice(0, 2).toUpperCase();
        lista.push({ nombre: nom, iniciales: inits, rol: inv.rol || 'Co-Investigador(a)' });
      }
    });
    (colaboradoresExternos || []).forEach(col => {
      const nom = (col.nombre || '').trim();
      if (nom && !vistos.has(nom.toLowerCase())) {
        vistos.add(nom.toLowerCase());
        const partes = nom.split(/\s+/);
        const inits = partes.length >= 2 ? (partes[0][0] + partes[1][0]).toUpperCase() : nom.slice(0, 2).toUpperCase();
        lista.push({ nombre: nom, iniciales: inits, rol: col.institucion ? `Externo (${col.institucion})` : 'Colaborador externo' });
      }
    });
    return lista;
  };

  // Toggle de casillas de meses en el cronograma
  const handleTogglePeriodo = (idx, anio, mes) => {
    const copia = [...actividadesCronograma];
    const act = { ...copia[idx] };
    if (!act.periodoEjecucion) {
      act.periodoEjecucion = crearPeriodoVacio();
    }
    const aKey = `a${anio}`;
    const mKey = `m${mes}`;
    if (!act.periodoEjecucion[aKey]) {
      act.periodoEjecucion[aKey] = {};
    }
    const val = !act.periodoEjecucion[aKey][mKey];
    act.periodoEjecucion[aKey][mKey] = val;
    act[`a${anio}`] = Object.values(act.periodoEjecucion[aKey]).some(Boolean);
    copia[idx] = act;
    setActividadesCronograma(copia);
  };

  const handleAgregarFilaActividad = () => {
    const primerOE = objetivosEspecificos.find(o => o && o.trim()) ? 'OE 1' : '';
    const nueva = {
      id: Date.now(),
      obj: primerOE,
      objetivo: primerOE,
      actividad: '',
      resultado: '',
      entregable: '',
      participante: '',
      responsable: '',
      responsabilidad: '',
      riesgo: '',
      mitigacion: '',
      responsableGestion: '',
      mesInicio: '',
      duracionMesesAct: '',
      periodoEjecucion: crearPeriodoVacio(),
      a1: false,
      a2: false,
      a3: false
    };
    setActividadesCronograma([...actividadesCronograma, nueva]);
  };

  const handleEliminarActividad = (idOIndice) => {
    setActividadesCronograma(actividadesCronograma.filter((a, idx) => a.id !== idOIndice && idx !== idOIndice));
  };

  const handleDescargarPDF = () => {
    try {
      const idProp = propuestaIdUrl || localStorage.getItem('propuesta_activa_id') || '';
      const cod = idProp ? `Propuesta-${idProp}` : 'Form04';
      const datos = {
        nombreProyecto, modalidad, fechaInicio, fechaFin, trlSeleccionado,
        resumen, palabrasClave, abstract, keywords, problemaInvestigacion,
        objetivoGeneral, objetivosEspecificos, estadoArte, metodologia,
        divulgacion, aspectosEticos, hojaRuta, otrasFuentes, vinculacionTecnica,
        problemasNacionales, requiereInstrumento, convenioMarco, basePosgrado,
        infoConfidencial, potencialPI, poseeInnovacion, resguardoCompromiso,
        resguardoSoftware, referenciasBibliograficas, presupuestoAnual,
        fuentesAdicionales, investigadoresTEC, colaboradoresExternos,
        actividadesCronograma, riesgosMitigacion, rangoHorasCompromiso,
        firmaCoordinador, productos14a, productos14b
      };
      if (idProp) {
        localStorage.setItem(`borrador_form04_${idProp}`, JSON.stringify(datos));
      }
      localStorage.setItem('borrador_form04_ultimo', JSON.stringify(datos));
      exportarForm04PDF(datos, cod);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF: ' + (err.message || 'Error inesperado'));
    }
  };

    const guardarBorradorActual = async () => {
    setGuardando(true);
    const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    const idParaGuardar = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');

    // 1. Guardar snapshot completo en localStorage para persistencia instantánea
    const snapshotCompleto = {
      nombreProyecto, modalidad, fechaInicio, fechaFin, trlSeleccionado,
      resumen, palabrasClave, abstract, keywords, problemaInvestigacion,
      objetivoGeneral, objetivosEspecificos, estadoArte, metodologia,
      divulgacion, aspectosEticos, hojaRuta, otrasFuentes, vinculacionTecnica,
      problemasNacionales, requiereInstrumento, convenioMarco, basePosgrado,
      infoConfidencial, potencialPI, poseeInnovacion, resguardoCompromiso,
      resguardoSoftware, referenciasBibliograficas, presupuestoAnual,
      fuentesAdicionales,
      investigadoresTEC, colaboradoresExternos,
      actividadesCronograma, riesgosMitigacion,
      rangoHorasCompromiso, firmaCoordinador,
      productos14a, productos14b,
      fechaGuardado: new Date().toISOString()
    };

    if (idParaGuardar) {
      localStorage.setItem(`borrador_form04_${idParaGuardar}`, JSON.stringify(snapshotCompleto));
      try {
        const rawF5 = localStorage.getItem(`propuesta_${idParaGuardar}_plan_riesgos`);
        const f5Data = rawF5 ? JSON.parse(rawF5) : {};
        f5Data.actividades = snapshotCompleto.actividadesCronograma;
        f5Data.nombrePropuesta = nombreProyecto || f5Data.nombrePropuesta;
        f5Data.tipoIniciativa = modalidad || f5Data.tipoIniciativa;
        f5Data.fechaGuardado = snapshotCompleto.fechaGuardado;
        localStorage.setItem(`propuesta_${idParaGuardar}_plan_riesgos`, JSON.stringify(f5Data));
        localStorage.setItem(`borrador_form05_${idParaGuardar}`, JSON.stringify(f5Data));
      } catch (_e) {}
    }
    localStorage.setItem('borrador_form04_ultimo', JSON.stringify(snapshotCompleto));

    // 2. Si hay ID de propuesta, sincronizar con la base de datos
    if (idParaGuardar) {
      try {
        // Cabecera (título, fechas, TRL)
        try {
          await propuestaService.actualizarCabecera(idParaGuardar, {
            titulo: nombreProyecto || 'Borrador de Propuesta',
            fechaInicio: fechaInicio || null,
            fechaFinalizacion: fechaFin || null,
            nivelTrlActual: Number(trlSeleccionado) || 1
          });
        } catch (_cabErr) {
          console.warn('Error actualizando cabecera en BD:', _cabErr);
        }

        // Contenido narrativo
        const payloadContenido = {
          resumen: resumen,
          palabrasClave: palabrasClave,
          abstract: abstract,
          problemaInvestigacion: problemaInvestigacion,
          objetivoGeneral: objetivoGeneral,
          objetivosEspecificos: objetivosEspecificos.join(';\n'),
          estadoArte: estadoArte,
          metodologia: metodologia,
          estrategiaDivulgacion: JSON.stringify(divulgacion),
          hojaRuta: hojaRuta
        };
        await propuestaService.guardarContenido(idParaGuardar, payloadContenido);

        // Declaraciones
        const payloadDeclaraciones = {
          tieneFinanciamientoPrevio: !!otrasFuentes.aplica,
          tieneContinuidadProyecto: !!vinculacionTecnica.aplica,
          requiereInstrumentoJuridico: !!requiereInstrumento.aplica,
          tieneBasePosgrado: basePosgrado.aplica !== 'No',
          tieneInformacionConfidencial: !!infoConfidencial.aplica,
          tienePotencialPI: !!potencialPI.aplica,
          poseeInnovacion: !!poseeInnovacion.aplica,
          aceptaResguardoRepositorio: !!resguardoCompromiso,
          aceptaDeclaracionJurada: true
        };
        await propuestaService.guardarDeclaraciones(idParaGuardar, payloadDeclaraciones);

        // Sincronizar Equipo de Investigación y Colaboradores Externos en la BD
        try {
          const payloadEquipo = {
            integrantes: investigadoresTEC.map(inv => ({
              usuarioId: Number(inv.usuarioId || inv.id) || usuario?.id || 1,
              tipoHoraId: 1,
              horasSemanales: parseFloat(String(inv.horas || '10').replace(/[^\d.]/g, '')) || 10.0,
              rolEquipoId: (inv.rol && inv.rol.includes('Coord')) ? 1 : (Number(inv.rolEquipoId) || 2),
              orcid: inv.orcid || null
            })),
            colaboradoresExternos: colaboradoresExternos.filter(c => c.nombre && c.nombre.trim()).map(col => ({
              nombreColaborador: col.nombre.trim(),
              apellido1Colaborador: col.apellido1 || null,
              apellido2Colaborador: col.apellido2 || null,
              idOrcid: col.orcid || null,
              institucionEmpresa: col.institucion || 'Institución Externa'
            }))
          };
          await propuestaService.guardarEquipoCompleto(idParaGuardar, payloadEquipo);
        } catch (_eqErr) {
          console.warn('Error al persistir equipo en BD:', _eqErr);
        }

        // Sincronizar Equipo de Investigación y Colaboradores Externos en la BD
        try {
          const payloadEquipo = {
            integrantes: investigadoresTEC.map(inv => ({
              usuarioId: Number(inv.usuarioId || inv.id) || usuario?.id || 1,
              tipoHoraId: 1,
              horasSemanales: parseFloat(String(inv.horas || '10').replace(/[^\d.]/g, '')) || 10.0,
              rolEquipoId: (inv.rol && inv.rol.includes('Coord')) ? 1 : (Number(inv.rolEquipoId) || 2),
              orcid: inv.orcid || null
            })),
            colaboradoresExternos: colaboradoresExternos.filter(c => c.nombre && c.nombre.trim()).map(col => ({
              nombreColaborador: col.nombre.trim(),
              apellido1Colaborador: col.apellido1 || null,
              apellido2Colaborador: col.apellido2 || null,
              idOrcid: col.orcid || null,
              institucionEmpresa: col.institucion || 'Institución Externa'
            }))
          };
          await propuestaService.guardarEquipoCompleto(idParaGuardar, payloadEquipo);
        } catch (_eqErr) {
          console.warn('Error al persistir equipo en BD:', _eqErr);
        }

        setMensajeGuardado(`Guardado ${ahora}`);
      } catch (_err) {
        console.warn('Error al persistir en backend, respaldado localmente:', _err);
        setMensajeGuardado(`Guardado local ${ahora}`);
      } finally {
        setGuardando(false);
      }
    } else {
      setMensajeGuardado(`Guardado local ${ahora}`);
      setGuardando(false);
    }
  };

  const handleSiguiente = async () => {
    await guardarBorradorActual();
    if (pasoActual < 16) {
      const siguientePaso = pasoActual + 1;
      setPasoActual(siguientePaso);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 1) {
      const previoPaso = pasoActual - 1;
      setPasoActual(previoPaso);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEnvioDefinitivo = async () => {
    if (!esPropietario) {
      alert('Solo la persona coordinadora (propietaria de la propuesta) puede realizar el envío definitivo a la Unidad de Vinculación.');
      return;
    }

    if (!resguardoCompromiso) {
      alert('Debe aceptar el compromiso de resguardo y depósito de productos para realizar el envío.');
      return;
    }

    setGuardando(true);
    try {
      if (propuestaIdUrl) {
        await propuestaService.enviarRevision(propuestaIdUrl);
        localStorage.setItem(`propuesta_${propuestaIdUrl}_form04_enviado`, 'true');
      }
      setEnvioExitoso(true);
      window.dispatchEvent(new Event('propuestaCreada'));
    } catch (err) {
      console.error(err);
      const detalle = err.response?.data?.detail || err.message || 'Ocurrió un error al enviar la propuesta.';
      alert(`No se pudo enviar la propuesta: ${detalle}`);
    } finally {
      setGuardando(false);
    }
  };

  // Determinar si en el paso 14 corresponde la variante 14a o 14b
  // Regla del usuario: la 14b se pone si elige "Desarrollo tecnológico", sino se pone la 14a
  const esDesarrolloTecnologico = Boolean(modalidad && String(modalidad).toLowerCase().includes('desarrollo'));

  return (
    <div className="formulario-proyecto-master-wrapper">
      {/* Top Banner Oficial TEC / SGPI */}
      <div className="form-top-banner">
        <div className="form-banner-left">
          <span className="form-banner-tec-title">TEC | SGPI — Formulario Form-04</span>
          <span className="form-banner-sep">/</span>
          <span className="form-banner-sub">Formulación de Propuesta de Investigación</span>
        </div>
        <div className="form-banner-right">
          <span className="autoguardado-badge">
            <span className="dot-pulse"></span>
            {guardando ? 'Guardando en BD...' : mensajeGuardado}
          </span>
        </div>
      </div>

      {/* Contenedor Principal del Formulario */}
      <div className="form-paper-container">
        {envioExitoso ? (
          <div className="envio-exitoso-splash">
            <div className="success-icon-badge">✓</div>
            <h1 className="success-modal-title">¡Propuesta Enviada a Revisión Institucional!</h1>
            <p className="success-modal-subtitle">
              El Formulario Form-04 ha sido firmado digitalmente y enviado con éxito a la Unidad de Vinculación para su proceso de evaluación y dictamen.
            </p>
            <div className="success-propuesta-code-box">
              <span className="code-label">PROYECTO REGISTRADO</span>
              <span className="code-value">{nombreProyecto}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                type="button" 
                className="btn-nueva-propuesta"
                onClick={() => navigate('/dashboard/propuestas')}
              >
                Ver en Mis Propuestas →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header del Paso Actual */}
            <div className="step-counter-label">
              PASO {pasoActual} DE 16 {pasoActual === 14 ? (esDesarrolloTecnologico ? '(Variante 14b: Desarrollo Tecnológico)' : '(Variante 14a: Investigación Básica / Aplicada)') : ''}
            </div>

            {/* ========================================================
                PASO 1: Identificación de la Propuesta y Modalidad
                ======================================================== */}
            {pasoActual === 1 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Identificación de la Propuesta y Modalidad</h1>

                <div className="form-group-block">
                  <LimitedInput
                    label="Nombre del proyecto"
                    placeholder="Escriba el título completo de la propuesta de investigación..."
                    value={nombreProyecto}
                    onChange={(e) => setNombreProyecto(e.target.value)}
                    maxLength={300}
                    required
                    className="form-text-input"
                  />
                </div>

                <div className="form-two-cols-row">
                  <div className="form-group-block">
                    <label className="form-field-label">Fecha de inicio *</label>
                    <input
                      type="date"
                      className="form-text-input"
                      value={fechaInicio}
                      min="2020-01-01"
                      max="2040-12-31"
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div className="form-group-block">
                    <label className="form-field-label">Fecha de finalización *</label>
                    <input
                      type="date"
                      className="form-text-input"
                      value={fechaFin}
                      min={fechaInicio || "2020-01-01"}
                      max="2040-12-31"
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group-block" style={{ marginTop: '16px' }}>
                  <label className="form-field-label">Modalidad del proyecto *</label>
                  <p className="form-field-hint">
                    Seleccione la modalidad. Recuerde que elegir "Desarrollo tecnológico" activará la sección 14b de compromisos de propiedad industrial.
                  </p>
                  <div className="modalidades-grid-cards" role="radiogroup" aria-label="Modalidad del proyecto">
                    {[
                      { key: 'Investigación básica', desc: 'Generación de nuevo conocimiento fundamental sin aplicación comercial inmediata.' },
                      { key: 'Investigación aplicada', desc: 'Adquisición de nuevo conocimiento orientado a objetivos o metas prácticas específicas.' },
                      { key: 'Investigación básica y aplicada', desc: 'Iniciativas integrales con fases teóricas y validación experimental aplicada.' },
                      { key: 'Desarrollo tecnológico', desc: 'Uso sistemático del conocimiento para prototipos, software, patentes o innovación industrial.' }
                    ].map((m) => (
                      <div 
                        key={m.key} 
                        className={`modalidad-card-option ${modalidad === m.key ? 'is-selected' : ''}`}
                        role="radio"
                        aria-checked={modalidad === m.key}
                        tabIndex={0}
                        aria-label={`Modalidad: ${m.key}. ${m.desc}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalidad(m.key); } }}
                        onClick={() => setModalidad(m.key)}
                      >
                        <div className="modalidad-radio-circle" aria-hidden="true">
                          {modalidad === m.key && <span className="inner-dot"></span>}
                        </div>
                        <div className="modalidad-texts">
                          <div className="modalidad-name">{m.key}</div>
                          <div className="modalidad-desc">{m.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 2: Financiación Previa, Vinculación y Problemas Nacionales
                ======================================================== */}
            {pasoActual === 2 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Financiación Previa, Vinculación y Problemas Nacionales</h1>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-number">1.</span>
                    <span className="question-text">¿Propuesta sometida a otras fuentes de financiamiento o FUNDATEC?</span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!otrasFuentes.aplica ? 'active' : ''}`}
                        onClick={() => setOtrasFuentes({ ...otrasFuentes, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${otrasFuentes.aplica ? 'active' : ''}`}
                        onClick={() => setOtrasFuentes({ ...otrasFuentes, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {otrasFuentes.aplica && (
                    <div className="question-subfield">
                      <LimitedInput 
                        maxLength={500}
                        className="form-text-input"
                        placeholder="Especifique entidad, estado de gestión y compromiso de contrapartida institucional..."
                        value={otrasFuentes.detalle}
                        onChange={(e) => setOtrasFuentes({ ...otrasFuentes, detalle: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-number">2.</span>
                    <span className="question-text">¿Existe vinculación técnica o de continuidad con proyectos VIE u Hoja de Ruta?</span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!vinculacionTecnica.aplica ? 'active' : ''}`}
                        onClick={() => setVinculacionTecnica({ ...vinculacionTecnica, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${vinculacionTecnica.aplica ? 'active' : ''}`}
                        onClick={() => setVinculacionTecnica({ ...vinculacionTecnica, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {vinculacionTecnica.aplica && (
                    <div className="question-subfield">
                      <LimitedInput 
                        maxLength={500}
                        className="form-text-input"
                        placeholder="Indique código o nombre de proyecto precedente..."
                        value={vinculacionTecnica.detalle}
                        onChange={(e) => setVinculacionTecnica({ ...vinculacionTecnica, detalle: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-number">3.</span>
                    <span className="question-text">¿Atiende problemas/prioridades nacionales/sectoriales (MIDEPLAN, ODS, etc.)?</span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!problemasNacionales.aplica ? 'active' : ''}`}
                        onClick={() => setProblemasNacionales({ ...problemasNacionales, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${problemasNacionales.aplica ? 'active' : ''}`}
                        onClick={() => setProblemasNacionales({ ...problemasNacionales, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {problemasNacionales.aplica && (
                    <div className="question-subfield">
                      <LimitedInput 
                        maxLength={500}
                        className="form-text-input"
                        placeholder="Especifique el problema identificado y el documento de referencia (plan o política)..."
                        value={problemasNacionales.detalle}
                        onChange={(e) => setProblemasNacionales({ ...problemasNacionales, detalle: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 3: Instrumentos Jurídicos, Convenios Marco y Posgrados
                ======================================================== */}
            {pasoActual === 3 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Instrumentos Jurídicos, Convenios Marco y Posgrados</h1>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿Para la ejecución técnica de esta propuesta, se requiere la formalización de un instrumento jurídico (Convenio, contrato o carta de entendimiento) entre el ITCR y entes externos? *
                    </span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!requiereInstrumento.aplica ? 'active' : ''}`}
                        onClick={() => setRequiereInstrumento({ ...requiereInstrumento, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${requiereInstrumento.aplica ? 'active' : ''}`}
                        onClick={() => setRequiereInstrumento({ ...requiereInstrumento, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {requiereInstrumento.aplica && (
                    <div className="question-subfield">
                      <label className="form-field-label">Ámbito del instrumento:</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['Convenio Nacional', 'Convenio Internacional'].map((amb) => (
                          <button
                            key={amb}
                            type="button"
                            className={`btn-selector-pill ${requiereInstrumento.tipo === amb ? 'active' : ''}`}
                            onClick={() => setRequiereInstrumento({ ...requiereInstrumento, tipo: amb })}
                          >
                            {amb}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿Se tramitará esta iniciativa en un convenio marco de cooperación técnica actualmente vigente entre el ITCR y la entidad colaboradora?
                    </span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!convenioMarco.aplica ? 'active' : ''}`}
                        onClick={() => setConvenioMarco({ ...convenioMarco, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${convenioMarco.aplica ? 'active' : ''}`}
                        onClick={() => setConvenioMarco({ ...convenioMarco, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {convenioMarco.aplica && (
                    <div className="question-subfield">
                      <LimitedInput 
                        maxLength={300}
                        className="form-text-input"
                        placeholder="Indique el nombre completo del convenio..."
                        value={convenioMarco.nombre}
                        onChange={(e) => setConvenioMarco({ ...convenioMarco, nombre: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿Corresponde esta propuesta, parcial o totalmente, a la investigación base para que una persona (estudiante o investigador) opte por un grado académico superior? *
                    </span>
                    <div className="toggle-btn-group">
                      {['No', 'Sí parcial', 'Sí totalmente'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`btn-toggle-option ${basePosgrado.aplica === opt ? 'active' : ''}`}
                          onClick={() => setBasePosgrado({ ...basePosgrado, aplica: opt })}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  {basePosgrado.aplica !== 'No' && (
                    <div className="question-subfield">
                      <div className="form-three-cols-row">
                        <LimitedInput 
                          maxLength={100}
                          className="form-text-input"
                          placeholder="Nombre de la persona candidata..."
                          value={basePosgrado.candidato}
                          onChange={(e) => setBasePosgrado({ ...basePosgrado, candidato: e.target.value })}
                        />
                        <LimitedInput 
                          maxLength={150}
                          className="form-text-input"
                          placeholder="Programa y grado académico a obtener..."
                          value={basePosgrado.programa}
                          onChange={(e) => setBasePosgrado({ ...basePosgrado, programa: e.target.value })}
                        />
                        <LimitedInput 
                          maxLength={150}
                          className="form-text-input"
                          placeholder="Universidad que otorga el grado..."
                          value={basePosgrado.universidad}
                          onChange={(e) => setBasePosgrado({ ...basePosgrado, universidad: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 4: Propiedad Intelectual, Confidencialidad e Innovación
                ======================================================== */}
            {pasoActual === 4 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Propiedad Intelectual, Confidencialidad e Innovación</h1>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿Conlleva el planteamiento del problema o la metodología de esta propuesta información sensible de terceros o datos sujetos a cláusulas de prevención y confidencialidad? *
                    </span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!infoConfidencial.aplica ? 'active' : ''}`}
                        onClick={() => setInfoConfidencial({ ...infoConfidencial, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${infoConfidencial.aplica ? 'active' : ''}`}
                        onClick={() => setInfoConfidencial({ ...infoConfidencial, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {infoConfidencial.aplica && (
                    <div className="question-subfield">
                      <LimitedInput 
                        maxLength={500}
                        className="form-text-input"
                        placeholder="Describa aquí el tipo de información y la fuente de la restricción..."
                        value={infoConfidencial.detalle}
                        onChange={(e) => setInfoConfidencial({ ...infoConfidencial, detalle: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿La propuesta presenta el potencial de generar resultados susceptibles de protección mediante propiedad intelectual? *
                    </span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!potencialPI.aplica ? 'active' : ''}`}
                        onClick={() => setPotencialPI({ ...potencialPI, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${potencialPI.aplica ? 'active' : ''}`}
                        onClick={() => setPotencialPI({ ...potencialPI, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {potencialPI.aplica && (
                    <div className="question-subfield">
                      <label className="form-field-label">En caso afirmativo, indique el número de oficio del dictamen del Centro de Vinculación:</label>
                      <LimitedInput 
                        maxLength={50}
                        className="form-text-input"
                        placeholder="Ej: PI-VIE01-2026-004..."
                        value={potencialPI.oficioDictamen}
                        onChange={(e) => setPotencialPI({ ...potencialPI, oficioDictamen: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="question-toggle-card">
                  <div className="question-header-row">
                    <span className="question-text">
                      ¿Considera que los resultados del proyecto se traducirán en una innovación conforme a los criterios institucionales?
                    </span>
                    <div className="toggle-btn-group">
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${!poseeInnovacion.aplica ? 'active' : ''}`}
                        onClick={() => setPoseeInnovacion({ ...poseeInnovacion, aplica: false })}
                      >
                        No
                      </button>
                      <button 
                        type="button" 
                        className={`btn-toggle-option ${poseeInnovacion.aplica ? 'active' : ''}`}
                        onClick={() => setPoseeInnovacion({ ...poseeInnovacion, aplica: true })}
                      >
                        ✔ Sí
                      </button>
                    </div>
                  </div>
                  {poseeInnovacion.aplica && (
                    <div className="question-subfield">
                      <label className="form-field-label">En caso afirmativo, seleccione el tipo de innovación predominante:</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['de Proceso', 'de Producto'].map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            className={`btn-selector-pill ${poseeInnovacion.tipo === tipo ? 'active' : ''}`}
                            onClick={() => setPoseeInnovacion({ ...poseeInnovacion, tipo })}
                          >
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 5: Niveles de Madurez Tecnológica (TRL)
                ======================================================== */}
            {pasoActual === 5 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Niveles de Madurez Tecnológica (TRL)</h1>
                <p className="form-field-hint" style={{ marginBottom: '16px' }}>
                  Si es una iniciativa de desarrollo tecnológico, indique el nivel de madurez tecnológica (TRL) que mejor la describe según el siguiente cuadro:
                </p>

                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>ESCALA TRL</th>
                        <th style={{ width: '75%' }}>DESCRIPCIÓN DEL NIVEL DE MADUREZ TECNOLÓGICA</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>SELECCIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { nivel: 1, label: 'TRL 1: Principios básicos', desc: 'Se identifican y documentan principios científicos básicos con potencial aplicación tecnológica futura. Incluye investigación básica orientada.' },
                        { nivel: 2, label: 'TRL 2: Concepto formulado', desc: 'Se plantea una posible aplicación tecnológica basada en principios científicos observados.' },
                        { nivel: 3, label: 'TRL 3: Pruebas de concepto', desc: 'Se obtiene evidencia experimental inicial que demuestra la viabilidad técnica del concepto. Incluye validación preliminar en laboratorio.' },
                        { nivel: 4, label: 'TRL 4: Validación laboratorio', desc: 'La tecnología se valida en condiciones controladas de laboratorio. Incluye prototipos funcionales y validación experimental robusta.' },
                        { nivel: 5, label: 'TRL 5: Validación relevante', desc: 'Tecnología demostrada: funcionalidad en condiciones similares al entorno real. Incluye pruebas piloto en ambientes semicontrolados o plantas piloto.' },
                        { nivel: 6, label: 'TRL 6: Demostrado entorno', desc: 'Se demuestra un prototipo a escala integrada en condiciones cercanas a la operación real. Incluye validación precomercial o pruebas piloto avanzadas.' },
                        { nivel: 7, label: 'TRL 7: Entorno operacional', desc: 'La tecnología opera en condiciones reales de uso. Incluye implementaciones piloto en empresa, finca, comunidad o institución.' },
                        { nivel: 8, label: 'TRL 8: Sistema calificado', desc: 'La tecnología está completa, validada y lista para despliegue, transferencia o escalamiento.' },
                        { nivel: 9, label: 'TRL 9: Operación real', desc: 'La tecnología se encuentra implementada exitosamente y operando de manera sostenida. Corresponde a tecnologías adaptadas por usuarios finales o mercado.' }
                      ].map((item) => (
                        <tr 
                          key={item.nivel} 
                          onClick={() => setTrlSeleccionado(item.nivel)}
                          style={{ cursor: 'pointer', backgroundColor: trlSeleccionado === item.nivel ? '#f0fdf4' : 'transparent' }}
                        >
                          <td style={{ fontWeight: 600, color: '#002855' }}>{item.label}</td>
                          <td style={{ fontSize: '13px', color: '#475569' }}>{item.desc}</td>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="radio" 
                              name="trl-selector"
                              checked={trlSeleccionado === item.nivel}
                              onChange={() => setTrlSeleccionado(item.nivel)}
                              style={{ width: '16px', height: '16px', accentColor: '#0369A1' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 6: Resumen, Abstract y Palabras Clave
                ======================================================== */}
            {pasoActual === 6 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Resumen, Abstract y Palabras Clave</h1>

                <div className="form-group-block">
                  <LimitedTextarea
                    label="Resumen (Máximo 500 palabras / 4000 caracteres)"
                    rows={5}
                    maxLength={4000}
                    required
                    className="form-text-area"
                    placeholder="Describa aquí el resumen..."
                    value={resumen}
                    onChange={(e) => setResumen(e.target.value)}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textAlign: 'right' }}>
                    {resumen.trim().split(/\s+/).filter(Boolean).length} / 500 palabras aproximadas
                  </div>
                </div>

                <div className="form-group-block">
                  <p className="form-field-hint">Incluya entre 4 y 6 términos descriptores que identifiquen los conceptos centrales (separadas por comas).</p>
                  <LimitedInput
                    label="Palabras claves"
                    type="text"
                    required
                    maxLength={255}
                    className="form-text-input"
                    placeholder="Describa aquí las palabras claves..."
                    value={palabrasClave}
                    onChange={(e) => setPalabrasClave(e.target.value)}
                  />
                </div>

                <div className="form-group-block">
                  <p className="form-field-hint">Proporcione la traducción al idioma inglés del resumen ejecutivo.</p>
                  <LimitedTextarea
                    label="Abstract"
                    rows={4}
                    maxLength={4000}
                    required
                    className="form-text-area"
                    placeholder="Describe here the abstract in English..."
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                  />
                </div>

                <div className="form-group-block">
                  <p className="form-field-hint">Include between 4 and 6 descriptor terms in English.</p>
                  <LimitedInput
                    label="Keywords"
                    type="text"
                    required
                    maxLength={255}
                    className="form-text-input"
                    placeholder="Describe here the keywords (separated by commas)..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 7: Equipo de Investigación
                ======================================================== */}
            {pasoActual === 7 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Equipo de Investigación</h1>
                <p className="form-field-hint">
                  Indique los investigadores que son funcionarios del TEC y los colaboradores externos que estarán participando en la propuesta.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', color: '#002855', margin: 0, fontWeight: 700 }}>
                    Cuadro 2. Investigadores que son funcionarios del TEC
                  </h3>
                  <button 
                    type="button" 
                    className="btn-link-action"
                    style={{ fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setInvestigadoresTEC([...investigadoresTEC, { id: Date.now(), usuarioId: null, nombre: '', orcid: '', instancia: 'TEC', rol: 'Co-Investigador(a)', rolEquipoId: 2, horas: '10 h (VIE)', nombramiento: String(new Date().getFullYear()) }])}
                  >
                    + Añadir miembro al equipo
                  </button>
                </div>
                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th>Nombre y apellidos *</th>
                        <th>ID ORCID *</th>
                        <th>Instancia académica</th>
                        <th>Condición (Rol) *</th>
                        <th>Horas (Tipo/Cant) *</th>
                        <th>Nombramiento</th>
                        <th style={{ width: '48px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investigadoresTEC.map((inv, idx) => (
                        <tr key={inv.id || idx}>
                          <td>
                            {idx === 0 ? (
                              <input 
                                type="text"
                                className="form-table-input"
                                value={inv.nombre}
                                readOnly
                                title="Investigador Coordinador responsable de la propuesta"
                                style={{ backgroundColor: '#f8fafc', fontWeight: 600, color: '#002855' }}
                              />
                            ) : (
                              <select
                                className="form-table-input"
                                value={inv.usuarioId || ''}
                                style={{ background: '#ffffff', cursor: 'pointer' }}
                                onChange={(e) => {
                                  const uId = Number(e.target.value);
                                  const selUsu = investigadoresDisponibles.find(u => u.usuarioId === uId);
                                  const copia = [...investigadoresTEC];
                                  if (selUsu) {
                                    copia[idx].usuarioId = selUsu.usuarioId;
                                    copia[idx].nombre = selUsu.nombreCompleto;
                                    copia[idx].correo = selUsu.correo;
                                    copia[idx].instancia = selUsu.escuela || 'TEC';
                                  } else {
                                    copia[idx].usuarioId = null;
                                    copia[idx].nombre = '';
                                    copia[idx].instancia = 'TEC';
                                  }
                                  setInvestigadoresTEC(copia);
                                }}
                              >
                                <option value="">-- Seleccionar Investigador TEC de la BD --</option>
                                {investigadoresDisponibles.map(u => (
                                  <option key={u.usuarioId} value={u.usuarioId}>
                                    {u.nombreCompleto} ({u.escuela || 'TEC'})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={inv.orcid}
                              maxLength={20}
                              showCounter={false}
                              placeholder="0000-0000-0000-0000"
                              onChange={(e) => {
                                const copia = [...investigadoresTEC];
                                copia[idx].orcid = e.target.value;
                                setInvestigadoresTEC(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={inv.instancia}
                              maxLength={100}
                              showCounter={false}
                              onChange={(e) => {
                                const copia = [...investigadoresTEC];
                                copia[idx].instancia = e.target.value;
                                setInvestigadoresTEC(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={inv.rol}
                              maxLength={50}
                              showCounter={false}
                              onChange={(e) => {
                                const copia = [...investigadoresTEC];
                                copia[idx].rol = e.target.value;
                                setInvestigadoresTEC(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={inv.horas}
                              maxLength={20}
                              showCounter={false}
                              placeholder="10 h (VIE)"
                              onChange={(e) => {
                                const copia = [...investigadoresTEC];
                                copia[idx].horas = e.target.value;
                                setInvestigadoresTEC(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={inv.nombramiento}
                              maxLength={50}
                              showCounter={false}
                              onChange={(e) => {
                                const copia = [...investigadoresTEC];
                                copia[idx].nombramiento = e.target.value;
                                setInvestigadoresTEC(copia);
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-remove-table-row"
                              title="Eliminar integrante"
                              onClick={() => {
                                if (investigadoresTEC.length > 1) {
                                  setInvestigadoresTEC(investigadoresTEC.filter((_, i) => i !== idx));
                                } else {
                                  alert('Debe permanecer al menos el Investigador Coordinador.');
                                }
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  type="button" 
                  className="btn-add-table-row"
                  onClick={() => setInvestigadoresTEC([...investigadoresTEC, { id: Date.now(), usuarioId: null, nombre: '', orcid: '', instancia: 'TEC', rol: 'Co-Investigador(a)', rolEquipoId: 2, horas: '5 h (VIE)', nombramiento: String(new Date().getFullYear()) }])}
                >
                  + Insertar fila en Investigadores TEC
                </button>

                <h3 style={{ fontSize: '15px', color: '#002855', marginTop: '24px', marginBottom: '8px', fontWeight: 700 }}>
                  Cuadro 3. Colaboradores externos
                </h3>
                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th>Nombre completo del colaborador externo</th>
                        <th>ID ORCID *</th>
                        <th>Institución o empresa que representa</th>
                        <th style={{ width: '48px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colaboradoresExternos.map((col, idx) => (
                        <tr key={col.id || idx}>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={col.nombre}
                              maxLength={100}
                              showCounter={false}
                              onChange={(e) => {
                                const copia = [...colaboradoresExternos];
                                copia[idx].nombre = e.target.value;
                                setColaboradoresExternos(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={col.orcid}
                              maxLength={20}
                              showCounter={false}
                              placeholder="0000-0000-0000-0000"
                              onChange={(e) => {
                                const copia = [...colaboradoresExternos];
                                copia[idx].orcid = e.target.value;
                                setColaboradoresExternos(copia);
                              }}
                            />
                          </td>
                          <td>
                            <LimitedInput 
                              type="text" 
                              className="form-table-input"
                              value={col.institucion}
                              maxLength={100}
                              showCounter={false}
                              onChange={(e) => {
                                const copia = [...colaboradoresExternos];
                                copia[idx].institucion = e.target.value;
                                setColaboradoresExternos(copia);
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-remove-table-row"
                              title="Eliminar colaborador externo"
                              onClick={() => setColaboradoresExternos(colaboradoresExternos.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  type="button" 
                  className="btn-add-table-row"
                  onClick={() => setColaboradoresExternos([...colaboradoresExternos, { id: Date.now(), nombre: '', orcid: '', institucion: '' }])}
                >
                  + Insertar fila en Colaboradores Externos
                </button>
              </div>
            )}

            {/* ========================================================
                PASO 8: Problema de Investigación y su Importancia
                ======================================================== */}
            {pasoActual === 8 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Problema de investigación y su importancia</h1>
                <p className="form-field-hint">
                  Defina con precisión el objeto de estudio identificando la carencia de conocimiento o la necesidad práctica a resolver. Justifique el estudio mediante criterios de relevancia social, implicaciones prácticas y valor teórico (Máximo 3 páginas / 4000 caracteresD).
                </p>
                <LimitedTextarea
                  rows={14}
                  maxLength={4000}
                  className="form-text-area"
                  placeholder="Describa aquí el problema de investigación y su importancia..."
                  value={problemaInvestigacion}
                  onChange={(e) => setProblemaInvestigacion(e.target.value)}
                />
              </div>
            )}

            {/* ========================================================
                PASO 9: Objetivos del Proyecto
                ======================================================== */}
            {pasoActual === 9 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Objetivos del Proyecto</h1>

                <div className="form-group-block">
                  <LimitedTextarea
                    label="Objetivo general"
                    rows={3}
                    maxLength={2000}
                    required
                    className="form-text-area"
                    placeholder="Describa aquí el objetivo general..."
                    value={objetivoGeneral}
                    onChange={(e) => setObjetivoGeneral(e.target.value)}
                  />
                </div>

                <div className="form-group-block">
                  <label className="form-field-label">Objetivos específicos: *</label>
                  {objetivosEspecificos.map((obj, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <LimitedTextarea
                            label={`Objetivo específico ${i + 1}`}
                            rows={2}
                            maxLength={1000}
                            className="form-text-area"
                            value={obj}
                            onChange={(e) => {
                              const copia = [...objetivosEspecificos];
                              copia[i] = e.target.value;
                              setObjetivosEspecificos(copia);
                            }}
                          />
                        </div>
                        {objetivosEspecificos.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon-action btn-icon-delete"
                            style={{ marginTop: '24px' }}
                            onClick={() => setObjetivosEspecificos(objetivosEspecificos.filter((_, idx) => idx !== i))}
                            title="Eliminar objetivo"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn-add-table-row"
                    onClick={() => setObjetivosEspecificos([...objetivosEspecificos, ''])}
                  >
                    + Agregar Objetivo Específico
                  </button>

                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔗</span> Los objetivos específicos definidos aquí están vinculados directamente con el <strong>Paso 12 (Plan de Acción y Cronograma)</strong>.
                    </span>
                    <button
                      type="button"
                      className="btn-link-action"
                      style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setPasoActual(12)}
                    >
                      Ir a Paso 12 (Cronograma) →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 10: Estado del Arte
                ======================================================== */}
            {pasoActual === 10 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Estado del Arte</h1>
                <p className="form-field-hint">
                  Analice las teorías actualizadas, investigaciones, antecedentes y metodologías previas (nacionales e internacionales). Como requisito técnico, indique al menos 15 referencias bibliográficas de fuentes primarias publicadas en los últimos cinco años (Scopus / Web of Science). Máximo 8000 caracteres.
                </p>
                <LimitedTextarea
                  rows={12}
                  maxLength={8000}
                  className="form-text-area"
                  placeholder="Describa aquí el estado del arte..."
                  value={estadoArte}
                  onChange={(e) => setEstadoArte(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <span className="badge-status badge-success" style={{ padding: '6px 12px' }}>
                    ✔ Mínimo 15 referencias (Scopus/WoS)
                  </span>
                  <span className="badge-status badge-info" style={{ padding: '6px 12px' }}>
                    Muestra Completa
                  </span>
                </div>
              </div>
            )}

            {/* ========================================================
                PASO 11: Metodología
                ======================================================== */}
            {pasoActual === 11 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Metodología</h1>
                <p className="form-field-hint">
                  Presente el diseño de investigación y el enfoque seleccionado para resolver el problema. Detalle sistemáticamente los procedimientos, técnicas e instrumentos para la recolección y análisis de datos, asegurando su validez y confiabilidad técnica (Máximo 6000 caracteres).
                </p>
                <LimitedTextarea
                  rows={14}
                  maxLength={6000}
                  className="form-text-area"
                  placeholder="Describa aquí la metodología..."
                  value={metodologia}
                  onChange={(e) => setMetodologia(e.target.value)}
                />
              </div>
            )}

            {/* ========================================================
                PASO 12: Plan de Acción y Plan de Gestión de Riesgos
                ======================================================== */}
            {pasoActual === 12 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Plan de Acción y Plan de Gestión de Riesgos</h1>
                <p className="form-field-hint" style={{ marginBottom: '16px' }}>
                  Detalle el cronograma de actividades asociadas a los objetivos específicos y la matriz de identificación y mitigación de riesgos del proyecto.
                </p>

                <div style={{ marginBottom: "14px", marginTop: "8px" }}>
                  <h2 className="section-title-h2" style={{ margin: 0, fontSize: '16px' }}>
                    3. Plan de Acción y Matriz de Riesgos
                  </h2>
                </div>

                {/* Panel de Objetivos Específicos Vinculados desde Paso 9 */}
                <div style={{
                  marginBottom: '16px',
                  padding: '14px 18px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span> Objetivos Específicos Vinculados (Paso 9)
                    </div>
                    <button 
                      type="button" 
                      className="btn-link-action"
                      style={{ fontSize: '12px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                      onClick={() => setPasoActual(9)}
                      title="Ir a Paso 9 para agregar o editar los objetivos específicos"
                    >
                      ✏️ Editar objetivos en Paso 9
                    </button>
                  </div>
                  {objetivosEspecificos.filter(o => o && o.trim()).length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                      ⚠️ Aún no se han redactado objetivos específicos en el <strong>Paso 9</strong>. Haga clic en <em>"Editar objetivos en Paso 9"</em> para agregarlos y vincularlos a cada actividad del cronograma.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {objetivosEspecificos.map((oe, idx) => {
                        const texto = (oe || '').trim();
                        if (!texto) return null;
                        const clave = `OE ${idx + 1}`;
                        const cant = actividadesCronograma.filter(a => (a.obj || a.objetivo) === clave).length;
                        return (
                          <div key={idx} style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '10px 12px',
                            fontSize: '12px',
                            lineHeight: 1.45,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ color: '#002855', fontSize: '13px' }}>{clave}</strong>
                              <span style={{
                                fontSize: '11px',
                                backgroundColor: cant > 0 ? '#dcfce7' : '#fef3c7',
                                color: cant > 0 ? '#166534' : '#92400e',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600
                              }}>
                                {cant} {cant === 1 ? 'actividad' : 'actividades'}
                              </span>
                            </div>
                            <div style={{ color: '#334155' }}>{texto}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="table-responsive-container" style={{ overflowX: 'auto', marginBottom: '14px' }}>
                  <table className="institucional-data-table" style={{ minWidth: numAniosCronograma === 3 ? '2200px' : numAniosCronograma === 2 ? '1800px' : '1400px' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ width: '80px', minWidth: '80px' }}>OBJETIVO</th>
                        <th rowSpan={2} style={{ minWidth: '150px' }}>ACTIVIDADES</th>
                        <th rowSpan={2} style={{ minWidth: '130px' }}>RESULTADO ESPERADO</th>
                        <th rowSpan={2} style={{ width: "140px", minWidth: "140px" }}>PARTICIPANTES</th>
                        <th rowSpan={2} style={{ width: '90px', minWidth: '90px' }}>RESPONSABILIDAD</th>
                        <th rowSpan={2} style={{ minWidth: '130px' }}>RIESGOS IDENTIFICADOS</th>
                        <th rowSpan={2} style={{ minWidth: '130px' }}>MEDIDAS DE MITIGACIÓN</th>
                        <th rowSpan={2} style={{ width: "140px", minWidth: "140px" }}>RESPONSABLE DE GESTIÓN</th>
                        <th rowSpan={2} style={{ width: '70px', minWidth: '70px', textAlign: 'center' }}>MES INICIO</th>
                        <th rowSpan={2} style={{ width: '70px', minWidth: '70px', textAlign: 'center' }}>DURACIÓN (MESES)</th>
                        {Array.from({ length: numAniosCronograma }, (_, a) => (
                          <th key={`anio-${a+1}`} colSpan={12} style={{ textAlign: 'center' }}>{`AÑO ${a + 1}`}</th>
                        ))}
                        <th rowSpan={2} style={{ width: '40px', textAlign: 'center' }}></th>
                      </tr>
                      <tr>
                        {Array.from({ length: numAniosCronograma }, (_, a) =>
                          Array.from({ length: 12 }, (_, m) => (
                            <th key={`a${a+1}-m${m+1}`} style={{ width: '28px', minWidth: '28px', textAlign: 'center', fontSize: '10px', padding: '2px' }}>
                              {m + 1}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {actividadesCronograma.length === 0 ? (
                        <tr>
                          <td colSpan={11 + numAniosCronograma * 12} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                            No hay actividades registradas aún en el cronograma. Haz clic en <strong>+ Agregar Actividad</strong> para comenzar.
                          </td>
                        </tr>
                      ) : (
                        actividadesCronograma.map((act, i) => (
                          <tr key={act.id || i}>
                            {/* 1. OBJETIVO */}
                            <td>
                              {objetivosEspecificos.filter(o => o && o.trim()).length > 0 ? (
                                <select 
                                  className="form-table-input"
                                  value={act.obj || act.objetivo || ''}
                                  style={{ background: '#ffffff', cursor: 'pointer', fontSize: '12px', width: '100%', fontWeight: 500 }}
                                  onChange={(e) => {
                                    const copia = [...actividadesCronograma];
                                    copia[i].obj = e.target.value;
                                    copia[i].objetivo = e.target.value;
                                    setActividadesCronograma(copia);
                                  }}
                                >
                                  <option value="">— OE —</option>
                                  {objetivosEspecificos.map((oe, idx) => {
                                    const tLimpio = (oe || '').trim();
                                    if (!tLimpio) return null;
                                    const clave = `OE ${idx + 1}`;
                                    const tCorto = tLimpio.length > 40 ? `${tLimpio.substring(0, 40)}...` : tLimpio;
                                    return (
                                      <option key={idx} value={clave} title={`${clave}: ${tLimpio}`}>
                                        {clave}: {tCorto}
                                      </option>
                                    );
                                  })}
                                  {(act.obj || act.objetivo) && !objetivosEspecificos.some((_, idx) => `OE ${idx + 1}` === (act.obj || act.objetivo)) && (
                                    <option value={act.obj || act.objetivo}>{act.obj || act.objetivo}</option>
                                  )}
                                </select>
                              ) : (
                                <LimitedInput 
                                  type="text" 
                                  className="form-table-input"
                                  value={act.obj || act.objetivo || ''}
                                  maxLength={30}
                                  showCounter={false}
                                  placeholder="OE 1"
                                  onChange={(e) => {
                                    const copia = [...actividadesCronograma];
                                    copia[i].obj = e.target.value;
                                    copia[i].objetivo = e.target.value;
                                    setActividadesCronograma(copia);
                                  }}
                                />
                              )}
                            </td>

                            {/* 2. ACTIVIDADES */}
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={act.actividad || ''}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Descripción de la actividad principal..."
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].actividad = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              />
                            </td>

                            {/* 3. RESULTADO ESPERADO */}
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={act.resultado || act.entregable || ''}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Resultado o entregable técnico..."
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].resultado = e.target.value;
                                  copia[i].entregable = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              />
                            </td>

                            {/* 4. PARTICIPANTES */}
                            <td>
                              <select 
                                className="form-table-input"
                                value={act.participante || act.responsable || ''}
                                style={{ background: '#ffffff', cursor: 'pointer' }}
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].participante = e.target.value;
                                  copia[i].responsable = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              >
                                <option value="">— Seleccionar —</option>
                                {obtenerIntegrantesLista().map((int, idx) => (
                                  <option key={idx} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>
                                ))}
                              </select>
                            </td>

                            {/* 5. RESPONSABILIDAD */}
                            <td>
                              <select 
                                className="form-table-input"
                                value={act.responsabilidad || ''}
                                style={{ background: '#ffffff', cursor: 'pointer' }}
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].responsabilidad = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              >
                                <option value="">—</option>
                                <option value="Ejecuta">Ejecuta</option>
                                <option value="Supervisa">Supervisa</option>
                                <option value="Colabora">Colabora</option>
                              </select>
                            </td>

                            {/* 6. RIESGOS IDENTIFICADOS */}
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={act.riesgo || ''}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Riesgo identificado..."
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].riesgo = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              />
                            </td>

                            {/* 7. MEDIDAS DE MITIGACIÓN */}
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={act.mitigacion || ''}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Medidas de mitigación..."
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].mitigacion = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              />
                            </td>

                            {/* 8. RESPONSABLE DE GESTIÓN */}
                            <td>
                              <select 
                                className="form-table-input"
                                value={act.responsableGestion || ''}
                                style={{ background: '#ffffff', cursor: 'pointer' }}
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].responsableGestion = e.target.value;
                                  setActividadesCronograma(copia);
                                }}
                              >
                                <option value="">— Seleccionar —</option>
                                {obtenerIntegrantesLista().map((int, idx) => (
                                  <option key={idx} value={int.iniciales}>{int.iniciales} — {int.nombre} ({int.rol})</option>
                                ))}
                              </select>
                            </td>

                            {/* 9. MES INICIO */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                min="1" 
                                max="36" 
                                className="form-table-input" 
                                style={{ width: '50px', textAlign: 'center' }} 
                                value={act.mesInicio || ''} 
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].mesInicio = e.target.value;
                                  setActividadesCronograma(copia);
                                }} 
                              />
                            </td>

                            {/* 10. DURACIÓN (MESES) */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                min="1" 
                                max="36" 
                                className="form-table-input" 
                                style={{ width: '50px', textAlign: 'center' }} 
                                value={act.duracionMesesAct || ''} 
                                onChange={(e) => {
                                  const copia = [...actividadesCronograma];
                                  copia[i].duracionMesesAct = e.target.value;
                                  setActividadesCronograma(copia);
                                }} 
                              />
                            </td>

                            {/* 11. CHECKBOXES POR MES */}
                            {Array.from({ length: numAniosCronograma }, (_, a) =>
                              Array.from({ length: 12 }, (_, m) => {
                                const checked = act.periodoEjecucion?.[`a${a+1}`]?.[`m${m+1}`] || false;
                                return (
                                  <td key={`${act.id || i}-a${a+1}-m${m+1}`} style={{ textAlign: 'center', padding: '1px' }}>
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

                            {/* 12. ACCIÓN ELIMINAR */}
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn-icon-action btn-icon-delete"
                                title="Eliminar actividad"
                                aria-label={`Eliminar fila de actividad ${i + 1}`}
                                onClick={() => handleEliminarActividad(act.id || i)}
                              >
                                <span aria-hidden="true">✕</span>
                                <span className="sr-only">Eliminar actividad</span>
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

                {/* Recordatorio VIE */}
                <div className="vie-reminder-box" style={{ marginTop: '14px' }}>
                  <span className="reminder-icon">💡</span>
                  <div className="reminder-text">
                    <strong>Recordatorio VIE:</strong> Dentro de la programación de actividades se deben incluir obligatoriamente las giras de campo y los informes de avance. Además, deberá registrarse cualquier pasantía nacional o internacional que se requiera para el desarrollo del proyecto.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', color: '#002855', margin: 0, fontWeight: 700 }}>
                    2. Identificación y Mitigación de Riesgos
                  </h3>
                  <button 
                    type="button" 
                    className="btn-link-action"
                    style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setPasoActual(7)}
                    title="Ir al Paso 7 para incorporar nuevos investigadores o colaboradores"
                  >
                    + Añadir / Gestionar miembros del equipo
                  </button>
                </div>
                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th>Riesgo Identificado (Técnico / Operativo / Financiero)</th>
                        <th>Estrategia de mitigación / Plan de contingencia</th>
                        <th style={{ width: '48px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riesgosMitigacion.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                            No hay riesgos registrados. Haga clic en <strong>+ Agregar Riesgo y Estrategia</strong> para comenzar.
                          </td>
                        </tr>
                      ) : (
                        riesgosMitigacion.map((r, i) => (
                          <tr key={r.id || i}>
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={r.riesgo}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Riesgo identificado..."
                                onChange={(e) => {
                                  const copia = [...riesgosMitigacion];
                                  copia[i].riesgo = e.target.value;
                                  setRiesgosMitigacion(copia);
                                }}
                              />
                            </td>
                            <td>
                              <LimitedInput 
                                type="text" 
                                className="form-table-input"
                                value={r.mitigacion}
                                maxLength={500}
                                showCounter={false}
                                placeholder="Estrategia de mitigación..."
                                onChange={(e) => {
                                  const copia = [...riesgosMitigacion];
                                  copia[i].mitigacion = e.target.value;
                                  setRiesgosMitigacion(copia);
                                }}
                              />
                            </td>
                            <td>
                              <select 
                                className="form-table-input"
                                value={r.responsable || ''}
                                style={{ background: '#ffffff', cursor: 'pointer' }}
                                onChange={(e) => {
                                  const copia = [...riesgosMitigacion];
                                  copia[i].responsable = e.target.value;
                                  setRiesgosMitigacion(copia);
                                }}
                              >
                                <option value="">— Seleccionar —</option>
                                {investigadoresTEC.filter(inv => inv.nombre).map((inv, idx) => (
                                  <option key={inv.id || idx} value={inv.nombre}>
                                    {inv.nombre} ({inv.rol || 'TEC'})
                                  </option>
                                ))}
                                {colaboradoresExternos.filter(col => col.nombre).map((col, idx) => (
                                  <option key={col.id || idx} value={col.nombre}>
                                    {col.nombre} (Externo)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn-remove-table-row"
                                title="Eliminar riesgo"
                                onClick={() => setRiesgosMitigacion(riesgosMitigacion.filter((_, idx) => idx !== i))}
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
                  onClick={() => setRiesgosMitigacion([
                    ...riesgosMitigacion,
                    { id: Date.now(), riesgo: '', mitigacion: '' }
                  ])}
                >
                  + Agregar Riesgo y Estrategia
                </button>
              </div>
            )}

            {/* ========================================================
                PASO 13: Presupuesto Plurianual y Fuentes Adicionales
                ======================================================== */}
            {pasoActual === 13 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Presupuesto Plurianual y Fuentes Adicionales</h1>

                <h3 style={{ fontSize: '15px', color: '#002855', marginBottom: '8px' }}>
                  Cuadro 4. Presupuesto solicitado por año (Recursos VIE)
                </h3>
                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th>Año</th>
                        <th>Presupuesto Operativo (₡)</th>
                        <th>Bienes Duraderos / Equipamiento (₡)</th>
                        <th>Total Solicitado (₡)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presupuestoAnual.map((p, i) => {
                        const totalFila = (Number(p.operativo) || 0) + (Number(p.duradero) || 0);
                        return (
                          <tr key={i}>
                            <td><strong>{p.ano}</strong></td>
                            <td>
                              <LimitedInput
                                type="number"
                                min="0"
                                placeholder="0"
                                showCounter={false}
                                className="form-table-input"
                                value={p.operativo}
                                onChange={(e) => {
                                  const copia = [...presupuestoAnual];
                                  copia[i].operativo = e.target.value;
                                  setPresupuestoAnual(copia);
                                }}
                              />
                            </td>
                            <td>
                              <LimitedInput
                                type="number"
                                min="0"
                                placeholder="0"
                                showCounter={false}
                                className="form-table-input"
                                value={p.duradero}
                                onChange={(e) => {
                                  const copia = [...presupuestoAnual];
                                  copia[i].duradero = e.target.value;
                                  setPresupuestoAnual(copia);
                                }}
                              />
                            </td>
                            <td style={{ fontWeight: 600, color: '#0369A1' }}>
                              ₡ {totalFila.toLocaleString('es-CR')}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                        <td>TOTAL</td>
                        <td>₡ {presupuestoAnual.reduce((acc, p) => acc + (Number(p.operativo) || 0), 0).toLocaleString('es-CR')}</td>
                        <td>₡ {presupuestoAnual.reduce((acc, p) => acc + (Number(p.duradero) || 0), 0).toLocaleString('es-CR')}</td>
                        <td style={{ color: '#002855' }}>
                          ₡ {(
                            presupuestoAnual.reduce((acc, p) => acc + (Number(p.operativo) || 0), 0) +
                            presupuestoAnual.reduce((acc, p) => acc + (Number(p.duradero) || 0), 0)
                          ).toLocaleString('es-CR')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 style={{ fontSize: '15px', color: '#002855', marginTop: '24px', marginBottom: '8px' }}>
                  Cuadro 5. Desglose de fuente de recursos financieros adicionales
                </h3>
                <div className="table-responsive-container">
                  <table className="institucional-data-table">
                    <thead>
                      <tr>
                        <th>Desglose de Fuente</th>
                        <th>Año 1 (₡)</th>
                        <th>Año 2 (₡)</th>
                        <th>Año 3 (₡)</th>
                        <th>Oficio Aprobación *</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Financiamiento externo</td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            placeholder="0"
                            value={fuentesAdicionales.externo.ano1}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              externo: { ...fuentesAdicionales.externo, ano1: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            placeholder="0"
                            value={fuentesAdicionales.externo.ano2}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              externo: { ...fuentesAdicionales.externo, ano2: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            placeholder="0"
                            value={fuentesAdicionales.externo.ano3}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              externo: { ...fuentesAdicionales.externo, ano3: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="text" 
                            maxLength={50} 
                            showCounter={false}
                            className="form-table-input" 
                            placeholder="Oficio..."
                            value={fuentesAdicionales.externo.oficio}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              externo: { ...fuentesAdicionales.externo, oficio: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Contrapartida (Escuela/Centro)</td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            value={fuentesAdicionales.contrapartida.ano1}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              contrapartida: { ...fuentesAdicionales.contrapartida, ano1: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            value={fuentesAdicionales.contrapartida.ano2}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              contrapartida: { ...fuentesAdicionales.contrapartida, ano2: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input" 
                            placeholder="0"
                            value={fuentesAdicionales.contrapartida.ano3}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              contrapartida: { ...fuentesAdicionales.contrapartida, ano3: e.target.value }
                            })}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="text" 
                            maxLength={50} 
                            showCounter={false}
                            className="form-table-input" 
                            value={fuentesAdicionales.contrapartida.oficio}
                            onChange={(e) => setFuentesAdicionales({
                              ...fuentesAdicionales,
                              contrapartida: { ...fuentesAdicionales.contrapartida, oficio: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <input 
                  type="file" 
                  ref={fileInputPlanRef}
                  style={{ display: 'none' }}
                  accept=".xlsx,.xls,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setArchivoPlanRiesgos({
                        nombre: f.name,
                        tamano: `${(f.size / 1024 / 1024).toFixed(1)} MB`
                      });
                    }
                  }}
                />

                {archivoPlanRiesgos ? (
                  <div style={{ marginTop: '20px', padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>📊</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>{archivoPlanRiesgos.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Archivo adjunto ({archivoPlanRiesgos.tamano})</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-table-action" onClick={() => fileInputPlanRef.current && fileInputPlanRef.current.click()}>
                        Reemplazar
                      </button>
                      <button 
                        type="button" 
                        className="btn-table-action" 
                        style={{ color: '#ef4444', borderColor: '#fca5a5' }} 
                        onClick={() => setArchivoPlanRiesgos(null)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    style={{
                      marginTop: '20px',
                      padding: '16px',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                    onClick={() => fileInputPlanRef.current && fileInputPlanRef.current.click()}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>📊</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>+ Adjuntar Plan de Acción y Gestión de Riesgos</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Formatos aceptados: Excel (.xlsx, .xls) o PDF firmado (Máx. 10MB)</div>
                      </div>
                    </div>
                    <button type="button" className="btn-table-action btn-table-action-primary">
                      Subir archivo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                PASO 14a: Compromisos para Investigación Básica / Aplicada
                (Se activa cuando modalidad !== 'Desarrollo tecnológico')
                ======================================================== */}
            {pasoActual === 14 && !esDesarrolloTecnologico && (
              <div className="step-content-pane">
                <h1 className="step-main-title">1. Compromisos de producción académica y tecnológica</h1>
                <div className="step-subheading-tag">
                  1.1. Para proyectos de investigación básica, aplicada o ambas
                </div>
                <p className="form-field-hint" style={{ marginBottom: '18px' }}>
                  De acuerdo con la normativa institucional de la VIE, la cantidad de productos académicos comprometidos se define en función del total de horas semanales asignadas a la propuesta y es requisito indispensable para la liquidación técnica y el cierre del proyecto en el repositorio institucional.
                </p>

                

                {/* Sección a: Compromiso según carga horaria (Sólo 3 rangos según normativa) */}
                <h3 className="compromiso-section-header">
                  a. Compromiso de productos según carga académica propuesta en la iniciativa
                </h3>
                <div className="compromiso-table-wrapper">
                  <table className="compromiso-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32%' }}>Total de horas</th>
                        <th style={{ width: '48%' }}>Productos mínimos requeridos</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Selección del compromiso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { rango: '1 a 10 horas', desc: '1 opción', sugerido: totalHorasSemanales <= 10 },
                        { rango: '11 a 20 horas', desc: '2 opciones (en cualquier combinación)', sugerido: totalHorasSemanales > 10 && totalHorasSemanales <= 20 },
                        { rango: '21 a 30 horas', desc: '3 opciones (en cualquier combinación)', sugerido: totalHorasSemanales > 20 }
                      ].map((item) => {
                        const esSeleccionado = (rangoHorasCompromiso || (item.sugerido ? item.rango : '')) === item.rango;
                        return (
                          <tr 
                            key={item.rango}
                            className={`clickable-row ${esSeleccionado ? 'is-selected' : ''}`}
                            onClick={() => setRangoHorasCompromiso(item.rango)}
                          >
                            <td><strong>{item.rango}</strong></td>
                            <td>{item.desc}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className={`compromiso-selection-radio ${esSeleccionado ? 'selected' : 'unselected'}`}>
                                <input 
                                  type="radio" 
                                  name="rangoHoras14a" 
                                  checked={esSeleccionado} 
                                  onChange={() => setRangoHorasCompromiso(item.rango)} 
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>{esSeleccionado ? 'Seleccionado' : 'Seleccionar'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sección b: Selección de productos académicos */}
                <h3 className="compromiso-section-header">
                  b. Selección de productos académicos
                </h3>
                <div className="compromiso-table-wrapper">
                  <table className="compromiso-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%', textAlign: 'center' }}>Selección</th>
                        <th style={{ width: '12%' }}>Cantidad</th>
                        <th style={{ width: '45%' }}>Opción de Producto</th>
                        <th style={{ width: '35%' }}>Objetivo específico</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={productos14a.opcion1?.check || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setProductos14a(prev => ({
                                ...prev,
                                opcion1: {
                                  ...prev.opcion1,
                                  check: isChecked,
                                  cantidad: isChecked ? (prev.opcion1?.cantidad >= 1 ? prev.opcion1.cantidad : 1) : 0
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input"
                            showCounter={false}
                            value={productos14a.opcion1?.cantidad ?? 0}
                            onChange={(e) => {
                              const cant = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setProductos14a(prev => ({
                                ...prev,
                                opcion1: {
                                  ...prev.opcion1,
                                  cantidad: cant,
                                  check: cant >= 1
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <strong>Opción 1:</strong> Un (1) artículo científico sometido en revista o conferencia indexada en Web of Science (WoS) o Scopus
                        </td>
                        <td>
                          <LimitedInput 
                            type="text"
                            className="form-table-input"
                            maxLength={150}
                            showCounter={false}
                            placeholder="Escriba objetivo específico o consecutivo..."
                            value={productos14a.opcion1?.objetivo || ''}
                            onChange={(e) => setProductos14a({
                              ...productos14a,
                              opcion1: { ...productos14a.opcion1, objetivo: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={productos14a.opcion2?.check || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setProductos14a(prev => ({
                                ...prev,
                                opcion2: {
                                  ...prev.opcion2,
                                  check: isChecked,
                                  cantidad: isChecked ? (prev.opcion2?.cantidad >= 1 ? prev.opcion2.cantidad : 2) : 0
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input"
                            showCounter={false}
                            value={productos14a.opcion2?.cantidad ?? 0}
                            onChange={(e) => {
                              const cant = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setProductos14a(prev => ({
                                ...prev,
                                opcion2: {
                                  ...prev.opcion2,
                                  cantidad: cant,
                                  check: cant >= 1
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <strong>Opción 2:</strong> Dos (2) artículos científicos sometidos en revistas indexadas en SciELO, Redalyc, ESCI, DOAJ, o memorias con Consejo Editorial
                        </td>
                        <td>
                          <LimitedInput 
                            type="text"
                            className="form-table-input"
                            maxLength={150}
                            showCounter={false}
                            placeholder="Escriba objetivo específico o consecutivo..."
                            value={productos14a.opcion2?.objetivo || ''}
                            onChange={(e) => setProductos14a({
                              ...productos14a,
                              opcion2: { ...productos14a.opcion2, objetivo: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={productos14a.opcion3?.check || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setProductos14a(prev => ({
                                ...prev,
                                opcion3: {
                                  ...prev.opcion3,
                                  check: isChecked,
                                  cantidad: isChecked ? (prev.opcion3?.cantidad >= 1 ? prev.opcion3.cantidad : 1) : 0
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <LimitedInput 
                            type="number" 
                            min="0" 
                            className="form-table-input"
                            showCounter={false}
                            value={productos14a.opcion3?.cantidad ?? 0}
                            onChange={(e) => {
                              const cant = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setProductos14a(prev => ({
                                ...prev,
                                opcion3: {
                                  ...prev.opcion3,
                                  cantidad: cant,
                                  check: cant >= 1
                                }
                              }));
                            }}
                          />
                        </td>
                        <td>
                          <strong>Opción 3:</strong> Un (1) Libro o Capítulo de libro técnico especializado publicado por editorial de reconocido prestigio
                        </td>
                        <td>
                          <LimitedInput 
                            type="text"
                            className="form-table-input"
                            maxLength={150}
                            showCounter={false}
                            placeholder="Escriba objetivo específico o consecutivo..."
                            value={productos14a.opcion3?.objetivo || ''}
                            onChange={(e) => setProductos14a({
                              ...productos14a,
                              opcion3: { ...productos14a.opcion3, objetivo: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Sección c: Otros resultados complementarios */}
                <h3 className="compromiso-section-header">
                  c. Otros resultados y activos tecnológicos (Complementarios)
                </h3>
                <div className="adicionales-container">
                  <div className="adicional-item-row">
                    <span className="adicional-label">• Producto adicional 1:</span>
                    <LimitedInput 
                      maxLength={300}
                      showCounter={false}
                      className="form-table-input"
                      placeholder="Descripción del resultado complementario (e.g. manual técnico, taller)..."
                      value={productos14a.adicional1 || ''}
                      onChange={(e) => setProductos14a({ ...productos14a, adicional1: e.target.value })}
                    />
                  </div>
                  <div className="adicional-item-row">
                    <span className="adicional-label">• Producto adicional 2:</span>
                    <LimitedInput 
                      maxLength={300}
                      showCounter={false}
                      className="form-table-input"
                      placeholder="Descripción del resultado complementario (e.g. base de datos abierta, informe)..."
                      value={productos14a.adicional2 || ''}
                      onChange={(e) => setProductos14a({ ...productos14a, adicional2: e.target.value })}
                    />
                  </div>
                </div>

                
              </div>
            )}

            {/* ========================================================
                PASO 14b: Compromisos para Desarrollo Tecnológico
                (Se activa cuando modalidad === 'Desarrollo tecnológico')
                ======================================================== */}
            {pasoActual === 14 && esDesarrolloTecnologico && (
              <div className="step-content-pane">
                <h1 className="step-main-title">1. Compromisos de producción académica y tecnológica</h1>
                <div className="step-subheading-tag" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                  1.1. Para proyectos de desarrollo tecnológico
                </div>
                <p className="form-field-hint" style={{ marginBottom: '18px' }}>
                  De acuerdo con la normativa institucional de la VIE y el Centro de Vinculación, los proyectos de Desarrollo Tecnológico deben seleccionar obligatoriamente al menos un activo de propiedad industrial amparado en dictamen oficial (Requisito 5.5.a) y productos académicos complementarios (Requisito 5.5.b).
                </p>

                

                {/* Sección a: Compromiso según carga horaria para desarrollo tecnológico (3 rangos oficiales) */}
                <h3 className="compromiso-section-header">
                  a. Compromiso de productos según carga académica propuesta en la iniciativa
                </h3>
                <div className="compromiso-table-wrapper">
                  <table className="compromiso-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32%' }}>Total de horas</th>
                        <th style={{ width: '48%' }}>Productos mínimos requeridos</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Selección del compromiso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { rango: '1 a 10 horas', desc: '2 opciones (en cualquier combinación)', sugerido: totalHorasSemanales <= 10 },
                        { rango: '11 a 20 horas', desc: '3 opciones (en cualquier combinación)', sugerido: totalHorasSemanales > 10 && totalHorasSemanales <= 20 },
                        { rango: '21 a 30 horas', desc: '4 opciones (en cualquier combinación)', sugerido: totalHorasSemanales > 20 }
                      ].map((item) => {
                        const esSeleccionado = (rangoHorasCompromiso || (item.sugerido ? item.rango : '')) === item.rango;
                        return (
                          <tr 
                            key={item.rango}
                            className={`clickable-row ${esSeleccionado ? 'is-selected' : ''}`}
                            onClick={() => setRangoHorasCompromiso(item.rango)}
                          >
                            <td><strong>{item.rango}</strong></td>
                            <td>{item.desc}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className={`compromiso-selection-radio ${esSeleccionado ? 'selected' : 'unselected'}`}>
                                <input 
                                  type="radio" 
                                  name="rangoHoras14b" 
                                  checked={esSeleccionado} 
                                  onChange={() => setRangoHorasCompromiso(item.rango)} 
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>{esSeleccionado ? 'Seleccionado' : 'Seleccionar'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sección b: Selección de activos de propiedad industrial (Requisito 5.5 a) */}
                <h3 className="compromiso-section-header">
                  b. Selección de activos de propiedad industrial (Requisito 5.5 a)
                </h3>
                <div className="compromiso-table-wrapper">
                  <table className="compromiso-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%', textAlign: 'center' }}>Selección</th>
                        <th style={{ width: '10%' }}>Cantidad</th>
                        <th style={{ width: '50%' }}>Tipo de activo (Opción Mínima Obligatoria)</th>
                        <th style={{ width: '32%' }}>Consecutivo del dictamen (Centro de Vinculación) *</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'patente', nombre: 'Activo 1: Patente de invención o modelo de utilidad (solicitud presentada o concedida)', ph: 'CV-DICT-2026-004' },
                        { key: 'diseno', nombre: 'Activo 2: Diseño industrial registrado ante el Registro de la Propiedad', ph: 'CV-DIS-2026-012' },
                        { key: 'software', nombre: 'Activo 3: Desarrollo de Software institucional (código fuente, manuales y depósito)', ph: 'REG-SW-TEC-2027-01' },
                        { key: 'secreto', nombre: 'Activo 4: Secreto empresarial o Know-How formalizado bajo acuerdo confidencial', ph: 'CV-CONF-2026-009' },
                        { key: 'obtencion', nombre: 'Activo 5: Obtención Vegetal / Variedad protegida (certificado OPOV / Semillas)', ph: 'CV-VAR-2026-003' },
                        { key: 'marca', nombre: 'Activo 6: Marca comercial o signo distintivo tecnológico vinculado al proyecto', ph: 'CV-MAR-2026-015' },
                        { key: 'circuito', nombre: 'Activo 7: Esquema de trazado de circuitos integrados con dictamen técnico', ph: 'CV-CIR-2026-001' },
                        { key: 'otros', nombre: 'Activo 8: Otros activos tecnológicos protegibles amparados con dictamen vinculante', ph: 'CV-DICT-2026-XXX' }
                      ].map((act) => {
                        const data = productos14b[act.key] || { check: false, cantidad: 0, consecutivo: '' };
                        return (
                          <tr key={act.key} className={data.check ? 'is-selected' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={data.check}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setProductos14b(prev => ({
                                    ...prev,
                                    [act.key]: {
                                      ...data,
                                      check: isChecked,
                                      cantidad: isChecked ? (data.cantidad >= 1 ? data.cantidad : 1) : 0
                                    }
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <LimitedInput 
                                type="number" 
                                min="0" 
                                className="form-table-input"
                                showCounter={false}
                                value={data.cantidad ?? 0}
                                onChange={(e) => {
                                  const cant = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setProductos14b(prev => ({
                                    ...prev,
                                    [act.key]: {
                                      ...data,
                                      cantidad: cant,
                                      check: cant >= 1
                                    }
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <strong>{act.nombre.split(':')[0]}:</strong>{act.nombre.slice(act.nombre.indexOf(':') + 1)}
                            </td>
                            <td>
                              <LimitedInput 
                                type="text"
                                maxLength={80}
                                showCounter={false}
                                className="form-table-input"
                                placeholder={`Ej: ${act.ph}`}
                                value={data.consecutivo || ''}
                                onChange={(e) => setProductos14b({
                                  ...productos14b,
                                  [act.key]: { ...data, consecutivo: e.target.value }
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sección c: Selección de productos académicos (Requisito 5.5 b) */}
                <h3 className="compromiso-section-header">
                  c. Selección de productos académicos (Requisito 5.5 b)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  Cuadro 10. Selección del tipo de productos académicos para proyectos de desarrollo tecnológico
                </p>
                <div className="compromiso-table-wrapper">
                  <table className="compromiso-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%', textAlign: 'center' }}>Selección</th>
                        <th style={{ width: '10%' }}>Cantidad</th>
                        <th style={{ width: '47%' }}>Tipo de Producto</th>
                        <th style={{ width: '35%' }}>Objetivo específico asociado al producto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'articulo', opcion: 'Opción 1: Un (1) artículo publicado en revista indexada (WoS/Scopus/SciELO) o memoria con ISBN' },
                        { key: 'memoria', opcion: 'Opción 2: Dos (2) artículos en revistas indexadas o conferencias internacionales' },
                        { key: 'paquete', opcion: 'Opción 3: Un (1) paquete tecnológico transferible o prototipo validado (TRL 5+)' },
                        { key: 'norma', opcion: 'Opción 4: Norma técnica sometida ante entes competentes de reconocida reputación (INTECO u homologado)' }
                      ].map((prod) => {
                        const data = productos14b[prod.key] || { check: false, cantidad: 0, objetivo: '' };
                        const minCant = prod.key === 'memoria' ? 2 : 1;
                        return (
                          <tr key={prod.key} className={data.check ? 'is-selected' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={data.check}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setProductos14b(prev => ({
                                    ...prev,
                                    [prod.key]: {
                                      ...data,
                                      check: isChecked,
                                      cantidad: isChecked ? (data.cantidad >= 1 ? data.cantidad : minCant) : 0
                                    }
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <LimitedInput 
                                type="number" 
                                min="0" 
                                className="form-table-input"
                                showCounter={false}
                                value={data.cantidad ?? 0}
                                onChange={(e) => {
                                  const cant = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setProductos14b(prev => ({
                                    ...prev,
                                    [prod.key]: {
                                      ...data,
                                      cantidad: cant,
                                      check: cant >= 1
                                    }
                                  }));
                                }}
                              />
                            </td>
                            <td>
                              <strong>{prod.opcion.split(':')[0]}:</strong>{prod.opcion.slice(prod.opcion.indexOf(':') + 1)}
                            </td>
                            <td>
                              <LimitedInput 
                                type="text"
                                className="form-table-input"
                                maxLength={150}
                                showCounter={false}
                                placeholder="Escriba objetivo específico asociado..."
                                value={data.objetivo || ''}
                                onChange={(e) => setProductos14b({
                                  ...productos14b,
                                  [prod.key]: { ...data, objetivo: e.target.value }
                                })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                
              </div>
            )}

            {/* ========================================================
                PASO 15: Estrategia de Divulgación, Aspectos Éticos y Hoja de Ruta
                ======================================================== */}
            {pasoActual === 15 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Estrategia de Divulgación, Aspectos Éticos y Hoja de Ruta</h1>

                <h3 style={{ fontSize: '15px', color: '#002855', marginBottom: '8px' }}>
                  2. Estrategia de divulgación y socialización
                </h3>
                <div className="form-two-cols-row">
                  <div className="form-group-block">
                    <LimitedTextarea 
                      label="a. Divulgación científico / técnica (Congresos, charlas, SCOPUS)"
                      rows={2} 
                      maxLength={1000}
                      className="form-text-area"
                      value={divulgacion.cientifica}
                      onChange={(e) => setDivulgacion({ ...divulgacion, cientifica: e.target.value })}
                    />
                  </div>
                  <div className="form-group-block">
                    <LimitedTextarea 
                      label="b. Canales institucionales (Prensa TEC, página web institucional)"
                      rows={2} 
                      maxLength={1000}
                      className="form-text-area"
                      value={divulgacion.canalesInstitucionales}
                      onChange={(e) => setDivulgacion({ ...divulgacion, canalesInstitucionales: e.target.value })}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: '15px', color: '#002855', marginTop: '16px', marginBottom: '8px' }}>
                  3. Aspectos Éticos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'seresHumanos', label: 'a. ¿Incluye la participación directa o indirecta de seres humanos? (Reglamento CECIT-TEC)' },
                    { key: 'biodiversidad', label: 'b. ¿Involucra uso, manipulación o estudio de biodiversidad o recursos genéticos? (Comisión Institucional de Biodiversidad)' },
                    { key: 'animales', label: 'c. ¿Involucra uso o experimentación con animales vertebrados? (Reglamento CICUA)' },
                    { key: 'comunidadesIndigenas', label: 'd. ¿Involucra trabajo en o con territorios o comunidades indígenas?' }
                  ].map((item) => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#1e293b' }}>{item.label}</span>
                      <div className="toggle-btn-group">
                        <button 
                          type="button" 
                          className={`btn-toggle-option ${!aspectosEticos[item.key] ? 'active' : ''}`}
                          onClick={() => setAspectosEticos({ ...aspectosEticos, [item.key]: false })}
                        >
                          No
                        </button>
                        <button 
                          type="button" 
                          className={`btn-toggle-option ${aspectosEticos[item.key] ? 'active' : ''}`}
                          onClick={() => setAspectosEticos({ ...aspectosEticos, [item.key]: true })}
                        >
                          ✔ Sí
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '15px', color: '#002855', marginTop: '20px', marginBottom: '8px' }}>
                  4. Hoja de ruta
                </h3>
                <p className="form-field-hint">
                  Describa la proyección a mediano y largo plazo de la línea de investigación adscrita, así como los aportes estratégicos esperados (Máximo 4000 caracteres).
                </p>
                <LimitedTextarea 
                  rows={3} 
                  maxLength={4000}
                  className="form-text-area"
                  placeholder="Describa la proyección a mediano y largo plazo de la línea de investigación..."
                  value={hojaRuta}
                  onChange={(e) => setHojaRuta(e.target.value)}
                />
              </div>
            )}

            {/* ========================================================
                PASO 16: Resguardo, Referencias y Declaración Jurada
                ======================================================== */}
            {pasoActual === 16 && (
              <div className="step-content-pane">
                <h1 className="step-main-title">Resguardo, Referencias y Declaración Jurada</h1>

                <h3 style={{ fontSize: '15px', color: '#002855', marginBottom: '8px' }}>
                  5. Resguardo y depósito de productos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={resguardoCompromiso}
                      onChange={(e) => setResguardoCompromiso(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#0369A1' }}
                    />
                    <span>
                      a. Declaro conocer la obligatoriedad de depositar todos los productos, artículos y resultados derivados del proyecto en el Repositorio Institucional, conforme al Art. 44 del Reglamento de Investigación y Extensión.
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#1e293b', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={resguardoSoftware}
                      onChange={(e) => setResguardoSoftware(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#0369A1' }}
                    />
                    <span>
                      b. En caso de desarrollo software (código fuente y manuales) o bases de datos, asumo el compromiso de entregar el expediente técnico completo a la Dirección de Investigación para su debido registro.
                    </span>
                  </label>
                </div>

                <h3 style={{ fontSize: '15px', color: '#002855', marginBottom: '8px' }}>
                  6. Referencias
                </h3>
                <LimitedTextarea 
                  rows={4} 
                  maxLength={4000}
                  className="form-text-area"
                  value={referenciasBibliograficas}
                  onChange={(e) => setReferenciasBibliograficas(e.target.value)}
                />

                <h3 style={{ fontSize: '15px', color: '#002855', marginTop: '20px', marginBottom: '8px' }}>
                  7. Declaración jurada de veracidad y compromiso institucional
                </h3>
                <div className="legal-statement-box">
                  Por este medio, manifiesto y declaro bajo fe de juramento lo siguiente:
                  1. Que la información proporcionada y los compromisos adquiridos en esta ficha de propuesta para investigación son veraces propios del investigador y de la entidad académica con fines propios y lícitos.
                  2. Que los cronogramas adjuntos y las firmas digitales que respaldan este expediente han sido gestionados conforme a los requerimientos técnicos y administrativos de la VIE.
                  3. Que tengo pleno conocimiento de que la titularidad y protección de la propiedad intelectual de todos los productos, activos y resultados derivados de este proyecto se regirán por la normativa institucional, la legislación nacional vigente y las disposiciones derivadas de Vinculación.
                  Por lo tanto, asumo la responsabilidad directa por la gestión, ejecución y rendición de cuentas de las actividades aquí planificadas, así como por la veracidad de los informes técnicos y financieros que se deriven.
                </div>

                <div className="form-group-block" style={{ marginTop: '16px' }}>
                  <label className="form-field-label">Firma de la persona investigadora coordinadora:</label>
                  <div className="form-three-cols-row">
                    <div>
                      <LimitedInput 
                        label="Nombre completo"
                        maxLength={100}
                        className="form-text-input" 
                        value={firmaCoordinador.nombre}
                        onChange={(e) => setFirmaCoordinador({ ...firmaCoordinador, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <LimitedInput 
                        label="Número de cédula"
                        maxLength={20}
                        className="form-text-input" 
                        value={firmaCoordinador.cedula}
                        onChange={(e) => setFirmaCoordinador({ ...firmaCoordinador, cedula: e.target.value })}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Firma digital:</span>
                      <button 
                        type="button" 
                        className="btn-gaudi-sign"
                        style={{
                          backgroundColor: firmaCoordinador.firmadoDigital ? '#15803d' : '#0369A1',
                          borderColor: firmaCoordinador.firmadoDigital ? '#15803d' : '#0369A1'
                        }}
                        onClick={() => {
                          const nuevo = !firmaCoordinador.firmadoDigital;
                          setFirmaCoordinador({ ...firmaCoordinador, firmadoDigital: nuevo });
                          if (nuevo) {
                            alert(`Autenticación mediante Certificado Digital GAUDI / BCCR completada para ${firmaCoordinador.nombre || 'el coordinador'}.`);
                          }
                        }}
                      >
                        {firmaCoordinador.firmadoDigital ? '✔ Firmado con BCCR / GAUDI' : '🔏 Firmar con BCCR / GAUDI'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Barra Inferior de Navegación y Acciones */}
            <div className="form-footer-action-bar">
              <div className="footer-left">
                {pasoActual > 1 && (
                  <button 
                    type="button" 
                    className="btn-form-nav btn-outline"
                    onClick={handleAnterior}
                  >
                    ← Anterior
                  </button>
                )}
              </div>

              <div className="footer-center">
                <button 
                  type="button" 
                  className="btn-form-nav btn-outline"
                  onClick={guardarBorradorActual}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar Borrador'}
                </button>
                <button
                  type="button"
                  className="btn-form-nav btn-outline"
                  onClick={handleDescargarPDF}
                  style={{ marginLeft: '8px' }}
                >
                  Descargar PDF
                </button>
              </div>

              <div className="footer-right">
                {pasoActual < 16 ? (
                  <button 
                    type="button" 
                    className="btn-form-nav btn-primary"
                    onClick={handleSiguiente}
                  >
                    Siguiente →
                  </button>
                ) : (
                  esPropietario ? (
                    <button 
                      type="button" 
                      className="btn-envio-definitivo"
                      onClick={handleEnvioDefinitivo}
                      disabled={guardando}
                    >
                      {guardando ? 'Enviando a Unidad de Vinculación...' : 'ENVÍO DEFINITIVO A VINCULACIÓN'}
                    </button>
                  ) : (
                    <div style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      color: '#1e40af',
                      fontSize: '13px',
                      maxWidth: '440px',
                      textAlign: 'right'
                    }}>
                      🔒 <strong>Modo Colaborador:</strong> Como integrante del equipo de investigación puedes editar y guardar cambios, pero el Envío Definitivo a Vinculación debe realizarlo la persona coordinadora.
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FormularioProyecto;
