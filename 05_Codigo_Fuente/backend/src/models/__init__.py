# src/models/__init__.py
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela, Campus
from src.models.roles import RolesSistema, UsuarioRol, Permisos, RolPermisos
from src.models.convocatorias import Convocatorias, EtapasConvocatoria, EstadosPropuesta
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido, PropuestaDeclaraciones
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta, ColaboradoresExternos, RolesEquipo
from src.models.propuesta_documentos import PropuestaDocumentos, TiposDocumento
from src.models.propuesta_plan import (
    ObjetivosEspecificos, Actividades, Riesgos, MedidasMitigacion,
    ParticipantesActividad, TiposResponsabilidad
)
from src.models.presupuesto import (
    PresupuestoPropuesta, RubrosPropuesta, FinanciamientoExterno,
    TiposFinanciamiento, EntidadesEmisoras
)
from src.models.aspectos_eticos import AspectosEticos, EntesRegulatorios, EstadosAval
from src.models.bibliografia import Autores, FuentesBibliograficas, AutorFuente, PropuestaReferencia
from src.models.productos_academicos import ProductosAcademicos, TiposProductosAcademicos
from src.models.evaluaciones import (
    Evaluaciones, CriteriosEvaluacion, DetalleEvaluacion,
    TiposEvaluacion, TiposRecomendacion, EstadosEvaluacion
)
from src.models.dictamenes import Dictamenes, TiposDictamen
from src.models.acuerdos import AcuerdosConsejo, TiposAcuerdo, AcuerdoConsejoPresupuesto
from src.models.votaciones_consejo import VotacionesConsejo, VotosConsejo
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion
from src.models.notificaciones import Notificaciones, TiposNotificacion, CanalesComunicacion
from src.models.logs import Logs, TiposEvento, Severidades, Objetos, Sources
from src.models.catalogos import (
    LineasInvestigacion, TiposHora, NivelesTrl, Modalidades,
    TiposInnovacion, ModulosSistema, TamaniosFuente, FiltrosDaltonismo,
    ConfiguracionesSistema, AsignacionesGestora, PreferenciasAccesibilidad,
    HistorialEstadosPropuesta
)

from src.models.recuperacion import TokenRecuperacion
from src.models.asignaciones_consejo import AsignacionesConsejo


__all__ = [
    "Usuario", "Escuela", "Campus",
    "RolesSistema", "UsuarioRol", "Permisos", "RolPermisos",
    "Convocatorias", "EtapasConvocatoria", "EstadosPropuesta",
    "Propuesta", "PropuestaContenido", "PropuestaDeclaraciones",
    "IntegrantesEquipoPropuesta", "ColaboradoresExternos", "RolesEquipo",
    "PropuestaDocumentos", "TiposDocumento",
    "ObjetivosEspecificos", "Actividades", "Riesgos", "MedidasMitigacion",
    "ParticipantesActividad", "TiposResponsabilidad",
    "PresupuestoPropuesta", "RubrosPropuesta", "FinanciamientoExterno",
    "TiposFinanciamiento", "EntidadesEmisoras",
    "AspectosEticos", "EntesRegulatorios", "EstadosAval",
    "Autores", "FuentesBibliograficas", "AutorFuente", "PropuestaReferencia",
    "ProductosAcademicos", "TiposProductosAcademicos",
    "Evaluaciones", "CriteriosEvaluacion", "DetalleEvaluacion",
    "TiposEvaluacion", "TiposRecomendacion", "EstadosEvaluacion",
    "Dictamenes", "TiposDictamen",
    "AcuerdosConsejo", "TiposAcuerdo", "AcuerdoConsejoPresupuesto",
    "VotacionesConsejo", "VotosConsejo",
    "Subsanaciones", "EstadosSubsanacion",
    "Notificaciones", "TiposNotificacion", "CanalesComunicacion",
    "Logs", "TiposEvento", "Severidades", "Objetos", "Sources",
    "LineasInvestigacion", "TiposHora", "NivelesTrl", "Modalidades",
    "TiposInnovacion", "ModulosSistema", "TamaniosFuente", "FiltrosDaltonismo",
    "ConfiguracionesSistema", "AsignacionesGestora", "PreferenciasAccesibilidad",
    "HistorialEstadosPropuesta",
    "TokenRecuperacion",
    "AsignacionesConsejo",
]