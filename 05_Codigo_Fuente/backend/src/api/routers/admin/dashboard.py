# src/api/routers/admin/dashboard.py
"""
Rutas del Dashboard de Administrador.
Proporciona estadísticas consolidadas y actividad reciente del sistema.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from src.database import get_db
from src.models.usuarios import Usuario
from src.models.roles import UsuarioRol, RolesSistema
from src.models.propuestas import Propuesta
from src.models.catalogos import  HistorialEstadosPropuesta
from src.models.escuelas import Escuela
from src.models.convocatorias import Convocatorias, EtapasConvocatoria, EstadosPropuesta
try:
    from src.models.logs import Logs, TiposEvento
except ImportError:
    from src.models.logs import Logs as Log, TiposEvento
from src.utils.dependencias import requerir_rol
from src.utils.seguridad import registrar_log_request

ROLES_ADMIN = ["SuperAdministrador", "Administrador"]
router = APIRouter(prefix="/api/admin/dashboard", tags=["Dashboard Admin"])

# ============================================================================
# ESTADÍSTICAS PRINCIPALES DEL DASHBOARD
# ============================================================================

@router.get("/estadisticas", summary="Obtener estadísticas del dashboard")
async def obtener_estadisticas_dashboard(
    sesion: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(requerir_rol(ROLES_ADMIN))
):
    """
    Obtiene todas las estadísticas para el panel de administrador.
    """
    
    # 1. Total de propuestas activas (excluyendo estados finales)
    # NOTA: Propuestas NO tiene columna 'activo', se filtra solo por estado
    estados_finales = sesion.query(EstadosPropuesta.estadoPropuestaId).filter(
        EstadosPropuesta.esFinal == True
    ).subquery()
    
    total_propuestas_activas = sesion.query(func.count(Propuesta.propuestaId)).filter(
        Propuesta.estadoId.notin_(estados_finales)
    ).scalar() or 0
    
    # 2. Propuestas por estado (para el gráfico de barras)
    propuestas_por_estado = sesion.query(
        EstadosPropuesta.nombreEstadoPropuesta,
        func.count(Propuesta.propuestaId).label('cantidad')
    ).join(
        Propuesta, Propuesta.estadoId == EstadosPropuesta.estadoPropuestaId
    ).group_by(
        EstadosPropuesta.nombreEstadoPropuesta,
        EstadosPropuesta.orden
    ).order_by(
        EstadosPropuesta.orden
    ).all()
    
    # 3. Total de escuelas activas
    total_escuelas_activas = sesion.query(func.count(Escuela.escuelaId)).filter(
        Escuela.activo == True
    ).scalar() or 0
    
    # 4. Total de usuarios activos
    total_usuarios_activos = sesion.query(func.count(Usuario.usuarioId)).filter(
        Usuario.activo == True
    ).scalar() or 0
    
    # 5. Convocatoria activa (que esté en el rango de fechas actual)
    hoy = datetime.now().date()
    convocatoria_activa = sesion.query(Convocatorias).filter(
        Convocatorias.activo == True,
        Convocatorias.fechaApertura <= hoy,
        Convocatorias.fechaCierre >= hoy
    ).first()
    
    # 6. Actividad reciente (últimos 10 logs)
    actividad_reciente = sesion.query(Logs).order_by(
        desc(Logs.creadoEn)
    ).limit(10).all()
    
    # 7. Calcular crecimiento (comparar con el mes anterior)
    hace_un_mes = datetime.now() - timedelta(days=30)
    
    propuestas_mes_anterior = sesion.query(func.count(Propuesta.propuestaId)).filter(
        Propuesta.fechaCreacion < hace_un_mes
    ).scalar() or 0
    
    crecimiento_propuestas = 0
    if propuestas_mes_anterior > 0:
        crecimiento_propuestas = round(
            ((total_propuestas_activas - propuestas_mes_anterior) / propuestas_mes_anterior) * 100, 1
        )
    
    # Formatear respuesta
    return {
        "propuestasActivas": total_propuestas_activas,
        "crecimientoPropuestas": f"{'+' if crecimiento_propuestas >= 0 else ''}{crecimiento_propuestas}%",
        "escuelasActivas": total_escuelas_activas,
        "usuariosActivos": total_usuarios_activos,
        "convocatoriaActiva": {
            "id": convocatoria_activa.convocatoriaId if convocatoria_activa else None,
            "nombre": convocatoria_activa.nombreConvocatoria if convocatoria_activa else "Sin convocatoria activa",
            "anio": hoy.year,
            "fechaCierre": convocatoria_activa.fechaCierre.isoformat() if convocatoria_activa else None
        },
        "propuestasPorEstado": [
            {"estado": estado, "cantidad": cantidad}
            for estado, cantidad in propuestas_por_estado
        ],
        "actividadReciente": [
            {
                "logId": log.logId,
                "tipoEvento": log.tipoEvento.nombreEvento if log.tipoEvento else "Desconocido",
                "descripcion": log.descripcion,
                "fecha": log.creadoEn.isoformat(),
                "usuario": {
                    "usuarioId": log.usuario.usuarioId,
                    "nombre": f"{log.usuario.nombreUsuario} {log.usuario.apellido1Usuario}"
                } if log.usuario else None,
                "severidad": log.severidad.nombreSeveridad if log.severidad else None
            }
            for log in actividad_reciente
        ]
    }

# ============================================================================
# ESTADÍSTICAS AVANZADAS
# ============================================================================

@router.get("/estadisticas/propuestas/timeline", summary="Evolución de propuestas por mes")
async def obtener_timeline_propuestas(
    meses: int = Query(default=6, ge=1, le=24, description="Número de meses hacia atrás"),
    sesion: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(requerir_rol(ROLES_ADMIN))
):
    desde = datetime.now() - timedelta(days=meses * 30)
    
    resultados = sesion.query(
        func.date_trunc('month', Propuesta.fechaCreacion).label('mes'),
        func.count(Propuesta.propuestaId).label('cantidad')
    ).filter(
        Propuesta.fechaCreacion >= desde
    ).group_by(
        func.date_trunc('month', Propuesta.fechaCreacion)
    ).order_by(
        func.date_trunc('month', Propuesta.fechaCreacion)
    ).all()
    
    return [
        {
            "mes": resultado.mes.isoformat() if resultado.mes else "",
            "cantidad": resultado.cantidad
        }
        for resultado in resultados
    ]

@router.get("/estadisticas/escuelas/distribucion", summary="Distribución de propuestas por escuela")
async def obtener_distribucion_escuelas(
    sesion: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(requerir_rol(ROLES_ADMIN))
):
    distribucion = sesion.query(
        Escuela.nombreEscuela,
        func.count(Propuesta.propuestaId).label('cantidad')
    ).join(
        Propuesta, Propuesta.escuelaId == Escuela.escuelaId
    ).filter(
        Escuela.activo == True
    ).group_by(
        Escuela.escuelaId,
        Escuela.nombreEscuela
    ).order_by(
        desc(func.count(Propuesta.propuestaId))
    ).limit(10).all()
    
    return [
        {
            "escuela": escuela,
            "cantidad": cantidad
        }
        for escuela, cantidad in distribucion
    ]

# ============================================================================
# LOGS Y ACTIVIDAD DEL SISTEMA
# ============================================================================

@router.get("/actividad", summary="Listar actividad reciente del sistema")
async def listar_actividad_sistema(
    pagina: int = Query(default=1, ge=1),
    tamano_pagina: int = Query(default=50, ge=1, le=200),
    tipo_evento: str = Query(default=None, max_length=50),
    fecha_desde: datetime = Query(default=None),
    fecha_hasta: datetime = Query(default=None),
    sesion: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(requerir_rol(ROLES_ADMIN))
):
    query = sesion.query(Logs)
    
    if tipo_evento:
        query = query.join(TiposEvento).filter(
            TiposEvento.nombreEvento.ilike(f"%{tipo_evento}%")
        )
    
    if fecha_desde:
        query = query.filter(Logs.creadoEn >= fecha_desde)
    
    if fecha_hasta:
        query = query.filter(Logs.creadoEn <= fecha_hasta)
    
    total = query.count()
    
    logs = query.order_by(
        desc(Logs.creadoEn)
    ).offset((pagina - 1) * tamano_pagina).limit(tamano_pagina).all()
    
    return {
        "items": [
            {
                "logId": log.logId,
                "tipoEvento": log.tipoEvento.nombreEvento if log.tipoEvento else "Desconocido",
                "descripcion": log.descripcion,
                "fecha": log.creadoEn.isoformat(),
                "severidad": log.severidad.nombreSeveridad if log.severidad else None,
                "usuario": {
                    "usuarioId": log.usuario.usuarioId,
                    "nombre": f"{log.usuario.nombreUsuario} {log.usuario.apellido1Usuario}",
                    "correo": log.usuario.correoInstitucional
                } if log.usuario else None,
                "objeto": log.objetoId1,
                "referencia": log.referenciaId1
            }
            for log in logs
        ],
        "total": total,
        "pagina": pagina,
        "tamanoPagina": tamano_pagina,
        "totalPaginas": (total + tamano_pagina - 1) // tamano_pagina
    }