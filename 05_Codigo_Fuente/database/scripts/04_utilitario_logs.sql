-- =============================================================================
-- SGPI - Utilitario de Logs y Auditoría (CORREGIDO)
-- =============================================================================

-- Extensión necesaria para sha256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. ÍNDICES PARA RENDIMIENTO
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_logs_creadoEn ON Logs (creadoEn DESC);
CREATE INDEX IF NOT EXISTS idx_logs_usuarioId ON Logs (usuarioId);
CREATE INDEX IF NOT EXISTS idx_logs_tipoEventoId ON Logs (tipoEventoId);
CREATE INDEX IF NOT EXISTS idx_logs_severidadId ON Logs (severidadId);
CREATE INDEX IF NOT EXISTS idx_logs_sourceId ON Logs (sourceId);
CREATE INDEX IF NOT EXISTS idx_logs_referencia1 ON Logs (objetoId1, referenciaId1);
CREATE INDEX IF NOT EXISTS idx_logs_referencia2 ON Logs (objetoId2, referenciaId2);
CREATE INDEX IF NOT EXISTS idx_logs_checkSum ON Logs (checkSum);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria ON Logs (usuarioId, creadoEn DESC, severidadId);

-- =============================================================================
-- 2. FUNCIÓN PRINCIPAL: registrar_log()
-- =============================================================================
CREATE OR REPLACE FUNCTION registrar_log(
    p_tipoEventoId        SMALLINT,
    p_severidadId         SMALLINT,
    p_sourceId            SMALLINT,
    p_descripcion         VARCHAR(255),
    p_usuarioId           INT DEFAULT NULL,
    p_objetoId1           SMALLINT DEFAULT NULL,
    p_referenciaId1       INT DEFAULT NULL,
    p_descripcionRef1     VARCHAR(200) DEFAULT NULL,
    p_objetoId2           SMALLINT DEFAULT NULL,
    p_referenciaId2       INT DEFAULT NULL,
    p_descripcionRef2     VARCHAR(200) DEFAULT NULL,
    p_datosAnteriores     JSONB DEFAULT NULL,
    p_datosNuevos         JSONB DEFAULT NULL,
    p_userAgent           TEXT DEFAULT NULL,
    p_computadora         VARCHAR(100) DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_logId INT;
    v_checkSum VARCHAR(64);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM TiposEvento WHERE tipoEventoId = p_tipoEventoId AND activo = TRUE) THEN
        RAISE EXCEPTION 'Tipo de evento % no existe o está inactivo', p_tipoEventoId;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM Severidades WHERE severidadId = p_severidadId AND activo = TRUE) THEN
        RAISE EXCEPTION 'Severidad % no existe o está inactiva', p_severidadId;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM Sources WHERE sourceId = p_sourceId AND activo = TRUE) THEN
        RAISE EXCEPTION 'Source % no existe o está inactivo', p_sourceId;
    END IF;
    
    v_checkSum := encode(
        sha256(
            convert_to(
                COALESCE(p_descripcion, '') || 
                COALESCE(p_datosAnteriores::text, '') || 
                COALESCE(p_datosNuevos::text, '') || 
                COALESCE(p_usuarioId::text, '') ||
                CURRENT_TIMESTAMP::text,
                'UTF8'
            )
        ),
        'hex'
    );
    
    INSERT INTO Logs (
        tipoEventoId, severidadId, sourceId, descripcion, usuarioId,
        objetoId1, referenciaId1, descripcionReferencia1,
        objetoId2, referenciaId2, descripcionReferencia2,
        datosAnteriores, datosNuevos, userAgent, computadora,
        checkSum, activo
    ) VALUES (
        p_tipoEventoId, p_severidadId, p_sourceId, p_descripcion, p_usuarioId,
        p_objetoId1, p_referenciaId1, p_descripcionRef1,
        p_objetoId2, p_referenciaId2, p_descripcionRef2,
        p_datosAnteriores, p_datosNuevos, p_userAgent, p_computadora,
        v_checkSum, TRUE
    ) RETURNING logId INTO v_logId;
    
    RETURN v_logId;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_log IS
'Registra un evento de auditoría en el sistema. Retorna el logId generado.';

-- =============================================================================
-- 3. FUNCIÓN AUXILIAR: registrar_log_simple()
-- =============================================================================
CREATE OR REPLACE FUNCTION registrar_log_simple(
    p_nombreEvento   VARCHAR(50),
    p_usuarioId      INT,
    p_propuestaId    INT DEFAULT NULL,
    p_descripcion    VARCHAR(255) DEFAULT NULL
) RETURNS INT AS $$
DECLARE
    v_tipoEventoId SMALLINT;
    v_severidadId SMALLINT;
    v_sourceId SMALLINT;
    v_descripcionFinal VARCHAR(255);
BEGIN
    SELECT tipoEventoId INTO v_tipoEventoId
    FROM TiposEvento
    WHERE nombreEvento = p_nombreEvento AND activo = TRUE;
    
    IF v_tipoEventoId IS NULL THEN
        RAISE EXCEPTION 'Evento "%" no encontrado', p_nombreEvento;
    END IF;
    
    -- Determinar severidad según el tipo de evento (4 niveles)
    IF p_nombreEvento LIKE '%FALLIDO%' OR p_nombreEvento LIKE '%DENEGADO%' THEN
        v_severidadId := 3;  -- ERROR (antes era 5)
    ELSIF p_nombreEvento LIKE '%ERROR%' OR p_nombreEvento LIKE '%CRITICA%' THEN
        v_severidadId := 4;  -- CRITICAL (antes era 6)
    ELSIF p_nombreEvento LIKE 'AUTH.%' THEN
        v_severidadId := 1;  -- INFO
    ELSE
        v_severidadId := 1;  -- INFO por defecto
    END IF;
    
    SELECT sourceId INTO v_sourceId
    FROM Sources
    WHERE 
        (p_nombreEvento LIKE 'AUTH.%' AND nombreSource = 'SGPI.Auth') OR
        (p_nombreEvento LIKE 'PROPUESTA.%' AND nombreSource = 'SGPI.Formulacion') OR
        (p_nombreEvento LIKE 'CONTENIDO.%' AND nombreSource = 'SGPI.Formulacion') OR
        (p_nombreEvento LIKE 'OBJETIVO.%' AND nombreSource = 'SGPI.Formulacion') OR
        (p_nombreEvento LIKE 'ACTIVIDAD.%' AND nombreSource = 'SGPI.Formulacion') OR
        (p_nombreEvento LIKE 'INTEGRANTE.%' AND nombreSource = 'SGPI.EquipoInvestigacion') OR
        (p_nombreEvento LIKE 'COLABORADOR.%' AND nombreSource = 'SGPI.EquipoInvestigacion') OR
        (p_nombreEvento LIKE 'EVALUACION.%' AND nombreSource = 'SGPI.Evaluacion') OR
        (p_nombreEvento LIKE 'DICTAMEN.%' AND nombreSource = 'SGPI.Dictamen') OR
        (p_nombreEvento LIKE 'ACUERDO.%' AND nombreSource = 'SGPI.Consejo') OR
        (p_nombreEvento LIKE 'SUBSANACION.%' AND nombreSource = 'SGPI.Subsanaciones') OR
        (p_nombreEvento LIKE 'DOCUMENTO.%' AND nombreSource = 'SGPI.Documentos') OR
        (p_nombreEvento LIKE 'PRESUPUESTO.%' AND nombreSource = 'SGPI.Presupuesto') OR
        (p_nombreEvento LIKE 'FINANCIAMIENTO.%' AND nombreSource = 'SGPI.Presupuesto') OR
        (p_nombreEvento LIKE 'PRODUCTO.%' AND nombreSource = 'SGPI.Presupuesto') OR
        (p_nombreEvento LIKE 'ETICA.%' AND nombreSource = 'SGPI.Etica') OR
        (p_nombreEvento LIKE 'ADMIN.%' AND nombreSource = 'SGPI.Administracion') OR
        (p_nombreEvento LIKE 'NOTIFICACION.%' AND nombreSource = 'SGPI.Notificaciones') OR
        (p_nombreEvento LIKE 'ACCESIBILIDAD.%' AND nombreSource = 'SGPI.Accesibilidad') OR
        (p_nombreEvento LIKE 'REFERENCIA.%' AND nombreSource = 'SGPI.Bibliografia') OR
        (p_nombreEvento LIKE 'FUENTE.%' AND nombreSource = 'SGPI.Bibliografia') OR
        (p_nombreEvento LIKE 'SISTEMA.%' AND nombreSource = 'SGPI.Scheduler')
    LIMIT 1;
    
    v_descripcionFinal := COALESCE(p_descripcion, p_nombreEvento);
    
    RETURN registrar_log(
        p_tipoEventoId := v_tipoEventoId,
        p_severidadId := v_severidadId,
        p_sourceId := COALESCE(v_sourceId, 20),
        p_descripcion := v_descripcionFinal,
        p_usuarioId := p_usuarioId,
        p_objetoId1 := CASE WHEN p_propuestaId IS NOT NULL THEN 1 ELSE NULL END,
        p_referenciaId1 := p_propuestaId
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_log_simple IS
'Versión simplificada para registrar eventos comunes.';

-- =============================================================================
-- 4. VISTA DETALLADA: v_logs_detalle
-- =============================================================================
CREATE OR REPLACE VIEW v_logs_detalle AS
SELECT
    l.logId,
    l.creadoEn AS fechaEvento,
    TO_CHAR(l.creadoEn, 'DD/MM/YYYY HH24:MI:SS') AS fechaFormateada,
    te.nombreEvento,
    te.descripcion AS descripcionEvento,
    te.requierePreguardado,
    s.nombreSeveridad,
    s.valorSeveridad,
    CASE 
        WHEN s.valorSeveridad >= 4 THEN '🔴 CRÍTICA'
        WHEN s.valorSeveridad >= 3 THEN '🟠 ALTA'
        WHEN s.valorSeveridad >= 2 THEN '🟡 MEDIA'
        ELSE '🟢 BAJA'
    END AS nivelVisual,
    src.nombreSource,
    l.descripcion,
    l.usuarioId,
    CONCAT(u.nombreUsuario, ' ', u.apellido1Usuario, ' ', COALESCE(u.apellido2Usuario, '')) AS nombreUsuario,
    u.correoInstitucional,
    o1.nombreObjeto AS objeto1,
    l.referenciaId1,
    l.descripcionReferencia1,
    o2.nombreObjeto AS objeto2,
    l.referenciaId2,
    l.descripcionReferencia2,
    l.computadora,
    LEFT(l.userAgent, 100) AS userAgentResumido,
    l.checkSum,
    l.datosAnteriores,
    l.datosNuevos,
    l.activo
FROM Logs l
INNER JOIN TiposEvento te ON l.tipoEventoId = te.tipoEventoId
INNER JOIN Severidades s ON l.severidadId = s.severidadId
INNER JOIN Sources src ON l.sourceId = src.sourceId
LEFT JOIN Usuarios u ON l.usuarioId = u.usuarioId
LEFT JOIN Objetos o1 ON l.objetoId1 = o1.objetoId
LEFT JOIN Objetos o2 ON l.objetoId2 = o2.objetoId;

COMMENT ON VIEW v_logs_detalle IS
'Vista detallada de logs con nombres legibles y contexto completo.';

-- =============================================================================
-- 5. VISTA RESUMEN: v_logs_resumen_diario
-- =============================================================================
CREATE OR REPLACE VIEW v_logs_resumen_diario AS
SELECT
    DATE(creadoEn) AS fecha,
    COUNT(*) AS totalEventos,  -- CORREGIDO: COUNT(*)
    COUNT(*) FILTER (WHERE severidadId >= 3) AS eventosError,
    COUNT(*) FILTER (WHERE severidadId >= 4) AS eventosCriticos,
    COUNT(DISTINCT usuarioId) AS usuariosActivos,
    COUNT(DISTINCT tipoEventoId) AS tiposEventosDistintos
FROM Logs
WHERE creadoEn >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(creadoEn)
ORDER BY fecha DESC;

-- =============================================================================
-- 6. FUNCIÓN: obtener_historial_propuesta()
-- =============================================================================
CREATE OR REPLACE FUNCTION obtener_historial_propuesta(
    p_propuestaId INT,
    p_diasAtras INT DEFAULT 365
) RETURNS TABLE (
    fechaEvento TIMESTAMP,
    nombreEvento VARCHAR(50),
    descripcion VARCHAR(255),
    nombreUsuario VARCHAR(152),
    severidad VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vd.fechaEvento,
        vd.nombreEvento,
        vd.descripcion,
        COALESCE(vd.nombreUsuario, 'Sistema') AS nombreUsuario,
        vd.nivelVisual AS severidad
    FROM v_logs_detalle vd
    WHERE vd.referenciaId1 = p_propuestaId
    AND vd.objeto1 = 'Propuesta'
    AND vd.fechaEvento >= CURRENT_TIMESTAMP - (p_diasAtras || ' days')::INTERVAL
    ORDER BY vd.fechaEvento DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. FUNCIÓN: obtener_actividad_usuario() (CORREGIDO)
-- =============================================================================
CREATE OR REPLACE FUNCTION obtener_actividad_usuario(  -- CORREGIDO: OR REPLACE
    p_usuarioId INT,
    p_limite INT DEFAULT 50
) RETURNS TABLE (
    fechaEvento TIMESTAMP,
    nombreEvento VARCHAR(50),
    descripcion VARCHAR(255),
    source VARCHAR(50),
    propuestaId INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vd.fechaEvento,
        vd.nombreEvento,
        vd.descripcion,
        vd.nombreSource AS source,
        vd.referenciaId1 AS propuestaId
    FROM v_logs_detalle vd
    WHERE vd.usuarioId = p_usuarioId
    ORDER BY vd.fechaEvento DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. FUNCIÓN: limpiar_logs_antiguos()
-- =============================================================================
CREATE OR REPLACE FUNCTION limpiar_logs_antiguos(
    p_diasRetener INT DEFAULT 365,
    p_dryRun BOOLEAN DEFAULT TRUE
) RETURNS INT AS $$
DECLARE
    v_cantidadEliminar INT;
    v_fechaCorte TIMESTAMP;
BEGIN
    v_fechaCorte := CURRENT_TIMESTAMP - (p_diasRetener || ' days')::INTERVAL;
    
    SELECT COUNT(*) INTO v_cantidadEliminar
    FROM Logs
    WHERE creadoEn < v_fechaCorte;
    
    IF p_dryRun THEN
        RAISE NOTICE '[DRY RUN] Se eliminarían % logs anteriores a %', 
            v_cantidadEliminar, v_fechaCorte;
        RETURN v_cantidadEliminar;
    END IF;
    
    DELETE FROM Logs
    WHERE creadoEn < v_fechaCorte;
    
    RAISE NOTICE 'Se eliminaron % logs anteriores a %', 
        v_cantidadEliminar, v_fechaCorte;
    RETURN v_cantidadEliminar;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpiar_logs_antiguos IS
'Limpia logs antiguos. Usar p_dryRun=TRUE para simular sin eliminar.';

-- =============================================================================
-- 9. FUNCIÓN: verificar_integridad_logs()
-- =============================================================================
CREATE OR REPLACE FUNCTION verificar_integridad_logs(
    p_logId INT
) RETURNS BOOLEAN AS $$
DECLARE
    v_log RECORD;
    v_checkSumCalculado VARCHAR(64);
BEGIN
    SELECT * INTO v_log FROM Logs WHERE logId = p_logId;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Log % no encontrado', p_logId;
    END IF;
    
    v_checkSumCalculado := encode(
        sha256(
            convert_to(
                COALESCE(v_log.descripcion, '') || 
                COALESCE(v_log.datosAnteriores::text, '') || 
                COALESCE(v_log.datosNuevos::text, '') || 
                COALESCE(v_log.usuarioId::text, '') ||
                v_log.creadoEn::text,
                'UTF8'
            )
        ),
        'hex'
    );
    
    IF v_log.checkSum = v_checkSumCalculado THEN
        RETURN TRUE;
    ELSE
        RAISE WARNING 'Checksum no coincide para log %. Posible alteración detectada.', p_logId;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. VERIFICACIÓN FINAL
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'UTILITARIO DE LOGS INSTALADO EXITOSAMENTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '  - registrar_log()';
    RAISE NOTICE '  - registrar_log_simple()';
    RAISE NOTICE '  - obtener_historial_propuesta()';
    RAISE NOTICE '  - obtener_actividad_usuario()';
    RAISE NOTICE '  - limpiar_logs_antiguos()';
    RAISE NOTICE '  - verificar_integridad_logs()';
    RAISE NOTICE 'Vistas creadas:';
    RAISE NOTICE '  - v_logs_detalle';
    RAISE NOTICE '  - v_logs_resumen_diario';
    RAISE NOTICE 'Índices creados: 9 índices para optimización';
    RAISE NOTICE '============================================';
END $$;