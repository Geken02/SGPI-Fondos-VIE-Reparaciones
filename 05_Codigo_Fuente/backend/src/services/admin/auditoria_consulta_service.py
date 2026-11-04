# src/services/admin/auditoria_consulta_service.py
"""
Servicio del Módulo 5: Administración — Consulta de la bitácora forense (Logs).

Este módulo SOLO LEE logs (la escritura corresponde al servicio de auditoría del
sistema) y además verifica la integridad de los registros anti-tampering mediante
el mismo algoritmo de checksum que utiliza utils.helpers.generar_checksum:
SHA-256 sobre el JSON ordenado de los campos inmutables del log.
"""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.models.logs import Logs, Objetos, Severidades, Sources, TiposEvento
from src.models.usuarios import Usuario


def consultar_bitacora(
    sesion: Session,
    *,
    desde: Optional[datetime] = None,
    hasta: Optional[datetime] = None,
    tipo_evento_id: Optional[int] = None,
    severidad_minima: Optional[int] = None,
    usuario_id: Optional[int] = None,
    objeto_id: Optional[int] = None,
    referencia_id: Optional[int] = None,
    texto: Optional[str] = None,
    pagina: int = 1,
    tamano_pagina: int = 50,
) -> tuple[list[Logs], dict]:
    """Listado paginado de la bitácora con filtros combinables."""
    consulta = select(Logs)

    if desde:
        consulta = consulta.where(Logs.creadoEn >= desde)
    if hasta:
        consulta = consulta.where(Logs.creadoEn <= hasta)
    if tipo_evento_id:
        consulta = consulta.where(Logs.tipoEventoId == tipo_evento_id)
    if severidad_minima:
        consulta = consulta.where(Logs.severidadId >= severidad_minima)
    if usuario_id:
        consulta = consulta.where(Logs.usuarioId == usuario_id)
    if objeto_id:
        consulta = consulta.where(or_(Logs.objetoId1 == objeto_id, Logs.objetoId2 == objeto_id))
    if referencia_id:
        consulta = consulta.where(or_(Logs.referenciaId1 == referencia_id, Logs.referenciaId2 == referencia_id))
    if texto:
        consulta = consulta.where(Logs.descripcion.ilike(f"%{texto}%"))

    total = sesion.execute(select(func.count()).select_from(consulta.subquery())).scalar_one()
    total_paginas = max(1, -(-total // tamano_pagina))

    registros = sesion.execute(
        consulta.order_by(Logs.creadoEn.desc(), Logs.logId.desc())
        .offset((pagina - 1) * tamano_pagina)
        .limit(tamano_pagina)
    ).scalars().all()

    return list(registros), {"total": total, "pagina": pagina, "tamanoPagina": tamano_pagina, "totalPaginas": total_paginas}


def detalle_log(sesion: Session, log_id: int) -> dict:
    """Log con los nombres legibles de evento/severidad/source/objeto y el correo del usuario."""
    log = sesion.get(Logs, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail=f"Registro de bitácora {log_id} no encontrado")

    evento = sesion.get(TiposEvento, log.tipoEventoId)
    severidad = sesion.get(Severidades, log.severidadId)
    source = sesion.get(Sources, log.sourceId)
    objeto1 = sesion.get(Objetos, log.objetoId1) if log.objetoId1 else None
    usuario = sesion.get(Usuario, log.usuarioId) if log.usuarioId else None

    return {
        "log": log,
        "nombreEvento": evento.nombreEvento if evento else None,
        "nombreSeveridad": severidad.nombreSeveridad if severidad else None,
        "nombreSource": source.nombreSource if source else None,
        "nombreObjeto1": objeto1.nombreObjeto if objeto1 else None,
        "correoUsuario": usuario.correoInstitucional if usuario else None,
    }


def _recalcular_checksum(log) -> str:
    """Recalcula el checksum de un log con el MISMO algoritmo del utilitario SQL
    registrar_log()/verificar_integridad_logs() (script 04): SHA-256 sobre
    descripcion || datosAnteriores::text || datosNuevos::text || usuarioId::text || creadoEn::text."""
    from src.services.auditoria_service import calcular_checksum

    return calcular_checksum(
        log.descripcion,
        log.datosAnteriores,
        log.datosNuevos,
        log.usuarioId,
        log.creadoEn,
    )


def verificar_integridad(sesion: Session, *, limite: int = 1000) -> dict:
    """Recalcula el checkSum de los últimos N logs y detecta registros alterados.

    Cualquier discrepancia indica que alguien modificó la fila directamente en la BD
    (manipulación de la evidencia de auditoría).
    """
    logs = sesion.execute(select(Logs).order_by(Logs.logId.desc()).limit(limite)).scalars().all()

    alterados = []
    sin_checksum = []
    for log in logs:
        if not log.checkSum:
            sin_checksum.append(log.logId)
            continue
        if log.checkSum != _recalcular_checksum(log):
            alterados.append(log.logId)

    return {
        "registrosVerificados": len(logs),
        "registrosAlterados": len(alterados),
        "logIdsAlterados": alterados,
        "logIdsSinChecksum": sin_checksum,
        "integridadOk": len(alterados) == 0,
    }


def catalogo_eventos(sesion: Session) -> list[TiposEvento]:
    return list(sesion.execute(select(TiposEvento).where(TiposEvento.activo.is_(True)).order_by(TiposEvento.tipoEventoId)).scalars().all())


def catalogo_severidades(sesion: Session) -> list[Severidades]:
    return list(sesion.execute(select(Severidades).where(Severidades.activo.is_(True)).order_by(Severidades.severidadId)).scalars().all())


def catalogo_sources(sesion: Session) -> list[Sources]:
    return list(sesion.execute(select(Sources).where(Sources.activo.is_(True)).order_by(Sources.sourceId)).scalars().all())


def catalogo_objetos(sesion: Session) -> list[Objetos]:
    return list(sesion.execute(select(Objetos).where(Objetos.activo.is_(True)).order_by(Objetos.nombreObjeto)).scalars().all())

