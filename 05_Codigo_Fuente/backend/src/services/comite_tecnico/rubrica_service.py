# src/services/comite_tecnico/rubrica_service.py
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime

from src.models.propuestas import Propuesta
from src.models.evaluaciones import Evaluaciones, DetalleEvaluacion, EstadosEvaluacion, TiposEvaluacion, CriteriosEvaluacion
from src.models.usuarios import Usuario
from src.models.catalogos import  Modalidades

class RubricaService:
    
    # Estructura completa de las 3 rúbricas según el Excel
    RUBRICAS = {
        'fortalecimiento': {
            'nombre': 'Actividades de Fortalecimiento',
            'secciones': [
                {
                    'id': 1,
                    'nombre': 'GRUPO INVESTIGADOR',
                    'peso': 20,
                    'criterios': [
                        {'id': 1, 'nombre': 'Composición disciplinaria del equipo', 'peso': 5, 'obligatorio': False},
                        {'id': 2, 'nombre': 'Experiencia académica del equipo sobre el tema', 'peso': 5, 'obligatorio': False},
                        {'id': 3, 'nombre': 'Articulación entre dependencias y vinculación externa', 'peso': 5, 'obligatorio': False},
                        {'id': 4, 'nombre': 'Participación estudiantil', 'peso': 5, 'obligatorio': True}
                    ]
                },
                {
                    'id': 2,
                    'nombre': 'FUNDAMENTACIÓN DE LA ACTIVIDAD',
                    'peso': 15,
                    'criterios': [
                        {'id': 5, 'nombre': 'Justificación del problema o necesidad', 'peso': 7, 'obligatorio': False},
                        {'id': 6, 'nombre': 'Coherencia de los objetivos con la actividad', 'peso': 8, 'obligatorio': False}
                    ]
                },
                {
                    'id': 3,
                    'nombre': 'PLAN DE ACCIÓN Y CRONOGRAMA',
                    'peso': 15,
                    'criterios': [
                        {'id': 7, 'nombre': 'Claridad, responsables y supervisión por actividad', 'peso': 6, 'obligatorio': True},
                        {'id': 8, 'nombre': 'Resultados esperados y trazabilidad', 'peso': 5, 'obligatorio': True},
                        {'id': 9, 'nombre': 'Planificación de giras, pasantías o eventos', 'peso': 4, 'obligatorio': True}
                    ]
                },
                {
                    'id': 4,
                    'nombre': 'PRESUPUESTO',
                    'peso': 8,
                    'criterios': [
                        {'id': 10, 'nombre': 'Coherencia y proporcionalidad presupuestaria', 'peso': 8, 'obligatorio': True}
                    ]
                },
                {
                    'id': 5,
                    'nombre': 'GESTIÓN DE RIESGOS',
                    'peso': 10,
                    'criterios': [
                        {'id': 11, 'nombre': 'Identificación y mitigación de riesgos por actividad', 'peso': 5, 'obligatorio': True},
                        {'id': 12, 'nombre': 'Viabilidad de las acciones de mitigación', 'peso': 5, 'obligatorio': True}
                    ]
                },
                {
                    'id': 6,
                    'nombre': 'ASPECTOS ÉTICOS',
                    'peso': 7,
                    'criterios': [
                        {'id': 13, 'nombre': 'Evaluación de necesidad de revisión ética/regulatoria y justificación de exenciones', 'peso': 7, 'obligatorio': True}
                    ]
                },
                {
                    'id': 7,
                    'nombre': 'PERTINENCIA E IMPACTO',
                    'peso': 25,
                    'criterios': [
                        {'id': 14, 'nombre': 'Pertinencia para la generación de nuevas propuestas o áreas de conocimiento', 'peso': 15, 'obligatorio': False},
                        {'id': 15, 'nombre': 'Alineación con prioridades institucionales y ODS', 'peso': 10, 'obligatorio': False}
                    ]
                }
            ]
        },
        'basica_aplicada': {
            'nombre': 'Investigación Básica y Aplicada',
            'secciones': [
                {
                    'id': 1,
                    'nombre': 'GRUPO INVESTIGADOR',
                    'peso': 20,
                    'criterios': [
                        {'id': 16, 'nombre': 'Composición disciplinaria del equipo', 'peso': 5, 'obligatorio': False},
                        {'id': 17, 'nombre': 'Experiencia académica del equipo sobre el tema', 'peso': 4, 'obligatorio': False},
                        {'id': 18, 'nombre': 'Articulación entre dependencias académicas', 'peso': 4, 'obligatorio': False},
                        {'id': 19, 'nombre': 'Vinculación externa', 'peso': 2, 'obligatorio': False},
                        {'id': 20, 'nombre': 'Trayectoria de la persona coordinadora', 'peso': 2, 'obligatorio': False},
                        {'id': 21, 'nombre': 'Participación estudiantil', 'peso': 3, 'obligatorio': True}
                    ]
                },
                {
                    'id': 2,
                    'nombre': 'FUNDAMENTACIÓN Y VACÍO DE CONOCIMIENTO',
                    'peso': 12,
                    'criterios': [
                        {'id': 22, 'nombre': 'Definición y justificación del problema de investigación', 'peso': 4, 'obligatorio': False},
                        {'id': 23, 'nombre': 'Coherencia entre problema y objetivos', 'peso': 4, 'obligatorio': False},
                        {'id': 24, 'nombre': 'Estado del arte / reconocimiento de vacíos de conocimiento', 'peso': 4, 'obligatorio': True}
                    ]
                },
                {
                    'id': 3,
                    'nombre': 'METODOLOGÍA',
                    'peso': 15,
                    'criterios': [
                        {'id': 25, 'nombre': 'Rigor metodológico (enfoque, alcance y diseño de investigación)', 'peso': 8, 'obligatorio': True},
                        {'id': 26, 'nombre': 'Definición de la población de estudio', 'peso': 7, 'obligatorio': True}
                    ]
                },
                {
                    'id': 4,
                    'nombre': 'PLAN DE ACCIÓN Y CRONOGRAMA',
                    'peso': 13,
                    'criterios': [
                        {'id': 27, 'nombre': 'Claridad y detalle de las actividades', 'peso': 4, 'obligatorio': True},
                        {'id': 28, 'nombre': 'Planificación de giras, trabajo de campo, pasantías y congresos', 'peso': 4, 'obligatorio': True},
                        {'id': 29, 'nombre': 'Trazabilidad de resultados y tiempos de seguimiento', 'peso': 5, 'obligatorio': True}
                    ]
                },
                {
                    'id': 5,
                    'nombre': 'PRESUPUESTO',
                    'peso': 10,
                    'criterios': [
                        {'id': 30, 'nombre': 'Proporcionalidad y coherencia presupuestaria', 'peso': 4, 'obligatorio': True},
                        {'id': 31, 'nombre': 'Inversión y equipamiento', 'peso': 4, 'obligatorio': True},
                        {'id': 32, 'nombre': 'Financiamiento externo, contrapartida o cofinanciamiento', 'peso': 2, 'obligatorio': False}
                    ]
                },
                {
                    'id': 6,
                    'nombre': 'GESTIÓN DE RIESGOS',
                    'peso': 8,
                    'criterios': [
                        {'id': 33, 'nombre': 'Identificación de riesgos por actividad', 'peso': 4, 'obligatorio': True},
                        {'id': 34, 'nombre': 'Viabilidad de las acciones de mitigación', 'peso': 4, 'obligatorio': True}
                    ]
                },
                {
                    'id': 7,
                    'nombre': 'ASPECTOS ÉTICOS',
                    'peso': 7,
                    'criterios': [
                        {'id': 35, 'nombre': 'Evaluación un ente ético o regulatorio y justificación de exenciones', 'peso': 7, 'obligatorio': True}
                    ]
                },
                {
                    'id': 8,
                    'nombre': 'PERTINENCIA E IMPACTO',
                    'peso': 15,
                    'criterios': [
                        {'id': 36, 'nombre': 'Contribución disciplinaria e impacto', 'peso': 8, 'obligatorio': False},
                        {'id': 37, 'nombre': 'Innovación del proyecto', 'peso': 7, 'obligatorio': False}
                    ]
                }
            ]
        },
        'desarrollo_tecnologico': {
            'nombre': 'Desarrollo Tecnológico',
            'secciones': [
                {
                    'id': 1,
                    'nombre': 'GRUPO INVESTIGADOR',
                    'peso': 15,
                    'criterios': [
                        {'id': 38, 'nombre': 'Composición disciplinaria del equipo', 'peso': 3, 'obligatorio': False},
                        {'id': 39, 'nombre': 'Experiencia en desarrollo tecnológico y productos de innovación', 'peso': 3, 'obligatorio': False},
                        {'id': 40, 'nombre': 'Articulación entre dependencias académicas', 'peso': 3, 'obligatorio': False},
                        {'id': 41, 'nombre': 'Vinculación externa', 'peso': 2, 'obligatorio': False},
                        {'id': 42, 'nombre': 'Trayectoria de la persona coordinadora', 'peso': 2, 'obligatorio': False},
                        {'id': 43, 'nombre': 'Participación estudiantil', 'peso': 2, 'obligatorio': True}
                    ]
                },
                {
                    'id': 2,
                    'nombre': 'FUNDAMENTACIÓN TECNOLÓGICA',
                    'peso': 12,
                    'criterios': [
                        {'id': 44, 'nombre': 'Definición y justificación del problema tecnológico', 'peso': 4, 'obligatorio': False},
                        {'id': 45, 'nombre': 'Coherencia entre problema y objetivos', 'peso': 4, 'obligatorio': False},
                        {'id': 46, 'nombre': 'Diagnóstico tecnológico y vacío de conocimiento o innovación', 'peso': 4, 'obligatorio': True}
                    ]
                },
                {
                    'id': 3,
                    'nombre': 'METODOLOGÍA DE DESARROLLO',
                    'peso': 15,
                    'criterios': [
                        {'id': 47, 'nombre': 'Rigor metodológico del desarrollo tecnológico (enfoque, alcance y diseño)', 'peso': 8, 'obligatorio': True},
                        {'id': 48, 'nombre': 'Definición de usuarios/beneficiarios y validación', 'peso': 7, 'obligatorio': True}
                    ]
                },
                {
                    'id': 4,
                    'nombre': 'PLAN DE ACCIÓN Y CRONOGRAMA',
                    'peso': 13,
                    'criterios': [
                        {'id': 49, 'nombre': 'Claridad y detalle de las actividades', 'peso': 4, 'obligatorio': True},
                        {'id': 50, 'nombre': 'Planificación de giras, trabajo de campo, pasantías y congresos', 'peso': 4, 'obligatorio': True},
                        {'id': 51, 'nombre': 'Trazabilidad de resultados y tiempos de seguimiento', 'peso': 5, 'obligatorio': True}
                    ]
                },
                {
                    'id': 5,
                    'nombre': 'PRESUPUESTO',
                    'peso': 10,
                    'criterios': [
                        {'id': 52, 'nombre': 'Coherencia y proporcionalidad presupuestaria', 'peso': 4, 'obligatorio': True},
                        {'id': 53, 'nombre': 'Inversión y equipamiento', 'peso': 4, 'obligatorio': True},
                        {'id': 54, 'nombre': 'Financiamiento externo, contrapartida o cofinanciamiento', 'peso': 2, 'obligatorio': False}
                    ]
                },
                {
                    'id': 6,
                    'nombre': 'GESTIÓN DE RIESGOS',
                    'peso': 8,
                    'criterios': [
                        {'id': 55, 'nombre': 'Identificación de riesgos por actividad', 'peso': 4, 'obligatorio': True},
                        {'id': 56, 'nombre': 'Viabilidad de las acciones de mitigación', 'peso': 4, 'obligatorio': True}
                    ]
                },
                {
                    'id': 7,
                    'nombre': 'ASPECTOS ÉTICOS Y DE PROPIEDAD INTELECTUAL',
                    'peso': 10,
                    'criterios': [
                        {'id': 57, 'nombre': 'Evaluación de necesidad de un ente ético o regulatorio y justificación de exenciones', 'peso': 4, 'obligatorio': True},
                        {'id': 58, 'nombre': 'Gestión de propiedad intelectual', 'peso': 6, 'obligatorio': True}
                    ]
                },
                {
                    'id': 8,
                    'nombre': 'PERTINENCIA, INNOVACIÓN E IMPACTO',
                    'peso': 17,
                    'criterios': [
                        {'id': 59, 'nombre': 'Contribución tecnológica e impacto', 'peso': 10, 'obligatorio': False},
                        {'id': 60, 'nombre': 'Nivel de innovación del desarrollo', 'peso': 7, 'obligatorio': False}
                    ]
                }
            ]
        }
    }
    
    @staticmethod
    def obtener_estructura_rubrica(tipo_modalidad: str) -> Dict:
        """
        Obtiene la estructura completa de la rúbrica según el tipo de modalidad
        """
        if tipo_modalidad not in RubricaService.RUBRICAS:
            raise ValueError(f"Tipo de modalidad no válido: {tipo_modalidad}")
        
        return RubricaService.RUBRICAS[tipo_modalidad]
    
    @staticmethod
    def obtener_rubrica_propuesta(db: Session, propuesta_id: int) -> Dict:
        """
        Obtiene la rúbrica correspondiente a una propuesta específica
        """
        propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == propuesta_id).first()
        if not propuesta:
            raise ValueError("Propuesta no encontrada")
        
        # Determinar tipo de rúbrica según modalidad
        modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.modalidadId).first()
        
        if not modalidad:
            tipo_rubrica = 'basica_aplicada'  # Default
        else:
            nombre_modalidad = modalidad.nombreModalidad.lower()
            if 'fortalecimiento' in nombre_modalidad:
                tipo_rubrica = 'fortalecimiento'
            elif 'desarrollo' in nombre_modalidad or 'tecnológico' in nombre_modalidad:
                tipo_rubrica = 'desarrollo_tecnologico'
            else:
                tipo_rubrica = 'basica_aplicada'
        
        estructura = RubricaService.obtener_estructura_rubrica(tipo_rubrica)
        
        return {
            'propuestaId': propuesta_id,
            'codigoPropuesta': propuesta.codigoPropuesta,
            'titulo': propuesta.titulo,
            'tipoRubrica': tipo_rubrica,
            'nombreRubrica': estructura['nombre'],
            'secciones': estructura['secciones']
        }
    
    @staticmethod
    def calcular_calificacion(db: Session, evaluacion_id: int) -> Dict:
        """
        Calcula la calificación final de una evaluación
        """
        evaluacion = db.query(Evaluaciones).filter(Evaluaciones.evaluacionId == evaluacion_id).first()
        if not evaluacion:
            raise ValueError("Evaluación no encontrada")
        
        detalles = db.query(DetalleEvaluacion).filter(
            DetalleEvaluacion.evaluacionId == evaluacion_id
        ).all()
        
        if not detalles:
            return {'calificacion': 0, 'recomienda': False, 'detalles': []}
        
        # Calcular subtotal por sección
        secciones_calculo = {}
        total_puntaje = 0
        total_peso = 0
        
        for detalle in detalles:
            criterio = db.query(CriteriosEvaluacion).filter(
                CriteriosEvaluacion.criterioId == detalle.criterioId
            ).first()
            
            if criterio:
                seccion_id = criterio.nombreSeccion
                if seccion_id not in secciones_calculo:
                    secciones_calculo[seccion_id] = {'puntaje': 0, 'peso': 0}
                
                secciones_calculo[seccion_id]['puntaje'] += detalle.puntajeObtenido * criterio.pesoPorcentaje / 10
                secciones_calculo[seccion_id]['peso'] += criterio.pesoPorcentaje
                
                total_puntaje += detalle.puntajeObtenido * criterio.pesoPorcentaje / 10
                total_peso += criterio.pesoPorcentaje
        
        calificacion_final = total_puntaje / 100 if total_peso > 0 else 0
        recomienda = calificacion_final >= 0.70
        
        return {
            'calificacion': round(calificacion_final, 2),
            'recomienda': recomienda,
            'secciones': secciones_calculo,
            'totalPuntaje': total_puntaje,
            'totalPeso': total_peso
        }