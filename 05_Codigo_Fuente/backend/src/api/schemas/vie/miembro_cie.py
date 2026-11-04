
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DetalleEvaluacionCIEEntrada(BaseModel):
    criterioId: int = Field(gt=0)
    puntajeObtenido: Decimal = Field(ge=0, max_digits=5, decimal_places=2)
    justificacion: str | None = Field(default=None, max_length=5000)
    esRequisitoObligatorioCumplido: bool | None = None


class EvaluacionCIEEntrada(BaseModel):
    calificacion: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=4,
        decimal_places=2,
    )
    tipoRecomendacionId: int | None = Field(default=None, gt=0)
    observaciones: str | None = Field(default=None, max_length=10000)
    detalles: list[DetalleEvaluacionCIEEntrada] = Field(default_factory=list)
    estado: str = Field(default="Borrador")

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, valor: str) -> str:
        estados_permitidos = {"Borrador"}

        if valor not in estados_permitidos:
            raise ValueError(
                "Por ahora solo se permite guardar evaluaciones CIE en estado Borrador; el envío se habilitará cuando la rúbrica CIE esté definida y validada."
            )

        return valor


class DetalleEvaluacionCIERespuesta(DetalleEvaluacionCIEEntrada):
    detalleEvaluacionId: int

    model_config = ConfigDict(from_attributes=True)


class EvaluacionCIERespuesta(BaseModel):
    evaluacionId: int
    propuestaId: int
    evaluadorId: int
    tipoEvaluacionId: int
    calificacion: Decimal | None = None
    tipoRecomendacionId: int | None = None
    observaciones: str | None = None
    estadoEvaluacionId: int

    model_config = ConfigDict(from_attributes=True)



class ResolucionCIEEntrada(BaseModel):
    numeroOficio: str | None = Field(default=None, max_length=50)
    contenido: str = Field(min_length=1, max_length=20000)
    rutaArchivo: str | None = Field(default=None, max_length=500)

    @field_validator("contenido")
    @classmethod
    def validar_contenido(cls, valor: str) -> str:
        valor = valor.strip()

        if not valor:
            raise ValueError("El contenido de la resolución no puede estar vacío.")

        return valor
