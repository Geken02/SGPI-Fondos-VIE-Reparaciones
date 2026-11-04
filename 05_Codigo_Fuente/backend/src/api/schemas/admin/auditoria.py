# src/api/schemas/admin/auditoria.py
"""
Esquemas Pydantic del Módulo 5: Administración — Consulta de bitácora forense (Logs).

La tabla Logs es de solo lectura para el módulo de administración: se audita desde
el servicio de auditoría del sistema, nunca mediante POST directo.
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    logId: int
    tipoEventoId: int
    severidadId: int
    descripcion: str
    sourceId: int
    userAgent: Optional[str] = None
    computadora: Optional[str] = None
    usuarioId: Optional[int] = None
    referenciaId1: Optional[int] = None
    referenciaId2: Optional[int] = None
    descripcionReferencia1: Optional[str] = None
    descripcionReferencia2: Optional[str] = None
    objetoId1: Optional[int] = None
    objetoId2: Optional[int] = None
    datosAnteriores: Optional[Any] = None
    datosNuevos: Optional[Any] = None
    checkSum: Optional[str] = None
    creadoEn: Optional[datetime] = None
    activo: bool


class LogDetalle(BaseModel):
    """Log con nombres legibles resueltos desde los catálogos de apoyo."""

    log: LogResponse
    nombreEvento: Optional[str] = None
    nombreSeveridad: Optional[str] = None
    nombreSource: Optional[str] = None
    nombreObjeto1: Optional[str] = None
    correoUsuario: Optional[str] = None


class EventoLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tipoEventoId: int
    nombreEvento: str
    descripcion: Optional[str] = None
    requierePreguardado: bool


class SeveridadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    severidadId: int
    valorSeveridad: int
    nombreSeveridad: str


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sourceId: int
    nombreSource: str


class ObjetoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    objetoId: int
    nombreObjeto: str


class IntegridadResponse(BaseModel):
    """Resultado del chequeo anti-manipulación de la cadena de auditoría."""

    registrosVerificados: int
    registrosAlterados: int
    logIdsAlterados: list[int]
    logIdsSinChecksum: list[int]
    integridadOk: bool

