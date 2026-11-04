# src/services/admin/catalogo_service.py
"""
Servicio del Módulo 5: Administración del Sistema — Catálogos dinámicos.

Implementa un CRUD genérico basado en "descriptores" (CatalogoDescriptor) para
evitar duplicar lógica en las ~25 tablas catálogo, más validaciones de negocio:
- Soft-delete obligatorio (los catálogos nunca se borran físicamente si están referenciados).
- Chequeo de integridad referencial antes de desactivar.
- Trazabilidad: usuarioAuditoriaId + ultimaAuditoria en cada escritura.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.models.catalogos import (
    AsignacionesGestora,
    ConfiguracionesSistema,
    FiltrosDaltonismo,
    LineasInvestigacion,
    Modalidades,
    ModulosSistema,
    NivelesTrl,
    TamaniosFuente,
    TiposHora,
    TiposInnovacion,
)
from src.models.convocatorias import Convocatorias, EstadosPropuesta, EtapasConvocatoria
from src.models.escuelas import Campus, Escuela
from src.models.propuesta_documentos import TiposDocumento
from src.models.propuesta_equipo import RolesEquipo
from src.models.propuesta_plan import TiposResponsabilidad
from src.models.presupuesto import EntidadesEmisoras, RubrosPropuesta, TiposFinanciamiento
from src.models.aspectos_eticos import EntesRegulatorios, EstadosAval
from src.models.acuerdos import TiposAcuerdo
from src.models.productos_academicos import TiposProductosAcademicos
from src.models.evaluaciones import EstadosEvaluacion, TiposEvaluacion, TiposRecomendacion
from src.models.dictamenes import TiposDictamen
from src.models.subsanaciones import EstadosSubsanacion


@dataclass
class CatalogoDescriptor:
    """Metadatos que describen una tabla catálogo para el CRUD genérico."""

    clase: type                      # Modelo SQLAlchemy
    nombre: str                      # Nombre visible para mensajes de error
    pk: str                          # Nombre de la columna clave primaria
    campos_busqueda: list[str]       # Columnas sobre las que aplica 'busqueda'
    campo_orden: str                 # Columna por la que se ordenan los listados
    unicidad: list[str] = field(default_factory=list)  # Columnas con constraint UNIQUE
    relaciones: list[tuple[type, str]] = field(default_factory=list)  # (modelo_hijo, fk_column)


def _obtener_o_404(sesion: Session, descriptor: CatalogoDescriptor, registro_id: int):
    registro = sesion.get(descriptor.clase, registro_id)
    if registro is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{descriptor.nombre} con id {registro_id} no encontrado",
        )
    return registro


def _validar_unicidad(sesion: Session, descriptor: CatalogoDescriptor, datos: dict, excluir_id: Optional[int] = None):
    """Verifica que no exista otro registro con los mismos valores únicos (mensaje amigable 409)."""
    for columna in descriptor.unicidad:
        if columna in datos:
            consulta = select(descriptor.clase).where(getattr(descriptor.clase, columna) == datos[columna])
            if excluir_id is not None:
                consulta = consulta.where(getattr(descriptor.clase, descriptor.pk) != excluir_id)
            conflicto = sesion.execute(consulta).scalars().first()
            if conflicto is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya existe un registro en {descriptor.nombre} con {columna} = '{datos[columna]}'",
                )


def listar(
    sesion: Session,
    descriptor: CatalogoDescriptor,
    *,
    pagina: int = 1,
    tamano_pagina: int = 50,
    busqueda: Optional[str] = None,
    incluir_inactivos: bool = False,
) -> tuple[list, dict]:
    """Listado paginado con búsqueda ILIKE y filtro de activos."""
    consulta = select(descriptor.clase)

    if not incluir_inactivos and hasattr(descriptor.clase, "activo"):
        consulta = consulta.where(descriptor.clase.activo.is_(True))

    if busqueda:
        filtros = [getattr(descriptor.clase, col).ilike(f"%{busqueda}%") for col in descriptor.campos_busqueda]
        consulta = consulta.where(or_(*filtros))

    total = sesion.execute(select(func.count()).select_from(consulta.subquery())).scalar_one()
    total_paginas = max(1, -(-total // tamano_pagina))

    consulta = (
        consulta.order_by(getattr(descriptor.clase, descriptor.campo_orden))
        .offset((pagina - 1) * tamano_pagina)
        .limit(tamano_pagina)
    )
    registros = sesion.execute(consulta).scalars().all()

    metadatos = {"total": total, "pagina": pagina, "tamanoPagina": tamano_pagina, "totalPaginas": total_paginas}
    return list(registros), metadatos


def obtener(sesion: Session, descriptor: CatalogoDescriptor, registro_id: int):
    return _obtener_o_404(sesion, descriptor, registro_id)


def crear(sesion: Session, descriptor: CatalogoDescriptor, datos: dict, usuario_id: int):
    _validar_unicidad(sesion, descriptor, datos)

    registro = descriptor.clase(**datos)
    if hasattr(registro, "usuarioAuditoriaId"):
        registro.usuarioAuditoriaId = usuario_id
    if hasattr(registro, "ultimaAuditoria"):
        registro.ultimaAuditoria = datetime.now(timezone.utc)

    sesion.add(registro)
    try:
        sesion.commit()
    except IntegrityError:
        sesion.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Conflicto de integridad al crear {descriptor.nombre}")
    sesion.refresh(registro)
    return registro


def actualizar(sesion: Session, descriptor: CatalogoDescriptor, registro_id: int, datos: dict, usuario_id: int):
    """PATCH parcial: solo se modifican los campos enviados (excluir claves con None)."""
    registro = _obtener_o_404(sesion, descriptor, registro_id)
    datos = {k: v for k, v in datos.items() if v is not None}

    _validar_unicidad(sesion, descriptor, datos, excluir_id=registro_id)

    for clave, valor in datos.items():
        setattr(registro, clave, valor)

    if hasattr(registro, "usuarioAuditoriaId"):
        registro.usuarioAuditoriaId = usuario_id
    if hasattr(registro, "ultimaAuditoria"):
        registro.ultimaAuditoria = datetime.now(timezone.utc)

    sesion.commit()
    sesion.refresh(registro)
    return registro


def cambiar_activo(sesion: Session, descriptor: CatalogoDescriptor, registro_id: int, activo: bool, usuario_id: int):
    """Activación / desactivación (soft-delete). Bloquea desactivar si hay referencias activas."""
    registro = _obtener_o_404(sesion, descriptor, registro_id)

    if not activo and descriptor.relaciones:
        for modelo_hijo, fk_column in descriptor.relaciones:
            cantidad = sesion.execute(
                select(func.count()).select_from(modelo_hijo).where(
                    getattr(modelo_hijo, fk_column) == registro_id
                )
            ).scalar_one()
            if cantidad > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"No se puede desactivar {descriptor.nombre} #{registro_id}: "
                        f"existen {cantidad} registro(s) de {modelo_hijo.__tablename__} que lo referencian."
                    ),
                )

    if not hasattr(registro, "activo"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{descriptor.nombre} no soporta activación/desactivación")

    registro.activo = activo
    if hasattr(registro, "usuarioAuditoriaId"):
        registro.usuarioAuditoriaId = usuario_id
    if hasattr(registro, "ultimaAuditoria"):
        registro.ultimaAuditoria = datetime.now(timezone.utc)

    sesion.commit()
    sesion.refresh(registro)
    return registro


# ------------------------------------------------------------------ Descriptores de catálogos
# Los modelos hijos reales se enlazan al registrar cada ruta; aquí se declaran
# las relaciones de integridad conocidas según el Diccionario de Datos.
DESCRIPTORES: dict[str, CatalogoDescriptor] = {
    "lineas-investigacion": CatalogoDescriptor(
        clase=LineasInvestigacion, nombre="Línea de investigación", pk="lineaId",
        campos_busqueda=["nombreLinea", "descripcion"], campo_orden="nombreLinea",
        unicidad=["nombreLinea"],
    ),
    "tipos-hora": CatalogoDescriptor(
        clase=TiposHora, nombre="Tipo de hora", pk="tipoHoraId",
        campos_busqueda=["codigoTipo", "descripcion"], campo_orden="codigoTipo",
        unicidad=["codigoTipo"],
    ),
    "niveles-trl": CatalogoDescriptor(
        clase=NivelesTrl, nombre="Nivel TRL", pk="nivelTrlId",
        campos_busqueda=["descripcionNivel"], campo_orden="nivelTrlId",
    ),
    "modalidades": CatalogoDescriptor(
        clase=Modalidades, nombre="Modalidad", pk="modalidadId",
        campos_busqueda=["nombreModalidad", "descripcion"], campo_orden="nombreModalidad",
    ),
    "tipos-innovacion": CatalogoDescriptor(
        clase=TiposInnovacion, nombre="Tipo de innovación", pk="tipoInnovacionId",
        campos_busqueda=["nombreTipoInnovacion", "descripcion"], campo_orden="nombreTipoInnovacion",
    ),
    "roles-equipo": CatalogoDescriptor(
        clase=RolesEquipo, nombre="Rol de equipo", pk="rolEquipoId",
        campos_busqueda=["nombreRol", "descripcion"], campo_orden="nombreRol",
    ),
    "tipos-responsabilidad": CatalogoDescriptor(
        clase=TiposResponsabilidad, nombre="Tipo de responsabilidad", pk="tipoResponsabilidadId",
        campos_busqueda=["nombreTipoResponsabilidad", "descripcion"], campo_orden="nombreTipoResponsabilidad",
    ),
    "rubros": CatalogoDescriptor(
        clase=RubrosPropuesta, nombre="Rubro de presupuesto", pk="rubroId",
        campos_busqueda=["nombreRubro", "descripcionRubro"], campo_orden="nombreRubro",
    ),
    "tipos-documento": CatalogoDescriptor(
        clase=TiposDocumento, nombre="Tipo de documento", pk="tipoDocumentoId",
        campos_busqueda=["nombreTipoDocumento", "descripcion"], campo_orden="nombreTipoDocumento",
    ),
    "tipos-financiamiento": CatalogoDescriptor(
        clase=TiposFinanciamiento, nombre="Tipo de financiamiento", pk="tipoFinanciamientoId",
        campos_busqueda=["nombreTipoFinanciamiento", "descripcion"], campo_orden="nombreTipoFinanciamiento",
    ),
    "entidades-emisoras": CatalogoDescriptor(
        clase=EntidadesEmisoras, nombre="Entidad emisora", pk="entidadEmisoraId",
        campos_busqueda=["nombreEntidadEmisora", "descripcion"], campo_orden="nombreEntidadEmisora",
    ),
    "entes-regulatorios": CatalogoDescriptor(
        clase=EntesRegulatorios, nombre="Ente regulador", pk="enteRegulatorioId",
        campos_busqueda=["nombreEnteRegulatorio", "descripcion"], campo_orden="nombreEnteRegulatorio",
    ),
    "estados-aval": CatalogoDescriptor(
        clase=EstadosAval, nombre="Estado de aval", pk="estadosAvalId",
        campos_busqueda=["nombreEstadoAval", "descripcion"], campo_orden="nombreEstadoAval",
    ),
    "estados-subsanacion": CatalogoDescriptor(
        clase=EstadosSubsanacion, nombre="Estado de subsanación", pk="estadoSubsanacionId",
        campos_busqueda=["nombreEstadoSubsanacion", "descripcion"], campo_orden="nombreEstadoSubsanacion",
    ),
    "tipos-acuerdo": CatalogoDescriptor(
        clase=TiposAcuerdo, nombre="Tipo de acuerdo", pk="tipoAcuerdoId",
        campos_busqueda=["nombreTipoAcuerdo", "descripcion"], campo_orden="nombreTipoAcuerdo",
    ),
    "tipos-producto": CatalogoDescriptor(
        clase=TiposProductosAcademicos, nombre="Tipo de producto académico", pk="tipoProductoAcademicoId",
        campos_busqueda=["nombreTipoProductoAcademico", "descripcion"], campo_orden="nombreTipoProductoAcademico",
    ),
    "tipos-evaluacion": CatalogoDescriptor(
        clase=TiposEvaluacion, nombre="Tipo de evaluación", pk="tipoEvaluacionId",
        campos_busqueda=["nombreTipoEvaluacion", "descripcion"], campo_orden="nombreTipoEvaluacion",
    ),
    "tipos-recomendacion": CatalogoDescriptor(
        clase=TiposRecomendacion, nombre="Tipo de recomendación", pk="tipoRecomendacionId",
        campos_busqueda=["nombreTipoRecomendacion", "descripcion"], campo_orden="nombreTipoRecomendacion",
    ),
    "estados-evaluacion": CatalogoDescriptor(
        clase=EstadosEvaluacion, nombre="Estado de evaluación", pk="estadosEvaluacionId",
        campos_busqueda=["nombreEstadosEvaluacion", "descripcion"], campo_orden="nombreEstadosEvaluacion",
    ),
    "tipos-dictamen": CatalogoDescriptor(
        clase=TiposDictamen, nombre="Tipo de dictamen", pk="tipoDictamenId",
        campos_busqueda=["nombreTipoDictamen", "descripcion"], campo_orden="nombreTipoDictamen",
    ),
    "campus": CatalogoDescriptor(
        clase=Campus, nombre="Campus", pk="campusId",
        campos_busqueda=["nombreCampus"], campo_orden="nombreCampus",
        relaciones=[(Escuela, "campusId")],
    ),
    "escuelas": CatalogoDescriptor(
        clase=Escuela, nombre="Escuela", pk="escuelaId",
        campos_busqueda=["codigoEscuela", "nombreEscuela"], campo_orden="nombreEscuela",
        unicidad=["codigoEscuela"],
        relaciones=[(AsignacionesGestora, "escuelaId")],
    ),
    "estados-propuesta": CatalogoDescriptor(
        clase=EstadosPropuesta, nombre="Estado de propuesta", pk="estadoPropuestaId",
        campos_busqueda=["codigoEstadoPropuesta", "nombreEstadoPropuesta", "descripcion"],
        campo_orden="orden", unicidad=["codigoEstadoPropuesta"],
    ),
    "modulos": CatalogoDescriptor(
        clase=ModulosSistema, nombre="Módulo del sistema", pk="moduloId",
        campos_busqueda=["nombreModulo", "descripcion"], campo_orden="nombreModulo",
    ),
    "configuraciones": CatalogoDescriptor(
        clase=ConfiguracionesSistema, nombre="Configuración del sistema", pk="configuracionId",
        campos_busqueda=["claveConfiguracion", "valorConfiguracion", "categoria", "descripcion"],
        campo_orden="categoria", unicidad=["claveConfiguracion"],
    ),
    "tamanios-fuente": CatalogoDescriptor(
        clase=TamaniosFuente, nombre="Tamaño de fuente", pk="tamanioFuenteId",
        campos_busqueda=["nombreTamanioFuente"], campo_orden="nombreTamanioFuente",
    ),
    "filtros-daltonismo": CatalogoDescriptor(
        clase=FiltrosDaltonismo, nombre="Filtro de daltonismo", pk="filtroDaltonismoId",
        campos_busqueda=["nombreFiltroDaltonismo", "descripcion"], campo_orden="nombreFiltroDaltonismo",
    ),
    "convocatorias": CatalogoDescriptor(
        clase=Convocatorias, nombre="Convocatoria", pk="convocatoriaId",
        campos_busqueda=["nombreConvocatoria"], campo_orden="convocatoriaId",
        relaciones=[(EtapasConvocatoria, "convocatoriaId")],
    ),
    "etapas": CatalogoDescriptor(
        clase=EtapasConvocatoria, nombre="Etapa de convocatoria", pk="etapaId",
        campos_busqueda=["nombreEtapa"], campo_orden="fechaInicio",
    ),
}


def obtener_descriptor(clave: str) -> CatalogoDescriptor:
    descriptor = DESCRIPTORES.get(clave)
    if descriptor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Catálogo '{clave}' no existe en el sistema")
    return descriptor


# ------------------------------------------------------------------ Validaciones de negocio específicas
def validar_convocatoria(datos: dict, existente=None) -> None:
    """La fecha de cierre debe ser posterior a la apertura (regla de negocio de Convocatorias)."""
    apertura = datos.get("fechaApertura") or getattr(existente, "fechaApertura", None)
    cierre = datos.get("fechaCierre") or getattr(existente, "fechaCierre", None)
    bloqueo = datos.get("fechaBloqueoOrion") or getattr(existente, "fechaBloqueoOrion", None)

    if apertura and cierre and cierre < apertura:
        raise HTTPException(status_code=422, detail="La fecha de cierre no puede ser anterior a la fecha de apertura")
    if bloqueo and cierre and bloqueo > cierre:
        raise HTTPException(status_code=422, detail="El bloqueo ORION no puede ser posterior al cierre de la convocatoria")


def validar_etapa(datos: dict, sesion: Session, existente=None) -> None:
    """Las fechas de etapa deben respetar inicio < fin y pertenecer a una convocatoria existente."""
    inicio = datos.get("fechaInicio") or getattr(existente, "fechaInicio", None)
    fin = datos.get("fechaFin") or getattr(existente, "fechaFin", None)
    convocatoria_id = datos.get("convocatoriaId") or getattr(existente, "convocatoriaId", None)

    if inicio and fin and fin <= inicio:
        raise HTTPException(status_code=422, detail="La fecha de fin de la etapa debe ser posterior a la de inicio")

    if convocatoria_id is not None and sesion.get(Convocatorias, convocatoria_id) is None:
        raise HTTPException(status_code=422, detail=f"La convocatoria {convocatoria_id} no existe")

    rol_id = datos.get("rolResponsableId")
    if rol_id is not None:
        from src.models.roles import RolesSistema
        if sesion.get(RolesSistema, rol_id) is None:
            raise HTTPException(status_code=422, detail=f"El rol responsable {rol_id} no existe")


def validar_escuela_campus(escuela_id: int, sesion: Session) -> Escuela:
    escuela = sesion.get(Escuela, escuela_id)
    if escuela is None:
        raise HTTPException(status_code=422, detail=f"La escuela {escuela_id} no existe")
    return escuela
