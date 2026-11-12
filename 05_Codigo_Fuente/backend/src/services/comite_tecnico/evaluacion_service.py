# src/services/comite_tecnico/evaluacion_service.py
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timezone

from src.models.evaluaciones import Evaluaciones, DetalleEvaluacion, EstadosEvaluacion
from src.models.propuestas import Propuesta
from src.models.propuesta_contenido import PropuestaContenido
from src.models.convocatorias import EstadosPropuesta
from src.models.evaluaciones import CriteriosEvaluacion
from src.models.usuarios import Usuario
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta

# ⚠️ IMPORTANTE: Verifica en tu base de datos (Supabase) cuál es el ID real 
# para "Evaluación de Comité" o "Evaluación Preliminar". Ajusta este valor si es necesario.
DEFAULT_TIPO_EVALUACION_ID = 2  
DEFAULT_ESTADO_BORRADOR_ID = 1  # Asumimos que 1 es "En Progreso" o "Borrador"


class EvaluacionService:
    """Servicio para evaluación de propuestas (Profesor Evaluador)"""

    @staticmethod
    def iniciar_o_obtener_evaluacion(
        db: Session,
        propuesta_id: int,
        evaluador_id: int,
        tipo_evaluacion_id: int = DEFAULT_TIPO_EVALUACION_ID
    ) -> Evaluaciones:
        """
        Verifica si ya existe una evaluación para esta propuesta y evaluador.
        Si no existe, la crea con los campos obligatorios (incluyendo tipoEvaluacionId).
        """
        # 1. Buscar si ya existe
        evaluacion_existente = db.query(Evaluaciones).filter(
            Evaluaciones.propuestaId == propuesta_id,
            Evaluaciones.evaluadorId == evaluador_id,
            Evaluaciones.tipoEvaluacionId == tipo_evaluacion_id
        ).first()

        if evaluacion_existente:
            return evaluacion_existente

        # 2. Si no existe, crearla con TODOS los campos NOT NULL
        nueva_evaluacion = Evaluaciones(
            propuestaId=propuesta_id,
            evaluadorId=evaluador_id,
            tipoEvaluacionId=tipo_evaluacion_id,       # ✅ ESTO ARREGLA EL ERROR PRINCIPAL
            estadoEvaluacionId=DEFAULT_ESTADO_BORRADOR_ID, # ✅ ESTO EVITA EL SIGUIENTE ERROR
            fechaEvaluacion=datetime.now(timezone.utc),
            calificacion=0.0,                         # Valor inicial seguro
            usuarioAuditoriaId=evaluador_id,
            ultimaAuditoria=datetime.now(timezone.utc)
        )
        
        db.add(nueva_evaluacion)
        db.commit()
        db.refresh(nueva_evaluacion)
        
        return nueva_evaluacion

    @staticmethod
    def obtener_bandeja_evaluacion(
        db: Session,
        evaluador_id: int
    ) -> Dict:
        """
        Obtiene las propuestas asignadas a un evaluador
        """
        evaluaciones = db.query(Evaluaciones).filter(
            Evaluaciones.evaluadorId == evaluador_id
        ).all()

        propuestas_data = []
        for ev in evaluaciones:
            propuesta = db.query(Propuesta).filter(
                Propuesta.propuestaId == ev.propuestaId
            ).first()

            investigador = db.query(Usuario).filter(
                Usuario.usuarioId == propuesta.investigadorCoordId
            ).first() if propuesta else None

            estado_eval = db.query(EstadosEvaluacion).filter(
                EstadosEvaluacion.estadoEvaluacionId == ev.estadoEvaluacionId
            ).first()

            propuestas_data.append({
                "evaluacionId": ev.evaluacionId,
                "propuestaId": ev.propuestaId,
                "codigoPropuesta": propuesta.codigoPropuesta if propuesta else "N/A",
                "titulo": propuesta.titulo if propuesta else "N/A",
                "investigador": f"{investigador.nombreUsuario} {investigador.apellido1Usuario}" if investigador else "N/A",
                "fechaAsignacion": ev.fechaEvaluacion.isoformat() if ev.fechaEvaluacion else None,
                "estadoEvaluacion": estado_eval.nombreEstadoEvaluacion if estado_eval else "N/A",
                "calificacion": float(ev.calificacion) if ev.calificacion else 0.0
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

        contenido = db.query(PropuestaContenido).filter(
            PropuestaContenido.propuestaId == propuesta_id
        ).first()

        integrantes = db.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
            # IntegrantesEquipoPropuesta.activo == True # Descomentar si tu modelo tiene este campo
        ).all()

        integrantes_data = []
        for intg in integrantes:
            usuario = db.query(Usuario).filter(Usuario.usuarioId == intg.usuarioId).first()
            integrantes_data.append({
                "usuarioId": usuario.usuarioId if usuario else None,
                "nombre": f"{usuario.nombreUsuario} {usuario.apellido1Usuario}" if usuario else "N/A",
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
                "montoTotal": float(propuesta.montoTotal) if propuesta.montoTotal else 0.0,
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
                usuarioAuditoriaId=evaluador_id,
                ultimaAuditoria=datetime.now(timezone.utc)
            )
            db.add(det)

        # Calcular calificación provisional
        total_puntos = sum(float(d["puntaje"]) for d in detalles)
        total_criterios = len(detalles)
        calificacion = total_puntos / (total_criterios * 10) if total_criterios > 0 else 0.0

        evaluacion.calificacion = calificacion
        evaluacion.estadoEvaluacionId = DEFAULT_ESTADO_BORRADOR_ID  # Asegura que no sea null
        evaluacion.ultimaAuditoria = datetime.now(timezone.utc)
        evaluacion.usuarioAuditoriaId = evaluador_id
        
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
        evaluador_id: int,
        tipo_recomendacion_id: Optional[int] = None,
        observaciones: Optional[str] = None
    ) -> Dict:
        """
        Envía la evaluación final (bloquea cambios)
        """
        # 1. Primero guardar los detalles y calcular calificación
        resultado = EvaluacionService.guardar_evaluacion_borrador(
            db, evaluacion_id, detalles, evaluador_id
        )

        # 2. Buscar el estado "Enviada" o "Finalizada"
        estado_enviada = db.query(EstadosEvaluacion).filter(
            EstadosEvaluacion.nombreEstadoEvaluacion.ilike("%enviada%") # .ilike es más tolerante a mayúsculas
        ).first()

        evaluacion = db.query(Evaluaciones).filter(
            Evaluaciones.evaluacionId == evaluacion_id
        ).first()

        if not estado_enviada:
            raise ValueError("No se encontró el estado 'Enviada' en la base de datos. Configúralo primero.")

        evaluacion.estadoEvaluacionId = estado_enviada.estadoEvaluacionId
        evaluacion.fechaEvaluacion = datetime.now(timezone.utc)
        evaluacion.tipoRecomendacionId = tipo_recomendacion_id
        evaluacion.observaciones = observaciones
        evaluacion.ultimaAuditoria = datetime.now(timezone.utc)
        evaluacion.usuarioAuditoriaId = evaluador_id
        
        db.commit()

        return {
            "message": "Evaluación enviada exitosamente",
            "calificacionFinal": resultado["calificacionProvisional"]
        }