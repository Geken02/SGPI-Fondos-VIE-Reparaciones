# src/services/comite_tecnico/evaluacion_service.py
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime

from src.models.evaluaciones import Evaluaciones, DetalleEvaluacion, EstadosEvaluacion
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido
from src.models.convocatorias import EstadosPropuesta
from src.models.evaluaciones import CriteriosEvaluacion
from src.models.usuarios import Usuario
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta


class EvaluacionService:
    """Servicio para evaluación de propuestas (Profesor Evaluador)"""

    @staticmethod
    def obtener_bandeja_evaluacion(
        db: Session,
        evaluador_id: int
    ) -> Dict:
        """
        Obtiene las propuestas asignadas a un evaluador
        """
        evaluaciones = db.query(Evaluaciones).filter(
            Evaluaciones.evaluadorId == evaluador_id,
            Evaluaciones.activo == True
        ).all()

        propuestas_data = []
        for ev in evaluaciones:
            propuesta = db.query(Propuesta).filter(
                Propuesta.propuestaId == ev.propuestaId
            ).first()

            investigador = db.query(Usuario).filter(
                Usuario.usuarioId == propuesta.investigadorCoordId
            ).first()

            estado_eval = db.query(EstadosEvaluacion).filter(
                EstadosEvaluacion.estadoEvaluacionId == ev.estadoEvaluacionId
            ).first()

            propuestas_data.append({
                "evaluacionId": ev.evaluacionId,
                "propuestaId": propuesta.propuestaId,
                "codigoPropuesta": propuesta.codigoPropuesta,
                "titulo": propuesta.titulo,
                "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
                "fechaAsignacion": ev.fechaEvaluacion.isoformat(),
                "estadoEvaluacion": estado_eval.nombreEstadoEvaluacion if estado_eval else "N/A",
                "calificacion": ev.calificacion
            })

        return {
            "propuestas": propuestas_data,
            "total": len(propuestas_data)
        }

    @staticmethod
    def obtener_expediente_propuesta(
        db: Session,
        propuesta_id: int
    ) -> Dict:
        """
        Obtiene el expediente completo de una propuesta
        """
        propuesta = db.query(Propuesta).filter(
            Propuesta.propuestaId == propuesta_id
        ).first()

        if not propuesta:
            raise ValueError("Propuesta no encontrada")

        investigador = db.query(Usuario).filter(
            Usuario.usuarioId == propuesta.investigadorCoordId
        ).first()

        # Obtener contenido de la propuesta
        contenido = db.query(PropuestaContenido).filter(
            PropuestaContenido.propuestaId == propuesta_id
        ).first()

        # Obtener integrantes del equipo
        integrantes = db.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
            IntegrantesEquipoPropuesta.activo == True
        ).all()

        integrantes_data = []
        for intg in integrantes:
            usuario = db.query(Usuario).filter(Usuario.usuarioId == intg.usuarioId).first()
            integrantes_data.append({
                "usuarioId": usuario.usuarioId,
                "nombre": f"{usuario.nombreUsuario} {usuario.apellido1Usuario}",
                "rol": intg.rolEquipoId,
                "horasSemanales": intg.horasSemanales
            })

        return {
            "propuesta": {
                "propuestaId": propuesta.propuestaId,
                "codigoPropuesta": propuesta.codigoPropuesta,
                "titulo": propuesta.titulo,
                "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
                "escuelaId": propuesta.escuelaId,
                "modalidadId": propuesta.modalidadId,
                "montoTotal": float(propuesta.montoTotal),
                "contenido": {
                    "resumen": contenido.resumen if contenido else "",
                    "objetivoGeneral": contenido.objetivoGeneral if contenido else "",
                    "metodologia": contenido.metodologia if contenido else ""
                },
                "integrantes": integrantes_data
            }
        }

    @staticmethod
    def guardar_evaluacion_borrador(
        db: Session,
        evaluacion_id: int,
        detalles: List[Dict],
        evaluador_id: int
    ) -> Dict:
        """
        Guarda la evaluación como borrador
        """
        evaluacion = db.query(Evaluaciones).filter(
            Evaluaciones.evaluacionId == evaluacion_id,
            Evaluaciones.evaluadorId == evaluador_id
        ).first()

        if not evaluacion:
            raise ValueError("Evaluación no encontrada o no pertenece al evaluador")

        # Eliminar detalles anteriores si existen
        db.query(DetalleEvaluacion).filter(
            DetalleEvaluacion.evaluacionId == evaluacion_id
        ).delete()

        # Crear nuevos detalles
        for detalle in detalles:
            det = DetalleEvaluacion(
                evaluacionId=evaluacion_id,
                criterioId=detalle["criterioId"],
                puntajeObtenido=detalle["puntaje"],
                justificacion=detalle.get("justificacion", ""),
                esRequisitoObligatorioCumplido=detalle.get("esObligatorioCumplido", None),
                usuarioAuditoriaId=evaluador_id
            )
            db.add(det)

        # Calcular calificación provisional
        total_puntos = sum(d["puntaje"] for d in detalles)
        total_criterios = len(detalles)
        calificacion = total_puntos / (total_criterios * 10) if total_criterios > 0 else 0

        evaluacion.calificacion = calificacion
        evaluacion.estadoEvaluacionId = 1  # Borrador
        db.commit()

        return {
            "message": "Borrador guardado exitosamente",
            "calificacionProvisional": calificacion
        }

    @staticmethod
    def enviar_evaluacion_final(
        db: Session,
        evaluacion_id: int,
        detalles: List[Dict],
        evaluador_id: int
    ) -> Dict:
        """
        Envía la evaluación final (bloquea cambios)
        """
        # Primero guardar como borrador
        resultado = EvaluacionService.guardar_evaluacion_borrador(
            db, evaluacion_id, detalles, evaluador_id
        )

        # Cambiar estado a "Enviada"
        estado_enviada = db.query(EstadosEvaluacion).filter(
            EstadosEvaluacion.nombreEstadoEvaluacion == "Enviada"
        ).first()

        evaluacion = db.query(Evaluaciones).filter(
            Evaluaciones.evaluacionId == evaluacion_id
        ).first()

        evaluacion.estadoEvaluacionId = estado_enviada.estadoEvaluacionId if estado_enviada else 2
        evaluacion.fechaEvaluacion = datetime.now()
        db.commit()

        return {
            "message": "Evaluación enviada exitosamente",
            "calificacionFinal": resultado["calificacionProvisional"]
        }