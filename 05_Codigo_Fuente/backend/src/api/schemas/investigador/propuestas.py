from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# --- Schemas de Creación y Edición de Propuesta ---

class PropuestaCreate(BaseModel):
    """Esquema para crear una propuesta en estado Borrador."""
    titulo: str = Field(..., min_length=5, max_length=300, description="Título oficial de la propuesta")
    convocatoriaId: int = Field(..., description="ID de la convocatoria activa")
    escuelaId: int = Field(..., description="ID de la escuela base del proyecto")
    lineaInvestigacionId: Optional[int] = Field(None, description="Línea de investigación institucional")
    modalidadId: Optional[int] = Field(None, description="Modalidad de la investigación")
    montoTotal: Decimal = Field(default=Decimal("0.00"), description="Monto total solicitado a fondos VIE")
    nivelTrlActual: Optional[int] = Field(None, ge=1, le=9, description="Nivel TRL inicial (1-9)")
    nivelTrlEsperado: Optional[int] = Field(None, ge=1, le=9, description="Nivel TRL proyectado (1-9)")
    fechaInicio: Optional[date] = Field(None, description="Fecha estimada de inicio")
    fechaFinalizacion: Optional[date] = Field(None, description="Fecha estimada de conclusión")
    propuestaAnteriorId: Optional[int] = Field(None, description="ID de propuesta predecesora si es continuidad")


class PropuestaUpdate(BaseModel):
    """Esquema para actualizar datos generales de la propuesta."""
    titulo: Optional[str] = Field(None, min_length=5, max_length=300)
    lineaInvestigacionId: Optional[int] = None
    modalidadId: Optional[int] = None
    montoTotal: Optional[Decimal] = None
    nivelTrlActual: Optional[int] = Field(None, ge=1, le=9)
    nivelTrlEsperado: Optional[int] = Field(None, ge=1, le=9)
    escuelaId: Optional[int] = None 
    fechaInicio: Optional[date] = None
    fechaFinalizacion: Optional[date] = None


# --- Form-04: Contenido de la Propuesta ---

class ContenidoForm04Update(BaseModel):
    """Llenado del contenido de las secciones del Form-04."""
    resumen: Optional[str] = Field(None, max_length=4000, description="Resumen ejecutivo")
    palabrasClave: Optional[str] = Field(None, max_length=255, description="Palabras clave separadas por coma")
    abstract: Optional[str] = Field(None, max_length=4000, description="Resumen en idioma inglés")
    problemaInvestigacion: Optional[str] = Field(None, max_length=4000, description="Justificación y planteamiento")
    objetivoGeneral: Optional[str] = Field(None, max_length=2000, description="Objetivo general del proyecto")
    objetivosEspecificos: Optional[str] = Field(None, max_length=3000, description="Objetivos específicos en texto")
    estadoArte: Optional[str] = Field(None, max_length=8000, description="Estado del arte y antecedentes")
    metodologia: Optional[str] = Field(None, max_length=6000, description="Marco metodológico y procedimientos")
    estrategiaDivulgacion: Optional[str] = Field(None, max_length=3000, description="Estrategia de transferencia y difusión")
    hojaRuta: Optional[str] = Field(None, max_length=4000, description="Hoja de ruta tecnológica")


class DeclaracionesForm04Update(BaseModel):
    """Declaraciones formales y de propiedad intelectual de la propuesta."""
    tieneFinanciamientoPrevio: bool = False
    tieneContinuidadProyecto: bool = False
    requiereInstrumentoJuridico: bool = False
    tieneBasePosgrado: bool = False
    tieneInformacionConfidencial: bool = False
    tienePotencialPI: bool = False
    poseeInnovacion: bool = False
    tipoInnovacionId: Optional[int] = None
    aceptaResguardoRepositorio: bool = False
    aceptaDeclaracionJurada: bool = False


# --- Equipo de Trabajo ---

class IntegranteEquipoCreate(BaseModel):
    """Agregar miembro al equipo investigador."""
    usuarioId: int = Field(..., description="ID del usuario TEC a incorporar")
    tipoHoraId: int = Field(..., description="Tipo de hora (VIE, DOC, etc.)")
    horasSemanales: Decimal = Field(..., gt=0, le=40, description="Carga semanal en horas")
    rolEquipoId: int = Field(..., description="Rol en el equipo (Coordinador, Investigador, Asistente)")
    orcid: Optional[str] = Field(None, max_length=20, description="Código ORCID del investigador")


class IntegranteEquipoResponse(BaseModel):
    integranteEquipoId: int
    propuestaId: int
    usuarioId: int
    nombreCompleto: Optional[str] = None
    correoInstitucional: Optional[str] = None
    tipoHoraId: int
    horasSemanales: Decimal
    rolEquipoId: int
    orcid: Optional[str] = None

    class Config:
        from_attributes = True


class ColaboradorExternoCreate(BaseModel):
    """Agregar colaborador externo."""
    nombreColaborador: str = Field(..., max_length=50)
    apellido1Colaborador: Optional[str] = Field(None, max_length=50)
    apellido2Colaborador: Optional[str] = Field(None, max_length=50)
    idOrcid: Optional[str] = Field(None, max_length=20)
    institucionEmpresa: str = Field(..., max_length=150)


class ColaboradorExternoResponse(BaseModel):
    colaboradorId: int
    propuestaId: int
    nombreColaborador: str
    apellido1Colaborador: Optional[str] = None
    apellido2Colaborador: Optional[str] = None
    idOrcid: Optional[str] = None
    institucionEmpresa: str

    class Config:
        from_attributes = True


class EquipoCompletoUpdate(BaseModel):
    integrantes: List[IntegranteEquipoCreate] = []
    colaboradoresExternos: List[ColaboradorExternoCreate] = []


class EquipoCompletoResponse(BaseModel):
    integrantes: List[IntegranteEquipoResponse] = []
    colaboradoresExternos: List[ColaboradorExternoResponse] = []


# --- Productos Académicos ---

class ProductoAcademicoCreate(BaseModel):
    """Registrar producto académico comprometido."""
    tipoProductoAcademicoId: int = Field(..., description="Tipo de producto académico")
    objetivoEspecificoId: Optional[int] = Field(None, description="Objetivo específico asociado")
    descripcion: str = Field(..., min_length=5, max_length=300)
    cantidadComprometida: int = Field(..., ge=1, description="Cantidad mínima a entregar")
    fechaEntregaEstimada: Optional[date] = None
    esPropiedadIndustrial: bool = False


class ProductoAcademicoResponse(BaseModel):
    productoId: int
    propuestaId: int
    tipoProductoAcademicoId: int
    descripcion: str
    cantidadComprometida: int
    fechaEntregaEstimada: Optional[date] = None
    esPropiedadIndustrial: bool = False

    class Config:
        from_attributes = True


# --- Presupuesto ---

class RubroPresupuestoCreate(BaseModel):
    """Agregar rubro de presupuesto."""
    rubroId: int = Field(..., description="ID del rubro de gasto")
    montoSolicitado: Decimal = Field(..., gt=0, description="Monto solicitado a la VIE")
    anioEjecucion: int = Field(..., description="Año de ejecución presupuestaria")
    esDuradero: bool = False


class RubroPresupuestoResponse(BaseModel):
    presupuestoId: int
    propuestaId: int
    rubroId: int
    montoSolicitado: Decimal
    montoAprobado: Optional[Decimal] = None
    anioEjecucion: int
    esDuradero: bool

    class Config:
        from_attributes = True


# --- Plan de Trabajo ---

class ObjetivoEspecificoCreate(BaseModel):
    numeroObjetivo: int = Field(..., ge=1)
    descripcion: str = Field(..., min_length=5)


class ActividadCreate(BaseModel):
    objetivoEspecificoId: int
    descripcionActividad: str = Field(..., min_length=5)
    resultadoEsperado: str = Field(..., min_length=3)
    mesInicio: int = Field(..., ge=1, le=12)
    duracionMeses: Decimal = Field(..., gt=0)
    anioEjecucion: int
    esGira: bool = False
    esPasantia: bool = False
    requiereInformeAvance: bool = False


# --- Plan de Acción y Gestión de Riesgos (Form-05) ---
# Guardado transaccional que llena ObjetivosEspecificos, Actividades, Riesgos,
# MedidasMitigacion y ParticipantesActividad en un único commit.

class ParticipanteActividadCreate(BaseModel):
    usuarioId: int = Field(..., description="ID del usuario TEC participante (FK Usuarios)")
    tipoResponsabilidadId: int = Field(..., description="ID del catálogo TiposResponsabilidad (Ejecuta/Supervisa/Participa/Asesora)")


class MedidaMitigacionCreate(BaseModel):
    descripcionMedida: str = Field("", max_length=2000)
    usuarioResponsableId: Optional[int] = Field(None, description="ID del usuario TEC responsable de la medida (FK Usuarios)")
    esPermisoEtico: bool = False


class RiesgoCreate(BaseModel):
    descripcionRiesgo: str = Field("", max_length=2000)
    probabilidad: Optional[str] = Field(None, max_length=20)
    impacto: Optional[str] = Field(None, max_length=20)
    medidas: List[MedidaMitigacionCreate] = []


class ObjetivoEspecificoItem(BaseModel):
    """Objetivo específico dentro del payload de autoguardado del Plan de Acción (tolerante a edición parcial)."""
    numeroObjetivo: Optional[int] = Field(None, ge=1)
    descripcion: str = Field("", max_length=2000)


class ActividadCompletaCreate(BaseModel):
    """Actividad del cronograma con su objetivo asociado, participantes y riesgos.

    Campos opcionales con valores por defecto para permitir el autoguardado
    mientras el investigador todavía está escribiendo (sin provocar HTTP 422).
    """
    objetivoEspecificoIndice: Optional[int] = Field(
        None, ge=0, description="Índice (base 0) del objetivo específico dentro de objetivosEspecificos"
    )
    descripcionActividad: str = Field("", max_length=4000)
    resultadoEsperado: str = Field("", max_length=4000)
    mesInicio: int = Field(1, ge=1, le=36)
    duracionMeses: Decimal = Field(Decimal("1"), gt=0)
    anioEjecucion: Optional[int] = Field(None, ge=2000, le=2100)
    esGira: bool = False
    esPasantia: bool = False
    requiereInformeAvance: bool = False
    participantes: List[ParticipanteActividadCreate] = []
    riesgos: List[RiesgoCreate] = []


class PlanAccionRiesgosUpdate(BaseModel):
    """Payload completo del Form-05 / Paso 12 del Form-04 (autoguardado idempotente)."""
    objetivosEspecificos: List[ObjetivoEspecificoItem] = []
    actividades: List[ActividadCompletaCreate] = []


class PlanAccionRiesgosResponse(BaseModel):
    objetivosEspecificos: List["ObjetivoEspecificoResponse"] = []
    actividades: List["ActividadResponse"] = []


# --- Aspectos Éticos (Paso 15 del Form-04) ---

class AspectosEticosUpdate(BaseModel):
    involucraSeresHumanos: bool = False
    involucraBiodiversidad: bool = False
    involucraAnimales: bool = False
    involucraTerritoriosIndigenas: bool = False
    justificacionExencion: Optional[str] = None
    enteRegulatorioId: Optional[int] = Field(None, description="FK EntesRegulatorios (CEC, CONAGEBIO, CICUA, CONARE)")
    estadoAvalId: Optional[int] = Field(None, description="FK EstadosAval (Pendiente, Aprobado, Exento, Rechazado)")


class AspectosEticosResponse(BaseModel):
    involucraSeresHumanos: bool = False
    involucraBiodiversidad: bool = False
    involucraAnimales: bool = False
    involucraTerritoriosIndigenas: bool = False
    justificacionExencion: Optional[str] = None
    enteRegulatorioId: Optional[int] = None
    estadoAvalId: Optional[int] = None

    class Config:
        from_attributes = True


# --- Financiamiento Externo / Fuentes Adicionales (Paso 13 del Form-04) ---

class FinanciamientoExternoCreate(BaseModel):
    tipoFinanciamientoId: int = Field(..., description="FK TiposFinanciamiento (Externo, Contrapartida_Institucional, Cofinanciamiento)")
    anio: int = Field(..., ge=2000, le=2100)
    monto: Decimal = Field(..., ge=0)
    numeroOficio: Optional[str] = Field(None, max_length=50)
    entidadEmisoraId: Optional[int] = Field(None, description="FK EntidadesEmisoras")


class FinanciamientoExternoUpdate(BaseModel):
    financiamientos: List[FinanciamientoExternoCreate] = []


class FinanciamientoExternoResponse(BaseModel):
    financiamientoId: int
    tipoFinanciamientoId: int
    anio: int
    monto: Decimal
    numeroOficio: Optional[str] = None
    entidadEmisoraId: Optional[int] = None

    class Config:
        from_attributes = True


# --- Referencias Bibliográficas (Paso 16 del Form-04) ---
# Al guardar se crean FuentesBibliograficas y se vinculan vía PropuestaReferencia.

class FuenteBibliograficaCreate(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=500)
    anioPublicacion: int = Field(..., ge=1900, le=2100)
    doi: Optional[str] = Field(None, max_length=100)
    revistaFuente: Optional[str] = Field(None, max_length=200)
    esIndexadaWoSScopus: bool = False


class ReferenciasUpdate(BaseModel):
    referencias: List[FuenteBibliograficaCreate] = []


class FuenteBibliograficaResponse(BaseModel):
    fuenteId: int
    titulo: str
    anioPublicacion: int
    doi: Optional[str] = None
    revistaFuente: Optional[str] = None
    esIndexadaWoSScopus: bool = False

    class Config:
        from_attributes = True


# --- Productos Académicos (reemplazo completo - Paso 14 del Form-04) ---

class ProductosAcademicosUpdate(BaseModel):
    productos: List[ProductoAcademicoCreate] = []


# --- Respuestas del Plan de Acción y Riesgos (detalle) ---

class ParticipanteActividadResponse(BaseModel):
    participanteActividadId: int
    actividadId: int
    usuarioId: int
    tipoResponsabilidadId: int

    class Config:
        from_attributes = True


class MedidaMitigacionResponse(BaseModel):
    medidaMitigacionId: int
    riesgoId: int
    descripcionMedida: str
    usuarioResponsableId: int
    esPermisoEtico: bool = False

    class Config:
        from_attributes = True


class RiesgoResponse(BaseModel):
    riesgoId: int
    actividadId: int
    descripcionRiesgo: str
    probabilidad: Optional[str] = None
    impacto: Optional[str] = None
    medidas: List[MedidaMitigacionResponse] = []

    class Config:
        from_attributes = True


class ActividadResponse(BaseModel):
    actividadId: int
    objetivoEspecificoId: int
    descripcionActividad: str
    resultadoEsperado: str
    mesInicio: int
    duracionMeses: Decimal
    anioEjecucion: int
    esGira: bool = False
    esPasantia: bool = False
    requiereInformeAvance: bool = False
    participantes: List[ParticipanteActividadResponse] = []
    riesgos: List[RiesgoResponse] = []

    class Config:
        from_attributes = True


class ObjetivoEspecificoResponse(BaseModel):
    objetivoEspecificoId: int
    numeroObjetivo: int
    descripcion: str

    class Config:
        from_attributes = True


# --- Subsanaciones ---

class SubsanacionResponse(BaseModel):
    subsanacionId: int
    propuestaId: int
    gestoraVIEId: int
    nombreRevisor: Optional[str] = None
    fechaSolicitud: datetime
    comentarioGestora: str
    fechaRespuestaInvestigador: Optional[datetime] = None
    respuestaInvestigador: Optional[str] = None
    estadoSubsanacionId: int
    nombreEstadoSubsanacion: Optional[str] = None

    class Config:
        from_attributes = True


class SubsanacionRespuestaRequest(BaseModel):
    respuestaInvestigador: str = Field(..., min_length=3, description="Detalle de correcciones o justificación")
    reenviarPropuesta: bool = True


class SubsanacionCrearRequest(BaseModel):
    comentarioGestora: str = Field(..., min_length=5, description="Observaciones o faltantes requeridos")


# --- Respuestas de Propuesta ---

class PropuestaResumenResponse(BaseModel):
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    estadoId: int
    nombreEstado: Optional[str] = None
    etapaId: int
    convocatoriaId: int
    escuelaId: int
    nombreEscuela: Optional[str] = None
    modalidadId: Optional[int] = None
    modalidad: Optional[str] = None
    montoTotal: Decimal
    nivelTrlActual: Optional[int] = None
    nivelTrlEsperado: Optional[int] = None
    fechaCreacion: datetime
    fechaEnvio: Optional[datetime] = None
    investigadorCoordId: Optional[int] = None
    esPropietario: bool = True
    form01Completado: Optional[bool] = False
    form02Completado: Optional[bool] = False
    form03Completado: Optional[bool] = False
    subsanacionActiva: Optional[SubsanacionResponse] = None

    class Config:
        from_attributes = True


class ContenidoForm04Response(BaseModel):
    resumen: Optional[str] = None
    palabrasClave: Optional[str] = None
    abstract: Optional[str] = None
    problemaInvestigacion: Optional[str] = None
    objetivoGeneral: Optional[str] = None
    objetivosEspecificos: Optional[str] = None
    estadoArte: Optional[str] = None
    metodologia: Optional[str] = None
    estrategiaDivulgacion: Optional[str] = None
    hojaRuta: Optional[str] = None

    class Config:
        from_attributes = True


class DeclaracionesForm04Response(BaseModel):
    tieneFinanciamientoPrevio: bool = False
    tieneContinuidadProyecto: bool = False
    requiereInstrumentoJuridico: bool = False
    tieneBasePosgrado: bool = False
    tieneInformacionConfidencial: bool = False
    tienePotencialPI: bool = False
    poseeInnovacion: bool = False
    tipoInnovacionId: Optional[int] = None
    aceptaResguardoRepositorio: bool = False
    aceptaDeclaracionJurada: bool = False

    class Config:
        from_attributes = True


class PropuestaDetalleResponse(BaseModel):
    propuestaId: int
    codigoPropuesta: str
    titulo: str
    estadoId: int
    nombreEstado: Optional[str] = None
    etapaId: int
    convocatoriaId: int
    escuelaId: int
    nombreEscuela: Optional[str] = None
    lineaInvestigacionId: Optional[int] = None
    modalidadId: Optional[int] = None
    modalidad: Optional[str] = None
    montoTotal: Decimal
    nivelTrlActual: Optional[int] = None
    nivelTrlEsperado: Optional[int] = None
    fechaInicio: Optional[date] = None
    fechaFinalizacion: Optional[date] = None
    fechaCreacion: datetime
    fechaEnvio: Optional[datetime] = None
    investigadorCoordId: Optional[int] = None
    esPropietario: bool = True
    
    # Sub-entidades
    resumen: Optional[str] = None
    palabrasClave: Optional[str] = None
    abstract: Optional[str] = None
    objetivoGeneral: Optional[str] = None
    metodologia: Optional[str] = None
    tienePotencialPI: bool = False
    poseeInnovacion: bool = False
    contenido: Optional[ContenidoForm04Response] = None
    declaraciones: Optional[DeclaracionesForm04Response] = None
    
    integrantes: List[IntegranteEquipoResponse] = []
    colaboradoresExternos: List[ColaboradorExternoResponse] = []
    productosAcademicos: List[ProductoAcademicoResponse] = []
    presupuesto: List[RubroPresupuestoResponse] = []
    subsanaciones: List[SubsanacionResponse] = []

    # Núcleo de propuestas (sección 3) ampliado
    planAccion: Optional[PlanAccionRiesgosResponse] = None
    aspectosEticos: Optional[AspectosEticosResponse] = None
    financiamientoExterno: List[FinanciamientoExternoResponse] = []
    referencias: List[FuenteBibliograficaResponse] = []

    class Config:
        from_attributes = True


# Resolver referencias forward de PlanAccionRiesgosResponse (definidas más abajo).
PlanAccionRiesgosResponse.model_rebuild()
