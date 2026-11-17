// Utilidades compartidas para construir el payload del Plan de Acción y Matriz
// de Riesgos (sección 3 del esquema) que consumen los formularios Form-04 y Form-05.
// Transforma las filas de la matriz en ObjetivosEspecificos -> Actividades ->
// ParticipantesActividad y Riesgos -> MedidasMitigacion usando IDs reales de catálogo.

export const resolverTipoResponsabilidadId = (texto, tiposResponsabilidad = []) => {
  const norm = (texto || '').trim().toLowerCase();
  if (!norm) return null;
  const tipos = tiposResponsabilidad || [];
  const exacto = tipos.find(t => (t.nombreTipoResponsabilidad || '').toLowerCase() === norm);
  if (exacto) return exacto.tipoResponsabilidadId;
  const alias = {
    colabora: 'participa',
    participar: 'participa',
    ejecuta: 'ejecuta',
    supervisa: 'supervisa',
    asesora: 'asesora'
  };
  const destino = alias[norm] || norm;
  const aprox = tipos.find(t => (t.nombreTipoResponsabilidad || '').toLowerCase().includes(destino));
  return aprox ? aprox.tipoResponsabilidadId : null;
};

export const construirPayloadPlanAccion = ({
  objetivosEspecificos = [],
  actividades = [],
  personas = [],
  tiposResponsabilidad = []
}) => {
  const objetivos = (objetivosEspecificos || []).map((desc, idx) => ({
    numeroObjetivo: idx + 1,
    descripcion: (desc || '').trim()
  }));

  const buscarPersona = (iniciales) =>
    (personas || []).find(
      p => (p.iniciales || '').toUpperCase().trim() === (iniciales || '').toUpperCase().trim()
    );

  const actividadesPayload = (actividades || []).map((act) => {
    const claveObjetivo = act.objetivo || act.obj || '';
    let indice = null;
    const coincidencia = /OE\s*(\d+)/i.exec(claveObjetivo);
    if (coincidencia) indice = Math.max(0, parseInt(coincidencia[1], 10) - 1);

    const participantes = [];
    const persona = buscarPersona(act.participante || act.responsable);
    const tipoRespId = resolverTipoResponsabilidadId(act.responsabilidad, tiposResponsabilidad);
    if (persona?.usuarioId && tipoRespId) {
      participantes.push({ usuarioId: persona.usuarioId, tipoResponsabilidadId: tipoRespId });
    }

    const responsable = buscarPersona(act.responsableGestion);
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
      resultadoEsperado: (act.resultado || act.entregable || '').trim(),
      mesInicio: parseInt(act.mesInicio, 10) || 1,
      duracionMeses: parseFloat(act.duracionMesesAct) || 1,
      participantes,
      riesgos
    };
  }).filter(a =>
    a.descripcionActividad || a.resultadoEsperado || a.participantes.length > 0 || a.riesgos.length > 0
  );

  return { objetivosEspecificos: objetivos, actividades: actividadesPayload };
};

// --- Resolución de llaves foráneas de catálogos ---

export const resolverTipoHoraId = (tiposHora = [], codigo = 'VIE') => {
  const lista = tiposHora || [];
  const encontrado = lista.find(t => (t.codigoTipo || '').toUpperCase() === codigo.toUpperCase());
  if (encontrado) return encontrado.tipoHoraId;
  return lista.length > 0 ? lista[0].tipoHoraId : null;
};

export const resolverRolEquipoId = (texto, rolesEquipo = []) => {
  const roles = rolesEquipo || [];
  if (roles.length === 0) return null;
  const norm = (texto || '').toLowerCase();
  const buscar = (kw) => roles.find(r => (r.nombreRol || '').toLowerCase().includes(kw));
  if (norm.includes('coord')) return buscar('coord')?.rolEquipoId ?? roles[0].rolEquipoId;
  if (norm.includes('asist') || norm.includes('estudiante')) {
    return buscar('asist')?.rolEquipoId ?? roles[roles.length - 1].rolEquipoId;
  }
  return buscar('investig')?.rolEquipoId ?? roles[0].rolEquipoId;
};

export const resolverRubroId = (rubros = [], tipo) => {
  const lista = rubros || [];
  if (lista.length === 0) return null;
  const patrones = tipo === 'duradero'
    ? ['bienes duraderos', 'equipos de laboratorio', '1-05']
    : ['materiales de laboratorio', '1-03'];
  for (const p of patrones) {
    const r = lista.find(x => (x.nombreRubro || '').toLowerCase().includes(p));
    if (r) return r.rubroId;
  }
  return lista[0].rubroId;
};

const parseMonto = (valor) => parseFloat(String(valor ?? '0').replace(/[^\d.]/g, '')) || 0;

// --- Aspectos Éticos (Paso 15) ---

export const construirPayloadAspectosEticos = (aspectosEticos = {}) => ({
  involucraSeresHumanos: !!aspectosEticos.seresHumanos,
  involucraBiodiversidad: !!aspectosEticos.biodiversidad,
  involucraAnimales: !!aspectosEticos.animales,
  involucraTerritoriosIndigenas: !!aspectosEticos.comunidadesIndigenas,
  justificacionExencion: aspectosEticos.acuerdoComision || null
});

// --- Financiamiento Externo / Fuentes adicionales (Paso 13) ---

export const construirPayloadFinanciamiento = ({
  fuentesAdicionales = {},
  anioBase,
  tiposFinanciamiento = []
}) => {
  const resolverTipo = (nombre) => {
    const t = (tiposFinanciamiento || []).find(
      x => (x.nombreTipoFinanciamiento || '').toLowerCase() === nombre.toLowerCase()
    );
    return t ? t.tipoFinanciamientoId : null;
  };
  const idExterno = resolverTipo('Externo');
  const idContrapartida = resolverTipo('Contrapartida_Institucional');

  const items = [];
  const agregar = (bloque, tipoId) => {
    if (!bloque || !tipoId) return;
    ['ano1', 'ano2', 'ano3'].forEach((clave, idx) => {
      const monto = parseMonto(bloque[clave]);
      if (monto > 0) {
        items.push({
          tipoFinanciamientoId: tipoId,
          anio: anioBase + idx,
          monto,
          numeroOficio: bloque.oficio || null,
          entidadEmisoraId: null
        });
      }
    });
  };
  agregar(fuentesAdicionales.externo, idExterno);
  agregar(fuentesAdicionales.contrapartida, idContrapartida);
  return items;
};

// --- Referencias bibliográficas (Paso 16) ---
// Cada línea con un año plausible (1900-2100) se convierte en una fuente real.
// Las líneas sin año se omiten para no inventar metadatos.

export const construirPayloadReferencias = (texto) => {
  if (!texto || !String(texto).trim()) return [];
  return String(texto)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length >= 5)
    .map(l => {
      const anios = l.match(/\b(?:19|20)\d{2}\b/g);
      const anioPublicacion = anios ? parseInt(anios[anios.length - 1], 10) : null;
      if (!anioPublicacion || anioPublicacion < 1900 || anioPublicacion > 2100) return null;
      const doi = l.match(/10\.\d{4,9}\/[^\s]+/);
      return {
        titulo: l.slice(0, 500),
        anioPublicacion,
        doi: doi ? doi[0] : null,
        revistaFuente: null,
        esIndexadaWoSScopus: /scopus|web of science|\bwos\b|jcr|\bq[1-4]\b/i.test(l)
      };
    })
    .filter(Boolean);
};

// --- Presupuesto (Paso 13) ---

export const construirPayloadPresupuesto = ({
  presupuestoAnual = [],
  anioBase,
  rubros = []
}) => {
  const idOperativo = resolverRubroId(rubros, 'operativo');
  const idDuradero = resolverRubroId(rubros, 'duradero');
  const items = [];
  (presupuestoAnual || []).forEach((fila, idx) => {
    const operativo = parseMonto(fila.operativo);
    const duradero = parseMonto(fila.duradero);
    if (operativo > 0 && idOperativo) {
      items.push({
        rubroId: idOperativo,
        montoSolicitado: operativo,
        anioEjecucion: anioBase + idx,
        esDuradero: false
      });
    }
    if (duradero > 0 && idDuradero) {
      items.push({
        rubroId: idDuradero,
        montoSolicitado: duradero,
        anioEjecucion: anioBase + idx,
        esDuradero: true
      });
    }
  });
  return items;
};

// --- Productos académicos (Paso 14a / 14b) ---
// Mapea cada opción de la UI a un código real de TiposProductosAcademicos.

const MAPA_PRODUCTO_14A = {
  opcion1: 'Articulo_WoS_Scopus',
  opcion2: 'Articulo_Otra_Indexada',
  opcion3: 'Libro_Capitulo'
};

const MAPA_PRODUCTO_14B_INDUSTRIAL = {
  patente: 'Patente_Modelo_Utilidad',
  diseno: 'Patente_Modelo_Utilidad',
  software: 'Software_Registrado',
  secreto: 'Patente_Modelo_Utilidad',
  obtencion: 'Patente_Modelo_Utilidad',
  marca: 'Patente_Modelo_Utilidad',
  circuito: 'Patente_Modelo_Utilidad',
  otros: 'Patente_Modelo_Utilidad'
};

const MAPA_PRODUCTO_14B_ACADEMICO = {
  articulo: 'Articulo_WoS_Scopus',
  memoria: 'Articulo_Otra_Indexada',
  paquete: 'Prototipo_Funcional'
};

const LABEL_PRODUCTO = {
  opcion1: 'Un (1) artículo científico sometido en revista o conferencia indexada en Web of Science (WoS) o Scopus',
  opcion2: 'Dos (2) artículos científicos sometidos en revistas indexadas en SciELO, Redalyc, ESCI, DOAJ, o memorias con Consejo Editorial',
  opcion3: 'Un (1) Libro o Capítulo de libro técnico especializado publicado por editorial de reconocido prestigio',
  patente: 'Patente de invención o modelo de utilidad (solicitud presentada o concedida)',
  diseno: 'Diseño industrial registrado ante el Registro de la Propiedad',
  software: 'Desarrollo de Software institucional (código fuente, manuales y depósito)',
  secreto: 'Secreto empresarial o Know-How formalizado bajo acuerdo confidencial',
  obtencion: 'Obtención vegetal / variedad protegida (certificado OPOV / Semillas)',
  marca: 'Marca comercial o signo distintivo tecnológico vinculado al proyecto',
  circuito: 'Esquema de trazado de circuitos integrados con dictamen técnico',
  otros: 'Otros activos tecnológicos protegibles amparados con dictamen vinculante',
  articulo: 'Un (1) artículo publicado en revista indexada (WoS/Scopus/SciELO) o memoria con ISBN',
  memoria: 'Dos (2) artículos en revistas indexadas o conferencias internacionales',
  paquete: 'Un (1) paquete tecnológico transferible o prototipo validado (TRL 5+)'
};

export const construirPayloadProductos = ({
  productos14a = {},
  productos14b = {},
  tiposProductoAcademico = []
}) => {
  const resolverTipoId = (codigo) => {
    const t = (tiposProductoAcademico || []).find(
      x => x.nombreTipoProductoAcademico === codigo
    );
    return t ? t.tipoProductoAcademicoId : null;
  };

  const items = [];
  const agregar = (codigo, key, registro, esPropiedadIndustrial) => {
    const tipoId = resolverTipoId(codigo);
    const cantidad = parseInt(registro?.cantidad, 10) || 0;
    if (!tipoId || cantidad < 1) return;
    let descripcion = LABEL_PRODUCTO[key] || `Compromiso ${key}`;
    if (registro?.consecutivo) {
      descripcion = `${descripcion} (Dictamen: ${registro.consecutivo})`;
    }
    items.push({
      tipoProductoAcademicoId: tipoId,
      descripcion: descripcion.slice(0, 300),
      cantidadComprometida: cantidad,
      esPropiedadIndustrial: !!esPropiedadIndustrial
    });
  };

  Object.entries(MAPA_PRODUCTO_14A).forEach(([key, codigo]) => {
    agregar(codigo, key, productos14a[key], false);
  });
  Object.entries(MAPA_PRODUCTO_14B_INDUSTRIAL).forEach(([key, codigo]) => {
    agregar(codigo, key, productos14b[key], true);
  });
  Object.entries(MAPA_PRODUCTO_14B_ACADEMICO).forEach(([key, codigo]) => {
    agregar(codigo, key, productos14b[key], false);
  });

  return items;
};
