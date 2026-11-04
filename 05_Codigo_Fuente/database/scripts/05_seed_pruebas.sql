-- =============================================================================
-- SGPI - DATOS DE PRUEBA UNIFICADOS
-- =============================================================================

-- =============================================================================
-- 1. USUARIOS DE PRUEBA
-- =============================================================================
INSERT INTO Usuarios (usuarioId, correoInstitucional, nombreUsuario, apellido1Usuario, apellido2Usuario, telefono, escuelaId, contrasenaHash, activo) VALUES
(2, 'jvega@tec.ac.cr', 'Johel', 'Vega', 'Hernández', '2550-1234', NULL, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(3, 'mrodriguez@tec.ac.cr', 'María', 'Rodríguez', 'Solís', '2550-2345', 1, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(4, 'cgonzalez@tec.ac.cr', 'Carlos', 'González', 'Ramírez', '2550-3456', 2, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(5, 'lperez@tec.ac.cr', 'Laura', 'Pérez', 'Mora', '2550-4567', 4, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(6, 'agomez@tec.ac.cr', 'Ana', 'Gómez', 'Vargas', '2550-6789', 3, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(7, 'eval.vinculacion@tec.ac.cr', 'Roberto', 'Sánchez', 'Vinculación', '2550-7890', NULL, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(8, 'coord.comite@tec.ac.cr', 'Patricia', 'Jiménez', 'Coordinación', '2550-8901', 1, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(9, 'prof.evaluador1@tec.ac.cr', 'Miguel', 'Castro', 'Evaluador1', '2550-9012', 1, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(10, 'prof.evaluador2@tec.ac.cr', 'Sofía', 'Martínez', 'Evaluador2', '2550-0123', 2, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(11, 'dir.escuela@tec.ac.cr', 'Diego', 'Rodríguez', 'Director', '2550-1235', 1, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(12, 'gestora.vie@tec.ac.cr', 'Carmen', 'Vargas', 'Gestora', '2550-2346', NULL, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(13, 'miembro.cie@tec.ac.cr', 'Fernando', 'López', 'CIE', '2550-3457', NULL, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE),
(14, 'dir.investigacion@tec.ac.cr', 'Isabel', 'Morales', 'Dirección', '2550-4568', NULL, '$2b$12$uNxYzJ0hfEECjpjS7T3/dO5cIz06V89aEkCf7E3tJgpLoam3i40aq', TRUE)
ON CONFLICT (usuarioId) DO NOTHING;

-- =============================================================================
-- 2. ASIGNACIÓN DE ROLES
-- =============================================================================
INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 2, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'InvestigadorCoordinador'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 3, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'InvestigadorCoordinador'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 3, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'GestoraVIE'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 4, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'InvestigadorCoordinador'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 5, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'MiembroComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 5, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'CoordinadorComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 6, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'MiembroCIE'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 7, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'EvaluadorVinculacion'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 8, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'CoordinadorComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 9, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'MiembroComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 10, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'MiembroComiteTecnico'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 11, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'DirectorEscuela'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 12, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'GestoraVIE'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 13, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'MiembroCIE'
ON CONFLICT DO NOTHING;

INSERT INTO UsuarioRol (usuarioId, rolId, asignadoPorId, activo)
SELECT 14, r.rolId, 1, TRUE FROM RolesSistema r WHERE r.nombreRol = 'SuperAdministrador'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. ASIGNACIONES GESTORA - ESCUELA
-- =============================================================================
INSERT INTO AsignacionesGestora (escuelaId, gestoraVIEId, activo)
SELECT e.escuelaId, 12, TRUE FROM Escuelas e WHERE e.activo = TRUE
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. CONVOCATORIAS Y ETAPAS
-- =============================================================================
INSERT INTO Convocatorias (convocatoriaId, nombreConvocatoria, fechaApertura, fechaCierre, fechaBloqueoOrion, activo) VALUES
(1, 'Convocatoria Fondos VIE 2027', '2026-07-20', '2026-08-21', '2026-09-28', TRUE),
(2, 'Convocatoria Fondos VIE 2026', '2025-07-20', '2025-08-21', '2025-09-28', TRUE)
ON CONFLICT (convocatoriaId) DO NOTHING;

INSERT INTO EtapasConvocatoria (etapaId, convocatoriaId, nombreEtapa, fechaInicio, fechaFin, esBloqueante) VALUES
(1, 1, 'Comunicación de la convocatoria', '2026-07-20 08:00:00', '2026-07-27 23:59:59', FALSE),
(2, 1, 'Período de formulación', '2026-07-28 08:00:00', '2026-08-21 23:59:59', TRUE),
(3, 1, 'Revisión Centro de Vinculación', '2026-08-24 08:00:00', '2026-08-28 23:59:59', TRUE),
(4, 1, 'Evaluación Comité Técnico', '2026-08-31 08:00:00', '2026-09-11 23:59:59', TRUE),
(5, 1, 'Aval Consejo de Escuela', '2026-09-14 08:00:00', '2026-09-25 23:59:59', TRUE),
(6, 1, 'Recepción en Orión', '2026-09-28 08:00:00', '2026-09-28 23:59:59', TRUE),
(7, 1, 'Dictamen Dirección de Investigación', '2026-09-29 08:00:00', '2026-10-12 23:59:59', TRUE),
(8, 1, 'Resolución CIE', '2026-10-13 08:00:00', '2026-10-23 23:59:59', TRUE),
(9, 1, 'Comunicación de acuerdos', '2026-10-26 08:00:00', '2026-10-30 23:59:59', FALSE),
(10, 1, 'Carta de aceptación', '2026-11-02 08:00:00', '2026-11-06 23:59:59', TRUE)
ON CONFLICT (etapaId) DO NOTHING;

-- =============================================================================
-- 5. PROPUESTAS (con tipoDictamenId en dictámenes)
-- =============================================================================
INSERT INTO Propuestas (propuestaId, codigoPropuesta, titulo, estadoId, etapaId, convocatoriaId, investigadorCoordId, escuelaId, lineaInvestigacionId, modalidadId, montoTotal, nivelTrlActual, nivelTrlEsperado, fechaInicio, fechaFinalizacion, fechaCreacion, fechaEnvio)
SELECT
    1, 'FVIE-2027-001',
    'Inteligencia Artificial Aplicada a la Detección Temprana de Enfermedades Cardiovasculares',
    esp.estadoPropuestaId, 6, 1, 3, 1, 1, m.modalidadId,
    15000000.00, 3, 6, '2027-01-15', '2029-01-14',
    '2026-08-15 10:30:00', '2026-08-20 14:45:00'
FROM EstadosPropuesta esp, Modalidades m
WHERE esp.codigoEstadoPropuesta = 'APROBADA'
AND m.nombreModalidad = 'Básica'
ON CONFLICT (propuestaId) DO NOTHING;

INSERT INTO Propuestas (propuestaId, codigoPropuesta, titulo, estadoId, etapaId, convocatoriaId, investigadorCoordId, escuelaId, lineaInvestigacionId, modalidadId, montoTotal, nivelTrlActual, nivelTrlEsperado, fechaInicio, fechaFinalizacion, fechaCreacion, fechaEnvio)
SELECT
    2, 'FVIE-2027-002',
    'Sistema de Energía Solar Fotovoltaica de Alta Eficiencia para Zonas Rurales',
    esp.estadoPropuestaId, 4, 1, 4, 2, 2, m.modalidadId,
    8500000.00, 4, 6, '2027-02-01', '2029-08-01',
    '2026-08-10 09:15:00', '2026-08-25 16:30:00'
FROM EstadosPropuesta esp, Modalidades m
WHERE esp.codigoEstadoPropuesta = 'EN_COMITE'
AND m.nombreModalidad = 'Desarrollo Tecnológico'
ON CONFLICT (propuestaId) DO NOTHING;

INSERT INTO Propuestas (propuestaId, codigoPropuesta, titulo, estadoId, etapaId, convocatoriaId, investigadorCoordId, escuelaId, lineaInvestigacionId, modalidadId, montoTotal, nivelTrlActual, nivelTrlEsperado, fechaInicio, fechaFinalizacion, fechaCreacion, fechaEnvio)
SELECT
    3, 'FVIE-2027-003',
    'Desarrollo de Biomateriales a partir de Desechos Agroindustriales',
    esp.estadoPropuestaId, 3, 1, 3, 6, 3, m.modalidadId,
    12000000.00, 3, 5, '2027-03-01', '2029-03-01',
    '2026-08-20 11:00:00', '2026-08-28 10:00:00'
FROM EstadosPropuesta esp, Modalidades m
WHERE esp.codigoEstadoPropuesta = 'EN_VINCULACION'
AND m.nombreModalidad = 'Básica'
ON CONFLICT (propuestaId) DO NOTHING;

INSERT INTO Propuestas (propuestaId, codigoPropuesta, titulo, estadoId, etapaId, convocatoriaId, investigadorCoordId, escuelaId, lineaInvestigacionId, modalidadId, montoTotal, nivelTrlActual, nivelTrlEsperado, fechaInicio, fechaFinalizacion, fechaCreacion, fechaEnvio)
SELECT
    4, 'FVIE-2027-004',
    'Análisis Estructural de Edificaciones Antisísmicas con Nuevos Polímeros',
    esp.estadoPropuestaId, 4, 1, 4, 2, NULL, m.modalidadId,
    6000000.00, 2, 4, '2027-08-01', '2029-08-01',
    '2026-08-05 14:20:00', '2026-08-15 09:45:00'
FROM EstadosPropuesta esp, Modalidades m
WHERE esp.codigoEstadoPropuesta = 'RECHAZADA'
AND m.nombreModalidad = 'Aplicada'
ON CONFLICT (propuestaId) DO NOTHING;

INSERT INTO Propuestas (propuestaId, codigoPropuesta, titulo, estadoId, etapaId, convocatoriaId, investigadorCoordId, escuelaId, lineaInvestigacionId, modalidadId, montoTotal, nivelTrlActual, nivelTrlEsperado, fechaInicio, fechaFinalizacion, fechaCreacion, fechaEnvio)
SELECT
    5, 'FVIE-2027-005',
    'Optimización de Procesos Químicos mediante Machine Learning',
    esp.estadoPropuestaId, 5, 1, 3, 3, 4, m.modalidadId,
    9500000.00, 5, 7, '2027-01-01', '2028-12-31',
    '2026-08-05 08:30:00', '2026-08-22 15:20:00'
FROM EstadosPropuesta esp, Modalidades m
WHERE esp.codigoEstadoPropuesta = 'EN_CONSEJO'
AND m.nombreModalidad = 'Básica'
ON CONFLICT (propuestaId) DO NOTHING;

-- =============================================================================
-- 6. HISTORIAL DE ESTADOS
-- =============================================================================
INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, NULL, esp2.estadoPropuestaId, 3, '2026-08-20 14:45:00', 'Propuesta enviada a VIE'
FROM EstadosPropuesta esp2 WHERE esp2.codigoEstadoPropuesta = 'ENVIADA'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 3, '2026-08-24 08:00:00', 'Asignada a evaluación VIE'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'ENVIADA' AND esp2.codigoEstadoPropuesta = 'EN_VINCULACION'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 5, '2026-09-01 10:30:00', 'Aprobada evaluación VIE, pasa a Comité'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'EN_VINCULACION' AND esp2.codigoEstadoPropuesta = 'EN_COMITE'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 5, '2026-09-12 14:00:00', 'Aprobada por Comité Técnico'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'EN_COMITE' AND esp2.codigoEstadoPropuesta = 'EN_CONSEJO'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 6, '2026-09-20 11:00:00', 'Aprobada por Consejo de Escuela'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'EN_CONSEJO' AND esp2.codigoEstadoPropuesta = 'EN_CIE'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 1, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 6, '2026-10-20 16:00:00', 'APROBADA por CIE - Financiada'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'EN_CIE' AND esp2.codigoEstadoPropuesta = 'APROBADA'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 4, NULL, esp2.estadoPropuestaId, 4, '2026-08-15 09:45:00', 'Propuesta enviada'
FROM EstadosPropuesta esp2 WHERE esp2.codigoEstadoPropuesta = 'ENVIADA'
ON CONFLICT DO NOTHING;

INSERT INTO HistorialEstadosPropuesta (propuestaId, estadoAnteriorId, estadoNuevoId, usuarioResponsableId, fechaCambio, observaciones)
SELECT 4, esp1.estadoPropuestaId, esp2.estadoPropuestaId, 5, '2026-09-10 15:30:00', 'RECHAZADA: No cumple con criterios metodológicos mínimos'
FROM EstadosPropuesta esp1, EstadosPropuesta esp2
WHERE esp1.codigoEstadoPropuesta = 'ENVIADA' AND esp2.codigoEstadoPropuesta = 'RECHAZADA'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 7. EVALUACIONES Y DICTÁMENES (CON tipoDictamenId)
-- =============================================================================
INSERT INTO Evaluaciones (evaluacionId, propuestaId, evaluadorId, tipoEvaluacionId, fechaEvaluacion, calificacion, tipoRecomendacionId, estadoEvaluacionId)
SELECT 1, 1, 5, te.tipoEvaluacionId, '2026-09-10 14:00:00', 92.00, tr.tipoRecomendacionId, ee.estadoEvaluacionId
FROM TiposEvaluacion te, TiposRecomendacion tr, EstadosEvaluacion ee
WHERE te.nombreTipoEvaluacion = 'ComiteTecnico'
AND tr.nombreTipoRecomendacion = 'Recomendar_Financiamiento'
AND ee.nombreEstadoEvaluacion = 'Completada'
ON CONFLICT (evaluacionId) DO NOTHING;

INSERT INTO Evaluaciones (evaluacionId, propuestaId, evaluadorId, tipoEvaluacionId, fechaEvaluacion, calificacion, tipoRecomendacionId, estadoEvaluacionId)
SELECT 2, 2, 5, te.tipoEvaluacionId, '2026-09-01 10:00:00', 78.00, tr.tipoRecomendacionId, ee.estadoEvaluacionId
FROM TiposEvaluacion te, TiposRecomendacion tr, EstadosEvaluacion ee
WHERE te.nombreTipoEvaluacion = 'ComiteTecnico'
AND tr.nombreTipoRecomendacion = 'Recomendar_Condicionado'
AND ee.nombreEstadoEvaluacion = 'Borrador'
ON CONFLICT (evaluacionId) DO NOTHING;

INSERT INTO Evaluaciones (evaluacionId, propuestaId, evaluadorId, tipoEvaluacionId, fechaEvaluacion, calificacion, tipoRecomendacionId, estadoEvaluacionId)
SELECT 3, 4, 5, te.tipoEvaluacionId, '2026-09-05 16:00:00', 55.00, tr.tipoRecomendacionId, ee.estadoEvaluacionId
FROM TiposEvaluacion te, TiposRecomendacion tr, EstadosEvaluacion ee
WHERE te.nombreTipoEvaluacion = 'ComiteTecnico'
AND tr.nombreTipoRecomendacion = 'No_Recomendar_Financiamiento'
AND ee.nombreEstadoEvaluacion = 'Completada'
ON CONFLICT (evaluacionId) DO NOTHING;

-- DICTÁMENES CON tipoDictamenId (CORREGIDO)
INSERT INTO Dictamenes (dictamenId, propuestaId, tipoDictamenId, numeroOficio, fechaEmision, contenido, usuarioRemitenteId)
SELECT 1, 1, td.tipoDictamenId, 'CT-2026-045', '2026-09-12 14:00:00', 
    'El Comité Técnico aprueba la propuesta FVIE-2027-001 con calificación de 92/100. Se recomienda financiamiento completo.', 5
FROM TiposDictamen td WHERE td.nombreTipoDictamen = 'ComiteTecnico'
ON CONFLICT (dictamenId) DO NOTHING;

INSERT INTO Dictamenes (dictamenId, propuestaId, tipoDictamenId, numeroOficio, fechaEmision, contenido, usuarioRemitenteId)
SELECT 2, 4, td.tipoDictamenId, 'CT-2026-052', '2026-09-10 15:30:00',
    'El Comité Técnico rechaza la propuesta FVIE-2027-004. La metodología no es adecuada para los objetivos.', 5
FROM TiposDictamen td WHERE td.nombreTipoDictamen = 'ComiteTecnico'
ON CONFLICT (dictamenId) DO NOTHING;

-- =============================================================================
-- 8. ACUERDOS DE CONSEJO
-- =============================================================================
INSERT INTO AcuerdosConsejo (acuerdoId, propuestaId, tipoAcuerdoId, numeroAcuerdo, fechaAcuerdo, horasAprobadas, tipoHoraId, presupuestoAprobado, usuarioFirmaId)
SELECT 1, 1, ta.tipoAcuerdoId, 'CE-IC-2026-089', '2026-09-20', 20.0, th.tipoHoraId, 15000000.00, 3
FROM TiposAcuerdo ta, TiposHora th
WHERE ta.nombreTipoAcuerdo = 'Aval' AND th.codigoTipo = 'VIE'
ON CONFLICT (acuerdoId) DO NOTHING;

-- =============================================================================
-- 9. INTEGRANTES DE EQUIPO
-- =============================================================================
INSERT INTO IntegrantesEquipoPropuesta (propuestaId, usuarioId, tipoHoraId, horasSemanales, rolEquipoId)
SELECT 1, 3, th.tipoHoraId, 20.0, re.rolEquipoId
FROM TiposHora th, RolesEquipo re
WHERE th.codigoTipo = 'VIE' AND re.nombreRol = 'Coordinador'
ON CONFLICT DO NOTHING;

INSERT INTO IntegrantesEquipoPropuesta (propuestaId, usuarioId, tipoHoraId, horasSemanales, rolEquipoId)
SELECT 1, 4, th.tipoHoraId, 10.0, re.rolEquipoId
FROM TiposHora th, RolesEquipo re
WHERE th.codigoTipo = 'VIE' AND re.nombreRol = 'Investigador'
ON CONFLICT DO NOTHING;

INSERT INTO IntegrantesEquipoPropuesta (propuestaId, usuarioId, tipoHoraId, horasSemanales, rolEquipoId)
SELECT 1, 5, th.tipoHoraId, 5.0, re.rolEquipoId
FROM TiposHora th, RolesEquipo re
WHERE th.codigoTipo = 'VIE-CENTROS' AND re.nombreRol = 'Asistente'
ON CONFLICT DO NOTHING;

INSERT INTO IntegrantesEquipoPropuesta (propuestaId, usuarioId, tipoHoraId, horasSemanales, rolEquipoId)
SELECT 2, 4, th.tipoHoraId, 15.0, re.rolEquipoId
FROM TiposHora th, RolesEquipo re
WHERE th.codigoTipo = 'VIE' AND re.nombreRol = 'Coordinador'
ON CONFLICT DO NOTHING;

INSERT INTO IntegrantesEquipoPropuesta (propuestaId, usuarioId, tipoHoraId, horasSemanales, rolEquipoId)
SELECT 2, 3, th.tipoHoraId, 5.0, re.rolEquipoId
FROM TiposHora th, RolesEquipo re
WHERE th.codigoTipo = 'VIE' AND re.nombreRol = 'Investigador'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10-12. OBJETIVOS, ACTIVIDADES, PRODUCTOS
-- =============================================================================
INSERT INTO ObjetivosEspecificos (objetivoEspecificoId, propuestaId, numeroObjetivo, descripcion) VALUES
(1, 1, 1, 'Desarrollar un algoritmo de deep learning para detección de anomalías en electrocardiogramas'),
(2, 1, 2, 'Validar el modelo con base de datos clínica del Hospital Carlos Luis Valverde Vega'),
(3, 1, 3, 'Implementar sistema prototipo en entorno hospitalario real'),
(4, 1, 4, 'Publicar 2 artículos en revistas indexadas Q1/Q2')
ON CONFLICT (objetivoEspecificoId) DO NOTHING;

INSERT INTO Actividades (actividadId, propuestaId, objetivoEspecificoId, descripcionActividad, resultadoEsperado, mesInicio, duracionMeses, anioEjecucion) VALUES
(1, 1, 1, 'Revisión bibliográfica y estado del arte', 'Documento de revisión completado', 1, 2.0, 2027),
(2, 1, 2, 'Recolección y preprocesamiento de datos ECG', 'Dataset limpio y etiquetado', 3, 3.5, 2027),
(3, 1, 3, 'Desarrollo del modelo de IA', 'Modelo entrenado y validado', 7, 6.0, 2027),
(4, 1, 4, 'Validación clínica del modelo', 'Reporte de validación clínica', 1, 6.0, 2028)
ON CONFLICT (actividadId) DO NOTHING;

INSERT INTO ProductosAcademicos (propuestaId, tipoProductoAcademicoId, objetivoEspecificoId, descripcion, cantidadComprometida, fechaEntregaEstimada)
SELECT 1, tpa.tipoProductoAcademicoId, 4, 'Artículo en IEEE Transactions on Biomedical Engineering (Q1)', 1, '2028-06-30'
FROM TiposProductosAcademicos tpa WHERE tpa.nombreTipoProductoAcademico = 'Articulo_WoS_Scopus'
ON CONFLICT DO NOTHING;

INSERT INTO ProductosAcademicos (propuestaId, tipoProductoAcademicoId, objetivoEspecificoId, descripcion, cantidadComprometida, fechaEntregaEstimada)
SELECT 1, tpa.tipoProductoAcademicoId, 4, 'Artículo en Journal of Medical Systems (Q2)', 1, '2028-12-31'
FROM TiposProductosAcademicos tpa WHERE tpa.nombreTipoProductoAcademico = 'Articulo_WoS_Scopus'
ON CONFLICT DO NOTHING;

INSERT INTO ProductosAcademicos (propuestaId, tipoProductoAcademicoId, objetivoEspecificoId, descripcion, cantidadComprometida, fechaEntregaEstimada)
SELECT 1, tpa.tipoProductoAcademicoId, 3, 'Prototipo funcional validado en hospital', 1, '2028-12-31'
FROM TiposProductosAcademicos tpa WHERE tpa.nombreTipoProductoAcademico = 'Prototipo_Funcional'
ON CONFLICT DO NOTHING;

INSERT INTO ProductosAcademicos (propuestaId, tipoProductoAcademicoId, objetivoEspecificoId, descripcion, cantidadComprometida, fechaEntregaEstimada)
SELECT 1, tpa.tipoProductoAcademicoId, NULL, 'Solicitud de patente de software', 1, '2029-01-14'
FROM TiposProductosAcademicos tpa WHERE tpa.nombreTipoProductoAcademico = 'Software_Registrado'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 13. NOTIFICACIONES Y LOGS
-- =============================================================================
INSERT INTO Notificaciones (usuarioDestinoId, propuestaId, tipoNotificacionId, asunto, cuerpoMensaje, leida, fechaEnvio, canalId)
SELECT 3, 1, tn.tipoNotificacionId, 'Propuesta Aprobada', 'Su propuesta FVIE-2027-001 ha sido APROBADA por el CIE.', TRUE, '2026-10-20 16:30:00', 1
FROM TiposNotificacion tn WHERE tn.nombreTipoNotificacion = 'Aprobacion_Propuesta'
ON CONFLICT DO NOTHING;

INSERT INTO Notificaciones (usuarioDestinoId, propuestaId, tipoNotificacionId, asunto, cuerpoMensaje, leida, fechaEnvio, canalId)
SELECT 4, 4, tn.tipoNotificacionId, 'Propuesta Rechazada', 'Su propuesta FVIE-2027-004 no fue aprobada.', TRUE, '2026-10-20 16:35:00', 1
FROM TiposNotificacion tn WHERE tn.nombreTipoNotificacion = 'Rechazo_Propuesta'
ON CONFLICT DO NOTHING;

INSERT INTO Notificaciones (usuarioDestinoId, propuestaId, tipoNotificacionId, asunto, cuerpoMensaje, leida, fechaEnvio, canalId)
SELECT 3, 3, tn.tipoNotificacionId, 'Solicitud de Subsanación', 'La propuesta FVIE-2027-003 requiere subsanaciones.', FALSE, NOW(), 1
FROM TiposNotificacion tn WHERE tn.nombreTipoNotificacion = 'Solicitud_Subsanacion'
ON CONFLICT DO NOTHING;

-- Logs con severidades de 4 niveles
INSERT INTO Logs (tipoEventoId, severidadId, descripcion, sourceId, userAgent, computadora, usuarioId, referenciaId1, creadoEn)
SELECT te.tipoEventoId, s.severidadId, 'Inicio de sesión exitoso - sistema@tec.ac.cr', s2.sourceId, 'Mozilla/5.0', 'PC-ADMIN-01', 1, NULL, '2026-10-23 08:00:00'
FROM TiposEvento te, Severidades s, Sources s2
WHERE te.nombreEvento = 'AUTH.LOGIN_EXITOSO' AND s.nombreSeveridad = 'INFO' AND s2.nombreSource = 'SGPI.API'
ON CONFLICT DO NOTHING;

INSERT INTO Logs (tipoEventoId, severidadId, descripcion, sourceId, userAgent, computadora, usuarioId, referenciaId1, creadoEn)
SELECT te.tipoEventoId, s.severidadId, 'Nueva propuesta creada: FVIE-2027-001', s2.sourceId, 'Mozilla/5.0 Chrome 120', 'PC-INV-01', 3, 1, '2026-08-15 10:30:00'
FROM TiposEvento te, Severidades s, Sources s2
WHERE te.nombreEvento = 'PROPUESTA.CREADA' AND s.nombreSeveridad = 'INFO' AND s2.nombreSource = 'SGPI.Formulacion'
ON CONFLICT DO NOTHING;

INSERT INTO Logs (tipoEventoId, severidadId, descripcion, sourceId, userAgent, computadora, usuarioId, referenciaId1, creadoEn)
SELECT te.tipoEventoId, s.severidadId, 'Evaluación completada - Propuesta FVIE-2027-001 - Calificación: 92/100', s2.sourceId, 'Mozilla/5.0 Chrome 120', 'PC-EVAL-01', 5, 1, '2026-09-10 14:00:00'
FROM TiposEvento te, Severidades s, Sources s2
WHERE te.nombreEvento = 'EVALUACION.COMPLETADA' AND s.nombreSeveridad = 'INFO' AND s2.nombreSource = 'SGPI.Evaluacion'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 14. CONFIGURACIONES Y PREFERENCIAS
-- =============================================================================
INSERT INTO ConfiguracionesSistema (claveConfiguracion, valorConfiguracion, categoria, descripcion, esPublica, activa) VALUES
('MAX_MONTO_PROPUESTA', '20000000', 'Propuestas', 'Monto máximo permitido', TRUE, TRUE),
('MIN_CALIFICACION_APROBACION', '70', 'Evaluación', 'Calificación mínima para aprobación', TRUE, TRUE),
('MIN_REFERENCIAS_ESTADO_ARTE', '10', 'Formulacion', 'Mínimo de referencias de los últimos 5 años en estado del arte', TRUE, TRUE),
('MAX_PALABRAS_RESUMEN', '500', 'Formulacion', 'Máximo de palabras permitidas en el resumen', TRUE, TRUE),
('MIN_HORAS_GENERAL', '4', 'Equipo', 'Mínimo de horas generales para investigadores', TRUE, TRUE),
('MIN_HORAS_REC', '2', 'Equipo', 'Mínimo de horas para recién graduados', TRUE, TRUE),
('MIN_PRODUCTOS_1_10_HORAS', '1', 'Productos', 'Productos mínimos para 1-10 horas asignadas', TRUE, TRUE),
('MIN_PRODUCTOS_11_20_HORAS', '2', 'Productos', 'Productos mínimos para 11-20 horas asignadas', TRUE, TRUE),
('MIN_PRODUCTOS_21_MAS_HORAS', '3', 'Productos', 'Productos mínimos para 21+ horas asignadas', TRUE, TRUE),
('MAX_EVALUADORES_COMITE', '3', 'Evaluacion', 'Cantidad máxima de evaluadores independientes por propuesta', TRUE, TRUE),
('PLAZO_CARTA_ACEPTACION_DIAS', '5', 'Convocatorias', 'Plazo en días para remitir carta de aceptación', TRUE, TRUE),
('ANIOS_ANTIGUEDAD_REFERENCIAS', '5', 'Formulacion', 'Antigüedad máxima de referencias bibliográficas', TRUE, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO PreferenciasAccesibilidad (usuarioId, modoAltoContraste, tamanioFuenteId, filtroDaltonismoId, reducirAnimaciones, optimizarLectorPantalla)
SELECT 3, FALSE, tf.tamanioFuenteId, fd.filtroDaltonismoId, FALSE, FALSE
FROM TamaniosFuente tf, FiltrosDaltonismo fd
WHERE tf.nombreTamanioFuente = 'Normal (16px)' AND fd.nombreFiltroDaltonismo = 'Ninguno'
ON CONFLICT (usuarioId) DO NOTHING;

INSERT INTO PreferenciasAccesibilidad (usuarioId, modoAltoContraste, tamanioFuenteId, filtroDaltonismoId, reducirAnimaciones, optimizarLectorPantalla)
SELECT 4, TRUE, tf.tamanioFuenteId, fd.filtroDaltonismoId, TRUE, FALSE
FROM TamaniosFuente tf, FiltrosDaltonismo fd
WHERE tf.nombreTamanioFuente = 'Grande (18px)' AND fd.nombreFiltroDaltonismo = 'Protanopia'
ON CONFLICT (usuarioId) DO NOTHING;

-- =============================================================================
-- 15. ACTUALIZAR SECUENCIAS
-- =============================================================================
SELECT setval('usuarios_usuarioid_seq', COALESCE((SELECT MAX(usuarioId) FROM Usuarios), 1));
SELECT setval('propuestas_propuestaid_seq', COALESCE((SELECT MAX(propuestaId) FROM Propuestas), 1));
SELECT setval('convocatorias_convocatoriaid_seq', COALESCE((SELECT MAX(convocatoriaId) FROM Convocatorias), 1));
SELECT setval('etapasconvocatoria_etapaid_seq', COALESCE((SELECT MAX(etapaId) FROM EtapasConvocatoria), 1));
SELECT setval('objetivosespecificos_objetivoespecificoid_seq', COALESCE((SELECT MAX(objetivoEspecificoId) FROM ObjetivosEspecificos), 1));
SELECT setval('actividades_actividadid_seq', COALESCE((SELECT MAX(actividadId) FROM Actividades), 1));
SELECT setval('evaluaciones_evaluacionid_seq', COALESCE((SELECT MAX(evaluacionId) FROM Evaluaciones), 1));
SELECT setval('dictamenes_dictamenid_seq', COALESCE((SELECT MAX(dictamenId) FROM Dictamenes), 1));
SELECT setval('acuerdosconsejo_acuerdoid_seq', COALESCE((SELECT MAX(acuerdoId) FROM AcuerdosConsejo), 1));

-- =============================================================================
-- 16. VERIFICACIÓN FINAL
-- =============================================================================
DO $$
DECLARE
    v_usuarios INT;
    v_propuestas INT;
    v_evaluaciones INT;
BEGIN
    SELECT COUNT(*) INTO v_usuarios FROM Usuarios;
    SELECT COUNT(*) INTO v_propuestas FROM Propuestas;
    SELECT COUNT(*) INTO v_evaluaciones FROM Evaluaciones;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'INSERCIÓN DE DATOS DE PRUEBA COMPLETADA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Usuarios:              %', v_usuarios;
    RAISE NOTICE 'Propuestas:            %', v_propuestas;
    RAISE NOTICE 'Evaluaciones:          %', v_evaluaciones;
    RAISE NOTICE '============================================';
END $$;