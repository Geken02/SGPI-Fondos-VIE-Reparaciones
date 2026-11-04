# src/services/auditoria_service.py
"""
Servicio de ESCRITURA de la bitácora forense (Logs).

Es la contraparte en Python del utilitario SQL `registrar_log()` definido en
database/scripts/04_utilitario_logs.sql. Para mantener el sistema unificado y
estandarizado, este servicio replica EXACTAMENTE el mismo algoritmo de checksum:

    checkSum = SHA-256 (hex) sobre UTF-8 de:
        descripcion || datosAnteriores::text || datosNuevos::text || usuarioId::text || creadoEn::text

De esta forma, los logs creados desde FastAPI y los creados desde la función SQL
pueden verificarse con la misma rutina (`verificar_integridad`), sin divergencias.

Nota de diseño: los catálogos de log (TiposEvento, Severidades, Sources, Objetos)
NO se crean aquí; su fuente de verdad es database/scripts/03_insertar_catalogos_logs.sql
(LOGIN, LOGOUT, INFO/WARNING/ERROR/CRITICAL, Web_Frontend/API_Backend, etc.).
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.models.logs import Logs, Objetos, Severidades, Sources, TiposEvento


def _texto_jsonb(valor: Optional[Any]) -> str:
    """Serializa un valor JSONB al formato textual compacto usado por Postgres al hacer ::text."""
    if valor is None:
        return ""
    if isinstance(valor, str):
        return valor
    return json.dumps(valor, separators=(",", ":"), ensure_ascii=False, default=str)


def calcular_checksum(
    descripcion: Optional[str],
    datos_anteriores: Optional[Any],
    datos_nuevos: Optional[Any],
    usuario_id: Optional[int],
    creado_en: datetime,
) -> str:
    """SHA-256 idéntico al de registrar_log() / verificar_integridad_logs() (script 04)."""
    payload = (
        (descripcion or "")
        + _texto_jsonb(datos_anteriores)
        + _texto_jsonb(datos_nuevos)
        + (str(usuario_id) if usuario_id is not None else "")
        + creado_en.isoformat(sep=" ", timespec="microseconds")
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _id_por_nombre(sesion: Session, modelo, columna_id: str, columna_nombre: str, nombre: str) -> int:
    fila = sesion.execute(select(getattr(modelo, columna_id)).where(
        getattr(modelo, columna_nombre) == nombre, modelo.activo.is_(True)
    )).scalar_one_or_none()
    if fila is None:
        raise RuntimeError(
            f"Catálogo de auditoría incompleto: {modelo.__tablename__}.{columna_nombre}='{nombre}' no existe. "
            "Ejecute database/scripts/03_insertar_catalogos_logs.sql."
        )
    return fila

def registrar_evento(
    sesion: Session,
    *,
    evento: str,
    severidad: str,
    source: str,
    descripcion: str,
    usuario_id: Optional[int] = None,
    objeto1: Optional[str] = None,
    referencia_id_1: Optional[int] = None,
    descripcion_ref_1: Optional[str] = None,
    datos_anteriores: Optional[Any] = None,
    datos_nuevos: Optional[Any] = None,
    user_agent: Optional[str] = None,
    computadora: Optional[str] = None,
) -> Optional[Logs]:
    try:
        tipo_evento_id = _id_por_nombre(sesion, TiposEvento, "tipoEventoId", "nombreEvento", evento)
        severidad_id = _id_por_nombre(sesion, Severidades, "severidadId", "nombreSeveridad", severidad)
        source_id = _id_por_nombre(sesion, Sources, "sourceId", "nombreSource", source)
        objeto_id_1 = (
            _id_por_nombre(sesion, Objetos, "objetoId", "nombreObjeto", objeto1) if objeto1 else None
        )
        creado_en = datetime.now(timezone.utc)
        log = Logs(
            tipoEventoId=tipo_evento_id,
            severidadId=severidad_id,
            sourceId=source_id,
            descripcion=descripcion[:255],
            usuarioId=usuario_id,
            objetoId1=objeto_id_1,
            referenciaId1=referencia_id_1,
            descripcionReferencia1=descripcion_ref_1[:200] if descripcion_ref_1 else None,
            datosAnteriores=datos_anteriores,
            datosNuevos=datos_nuevos,
            userAgent=user_agent,
            computadora=computadora,
            creadoEn=creado_en,
            activo=True,
        )
        log.checkSum = calcular_checksum(
            log.descripcion, datos_anteriores, datos_nuevos, usuario_id, creado_en
        )
        sesion.add(log)
        sesion.flush()
        return log
    except (SQLAlchemyError, RuntimeError) as e:
        # ✅ LOG TEMPORAL PARA DIAGNÓSTICO
        print(f"❌ ERROR AL REGISTRAR LOG: {e}")
        print(f"   Evento: {evento}")
        print(f"   Severidad: {severidad}")
        print(f"   Source: {source}")
        try:
            sesion.rollback()
        except SQLAlchemyError:
            pass
        return None