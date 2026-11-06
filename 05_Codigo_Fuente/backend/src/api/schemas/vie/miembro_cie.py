from pydantic import BaseModel, Field, field_validator


class PuntajeCIEEntrada(BaseModel):
    criterioId: int = Field(gt=0)
    puntaje: int = Field(ge=0, le=10)
    justificacion: str | None = Field(default=None, max_length=5000)
    requisitoCumplido: bool | None = None


class EvaluacionCIEEntrada(BaseModel):
    puntajes: list[PuntajeCIEEntrada] = Field(min_length=1)
    observaciones: str | None = Field(default=None, max_length=10000)
    recomendacion: str = Field(pattern="^(Recomendar financiamiento|Recomendar condicionado|No recomendar financiamiento)$")


class ResolucionCIEEntrada(BaseModel):
    numeroOficio: str | None = Field(default=None, max_length=50)
    decision: str = Field(pattern="^(Aprobar|Rechazar)$")
    justificacion: str = Field(min_length=1, max_length=4000)
    rutaArchivo: str | None = Field(default=None, max_length=500)

    @field_validator("justificacion")
    @classmethod
    def validar_justificacion(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("La justificación de la resolución no puede estar vacía.")
        return valor
