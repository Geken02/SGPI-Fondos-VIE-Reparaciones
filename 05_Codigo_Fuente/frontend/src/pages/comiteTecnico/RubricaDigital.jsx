// src/pages/comiteTecnico/RubricaDigital.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import PanelDocumentos from '../../components/PanelDocumentos';
import AnalisisIA from '../../components/AnalisisIA';

export default function RubricaDigital() {
  const { propuestaId } = useParams();
  const navigate = useNavigate();
  
  const [rubricaData, setRubricaData] = useState(null);
  const [pasoActual, setPasoActual] = useState(0);
  const [evaluaciones, setEvaluaciones] = useState({});
  const [productos, setProductos] = useState({
    horasSemanales: 0,
    cantidadPropuesta: 0,
    tiposSeleccionados: []
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await comiteTecnicoService.obtenerEstructuraRubrica(propuestaId);
        setRubricaData(res.data);
        setProductos(prev => ({ ...prev, horasSemanales: res.data.horasSemanalesTotales }));
      } catch (err) {
        console.error('Error cargando rúbrica:', err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [propuestaId]);

  // Calcular calificación en tiempo real
  const calificacion = useMemo(() => {
    if (!rubricaData) return 0;
    let total = 0;
    rubricaData.estructuraRubrica.secciones.forEach(sec => {
      let sub = 0, peso = 0;
      sec.criterios.forEach(c => {
        const ev = evaluaciones[c.id];
        if (ev) { 
          sub += (ev.puntaje / 10) * c.peso; 
          peso += c.peso; 
        }
      });
      if (peso > 0) total += (sub / peso) * sec.peso_seccion;
    });
    return total / 100;
  }, [evaluaciones, rubricaData]);

  const productosCumple = useMemo(() => {
    if (!rubricaData) return false;
    return productos.cantidadPropuesta >= rubricaData.minimoProductosRequeridos;
  }, [productos, rubricaData]);

  const handleSeleccionar = (criterioId, nivel, puntaje) => {
    setEvaluaciones(prev => ({
      ...prev,
      [criterioId]: {
        ...prev[criterioId],
        nivel, 
        puntaje,
        justificacionRequerida: puntaje < 10 || 
          rubricaData.estructuraRubrica.secciones
            .flatMap(s => s.criterios)
            .find(c => c.id === criterioId)?.es_requisito_obligatorio
      }
    }));
  };

  const handleJustificacion = (criterioId, texto) => {
    setEvaluaciones(prev => ({
      ...prev,
      [criterioId]: { ...prev[criterioId], justificacion: texto }
    }));
  };

  const handleTipoProducto = (tipoId) => {
    setProductos(prev => {
      const seleccionados = prev.tiposSeleccionados.includes(tipoId)
        ? prev.tiposSeleccionados.filter(id => id !== tipoId)
        : [...prev.tiposSeleccionados, tipoId];
      return { ...prev, tiposSeleccionados: seleccionados };
    });
  };

  const enviarEvaluacion = async () => {
  // Validación básica de MVP
  const criteriosObligatorios = rubricaData.estructuraRubrica.secciones
    .flatMap(s => s.criterios)
    .filter(c => c.es_requisito_obligatorio);
  
  const criteriosSinEvaluar = criteriosObligatorios.filter(c => !evaluaciones[c.id]);
  
  if (criteriosSinEvaluar.length > 0) {
    alert(`⚠️ Faltan ${criteriosSinEvaluar.length} criterios obligatorios por evaluar.`);
    return;
  }

  if (!confirm('¿Enviar evaluación final? Esta acción no se puede deshacer.')) return;

  try {
    const detalles = Object.keys(evaluaciones).map(cid => ({
      criterioId: parseInt(cid),
      puntaje: parseFloat(evaluaciones[cid].puntaje),
      justificacion: evaluaciones[cid].justificacion || 'Sin justificación adicional.'
    }));

    // ✅ CORRECCIÓN: La calificación ya está en escala 0-1 (no multipliques por 100)
    const payload = {
      detalles,
      calificacionFinal: parseFloat(calificacion.toFixed(2)), // ← Ya está en 0-1
      recomienda: calificacion >= 0.70 && productosCumple,
      observaciones: ''
    };

    console.log('📤 Enviando evaluación:', payload);
    
    await comiteTecnicoService.enviarEvaluacion(propuestaId, payload);

    alert('✅ Evaluación enviada y guardada correctamente.');
    navigate('/comite-tecnico/bandeja-evaluacion');
  } catch (err) {
    console.error('Error al enviar evaluación:', err);
    const msg = err.response?.data?.detail || 'Error desconocido';
    alert(`❌ Error al enviar evaluación: ${msg}`);
  }
};

  const irAnterior = () => {
    if (pasoActual > 0) setPasoActual(pasoActual - 1);
  };

  const irSiguiente = () => {
    if (pasoActual < 9) setPasoActual(pasoActual + 1);
  };

  if (cargando) {
    return (
      <div className="rubrica-loading">
        <div className="spinner"></div>
        <p>Cargando rúbrica...</p>
      </div>
    );
  }

  if (!rubricaData) {
    return (
      <div className="rubrica-error">
        <p>No se pudo cargar la rúbrica</p>
        <button className="btn-volver" onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')}>
          Volver
        </button>
      </div>
    );
  }

  const totalPasos = 10; // 8 secciones + productos + resumen
  const progresoTotal = ((pasoActual + 1) / totalPasos) * 100;
  const seccionActual = rubricaData.estructuraRubrica.secciones[pasoActual];

  // Renderizar sección de evaluación (pasos 0 a 7)
  const renderizarSeccionEvaluacion = () => {
    if (!seccionActual) return null;
    
    return (
      <div className="seccion-evaluacion">
        <div className="seccion-header">
          <div>
            <h2 className="seccion-titulo">{seccionActual.nombre}</h2>
            <span className="seccion-peso-badge">Peso: {seccionActual.peso_seccion}%</span>
          </div>
        </div>

        {seccionActual.criterios.map((crit) => {
          const ev = evaluaciones[crit.id];
          return (
            <div key={crit.id} className="criterio-card">
              <div className="criterio-header">
                <h3 className="criterio-nombre">{crit.nombre}</h3>
                <div className="criterio-badges">
                  <span className="peso-badge">{crit.peso}%</span>
                  {crit.es_requisito_obligatorio && (
                    <span className="obligatorio-badge">⛔ Obligatorio</span>
                  )}
                </div>
              </div>

              {crit.pregunta_obligatoria && (
                <div className="pregunta-box">
                  <strong>Pregunta clave:</strong> {crit.pregunta_obligatoria}
                </div>
              )}

              <div className="niveles-grid">
                {['Deficiente', 'Regular', 'Bueno', 'Excelente'].map((nivel, idx) => {
                  const puntajes = [0, 6, 8, 10];
                  const seleccionado = ev?.nivel === nivel;
                  return (
                    <button
                      key={nivel}
                      className={`nivel-card ${seleccionado ? `selected nivel-${nivel.toLowerCase()}` : ''}`}
                      onClick={() => handleSeleccionar(crit.id, nivel, puntajes[idx])}
                    >
                      <div className="nivel-header">
                        <span className="nivel-nombre">{nivel}</span>
                        <span className="nivel-puntaje">{puntajes[idx]} pts</span>
                      </div>
                      <p className="nivel-descripcion">{crit.niveles[nivel]}</p>
                    </button>
                  );
                })}
              </div>

              {ev?.justificacionRequerida && (
                <div className="justificacion-box">
                  <label className="justificacion-label">
                    Justificación
                    {ev.puntaje < 10 && <span className="required-mark">*</span>}
                  </label>
                  <textarea
                    className="justificacion-textarea"
                    value={ev.justificacion || ''}
                    onChange={(e) => handleJustificacion(crit.id, e.target.value)}
                    placeholder="Explique por qué asignó este puntaje basándose en la evidencia del documento..."
                    rows={3}
                  />
                 
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

    // Renderizar sección de productos (paso 8)
  const renderizarProductos = () => {
    const seccionProductos = rubricaData?.estructuraRubrica?.seccion_productos;
    if (!seccionProductos) return <p>No se encontró la configuración de productos.</p>;

    const esDesarrolloTecnologico = rubricaData.tipoRubrica === 'desarrollo_tecnologico';

    return (
      <div className="seccion-productos">
        <div className="seccion-header">
          <h2 className="seccion-titulo">9. {seccionProductos.nombre}</h2>
          <span className="seccion-peso-badge">Sección no sumativa</span>
        </div>

        <div className="alerta-productos">
          <strong>⚠ ATENCIÓN:</strong> {seccionProductos.advertencia}
        </div>

        <div className="productos-info-grid">
          <div className="producto-info-item">
            <label className="producto-label">Total de horas semanales asignadas al equipo</label>
            <input
              type="number"
              value={productos.horasSemanales}
              onChange={(e) => setProductos(prev => ({ ...prev, horasSemanales: parseFloat(e.target.value) || 0 }))}
              className="producto-input"
            />
            <small className="producto-help">Indique la suma total de horas semanales (VIE + VIE-Centros + REC + CONS + DOC + VIESA)</small>
          </div>

          <div className="producto-info-item">
            <label className="producto-label">Mínimo de productos requeridos</label>
            <div className="producto-valor-display">
              {rubricaData.minimoProductosRequeridos} producto(s)
            </div>
            <small className="producto-help">Según la Convocatoria</small>
          </div>

          <div className="producto-info-item">
            <label className="producto-label">Cantidad de productos propuestos por el equipo</label>
            <input
              type="number"
              value={productos.cantidadPropuesta}
              onChange={(e) => setProductos(prev => ({ ...prev, cantidadPropuesta: parseInt(e.target.value) || 0 }))}
              className="producto-input"
            />
            <small className="producto-help">El equipo declara comprometer esta cantidad de productos</small>
          </div>
        </div>

        <div className="tipos-productos-container">
          <h3 className="tipos-titulo">Tipo(s) de producto(s) comprometidos</h3>
          <p className="tipos-instruccion">Marque el tipo declarado por el equipo:</p>
          
          <div className="tipos-productos-grid">
            {/* ✅ Manejo seguro para Fortalecimiento y Básica/Aplicada */}
            {seccionProductos.tipos_productos?.map((tipo) => (
              <label key={tipo.id} className="tipo-producto-checkbox">
                <input
                  type="checkbox"
                  checked={productos.tiposSeleccionados.includes(tipo.id)}
                  onChange={() => handleTipoProducto(tipo.id)}
                />
                <span className="checkbox-label">Opción {tipo.id}: {tipo.nombre}</span>
              </label>
            ))}

            {/* ✅ Manejo seguro y específico para Desarrollo Tecnológico */}
            {esDesarrolloTecnologico && (
              <>
                <h4 className="subtipo-titulo" style={{marginTop: '20px', width: '100%'}}>① Producto de propiedad industrial OBLIGATORIO</h4>
                {seccionProductos.activos_propiedad_industrial?.map((tipo) => (
                  <label key={`pi-${tipo.id}`} className="tipo-producto-checkbox">
                    <input
                      type="checkbox"
                      checked={productos.tiposSeleccionados.includes(`pi-${tipo.id}`)}
                      onChange={() => handleTipoProducto(`pi-${tipo.id}`)}
                    />
                    <span className="checkbox-label">Opción PI {tipo.id}: {tipo.nombre}</span>
                  </label>
                ))}
                
                <h4 className="subtipo-titulo" style={{marginTop: '20px', width: '100%'}}>② Productos académicos adicionales</h4>
                {seccionProductos.productos_academicos?.map((tipo) => (
                  <label key={`acad-${tipo.id}`} className="tipo-producto-checkbox">
                    <input
                      type="checkbox"
                      checked={productos.tiposSeleccionados.includes(`acad-${tipo.id}`)}
                      onChange={() => handleTipoProducto(`acad-${tipo.id}`)}
                    />
                    <span className="checkbox-label">Opción Acad {tipo.id}: {tipo.nombre}</span>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>

        <div className={`cumplimiento-productos ${productosCumple ? 'cumple' : 'no-cumple'}`}>
          <strong>¿Cumple con el mínimo según las horas asignadas?</strong>
          {productosCumple ? (
            <p>✓ CUMPLE con los requisitos mínimos de productos → La propuesta puede continuar su revisión</p>
          ) : (
            <p>✗ NO CUMPLE con los requisitos mínimos → La propuesta debe ser RECHAZADA por el Comité Técnico</p>
          )}
        </div>
      </div>
    );
  };

  // Renderizar resumen (paso 9)
  const renderizarResumen = () => (
    <div className="seccion-resumen">
      <div className="seccion-header">
        <h2 className="seccion-titulo">10. RESUMEN Y ENVÍO DE EVALUACIÓN</h2>
      </div>

      <div className="resumen-calificaciones">
        <h3 className="resumen-titulo">Resumen de calificaciones por sección</h3>
        <table className="tabla-resumen">
          <thead>
            <tr>
              <th>Sección</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {rubricaData.estructuraRubrica.secciones.map((sec, idx) => {
              let subtotal = 0, peso = 0;
              sec.criterios.forEach(c => {
                const ev = evaluaciones[c.id];
                if (ev) { subtotal += (ev.puntaje / 10) * c.peso; peso += c.peso; }
              });
              const nota = peso > 0 ? ((subtotal / peso) * sec.peso_seccion / 100).toFixed(2) : '0.00';
              return (
                <tr key={sec.id}>
                  <td>{idx + 1}. {sec.nombre} ({sec.peso_seccion}%)</td>
                  <td className="nota-celda">{nota}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`calificacion-final-box ${calificacion >= 0.70 ? 'recomienda' : 'no-recomienda'}`}>
        <div className="calificacion-final-label">CALIFICACIÓN FINAL</div>
        <div className="calificacion-final-valor">{calificacion.toFixed(2)}</div>
        <div className="calificacion-final-estado">
          {calificacion >= 0.70 ? '≥ 0.70 = RECOMIENDA' : '< 0.70 = NO RECOMIENDA'}
        </div>
      </div>

      <div className="verificacion-requisitos">
        <h3 className="verificacion-titulo">Verificación de requisitos obligatorios:</h3>
        <ul className="lista-requisitos-verificacion">
          {rubricaData.estructuraRubrica.secciones.flatMap(s => s.criterios)
            .filter(c => c.es_requisito_obligatorio)
            .map(c => {
              const ev = evaluaciones[c.id];
              const cumple = ev && ev.puntaje >= 8;
              return (
                <li key={c.id} className={cumple ? 'cumple' : 'no-cumple'}>
                  {cumple ? '✓' : '✗'} {c.nombre}
                </li>
              );
            })}
          <li className={productosCumple ? 'cumple' : 'no-cumple'}>
            {productosCumple ? '✓' : '✗'} Productos académicos suficientes
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="rubrica-container">
      {/* HEADER */}
      <header className="rubrica-header">
        <div className="header-left">
          <h1 className="header-title">Rúbrica-02 Digital</h1>
          <p className="header-subtitle">{rubricaData.titulo}</p>
          <div className="header-tags">
            <span className="tag">{rubricaData.codigoPropuesta}</span>
            <span className="tag">{rubricaData.nombreRubrica}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="calificacion-box">
            <span className="cal-label">Calificación</span>
            <span className={`cal-valor ${calificacion >= 0.70 ? 'ok' : 'mal'}`}>
              {(calificacion * 100).toFixed(1)}%
            </span>
          </div>
          <button className="btn-volver-header" onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')}>
            ← Volver
          </button>
        </div>
      </header>

      {/* BARRA DE PROGRESO */}
      <div className="progress-container">
        <div className="progress-info">
          <span className="progress-text">
            {pasoActual < 8 
              ? `Sección ${pasoActual + 1} de 8: ${seccionActual?.nombre}` 
              : pasoActual === 8 
                ? 'Sección 9: Productos Académicos' 
                : 'Sección 10: Resumen y Envío'}
          </span>
          <span className="progress-percent">{Math.round(progresoTotal)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progresoTotal}%` }}></div>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL DE 3 COLUMNAS */}
      <div className="rubrica-layout-3col">
        
        {/* COLUMNA 1: SIDEBAR DE NAVEGACIÓN */}
        <aside className="sidebar">
          <nav className="nav-secciones">
            {rubricaData.estructuraRubrica.secciones.map((s, idx) => {
              const completada = s.criterios.every(c => evaluaciones[c.id]);
              const activa = idx === pasoActual;
              return (
                <button
                  key={s.id}
                  className={`nav-item ${activa ? 'active' : ''} ${completada ? 'done' : ''}`}
                  onClick={() => setPasoActual(idx)}
                >
                  <span className="nav-icon">{completada ? '✓' : idx + 1}</span>
                  <div className="nav-text">
                    <span className="nav-nombre">{s.nombre}</span>
                    <span className="nav-peso">{s.peso_seccion}%</span>
                  </div>
                </button>
              );
            })}
            
            <div className="nav-divider"></div>
            
            <button
              className={`nav-item ${pasoActual === 8 ? 'active' : ''}`}
              onClick={() => setPasoActual(8)}
            >
              <span className="nav-icon nav-icon-special">📚</span>
              <div className="nav-text">
                <span className="nav-nombre">Productos Académicos</span>
                <span className="nav-peso">No sumativa</span>
              </div>
            </button>
            
            <button
              className={`nav-item ${pasoActual === 9 ? 'active' : ''}`}
              onClick={() => setPasoActual(9)}
            >
              <span className="nav-icon nav-icon-special">📋</span>
              <div className="nav-text">
                <span className="nav-nombre">Resumen y Envío</span>
                <span className="nav-peso">Final</span>
              </div>
            </button>
          </nav>
        </aside>

        {/* COLUMNA 2: CONTENIDO PRINCIPAL */}
        <main className="main-content">
          <div className="content-card">
            <AnalisisIA 
  propuestaId={propuestaId}
  rubricaData={rubricaData}
  onAplicarSugerencias={(sugerencias) => {
  console.log('🔍 Aplicando sugerencias:', sugerencias);
  
  const normalizar = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  // Función para encontrar el mejor criterio por overlap de palabras clave
  const encontrarMejorCriterio = (nombreIA, criteriosSeccion) => {
    const palabrasIA = normalizar(nombreIA).split(/\s+/).filter(p => p.length > 2);
    const palabrasIgnorar = ['de', 'la', 'el', 'las', 'los', 'un', 'una', 'y', 'o', 'a', 'con', 'por', 'para', 'en', 'del', 'al', 'se', 'su', 'es', 'son'];
    
    let mejorCriterio = null;
    let maxOverlap = 0;

    for (const c of criteriosSeccion) {
      const nombreBD = normalizar(c.nombre);
      const palabrasBD = nombreBD.split(/\s+/).filter(p => p.length > 2 && !palabrasIgnorar.includes(p));
      
      // Calcular cuántas palabras clave de la IA están en la BD
      const overlap = palabrasIA.filter(p => !palabrasIgnorar.includes(p) && palabrasBD.includes(p)).length;
      
      // Criterios de match:
      // 1. Coincidencia exacta o substring directo
      // 2. Al menos 2 palabras clave en común (ej: "Coherencia actividades" vs "Coherencia entre objetivos y actividades")
      if (nombreBD.includes(normalizar(nombreIA)) || 
          normalizar(nombreIA).includes(nombreBD) || 
          overlap >= 2) {
        
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          mejorCriterio = c;
        }
      }
    }
    return mejorCriterio;
  };

  let aplicados = 0;
  let omitidos = 0;

  Object.entries(sugerencias).forEach(([seccionId, seccionData]) => {
    const seccionRubrica = rubricaData.estructuraRubrica.secciones.find(
      s => s.id === parseInt(seccionId)
    );
    
    if (!seccionRubrica) return;

    seccionData.criterios.forEach((criterioEval) => {
      if (!criterioEval.criterio || !criterioEval.puntaje) {
        omitidos++;
        return;
      }

      // Usar el nuevo algoritmo de mejor coincidencia
      const criterioRubrica = encontrarMejorCriterio(criterioEval.criterio, seccionRubrica.criterios);
      
      if (criterioRubrica) {
        console.log(`✅ "${criterioEval.criterio}" → "${criterioRubrica.nombre}" (Puntaje: ${criterioEval.puntaje})`);
        
        handleSeleccionar(
          criterioRubrica.id,
          criterioEval.nivel || 'Bueno',
          criterioEval.puntaje
        );
        
        handleJustificacion(
          criterioRubrica.id,
          criterioEval.justificacion || "Justificación generada por IA."
        );
        
        aplicados++;
      } else {
        console.warn(`❌ No mapeado: "${criterioEval.criterio}"`);
        omitidos++;
      }
    });
  });
  
  alert(`✅ Aplicados: ${aplicados} | Omitidos: ${omitidos}\nRevisa los campos.`);
}}
/>
        {pasoActual < 8 && renderizarSeccionEvaluacion()}
            {pasoActual === 8 && renderizarProductos()}
            {pasoActual === 9 && renderizarResumen()}

            <div className="navegacion-inferior">
              <button 
                className="btn-nav" 
                onClick={irAnterior}
                disabled={pasoActual === 0}
              >
                ← Anterior
              </button>
              
              <span className="nav-counter">
                Paso {pasoActual + 1} de {totalPasos}
              </span>

              {pasoActual < 9 ? (
                <button className="btn-siguiente" onClick={irSiguiente}>
                  Siguiente →
                </button>
              ) : (
                <button className="btn-enviar" onClick={enviarEvaluacion}>
                  Enviar Evaluación →
                </button>
              )}
            </div>
          </div>
        </main>

        {/* COLUMNA 3: PANEL DE DOCUMENTOS */}
        <aside className="panel-derecho">
          <PanelDocumentos propuestaId={propuestaId} />
        </aside>

      </div>
    </div>
  );
}