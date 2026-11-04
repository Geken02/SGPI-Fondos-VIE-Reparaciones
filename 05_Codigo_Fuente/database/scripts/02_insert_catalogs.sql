-- =============================================================================
-- SGPI - Script de Catálogos UNIFICADO Y CORREGIDO
-- Instituto Tecnológico de Costa Rica - Fondos VIE
-- Fusiona: 02_insert_catalogs + 03_insertar_catalogos_logs
-- =============================================================================

-- Extensión necesaria para funciones criptográficas
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. USUARIO BASE DEL SISTEMA (CORREGIDO - sin auto-referencia)
-- =============================================================================
INSERT INTO Usuarios (usuarioId, correoInstitucional, nombreUsuario, apellido1Usuario, apellido2Usuario, telefono, contrasenaHash, activo, usuarioAuditoriaId, ultimaAuditoria)
VALUES (
    1,
    'sistema@tec.ac.cr',
    'Sistema',
    'Administrador',
    'SGPI',
    '2550-0000',
    '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq',
    TRUE,
    NULL,  -- CORREGIDO: NULL en lugar de 1 (no puede referenciarse a sí mismo)
    NOW()
)
ON CONFLICT (usuarioId) DO UPDATE SET
    correoInstitucional = EXCLUDED.correoInstitucional,
    nombreUsuario = EXCLUDED.nombreUsuario,
    apellido1Usuario = EXCLUDED.apellido1Usuario,
    apellido2Usuario = EXCLUDED.apellido2Usuario,
    telefono = EXCLUDED.telefono,
    activo = EXCLUDED.activo;

-- =============================================================================
-- 2. CATÁLOGOS GEOGRÁFICOS Y ACADÉMICOS
-- =============================================================================
INSERT INTO Campus (campusId, nombreCampus, activo) VALUES
(1, 'Campus Central Cartago', TRUE),
(2, 'Campus San Carlos', TRUE),
(3, 'Campus Limón', TRUE),
(4, 'Sede Interuniversitaria de San José', TRUE)
ON CONFLICT (campusId) DO NOTHING;

INSERT INTO Escuelas (escuelaId, codigoEscuela, nombreEscuela, campusId, activo) VALUES
(1, 'IC', 'Escuela de Ingeniería en Computación', 1, TRUE),
(2, 'EL', 'Escuela de Ingeniería Electrónica', 1, TRUE),
(3, 'QU', 'Escuela de Química', 1, TRUE),
(4, 'MA', 'Escuela de Matemática', 1, TRUE),
(5, 'FI', 'Escuela de Física', 1, TRUE),
(6, 'BI', 'Escuela de Biotecnología', 1, TRUE),
(7, 'AU', 'Escuela de Arquitectura y Urbanismo', 1, TRUE),
(8, 'AE', 'Escuela de Administración de Empresas', 1, TRUE),
(9, 'MI', 'Escuela de Ingeniería en Mantenimiento Industrial', 1, TRUE),
(10, 'MT', 'Escuela de Ingeniería Mecatrónica', 1, TRUE)
ON CONFLICT (escuelaId) DO NOTHING;

-- =============================================================================
-- 3. CATÁLOGOS DE INVESTIGACIÓN
-- =============================================================================
INSERT INTO LineasInvestigacion (nombreLinea, descripcion, activo) VALUES
('Inteligencia Artificial y Ciencia de Datos', 'Investigación en algoritmos de ML, visión por computadora y big data', TRUE),
('Energías Renovables y Sostenibilidad', 'Desarrollo de tecnologías limpias y eficiencia energética', TRUE),
('Biotecnología y Ciencias de la Vida', 'Investigación aplicada en salud, agroindustria y medio ambiente', TRUE),
('Materiales Avanzados y Nanotecnología', 'Síntesis y caracterización de nuevos materiales', TRUE),
('Ingeniería Sísmica y Estructural', 'Diseño y evaluación de infraestructura resiliente', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO NivelesTrl (nivelTrlId, descripcionNivel, activo) VALUES
(1, 'Principios básicos observados y reportados', TRUE),
(2, 'Concepto de la tecnología o aplicación formulado', TRUE),
(3, 'Prueba de concepto experimental y analítica', TRUE),
(4, 'Validación de la tecnología en entorno de laboratorio', TRUE),
(5, 'Validación de la tecnología en entorno relevante (semi-industrial)', TRUE),
(6, 'Demostración de la tecnología en entorno relevante', TRUE),
(7, 'Demostración del prototipo en entorno operativo real', TRUE),
(8, 'Sistema completo y calificado', TRUE),
(9, 'Sistema probado y exitoso en entorno operativo real (comercial)', TRUE)
ON CONFLICT (nivelTrlId) DO NOTHING;

INSERT INTO Modalidades (nombreModalidad, descripcion, activo) VALUES
('Básica', 'Orientada a generar nuevo conocimiento científico sin una aplicación práctica inmediata', TRUE),
('Aplicada', 'Orientada a la adquisición de nuevo conocimiento dirigido a un fin u objetivo práctico específico', TRUE),
('Desarrollo Tecnológico', 'Utilización de conocimientos existentes para desarrollar nuevos materiales, dispositivos, productos o procesos', TRUE),
('Fortalecimiento', 'Proyectos destinados a consolidar grupos de investigación, equipamiento o capacidades instaladas', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. ROLES DEL SISTEMA
-- =============================================================================
INSERT INTO RolesSistema (rolId, nombreRol, descripcionRol, activo) VALUES
(1, 'SuperAdministrador', 'Control total del sistema y gestión de catálogos', TRUE),
(2, 'InvestigadorCoordinador', 'Crea, edita y envía propuestas de investigación', TRUE),
(3, 'InvestigadorColaborador', 'Miembro del equipo de investigación (TEC)', TRUE),
(4, 'EvaluadorVinculacion', 'Evalúa aspectos de Propiedad Intelectual y nivel TRL', TRUE),
(5, 'MiembroComiteTecnico', 'Evalúa propuestas con rúbrica técnica y académica', TRUE),
(6, 'CoordinadorComiteTecnico', 'Consolida notas y emite oficio del comité', TRUE),
(7, 'GestoraVIE', 'Valida normativa, asigna evaluadores y hace seguimiento', TRUE),
(8, 'MiembroCIE', 'Emite resolución final institucional', TRUE),
(9, 'DirectorEscuela', 'Participa en el aval del consejo de escuela', TRUE),
(10, 'AsistenteComiteTecnico', 'Recibe y revisa la completitud del contenido de las propuestas antes de pasarlas a evaluación', TRUE),
(11, 'ProfesorEvaluador', 'Evalúa la propuesta usando la rúbrica CIE de forma independiente y asigna una nota', TRUE),
(12, 'AsistenteConsejoEscuela', 'Recibe la calificación del Comité Técnico y la envía formalmente al Consejo de Profesores', TRUE),
(13, 'ConsejoProfesores', 'Analiza la propuesta, aprueba o rechaza mediante votación y genera el aval institucional', TRUE),
(14, 'DireccionConsejoEscuela', 'Comunica el aval aprobado a la VIE mediante oficio formal y firma digitalmente el Acuerdo de Consejo', TRUE),
(15, 'DireccionInvestigacion', 'Recibe los dictámenes del CIE, notifica formalmente la aprobación o el rechazo y genera el documento oficial', TRUE)
ON CONFLICT (rolId) DO NOTHING;

-- =============================================================================
-- 5. ESTADOS DE PROPUESTA Y SUBSANACIÓN
-- =============================================================================
INSERT INTO EstadosPropuesta (codigoEstadoPropuesta, nombreEstadoPropuesta, descripcion, esFinal, orden, activo) VALUES
('BORRADOR', 'Borrador', 'Propuesta en proceso de llenado por el investigador', FALSE, 1, TRUE),
('ENVIADA', 'Enviada a VIE', 'Propuesta enviada formalmente a la VIE', FALSE, 2, TRUE),
('EN_VINCULACION', 'En Evaluación de Vinculación', 'Revisión de PI y TRL por experto asignado', FALSE, 3, TRUE),
('EN_COMITE', 'En Comité Técnico', 'Evaluación por pares académicos', FALSE, 4, TRUE),
('EN_CONSEJO', 'En Consejo de Escuela', 'Aval y priorización por el consejo de profesores', FALSE, 5, TRUE),
('EN_CIE', 'En CIE', 'Resolución final del Consejo de Investigación y Extensión', FALSE, 6, TRUE),
('APROBADA', 'Aprobada', 'Propuesta financiada y lista para ejecución', TRUE, 7, TRUE),
('RECHAZADA', 'Rechazada', 'Propuesta no financiada', TRUE, 8, TRUE),
('CANCELADA', 'Cancelada', 'Propuesta retirada por el investigador o por incumplimiento', TRUE, 9, TRUE)
ON CONFLICT (codigoEstadoPropuesta) DO NOTHING;

INSERT INTO EstadosSubsanacion (nombreEstadoSubsanacion, descripcion, activo) VALUES
('Pendiente', 'La gestora VIE ha solicitado correcciones y espera respuesta', TRUE),
('Resuelta', 'El investigador ha respondido y está en revisión', TRUE),
('Rechazada', 'La respuesta del investigador no cumple con lo solicitado', TRUE),
('Completada', 'La gestora VIE validó la respuesta del investigador y la subsanación quedó cerrada', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. CATÁLOGOS DE EQUIPO Y HORAS
-- =============================================================================
INSERT INTO TiposHora (codigoTipo, descripcion, activo) VALUES
('VIE', 'Horas de Vinculación e Investigación', TRUE),
('VIE-CENTROS', 'Horas VIE asignadas a Centros de Investigación', TRUE),
('CONS', 'Horas de Investigador Consolidado', TRUE),
('DOC', 'Horas Docentes (hasta el límite permitido)', TRUE),
('REC', 'Horas de Investigación (Recién graduado)', TRUE),
('VIESA', 'Horas VIE para personal administrativo de apoyo', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO RolesEquipo (nombreRol, descripcion, activo) VALUES
('Coordinador', 'Responsable principal de la propuesta, la ejecución y los informes', TRUE),
('Investigador', 'Miembro del equipo con responsabilidades específicas en el plan de acción', TRUE),
('Asistente', 'Estudiante o personal de apoyo a la investigación', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. CATÁLOGOS DE FORMULARIOS Y DOCUMENTOS
-- =============================================================================
INSERT INTO TiposDocumento (nombreTipoDocumento, descripcion, activo) VALUES
('Form-04', 'Formulario de Proyecto de Investigación', TRUE),
('Form-05', 'Plan de Acción y Gestión de Riesgos', TRUE),
('Form-06', 'Plantilla de Presupuesto Detallado', TRUE),
('Carta_Compromiso', 'Carta de compromiso de colaboradores externos', TRUE),
('Dictamen_Vinculacion', 'Dictamen de Propiedad Intelectual y TRL', TRUE),
('Dictamen_Comite', 'Dictamen del Comité Técnico', TRUE),
('Dictamen_CIE', 'Dictamen del Consejo de Investigación y Extensión', TRUE),
('Acuerdo_Consejo', 'Acuerdo de Consejo de Escuela (Form-07/08)', TRUE),
('Informe_Avance', 'Informe semestral de avance', TRUE),
('Informe_Final', 'Informe final de proyecto', TRUE),
('Carta_Aceptacion_Condiciones', 'Carta de aceptación de condiciones del cronograma', TRUE),
('Dictamen_VIE', 'Dictamen de validación normativa de la Gestora VIE', TRUE),
('Oficio_Comite_Tecnico', 'Oficio con calificación final del Comité Técnico', TRUE),
('Hoja_Ruta', 'Documento de continuidad con proyectos anteriores', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO TiposInnovacion (nombreTipoInnovacion, descripcion, activo) VALUES
('Innovacion_Proceso', 'Mejora significativa en métodos de producción o entrega', TRUE),
('Innovacion_Producto', 'Bien o servicio nuevo o significativamente mejorado', TRUE),
('Innovacion_Organizacional', 'Nuevas prácticas en la organización o relaciones externas', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. CATÁLOGOS FINANCIEROS Y DE PRESUPUESTO
-- =============================================================================
INSERT INTO TiposFinanciamiento (nombreTipoFinanciamiento, descripcion, activo) VALUES
('Externo', 'Fondos provenientes de entidades ajenas al TEC', TRUE),
('Contrapartida_Institucional', 'Aporte en especie o financiero del TEC', TRUE),
('Cofinanciamiento', 'Fondos compartidos entre el TEC y otra entidad', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO EntidadesEmisoras (nombreEntidadEmisora, descripcion, activo) VALUES
('MICITT', 'Ministerio de Ciencia, Innovación, Tecnología y Telecomunicaciones', TRUE),
('CONARE', 'Consejo Nacional de Rectores', TRUE),
('Fundacion_CRUSA', 'Fundación CR-USA para la Cooperación', TRUE),
('BID', 'Banco Interamericano de Desarrollo', TRUE),
('Union_Europea', 'Programas marco de la UE (ej. Horizon)', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO RubrosPropuesta (nombreRubro, descripcionRubro, activo) VALUES
('1-01-01: Alquileres', 'Alquiler de edificios, locales y terrenos', TRUE),
('1-01-02: Servicios Básicos', 'Agua, luz, teléfono, internet', TRUE),
('1-02-01: Viáticos y Pasajes', 'Giras de investigación nacionales e internacionales', TRUE),
('1-03-01: Materiales de Laboratorio', 'Insumos, reactivos y materiales de consumo', TRUE),
('1-03-02: Materiales de Oficina', 'Papelería, tóner y suministros generales', TRUE),
('1-04-01: Servicios Profesionales', 'Consultorías, traducciones, análisis externos', TRUE),
('1-05-01: Equipos de Cómputo', 'Computadoras, servidores, licencias de software', TRUE),
('1-05-02: Equipos de Laboratorio', 'Maquinaria, instrumentos de medición (Bienes Duraderos)', TRUE),
('1-06-01: Becas de Investigación', 'Apoyo económico a estudiantes colaboradores', TRUE),
('1-07-01: Publicación y Divulgación', 'Costos de publicación en revistas indexadas, eventos', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO TiposAcuerdo (nombreTipoAcuerdo, descripcion, activo) VALUES
('Aprobacion', 'Acuerdo de aprobación del Consejo', TRUE),
('Rechazo', 'Acuerdo de rechazo de la propuesta', TRUE),
('Devolucion', 'Devolución para ajustes menores', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. CATÁLOGOS DE ÉTICA Y REGULATORIOS
-- =============================================================================
INSERT INTO EntesRegulatorios (nombreEnteRegulatorio, descripcion, activo) VALUES
('CEC', 'Comité de Ética Científica', TRUE),
('CONAGEBIO', 'Comisión Nacional para la Gestión de la Biodiversidad', TRUE),
('CICUA', 'Comité Institucional para el Cuidado y Uso de Animales', TRUE),
('CONARE', 'Consejo Nacional de Rectores (para datos personales)', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO EstadosAval (nombreEstadoAval, descripcion, activo) VALUES
('Pendiente', 'Solicitud enviada, en espera de resolución', TRUE),
('Aprobado', 'Permiso otorgado por el ente regulador', TRUE),
('Exento', 'El proyecto no requiere este tipo de permiso', TRUE),
('Rechazado', 'Permiso denegado, requiere modificaciones', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. CATÁLOGOS DE PRODUCTOS ACADÉMICOS
-- =============================================================================
INSERT INTO TiposProductosAcademicos (nombreTipoProductoAcademico, descripcion, activo) VALUES
('Articulo_WoS_Scopus', 'Artículo científico en revista indexada (Q1-Q4)', TRUE),
('Articulo_Otra_Indexada', 'Artículo en revista indexada regional o nacional', TRUE),
('Libro_Capitulo', 'Libro o capítulo de libro con ISBN', TRUE),
('Tesis_Grado', 'Tesis de licenciatura o maestría derivada del proyecto', TRUE),
('Prototipo_Funcional', 'Prototipo validado en entorno relevante o real', TRUE),
('Patente_Modelo_Utilidad', 'Solicitud o concesión de propiedad industrial', TRUE),
('Software_Registrado', 'Registro de derecho de autor de software', TRUE),
('Evento_Cientifico', 'Ponencia o poster en congreso reconocido', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 11. CATÁLOGOS DE EVALUACIÓN Y RÚBRICAS
-- =============================================================================
INSERT INTO TiposEvaluacion (nombreTipoEvaluacion, descripcion, activo) VALUES
('Vinculacion', 'Evaluación de Propiedad Intelectual, TRL y aspectos éticos', TRUE),
('ComiteTecnico', 'Evaluación académica, técnica y presupuestaria por pares', TRUE),
('CIE', 'Evaluación final de mérito institucional y factibilidad', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO EstadosEvaluacion (nombreEstadoEvaluacion, descripcion, activo) VALUES
('Borrador', 'Evaluación en progreso, no enviada al sistema', TRUE),
('Enviada', 'Evaluación enviada y bloqueada para cambios', TRUE),
('Completada', 'Proceso de evaluación finalizado y consolidado', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO TiposRecomendacion (nombreTipoRecomendacion, descripcion, activo) VALUES
('Recomendar_Financiamiento', 'Cumple todos los criterios, se recomienda aprobar', TRUE),
('Recomendar_Condicionado', 'Cumple, pero requiere subsanaciones menores antes de aprobar', TRUE),
('No_Recomendar_Financiamiento', 'No cumple con los criterios mínimos de la rúbrica', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO TiposDictamen (nombreTipoDictamen, descripcion, activo) VALUES
('Vinculacion', 'Dictamen emitido por el evaluador de vinculación', TRUE),
('ComiteTecnico', 'Dictamen consolidado del Comité Técnico', TRUE),
('CIE', 'Resolución oficial del Consejo de Investigación y Extensión', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 12. CRITERIOS DE EVALUACIÓN
-- =============================================================================
INSERT INTO CriteriosEvaluacion (tipoEvaluacionId, nombreSeccion, nombreCriterio, pesoPorcentaje, esRequisitoObligatorio, orden)
SELECT tipoEvaluacionId, '1. GRUPO INVESTIGADOR', 'Composición disciplinaria y experiencia del equipo', 15.00, FALSE, 1 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
UNION ALL
SELECT tipoEvaluacionId, '1. GRUPO INVESTIGADOR', 'Dedicación de horas adecuada a los objetivos', 10.00, TRUE, 2 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
UNION ALL
SELECT tipoEvaluacionId, '2. FUNDAMENTACIÓN', 'Claridad del problema, objetivos y estado del arte', 20.00, FALSE, 3 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
UNION ALL
SELECT tipoEvaluacionId, '3. METODOLOGÍA', 'Adecuación de la metodología a los objetivos', 20.00, FALSE, 4 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
UNION ALL
SELECT tipoEvaluacionId, '4. PRESUPUESTO', 'Racionalidad y apego a la normativa de los rubros', 15.00, FALSE, 5 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
UNION ALL
SELECT tipoEvaluacionId, '5. IMPACTO', 'Relevancia de los productos académicos y divulgación', 20.00, FALSE, 6 FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'ComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO CriteriosEvaluacion (tipoEvaluacionId, nombreSeccion, nombreCriterio, pesoPorcentaje, esRequisitoObligatorio, orden)
SELECT tipoEvaluacionId, '1. MÉRITO ACADÉMICO', 'Originalidad y aporte al estado del arte', 25.00, FALSE, 1 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'CIE'
UNION ALL
SELECT tipoEvaluacionId, '2. VIABILIDAD', 'Factibilidad técnica y presupuestaria', 20.00, FALSE, 2 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'CIE'
UNION ALL
SELECT tipoEvaluacionId, '3. IMPACTO INSTITUCIONAL', 'Alineación con líneas estratégicas del TEC', 25.00, FALSE, 3 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'CIE'
UNION ALL
SELECT tipoEvaluacionId, '4. DISPONIBILIDAD DE RECURSOS', 'Existencia de recursos para financiar', 15.00, TRUE, 4 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'CIE'
UNION ALL
SELECT tipoEvaluacionId, '5. TRAZABILIDAD', 'Vinculación con Hoja de Ruta y proyectos previos', 15.00, FALSE, 5 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'CIE'
ON CONFLICT DO NOTHING;

INSERT INTO CriteriosEvaluacion (tipoEvaluacionId, nombreSeccion, nombreCriterio, pesoPorcentaje, esRequisitoObligatorio, orden)
SELECT tipoEvaluacionId, '1. POTENCIAL DE INNOVACIÓN', 'Novedad y diferenciación tecnológica', 30.00, FALSE, 1 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'Vinculacion'
UNION ALL
SELECT tipoEvaluacionId, '2. PROPIEDAD INTELECTUAL', 'Potencial de protección (patente, software, etc.)', 25.00, FALSE, 2 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'Vinculacion'
UNION ALL
SELECT tipoEvaluacionId, '3. NIVEL TRL', 'Madurez tecnológica actual vs esperada', 25.00, TRUE, 3 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'Vinculacion'
UNION ALL
SELECT tipoEvaluacionId, '4. ASPECTOS ÉTICOS', 'Cumplimiento normativo de aspectos éticos', 20.00, TRUE, 4 
FROM TiposEvaluacion WHERE nombreTipoEvaluacion = 'Vinculacion'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 13. MÓDULOS DEL SISTEMA
-- =============================================================================
INSERT INTO ModulosSistema (moduloId, nombreModulo, descripcion) VALUES
(1, 'Formulacion', 'Módulo de creación y edición de propuestas'),
(2, 'Evaluacion', 'Módulo de asignación y llenado de rúbricas'),
(3, 'Seguimiento', 'Módulo de informes de avance y cierre'),
(4, 'Administracion', 'Gestión de usuarios, roles y catálogos'),
(5, 'Reportes', 'Consultas y exportación de datos institucionales')
(6, 'AprobacionInstitucional', 'Gestión de votaciones y avales del Consejo de Escuela'),
(7, 'ValidacionVIE', 'Validación normativa, subsanaciones y resolución del CIE'),
(8, 'ConsultasHistoricas', 'Dashboard histórico y trazabilidad de propuestas')
ON CONFLICT (moduloId) DO NOTHING;

-- =============================================================================
-- 14. ACCESIBILIDAD Y NOTIFICACIONES
-- =============================================================================
INSERT INTO TamaniosFuente (tamanioFuenteId, nombreTamanioFuente, activo) VALUES
(1, 'Normal (16px)', TRUE),
(2, 'Grande (18px)', TRUE),
(3, 'ExtraGrande (20px)', TRUE)
ON CONFLICT (tamanioFuenteId) DO NOTHING;

INSERT INTO FiltrosDaltonismo (filtroDaltonismoId, nombreFiltroDaltonismo, descripcion, activo) VALUES
(1, 'Ninguno', 'Sin filtro de color aplicado', TRUE),
(2, 'Protanopia', 'Filtro de ajuste para ceguera al rojo', TRUE),
(3, 'Deuteranopia', 'Filtro de ajuste para ceguera al verde', TRUE),
(4, 'Tritanopia', 'Filtro de ajuste para ceguera al azul', TRUE)
ON CONFLICT (filtroDaltonismoId) DO NOTHING;

INSERT INTO CanalesComunicacion (nombreCanal, descripcion, activo) VALUES
('Interno_Sistema', 'Notificaciones dentro de la plataforma web (campanita)', TRUE),
('Correo_Electronico', 'Envío de correos a la cuenta institucional @tec.ac.cr', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO TiposNotificacion (nombreTipoNotificacion, descripcion, activo) VALUES
('Asignacion_Evaluacion', 'Se le ha asignado una nueva propuesta para evaluar', TRUE),
('Recordatorio_Plazo', 'El plazo de evaluación o entrega de informe está por vencer', TRUE),
('Solicitud_Subsanacion', 'La gestora VIE ha solicitado correcciones en su propuesta', TRUE),
('Cambio_Estado', 'Su propuesta ha cambiado de etapa o estado', TRUE),
('Aprobacion_Propuesta', 'Su propuesta ha sido aprobada por el CIE', TRUE),
('Rechazo_Propuesta', 'Su propuesta no ha sido financiada en esta convocatoria', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 15. PLAN DE ACCIÓN
-- =============================================================================
INSERT INTO TiposResponsabilidad (nombreTipoResponsabilidad, descripcion, activo) VALUES
('Ejecuta', 'Responsable directo de realizar la actividad', TRUE),
('Supervisa', 'Responsable de revisar y validar el resultado', TRUE),
('Participa', 'Colabora en la ejecución de la actividad', TRUE),
('Asesora', 'Brinda orientación técnica o metodológica', TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 16. SEVERIDADES (4 niveles - COMPATIBLE CON CÓDIGO PYTHON)
-- =============================================================================
INSERT INTO Severidades (severidadId, valorSeveridad, nombreSeveridad, activo) VALUES
(1, 1, 'INFO', TRUE),
(2, 2, 'WARNING', TRUE),
(3, 3, 'ERROR', TRUE),
(4, 4, 'CRITICAL', TRUE)
ON CONFLICT (severidadId) DO NOTHING;

-- =============================================================================
-- 17. SOURCES (24 módulos modulares)
-- =============================================================================
INSERT INTO Sources (sourceId, nombreSource, activo) VALUES
(1,  'SGPI.Auth',              TRUE),
(2,  'SGPI.Formulacion',       TRUE),
(3,  'SGPI.Evaluacion',        TRUE),
(4,  'SGPI.Dictamen',          TRUE),
(5,  'SGPI.Consejo',           TRUE),
(6,  'SGPI.VIE',               TRUE),
(7,  'SGPI.Administracion',    TRUE),
(8,  'SGPI.Consultas',         TRUE),
(9,  'SGPI.Notificaciones',    TRUE),
(10, 'SGPI.Accesibilidad',     TRUE),
(11, 'SGPI.Auditoria',         TRUE),
(12, 'SGPI.Documentos',        TRUE),
(13, 'SGPI.Presupuesto',       TRUE),
(14, 'SGPI.EquipoInvestigacion', TRUE),
(15, 'SGPI.Bibliografia',      TRUE),
(16, 'SGPI.Convocatorias',     TRUE),
(17, 'SGPI.Etica',             TRUE),
(18, 'SGPI.Subsanaciones',     TRUE),
(19, 'SGPI.Scheduler',         TRUE),
(20, 'SGPI.API',               TRUE),
(21, 'SGPI.Middleware',        TRUE),
(22, 'SGPI.BackgroundJobs',    TRUE),
(23, 'SGPI.Cache',             TRUE),
(24, 'SGPI.Storage',           TRUE)
ON CONFLICT (sourceId) DO NOTHING;

-- =============================================================================
-- 18. OBJETOS AUDITABLES
-- =============================================================================
INSERT INTO Objetos (objetoId, nombreObjeto, activo) VALUES
(1,  'Propuesta',              TRUE),
(2,  'PropuestaContenido',     TRUE),
(3,  'PropuestaDeclaraciones', TRUE),  -- CORREGIDO: plural como la tabla
(4,  'ObjetivoEspecifico',     TRUE),
(5,  'Actividad',              TRUE),
(6,  'Riesgo',                 TRUE),
(7,  'MedidaMitigacion',       TRUE),
(8,  'Usuario',                TRUE),
(9,  'Rol',                    TRUE),
(10, 'Permiso',                TRUE),
(11, 'AsignacionRol',          TRUE),
(12, 'Evaluacion',             TRUE),
(13, 'DetalleEvaluacion',      TRUE),
(14, 'Dictamen',               TRUE),
(15, 'CriterioEvaluacion',     TRUE),
(16, 'Convocatoria',           TRUE),
(17, 'EtapaConvocatoria',      TRUE),
(18, 'EstadoPropuesta',        TRUE),
(19, 'IntegranteEquipo',       TRUE),
(20, 'ColaboradorExterno',     TRUE),
(21, 'ParticipanteActividad',  TRUE),
(22, 'Documento',              TRUE),
(23, 'FuenteBibliografica',    TRUE),
(24, 'Autor',                  TRUE),
(25, 'Referencia',             TRUE),
(26, 'Presupuesto',            TRUE),
(27, 'FinanciamientoExterno',  TRUE),
(28, 'AcuerdoConsejo',         TRUE),
(29, 'ProductoAcademico',      TRUE),
(30, 'AspectoEtico',           TRUE),
(31, 'Subsanacion',            TRUE),
(32, 'HistorialEstado',        TRUE),
(33, 'Escuela',                TRUE),
(34, 'Campus',                 TRUE),
(35, 'LineaInvestigacion',     TRUE),
(36, 'ConfiguracionSistema',   TRUE),
(37, 'Notificacion',           TRUE),
(38, 'PreferenciaAccesibilidad', TRUE),
(39, 'Sesion',                 TRUE),
(40, 'TokenRecuperacion',      TRUE),
(41, 'VotacionConsejo',       TRUE),
(42, 'VotoConsejo',           TRUE),
(43, 'ValidacionRequisito',   TRUE),
(44, 'RevisionDocumento',     TRUE),
(45, 'PreferenciaGestora',    TRUE),
(46, 'EnvioCorreo',           TRUE)
ON CONFLICT (objetoId) DO NOTHING;

-- =============================================================================
-- 19. TIPOS DE EVENTO (70 eventos - TYPOS CORREGIDOS)
-- =============================================================================
INSERT INTO TiposEvento (tipoEventoId, nombreEvento, descripcion, requierePreguardado, activo) VALUES
(1,  'AUTH.LOGIN_EXITOSO',         'Inicio de sesión exitoso de usuario',                     FALSE, TRUE),
(2,  'AUTH.LOGIN_FALLIDO',         'Intento de inicio de sesión fallido',                     FALSE, TRUE),
(3,  'AUTH.LOGOUT',                'Cierre de sesión de usuario',                             FALSE, TRUE),  -- CORREGIDO: sin espacio
(4,  'AUTH.TOKEN_RECUPERACION',    'Solicitud de token para recuperación de contraseña',      FALSE, TRUE),
(5,  'AUTH.PASSWORD_CAMBIADO',     'Contraseña cambiada exitosamente',                        FALSE, TRUE),
(6,  'AUTH.SESION_EXPIRADA',       'Sesión expirada por inactividad',                         FALSE, TRUE),
(7,  'AUTH.ACCESO_DENEGADO',       'Intento de acceso a recurso no autorizado',               FALSE, TRUE),
(8,  'PROPUESTA.CREADA',           'Nueva propuesta creada en el sistema',                    TRUE,  TRUE),  -- CORREGIDO: sin espacio
(9,  'PROPUESTA.MODIFICADA',       'Propuesta modificada por el investigador',                 TRUE,  TRUE),
(10, 'PROPUESTA.ENVIADA',          'Propuesta enviada para evaluación',                       TRUE,  TRUE),
(11, 'PROPUESTA.CAMBIO_ESTADO',    'Cambio de estado en el flujo de la propuesta',            TRUE,  TRUE),  -- CORREGIDO: CAMBIO
(12, 'PROPUESTA.ELIMINADA',        'Propuesta eliminada del sistema',                         TRUE,  TRUE),
(13, 'PROPUESTA.CLONADA',          'Propuesta clonada desde una anterior (Hoja de Ruta)',     TRUE,  TRUE),
(14, 'PROPUESTA.ASIGNADA_GESTORA', 'Propuesta asignada a gestora VIE',                        TRUE,  TRUE),
(15, 'CONTENIDO.ACTUALIZADO',      'Contenido académico de la propuesta actualizado',         TRUE,  TRUE),
(16, 'OBJETIVO.CREADO',            'Objetivo específico agregado a la propuesta',             TRUE,  TRUE),
(17, 'OBJETIVO.MODIFICADO',        'Objetivo específico modificado',                          TRUE,  TRUE),
(18, 'OBJETIVO.ELIMINADO',         'Objetivo específico eliminado',                           TRUE,  TRUE),
(19, 'ACTIVIDAD.CREADA',           'Actividad agregada al plan de trabajo',                   TRUE,  TRUE),
(20, 'ACTIVIDAD.MODIFICADA',       'Actividad modificada',                                    TRUE,  TRUE),
(21, 'ACTIVIDAD.ELIMINADA',        'Actividad eliminada',                                     TRUE,  TRUE),
(22, 'INTEGRANTE.AGREGADO',        'Nuevo integrante agregado al equipo',                     TRUE,  TRUE),
(23, 'INTEGRANTE.MODIFICADO',      'Datos de integrante modificados (horas, rol)',            TRUE,  TRUE),
(24, 'INTEGRANTE.ELIMINADO',       'Integrante removido del equipo',                          TRUE,  TRUE),
(25, 'COLABORADOR.AGREGADO',       'Colaborador externo agregado',                            TRUE,  TRUE),
(26, 'COLABORADOR.ELIMINADO',      'Colaborador externo removido',                            TRUE,  TRUE),
(27, 'EVALUACION.INICIADA',        'Evaluación técnica iniciada por evaluador',               TRUE,  TRUE),
(28, 'EVALUACION.COMPLETADA',      'Evaluación técnica completada y enviada',                 TRUE,  TRUE),
(29, 'EVALUACION.CALIFICADA',      'Calificación registrada en la evaluación',                TRUE,  TRUE),
(30, 'EVALUACION.RECHAZADA',       'Evaluación marcada con recomendación de rechazo',         TRUE,  TRUE),
(31, 'DICTAMEN.GENERADO',          'Dictamen generado por el sistema',                        TRUE,  TRUE),
(32, 'DICTAMEN.ENVIADO',           'Dictamen enviado al investigador',                         TRUE,  TRUE),
(33, 'ACUERDO.CREADO',             'Acuerdo de Consejo registrado',                           TRUE,  TRUE),
(34, 'ACUERDO.FIRMADO',            'Acuerdo de Consejo firmado',                              TRUE,  TRUE),
(35, 'ACUERDO.PRESUPUESTO',        'Presupuesto aprobado en acuerdo de Consejo',              TRUE,  TRUE),
(36, 'SUBSANACION.SOLICITADA',     'Gestora VIE solicita subsanación',                        TRUE,  TRUE),
(37, 'SUBSANACION.RESPONDIDA',     'Investigador responde a subsanación',                     TRUE,  TRUE),
(38, 'SUBSANACION.APROBADA',       'Subsanación aprobada por gestora',                        TRUE,  TRUE),
(39, 'SUBSANACION.RECHAZADA',      'Subsanación rechazada por gestora',                       TRUE,  TRUE),
(40, 'DOCUMENTO.SUBIDO',           'Nuevo documento cargado a la propuesta',                  TRUE,  TRUE),
(41, 'DOCUMENTO.DESCARGADO',       'Documento descargado por usuario',                        TRUE,  TRUE),
(42, 'DOCUMENTO.ELIMINADO',        'Documento eliminado de la propuesta',                     TRUE,  TRUE),
(43, 'DOCUMENTO.REEMPLAZADO',      'Documento reemplazado por nueva versión',                 TRUE,  TRUE),
(44, 'PRESUPUESTO.MODIFICADO',     'Presupuesto de la propuesta modificado',                  TRUE,  TRUE),
(45, 'FINANCIAMIENTO.AGREGADO',    'Fuente de financiamiento externo registrada',             TRUE,  TRUE),
(46, 'PRODUCTO.AGREGADO',          'Producto académico comprometido',                         TRUE,  TRUE),
(47, 'ETICA.DECLARADA',            'Declaración ética de la propuesta actualizada',           TRUE,  TRUE),
(48, 'ETICA.AVAL_SOLICITADO',      'Aval de ente regulatorio solicitado',                     TRUE,  TRUE),
(49, 'ETICA.AVAL_OBTENIDO',        'Aval de ente regulatorio obtenido',                       TRUE,  TRUE),
(50, 'ADMIN.USUARIO_CREADO',       'Nuevo usuario creado en el sistema',                      FALSE, TRUE),
(51, 'ADMIN.USUARIO_MODIFICADO',   'Datos de usuario modificados',                            FALSE, TRUE),
(52, 'ADMIN.ROL_ASIGNADO',         'Rol asignado a usuario',                                  FALSE, TRUE),
(53, 'ADMIN.ROL_REMOVIDO',         'Rol removido de usuario',                                 FALSE, TRUE),
(54, 'ADMIN.CONFIG_CAMBIADA',      'Configuración del sistema modificada',                    FALSE, TRUE),
(55, 'ADMIN.CATALOGO_MODIFICADO',  'Catálogo del sistema modificado',                         FALSE, TRUE),
(56, 'ADMIN.CONVOCATORIA_CREADA',  'Nueva convocatoria creada',                               FALSE, TRUE),
(57, 'ADMIN.ETAPA_CONFIGURADA',    'Etapa de convocatoria configurada',                       FALSE, TRUE),
(58, 'NOTIFICACION.ENVIADA',       'Notificación enviada a usuario',                          FALSE, TRUE),
(59, 'NOTIFICACION.LEIDA',         'Notificación marcada como leída',                         FALSE, TRUE),
(60, 'NOTIFICACION.CANAL_CAMBIADO','Canal de comunicación preferido actualizado',             FALSE, TRUE),
(61, 'ACCESIBILIDAD.CONFIGURADA',  'Preferencias de accesibilidad actualizadas',              FALSE, TRUE),
(62, 'REFERENCIA.AGREGADA',        'Referencia bibliográfica agregada',                       TRUE,  TRUE),
(63, 'REFERENCIA.ELIMINADA',       'Referencia bibliográfica eliminada',                      TRUE,  TRUE),
(64, 'FUENTE.CREADA',              'Nueva fuente bibliográfica registrada',                   FALSE, TRUE),
(65, 'SISTEMA.BACKUP_EXITOSO',     'Respaldo de base de datos completado',                    FALSE, TRUE),
(66, 'SISTEMA.BACKUP_FALLIDO',     'Respaldo de base de datos fallido',                       FALSE, TRUE),
(67, 'SISTEMA.MANTENIMIENTO',      'Tarea de mantenimiento ejecutada',                        FALSE, TRUE),
(68, 'SISTEMA.ERROR_NO_RECUP',     'Error no recuperable del sistema',                        FALSE, TRUE),
(69, 'SISTEMA.RENDIMIENTO',        'Alerta de rendimiento detectada',                         FALSE, TRUE),
(70, 'SISTEMA.SEGURIDAD',          'Evento de seguridad detectado',                           FALSE, TRUE),
(72, 'VOTACION.ABIERTA',           'Votación del Consejo abierta para recibir votos',        TRUE,  TRUE),
(73, 'VOTACION.CERRADA',           'Votación del Consejo cerrada con resultado',             TRUE,  TRUE),
(74, 'VOTO.REGISTRADO',            'Voto individual registrado por miembro del Consejo',     TRUE,  TRUE),
(75, 'CONSEJO.AVAL_EMITIDO',       'Aval institucional emitido por el Consejo de Escuela',   TRUE,  TRUE),
(76, 'CONSEJO.AVAL_RECHAZADO',     'Aval rechazado por el Consejo de Escuela',               TRUE,  TRUE),
(77, 'CONSEJO.FIRMA_ACUERDO',      'Acuerdo de Consejo firmado digitalmente',                TRUE,  TRUE),
(78, 'SUBSANACION.COMPLETADA',     'Subsanación validada y cerrada por la gestora VIE',      TRUE,  TRUE),
(79, 'GESTORA.VALIDACION_CUMPLE',  'Gestora VIE marca requisito como cumplido',              TRUE,  TRUE),
(80, 'GESTORA.VALIDACION_NO_CUMPLE','Gestora VIE marca requisito como no cumplido',           TRUE,  TRUE),
(81, 'GESTORA.DOCUMENTO_REVISADO', 'Documento revisado por la gestora VIE',                  TRUE,  TRUE),
(82, 'DIRECCION.NOTIFICACION',     'Dirección de Investigación notifica resolución oficial', TRUE,  TRUE),
(83, 'CORREO.ENVIADO',             'Correo electrónico enviado al destinatario',             FALSE, TRUE),
(84, 'CORREO.FALLIDO',             'Envío de correo fallido tras reintentos',                FALSE, TRUE)
ON CONFLICT (tipoEventoId) DO UPDATE SET
    nombreEvento = EXCLUDED.nombreEvento,
    descripcion = EXCLUDED.descripcion,
    requierePreguardado = EXCLUDED.requierePreguardado,
    activo = EXCLUDED.activo;

-- =============================================================================
-- 20. PERMISOS DEL SISTEMA
-- =============================================================================
INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'usuarios.leer', 'Ver listado de usuarios del sistema', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'usuarios.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'usuarios.crear', 'Crear nuevos usuarios en el sistema', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'usuarios.crear');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'usuarios.actualizar', 'Modificar datos de usuarios existentes', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'usuarios.actualizar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'usuarios.eliminar', 'Desactivar usuarios (soft-delete)', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'usuarios.eliminar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'roles.leer', 'Ver listado de roles del sistema', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'roles.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'roles.gestionar', 'Crear, actualizar, desactivar roles y asignarlos a usuarios', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'roles.gestionar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'catalogos.leer', 'Ver catálogos del sistema (escuelas, campus, etc.)', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'catalogos.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'catalogos.gestionar', 'Crear, actualizar o desactivar catálogos del sistema', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'catalogos.gestionar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'bitacora.leer', 'Consultar la bitácora de auditoría forense', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'bitacora.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'accesibilidad.leer', 'Ver preferencias de accesibilidad de usuarios', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'accesibilidad.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'accesibilidad.gestionar', 'Gestionar preferencias de accesibilidad', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'accesibilidad.gestionar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'gestoria.leer', 'Ver asignaciones de gestoras VIE a escuelas', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'gestoria.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'gestoria.gestionar', 'Asignar o revocar gestoras VIE a escuelas', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'gestoria.gestionar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'permisos.leer', 'Ver permisos del sistema', 4, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'permisos.leer');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'propuestas.enviar', 'Enviar propuestas para evaluación', 1, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'propuestas.enviar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'propuestas.evaluar', 'Evaluar propuestas con rúbrica', 2, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'propuestas.evaluar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'propuestas.dictaminar', 'Emitir dictámenes de propuestas', 2, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'propuestas.dictaminar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'votaciones.votar', 'Emitir voto en votaciones del Consejo', 6, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'votaciones.votar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'consejos.firmar_acuerdo', 'Firmar acuerdos de Consejo digitalmente', 6, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'consejos.firmar_acuerdo');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'subsanaciones.gestionar', 'Gestionar subsanaciones como Gestora VIE', 7, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'subsanaciones.gestionar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'historial.consultar', 'Consultar histórico de propuestas', 8, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'historial.consultar');

INSERT INTO Permisos (nombrePermiso, descripcion, moduloId, usuarioAuditoriaId, ultimaAuditoria)
SELECT 'reportes.exportar', 'Exportar reportes institucionales', 8, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM Permisos WHERE nombrePermiso = 'reportes.exportar');

-- =============================================================================
-- 21. ASIGNAR PERMISOS AL SUPERADMINISTRADOR
-- =============================================================================
INSERT INTO RolPermisos (rolId, permisoId, usuarioAuditoriaId, ultimaAuditoria)
SELECT
    1 AS rolId,
    p.permisoId,
    1 AS usuarioAuditoriaId,
    NOW() AS ultimaAuditoria
FROM Permisos p
WHERE NOT EXISTS (
    SELECT 1 FROM RolPermisos rp
    WHERE rp.rolId = 1 AND rp.permisoId = p.permisoId
);

-- =============================================================================
-- 22. ASIGNAR ROL SUPERADMINISTRADOR AL USUARIO BASE
-- =============================================================================
INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, asignadoEn, activo, usuarioAuditoriaId, ultimaAuditoria)
SELECT 1, 1, 1, NOW(), TRUE, 1, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM UsuarioRol
    WHERE usuarioId = 1 AND rolId = 1 AND activo = TRUE
);

-- =============================================================================
-- 23. SINCRONIZAR SECUENCIAS
-- =============================================================================
SELECT setval('usuarios_usuarioid_seq', (SELECT MAX(usuarioId) FROM Usuarios));

-- =============================================================================
-- 24. VERIFICACIÓN FINAL
-- =============================================================================
DO $$
DECLARE
    v_usuarios INT;
    v_roles INT;
    v_permisos INT;
    v_rol_permisos INT;
    v_usuario_roles INT;
BEGIN
    SELECT COUNT(*) INTO v_usuarios FROM Usuarios;  -- CORREGIDO: COUNT(*)
    SELECT COUNT(*) INTO v_roles FROM RolesSistema;
    SELECT COUNT(*) INTO v_permisos FROM Permisos;
    SELECT COUNT(*) INTO v_rol_permisos FROM RolPermisos WHERE rolId = 1;
    SELECT COUNT(*) INTO v_usuario_roles FROM UsuarioRol WHERE usuarioId = 1 AND activo = TRUE;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'INSERCIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Usuarios:              %', v_usuarios;
    RAISE NOTICE 'Roles del sistema:     %', v_roles;
    RAISE NOTICE 'Permisos totales:      %', v_permisos;
    RAISE NOTICE 'Permisos SuperAdmin:   %', v_rol_permisos;
    RAISE NOTICE 'Roles usuario base:    %', v_usuario_roles;
    RAISE NOTICE '============================================';
END $$;

SELECT
    u.usuarioId,
    u.correoInstitucional,
    r.nombreRol,
    ur.activo
FROM UsuarioRol ur
JOIN Usuarios u ON u.usuarioId = ur.usuarioId
JOIN RolesSistema r ON r.rolId = ur.rolId
WHERE ur.usuarioId = 1 AND ur.activo = TRUE;