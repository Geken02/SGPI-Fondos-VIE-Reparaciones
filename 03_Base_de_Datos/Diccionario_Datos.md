# Usuarios
- usuarioId serial auto-increment (PK)
- correoInstitucional varchar(100) unique not null
- nombreUsuario varchar(50) not null
- apellido1Usuario varchar(50) not null
- apellido2Usuario varchar(50)
- telefono varchar(15) nullable
- escuelaId int nullable //FK -> Escuelas
- fechaCreacion timestamp not null default current_timestamp
- activo boolean default true
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Escuelas
- escuelaId serial auto-increment (PK)
- codigoEscuela varchar(10) unique not null
- nombreEscuela varchar(150) not null
- campusId int not null //Fk -> Campus
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Campus
- campusId serial auto-increment (PK)
- nombreCampus varchar(50) not null
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable


# LineasInvestigacion
- lineaId serial auto-increment (PK)
- nombreLinea varchar(200) unique not null
- descripcion varchar(500) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposHora
- tipoHoraId serial auto-increment (PK)
- codigoTipo varchar(10) unique not null //VIE, CONS, DOC, REC, VIESA
- descripcion varchar(100) not null
- activo boolean default true

# NivelesTrl
- nivelTrlId int (PK) //1 al 9, sin auto-increment
- descripcionNivel varchar(500) not null
- activo boolean default true

# RolesSistema
- rolId serial auto-increment (PK)
- nombreRol varchar(100) unique not null
- descripcionRol varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EstadosPropuesta
- estadoPropuestaId serial auto-increment (PK)
- codigoEstadoPropuesta varchar(20) unique not null //Borrador, En_Comite, En_CIE, Aprobada
- nombreEstadoPropuesta varchar(100) not null
- descripcion varchar(255) nullable
- esFinal boolean default false
- orden int not null //para definir el flujo
- activo boolean default true

# Convocatorias
- convocatoriaId serial auto-increment (PK)
- nombreConvocatoria varchar(100) not null //Ej: "Fondos VIE 2027"
- fechaApertura date not null
- fechaCierre date not null
- fechaBloqueoOrion date nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EtapasConvocatoria
- etapaId serial auto-increment (PK)
- convocatoriaId int not null //FK -> Convocatorias
- nombreEtapa varchar(100) not null //Formulación, Evaluación Comité, Aval Consejo ################
- fechaInicio timestamp not null
- fechaFin timestamp not null
- esBloqueante boolean default false
- rolResponsableId int nullable //Fk -> RolesSistema
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ConfiguracionesSistema
- configuracionId serial auto-increment (PK)
- claveConfiguracion varchar(100) unique not null //MONTO_MAX_BASICA, MIN_HORAS_ESTUDIANTE
- valorConfiguracion text not null
- categoria varchar(50) not null //Presupuesto, Convocatoria, Notificaciones
- descripcion varchar(255) nullable
- esPublica boolean default false
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable
- activa boolean default true

# Propuestas
- propuestaId serial auto-increment (PK)
- codigoPropuesta varchar(20) unique not null // FVIE-YYYY-NNN
- titulo varchar(300) not null
- estadoId int not null // FK -> EstadosPropuesta
- etapaId int not null // FK -> EtapasConvocatoria
- convocatoriaId int not null // FK -> Convocatorias
- investigadorCoordId int not null // FK -> Usuarios
- escuelaId int not null // FK -> Escuelas
- lineaInvestigacionId int nullable // FK -> LineasInvestigacion
- modalidadId int nullable //Fk -> Modalidades
- montoTotal decimal(12,2) not null
- nivelTrlActual int nullable // 1-9
- nivelTrlEsperado int nullable // 1-9
- fechaInicio date nullable
- fechaFinalizacion date nullable
- fechaCreacion timestamp not null default current_timestamp
- fechaEnvio timestamp nullable
- propuestaAnteriorId int nullable // FK -> Propuestas (Relación 1:N para continuidad)
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# HistorialEstadosPropuesta
- historialEstadoId serial auto-increment (PK)
- propuestaId int not null // FK -> Propuestas
- estadoAnteriorId int nullable // FK -> EstadosPropuesta
- estadoNuevoId int not null // FK -> EstadosPropuesta
- usuarioResponsableId int not null // FK -> Usuarios (quién hizo el cambio)
- fechaCambio timestamp not null default current_timestamp
- observaciones text nullable // Motivo del cambio (ej: "Avalado por Consejo")

# Subsanaciones
- subsanacionId serial auto-increment (PK)
- propuestaId int not null // FK -> Propuestas
- gestoraVIEId int not null // FK -> Usuarios
- fechaSolicitud timestamp not null default current_timestamp
- comentarioGestora text not null
- fechaRespuestaInvestigador timestamp nullable
- respuestaInvestigador text nullable
- estadoSubsanacion varchar(30) not null default 'Pendiente' // Pendiente, Resuelta, Rechazada

# EstadosSubsanacion
- estadoSubsanacionId serial auto-increment (PK)
- nombreEstadoSubsanacion varchar(100) not null
- descripcion varchar(255) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable
- activo boolean default true

# Modalidades
- modalidadId serial auto-increment (PK)
- nombreModalidad varchar(30) not null // Básica, Aplicada, Desarrollo, Fortalecimiento 
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# IntegrantesEquipoPropuesta
- integranteEquipoId serial auto-increment (PK)
- idPropuesta int not null //FK -> Propuestas
- idUsuario int not null //FK -> Usuarios (integrante TEC)
- idTipoHora int not null //FK -> TiposHora
- horasSemanales decimal(4,1) not null
- rolEquipoId int not null //FK -> RolesEquipo
- orcid varchar(20) nullable
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# RolesEquipo
- rolEquipoId serial auto-increment (PK)
- nombreRol varchar(30) not null //Coordinador, Investigador, Asistente
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# PropuestaContenido
- propuestaId int unique not null (PK, FK -> Propuestas) // Relación 1:1
- resumen varchar(4000) not null // Form-04: Máx. 500 palabras (~4000 caracteres)
- palabrasClave varchar(255) nullable // Form-04: 4 a 6 términos
- abstract varchar(4000) nullable // Form-04: Equivalente al resumen en inglés
- problemaInvestigacion varchar(4000) nullable // Form-04: Máx. 1 página
- objetivoGeneral varchar(2000) nullable // Generalmente 1 párrafo robusto
- objetivosEspecificos varchar(3000) nullable // Lista de 3 a 5 objetivos
- estadoArte varchar(8000) nullable // Form-04: Máx. 2 páginas + 10 referencias
- metodologia varchar(6000) nullable // Form-04: Diseño y procedimientos (~1.5 páginas)
- estrategiaDivulgacion varchar(3000) nullable // Form-04: 4 puntos de divulgación
- hojaRuta varchar(4000) nullable // Form-04: Esquema de 5 componentes
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# PropuestaDeclaraciones
- propuestaId int unique not null (PK, FK -> Propuestas) // Relación 1:1
- tieneFinanciamientoPrevio boolean default false
- tieneContinuidadProyecto boolean default false
- requiereInstrumentoJuridico boolean default false
- tieneBasePosgrado boolean default false
- tieneInformacionConfidencial boolean default false
- tienePotencialPI boolean default false
- poseeInnovacion boolean default false
- tipoInnovacionId int nullable //Fk -> TiposInnovacion
- aceptaResguardoRepositorio boolean default false
- aceptaDeclaracionJurada boolean default false
- fechaFirmaDeclaracion timestamp nullable
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposInnovacion
- tipoInnovacionId serial auto-increment (PK)
- nombreTipoInnovacion varchar(30) not null // Proceso, Producto
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ColaboradoresExternos
- colaboradorId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- nombreColaborador varchar(50) not null
- apellido1Colaborador varchar(50) nullable
- apellido2Colaborador varchar(50) nullable
- idOrcid varchar(20) nullable
- institucionEmpresa varchar(150) not null
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# PropuestaDocumentos
- documentoId serial auto-increment (PK)
- idPropuesta int not null //FK -> Propuestas
- tipoDocumentoId int not null //FK -> TiposDocumento
- rutaArchivo varchar(500) not null
- nombreArchivo varchar(255) not null
- tamanioBytes int nullable
- checksum varchar(64) nullable //SHA-256 para integridad
- fechaCarga timestamp not null default current_timestamp
- usuarioCargaId int not null //FK -> Usuarios
- activo boolean default true
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposDocumento
- tipoDocumentoId serial auto-increment (PK)
- nombreTipoDocumento varchar(30) not null //Form-04, Form-05, Form-06, Dictamen, Acuerdo
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# FinanciamientoExterno
- financiamientoId serial auto-increment (PK)
- propuestaID int not null //FK -> Propuestas
- tipoFinanciamientoId int not null //FK -> TiposFinanciamiento
- anio int not null //1, 2, 3
- monto decimal(12,2) not null
- numeroOficio varchar(50) nullable
- entidadEmisoraId int nullable //FK -> EntidadesEmisoras
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposFinanciamiento
- tipoFinanciamientoId serial auto-increment (PK)
- nombreTipoFinanciamiento varchar(30) not null //Externo, Contrapartida, Cofinanciamiento
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EntidadesEmisoras
- entidadEmisoraId serial auto-increment (PK)
- nombreEntidadEmisora varchar(30) not null 
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# AspectosEticos
- aspectoEticoId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- involucraSeresHumanos boolean default false
- involucraBiodiversidad boolean default false
- involucraAnimales boolean default false
- involucraTerritoriosIndigenas boolean default false
- justificacionExencion text nullable //obligatorio si todos los flags son false
- enteRegulatorioId int nullable //FK -> EntesRegulatorios
- estadoAvalId int nullable //FK -> EstadoAval
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ObjetivosEspecificos
- objetivoEspecificoId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- numeroObjetivo int not null // 1, 2, 3...
- descripcion text not null
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Actividades
- actividadId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- objetivoEspecificoId int not null //FK -> ObjetivosEspecificos
- descripcionActividad text not null
- resultadoEsperado text not null
- mesInicio int not null // 1-12
- duracionMeses decimal(5,2) not null // ej: 0.07 para 2 días
- anioEjecucion int not null // 1, 2, 3
- esGira boolean default false  # Para validar nota 2 del Form-06
- esPasantia boolean default false  # Para validar nota del Form-05
- esInformeAvance boolean default false  # Obligatorio según Form-05
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ParticipantesActividad
- participanteActividadId serial auto-increment (PK)
- actividadId int not null //FK -> Actividades
- usuarioId int not null //FK -> Usuarios
- responsabilidadId int not null //FK -> TiposResponsabilidad  # Ejecuta, Supervisa, Participa
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposResponsabilidad
- tipoResponsabilidadId serial auto-increment (PK)
- nombreTipoResponsabilidad varchar(30) not null // Ejecuta, Supervisa, Participa
- descripcion varchar(200) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Riesgos
- riesgoId serial auto-increment (PK)
- actividadId int not null //FK -> Actividades
- descripcionRiesgo text not null
- probabilidad varchar(20) nullable // Alta, Media, Baja
- impacto varchar(20) nullable // Alto, Medio, Bajo
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# MedidasMitigacion
- medidaMitigacionId serial auto-increment (PK)
- riesgoId int not null //FK -> Riesgos
- descripcionMedida text not null
- usuarioResponsableId int not null //FK -> Usuarios
- esPermisoEtico boolean default false  # Para riesgos de CEC/CONAGEBIO/CICUA
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EntesRegulatorios
- enteRegulatorioId serial auto-increment (PK)
- nombreEnteRegulatorio varchar(30) not null //CEC, CONAGEBIO, CICUA
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EstadosAval
- estadosAvalId serial auto-increment (PK)
- nombreEstadoAval varchar(30) not null //Pendiente, Aprobado, Exento
- descripcion varchar(300)
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Autores
- autorId serial auto-increment (PK)
- nombreCompleto varchar(150) not null
- orcid varchar(20) unique nullable // Identificador único global de investigadores
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# FuentesBibliograficas
- fuenteId serial auto-increment (PK)
- doi varchar(100) unique nullable // Digital Object Identifier (evita duplicados de la misma fuente)
- titulo varchar(500) not null
- anioPublicacion int not null
- revistaFuente varchar(200) nullable
- esIndexadaWoSScopus boolean default false
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# AutorFuente
- autorFuenteId serial auto-increment (PK)
- autorId int not null // FK -> Autores
- fuenteId int not null // FK -> FuentesBibliograficas
- ordenAutoria int not null // 1 para primer autor, 2 para segundo, etc. (Crítico en academia)
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# PropuestaReferencia
- propuestaReferenciaId serial auto-increment (PK)
- propuestaId int not null // FK -> Propuestas
- fuenteId int not null // FK -> FuentesBibliograficas
- ordenReferencia int not null // Permite ordenar la lista (1, 2, 3...) según el formato APA/IEEE de la propuesta
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable // FK -> Usuarios
- ultimaAuditoria timestamp nullable

# PresupuestoPropuesta
- presupuestoId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- rubroId int not null //FK -> RubrosPropuesta
- montoSolicitado decimal(12,2) not null
- montoAprobado decimal(12,2) nullable
- anioEjecucion int not null //1, 2, 3
- esDuradero boolean default false
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# RubrosPropuesta
- rubroId serial auto-increment (PK)
- nombreRubro varchar(100) not null //Equipos, Materiales, Viajes, Servicios
- descripcionRubro varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# AcuerdosConsejo
- acuerdoId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- tipoAcuerdoId not null //Fk -> TiposAcuerdo
- numeroAcuerdo varchar(50) nullable
- fechaAcuerdo date nullable
- horasAprobadas decimal(4,1) nullable
- tipoHoraId int nullable //FK -> TiposHora
- periodoNombramiento varchar(100) nullable
- presupuestoAprobado decimal(12,2) nullable
- rutaArchivo varchar(500) nullable //PDF firmado
- usuarioFirmaId int nullable //FK -> Usuarios
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable


# TiposAcuerdo
- tipoAcuerdoId serial auto-increment (PK)
- nombreTipoAcuerdo varchar(100) not null //Form-07 o Form-08 
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# AcuerdoConsejoPresupuesto
- acuerdoPresupuestoId serial auto-increment (PK)
- acuerdoId int not null //FK -> AcuerdosConsejo
- anio int not null //2027, 2028, 2029
- montoOperativoAprobado decimal(12,2) nullable
- montoBienesDuraderosAprobado decimal(12,2) nullable
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ProductosAcademicos
- productoId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- tipoProductoAcademicoId int not null //FK -> TiposProductosAcademicos
- objetivoEspecificoId int nullable //FK -> ObjetivosEspecifico
- descripcion varchar(300) not null
- cantidadComprometida int not null
- fechaEntregaEstimada date nullable
- fechaEntregaReal date nullable
- esPropiedadIndustrial boolean default false
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposProductosAcademicos
- tipoProductoAcademicoId serial auto-increment (PK)
- nombreTipoProductoAcademico varchar(100) not null //Artículo, Libro, Tesis, Prototipo
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable


# CriteriosEvaluacion
- criterioId serial auto-increment (PK)
- tipoEvaluacionId int not null // FK -> TiposEvaluacion (Comité, VIE, etc.)
- nombreSeccion varchar(100) not null // Ej: "1. GRUPO INVESTIGADOR"
- nombreCriterio varchar(200) not null // Ej: "Composición disciplinaria del equipo"
- pesoPorcentaje decimal(5,2) not null // Ej: 5.00
- esRequisitoObligatorio boolean default false // Para el flag ⛔ de la rúbrica
- orden int not null
- activo boolean default true

# Evaluaciones
- evaluacionId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- evaluadorId int not null //FK -> Usuarios
- tipoEvaluacionId int not null //FK -> TiposEvaluacion
- fechaEvaluacion timestamp not null default current_timestamp
- calificacion decimal(4,2) nullable //0.00 a 1.00
- tipoRecomendacionId int nullable //FK -> TiposRecomendacion
- observaciones text nullable
- estadoEvaluacionId int not null //FK -> EstadosEvaluacion
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposRecomendacion
- tipoRecomendacionId serial auto-increment (PK)
- nombreTipoRecomendacion varchar(50) not null  //Recomienda, No Recomienda, Aprueba, Rechaza
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposEvaluacion
- tipoEvaluacionId serial auto-increment (PK)
- nombreTipoEvaluacion varchar(50) not null //Vinculación, Comité, VIE, CIE
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# EstadosEvaluacion
- estadosEvaluacionId serial auto-increment (PK)
- nombreEstadosEvaluacion varchar(50) not null //Borrador, Completada
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# DetalleEvaluacion
- detalleEvaluacionId serial auto-increment (PK)
- evaluacionId int not null //FK -> Evaluaciones
- criterioId int not null //FK -> CriteriosEvaluacion
- puntajeObtenido decimal(5,2) not null // 0, 6, 8, 10
- justificacion text nullable  # Obligatoria si es diferente a Excelente
- esRequisitoObligatorioCumplido boolean nullable  # Para los ⛔ de la rúbrica
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoriaId int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Dictamenes
- dictamenId serial auto-increment (PK)
- propuestaId int not null //FK -> Propuestas
- numeroOficio varchar(50) nullable
- fechaEmision timestamp not null default current_timestamp
- contenido text not null
- rutaArchivo varchar(500) nullable //PDF del dictamen
- usuarioRemitentId int not null //FK -> Usuarios
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposDictamen
- tipoDictamenId serial auto-increment (PK)
- nombreTipoDictamen varchar(50) not null //Vinculación, Comité, CIE
- descripcion varchar(300) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# AsignacionesGestora
- asignacionId serial auto-increment (PK)
- escuelaId int not null //FK -> Escuelas
- gestoraVIEId int not null //FK -> Usuarios
- fechaAsignacion timestamp not null default current_timestamp
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Permisos
- permisoId serial auto-increment (PK)
- nombrePermiso varchar(100) unique not null //Crear_Propuesta, Evaluar_Rubrica, Editar_Catalogo
- moduloId int not null //FK -> ModulosSistema
- descripcion varchar(255) nullable
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# ModulosSistema
- moduloId serial auto-increment (PK)
- nombreModulo varchar(50) not null //Formulacion, Evaluacion, Admin
- descripcion varchar(255) nullable
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# RolPermisos
- rolPermisoId serial auto-increment (PK)
- rolId int not null //FK -> RolesSistema
- permisoId int not null //FK -> Permisos
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# UsuarioRol 
- usuarioRolId serial auto-increment (PK)
- usuarioId int not null //FK -> Usuarios
- rolId int not null //FK -> RolesSistema
- asignadoPor int //FK -> Usuarios
- asignadoEn timestamp default current_timestamp
- fechaExpiracion timestamp 
- creadoEn timestamp default current_timestamp
- usuarioAuditoria int //FK -> Usuarios
- ultimaAuditoria timestamp
- activo boolean default true

# PreferenciasAccesibilidad
- preferenciaId serial auto-increment (PK)
- usuarioId int unique not null //FK -> Usuarios (relación 1:1)
- modoAltoContraste boolean default false
- tamanioFuenteId int not null //FK -> TamaniosFuente
- filtroDaltonismoId int not null //FK -> FiltrosDaltonismo
- reducirAnimaciones boolean default false
- optimizarLectorPantalla boolean default false
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TamaniosFuente
- tamanioFuenteId serial auto-increment (PK)
- nombreTamanioFuente varchar(20) default 'Normal' //Normal, Grande, ExtraGrande
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# FiltrosDaltonismo
- filtroDaltonismoId serial auto-increment (PK)
- nombreFiltroDaltonismo varchar(30) not null
- descripcion varchar(255) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# Notificaciones
- notificacionId serial auto-increment (PK)
- usuarioDestinoId int not null //FK -> Usuarios
- propuestaId int nullable //FK -> Propuestas
- tipoNotificacionId int not null //FK -> TiposNotificacion
- asunto varchar(200) not null
- cuerpoMensaje text not null
- fechaEnvio timestamp not null default current_timestamp
- fechaLectura timestamp nullable
- leida boolean default false
- canalId int not null //Fk -> CanalesComunicacion
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# CanalesComunicacion
- canalId serial auto-increment (PK)
- nombreCanal varchar(30) not null
- descripcion varchar(255) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable

# TiposNotificacion
- tipoNotificacionId serial auto-increment (PK)
- nombreTipoNotificacion varchar(30) not null
- descripcion varchar(255) nullable
- activo boolean default true
- creadoEn timestamp not null default current_timestamp
- usuarioAuditoria int nullable //FK -> Usuarios
- ultimaAuditoria timestamp nullable



# TiposEvento 
- tipoEventoId serial auto-increment (PK)
- nombreEvento varchar(50) unique not null
- descripcion varchar(255) 
- requierePreguardado boolean default true 
- creadoEn timestamp
- usuarioAuditoria int //FK -> Usuarios
- ultimaAuditoria timestamp
- activo boolean

# Severidades 
- severidadId serial auto-increment (PK)
- valorSeveridad int not null 
- nombreSeveridad varchar(50) unique not null
- creadoEn timestamp
- usuarioAuditoria int //FK -> Usuarios
- ultimaAuditoria timestamp
- activo boolean

# Objetos 
- objetoId serial auto-increment (PK)
- nombreObjeto varchar(50) unique not null 
- creadoEn timestamp
- usuarioAuditoria int //FK -> Usuarios
- ultimaAuditoria timestamp
- activo boolean

# Logs 
- logId serial auto-increment (PK)
- tipoEventoId int not null //FK -> TiposEvento 
- severidadId int not null //FK -> Severidades 
- descripcion varchar(255) not null 
- sourceId int not null //FK -> Sources 
- userAgent text // Navegador o cliente HTTP si aplica
- computadora varchar(100) 
- usuarioId int //FK -> Usuarios
- referenciaId1 int 
- referenciaId2 int 
- descripcionReferencia1 varchar(200)
- descripcionReferencia2 varchar(200)
- objetoId1 bigint //FK -> Objetos
- objetoId2 bigint //FK -> Objetos
- datosAnteriores jsonb // Estado ANTES del cambio 
- datosNuevos jsonb // Estado DESPUÉS del cambio 
- checkSum varchar(64) // SHA256 de: tipoEventoId+referenciaId1+objetoId1+fecha+datosNuevos (para integridad)
- creadoEn timestamp
- activo boolean default true

# Sources 
- sourceId serial auto-increment (PK)
- nombreSource varchar(50) unique not null
- creadoEn timestamp
- usuarioAuditoria int //FK -> Usuarios
- ultimaAuditoria timestamp
- activo boolean default true
