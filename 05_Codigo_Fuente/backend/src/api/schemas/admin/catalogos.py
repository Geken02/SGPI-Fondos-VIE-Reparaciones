# src/api/schemas/admin/catalogos.py
"""
Esquemas Pydantic del Módulo 5: Administración del Sistema — Catálogos dinámicos.
Cada Response incluye TODOS los campos necesarios (no solo el ID).
"""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# BASE COMPARTIDA (solo auditoría)
# ============================================================================

class CatalogoBase(BaseModel):
    """Campos de auditoría compartidos por todos los catálogos."""
    model_config = ConfigDict(from_attributes=True)
    
    activo: bool = True
    creadoEn: Optional[datetime] = None
    usuarioAuditoriaId: Optional[int] = None
    ultimaAuditoria: Optional[datetime] = None


# ---------------------------------------------------------------- LineasInvestigacion
class LineaCreate(BaseModel):
    nombreLinea: str = Field(min_length=3, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=500)

class LineaUpdate(BaseModel):
    nombreLinea: Optional[str] = Field(default=None, min_length=3, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=500)

class LineaResponse(CatalogoBase):
    lineaId: int
    nombreLinea: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposHora
class TipoHoraCreate(BaseModel):
    codigoTipo: str = Field(min_length=2, max_length=20, pattern=r"^[A-ZÁÉÍÓÚÑ_]+$")
    descripcion: str = Field(min_length=3, max_length=100)

class TipoHoraUpdate(BaseModel):
    codigoTipo: Optional[str] = Field(default=None, min_length=2, max_length=20, pattern=r"^[A-ZÁÉÍÓÚÑ_]+$")
    descripcion: Optional[str] = Field(default=None, min_length=3, max_length=100)

class TipoHoraResponse(CatalogoBase):
    tipoHoraId: int
    codigoTipo: str
    descripcion: str


# ---------------------------------------------------------------- NivelesTrl
class NivelTrlCreate(BaseModel):
    nivelTrlId: int = Field(ge=1, le=9)
    descripcionNivel: str = Field(min_length=5, max_length=500)

class NivelTrlUpdate(BaseModel):
    descripcionNivel: Optional[str] = Field(default=None, min_length=5, max_length=500)

class NivelTrlResponse(CatalogoBase):
    nivelTrlId: int
    descripcionNivel: str


# ---------------------------------------------------------------- Modalidades
class ModalidadCreate(BaseModel):
    nombreModalidad: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class ModalidadUpdate(BaseModel):
    nombreModalidad: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class ModalidadResponse(CatalogoBase):
    modalidadId: int
    nombreModalidad: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposInnovacion
class TipoInnovacionCreate(BaseModel):
    nombreTipoInnovacion: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoInnovacionUpdate(BaseModel):
    nombreTipoInnovacion: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoInnovacionResponse(CatalogoBase):
    tipoInnovacionId: int
    nombreTipoInnovacion: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- RolesEquipo
class RolEquipoCreate(BaseModel):
    nombreRol: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class RolEquipoUpdate(BaseModel):
    nombreRol: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class RolEquipoResponse(CatalogoBase):
    rolEquipoId: int
    nombreRol: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposResponsabilidad
class TipoResponsabilidadCreate(BaseModel):
    nombreTipoResponsabilidad: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=200)

class TipoResponsabilidadUpdate(BaseModel):
    nombreTipoResponsabilidad: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=200)

class TipoResponsabilidadResponse(CatalogoBase):
    tipoResponsabilidadId: int
    nombreTipoResponsabilidad: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- RubrosPropuesta
class RubroCreate(BaseModel):
    nombreRubro: str = Field(min_length=2, max_length=100)
    descripcionRubro: Optional[str] = Field(default=None, max_length=300)

class RubroUpdate(BaseModel):
    nombreRubro: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcionRubro: Optional[str] = Field(default=None, max_length=300)

class RubroResponse(CatalogoBase):
    rubroId: int
    nombreRubro: str
    descripcionRubro: Optional[str] = None


# ---------------------------------------------------------------- TiposDocumento
class TipoDocumentoCreate(BaseModel):
    nombreTipoDocumento: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoDocumentoUpdate(BaseModel):
    nombreTipoDocumento: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoDocumentoResponse(CatalogoBase):
    tipoDocumentoId: int
    nombreTipoDocumento: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposFinanciamiento
class TipoFinanciamientoCreate(BaseModel):
    nombreTipoFinanciamiento: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoFinanciamientoUpdate(BaseModel):
    nombreTipoFinanciamiento: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoFinanciamientoResponse(CatalogoBase):
    tipoFinanciamientoId: int
    nombreTipoFinanciamiento: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- EntidadesEmisoras
class EntidadEmisoraCreate(BaseModel):
    nombreEntidadEmisora: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EntidadEmisoraUpdate(BaseModel):
    nombreEntidadEmisora: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EntidadEmisoraResponse(CatalogoBase):
    entidadEmisoraId: int
    nombreEntidadEmisora: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- EntesRegulatorios
class EnteRegulatorioCreate(BaseModel):
    nombreEnteRegulatorio: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EnteRegulatorioUpdate(BaseModel):
    nombreEnteRegulatorio: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EnteRegulatorioResponse(CatalogoBase):
    enteRegulatorioId: int
    nombreEnteRegulatorio: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- EstadosAval
class EstadoAvalCreate(BaseModel):
    nombreEstadoAval: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EstadoAvalUpdate(BaseModel):
    nombreEstadoAval: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EstadoAvalResponse(CatalogoBase):
    estadoAvalId: int
    nombreEstadoAval: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- EstadosSubsanacion
class EstadoSubsanacionCreate(BaseModel):
    nombreEstadoSubsanacion: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class EstadoSubsanacionUpdate(BaseModel):
    nombreEstadoSubsanacion: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class EstadoSubsanacionResponse(CatalogoBase):
    estadoSubsanacionId: int
    nombreEstadoSubsanacion: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposAcuerdo
class TipoAcuerdoCreate(BaseModel):
    nombreTipoAcuerdo: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoAcuerdoUpdate(BaseModel):
    nombreTipoAcuerdo: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoAcuerdoResponse(CatalogoBase):
    tipoAcuerdoId: int
    nombreTipoAcuerdo: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposProductosAcademicos
class TipoProductoAcademicoCreate(BaseModel):
    nombreTipoProductoAcademico: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoProductoAcademicoUpdate(BaseModel):
    nombreTipoProductoAcademico: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoProductoAcademicoResponse(CatalogoBase):
    tipoProductoAcademicoId: int
    nombreTipoProductoAcademico: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposEvaluacion
class TipoEvaluacionCreate(BaseModel):
    nombreTipoEvaluacion: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoEvaluacionUpdate(BaseModel):
    nombreTipoEvaluacion: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoEvaluacionResponse(CatalogoBase):
    tipoEvaluacionId: int
    nombreTipoEvaluacion: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposRecomendacion
class TipoRecomendacionCreate(BaseModel):
    nombreTipoRecomendacion: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoRecomendacionUpdate(BaseModel):
    nombreTipoRecomendacion: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoRecomendacionResponse(CatalogoBase):
    tipoRecomendacionId: int
    nombreTipoRecomendacion: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- EstadosEvaluacion
class EstadoEvaluacionCreate(BaseModel):
    nombreEstadoEvaluacion: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EstadoEvaluacionUpdate(BaseModel):
    nombreEstadoEvaluacion: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class EstadoEvaluacionResponse(CatalogoBase):
    estadoEvaluacionId: int
    nombreEstadoEvaluacion: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TiposDictamen
class TipoDictamenCreate(BaseModel):
    nombreTipoDictamen: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoDictamenUpdate(BaseModel):
    nombreTipoDictamen: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=300)

class TipoDictamenResponse(CatalogoBase):
    tipoDictamenId: int
    nombreTipoDictamen: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- Campus
class CampusCreate(BaseModel):
    nombreCampus: str = Field(min_length=3, max_length=50)

class CampusUpdate(BaseModel):
    nombreCampus: Optional[str] = Field(default=None, min_length=3, max_length=50)

class CampusResponse(CatalogoBase):
    campusId: int
    nombreCampus: str


# ---------------------------------------------------------------- Escuelas
class EscuelaCreate(BaseModel):
    codigoEscuela: str = Field(min_length=1, max_length=10)
    nombreEscuela: str = Field(min_length=3, max_length=150)
    campusId: int

class EscuelaUpdate(BaseModel):
    codigoEscuela: Optional[str] = Field(default=None, min_length=1, max_length=10)
    nombreEscuela: Optional[str] = Field(default=None, min_length=3, max_length=150)
    campusId: Optional[int] = None

class EscuelaResponse(CatalogoBase):
    escuelaId: int
    codigoEscuela: str
    nombreEscuela: str
    campusId: int
    nombreCampus: Optional[str] = None


# ---------------------------------------------------------------- EstadosPropuesta
class EstadoPropuestaCreate(BaseModel):
    codigoEstadoPropuesta: str = Field(min_length=2, max_length=20, pattern=r"^[A-ZÁÉÍÓÚÑ_0-9]+$")
    nombreEstadoPropuesta: str = Field(min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    esFinal: bool = False
    orden: int = Field(ge=1)

class EstadoPropuestaUpdate(BaseModel):
    codigoEstadoPropuesta: Optional[str] = Field(default=None, min_length=2, max_length=20, pattern=r"^[A-ZÁÉÍÓÚÑ_0-9]+$")
    nombreEstadoPropuesta: Optional[str] = Field(default=None, min_length=2, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    esFinal: Optional[bool] = None
    orden: Optional[int] = Field(default=None, ge=1)

class EstadoPropuestaResponse(CatalogoBase):
    estadoPropuestaId: int
    codigoEstadoPropuesta: str
    nombreEstadoPropuesta: str
    descripcion: Optional[str] = None
    esFinal: bool
    orden: int


# ---------------------------------------------------------------- ModulosSistema
class ModuloCreate(BaseModel):
    nombreModulo: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class ModuloUpdate(BaseModel):
    nombreModulo: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class ModuloResponse(CatalogoBase):
    moduloId: int
    nombreModulo: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- TamaniosFuente
class TamanoFuenteCreate(BaseModel):
    nombreTamanioFuente: str = Field(min_length=1, max_length=20)

class TamanoFuenteUpdate(BaseModel):
    nombreTamanioFuente: Optional[str] = Field(default=None, min_length=1, max_length=20)

class TamanoFuenteResponse(CatalogoBase):
    tamanioFuenteId: int
    nombreTamanioFuente: str


# ---------------------------------------------------------------- FiltrosDaltonismo
class FiltroDaltonismoCreate(BaseModel):
    nombreFiltroDaltonismo: str = Field(min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class FiltroDaltonismoUpdate(BaseModel):
    nombreFiltroDaltonismo: Optional[str] = Field(default=None, min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=255)

class FiltroDaltonismoResponse(CatalogoBase):
    filtroDaltonismoId: int
    nombreFiltroDaltonismo: str
    descripcion: Optional[str] = None


# ---------------------------------------------------------------- ConfiguracionesSistema
class ConfiguracionCreate(BaseModel):
    claveConfiguracion: str = Field(min_length=2, max_length=100, pattern=r"^[A-ZÁÉÍÓÚÑ_0-9]+$")
    valorConfiguracion: str = Field(min_length=1, max_length=4000)
    categoria: str = Field(min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    esPublica: bool = False

class ConfiguracionUpdate(BaseModel):
    valorConfiguracion: Optional[str] = Field(default=None, min_length=1, max_length=4000)
    categoria: Optional[str] = Field(default=None, min_length=2, max_length=50)
    descripcion: Optional[str] = Field(default=None, max_length=255)
    esPublica: Optional[bool] = None

class ConfiguracionResponse(CatalogoBase):
    configuracionId: int
    claveConfiguracion: str
    valorConfiguracion: str
    categoria: str
    descripcion: Optional[str] = None
    esPublica: bool


# ---------------------------------------------------------------- Convocatorias
class ConvocatoriaCreate(BaseModel):
    nombreConvocatoria: str = Field(min_length=3, max_length=100)
    fechaApertura: date
    fechaCierre: date
    fechaBloqueoOrion: Optional[date] = None

class ConvocatoriaUpdate(BaseModel):
    nombreConvocatoria: Optional[str] = Field(default=None, min_length=3, max_length=100)
    fechaApertura: Optional[date] = None
    fechaCierre: Optional[date] = None
    fechaBloqueoOrion: Optional[date] = None

class ConvocatoriaResponse(CatalogoBase):
    convocatoriaId: int
    nombreConvocatoria: str
    fechaApertura: date
    fechaCierre: date
    fechaBloqueoOrion: Optional[date] = None


# ---------------------------------------------------------------- Etapas
class EtapaCreate(BaseModel):
    convocatoriaId: int
    nombreEtapa: str = Field(min_length=2, max_length=100)
    fechaInicio: datetime
    fechaFin: datetime
    esBloqueante: bool = False
    rolResponsableId: Optional[int] = None

class EtapaUpdate(BaseModel):
    nombreEtapa: Optional[str] = Field(default=None, min_length=2, max_length=100)
    fechaInicio: Optional[datetime] = None
    fechaFin: Optional[datetime] = None
    esBloqueante: Optional[bool] = None
    rolResponsableId: Optional[int] = None

class EtapaResponse(CatalogoBase):
    etapaId: int
    convocatoriaId: int
    nombreEtapa: str
    fechaInicio: datetime
    fechaFin: datetime
    esBloqueante: bool
    rolResponsableId: Optional[int] = None