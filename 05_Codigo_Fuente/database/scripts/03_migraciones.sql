-- =============================================================================
-- SGPI - Script de Migraciones UNIFICADO
-- Ejecuta todas las migraciones en orden
-- =============================================================================

BEGIN;

-- =============================================================================
-- MIGRACIÓN 1: Votaciones del Consejo
-- =============================================================================
CREATE TABLE IF NOT EXISTS VotacionesConsejo (
    votacionId SMALLSERIAL PRIMARY KEY,
    propuestaId INTEGER NOT NULL UNIQUE,
    estadoVotacion VARCHAR(10) NOT NULL DEFAULT 'ABIERTA',
    resultadoConsejo VARCHAR(20),
    fechaApertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaCierre TIMESTAMP,
    observaciones VARCHAR(1000),
    usuarioResultadoId SMALLINT,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT,
    ultimaAuditoria TIMESTAMP,
    CONSTRAINT fk_votacionesconsejo_propuesta
        FOREIGN KEY (propuestaId)
        REFERENCES Propuestas(propuestaId),
    CONSTRAINT fk_votacionesconsejo_usuarioresultado
        FOREIGN KEY (usuarioResultadoId)
        REFERENCES Usuarios(usuarioId),
    CONSTRAINT fk_votacionesconsejo_usuarioauditoria
        FOREIGN KEY (usuarioAuditoriaId)
        REFERENCES Usuarios(usuarioId),
    CONSTRAINT chk_votacionesconsejo_estado
        CHECK (estadoVotacion IN ('ABIERTA', 'CERRADA')),
    CONSTRAINT chk_votacionesconsejo_resultado
        CHECK (
            resultadoConsejo IS NULL
            OR resultadoConsejo IN (
                'APROBADA',
                'RECHAZADA',
                'DEVUELTA_AJUSTES'
            )
        ),
    CONSTRAINT chk_votacionesconsejo_cierre
        CHECK (
            (
                estadoVotacion = 'ABIERTA'
                AND fechaCierre IS NULL
                AND resultadoConsejo IS NULL
                AND usuarioResultadoId IS NULL
            )
            OR
            (
                estadoVotacion = 'CERRADA'
                AND fechaCierre IS NOT NULL
                AND resultadoConsejo IS NOT NULL
                AND usuarioResultadoId IS NOT NULL
            )
        )
);

CREATE TABLE IF NOT EXISTS VotosConsejo (
    votoId SMALLSERIAL PRIMARY KEY,
    votacionId SMALLINT NOT NULL,
    usuarioId SMALLINT NOT NULL,
    voto VARCHAR(12) NOT NULL,
    observaciones VARCHAR(1000),
    fechaVoto TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creadoEn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId SMALLINT,
    ultimaAuditoria TIMESTAMP,
    CONSTRAINT fk_votosconsejo_votacion
        FOREIGN KEY (votacionId)
        REFERENCES VotacionesConsejo(votacionId)
        ON DELETE CASCADE,
    CONSTRAINT fk_votosconsejo_usuario
        FOREIGN KEY (usuarioId)
        REFERENCES Usuarios(usuarioId),
    CONSTRAINT fk_votosconsejo_usuarioauditoria
        FOREIGN KEY (usuarioAuditoriaId)
        REFERENCES Usuarios(usuarioId),
    CONSTRAINT uq_votosconsejo_usuario
        UNIQUE (votacionId, usuarioId),
    CONSTRAINT chk_votosconsejo_voto
        CHECK (voto IN ('APROBAR', 'RECHAZAR', 'ABSTENCION'))
);

-- =============================================================================
-- MIGRACIÓN 2: Roles adicionales del Consejo
-- =============================================================================
INSERT INTO RolesSistema (nombreRol, descripcionRol, activo)
SELECT 'AsistenteConsejoEscuela', 'Gestiona expedientes y su envío al Consejo de Profesores', TRUE
WHERE NOT EXISTS (SELECT 1 FROM RolesSistema WHERE nombreRol = 'AsistenteConsejoEscuela');

INSERT INTO RolesSistema (nombreRol, descripcionRol, activo)
SELECT 'ConsejoProfesores', 'Participa en las votaciones y decisiones del Consejo de Profesores', TRUE
WHERE NOT EXISTS (SELECT 1 FROM RolesSistema WHERE nombreRol = 'ConsejoProfesores');

-- =============================================================================
-- MIGRACIÓN 3: Dictámenes con tipoDictamenId
-- =============================================================================
ALTER TABLE Dictamenes
ADD COLUMN IF NOT EXISTS tipoDictamenId INTEGER;

ALTER TABLE Dictamenes
ADD CONSTRAINT fk_dictamenes_tipodictamen
FOREIGN KEY (tipoDictamenId)
REFERENCES TiposDictamen(tipoDictamenId);

CREATE INDEX IF NOT EXISTS idx_dictamenes_tipodictamenid
ON Dictamenes(tipoDictamenId);

-- =============================================================================
-- MIGRACIÓN 4: Dirección de Investigación
-- =============================================================================
INSERT INTO RolesSistema (nombreRol, descripcionRol, activo)
SELECT 'DireccionInvestigacion', 'Gestiona dictámenes, documentos oficiales y notificaciones de Dirección de Investigación', TRUE
WHERE NOT EXISTS (SELECT 1 FROM RolesSistema WHERE nombreRol = 'DireccionInvestigacion');

INSERT INTO ModulosSistema (nombreModulo, descripcion)
SELECT 'DireccionInvestigacion', 'Gestión de dictámenes, documentos y notificaciones de Dirección de Investigación'
WHERE NOT EXISTS (SELECT 1 FROM ModulosSistema WHERE nombreModulo = 'DireccionInvestigacion');

INSERT INTO TiposDocumento (nombreTipoDocumento, descripcion, activo)
SELECT 'Oficio_Direccion_Investigacion', 'Oficio oficial generado por el módulo de Dirección de Investigación', TRUE
WHERE NOT EXISTS (SELECT 1 FROM TiposDocumento WHERE nombreTipoDocumento = 'Oficio_Direccion_Investigacion');

-- =============================================================================
-- MIGRACIÓN 5: Revisión de Gestora VIE
-- =============================================================================
CREATE TABLE IF NOT EXISTS ValidacionRequisitos (
    validacionRequisitoId SERIAL PRIMARY KEY,
    propuestaId           INTEGER     NOT NULL REFERENCES Propuestas(propuestaId) ON DELETE CASCADE,
    requisitoId           VARCHAR(30) NOT NULL,
    estado                VARCHAR(20) NOT NULL CHECK (estado IN ('CUMPLE', 'NO_CUMPLE', 'PENDIENTE', 'NO_APLICA')),
    observaciones         TEXT,
    gestoraVIEId          SMALLINT    NOT NULL REFERENCES Usuarios(usuarioId),
    fechaActualizacion    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (propuestaId, requisitoId)
);

CREATE TABLE IF NOT EXISTS RevisionDocumentos (
    revisionDocumentoId SERIAL PRIMARY KEY,
    documentoId         SMALLINT    NOT NULL UNIQUE REFERENCES PropuestaDocumentos(documentoId) ON DELETE CASCADE,
    estado              VARCHAR(20) NOT NULL CHECK (estado IN ('CORRECTO', 'INCOMPLETO', 'FALTA_FIRMA')),
    observaciones       TEXT,
    gestoraVIEId        SMALLINT    NOT NULL REFERENCES Usuarios(usuarioId),
    fechaRevision       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE Subsanaciones ADD COLUMN IF NOT EXISTS comentarioResolucion TEXT;
ALTER TABLE Subsanaciones ADD COLUMN IF NOT EXISTS fechaResolucion TIMESTAMP;

-- =============================================================================
-- MIGRACIÓN 6: Preferencias y Correo Institucional
-- =============================================================================
CREATE TABLE IF NOT EXISTS PreferenciasGestora (
    preferenciaId SERIAL PRIMARY KEY,
    usuarioId INTEGER NOT NULL UNIQUE REFERENCES Usuarios(usuarioId) ON DELETE CASCADE,
    notificaciones BOOLEAN NOT NULL DEFAULT TRUE,
    resumenCorreo BOOLEAN NOT NULL DEFAULT FALSE,
    densidad VARCHAR(12) NOT NULL DEFAULT 'normal'
    CHECK (densidad IN ('compacta', 'normal', 'amplia')),
    creadoEn TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizadoEn TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioAuditoriaId INTEGER NULL REFERENCES Usuarios(usuarioId)
);

CREATE INDEX IF NOT EXISTS ix_preferenciasgestora_usuarioid
ON PreferenciasGestora(usuarioId);

CREATE TABLE IF NOT EXISTS EnviosCorreo (
    envioCorreoId SERIAL PRIMARY KEY,
    notificacionId INTEGER NOT NULL REFERENCES Notificaciones(notificacionId) ON DELETE CASCADE,
    destinatario VARCHAR(254) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('EN_PROCESO', 'ACEPTADO', 'FALLIDO')),
    intentos INTEGER NOT NULL DEFAULT 1,
    detalleError TEXT NULL,
    respuestaProveedor TEXT NULL,
    claveIdempotencia VARCHAR(80) UNIQUE NULL,
    fechaCreacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fechaActualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuarioSolicitanteId INTEGER NOT NULL REFERENCES Usuarios(usuarioId),
    documentoIds TEXT NOT NULL DEFAULT '[]',
    copias TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS ix_envioscorreo_notificacionid ON EnviosCorreo(notificacionId);

ALTER TABLE Notificaciones
ADD COLUMN IF NOT EXISTS claveIdempotencia VARCHAR(120) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notificaciones_claveidempotencia
ON Notificaciones(claveIdempotencia)
WHERE claveIdempotencia IS NOT NULL;

-- =============================================================================
-- AJUSTE DE SECUENCIAS
-- =============================================================================
DO $$
DECLARE
    columna RECORD;
    secuencia TEXT;
    maximo BIGINT;
BEGIN
    FOR columna IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'
    LOOP
        secuencia := pg_get_serial_sequence(format('%I.%I', columna.table_schema, columna.table_name), columna.column_name);
        IF secuencia IS NOT NULL THEN
            EXECUTE format('SELECT MAX(%I) FROM %I.%I', columna.column_name, columna.table_schema, columna.table_name) INTO maximo;
            PERFORM setval(secuencia, COALESCE(maximo, 1), maximo IS NOT NULL);
        END IF;
    END LOOP;
END $$;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRACIONES COMPLETADAS EXITOSAMENTE';
    RAISE NOTICE '============================================';
END $$;