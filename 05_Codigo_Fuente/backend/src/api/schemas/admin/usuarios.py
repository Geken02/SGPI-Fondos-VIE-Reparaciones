# src/api/schemas/admin/usuarios.py
"""
Esquemas Pydantic del Módulo 5: Administración — Gestión de usuarios, roles y permisos.

Nota de seguridad: los esquemas Response nunca exponen contrasenaHash.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.api.schemas.admin.comunes import CatalogoBase


# ---------------------------------------------------------------- RolesSistema (catálogo de roles)
class RolCreate(BaseModel):
    nombreRol: str = Field(min_length=3, max_length=100)
    descripcionRol: Optional[str] = Field(default=None, max_length=300)


class RolUpdate(BaseModel):
    nombreRol: Optional[str] = Field(default=None, min_length=3, max_length=100)
    descripcionRol: Optional[str] = Field(default=None, max_length=300)


class RolResponse(CatalogoBase):
    rolId: int
    nombreRol: str
    descripcionRol: Optional[str] = None


# ---------------------------------------------------------------- Permisos
class PermisoCreate(BaseModel):
    nombrePermiso: str = Field(min_length=3, max_length=100)
    moduloId: int
    descripcion: Optional[str] = Field(default=None, max_length=255)


class PermisoUpdate(BaseModel):
    nombrePermiso: Optional[str] = Field(default=None, min_length=3, max_length=100)
    moduloId: Optional[int] = None
    descripcion: Optional[str] = Field(default=None, max_length=255)


class PermisoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    permisoId: int
    nombrePermiso: str
    moduloId: int
    descripcion: Optional[str] = None
    creadoEn: Optional[datetime] = None


class RolPermisosAsignar(BaseModel):
    """Reemplaza el set completo de permisos de un rol (semántica PUT)."""

    permisoIds: list[int]


class RolPermisosResponse(BaseModel):
    rolId: int
    permisoIds: list[int]


# ---------------------------------------------------------------- Usuarios
class UsuarioCreate(BaseModel):
    correoInstitucional: EmailStr = Field(max_length=100)
    nombreUsuario: str = Field(min_length=1, max_length=50)
    apellido1Usuario: str = Field(min_length=1, max_length=50)
    apellido2Usuario: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=15)
    escuelaId: Optional[int] = None
    contrasena: str = Field(min_length=8, max_length=72, description="Se hashea con bcrypt; nunca se devuelve")


class UsuarioUpdate(BaseModel):
    correoInstitucional: Optional[EmailStr] = Field(default=None, max_length=100)
    nombreUsuario: Optional[str] = Field(default=None, min_length=1, max_length=50)
    apellido1Usuario: Optional[str] = Field(default=None, min_length=1, max_length=50)
    apellido2Usuario: Optional[str] = Field(default=None, max_length=50)
    telefono: Optional[str] = Field(default=None, max_length=15)
    escuelaId: Optional[int] = None
    contrasena: Optional[str] = Field(default=None, min_length=8, max_length=72)


class RolResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuarioRolId: int
    rolId: int
    nombreRol: Optional[str] = None
    asignadoEn: Optional[datetime] = None
    fechaExpiracion: Optional[datetime] = None
    activo: bool


class UsuarioResponse(BaseModel):
    """Lectura de usuario SIN contrasenaHash."""

    model_config = ConfigDict(from_attributes=True)

    usuarioId: int
    correoInstitucional: str
    nombreUsuario: str
    apellido1Usuario: str
    apellido2Usuario: Optional[str] = None
    telefono: Optional[str] = None
    escuelaId: Optional[int] = None
    nombreEscuela: Optional[str] = None
    fechaCreacion: Optional[datetime] = None
    ultimoAcceso: Optional[datetime] = None
    activo: bool
    roles: list[RolResumen] = []

    @property
    def nombreCompleto(self) -> str:
        return f"{self.nombreUsuario} {self.apellido1Usuario} {self.apellido2Usuario or ''}".strip()

    @property
    def iniciales(self) -> str:
        partes = [self.nombreUsuario, self.apellido1Usuario, self.apellido2Usuario]
        return "".join(p[0].upper() for p in partes if p)[:2]



class AsignacionRolCreate(BaseModel):
    rolId: int
    fechaExpiracion: Optional[datetime] = None


class ResetContrasenaRequest(BaseModel):
    nuevaContrasena: str = Field(min_length=8, max_length=72)


# ---------------------------------------------------------------- AsignacionesGestora
class AsignacionGestoraCreate(BaseModel):
    escuelaId: int
    gestoraVIEId: int


class AsignacionGestoraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asignacionId: int
    escuelaId: int
    gestoraVIEId: int
    fechaAsignacion: Optional[datetime] = None
    activo: bool


# ---------------------------------------------------------------- TiposNotificacion / CanalesComunicacion
class TipoNotificacionCreate(BaseModel):
    nombreTipoNotificacion: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)


class TipoNotificacionUpdate(BaseModel):
    nombreTipoNotificacion: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)


class TipoNotificacionResponse(CatalogoBase):
    tipoNotificacionId: int
    nombreTipoNotificacion: str
    descripcion: Optional[str] = None


class CanalCreate(BaseModel):
    nombreCanal: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)


class CanalUpdate(BaseModel):
    nombreCanal: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)


class CanalResponse(CatalogoBase):
    canalId: int
    nombreCanal: str
    descripcion: Optional[str] = None
