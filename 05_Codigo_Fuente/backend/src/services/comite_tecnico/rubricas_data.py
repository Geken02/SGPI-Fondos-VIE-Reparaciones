# src/services/comite_tecnico/rubricas_data.py
"""
Estructura completa de las 3 Rúbricas de Evaluación VIE 2027
Basado en: 2-Rúbricas_Investigación_2027_Fondos_VIE.xlsx
"""

# ============================================================================
# ESCALA DE PUNTUACIÓN ESTÁNDAR
# ============================================================================
ESCALA_PUNTUACION = {
    "Deficiente": 0,
    "Regular": 6,
    "Bueno": 8,
    "Excelente": 10
}

# ============================================================================
# RÚBRICA 1: ACTIVIDADES DE FORTALECIMIENTO
# ============================================================================
RUBRICA_FORTALECIMIENTO = {
    "id": "fortalecimiento",
    "nombre": "Actividades de Fortalecimiento",
    "convocatoria": "Fondos VIE 2027",
    "institucion": "Instituto Tecnológico de Costa Rica",
    "escala_resultados": {
        "recomienda": 0.70,
        "no_recomienda": "menor a 0.70"
    },
    "secciones": [
        {
            "id": 1,
            "nombre": "GRUPO INVESTIGADOR",
            "peso_seccion": 20,
            "criterios": [
                {
                    "id": 1,
                    "nombre": "Composición disciplinaria del equipo",
                    "peso": 5,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Las disciplinas representadas no corresponden a las necesidades temáticas o metodológicas de la actividad propuesta.",
                        "Regular": "La propuesta integra algunas de las disciplinas necesarias, aunque la experiencia del equipo en el tema es limitada o parcialmente documentada.",
                        "Bueno": "La propuesta integra todas las disciplinas requeridas y el equipo acredita experiencia previa documentada en el tema.",
                        "Excelente": "La propuesta integra todas las disciplinas requeridas; el equipo acredita trayectoria amplia y documentada de alto nivel en el tema."
                    }
                },
                {
                    "id": 2,
                    "nombre": "Experiencia académica del equipo sobre el tema",
                    "peso": 5,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Al menos dos personas del equipo acreditan múltiples productos académicos indexados (Scopus, Web of Science, SciELO) sobre el tema, lo que evidencia una trayectoria consolidada en el área.",
                        "Regular": "Al menos una persona del equipo acredita productos académicos indexados (Scopus, Web of Science, SciELO) sobre el tema en bases de datos académicas reconocidas.",
                        "Bueno": "Al menos una persona del equipo cuenta con productos académicos relacionados con el tema.",
                        "Excelente": "El equipo no presenta productos académicos relacionados con el tema de la actividad."
                    }
                },
                {
                    "id": 3,
                    "nombre": "Articulación entre dependencias y vinculación externa",
                    "peso": 5,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta involucra a una sola persona de una única dependencia académica y no contempla vinculación con actores externos.",
                        "Regular": "La propuesta involucra a varias personas de una misma dependencia académica, o menciona la participación de actores externos sin que exista un compromiso formal documentado.",
                        "Bueno": "La propuesta integra personas de dos o más dependencias académicas del ITCR con roles definidos, e incorpora colaboradores externos nacionales sin que se adjunte compromiso formal.",
                        "Excelente": "La propuesta articula múltiples dependencias académicas del ITCR con roles claramente definidos, e incorpora colaboradores externos nacionales o internacionales respaldados por cartas de compromiso formales."
                    }
                },
                {
                    "id": 4,
                    "nombre": "Participación estudiantil",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Evidencia la propuesta la participación estudiantil mediante alguna de las modalidades autorizadas (estudiante asistente, tesis o TFG)?",
                    "niveles": {
                        "Deficiente": "La propuesta no contempla participación estudiantil en ninguna modalidad.",
                        "Regular": "La propuesta incorpora la participación de un estudiante de grado en calidad de asistente.",
                        "Bueno": "La propuesta incorpora la participación de dos o más estudiantes de grado en calidad de asistentes.",
                        "Excelente": "La propuesta incorpora estudiantes de grado en calidad de asistentes y vincula al menos un Trabajo Final de Graduación (TFG) al desarrollo de la actividad."
                    }
                }
            ]
        },
        {
            "id": 2,
            "nombre": "FUNDAMENTACIÓN DE LA ACTIVIDAD",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 5,
                    "nombre": "Justificación del problema o necesidad",
                    "peso": 7,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no delimita con claridad el problema o necesidad central que la motiva, carece de argumentación lógica o no se evidencia un beneficio/impacto para la institución o el entorno.",
                        "Regular": "El problema o necesidad se describe de manera general o superficial, pero la argumentación es débil, poco detallada o carece de datos cuantitativos/cualitativos que demuestren la magnitud de la situación planteada.",
                        "Bueno": "La necesidad se justifica de manera clara utilizando datos, diagnósticos previos o hechos institucionales pertinentes; no obstante, se requiere profundizar en la vinculación directa entre el problema identificado.",
                        "Excelente": "El problema o necesidad se argumenta de manera rigurosa, clara y estructurada, respaldado con datos específicos y vigentes; se identifican con total precisión y pertinencia los vacíos o demandas institucionales/sociales concretas que la actividad resolverá de forma efectiva."
                    }
                },
                {
                    "id": 6,
                    "nombre": "Coherencia de los objetivos con la actividad",
                    "peso": 8,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Los objetivos no guardan coherencia con la actividad de fortalecimiento planteada.",
                        "Regular": "Los objetivos son vagos o responden parcialmente a la necesidad identificada.",
                        "Bueno": "Los objetivos son coherentes con la necesidad identificada y se traducen en actividades concretas dentro del plan de acción.",
                        "Excelente": "Los objetivos son claros, coherentes con la necesidad, medibles y se traducen en actividades con productos verificables."
                    }
                }
            ]
        },
        {
            "id": 3,
            "nombre": "PLAN DE ACCIÓN Y CRONOGRAMA",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 7,
                    "nombre": "Claridad, responsables y supervisión por actividad",
                    "peso": 6,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se especifican explícitamente el responsable de ejecución, el personal de apoyo (si aplica) y la persona supervisora para cada una de las actividades del plan?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Las actividades no están definidas o carecen de responsables asignados.",
                        "Regular": "Se presentan actividades básicas, pero sin responsables claramente asignados ni niveles de supervisión establecidos.",
                        "Bueno": "Las actividades cuentan con responsables definidos; sin embargo, no en todas se identifica la persona encargada de supervisar su cumplimiento.",
                        "Excelente": "Cada actividad identifica la persona responsable de su ejecución, la persona de apoyo cuando corresponde y la persona supervisora del cumplimiento, con un cronograma realista."
                    }
                },
                {
                    "id": 8,
                    "nombre": "Resultados esperados y trazabilidad",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se definen los resultados esperados y los plazos estimados para cada actividad asegurando la trazabilidad de su seguimiento? Estos resultados son distintos de los productos académicos exigidos por la Convocatoria.",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "No se definen resultados esperados ni plazos para las actividades del plan de acción.",
                        "Regular": "Algunos resultados esperados están definidos, pero sin plazos asociados o sin cobertura de todas las actividades.",
                        "Bueno": "La mayoría de las actividades cuenta con resultados esperados y plazos definidos, aunque persisten algunos vacíos en la cobertura.",
                        "Excelente": "Todas las actividades cuentan con resultados esperados claramente definidos y plazos verificables, lo que garantiza la trazabilidad del seguimiento institucional."
                    }
                },
                {
                    "id": 9,
                    "nombre": "Planificación de giras, pasantías o eventos",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Están planificadas explícitamente en el plan de acción las giras, trabajos de campo, pasantías o congresos requeridos (o se constata que la propuesta no los requiere)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "En la propuesta se identifican giras, trabajo de campo, pasantías o participación en congresos, pero estas actividades no están planificadas.",
                        "Regular": "Las actividades de campo o movilidad identificadas en la propuesta se mencionan de manera genérica, sin cronograma ni presupuesto asociados.",
                        "Bueno": "Las actividades de campo o movilidad identificadas en la propuesta se planifican con un cronograma básico, aunque les faltan algunos elementos de detalle.",
                        "Excelente": "Todas las actividades de campo o movilidad identificadas en la propuesta están planificadas de forma explícita con cronograma, justificación, productos esperados y presupuesto asociado."
                    }
                }
            ]
        },
        {
            "id": 4,
            "nombre": "PRESUPUESTO",
            "peso_seccion": 8,
            "criterios": [
                {
                    "id": 10,
                    "nombre": "Coherencia y proporcionalidad presupuestaria",
                    "peso": 8,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Cumple el presupuesto formulado con los montos máximos establecidos en las disposiciones de la convocatoria VIE 2027?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Los recursos solicitados no están cuantificados, carecen de justificación o superan los montos máximos establecidos en la Convocatoria.",
                        "Regular": "Los recursos están cuantificados, pero presentan inconsistencias respecto a los montos permitidos.",
                        "Bueno": "Los recursos están cuantificados y justificados dentro de los montos permitidos, con proporcionalidad parcial respecto al plan de acción.",
                        "Excelente": "Los recursos están debidamente cuantificados y justificados, con plena proporcionalidad respecto al plan de acción y dentro de los montos máximos establecidos en la Convocatoria."
                    }
                }
            ]
        },
        {
            "id": 5,
            "nombre": "GESTIÓN DE RIESGOS",
            "peso_seccion": 10,
            "criterios": [
                {
                    "id": 11,
                    "nombre": "Identificación y mitigación de riesgos por actividad",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Asocia el plan de riesgos al menos un riesgo con su respectiva acción de mitigación por cada actividad planificada?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no identifica riesgos por cada actividad del plan de acción.",
                        "Regular": "Se identifica riesgos por cada actividad del plan de acción, con acciones de mitigación de carácter básico.",
                        "Bueno": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables.",
                        "Excelente": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables y responsables de supervisión."
                    }
                },
                {
                    "id": 12,
                    "nombre": "Viabilidad de las acciones de mitigación",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Son las acciones de mitigación propuestas coherentes, viables y suficientes para salvaguardar el éxito de la actividad?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Las acciones de mitigación son genéricas o están ausentes; existen riesgos críticos sin atención.",
                        "Regular": "Algunas acciones de mitigación son coherentes, pero hay riesgos relevantes sin solución viable.",
                        "Bueno": "Las acciones de mitigación son coherentes y generalmente viables.",
                        "Excelente": "Las acciones de mitigación son específicas, viables y están respaldadas por evidencias concretas de su factibilidad."
                    }
                }
            ]
        },
        {
            "id": 6,
            "nombre": "ASPECTOS ÉTICOS",
            "peso_seccion": 7,
            "criterios": [
                {
                    "id": 13,
                    "nombre": "Evaluación de necesidad de revisión ética/regulatoria y justificación de exenciones",
                    "peso": 7,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Declara y justifica la propuesta, de forma obligatoria, si requiere o no la autorización de un ente ético o regulatorio?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no aborda los aspectos éticos pertinentes ni incluye justificación escrita al respecto.",
                        "Regular": "Se menciona la evaluación ética, pero sin justificación escrita que la respalde.",
                        "Bueno": "La propuesta incluye una evaluación de los aspectos éticos con justificación escrita, aunque de forma incompleta.",
                        "Excelente": "La propuesta incluye una evaluación completa de los aspectos éticos con justificación escrita detallada. Si requiere autorización de un ente de revisión ética o regulatorio, el proceso de obtención está documentado; si no lo requiere, la exención está fundamentada."
                    }
                }
            ]
        },
        {
            "id": 7,
            "nombre": "PERTINENCIA E IMPACTO",
            "peso_seccion": 25,
            "criterios": [
                {
                    "id": 14,
                    "nombre": "Pertinencia para la generación de nuevas propuestas o áreas de conocimiento",
                    "peso": 15,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no evidencia un potencial claro para generar nuevas iniciativas de investigación ni para identificar áreas de conocimiento.",
                        "Regular": "La propuesta presenta un potencial limitado para derivar en nuevas propuestas de investigación, o no articula con suficiente claridad cómo se lograría esa derivación.",
                        "Bueno": "La propuesta tiene un potencial real para identificar necesidades de investigación o abrir nuevas áreas de conocimiento.",
                        "Excelente": "La propuesta presenta un potencial sólido y articulado para generar propuestas de investigación concretas o abrir nuevas líneas de conocimiento con impacto institucional demostrable."
                    }
                },
                {
                    "id": 15,
                    "nombre": "Alineación con prioridades institucionales y ODS",
                    "peso": 10,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no se vincula con las líneas de investigación institucionales ni con los Objetivos de Desarrollo Sostenible (ODS).",
                        "Regular": "La propuesta se vincula de manera vaga con alguna línea o eje institucional, sin desarrollar esa relación.",
                        "Bueno": "La propuesta se vincula con líneas institucionales y ODS, con justificación parcial de esa articulación.",
                        "Excelente": "La propuesta se vincula de manera clara y bien justificada con las líneas de investigación institucionales, los ejes estratégicos del ITCR y los ODS pertinentes."
                    }
                }
            ]
        }
    ],
    "seccion_productos": {
        "id": 8,
        "nombre": "PRODUCTOS ACADÉMICOS",
        "es_sumativa": False,
        "advertencia": "Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Si el equipo NO cumple, el Comité Técnico NO DEBE RECOMENDAR la propuesta independientemente de la calificación final obtenida.",
        "regla_productos": {
            "1_a_10_horas": 1,
            "11_a_20_horas": 2,
            "21_a_30_horas": 3,
            "formula_excedente": "un producto adicional por cada 10 horas semanales excedentes, redondeado hacia arriba"
        },
        "tipos_productos": [
            {"id": 1, "nombre": "Diagnóstico de situación"},
            {"id": 2, "nombre": "Estudio de mercado"},
            {"id": 3, "nombre": "Estudio de factibilidad"},
            {"id": 4, "nombre": "Ensayo de laboratorio"},
            {"id": 5, "nombre": "Propuesta de creación de una línea de investigación"},
            {"id": 6, "nombre": "Propuesta de proyecto de investigación básica, aplicada o proyecto de desarrollo tecnológico"},
            {"id": 7, "nombre": "Artículo científico sometido en revista o conferencia indexada (WoS, Scopus, Redalyc, SciELO, ESCI o DOAJ)"}
        ]
    }
}

# ============================================================================
# RÚBRICA 2: INVESTIGACIÓN BÁSICA Y APLICADA
# ============================================================================
RUBRICA_BASICA_APLICADA = {
    "id": "basica_aplicada",
    "nombre": "Investigación Básica y Aplicada",
    "convocatoria": "Fondos VIE 2027",
    "institucion": "Instituto Tecnológico de Costa Rica",
    "escala_resultados": {
        "recomienda": 0.70,
        "no_recomienda": "menor a 0.70"
    },
    "secciones": [
        {
            "id": 1,
            "nombre": "GRUPO INVESTIGADOR",
            "peso_seccion": 20,
            "criterios": [
                {
                    "id": 16,
                    "nombre": "Composición disciplinaria del equipo",
                    "peso": 5,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Las disciplinas representadas no corresponden a las necesidades del proyecto, o el equipo carece de experiencia comprobable en investigación sobre el tema.",
                        "Regular": "La propuesta integra algunas de las disciplinas necesarias, con experiencia limitada (dos años o menos) o documentación parcial en investigación sobre el tema.",
                        "Bueno": "La propuesta integra todas las disciplinas requeridas y el equipo posee experiencia (entre dos años y menos de cinco) previa documentada en investigación sobre el tema.",
                        "Excelente": "La propuesta integra todas las disciplinas necesarias; el equipo posee experiencia extensa (más de cinco años) y documentada en investigación sobre el tema."
                    }
                },
                {
                    "id": 17,
                    "nombre": "Experiencia académica del equipo sobre el tema",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "El equipo no presenta productos académicos relacionados con el tema de investigación.",
                        "Regular": "Al menos una persona del equipo cuenta con productos académicos sobre el tema en bases de datos académicas regionales (SciELO, Redalyc).",
                        "Bueno": "Al menos una persona del equipo cuentan con productos académicos indexados en Web of Science, Scopus o SciELO, lo que evidencia trayectoria en el área.",
                        "Excelente": "Al menos dos personas del equipo cuentan con productos académicos indexados en Web of Science o Scopus, lo que evidencia liderazgo en el tema."
                    }
                },
                {
                    "id": 18,
                    "nombre": "Articulación entre dependencias académicas",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta es desarrollada exclusivamente por una persona de una única dependencia académica.",
                        "Regular": "La propuesta es desarrollada por varias personas de una misma dependencia académica.",
                        "Bueno": "La propuesta integra personas investigadoras de al menos dos dependencias académicas del ITCR con roles definidos en el plan de acción.",
                        "Excelente": "La propuesta articula personas investigadoras de múltiples dependencias del ITCR con articulación interdisciplinaria clara y roles definidos en el plan de acción."
                    }
                },
                {
                    "id": 19,
                    "nombre": "Vinculación externa",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no contempla vinculación con actores externos.",
                        "Regular": "La propuesta menciona la participación de actores externos, pero sin roles definidos ni compromiso formal documentado.",
                        "Bueno": "La propuesta incorpora colaboradores externos nacionales con participación definida y evidencia de compromiso formal.",
                        "Excelente": "La propuesta incorpora colaboradores externos nacionales o internacionales con participación activa en el plan de acción, respaldada por cartas de compromiso formales."
                    }
                },
                {
                    "id": 20,
                    "nombre": "Trayectoria de la persona coordinadora",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La persona coordinadora cuenta menos de dos años de experiencia demostrable en proyectos de investigación inscritos en el ITCR.",
                        "Regular": "La persona coordinadora cuenta entre dos y cinco años de experiencia en investigación, con grado de maestría o superior y al menos un proyecto coordinado.",
                        "Bueno": "La persona coordinadora cuenta con más de cinco años de experiencia, con grado de maestría o doctorado y coordinación de al menos dos proyectos de investigación.",
                        "Excelente": "La persona coordinadora cuenta con más de diez años de experiencia, con doctorado, coordinación de tres o más proyectos y productos académicos de alto impacto como persona coordinadora."
                    }
                },
                {
                    "id": 21,
                    "nombre": "Participación estudiantil",
                    "peso": 3,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Evidencia la propuesta la participación estudiantil mediante alguna de las modalidades autorizadas (estudiante asistente, tesis o TFG)?",
                    "niveles": {
                        "Deficiente": "La propuesta no contempla participación estudiantil en ninguna modalidad.",
                        "Regular": "La propuesta incorpora la participación de un estudiante de grado en calidad de asistente.",
                        "Bueno": "La propuesta incorpora la participación de dos o más estudiantes de grado en calidad de asistentes.",
                        "Excelente": "La propuesta incorpora estudiantes de grado en calidad de asistentes y vincula al menos un Trabajo Final de Graduación (TFG) al desarrollo del proyecto."
                    }
                }
            ]
        },
        {
            "id": 2,
            "nombre": "FUNDAMENTACIÓN Y VACÍO DE CONOCIMIENTO",
            "peso_seccion": 12,
            "criterios": [
                {
                    "id": 22,
                    "nombre": "Definición y justificación del problema de investigación",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "El problema de investigación no está definido con claridad, carece de justificación y no se formulan preguntas de investigación ni se identifican beneficios esperados.",
                        "Regular": "El problema está definido y justificado de manera básica, pero faltan las preguntas de investigación o los beneficios esperados no se especifican con claridad.",
                        "Bueno": "El problema está bien definido y justificado con referencias; incluye preguntas de investigación, aunque los beneficios esperados no están articulados de forma completa.",
                        "Excelente": "El problema está definido con rigor y justificado mediante literatura actualizada; incluye preguntas específicas y explica con claridad los beneficios para la disciplina y la sociedad."
                    }
                },
                {
                    "id": 23,
                    "nombre": "Coherencia entre problema y objetivos",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Los objetivos no responden al problema planteado ni abordan las preguntas fundamentales de la investigación: ¿qué?, ¿cómo? y ¿para qué?",
                        "Regular": "Los objetivos responden parcialmente al problema, pero no abordan de manera completa las preguntas fundamentales de la investigación: ¿qué se investigará?, ¿cómo se investigará? y ¿para qué se realizará?",
                        "Bueno": "Los objetivos son coherentes con el problema y responden a las preguntas clave de la investigación, aunque su traducción en actividades específicas no resulta del todo clara.",
                        "Excelente": "Los objetivos son totalmente coherentes con el problema y responden de manera precisa a las preguntas clave de la investigación; cada objetivo se traduce explícitamente en actividades medibles y verificables."
                    }
                },
                {
                    "id": 24,
                    "nombre": "Estado del arte / reconocimiento de vacíos de conocimiento",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Evidencia la propuesta una revisión previa de literatura y artículos científicos que sustente el vacío de conocimiento (constatando que NO se plantea como una actividad futura en el cronograma)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no establece el estado del arte ni identifica vacíos de investigación; la revisión de literatura se plantea como una actividad futura o está ausente.",
                        "Regular": "La propuesta describe el estado del arte de manera parcial e identifica vagamente algunos vacíos, con referencias desactualizadas (más de diez años).",
                        "Bueno": "La propuesta establece adecuadamente el estado del arte e identifica vacíos de conocimiento, con referencias mayormente recientes (últimos diez años); la revisión de literatura es previa y sustenta el vacío identificado.",
                        "Excelente": "La propuesta establece con rigor el estado del arte e identifica con claridad los vacíos de conocimiento; al menos el 80 % de las referencias corresponden a los últimos diez años; la revisión es previa, sólida y fundamenta directamente la propuesta."
                    }
                }
            ]
        },
        {
            "id": 3,
            "nombre": "METODOLOGÍA",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 25,
                    "nombre": "Rigor metodológico (enfoque, alcance y diseño de investigación)",
                    "peso": 8,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Detalla la propuesta de forma explícita el enfoque, el alcance y el diseño metodológico de la investigación?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no define enfoque, alcance ni diseño de investigación; la metodología es inexistente o genérica, y las variables o categorías de análisis no están identificadas.",
                        "Regular": "La propuesta menciona el enfoque o el diseño de investigación de manera incompleta; falta el alcance u otros elementos metodológicos esenciales.",
                        "Bueno": "La propuesta define el enfoque, el alcance y el diseño de investigación, e identifica variables o categorías; sin embargo, la justificación de las elecciones metodológicas es incompleta.",
                        "Excelente": "La propuesta presenta una metodología rigurosa con enfoque, alcance y diseño claramente justificados; las variables o categorías están identificadas con una estrategia de medición o análisis explícita y fundamentada."
                    }
                },
                {
                    "id": 26,
                    "nombre": "Definición de la población de estudio",
                    "peso": 7,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Define la propuesta con claridad la población de estudio, los criterios de inclusión/exclusión y el procedimiento o tamaño muestral?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no define la población de estudio; están ausentes los criterios de inclusión y exclusión, así como el tamaño muestral.",
                        "Regular": "La propuesta menciona la población de estudio de forma genérica, sin criterios de inclusión y exclusión ni justificación del tamaño muestral.",
                        "Bueno": "La propuesta define la población con sus características y criterios de inclusión y exclusión; no obstante, el tamaño muestral o el procedimiento de muestreo no están suficientemente justificados.",
                        "Excelente": "La propuesta define completamente la población de estudio, incluyendo características, criterios de inclusión y exclusión, tamaño muestral con justificación estadística o metodológica, y procedimiento de muestreo explícito."
                    }
                }
            ]
        },
        {
            "id": 4,
            "nombre": "PLAN DE ACCIÓN Y CRONOGRAMA",
            "peso_seccion": 13,
            "criterios": [
                {
                    "id": 27,
                    "nombre": "Claridad y detalle de las actividades",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se especifican explícitamente el responsable de ejecución, el personal de apoyo (si aplica) y la persona supervisora para cada una de las actividades del plan?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "El plan de acción es indefinido; no especifica actividades, responsables ni productos esperados.",
                        "Regular": "El plan presenta actividades y cronograma básicos, pero los responsables y supervisores no están claramente asignados por actividad.",
                        "Bueno": "El plan incluye actividades, cronograma y responsables; sin embargo, no se indica la persona supervisora del cumplimiento en todas las actividades, o falta el detalle de las personas de apoyo.",
                        "Excelente": "El plan es detallado: cada actividad identifica la persona responsable de su ejecución, la persona de apoyo cuando corresponde y la persona supervisora del cumplimiento, con cronograma realista y productos claramente vinculados a objetivos."
                    }
                },
                {
                    "id": 28,
                    "nombre": "Planificación de giras, trabajo de campo, pasantías y congresos",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Están planificadas explícitamente en el plan de acción las giras, trabajos de campo, pasantías o congresos requeridos (o se constata que la propuesta no los requiere)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "En la propuesta se identifican giras, trabajo de campo, pasantías o participación en congresos, pero estas actividades no están planificadas.",
                        "Regular": "Las actividades de campo o movilidad identificadas en la propuesta se mencionan de manera genérica, sin cronograma ni presupuesto asociados.",
                        "Bueno": "Las actividades de campo o movilidad identificadas en la propuesta se planifican con un cronograma básico, aunque les faltan algunos elementos de detalle.",
                        "Excelente": "Todas las actividades de campo o movilidad identificadas en la propuesta están planificadas de forma explícita con cronograma, justificación, productos esperados y presupuesto asociado."
                    }
                },
                {
                    "id": 29,
                    "nombre": "Trazabilidad de resultados y tiempos de seguimiento",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se definen los resultados esperados y los plazos estimados para cada actividad asegurando la trazabilidad de su seguimiento? Estos resultados son distintos de los productos académicos exigidos por la Convocatoria.",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "No se definen resultados esperados ni plazos para las actividades del plan de acción.",
                        "Regular": "Algunos resultados esperados están definidos, pero sin plazos asociados o sin cobertura de todas las actividades.",
                        "Bueno": "La mayoría de las actividades cuenta con resultados esperados y plazos definidos, aunque persisten algunos vacíos en la cobertura.",
                        "Excelente": "Todas las actividades cuentan con resultados esperados claramente definidos y plazos definidos, lo que garantiza la trazabilidad del seguimiento institucional."
                    }
                }
            ]
        },
        {
            "id": 5,
            "nombre": "PRESUPUESTO",
            "peso_seccion": 10,
            "criterios": [
                {
                    "id": 30,
                    "nombre": "Proporcionalidad y coherencia presupuestaria",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Cumple el presupuesto formulado con los montos máximos establecidos en las disposiciones de la convocatoria VIE 2027?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Los recursos solicitados no están cuantificados, carecen de justificación o superan los montos máximos establecidos en la Convocatoria.",
                        "Regular": "Los recursos están cuantificados, pero la justificación no evidencia proporcionalidad con el plan de acción, o presenta inconsistencias menores respecto a los montos permitidos.",
                        "Bueno": "Los recursos están cuantificados y justificados con proporcionalidad parcial respecto al plan de acción; se respetan los montos máximos.",
                        "Excelente": "Los recursos están debidamente cuantificados y justificados, con plena proporcionalidad respecto al plan de acción y dentro de los montos máximos establecidos en la Convocatoria."
                    }
                },
                {
                    "id": 31,
                    "nombre": "Inversión y equipamiento",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se concentran las solicitudes de equipamiento e inversión en el primer año de ejecución de la propuesta (o se justifica una excepción válida)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta requiere equipamiento, pero no lo incluye en el presupuesto o lo programa para años posteriores sin justificación.",
                        "Regular": "El equipamiento se incluye en el presupuesto, pero con justificación insuficiente o sin vincularlo claramente al plan de acción del primer año.",
                        "Bueno": "El equipamiento está formulado para el primer año con justificación adecuada, aunque existen inconsistencias menores respecto al plan de acción.",
                        "Excelente": "El equipamiento o la inversión están completamente formulados para el primer año, con justificación clara, coherencia con el plan de acción y dentro de los montos permitidos."
                    }
                },
                {
                    "id": 32,
                    "nombre": "Financiamiento externo, contrapartida o cofinanciamiento",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no cuenta con financiamiento externo, cofinanciamiento ni contrapartida aprobados.",
                        "Regular": "El financiamiento externo o cofinanciamiento es inferior en más de un 15 % al monto solicitado a la VIE, o la propuesta cuenta únicamente con contrapartida en especie.",
                        "Bueno": "El financiamiento externo o cofinanciamiento es equivalente (±15 %) al monto solicitado a la VIE, o no se acredita mediante cartas de compromiso formales.",
                        "Excelente": "El financiamiento externo o cofinanciamiento supera en más de un 15 % el monto solicitado a la VIE, y se acredita mediante cartas de compromiso formales."
                    }
                }
            ]
        },
        {
            "id": 6,
            "nombre": "GESTIÓN DE RIESGOS",
            "peso_seccion": 8,
            "criterios": [
                {
                    "id": 33,
                    "nombre": "Identificación de riesgos por actividad",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Asocia el plan de riesgos al menos un riesgo con su respectiva acción de mitigación por cada actividad planificada?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no identifica riesgos por cada actividad del plan de acción.",
                        "Regular": "Se identifica riesgos por cada actividad del plan de acción, con acciones de mitigación de carácter básico.",
                        "Bueno": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables.",
                        "Excelente": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables y responsables de supervisión."
                    }
                },
                {
                    "id": 34,
                    "nombre": "Viabilidad de las acciones de mitigación",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Son las acciones de mitigación propuestas coherentes, viables y suficientes para salvaguardar el éxito de la actividad?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Las acciones de mitigación son genéricas, incoherentes o están ausentes; existen riesgos críticos sin atención.",
                        "Regular": "Algunas acciones de mitigación son coherentes, pero hay riesgos importantes sin solución viable.",
                        "Bueno": "Las acciones de mitigación son coherentes y generalmente viables, con evidencia parcial de su factibilidad.",
                        "Excelente": "Todas las acciones de mitigación son específicas, viables, coherentes con el proyecto y están respaldadas por evidencias concretas de factibilidad."
                    }
                }
            ]
        },
        {
            "id": 7,
            "nombre": "ASPECTOS ÉTICOS",
            "peso_seccion": 7,
            "criterios": [
                {
                    "id": 35,
                    "nombre": "Evaluación un ente ético o regulatorio y justificación de exenciones",
                    "peso": 7,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Declara y justifica la propuesta, de forma obligatoria, si requiere o no la autorización de un ente ético o regulatorio?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no aborda los aspectos éticos pertinentes; no se incluye evaluación alguna sobre la necesidad de autorización de un un ente ético o regulatorio.",
                        "Regular": "La propuesta menciona la evaluación ética, pero no incluye una justificación escrita que la respalde.",
                        "Bueno": "La propuesta incluye una evaluación de los aspectos éticos con justificación escrita, aunque de forma incompleta o con escasa especificidad.",
                        "Excelente": "La propuesta incluye una evaluación completa de los aspectos éticos con justificación escrita detallada. Si requiere autorización de un un ente ético o regulatorio, el proceso está documentado; si no lo requiere, la exención está explícitamente fundamentada."
                    }
                }
            ]
        },
        {
            "id": 8,
            "nombre": "PERTINENCIA E IMPACTO",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 36,
                    "nombre": "Contribución disciplinaria e impacto",
                    "peso": 8,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no evidencia una contribución al estado del arte ni al mejoramiento de la calidad de vida.",
                        "Regular": "La propuesta evidencia una contribución al estado del arte o al mejoramiento de la calidad de vida.",
                        "Bueno": "El problema abordado es de interés nacional y la propuesta contribuye al estado del arte, a la calidad de vida o a la competitividad del país.",
                        "Excelente": "El problema es de interés nacional e internacional; la propuesta contribuye al estado del arte, a la calidad de vida y a la competitividad del país."
                    }
                },
                {
                    "id": 37,
                    "nombre": "Innovación del proyecto",
                    "peso": 7,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta replica investigaciones existentes sin presentar componentes innovadores.",
                        "Regular": "La propuesta identifica un aspecto innovador, pero no articula cómo se logrará ni describe sus etapas.",
                        "Bueno": "La propuesta identifica aspectos innovadores con detalle de implementación, aunque la novedad es relativa.",
                        "Excelente": "La propuesta presenta una innovación clara y justificada, con todas las etapas detalladas y potencial para fortalecer las líneas de investigación de la dependencia académica coordinadora."
                    }
                }
            ]
        }
    ],
    "seccion_productos": {
        "id": 9,
        "nombre": "PRODUCTOS ACADÉMICOS",
        "es_sumativa": False,
        "advertencia": "Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Si el equipo NO cumple, el Comité Técnico DEBE no recomendar la propuesta independientemente de la calificación final obtenida.",
        "regla_productos": {
            "1_a_10_horas": 1,
            "11_a_20_horas": 2,
            "21_a_30_horas": 3,
            "formula_excedente": "un producto adicional por cada 10 horas semanales excedentes, redondeado hacia arriba"
        },
        "tipos_productos": [
            {"id": 1, "nombre": "Un artículo científico sometido en revista o memoria indexada en Web of Science (WoS) o Scopus"},
            {"id": 2, "nombre": "Dos artículos científicos en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias con Consejo Editorial permanente"},
            {"id": 3, "nombre": "Un libro o capítulo de libro técnico especializado, sometido ante Comité Editorial permanente, vinculado al tema de investigación"}
        ]
    }
}

# ============================================================================
# RÚBRICA 3: DESARROLLO TECNOLÓGICO
# ============================================================================
RUBRICA_DESARROLLO_TECNOLOGICO = {
    "id": "desarrollo_tecnologico",
    "nombre": "Desarrollo Tecnológico",
    "convocatoria": "Fondos VIE 2027",
    "institucion": "Instituto Tecnológico de Costa Rica",
    "escala_resultados": {
        "recomienda": 0.70,
        "no_recomienda": "menor a 0.70"
    },
    "secciones": [
        {
            "id": 1,
            "nombre": "GRUPO INVESTIGADOR",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 38,
                    "nombre": "Composición disciplinaria del equipo",
                    "peso": 3,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Las disciplinas representadas no corresponden a las necesidades del proyecto, o el equipo carece de experiencia comprobable en investigación sobre el tema.",
                        "Regular": "La propuesta integra algunas de las disciplinas necesarias, con experiencia limitada (dos años o menos) o documentación parcial en investigación sobre el tema.",
                        "Bueno": "La propuesta integra todas las disciplinas requeridas y el equipo posee experiencia (entre dos años y menos de cinco) previa documentada en investigación sobre el tema.",
                        "Excelente": "La propuesta integra todas las disciplinas necesarias; el equipo posee experiencia extensa (más de cinco años) y documentada en investigación sobre el tema."
                    }
                },
                {
                    "id": 39,
                    "nombre": "Experiencia en desarrollo tecnológico y productos de innovación",
                    "peso": 3,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "El equipo no presenta productos académicos relacionados con el tema de investigación.",
                        "Regular": "Al menos una persona del equipo cuenta con productos académicos sobre el tema en bases de datos académicas regionales (SciELO, Redalyc).",
                        "Bueno": "Al menos una persona del equipo cuentan con productos académicos indexados en Web of Science, Scopus o SciELO, lo que evidencia trayectoria en el área.",
                        "Excelente": "Al menos dos personas del equipo cuentan con productos académicos indexados en Web of Science o Scopus, lo que evidencia liderazgo en el tema."
                    }
                },
                {
                    "id": 40,
                    "nombre": "Articulación entre dependencias académicas",
                    "peso": 3,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta es desarrollada exclusivamente por una persona de una única instancia académica.",
                        "Regular": "La propuesta es desarrollada por varias personas de una misma instancia académica.",
                        "Bueno": "La propuesta integra personas investigadoras de al menos dos instancias del ITCR con roles definidos en el plan de acción.",
                        "Excelente": "La propuesta articula personas investigadoras de múltiples instancias del ITCR con articulación interdisciplinaria clara y roles definidos en el plan de acción."
                    }
                },
                {
                    "id": 41,
                    "nombre": "Vinculación externa",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no contempla vinculación con actores externos.",
                        "Regular": "La propuesta menciona la participación de actores externos, pero sin roles definidos ni compromiso formal documentado.",
                        "Bueno": "La propuesta incorpora colaboradores externos nacionales con participación definida y evidencia de compromiso formal.",
                        "Excelente": "La propuesta incorpora colaboradores externos nacionales o internacionales con participación activa en el plan de acción, respaldada por cartas de compromiso formales."
                    }
                },
                {
                    "id": 42,
                    "nombre": "Trayectoria de la persona coordinadora",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La persona coordinadora cuenta menos de dos años de experiencia demostrable en proyectos de investigación inscritos en el ITCR.",
                        "Regular": "La persona coordinadora cuenta entre dos y cinco años de experiencia en investigación, con grado de maestría o superior y al menos un proyecto coordinado.",
                        "Bueno": "La persona coordinadora cuenta con más de cinco años de experiencia, con grado de maestría o doctorado y coordinación de al menos dos proyectos de investigación.",
                        "Excelente": "La persona coordinadora cuenta con más de diez años de experiencia, con doctorado, coordinación de tres o más proyectos y productos académicos de alto impacto como persona coordinadora."
                    }
                },
                {
                    "id": 43,
                    "nombre": "Participación estudiantil",
                    "peso": 2,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Evidencia la propuesta la participación estudiantil mediante alguna de las modalidades autorizadas (estudiante asistente, tesis o TFG)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no contempla participación estudiantil en ninguna modalidad.",
                        "Regular": "La propuesta incorpora la participación de un estudiante de grado en calidad de asistente.",
                        "Bueno": "La propuesta incorpora la participación de dos o más estudiantes de grado en calidad de asistentes.",
                        "Excelente": "La propuesta incorpora estudiantes de grado en calidad de asistentes y vincula al menos un Trabajo Final de Graduación (TFG) al desarrollo del proyecto."
                    }
                }
            ]
        },
        {
            "id": 2,
            "nombre": "FUNDAMENTACIÓN TECNOLÓGICA",
            "peso_seccion": 12,
            "criterios": [
                {
                    "id": 44,
                    "nombre": "Definición y justificación del problema tecnológico",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "El problema tecnológico no está definido con claridad, carece de justificación y no se identifican los beneficios esperados.",
                        "Regular": "El problema tecnológico está definido y justificado de manera básica, pero los beneficios esperados no se especifican con claridad.",
                        "Bueno": "El problema tecnológico está bien definido y justificado con referencias, aunque los beneficios no están articulados de forma completa.",
                        "Excelente": "El problema tecnológico está definido con rigor y justificado mediante literatura actualizada; especifica con claridad los beneficios para la disciplina y la sociedad."
                    }
                },
                {
                    "id": 45,
                    "nombre": "Coherencia entre problema y objetivos",
                    "peso": 4,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "Los objetivos no responden al problema tecnológico planteado ni abordan las preguntas fundamentales del desarrollo: ¿qué?, ¿cómo? y ¿para qué?",
                        "Regular": "Los objetivos responden parcialmente al problema tecnológico, pero no abordan de manera completa las preguntas fundamentales del desarrollo: ¿qué?, ¿cómo? y ¿para qué?",
                        "Bueno": "Los objetivos son coherentes con el problema tecnológico y responden a las preguntas clave del desarrollo, aunque su traducción en el diseño tecnológico no resulta del todo clara.",
                        "Excelente": "Los objetivos son totalmente coherentes con el problema tecnológico, responden de manera precisa a las preguntas clave del desarrollo y cada uno se traduce explícitamente en actividades medibles y verificables."
                    }
                },
                {
                    "id": 46,
                    "nombre": "Diagnóstico tecnológico y vacío de conocimiento o innovación",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Acredita la propuesta una revisión previa del estado del arte tecnológico y sus antecedentes (constatando que NO se plantea como una actividad pendiente en el cronograma)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no realiza un diagnóstico tecnológico ni identifica vacíos de innovación; la revisión del estado del arte se plantea como una actividad futura.",
                        "Regular": "La propuesta describe el contexto tecnológico de manera básica, sin identificar claramente los vacíos de innovación.",
                        "Bueno": "La propuesta establece el estado del arte tecnológico e identifica vacíos con referencias recientes.",
                        "Excelente": "La propuesta realiza un diagnóstico tecnológico riguroso con revisión actualizada; al menos el 80 % de las referencias corresponden a los últimos diez años, los vacíos están claramente identificados y se justifica la necesidad del desarrollo."
                    }
                }
            ]
        },
        {
            "id": 3,
            "nombre": "METODOLOGÍA DE DESARROLLO",
            "peso_seccion": 15,
            "criterios": [
                {
                    "id": 47,
                    "nombre": "Rigor metodológico del desarrollo tecnológico (enfoque, alcance y diseño)",
                    "peso": 8,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Especifica la propuesta explícitamente el enfoque metodológico, el alcance tecnológico (ej. prototipo, prueba de concepto) y el diseño del proceso de desarrollo?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no define el enfoque, el alcance ni el diseño del desarrollo tecnológico.",
                        "Regular": "La propuesta menciona el enfoque o el diseño del desarrollo de manera incompleta.",
                        "Bueno": "La propuesta define el enfoque, el alcance y el diseño del desarrollo con una justificación básica.",
                        "Excelente": "La propuesta presenta una metodología de desarrollo rigurosa y justificada, con enfoque, alcance y diseño claramente especificados, y métricas de validación tecnológica definidas."
                    }
                },
                {
                    "id": 48,
                    "nombre": "Definición de usuarios/beneficiarios y validación",
                    "peso": 7,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Define la propuesta con claridad a los usuarios o beneficiarios, sus criterios de selección y la estrategia para la validación del desarrollo tecnológico?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no define los usuarios o beneficiarios del desarrollo tecnológico, ni contempla una estrategia de validación.",
                        "Regular": "La propuesta menciona los usuarios de manera genérica, sin criterios de selección ni plan de validación.",
                        "Bueno": "La propuesta define los usuarios con características básicas y presenta una estrategia de validación, aunque sin criterios explícitos de selección.",
                        "Excelente": "La propuesta define completamente los usuarios o beneficiarios (características, criterios de selección, tamaño del grupo) con una estrategia de validación tecnológica explícita y justificada."
                    }
                }
            ]
        },
        {
            "id": 4,
            "nombre": "PLAN DE ACCIÓN Y CRONOGRAMA",
            "peso_seccion": 13,
            "criterios": [
                {
                    "id": 49,
                    "nombre": "Claridad y detalle de las actividades",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se especifican explícitamente el responsable de ejecución, el personal de apoyo (si aplica) y la persona supervisora para cada una de las actividades del plan?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "El plan de acción es indefinido; no especifica actividades, responsables ni productos esperados.",
                        "Regular": "El plan presenta actividades y cronograma básicos, pero los responsables y supervisores no están claramente asignados por actividad.",
                        "Bueno": "El plan incluye actividades, cronograma y responsables; sin embargo, no se indica la persona supervisora del cumplimiento en todas las actividades, o falta el detalle de las personas de apoyo.",
                        "Excelente": "El plan es detallado: cada actividad identifica la persona responsable de su ejecución, la persona de apoyo cuando corresponde y la persona supervisora del cumplimiento, con cronograma realista y productos claramente vinculados a objetivos."
                    }
                },
                {
                    "id": 50,
                    "nombre": "Planificación de giras, trabajo de campo, pasantías y congresos",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Están planificadas explícitamente en el plan de acción las giras, trabajos de campo, pasantías o congresos requeridos (o se constata que la propuesta no los requiere)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "En la propuesta se identifican giras, trabajo de campo, pasantías o participación en congresos, pero estas actividades no están planificadas.",
                        "Regular": "Las actividades de campo o movilidad identificadas en la propuesta se mencionan de manera genérica, sin cronograma ni presupuesto asociados.",
                        "Bueno": "Las actividades de campo o movilidad identificadas en la propuesta se planifican con un cronograma básico, aunque les faltan algunos elementos de detalle.",
                        "Excelente": "Todas las actividades de campo o movilidad identificadas en la propuesta están planificadas de forma explícita con cronograma, justificación, productos esperados y presupuesto asociado."
                    }
                },
                {
                    "id": 51,
                    "nombre": "Trazabilidad de resultados y tiempos de seguimiento",
                    "peso": 5,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se definen los resultados esperados y los plazos estimados para cada actividad asegurando la trazabilidad de su seguimiento? Estos resultados son distintos de los productos académicos exigidos por la Convocatoria.",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "No se definen resultados esperados ni plazos para las actividades del plan de acción.",
                        "Regular": "Algunos resultados esperados están definidos, pero sin plazos asociados o sin cobertura de todas las actividades.",
                        "Bueno": "La mayoría de las actividades cuenta con resultados esperados y plazos definidos, aunque persisten algunos vacíos en la cobertura.",
                        "Excelente": "Todas las actividades cuentan con resultados esperados claramente definidos y plazos definidos, lo que garantiza la trazabilidad del seguimiento institucional."
                    }
                }
            ]
        },
        {
            "id": 5,
            "nombre": "PRESUPUESTO",
            "peso_seccion": 10,
            "criterios": [
                {
                    "id": 52,
                    "nombre": "Coherencia y proporcionalidad presupuestaria",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Cumple el presupuesto formulado con los montos máximos establecidos en las disposiciones de la convocatoria VIE 2027?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Los recursos solicitados no están cuantificados, carecen de justificación o superan los montos máximos establecidos en la Convocatoria.",
                        "Regular": "Los recursos están cuantificados, pero la justificación no evidencia proporcionalidad con el plan de acción, o presenta inconsistencias menores respecto a los montos permitidos.",
                        "Bueno": "Los recursos están cuantificados y justificados con proporcionalidad parcial respecto al plan de acción; se respetan los montos máximos.",
                        "Excelente": "Los recursos están debidamente cuantificados y justificados, con plena proporcionalidad respecto al plan de acción y dentro de los montos máximos establecidos en la Convocatoria."
                    }
                },
                {
                    "id": 53,
                    "nombre": "Inversión y equipamiento",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se concentran las solicitudes de equipamiento e inversión en el primer año de ejecución de la propuesta (o se justifica una excepción válida)?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta requiere equipamiento, pero no lo incluye en el presupuesto o lo programa para años posteriores sin justificación.",
                        "Regular": "El equipamiento se incluye en el presupuesto, pero con justificación insuficiente o sin vincularlo claramente al plan de acción del primer año.",
                        "Bueno": "El equipamiento está formulado para el primer año con justificación adecuada, aunque existen inconsistencias menores respecto al plan de acción.",
                        "Excelente": "El equipamiento o la inversión están completamente formulados para el primer año, con justificación clara, coherencia con el plan de acción y dentro de los montos permitidos."
                    }
                },
                {
                    "id": 54,
                    "nombre": "Financiamiento externo, contrapartida o cofinanciamiento",
                    "peso": 2,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no cuenta con financiamiento externo, cofinanciamiento ni contrapartida aprobados.",
                        "Regular": "El financiamiento externo o cofinanciamiento es inferior en más de un 15 % al monto solicitado a la VIE, o la propuesta cuenta únicamente con contrapartida en especie.",
                        "Bueno": "El financiamiento externo o cofinanciamiento es equivalente (±15 %) al monto solicitado a la VIE, o no se acredita mediante cartas de compromiso formales.",
                        "Excelente": "El financiamiento externo o cofinanciamiento supera en más de un 15 % el monto solicitado a la VIE, y se acredita mediante cartas de compromiso formales."
                    }
                }
            ]
        },
        {
            "id": 6,
            "nombre": "GESTIÓN DE RIESGOS",
            "peso_seccion": 8,
            "criterios": [
                {
                    "id": 55,
                    "nombre": "Identificación de riesgos por actividad",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Asocia el plan de riesgos al menos un riesgo con su respectiva acción de mitigación por cada actividad planificada?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no identifica riesgos por cada actividad del plan de acción.",
                        "Regular": "Se identifica riesgos por cada actividad del plan de acción, con acciones de mitigación de carácter básico.",
                        "Bueno": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables.",
                        "Excelente": "Se identifica al menos un riesgo por cada actividad, con acciones de mitigación específicas y viables y responsables de supervisión."
                    }
                },
                {
                    "id": 56,
                    "nombre": "Viabilidad de las acciones de mitigación",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Son las acciones de mitigación propuestas coherentes, viables y suficientes para salvaguardar el éxito de la actividad?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "Las acciones de mitigación son genéricas, incoherentes o están ausentes; existen riesgos críticos sin atención.",
                        "Regular": "Algunas acciones de mitigación son coherentes, pero hay riesgos importantes sin solución técnica viable.",
                        "Bueno": "Las acciones de mitigación son viables y coherentes con el desarrollo tecnológico, respaldadas con evidencias técnicas parciales.",
                        "Excelente": "Todas las acciones de mitigación son específicas, viables y coherentes con el desarrollo tecnológico, respaldadas con evidencias técnicas concretas."
                    }
                }
            ]
        },
        {
            "id": 7,
            "nombre": "ASPECTOS ÉTICOS Y DE PROPIEDAD INTELECTUAL",
            "peso_seccion": 10,
            "criterios": [
                {
                    "id": 57,
                    "nombre": "Evaluación de necesidad de un ente ético o regulatorio y justificación de exenciones",
                    "peso": 4,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Declara y justifica la propuesta, de forma obligatoria, si requiere o no la autorización de un un ente ético o regulatorio?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "La propuesta no aborda los aspectos éticos pertinentes; no se incluye evaluación alguna sobre la necesidad de autorización de un ente ético o regulatorio.",
                        "Regular": "La propuesta menciona la evaluación ética, pero no incluye una justificación escrita que la respalde.",
                        "Bueno": "La propuesta incluye una evaluación de los aspectos éticos con justificación escrita, aunque de forma incompleta o con escasa especificidad.",
                        "Excelente": "La propuesta incluye una evaluación completa de los aspectos éticos con justificación escrita detallada. Si requiere autorización de un ente ético o regulatorio, el proceso está documentado; si no lo requiere, la exención está explícitamente fundamentada."
                    }
                },
                {
                    "id": 58,
                    "nombre": "Gestión de propiedad intelectual",
                    "peso": 6,
                    "es_requisito_obligatorio": True,
                    "pregunta_obligatoria": "¿Se adjunta a la propuesta el dictamen técnico previo emitido por el Centro de Vinculación relativo al potencial de innovación y propiedad intelectual?",
                    "justificacion_obligatoria": True,
                    "niveles": {
                        "Deficiente": "No se identifican posibilidades de protección de propiedad intelectual en resultados tecnológicos. Y no cuenta con revisión previa del Centro de Vinculación.",
                        "Regular": "Se menciona la propiedad intelectual pero sin estrategia de gestión.",
                        "Bueno": "Se identifican posibilidades de propiedad intelectual y se describe una estrategia básica de gestión.",
                        "Excelente": "Se identifican claramente los activos tecnológicos susceptibles de protección, con estrategia de gestión alineada con el Centro de Vinculación."
                    }
                }
            ]
        },
        {
            "id": 8,
            "nombre": "PERTINENCIA, INNOVACIÓN E IMPACTO",
            "peso_seccion": 17,
            "criterios": [
                {
                    "id": 59,
                    "nombre": "Contribución tecnológica e impacto",
                    "peso": 10,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "La propuesta no evidencia una contribución clara al avance del sector o a la mejora de las condiciones de la sociedad.",
                        "Regular": "La propuesta contribuye al sector tecnológico, pero con un impacto limitado al ámbito local.",
                        "Bueno": "La propuesta realiza una contribución tecnológica significativa con potencial impacto nacional y vinculación sectorial demostrada.",
                        "Excelente": "La propuesta realiza una contribución tecnológica sólida con potencial impacto nacional e internacional, articulando beneficios concretos para el sector productivo y la sociedad."
                    }
                },
                {
                    "id": 60,
                    "nombre": "Nivel de innovación del desarrollo",
                    "peso": 7,
                    "es_requisito_obligatorio": False,
                    "niveles": {
                        "Deficiente": "El desarrollo tecnológico propuesto replica tecnologías existentes sin presentar componentes innovadores.",
                        "Regular": "El desarrollo identifica un aspecto innovador, pero no articula cómo se logrará ni describe sus etapas.",
                        "Bueno": "El desarrollo identifica innovación tecnológica con detalles de implementación.",
                        "Excelente": "El desarrollo presenta una innovación tecnológica clara y justificada, con todas las etapas detalladas y potencial de escala o transferencia tecnológica."
                    }
                }
            ]
        }
    ],
    "seccion_productos": {
        "id": 9,
        "nombre": "PRODUCTOS ACADÉMICOS Y DE PROPIEDAD INDUSTRIAL",
        "es_sumativa": False,
        "advertencia": "Esta sección NO agrega puntos a la calificación final. Verifica que los productos comprometidos cumplan con las disposiciones de la Convocatoria. Todo proyecto de desarrollo tecnológico requiere MÍNIMO 2 productos (1 de propiedad industrial obligatorio + 1 adicional). Si la formulación de la propuesta NO cumple, el Comité Técnico DEBE no recomendar la propuesta.",
        "regla_productos": {
            "minimo_productos": 2,
            "activo_pi_obligatorio": True,
            "1_a_10_horas": 2,
            "11_a_20_horas": 3,
            "21_a_30_horas": 4,
            "formula_excedente": "un producto adicional por cada 10 horas semanales excedentes"
        },
        "activos_propiedad_industrial": [
            {"id": 1, "nombre": "Patente de invención o modelo de utilidad (documento técnico preliminar de solicitud)"},
            {"id": 2, "nombre": "Diseño industrial – dibujo o modelo industrial – (solicitud completa)"},
            {"id": 3, "nombre": "Desarrollo de Software (código fuente + manual técnico + manual de usuario + ciclo de vida)"},
            {"id": 4, "nombre": "Secreto (documento técnico conformado y depositado en el Centro de Vinculación)"},
            {"id": 5, "nombre": "Obtención Vegetal (documento técnico con caracterización de la nueva variedad)"},
            {"id": 6, "nombre": "Denominación de origen o indicación geográfica (pliego de condiciones)"},
            {"id": 7, "nombre": "Sistema de trazado de circuitos integrados (solicitud completa)"},
            {"id": 8, "nombre": "Otros (Todo aquello no descrito anteriormente quedará a criterio del Centro de Vinculación)"}
        ],
        "productos_academicos": [
            {"id": 1, "nombre": "Un artículo científico sometido en una revista o memoria de conferencia indexada en Web of Science (WoS) o Scopus"},
            {"id": 2, "nombre": "Dos artículos científicos sometido en revistas indexadas en SciELO, Redalyc, ESCI o DOAJ, o memorias de conferencia con Consejo Editorial permanente. Al menos uno (1) de ellos debe estar publicado."},
            {"id": 3, "nombre": "Un libro o capítulo de libro técnico especializado, con Comité Editorial permanente, cuyo contenido esté directamente vinculado a la temática de la investigación."},
            {"id": 4, "nombre": "Norma técnica sometida ante por entes competentes de reconocida trayectoria a nivel nacional o internacional, o manuales técnicos de alta especialidad."}
        ]
    }
}

# ============================================================================
# DICCIONARIO DE ACCESO RÁPIDO
# ============================================================================
RUBRICAS = {
    "fortalecimiento": RUBRICA_FORTALECIMIENTO,
    "basica_aplicada": RUBRICA_BASICA_APLICADA,
    "desarrollo_tecnologico": RUBRICA_DESARROLLO_TECNOLOGICO
}

def obtener_rubrica(tipo_modalidad: str) -> dict:
    """
    Obtiene la estructura completa de la rúbrica según el tipo de modalidad
    """
    if tipo_modalidad not in RUBRICAS:
        raise ValueError(f"Tipo de modalidad no válido: {tipo_modalidad}. Opciones válidas: {list(RUBRICAS.keys())}")
    return RUBRICAS[tipo_modalidad]

def calcular_minimo_productos(tipo_rubrica: str, horas_semanales: float) -> int:
    """
    Calcula el mínimo de productos académicos requeridos según las horas semanales
    """
    rubrica = obtener_rubrica(tipo_rubrica)
    regla = rubrica["seccion_productos"]["regla_productos"]
    
    if tipo_rubrica == "desarrollo_tecnologico":
        # Desarrollo tecnológico tiene reglas especiales
        if horas_semanales <= 10:
            return 2
        elif horas_semanales <= 20:
            return 3
        elif horas_semanales <= 30:
            return 4
        else:
            excedente = horas_semanales - 30
            return 4 + int(excedente / 10) + (1 if excedente % 10 > 0 else 0)
    else:
        # Fortalecimiento y Básica/Aplicada tienen las mismas reglas
        if horas_semanales <= 10:
            return 1
        elif horas_semanales <= 20:
            return 2
        elif horas_semanales <= 30:
            return 3
        else:
            excedente = horas_semanales - 30
            return 3 + int(excedente / 10) + (1 if excedente % 10 > 0 else 0)