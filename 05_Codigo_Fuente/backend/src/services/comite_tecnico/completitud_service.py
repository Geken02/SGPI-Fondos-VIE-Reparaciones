# src/services/comite_tecnico/completitud_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Dict, Optional
from datetime import datetime

from src.models.propuestas import Propuesta
from src.models.catalogos import HistorialEstadosPropuesta
from src.models.propuesta_documentos import PropuestaDocumentos
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela
from src.models.convocatorias import Convocatorias, EtapasConvocatoria, EstadosPropuesta
from src.models.subsanaciones import Subsanaciones, EstadosSubsanacion
from src.models.evaluaciones import Evaluaciones, EstadosEvaluacion, TiposEvaluacion
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta


class CompletitudService:
    """Servicio para gestión de completitud de propuestas (Asistente Comité Técnico)"""

    @staticmethod
    def obtener_bandeja_completitud(
        db: Session,
        convocatoria_id: Optional[int] = None,
        escuela_id: Optional[int] = None
    ) -> Dict:
        """
        Obtiene la bandeja de completitud con estadísticas y lista de propuestas
        """
        # Estado "En Comité Técnico" (ajustar según tu tabla EstadosPropuesta)
        estado_comite = db.query(EstadosPropuesta.estadoPropuestaId).filter(
            EstadosPropuesta.codigoEstadoPropuesta == "EN_COMITE"
        ).first()

        if not estado_comite:
            return {"propuestas": [], "estadisticas": {"total": 0, "incompletas": 0, "completas": 0}}

        # Query base
        query = db.query(Propuesta).filter(
            Propuesta.estadoId == estado_comite.estadoPropuestaId,
            Propuesta.activo == True
        )

        if convocatoria_id:
            query = query.filter(Propuesta.convocatoriaId == convocatoria_id)
        if escuela_id:
            query = query.filter(Propuesta.escuelaId == escuela_id)

        propuestas = query.all()

        # Calcular estadísticas
        total = len(propuestas)
        completas = 0
        incompletas = 0
        propuestas_data = []

        for prop in propuestas:
            # Verificar completitud de documentos
            documentos = db.query(PropuestaDocumentos).filter(
                PropuestaDocumentos.propuestaId == prop.propuestaId,
                PropuestaDocumentos.activo == True
            ).all()

            # Documentos requeridos: Form-04, Form-05, Form-06, Dictamen Vinculación
            tipos_requeridos = [1, 2, 3, 5]  # Ajustar según tu tabla TiposDocumento
            documentos_presentes = {doc.tipoDocumentoId for doc in documentos}
            
            es_completa = all(tipo in documentos_presentes for tipo in tipos_requeridos)
            
            if es_completa:
                completas += 1
            else:
                incompletas += 1

            # Obtener investigador
            investigador = db.query(Usuario).filter(
                Usuario.usuarioId == prop.investigadorCoordId
            ).first()

            # Obtener escuela
            escuela = db.query(Escuela).filter(
                Escuela.escuelaId == prop.escuelaId
            ).first()

            propuestas_data.append({
                "propuestaId": prop.propuestaId,
                "codigoPropuesta": prop.codigoPropuesta,
                "titulo": prop.titulo,
                "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
                "escuela": escuela.nombreEscuela if escuela else "N/A",
                "fechaEnvio": prop.fechaEnvio.isoformat() if prop.fechaEnvio else None,
                "esCompleta": es_completa,
                "documentosFaltantes": [t for t in tipos_requeridos if t not in documentos_presentes],
                "estado": "Completa" if es_completa else "Incompleta"
            })

        return {
            "propuestas": propuestas_data,
            "estadisticas": {
                "total": total,
                "completas": completas,
                "incompletas": incompletas
            }
        }

    @staticmethod
    def solicitar_subsanacion(
        db: Session,
        propuesta_id: int,
        gestora_vie_id: int,
        comentario: str
    ) -> Dict:
        """
        Solicita subsanación de documentos faltantes
        """
        # Crear registro de subsanación
        subsanacion = Subsanaciones(
            propuestaId=propuesta_id,
            gestoraVIEId=gestora_vie_id,
            comentarioGestora=comentario,
            estadoSubsanacionId=1  # Pendiente
        )
        db.add(subsanacion)
        db.commit()
        db.refresh(subsanacion)

        # Cambiar estado de propuesta a "En Subsanación"
        estado_subsanacion = db.query(EstadosPropuesta).filter(
            EstadosPropuesta.codigoEstadoPropuesta == "SUBSANACION"
        ).first()

        if estado_subsanacion:
            # Registrar en historial
            propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
            estado_anterior = propuesta.estadoId
            
            propuesta.estadoId = estado_subsanacion.estadoPropuestaId
            db.commit()

            historial = HistorialEstadosPropuesta(
                propuestaId=propuesta_id,
                estadoAnteriorId=estado_anterior,
                estadoNuevoId=estado_subsanacion.estadoPropuestaId,
                usuarioResponsableId=gestora_vie_id,
                observaciones=f"Subsanación solicitada: {comentario}"
            )
            db.add(historial)
            db.commit()

        return {
            "message": "Subsanación solicitada exitosamente",
            "subsanacionId": subsanacion.subsanacionId
        }

    @staticmethod
    def asignar_evaluadores(
        db: Session,
        propuesta_id: int,
        evaluador_ids: List[int],
        asignado_por_id: int
    ) -> Dict:
        """
        Asigna evaluadores a una propuesta
        """
        # Verificar que la propuesta esté completa
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise ValueError("Propuesta no encontrada")

        # Crear evaluaciones para cada evaluador
        tipo_evaluacion = db.query(TiposEvaluacion).filter(
            TiposEvaluacion.nombreTipoEvaluacion == "ComiteTecnico"
        ).first()

        estado_borrador = db.query(EstadosEvaluacion).filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Borrador"
        ).first()

        evaluaciones_creadas = []
        for evaluador_id in evaluador_ids:
            evaluacion = Evaluaciones(
                propuestaId=propuesta_id,
                evaluadorId=evaluador_id,
                tipoEvaluacionId=tipo_evaluacion.tipoEvaluacionId if tipo_evaluacion else None,
                estadoEvaluacionId=estado_borrador.estadoEvaluacionId if estado_borrador else 1,
                usuarioAuditoriaId=asignado_por_id
            )
            db.add(evaluacion)
            evaluaciones_creadas.append(evaluacion)

        db.commit()

        return {
            "message": f"{len(evaluador_ids)} evaluadores asignados exitosamente",
            "evaluaciones": [e.evaluacionId for e in evaluaciones_creadas]
        }