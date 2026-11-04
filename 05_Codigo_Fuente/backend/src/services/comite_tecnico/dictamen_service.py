# src/services/comite_tecnico/dictamen_service.py
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime

from src.models.evaluaciones import Evaluaciones, EstadosEvaluacion
from src.models.propuestas import Propuesta
from src.models.dictamenes import Dictamenes
from src.models.usuarios import Usuario
from src.models.evaluaciones import TiposEvaluacion
from src.models.catalogos import HistorialEstadosPropuesta
from src.models.convocatorias import EstadosPropuesta


class DictamenService:
    """Servicio para consolidación y emisión de dictámenes (Coordinador Comité Técnico)"""

    @staticmethod
    def consolidar_evaluaciones(
        db: Session,
        propuesta_id: int
    ) -> Dict:
        """
        Consolida las evaluaciones de todos los evaluadores
        """
        evaluaciones = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.estadoEvaluacionId == 3  # Completada
        ).all()

        if len(evaluaciones) == 0:
            return {"calificacionFinal": 0, "evaluaciones": [], "recomendacion": "Sin evaluaciones"}

        # Calcular promedio ponderado
        total_calificaciones = sum(ev.calificacion for ev in evaluaciones if ev.calificacion)
        calificacion_final = total_calificaciones / len(evaluaciones)

        evaluaciones_data = []
        for ev in evaluaciones:
            evaluador = db.query(Usuario).filter(Usuario.usuarioId == ev.evaluadorId).first()
            evaluaciones_data.append({
                "evaluacionId": ev.evaluacionId,
                "evaluador": f"{evaluador.nombreUsuario} {evaluador.apellido1Usuario}" if evaluador else "N/A",
                "calificacion": float(ev.calificacion) if ev.calificacion else 0,
                "recomendacion": ev.tipoRecomendacionId
            })

        # Determinar recomendación
        recomendacion = "RECOMIENDA" if calificacion_final >= 0.70 else "NO RECOMIENDA"

        return {
            "propuestaId": propuesta_id,
            "calificacionFinal": round(calificacion_final, 2),
            "evaluaciones": evaluaciones_data,
            "totalEvaluadores": len(evaluaciones),
            "recomendacion": recomendacion,
            "umbralAprobacion": 0.70
        }

    @staticmethod
    def emitir_dictamen(
        db: Session,
        propuesta_id: int,
        coordinador_id: int,
        contenido_dictamen: str,
        recomienda: bool
    ) -> Dict:
        """
        Emite el dictamen final del Comité Técnico
        """
        # Crear dictamen
        dictamen = Dictamenes(
            propuestaId=propuesta_id,
            contenido=contenido_dictamen,
            usuarioRemitenteId=coordinador_id,
            fechaEmision=datetime.now()
        )
        db.add(dictamen)
        db.commit()
        db.refresh(dictamen)

        # Cambiar estado de propuesta
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        estado_anterior = propuesta.estadoId

        if recomienda:
            # Mover a "Aprobación Consejo Escuela"
            nuevo_estado = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.codigoEstadoPropuesta == "EN_CONSEJO"
            ).first()
        else:
            # Rechazar
            nuevo_estado = db.query(EstadosPropuesta).filter(
                EstadosPropuesta.codigoEstadoPropuesta == "RECHAZADA"
            ).first()

        if nuevo_estado:
            propuesta.estadoId = nuevo_estado.estadoPropuestaId
            db.commit()

            # Registrar en historial
            historial = HistorialEstadosPropuesta(
                propuestaId=propuesta_id,
                estadoAnteriorId=estado_anterior,
                estadoNuevoId=nuevo_estado.estadoPropuestaId,
                usuarioResponsableId=coordinador_id,
                observaciones=f"Dictamen emitido: {'Recomienda' if recomienda else 'No recomienda'}"
            )
            db.add(historial)
            db.commit()

        return {
            "message": "Dictamen emitido exitosamente",
            "dictamenId": dictamen.dictamenId,
            "nuevoEstado": nuevo_estado.nombreEstadoPropuesta if nuevo_estado else "N/A"
        }