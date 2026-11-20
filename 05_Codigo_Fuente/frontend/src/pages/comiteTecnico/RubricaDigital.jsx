import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comiteTecnicoService } from '../../services/comiteTecnicoService';
import { propuestaService } from '../../services/propuestaService'; // ✅ Agregado para la subida a S3
import PanelDocumentos from '../../components/PanelDocumentos';
import AnalisisIA from '../../components/AnalisisIA';
import PDFViewer from '../../components/PDFViewer';
import SiglaVie from '../../components/SiglaVie';

// =========================================================================
// ICONOS SVG (Reemplazo de emojis para aspecto profesional)
// =========================================================================
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconAlert = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconBook = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconClipboard = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconCross = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

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
  const [pdfAbierto, setPdfAbierto] = useState(null); 
  
  // ✅ NUEVOS ESTADOS para el guardado de borrador
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('Evaluación en progreso');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await comiteTecnicoService.obtenerEstructuraRubrica(propuestaId);
        setRubricaData(res.data);
        setProductos(prev => ({ ...prev, horasSemanales: res.data.horasSemanalesTotales || 0 }));
        
        // Intentar cargar borrador local si existe
        const borradorLocal = localStorage.getItem(`rubrica_borrador_${propuestaId}`);
        if (borradorLocal) {
          try {
            const datos = JSON.parse(borradorLocal);
            if (datos.evaluaciones) setEvaluaciones(datos.evaluaciones);
            if (datos.productos) setProductos(prev => ({ ...prev, ...datos.productos }));
            setMensajeGuardado('Borrador local cargado');
          } catch (_e) {}
        }
      } catch (err) {
        console.error('Error cargando rúbrica:', err);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [propuestaId]);

  const calificacion = useMemo(() => {
    if (!rubricaData) return 0;
    let total = 0;
    rubricaData.estructuraRubrica.secciones.forEach(sec => {
      let sub = 0, peso = 0;
      sec.criterios.forEach(c => {
        const ev = evaluaciones[c.id];
        if (ev && ev.puntaje !== undefined && ev.puntaje !== null) {
          const puntajeNum = parseFloat(ev.puntaje);
          if (!isNaN(puntajeNum)) {
            sub += (puntajeNum / 10) * c.peso;
            peso += c.peso;
          }
        }
      });
      if (peso > 0) total += (sub / peso) * sec.peso_seccion;
    });
    return total / 100;
  }, [evaluaciones, rubricaData]);

  const productosCumple = useMemo(() => {
    if (!rubricaData) return false;
    return productos.cantidadPropuesta >= (rubricaData.minimoProductosRequeridos || 0);
  }, [productos, rubricaData]);

  // =========================================================================
  // ✅ FUNCIÓN PARA GUARDAR BORRADOR Y SUBIR A S3
  // =========================================================================
  const guardarBorrador = async () => {
    setGuardando(true);
    try {
      // 1. Guardar en localStorage
      const datosBorrador = {
        evaluaciones,
        productos,
        fechaGuardado: new Date().toISOString()
      };
      localStorage.setItem(`rubrica_borrador_${propuestaId}`, JSON.stringify(datosBorrador));

      // 2. Generar Excel y subir a S3 (Supabase)
      const { generarBlobRubricaExcel, subirBlobASupabase } = await import('../../utils/exportUtils');
      const blob = await generarBlobRubricaExcel(rubricaData, evaluaciones, productos);
      
      if (blob && blob.size > 0) {
        // ⚠️ El '5' es el tipoDocumentoId para "Rúbrica de Evaluación". 
        // Si en tu tabla TiposDocumento es otro número, cámbialo aquí.
        await propuestaService.subirDocumentoFormulario(
          propuestaId,
          16, 
          blob,
          `Rubrica_Borrador_${rubricaData.codigoPropuesta || propuestaId}.xlsx`
        );
        console.log('✅ Rúbrica guardada como borrador y subida a S3');
      }
      
      const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
      setMensajeGuardado(`Borrador guardado ${ahora}`);
      alert('Borrador guardado exitosamente en el sistema y en la nube.');
    } catch (err) {
      console.error('Error al guardar borrador:', err);
      alert('Error al subir a la nube, pero se guardó localmente en tu navegador.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargarOficial = async () => {
    try {
      const response = await comiteTecnicoService.descargarRubricaExcel(propuestaId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rubrica_Oficial_${rubricaData.codigoPropuesta || propuestaId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      alert('Excel oficial descargado correctamente.');
    } catch (err) {
      console.error('Error al descargar Excel:', err);
      const msg = err.response?.data?.detail || err.message || 'Error desconocido';
      alert('Error al generar el Excel: ' + msg);
    }
  };

  const handleCargarOficial = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const resultado = await importarExcelOficial(file, rubricaData);
      if (resultado.errores && resultado.errores.length > 0) {
        alert(`Hubo ${resultado.errores.length} errores de formato:\n${resultado.errores.slice(0, 5).join('\n')}`);
      }

      if (resultado.criteriosProcesados > 0) {
        const evaluacionesValidas = {};
        const nivelesAPuntaje = { 'Deficiente': 0, 'Regular': 6, 'Bueno': 8, 'Excelente': 10 };

        Object.entries(resultado.evaluaciones).forEach(([criterioId, ev]) => {
          const criterioReal = rubricaData.estructuraRubrica.secciones
            .flatMap(s => s.criterios)
            .find(c => c.id === parseInt(criterioId));
          if (!criterioReal) return;

          let puntajeFinal = null;
          if (ev.nivel && nivelesAPuntaje[ev.nivel] !== undefined) {
            puntajeFinal = nivelesAPuntaje[ev.nivel];
          } else if (ev.puntaje !== undefined && ev.puntaje !== null) {
            const puntajeNum = parseFloat(ev.puntaje);
            if (!isNaN(puntajeNum) && puntajeNum >= 0 && puntajeNum <= 10) {
              puntajeFinal = puntajeNum;
            }
          }

          if (puntajeFinal !== null) {
            evaluacionesValidas[criterioId] = {
              ...ev,
              puntaje: puntajeFinal,
              nivel: ev.nivel || Object.keys(nivelesAPuntaje).find(key => nivelesAPuntaje[key] === puntajeFinal) || '',
              justificacionRequerida: puntajeFinal < 10 || criterioReal.es_requisito_obligatorio
            };
          }
        });

        const totalValidos = Object.keys(evaluacionesValidas).length;
        if (totalValidos > 0) {
          if (window.confirm(`Se encontraron ${totalValidos} de ${resultado.criteriosProcesados} criterios válidos. ¿Aplicar?`)) {
            setEvaluaciones(prev => ({ ...prev, ...evaluacionesValidas }));
            alert(`Rúbrica cargada: ${totalValidos} criterios aplicados.`);
          }
        } else {
          alert('No se encontraron criterios con puntajes válidos (0-10) en el archivo.');
        }
      } else {
        alert('No se encontraron criterios evaluados en el archivo.');
      }
    } catch (err) {
      console.error('Error al leer Excel:', err);
      alert('Error al leer el archivo. Verifica la consola (F12).');
    }
    e.target.value = '';
  };

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
    const criteriosObligatorios = rubricaData.estructuraRubrica.secciones
      .flatMap(s => s.criterios)
      .filter(c => c.es_requisito_obligatorio);
    
    const criteriosSinEvaluar = criteriosObligatorios.filter(c => !evaluaciones[c.id]);
    
    if (criteriosSinEvaluar.length > 0) {
      alert(`Faltan ${criteriosSinEvaluar.length} criterios obligatorios por evaluar.`);
      return;
    }

    if (!window.confirm('¿Enviar evaluación final? Esta acción no se puede deshacer.')) return;

    try {
      const detalles = Object.keys(evaluaciones).map(cid => ({
        criterioId: parseInt(cid),
        puntaje: parseFloat(evaluaciones[cid].puntaje),
        justificacion: evaluaciones[cid].justificacion || 'Sin justificación adicional.'
      }));

      const payload = {
        detalles,
        calificacionFinal: parseFloat(calificacion.toFixed(2)),
        recomienda: calificacion >= 0.70 && productosCumple,
        observaciones: ''
      };

      await comiteTecnicoService.enviarEvaluacion(propuestaId, payload);
      alert('Evaluación enviada y guardada correctamente.');
      navigate('/comite-tecnico/bandeja-evaluacion');
    } catch (err) {
      console.error('Error al enviar evaluación:', err);
      const msg = err.response?.data?.detail || 'Error desconocido';
      alert(`Error al enviar evaluación: ${msg}`);
    }
  };

  const irAnterior = () => { if (pasoActual > 0) setPasoActual(pasoActual - 1); };
  const irSiguiente = () => { if (pasoActual < 9) setPasoActual(pasoActual + 1); };

  if (cargando) {
    return (
      <div className="rubrica-loading">
        <div className="spinner"></div>
        <p role="status">Cargando rúbrica...</p>
      </div>
    );
  }

  if (!rubricaData) {
    return (
      <div className="rubrica-error" role="alert">
        <p>No se pudo cargar la rúbrica</p>
        <button className="btn-volver" onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')}>Volver</button>
      </div>
    );
  }

  const totalPasos = 10;
  const progresoTotal = ((pasoActual + 1) / totalPasos) * 100;
  const seccionActual = rubricaData.estructuraRubrica.secciones[pasoActual];

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
                    <span className="obligatorio-badge">
                      <IconAlert /> Requisito Obligatorio
                    </span>
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
          <strong>ATENCIÓN:</strong> {seccionProductos.advertencia}
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
            <small className="producto-help">Indique la suma total de horas semanales (<SiglaVie /> + VIE-Centros + REC + CONS + DOC + VIESA)</small>
          </div>
          <div className="producto-info-item">
            <label className="producto-label">Mínimo de productos requeridos</label>
            <div className="producto-valor-display">{rubricaData.minimoProductosRequeridos || 0} producto(s)</div>
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

            {esDesarrolloTecnologico && (
              <>
                <h4 className="subtipo-titulo" style={{marginTop: '20px', width: '100%'}}>1. Producto de propiedad industrial OBLIGATORIO</h4>
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
                
                <h4 className="subtipo-titulo" style={{marginTop: '20px', width: '100%'}}>2. Productos académicos adicionales</h4>
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

        <div className={`cumplimiento-productos ${productosCumple ? 'cumple' : 'no-cumple'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <strong>¿Cumple con el mínimo según las horas asignadas?</strong>
          {productosCumple ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><IconCheck /> CUMPLE con los requisitos mínimos de productos. La propuesta puede continuar su revisión.</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><IconCross /> NO CUMPLE con los requisitos mínimos. La propuesta debe ser RECHAZADA por el Comité Técnico.</span>
          )}
        </div>
      </div>
    );
  };

  const renderizarResumen = () => (
    <div className="seccion-resumen">
      <div className="seccion-header">
        <h2 className="seccion-titulo">10. RESUMEN Y ENVÍO DE EVALUACIÓN</h2>
      </div>

      <div className="resumen-calificaciones">
        <h3 className="resumen-titulo">Resumen de calificaciones por sección</h3>
        <table className="tabla-resumen">
          <caption className="sr-only">Resumen de calificaciones por sección</caption>
          <thead>
            <tr>
              <th scope="col">Sección</th>
              <th scope="col">Nota</th>
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
        <ul className="lista-requisitos-verificacion" style={{ listStyle: 'none', padding: 0 }}>
          {rubricaData.estructuraRubrica.secciones.flatMap(s => s.criterios)
            .filter(c => c.es_requisito_obligatorio)
            .map(c => {
              const ev = evaluaciones[c.id];
              const cumple = ev && ev.puntaje >= 8;
              return (
                <li key={c.id} className={cumple ? 'cumple' : 'no-cumple'} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {cumple ? <IconCheck /> : <IconCross />} {c.nombre}
                </li>
              );
            })}
          <li className={productosCumple ? 'cumple' : 'no-cumple'} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {productosCumple ? <IconCheck /> : <IconCross />} Productos académicos suficientes
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="rubrica-container">
      {/* ESTILOS DE ALTO CONTRASTE ESPECÍFICOS PARA ESTA PÁGINA */}
      <style>{`
        .high-contrast-mode .btn-excel-descargar,
        .high-contrast-mode .btn-excel-cargar {
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .obligatorio-badge {
          background: #000000 !important;
          color: #ffff00 !important;
          border: 2px solid #ffff00 !important;
        }
        .high-contrast-mode .peso-badge {
          background: #000000 !important;
          color: #ffffff !important;
          border: 1px solid #ffffff !important;
        }
        .high-contrast-mode .cumple {
          color: #00ff00 !important;
          font-weight: bold !important;
        }
        .high-contrast-mode .no-cumple {
          color: #ff0000 !important;
          font-weight: bold !important;
        }
        .high-contrast-mode .nivel-card.selected {
          border: 3px solid #ffff00 !important;
          background: #000000 !important;
          color: #ffffff !important;
        }
        .high-contrast-mode .calificacion-final-box.recomienda {
          background: #000000 !important;
          border: 3px solid #00ff00 !important;
          color: #00ff00 !important;
        }
        .high-contrast-mode .calificacion-final-box.no-recomienda {
          background: #000000 !important;
          border: 3px solid #ff0000 !important;
          color: #ff0000 !important;
        }
        .high-contrast-mode .nav-item.active {
          background: #ffff00 !important;
          color: #000000 !important;
          font-weight: bold !important;
        }
      `}</style>

      <header className="rubrica-header">
        <div className="header-left">
          <h1 className="header-title">Rúbrica-02 Digital</h1>
          <p className="header-subtitle">{rubricaData.titulo}</p>
          <div className="header-tags">
            <span className="tag">{rubricaData.codigoPropuesta}</span>
            <span className="tag">{rubricaData.nombreRubrica}</span>
          </div>
        </div>
        
        <div className="header-right" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={handleDescargarOficial}
            className="btn-excel-descargar"
            style={{ 
              padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', 
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', 
              display: 'flex', alignItems: 'center', gap: '6px' 
            }}
            title="Descargar rúbrica en formato Excel oficial"
          >
            <IconDownload /> Descargar Excel
          </button>
          
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={handleCargarOficial} 
            id="file-upload-excel" 
            style={{ display: 'none' }} 
          />
          <label 
            htmlFor="file-upload-excel" 
            className="btn-excel-cargar"
            style={{ 
              padding: '8px 14px', background: '#0369A1', color: 'white', borderRadius: '6px', 
              cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', 
              alignItems: 'center', gap: '6px' 
            }}
            title="Cargar rúbrica completada en Excel"
          >
            <IconUpload /> Cargar Excel
          </label>

          <div className="calificacion-box">
            <span className="cal-label">Calificación</span>
            <span className={`cal-valor ${calificacion >= 0.70 ? 'ok' : 'mal'}`}>
              {(calificacion * 100).toFixed(1)}%
            </span>
          </div>
          <button className="btn-volver-header" onClick={() => navigate('/comite-tecnico/bandeja-evaluacion')}>
            Volver
          </button>
        </div>
      </header>

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

      <div className="rubrica-layout-3col">
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
                  <span className="nav-icon">{completada ? <IconCheck /> : idx + 1}</span>
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
              <span className="nav-icon nav-icon-special"><IconBook /></span>
              <div className="nav-text">
                <span className="nav-nombre">Productos Académicos</span>
                <span className="nav-peso">No sumativa</span>
              </div>
            </button>
            
            <button
              className={`nav-item ${pasoActual === 9 ? 'active' : ''}`}
              onClick={() => setPasoActual(9)}
            >
              <span className="nav-icon nav-icon-special"><IconClipboard /></span>
              <div className="nav-text">
                <span className="nav-nombre">Resumen y Envío</span>
                <span className="nav-peso">Final</span>
              </div>
            </button>
          </nav>
        </aside>

        <main className="main-content">
          <div className="content-card">
            <AnalisisIA 
              propuestaId={propuestaId}
              rubricaData={rubricaData}
              onAplicarSugerencias={(sugerencias) => {
                const normalizar = (str) => {
                  if (!str || typeof str !== 'string') return '';
                  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                };

                const encontrarMejorCriterio = (nombreIA, criteriosSeccion) => {
                  const palabrasIA = normalizar(nombreIA).split(/\s+/).filter(p => p.length > 2);
                  const palabrasIgnorar = ['de', 'la', 'el', 'las', 'los', 'un', 'una', 'y', 'o', 'a', 'con', 'por', 'para', 'en', 'del', 'al', 'se', 'su', 'es', 'son'];
                  let mejorCriterio = null;
                  let maxOverlap = 0;

                  for (const c of criteriosSeccion) {
                    const nombreBD = normalizar(c.nombre);
                    const palabrasBD = nombreBD.split(/\s+/).filter(p => p.length > 2 && !palabrasIgnorar.includes(p));
                    const overlap = palabrasIA.filter(p => !palabrasIgnorar.includes(p) && palabrasBD.includes(p)).length;
                    
                    if (nombreBD.includes(normalizar(nombreIA)) || normalizar(nombreIA).includes(nombreBD) || overlap >= 2) {
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
                  const seccionRubrica = rubricaData.estructuraRubrica.secciones.find(s => s.id === parseInt(seccionId));
                  if (!seccionRubrica) return;

                  seccionData.criterios.forEach((criterioEval) => {
                    if (!criterioEval.criterio || !criterioEval.puntaje) {
                      omitidos++;
                      return;
                    }

                    const criterioRubrica = encontrarMejorCriterio(criterioEval.criterio, seccionRubrica.criterios);
                    if (criterioRubrica) {
                      handleSeleccionar(criterioRubrica.id, criterioEval.nivel || 'Bueno', criterioEval.puntaje);
                      handleJustificacion(criterioRubrica.id, criterioEval.justificacion || "Justificación generada por IA.");
                      aplicados++;
                    } else {
                      omitidos++;
                    }
                  });
                });
                
                alert(`Aplicados: ${aplicados} | Omitidos: ${omitidos}\nRevisa los campos.`);
              }}
            />
            
            {pasoActual < 8 && renderizarSeccionEvaluacion()}
            {pasoActual === 8 && renderizarProductos()}
            {pasoActual === 9 && renderizarResumen()}

            {/* ✅ BARRA DE NAVEGACIÓN ACTUALIZADA CON BOTÓN DE GUARDAR BORRADOR */}
            <div className="navegacion-inferior" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn-nav" onClick={irAnterior} disabled={pasoActual === 0}>Anterior</button>
                <span className="nav-counter">Paso {pasoActual + 1} de {totalPasos}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn-form-nav btn-outline" 
                  onClick={guardarBorrador} 
                  disabled={guardando}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Borrador'}
                </button>
                
                {pasoActual < 9 ? (
                  <button className="btn-siguiente" onClick={irSiguiente}>Siguiente</button>
                ) : (
                  <button className="btn-enviar" onClick={enviarEvaluacion} disabled={guardando}>
                    Enviar Evaluación Final
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="panel-derecho">
          <PanelDocumentos propuestaId={propuestaId} />
        </aside>
      </div>

      {pdfAbierto && (
        <PDFViewer 
          url={pdfAbierto.url} 
          titulo={pdfAbierto.titulo} 
          onClose={() => setPdfAbierto(null)} 
        />
      )}
    </div>
  );
}