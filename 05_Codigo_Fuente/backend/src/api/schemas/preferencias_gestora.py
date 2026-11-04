from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PreferenciasGestoraEntrada(BaseModel):
    model_config = ConfigDict(extra="forbid")

    notificaciones: bool = True
    resumenCorreo: bool = False
    densidad: Literal["compacta", "normal", "amplia"] = "normal"

    @field_validator("notificaciones")
    @classmethod
    def notificaciones_no_disponibles(cls, valor):
        if not valor:
            raise ValueError(
                "La configuración de notificaciones todavía no está disponible; los avisos oficiales no se pueden desactivar."
            )
        return valor

    @field_validator("resumenCorreo")
    @classmethod
    def resumen_no_disponible(cls, valor):
        if valor:
            raise ValueError(
                "El resumen por correo todavía no está disponible; la preferencia debe permanecer desactivada."
            )
        return valor


class PreferenciasGestoraRespuesta(BaseModel):
    notificaciones: bool
    resumenCorreo: bool
    resumenCorreoDisponible: bool = False
    densidad: Literal["compacta", "normal", "amplia"]
