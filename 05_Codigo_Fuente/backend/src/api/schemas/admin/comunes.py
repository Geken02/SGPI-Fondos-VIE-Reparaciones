# src/api/schemas/admin/comunes.py
"""
Esquemas Pydantic compartidos por el Módulo 5: Administración del Sistema.

Contiene los tipos genéricos que reutilizan todos los catálogos dinámicos
(eliminación de hardcoding: cada tabla catálogo expone activo + campos propios).
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CatalogoBase(BaseModel):
    """Cames comunes de lectura en todo catálogo dinámico."""

    model_config = ConfigDict(from_attributes=True)

    activo: bool = True
    creadoEn: Optional[datetime] = None
    usuarioAuditoriaId: Optional[int] = None
    ultimaAuditoria: Optional[datetime] = None


class CatalogoFiltro(BaseModel):
    """Parámetros de consulta estándar para listados de administración."""

    pagina: int = Field(default=1, ge=1, description="Número de página (desde 1)")
    tamanoPagina: int = Field(default=50, ge=1, le=200, description="Registros por página")
    busqueda: Optional[str] = Field(default=None, max_length=100, description="Texto a buscar")
    incluirInactivos: bool = Field(default=False, description="Incluir registros con activo=false")


class Paginado(BaseModel):
    """Envelope de paginación estándar para todas las colecciones del módulo."""

    total: int
    pagina: int
    tamanoPagina: int
    totalPaginas: int


class EstadoToggle(BaseModel):
    """Cuerpo para activar/desactivar (soft-delete) un registro de catálogo."""

    activo: bool
