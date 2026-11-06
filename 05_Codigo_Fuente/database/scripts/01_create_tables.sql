-- =============================================================================
-- SGPI - Sistema de Gestión de Propuestas de Investigación (Fondos VIE)
-- Script de Creación de Tablas (PostgreSQL) - OPTIMIZADO COMPLETAMENTE
-- Autor: Gerald Hernández Gamboa y Equipo
-- =============================================================================

-- 1. CATÁLOGOS BASE (Usan SMALLINT para optimizar almacenamiento)
CREATE TABLE Campus (
    campusId SMALLSERIAL PRIMARY KEY,
    nombreCampus VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE Escuelas (
    escuelaId SMALLSERIAL PRIMARY KEY,
    codigoEscuela VARCHAR(10) UNIQUE NOT NULL,
    nombreEscuela VARCHAR(150) NOT NULL,
    campusId SMALLINT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (campusId) REFERENCES Campus(campusId)
);

CREATE TABLE TiposHora (
    tipoHoraId SMALLSERIAL PRIMARY KEY,
    codigoTipo VARCHAR(20) UNIQUE NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE NivelesTrl (
    nivelTrlId SMALLINT PRIMARY KEY,
    descripcionNivel VARCHAR(500) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE RolesSistema (
    rolId SMALLSERIAL PRIMARY KEY,
    nombreRol VARCHAR(100) UNIQUE NOT NULL,
    descripcionRol VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE EstadosPropuesta (
    estadoPropuestaId SMALLSERIAL PRIMARY KEY,
    codigoEstadoPropuesta VARCHAR(20) UNIQUE NOT NULL,
    nombreEstadoPropuesta VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    esFinal BOOLEAN DEFAULT FALSE,
    orden SMALLINT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Modalidades (
    modalidadId SMALLSERIAL PRIMARY KEY,
    nombreModalidad VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE RolesEquipo (
    rolEquipoId SMALLSERIAL PRIMARY KEY,
    nombreRol VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposInnovacion (
    tipoInnovacionId SMALLSERIAL PRIMARY KEY,
    nombreTipoInnovacion VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposDocumento (
    tipoDocumentoId SMALLSERIAL PRIMARY KEY,
    nombreTipoDocumento VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposFinanciamiento (
    tipoFinanciamientoId SMALLSERIAL PRIMARY KEY,
    nombreTipoFinanciamiento VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE EntidadesEmisoras (
    entidadEmisoraId SMALLSERIAL PRIMARY KEY,
    nombreEntidadEmisora VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE EntesRegulatorios (
    enteRegulatorioId SMALLSERIAL PRIMARY KEY,
    nombreEnteRegulatorio VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE EstadosAval (
    estadoAvalId SMALLSERIAL PRIMARY KEY,
    nombreEstadoAval VARCHAR(30) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposProductosAcademicos (
    tipoProductoAcademicoId SMALLSERIAL PRIMARY KEY,
    nombreTipoProductoAcademico VARCHAR(100) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposEvaluacion (
    tipoEvaluacionId SMALLSERIAL PRIMARY KEY,
    nombreTipoEvaluacion VARCHAR(50) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposRecomendacion (
    tipoRecomendacionId SMALLSERIAL PRIMARY KEY,
    nombreTipoRecomendacion VARCHAR(50) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE EstadosEvaluacion (
    estadoEvaluacionId SMALLSERIAL PRIMARY KEY,
    nombreEstadoEvaluacion VARCHAR(50) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposDictamen (
    tipoDictamenId SMALLSERIAL PRIMARY KEY,
    nombreTipoDictamen VARCHAR(50) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE ModulosSistema (
    moduloId SMALLSERIAL PRIMARY KEY,
    nombreModulo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TamaniosFuente (
    tamanioFuenteId SMALLSERIAL PRIMARY KEY,
    nombreTamanioFuente VARCHAR(20) DEFAULT 'Normal',
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE CanalesComunicacion (
    canalId SMALLSERIAL PRIMARY KEY,
    nombreCanal VARCHAR(30) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE FiltrosDaltonismo (
    filtroDaltonismoId SMALLSERIAL PRIMARY KEY,
    nombreFiltroDaltonismo VARCHAR(30) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposNotificacion (
    tipoNotificacionId SMALLSERIAL PRIMARY KEY,
    nombreTipoNotificacion VARCHAR(30) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposEvento (
    tipoEventoId SMALLSERIAL PRIMARY KEY,
    nombreEvento VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255) NULL,
    requierePreguardado BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Severidades (
    severidadId SMALLSERIAL PRIMARY KEY,
    valorSeveridad SMALLINT NOT NULL,
    nombreSeveridad VARCHAR(50) UNIQUE NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Objetos (
    objetoId SMALLSERIAL PRIMARY KEY,
    nombreObjeto VARCHAR(50) UNIQUE NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE Sources (
    sourceId SMALLSERIAL PRIMARY KEY,
    nombreSource VARCHAR(50) UNIQUE NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE EstadosSubsanacion (
    estadoSubsanacionId SMALLSERIAL PRIMARY KEY,
    nombreEstadoSubsanacion VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

CREATE TABLE TiposResponsabilidad (
    tipoResponsabilidadId SMALLSERIAL PRIMARY KEY,
    nombreTipoResponsabilidad VARCHAR(30) NOT NULL,
    descripcion VARCHAR(200) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL
);

-- 2. ENTIDADES PRINCIPALES (Optimizadas según proyección)
CREATE TABLE Usuarios (
    usuarioId SMALLSERIAL PRIMARY KEY, -- ~500 registros en 5 años
    correoInstitucional VARCHAR(100) UNIQUE NOT NULL,
    nombreUsuario VARCHAR(50) NOT NULL,
    apellido1Usuario VARCHAR(50) NOT NULL,
    apellido2Usuario VARCHAR(50) NULL,
    telefono VARCHAR(15) NULL,
    escuelaId SMALLINT NULL,
    contrasenaHash VARCHAR(255) NULL,
    fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    ultimoAcceso TIMESTAMP NULL,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (escuelaId) REFERENCES Escuelas(escuelaId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE LineasInvestigacion (
    lineaId SMALLSERIAL PRIMARY KEY, -- ~40 registros
    nombreLinea VARCHAR(200) UNIQUE NOT NULL,
    descripcion VARCHAR(500) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Convocatorias (
    convocatoriaId SMALLSERIAL PRIMARY KEY, -- ~15 registros
    nombreConvocatoria VARCHAR(100) NOT NULL,
    fechaApertura DATE NOT NULL,
    fechaCierre DATE NOT NULL,
    fechaBloqueoOrion DATE NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE EtapasConvocatoria (
    etapaId SMALLSERIAL PRIMARY KEY, -- ~75 registros
    convocatoriaId SMALLINT NOT NULL,
    nombreEtapa VARCHAR(100) NOT NULL,
    fechaInicio TIMESTAMP NOT NULL,
    fechaFin TIMESTAMP NOT NULL,
    esBloqueante BOOLEAN DEFAULT FALSE,
    rolResponsableId SMALLINT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (convocatoriaId) REFERENCES Convocatorias(convocatoriaId),
    FOREIGN KEY (rolResponsableId) REFERENCES RolesSistema(rolId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE ConfiguracionesSistema (
    configuracionId SMALLSERIAL PRIMARY KEY, -- ~30 registros
    claveConfiguracion VARCHAR(100) UNIQUE NOT NULL,
    valorConfiguracion TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255) NULL,
    esPublica BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

-- 3. NÚCLEO DE PROPUESTAS (Propuestas mantiene INT, resto optimizado)
CREATE TABLE Propuestas (
    propuestaId SERIAL PRIMARY KEY, -- ~1,000 registros, tabla central
    codigoPropuesta VARCHAR(20) UNIQUE NOT NULL,
    titulo VARCHAR(300) NOT NULL,
    estadoId SMALLINT NOT NULL,
    etapaId SMALLINT NOT NULL,
    convocatoriaId SMALLINT NOT NULL,
    investigadorCoordId SMALLINT NOT NULL,
    escuelaId SMALLINT NOT NULL,
    lineaInvestigacionId SMALLINT NULL,
    modalidadId SMALLINT NULL,
    montoTotal DECIMAL(12,2) NOT NULL,
    nivelTrlActual SMALLINT NULL,
    nivelTrlEsperado SMALLINT NULL,
    fechaInicio DATE NULL,
    fechaFinalizacion DATE NULL,
    fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaEnvio TIMESTAMP NULL,
    propuestaAnteriorId INT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (estadoId) REFERENCES EstadosPropuesta(estadoPropuestaId),
    FOREIGN KEY (etapaId) REFERENCES EtapasConvocatoria(etapaId),
    FOREIGN KEY (convocatoriaId) REFERENCES Convocatorias(convocatoriaId),
    FOREIGN KEY (investigadorCoordId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (escuelaId) REFERENCES Escuelas(escuelaId),
    FOREIGN KEY (lineaInvestigacionId) REFERENCES LineasInvestigacion(lineaId),
    FOREIGN KEY (modalidadId) REFERENCES Modalidades(modalidadId),
    FOREIGN KEY (propuestaAnteriorId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE PropuestaContenido (
    propuestaId INT UNIQUE NOT NULL PRIMARY KEY, -- Relación 1:1 con Propuestas
    resumen VARCHAR(4000) NOT NULL,
    palabrasClave VARCHAR(255) NULL,
    abstract VARCHAR(4000) NULL,
    problemaInvestigacion VARCHAR(4000) NULL,
    objetivoGeneral VARCHAR(2000) NULL,
    objetivosEspecificos VARCHAR(3000) NULL,
    estadoArte VARCHAR(8000) NULL,
    metodologia VARCHAR(6000) NULL,
    estrategiaDivulgacion VARCHAR(3000) NULL,
    hojaRuta VARCHAR(4000) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE IF NOT EXISTS PropuestaDeclaraciones (
    propuestaId INT UNIQUE NOT NULL PRIMARY KEY,
    tieneFinanciamientoPrevio BOOLEAN DEFAULT FALSE,
    tieneContinuidadProyecto BOOLEAN DEFAULT FALSE,
    requiereInstrumentoJuridico BOOLEAN DEFAULT FALSE,
    tieneBasePosgrado BOOLEAN DEFAULT FALSE,
    tieneInformacionConfidencial BOOLEAN DEFAULT FALSE,
    tienePotencialPI BOOLEAN DEFAULT FALSE,
    poseeInnovacion BOOLEAN DEFAULT FALSE,
    tipoInnovacionId SMALLINT NULL,
    aceptaResguardoRepositorio BOOLEAN DEFAULT FALSE,
    aceptaDeclaracionJurada BOOLEAN DEFAULT FALSE,
    fechaFirmaDeclaracion TIMESTAMP NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId)
);

CREATE TABLE ObjetivosEspecificos (
    objetivoEspecificoId SMALLSERIAL PRIMARY KEY, -- ~3,000 registros
    propuestaId INT NOT NULL,
    numeroObjetivo SMALLINT NOT NULL,
    descripcion TEXT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Actividades (
    actividadId SMALLSERIAL PRIMARY KEY, -- ~5,000 registros
    propuestaId INT NOT NULL,
    objetivoEspecificoId SMALLINT NOT NULL,
    descripcionActividad TEXT NOT NULL,
    resultadoEsperado TEXT NOT NULL,
    mesInicio SMALLINT NOT NULL,
    duracionMeses DECIMAL(5,2) NOT NULL,
    anioEjecucion SMALLINT NOT NULL,
    esGira BOOLEAN DEFAULT FALSE,
    esPasantia BOOLEAN DEFAULT FALSE,
    requiereInformeAvance BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (objetivoEspecificoId) REFERENCES ObjetivosEspecificos(objetivoEspecificoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Riesgos (
    riesgoId SMALLSERIAL PRIMARY KEY, -- ~5,000 registros
    actividadId SMALLINT NOT NULL,
    descripcionRiesgo TEXT NOT NULL,
    probabilidad VARCHAR(20) NULL,
    impacto VARCHAR(20) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (actividadId) REFERENCES Actividades(actividadId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE MedidasMitigacion (
    medidaMitigacionId SMALLSERIAL PRIMARY KEY, -- ~5,000 registros
    riesgoId SMALLINT NOT NULL,
    descripcionMedida TEXT NOT NULL,
    usuarioResponsableId SMALLINT NOT NULL,
    esPermisoEtico BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (riesgoId) REFERENCES Riesgos(riesgoId),
    FOREIGN KEY (usuarioResponsableId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE ParticipantesActividad (
    participanteActividadId SMALLSERIAL PRIMARY KEY, -- ~10,000 registros
    actividadId SMALLINT NOT NULL,
    usuarioId SMALLINT NOT NULL,
    tipoResponsabilidadId SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (actividadId) REFERENCES Actividades(actividadId),
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (tipoResponsabilidadId) REFERENCES TiposResponsabilidad(tipoResponsabilidadId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE IntegrantesEquipoPropuesta (
    integranteEquipoId SMALLSERIAL PRIMARY KEY, -- ~5,000 registros
    propuestaId INT NOT NULL,
    usuarioId SMALLINT NOT NULL,
    tipoHoraId SMALLINT NOT NULL,
    horasSemanales DECIMAL(4,1) NOT NULL,
    rolEquipoId SMALLINT NOT NULL,
    orcid VARCHAR(20) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (tipoHoraId) REFERENCES TiposHora(tipoHoraId),
    FOREIGN KEY (rolEquipoId) REFERENCES RolesEquipo(rolEquipoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE ColaboradoresExternos (
    colaboradorId SMALLSERIAL PRIMARY KEY, -- ~400 registros
    propuestaId INT NOT NULL,
    nombreColaborador VARCHAR(50) NOT NULL,
    apellido1Colaborador VARCHAR(50) NULL,
    apellido2Colaborador VARCHAR(50) NULL,
    idOrcid VARCHAR(20) NULL,
    institucionEmpresa VARCHAR(150) NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE PropuestaDocumentos (
    documentoId SMALLSERIAL PRIMARY KEY, -- ~2,000 registros
    propuestaId INT NOT NULL,
    tipoDocumentoId SMALLINT NOT NULL,
    rutaArchivo VARCHAR(500) NOT NULL,
    nombreArchivo VARCHAR(255) NOT NULL,
    tamanioBytes INT NULL,
    checksum VARCHAR(64) NULL,
    fechaCarga TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioCargaId SMALLINT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (tipoDocumentoId) REFERENCES TiposDocumento(tipoDocumentoId),
    FOREIGN KEY (usuarioCargaId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE FinanciamientoExterno (
    financiamientoId SMALLSERIAL PRIMARY KEY, -- ~200 registros
    propuestaId INT NOT NULL,
    tipoFinanciamientoId SMALLINT NOT NULL,
    anio SMALLINT NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    numeroOficio VARCHAR(50) NULL,
    entidadEmisoraId SMALLINT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (tipoFinanciamientoId) REFERENCES TiposFinanciamiento(tipoFinanciamientoId),
    FOREIGN KEY (entidadEmisoraId) REFERENCES EntidadesEmisoras(entidadEmisoraId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE AspectosEticos (
    aspectoEticoId SMALLSERIAL PRIMARY KEY, -- ~1,000 registros
    propuestaId INT NOT NULL,
    involucraSeresHumanos BOOLEAN DEFAULT FALSE,
    involucraBiodiversidad BOOLEAN DEFAULT FALSE,
    involucraAnimales BOOLEAN DEFAULT FALSE,
    involucraTerritoriosIndigenas BOOLEAN DEFAULT FALSE,
    justificacionExencion TEXT NULL,
    enteRegulatorioId SMALLINT NULL,
    estadoAvalId SMALLINT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (enteRegulatorioId) REFERENCES EntesRegulatorios(enteRegulatorioId),
    FOREIGN KEY (estadoAvalId) REFERENCES EstadosAval(estadoAvalId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Autores (
    autorId SMALLSERIAL PRIMARY KEY, -- ~1,000 registros
    nombreCompleto VARCHAR(150) NOT NULL,
    orcid VARCHAR(20) UNIQUE NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE FuentesBibliograficas (
    fuenteId SMALLSERIAL PRIMARY KEY, -- ~3,000 registros
    doi VARCHAR(100) UNIQUE NULL,
    titulo VARCHAR(500) NOT NULL,
    anioPublicacion SMALLINT NOT NULL,
    revistaFuente VARCHAR(200) NULL,
    esIndexadaWoSScopus BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE AutorFuente (
    autorFuenteId SMALLSERIAL PRIMARY KEY, -- ~6,000 registros
    autorId SMALLINT NOT NULL,
    fuenteId SMALLINT NOT NULL,
    ordenAutoria SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (autorId) REFERENCES Autores(autorId),
    FOREIGN KEY (fuenteId) REFERENCES FuentesBibliograficas(fuenteId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE PropuestaReferencia (
    propuestaReferenciaId SMALLSERIAL PRIMARY KEY, -- ~15,000 registros
    propuestaId INT NOT NULL,
    fuenteId SMALLINT NOT NULL,
    ordenReferencia SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (fuenteId) REFERENCES FuentesBibliograficas(fuenteId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE RubrosPropuesta (
    rubroId SMALLSERIAL PRIMARY KEY, -- ~8 registros
    nombreRubro VARCHAR(100) NOT NULL,
    descripcionRubro VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE PresupuestoPropuesta (
    presupuestoId SMALLSERIAL PRIMARY KEY, -- ~4,000 registros
    propuestaId INT NOT NULL,
    rubroId SMALLINT NOT NULL,
    montoSolicitado DECIMAL(12,2) NOT NULL,
    montoAprobado DECIMAL(12,2) NULL,
    anioEjecucion SMALLINT NOT NULL,
    esDuradero BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (rubroId) REFERENCES RubrosPropuesta(rubroId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE ProductosAcademicos (
    productoId SMALLSERIAL PRIMARY KEY, -- ~3,000 registros
    propuestaId INT NOT NULL,
    tipoProductoAcademicoId SMALLINT NOT NULL,
    objetivoEspecificoId SMALLINT NULL,
    descripcion VARCHAR(300) NOT NULL,
    cantidadComprometida SMALLINT NOT NULL,
    fechaEntregaEstimada DATE NULL,
    fechaEntregaReal DATE NULL,
    esPropiedadIndustrial BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (tipoProductoAcademicoId) REFERENCES TiposProductosAcademicos(tipoProductoAcademicoId),
    FOREIGN KEY (objetivoEspecificoId) REFERENCES ObjetivosEspecificos(objetivoEspecificoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

-- 4. EVALUACIÓN Y SEGUIMIENTO (Todo optimizado)
CREATE TABLE HistorialEstadosPropuesta (
    historialEstadoId SMALLSERIAL PRIMARY KEY, -- ~3,000 registros
    propuestaId INT NOT NULL,
    estadoAnteriorId SMALLINT NULL,
    estadoNuevoId SMALLINT NOT NULL,
    usuarioResponsableId SMALLINT NOT NULL,
    fechaCambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (estadoAnteriorId) REFERENCES EstadosPropuesta(estadoPropuestaId),
    FOREIGN KEY (estadoNuevoId) REFERENCES EstadosPropuesta(estadoPropuestaId),
    FOREIGN KEY (usuarioResponsableId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Subsanaciones (
    subsanacionId SMALLSERIAL PRIMARY KEY, -- ~300 registros
    propuestaId INT NOT NULL,
    gestoraVIEId SMALLINT NOT NULL,
    fechaSolicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comentarioGestora TEXT NOT NULL,
    fechaRespuestaInvestigador TIMESTAMP NULL,
    respuestaInvestigador TEXT NULL,
    estadoSubsanacionId SMALLINT NOT NULL DEFAULT 1,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (gestoraVIEId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (estadoSubsanacionId) REFERENCES EstadosSubsanacion(estadoSubsanacionId)
);

CREATE TABLE CriteriosEvaluacion (
    criterioId SMALLSERIAL PRIMARY KEY, -- ~500 registros
    tipoEvaluacionId SMALLINT NOT NULL,
    nombreSeccion VARCHAR(100) NOT NULL,
    nombreCriterio VARCHAR(200) NOT NULL,
    pesoPorcentaje DECIMAL(5,2) NOT NULL,
    esRequisitoObligatorio BOOLEAN DEFAULT FALSE,
    orden SMALLINT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tipoEvaluacionId) REFERENCES TiposEvaluacion(tipoEvaluacionId)
);

CREATE TABLE Evaluaciones (
    evaluacionId SMALLSERIAL PRIMARY KEY, -- ~2,500 registros
    propuestaId INT NOT NULL,
    evaluadorId SMALLINT NOT NULL,
    tipoEvaluacionId SMALLINT NOT NULL,
    fechaEvaluacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    calificacion DECIMAL(5,2) NULL,
    tipoRecomendacionId SMALLINT NULL,
    observaciones TEXT NULL,
    estadoEvaluacionId SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (evaluadorId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (tipoEvaluacionId) REFERENCES TiposEvaluacion(tipoEvaluacionId),
    FOREIGN KEY (tipoRecomendacionId) REFERENCES TiposRecomendacion(tipoRecomendacionId),
    FOREIGN KEY (estadoEvaluacionId) REFERENCES EstadosEvaluacion(estadoEvaluacionId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE DetalleEvaluacion (
    detalleEvaluacionId SMALLSERIAL PRIMARY KEY, -- ~7,500 registros
    evaluacionId SMALLINT NOT NULL,
    criterioId SMALLINT NOT NULL,
    puntajeObtenido DECIMAL(5,2) NOT NULL,
    justificacion TEXT NULL,
    esRequisitoObligatorioCumplido BOOLEAN NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (evaluacionId) REFERENCES Evaluaciones(evaluacionId),
    FOREIGN KEY (criterioId) REFERENCES CriteriosEvaluacion(criterioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Dictamenes (
    dictamenId SMALLSERIAL PRIMARY KEY, -- ~1,000 registros
    propuestaId INT NOT NULL,
    numeroOficio VARCHAR(50) NULL,
    fechaEmision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contenido TEXT NOT NULL,
    rutaArchivo VARCHAR(500) NULL,
    usuarioRemitenteId SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (usuarioRemitenteId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE TiposAcuerdo (
    tipoAcuerdoId SMALLSERIAL PRIMARY KEY, -- ~6 registros
    nombreTipoAcuerdo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(300) NULL,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE AcuerdosConsejo (
    acuerdoId SMALLSERIAL PRIMARY KEY, -- ~1,000 registros
    propuestaId INT NOT NULL,
    tipoAcuerdoId SMALLINT NOT NULL,
    numeroAcuerdo VARCHAR(50) NULL,
    fechaAcuerdo DATE NULL,
    horasAprobadas DECIMAL(4,1) NULL,
    tipoHoraId SMALLINT NULL,
    periodoNombramiento VARCHAR(100) NULL,
    presupuestoAprobado DECIMAL(12,2) NULL,
    rutaArchivo VARCHAR(500) NULL,
    usuarioFirmaId SMALLINT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (tipoAcuerdoId) REFERENCES TiposAcuerdo(tipoAcuerdoId),
    FOREIGN KEY (tipoHoraId) REFERENCES TiposHora(tipoHoraId),
    FOREIGN KEY (usuarioFirmaId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE AcuerdoConsejoPresupuesto (
    acuerdoPresupuestoId SMALLSERIAL PRIMARY KEY, -- ~3,000 registros
    acuerdoId SMALLINT NOT NULL,
    anio SMALLINT NOT NULL,
    montoOperativoAprobado DECIMAL(12,2) NULL,
    montoBienesDuraderosAprobado DECIMAL(12,2) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (acuerdoId) REFERENCES AcuerdosConsejo(acuerdoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

-- 5. SISTEMA, SEGURIDAD Y AUDITORÍA (Todo optimizado excepto Logs)
CREATE TABLE AsignacionesGestora (
    asignacionId SMALLSERIAL PRIMARY KEY, -- ~250 registros
    escuelaId SMALLINT NOT NULL,
    gestoraVIEId SMALLINT NOT NULL,
    fechaAsignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (escuelaId) REFERENCES Escuelas(escuelaId),
    FOREIGN KEY (gestoraVIEId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Permisos (
    permisoId SMALLSERIAL PRIMARY KEY, -- ~30 registros
    nombrePermiso VARCHAR(100) UNIQUE NOT NULL,
    moduloId SMALLINT NOT NULL,
    descripcion VARCHAR(255) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (moduloId) REFERENCES ModulosSistema(moduloId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE RolPermisos (
    rolPermisoId SMALLSERIAL PRIMARY KEY, -- ~100 registros
    rolId SMALLINT NOT NULL,
    permisoId SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (rolId) REFERENCES RolesSistema(rolId),
    FOREIGN KEY (permisoId) REFERENCES Permisos(permisoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE UsuarioRol (
    usuarioRolId SMALLSERIAL PRIMARY KEY, -- ~2,000 registros
    usuarioId SMALLINT NOT NULL,
    rolId SMALLINT NOT NULL,
    asignadoPorId SMALLINT NOT NULL,
    asignadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaExpiracion TIMESTAMP NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (rolId) REFERENCES RolesSistema(rolId),
    FOREIGN KEY (asignadoPorId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE PreferenciasAccesibilidad (
    preferenciaId SMALLSERIAL PRIMARY KEY, -- ~1,000 registros
    usuarioId SMALLINT UNIQUE NOT NULL,
    modoAltoContraste BOOLEAN DEFAULT FALSE,
    tamanioFuenteId SMALLINT NOT NULL,
    filtroDaltonismoId SMALLINT NOT NULL, 
    reducirAnimaciones BOOLEAN DEFAULT FALSE,
    optimizarLectorPantalla BOOLEAN DEFAULT FALSE,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (tamanioFuenteId) REFERENCES TamaniosFuente(tamanioFuenteId),
    FOREIGN KEY (filtroDaltonismoId) REFERENCES FiltrosDaltonismo(filtroDaltonismoId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE Notificaciones (
    notificacionId SMALLSERIAL PRIMARY KEY, -- ~10,000 registros
    usuarioDestinoId SMALLINT NOT NULL,
    propuestaId INT NULL,
    tipoNotificacionId SMALLINT NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    cuerpoMensaje TEXT NOT NULL,
    fechaEnvio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaLectura TIMESTAMP NULL,
    leida BOOLEAN DEFAULT FALSE,
    canalId SMALLINT NOT NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT NULL,
    ultimaAuditoria TIMESTAMP NULL,
    FOREIGN KEY (usuarioDestinoId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (propuestaId) REFERENCES Propuestas(propuestaId),
    FOREIGN KEY (tipoNotificacionId) REFERENCES TiposNotificacion(tipoNotificacionId),
    FOREIGN KEY (canalId) REFERENCES CanalesComunicacion(canalId),
    FOREIGN KEY (usuarioAuditoriaId) REFERENCES Usuarios(usuarioId)
);

CREATE TABLE tokensrecuperacion (
    tokenid SMALLSERIAL PRIMARY KEY, -- ~500 registros
    usuarioid SMALLINT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    fechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaExpiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    ipSolicitud VARCHAR(45) NULL,
    userAgent TEXT NULL,
    FOREIGN KEY (usuarioid) REFERENCES usuarios(usuarioid)
);

CREATE TABLE Logs (
    logId SERIAL PRIMARY KEY, -- ~50,000 registros, mantiene INT
    tipoEventoId SMALLINT NOT NULL,
    severidadId SMALLINT NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    sourceId SMALLINT NOT NULL,
    userAgent TEXT NULL,
    computadora VARCHAR(100) NULL,
    usuarioId SMALLINT NULL,
    referenciaId1 INT NULL,
    referenciaId2 INT NULL,
    descripcionReferencia1 VARCHAR(200) NULL,
    descripcionReferencia2 VARCHAR(200) NULL,
    objetoId1 SMALLINT NULL,
    objetoId2 SMALLINT NULL,
    datosAnteriores JSONB NULL,
    datosNuevos JSONB NULL,
    checkSum VARCHAR(64) NULL,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tipoEventoId) REFERENCES TiposEvento(tipoEventoId),
    FOREIGN KEY (severidadId) REFERENCES Severidades(severidadId),
    FOREIGN KEY (sourceId) REFERENCES Sources(sourceId),
    FOREIGN KEY (usuarioId) REFERENCES Usuarios(usuarioId),
    FOREIGN KEY (objetoId1) REFERENCES Objetos(objetoId),
    FOREIGN KEY (objetoId2) REFERENCES Objetos(objetoId)
);
-- =============================================================================
-- CONSTRAINTS UNIQUE FALTANTES
-- =============================================================================

-- UsuarioRol: No debe haber roles duplicados para un usuario
ALTER TABLE UsuarioRol 
ADD CONSTRAINT uq_usuario_rol UNIQUE (usuarioId, rolId);

-- AsignacionesGestora: No debe haber asignaciones duplicadas
ALTER TABLE AsignacionesGestora 
ADD CONSTRAINT uq_asignacion_gestora UNIQUE (escuelaId, gestoraVIEId);

-- IntegrantesEquipoPropuesta: No debe haber integrantes duplicados
ALTER TABLE IntegrantesEquipoPropuesta 
ADD CONSTRAINT uq_integrante_propuesta UNIQUE (propuestaId, usuarioId);

-- ParticipantesActividad: No debe haber participantes duplicados
ALTER TABLE ParticipantesActividad 
ADD CONSTRAINT uq_participante_actividad UNIQUE (actividadId, usuarioId, tipoResponsabilidadId);

-- ObjetivosEspecificos: No debe haber objetivos duplicados por propuesta
ALTER TABLE ObjetivosEspecificos 
ADD CONSTRAINT uq_objetivo_propuesta UNIQUE (propuestaId, numeroObjetivo);

-- Actividades: No debe haber actividades duplicadas
ALTER TABLE Actividades 
ADD CONSTRAINT uq_actividad_propuesta UNIQUE (propuestaId, objetivoEspecificoId, descripcionActividad);

-- Dictamenes: No debe haber dictamenes duplicados
ALTER TABLE Dictamenes 
ADD CONSTRAINT uq_dictamen_propuesta UNIQUE (propuestaId, numeroOficio);

-- AcuerdosConsejo: No debe haber acuerdos duplicados
ALTER TABLE AcuerdosConsejo 
ADD CONSTRAINT uq_acuerdo_propuesta UNIQUE (propuestaId, numeroAcuerdo);

-- HistorialEstadosPropuesta: No debe haber historiales duplicados
ALTER TABLE HistorialEstadosPropuesta 
ADD CONSTRAINT uq_historial_propuesta UNIQUE (propuestaId, estadoNuevoId, fechaCambio);

-- Notificaciones: No debe haber notificaciones duplicadas
ALTER TABLE Notificaciones 
ADD CONSTRAINT uq_notificacion_usuario UNIQUE (usuarioDestinoId, propuestaId, tipoNotificacionId, asunto);

-- Logs: No debe haber logs duplicados
ALTER TABLE Logs 
ADD CONSTRAINT uq_log_evento UNIQUE (tipoEventoId, descripcion, creadoEn);

ALTER TABLE Convocatorias 
ADD CONSTRAINT uq_convocatoria_nombre UNIQUE (nombreConvocatoria);

ALTER TABLE EtapasConvocatoria 
ADD CONSTRAINT uq_etapa_convocatoria UNIQUE (convocatoriaId, nombreEtapa);

ALTER TABLE TiposAcuerdo 
ADD CONSTRAINT uq_tipo_acuerdo_nombre UNIQUE (nombreTipoAcuerdo);