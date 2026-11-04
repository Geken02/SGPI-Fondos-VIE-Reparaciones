# src/api/schemas/auth.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

# ============================================================================
# LOGIN
# ============================================================================

class SolicitudLogin(BaseModel):
    correo: str = Field(..., min_length=5, max_length=100, description="Correo institucional")
    contrasena: str = Field(..., min_length=8, max_length=128, description="Contraseña")

class RespuestaToken(BaseModel):
    token_acceso: str = Field(..., description="Token JWT para autenticar solicitudes posteriores")
    tipo_token: str = Field(default="bearer", description="Tipo de token")

# ============================================================================
# PERFIL DE USUARIO
# ============================================================================

class RolResumen(BaseModel):
    """Rol asignado a un usuario, para el payload de /perfil."""
    model_config = ConfigDict(from_attributes=True)
    rolId: int
    nombreRol: str
    descripcionRol: Optional[str] = None

class RespuestaPerfil(BaseModel):
    usuarioId: int
    correoInstitucional: str
    nombreUsuario: str
    apellido1Usuario: str
    apellido2Usuario: Optional[str] = None
    telefono: Optional[str] = None
    escuelaId: Optional[int] = None
    nombreEscuela: Optional[str] = None
    roles: List['RolResumen']
    activo: bool
    fechaCreacion: datetime
    ultimoAcceso: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class SolicitudActualizarPerfil(BaseModel):
    """Esquema para actualizar datos de perfil del usuario."""
    nombre: Optional[str] = Field(None, max_length=50)
    apellido1: Optional[str] = Field(None, max_length=50)
    apellido2: Optional[str] = Field(None, max_length=50)
    telefono: Optional[str] = Field(None, max_length=15)



    fechaCreacion: Optional[datetime] = None
    ultimoAcceso: Optional[datetime] = None

# ============================================================================
# RECUPERACIÓN DE CONTRASEÑA
# ============================================================================

class SolicitudRecuperacionContrasena(BaseModel):
    correoInstitucional: str = Field(..., min_length=5, max_length=100)

    @field_validator("correoInstitucional")
    @classmethod
    def validar_correo_tec(cls, v: str) -> str:
        if not v.lower().endswith("@tec.ac.cr"):
            raise ValueError("Solo se aceptan correos institucionales del TEC (@tec.ac.cr)")
        return v.lower()

class RespuestaRecuperacionContrasena(BaseModel):
    mensaje: str
    correoDestino: str
    enlaceRecuperacion: Optional[str] = Field(default=None, description="Enlace de recuperación (solo prototipo)")
    minutosExpiracion: int = Field(default=30, description="Tiempo de validez del token en minutos")

class SolicitudResetConToken(BaseModel):
    nuevaContrasena: str = Field(..., min_length=8, max_length=128)

    @field_validator("nuevaContrasena")
    @classmethod
    def validar_fortaleza_contrasena(cls, v: str) -> str:
        if len(v) < 8: raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Z]", v): raise ValueError("Debe contener al menos una letra mayúscula")
        if not re.search(r"[a-z]", v): raise ValueError("Debe contener al menos una letra minúscula")
        if not re.search(r"\d", v): raise ValueError("Debe contener al menos un número")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", v): raise ValueError("Debe contener al menos un carácter especial")
        return v

class RespuestaResetConToken(BaseModel):
    mensaje: str
    correoUsuario: str
    fechaReset: datetime