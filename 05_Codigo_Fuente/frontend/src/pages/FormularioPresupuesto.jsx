import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput, LimitedTextarea } from '../components/LimitedInput';
import { exportarPresupuestoExcel } from '../utils/exportUtils';
import IconoCie from '../components/cie/IconoCie';

const CATALOGO_OG = [
  { codigo: '6-02-03-03', detalle: 'Becas estudiante asistente especial', categoria: 'Becas', esAsistencia: true, rubroId: 9 },
  { codigo: '1-05-02-01', detalle: 'Viáticos dentro del país (Equipo TEC)', categoria: 'Servicios', esAsistencia: false, rubroId: 3 },
  { codigo: '2-01-99-01', detalle: 'Otros productos químicos y reactivos', categoria: 'Materiales', esAsistencia: false, rubroId: 4 },
  { codigo: '5-01-05-01', detalle: 'Equipo sanitario, de lab e investigación', categoria: 'Equipo', esAsistencia: false, rubroId: 8 },
  { codigo: '1-04-01-01', detalle: 'Servicios de gestión y software en la nube', categoria: 'Servicios', esAsistencia: false, rubroId: 6 },
  { codigo: '2-04-01-01', detalle: 'Materiales y suministros eléctricos / sensores', categoria: 'Materiales', esAsistencia: false, rubroId: 4 }
];

const PRESUPUESTO_INICIAL = { 2027: [], 2028: [], 2029: [] };

const FormularioPresupuesto = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propuestaIdUrl = searchParams.get('propuestaId') || searchParams.get('id');

  const [propuesta, setPropuesta] = useState(null);
  const [anoActivo, setAnoActivo] = useState(2027);
  const [presupuestos, setPresupuestos] = useState(PRESUPUESTO_INICIAL);
  const [mostrarFormNuevaFila, setMostrarFormNuevaFila] = useState(false);

  const [ogSeleccionado, setOgSeleccionado] = useState(CATALOGO_OG[0].codigo);
  const [numEstudiantes, setNumEstudiantes] = useState(1);
  const [horasMes, setHorasMes] = useState(20);
  const [meses, setMeses] = useState(10);
  const [montoManual, setMontoManual] = useState('');
  const [justificacionFila, setJustificacionFila] = useState('');

  const [guardadoMsg, setGuardadoMsg] = useState('Cargando datos...');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      let id = propuestaIdUrl;
      if (!id) {
        id = localStorage.getItem('propuesta_activa_id');
        if (!id) {
          try {
            const misProps = await propuestaService.listarMisPropuestas();
            if (misProps && misProps.length > 0) {
              id = String(misProps[0].propuestaId);
              localStorage.setItem('propuesta_activa_id', id);
            }
          } catch (_e) {}
        }
        if (id) navigate(`/dashboard/presupuesto?propuestaId=${id}`, { replace: true });
      }

      if (!id) return;
      localStorage.setItem('propuesta_activa_id', String(id));
      setGuardadoMsg('Cargando datos...');

      let datosDB = null;
      let datosLocal = null;

      // 1. Intentar leer de la BD primero (Fuente de verdad)
      try {
        const propData = await propuestaService.obtenerPropuesta(id);
        if (propData) {
          setPropuesta(propData);
          if (propData.presupuesto && propData.presupuesto.length > 0) {
            const transformado = { 2027: [], 2028: [], 2029: [] };
            propData.presupuesto.forEach((item) => {
              const anio = item.anioEjecucion || 2027;
              if (!transformado[anio]) transformado[anio] = [];
              const catObj = CATALOGO_OG.find(c => c.rubroId === item.rubroId) || CATALOGO_OG[0];
              transformado[anio].push({
                id: item.presupuestoId || (Date.now() + Math.random()),
                codigo: catObj.codigo,
                detalle: catObj.detalle,
                monto: Number(item.montoSolicitado) || 0,
                justificacion: item.justificacion || 'Rubro presupuestado desde el sistema',
                categoria: catObj.categoria,
                rubroId: item.rubroId
              });
            });
            datosDB = transformado;
          }
        }
      } catch (err) { 
        console.warn('No se pudo cargar la propuesta desde el backend:', err); 
      }

      // 2. Leer LocalStorage (Solo como fallback si la BD está vacía)
      try {
        const localRaw = localStorage.getItem(`propuesta_${id}_presupuesto`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          const tieneDatosReales = Object.values(parsed).some(arr => 
            Array.isArray(arr) && arr.some(f => Number(f.monto) > 0 && (f.detalle || '').trim() !== '')
          );
          if (tieneDatosReales) {
            datosLocal = parsed;
          }
        }
      } catch (err) { 
        console.warn('Error leyendo presupuesto local:', err); 
      }

      // 3. Decidir qué mostrar: DB gana, Local es fallback
      if (datosDB) {
        setPresupuestos(datosDB);
        setGuardadoMsg('Sincronizado con la Base de Datos');
        // Actualizar localStorage con los datos frescos de la BD para tener respaldo
        localStorage.setItem(`propuesta_${id}_presupuesto`, JSON.stringify(datosDB));
      } else if (datosLocal) {
        setPresupuestos(datosLocal);
        setGuardadoMsg('Borrador local cargado');
      } else {
        setPresupuestos(PRESUPUESTO_INICIAL);
        setGuardadoMsg('Listo para presupuestar');
      }
    };
    
    cargarDatos();
  }, [propuestaIdUrl, navigate]);

  useEffect(() => {
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    if (!id || id === 'undefined') return;

    const t = setTimeout(() => {
      try {
        localStorage.setItem(`propuesta_${id}_presupuesto`, JSON.stringify(presupuestos));
        setGuardadoMsg('Guardado local');
      } catch (err) { 
        console.warn('Error persistiendo presupuestos:', err); 
      }
    }, 1200);

    return () => clearTimeout(t);
  }, [presupuestos, propuestaIdUrl]);

  const ogActualObj = CATALOGO_OG.find(item => item.codigo === ogSeleccionado) || CATALOGO_OG[0];
  const subtotalCalculado = ogActualObj.esAsistencia ? (numEstudiantes * horasMes * meses * 2400) : Number(montoManual || 0);

  const filasActuales = presupuestos[anoActivo] || [];
  const totalServicios = filasActuales.filter(f => f.categoria === 'Servicios').reduce((acc, f) => acc + Number(f.monto || 0), 0);
  const totalMateriales = filasActuales.filter(f => f.categoria === 'Materiales').reduce((acc, f) => acc + Number(f.monto || 0), 0);
  const totalBecas = filasActuales.filter(f => f.categoria === 'Becas').reduce((acc, f) => acc + Number(f.monto || 0), 0);
  const totalEquipo = filasActuales.filter(f => f.categoria === 'Equipo').reduce((acc, f) => acc + Number(f.monto || 0), 0);
  const granTotalAno = totalServicios + totalMateriales + totalBecas + totalEquipo;

  const handleInsertarFila = (e) => {
    e.preventDefault();
    if (!justificacionFila.trim()) { 
      alert('Por favor ingrese una justificación técnica para el rubro.'); 
      return; 
    }
    if (subtotalCalculado <= 0) { 
      alert('El monto del objeto de gasto debe ser mayor a 0 colones.'); 
      return; 
    }

    const nueva = {
      id: Date.now(),
      codigo: ogActualObj.codigo,
      detalle: ogActualObj.detalle,
      monto: subtotalCalculado,
      justificacion: justificacionFila.trim(),
      categoria: ogActualObj.categoria,
      rubroId: ogActualObj.rubroId || 1
    };

    const updated = { ...presupuestos, [anoActivo]: [...filasActuales, nueva] };
    setPresupuestos(updated);
    setMostrarFormNuevaFila(false);
    setJustificacionFila('');
    setMontoManual('');
    setGuardadoMsg('Partida agregada (pendiente de guardar en BD)');
  };

  const handleEliminarFila = (id) => {
    if (!confirm('¿Está seguro de que desea eliminar esta fila del presupuesto?')) return;
    const updated = { ...presupuestos, [anoActivo]: filasActuales.filter(f => f.id !== id) };
    setPresupuestos(updated);
    setGuardadoMsg('Partida eliminada (pendiente de guardar en BD)');
  };

  const handleGuardarBorrador = async () => {
    setGuardando(true);
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');

    // 1. Guardar en LocalStorage
    try {
      localStorage.setItem(`propuesta_${id}_presupuesto`, JSON.stringify(presupuestos));
      localStorage.setItem('propuesta_presupuesto_ultimo', JSON.stringify(presupuestos));
    } catch (err) { 
      console.warn('Error en localStorage:', err); 
    }

    if (id) {
      try {
        // 2. Construir payload para la BD
        const payload = [];
        Object.entries(presupuestos).forEach(([anio, filas]) => {
          (filas || []).forEach(f => {
            payload.push({
              rubroId: f.rubroId || (CATALOGO_OG.find(c => c.codigo === f.codigo)?.rubroId || 1),
              montoSolicitado: Number(f.monto) || 0,
              anioEjecucion: Number(anio),
              esDuradero: f.categoria === 'Equipo',
              justificacion: f.justificacion || ''
            });
          });
        });

        // 3. Guardar en la BD
        await propuestaService.guardarPresupuestoCompleto(id, payload);
        setGuardadoMsg('Guardado en la Base de Datos');

        // 4. Subir Excel a Supabase
        try {
          const { generarBlobForm06Excel, subirBlobASupabase } = await import('../utils/exportUtils');
          const blob = await generarBlobForm06Excel(presupuestos, propuesta, usuario);
          if (blob && blob.size > 0) {
            await subirBlobASupabase(propuestaService, id, 3, blob, `Form06_${id}.xlsx`);
          }
        } catch (err) {
          console.warn('No se pudo subir Form-06 a Supabase:', err);
        }

        window.dispatchEvent(new Event('propuestaCreada'));
        alert('¡Borrador del Presupuesto Operativo (Formulario 06) guardado con éxito!');
      } catch (err) {
        console.warn('Error al guardar presupuesto en el backend:', err);
        setGuardadoMsg('Error al guardar');
        alert('No se pudo guardar el Presupuesto en la base de datos. Verifique su conexión.');
      }
    }
    
    setGuardando(false);
  };

  const handleEnviarPresupuesto = async () => {
    const totalRubros = Object.values(presupuestos).reduce((acc, curr) => acc + (curr?.length || 0), 0);
    if (totalRubros === 0) {
      alert('Por favor agregue al menos un objeto de gasto antes de enviar el presupuesto a la VIE.');
      return;
    }

    setGuardando(true);
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    
    try { localStorage.setItem(`propuesta_${id}_presupuesto`, JSON.stringify(presupuestos)); } catch (_e) {}

    if (id) {
      localStorage.setItem(`propuesta_${id}_form06_enviado`, 'true');
      try {
        const payload = [];
        Object.entries(presupuestos).forEach(([anio, filas]) => {
          (filas || []).forEach(f => {
            payload.push({
              rubroId: f.rubroId || (CATALOGO_OG.find(c => c.codigo === f.codigo)?.rubroId || 1),
              montoSolicitado: Number(f.monto) || 0,
              anioEjecucion: Number(anio),
              esDuradero: f.categoria === 'Equipo',
              justificacion: f.justificacion || ''
            });
          });
        });

        await propuestaService.guardarPresupuestoCompleto(id, payload);

        try {
          const { generarBlobForm06Excel, subirBlobASupabase } = await import('../utils/exportUtils');
          const blob = await generarBlobForm06Excel(presupuestos, propuesta, usuario);
          if (blob && blob.size > 0) {
            await subirBlobASupabase(propuestaService, id, 3, blob, `Form06_${id}.xlsx`);
          }
        } catch (err) {
          console.warn('⚠️ No se pudo subir Form-06 a Supabase al enviar:', err);
        }

        window.dispatchEvent(new Event('propuestaCreada'));
        alert('¡Presupuesto Operativo (Formulario 06) enviado exitosamente!');
        navigate('/dashboard/propuestas');
      } catch (err) {
        console.warn('Error al persistir presupuesto en la BD:', err);
        alert('No se pudo persistir el Presupuesto en la base de datos. Intente nuevamente.');
      }
    }
    setGuardando(false);
  };

  const handleExportarExcel = async () => {
    await exportarPresupuestoExcel(presupuestos, propuesta, usuario);
  };

  return (
    <div className="formulario-proyecto-master-wrapper">
      <div className="form-top-banner">
        <div className="form-banner-left">
          <span className="form-banner-tec-title">TEC | SGPI — Módulo de Formulación Presupuestaria (VIE 2027-2029)</span>
        </div>
        <div className="form-banner-right">
          <span className="autoguardado-badge">
            <span className="dot-pulse"></span>
            {guardando ? 'Guardando...' : guardadoMsg}
          </span>
        </div>
      </div>

      <div className="form-paper-container">
        <div className="presupuesto-project-header">
          <div>
            <span className="project-badge-tag">PROYECTO SELECCIONADO</span>
            <h1 className="presupuesto-project-title">{propuesta?.titulo || 'Cargando título del proyecto...'}</h1>
          </div>
          <div className="regimen-badge">{propuesta?.codigoPropuesta ? `Código: ${propuesta.codigoPropuesta}` : 'Régimen: Consolidado'}</div>
        </div>

        <div className="presupuesto-years-tabs">
          <button type="button" className={`tab-year-btn ${anoActivo === 2027 ? 'active' : ''}`} onClick={() => setAnoActivo(2027)}><IconoCie nombre="star" tamano={14} /> Año 1 (2027)</button>
          <button type="button" className={`tab-year-btn ${anoActivo === 2028 ? 'active' : ''}`} onClick={() => setAnoActivo(2028)}>Año 2 (2028)</button>
          <button type="button" className={`tab-year-btn ${anoActivo === 2029 ? 'active' : ''}`} onClick={() => setAnoActivo(2029)}>Año 3 (2029)</button>
          <button type="button" className="tab-year-btn" onClick={() => {
            const t27 = (presupuestos[2027] || []).reduce((a, b) => a + Number(b.monto || 0), 0);
            const t28 = (presupuestos[2028] || []).reduce((a, b) => a + Number(b.monto || 0), 0);
            const t29 = (presupuestos[2029] || []).reduce((a, b) => a + Number(b.monto || 0), 0);
            alert(`Resumen Trienal Consolidado:\n\nAño 1 (2027): ₡ ${t27.toLocaleString('es-CR')}\nAño 2 (2028): ₡ ${t28.toLocaleString('es-CR')}\nAño 3 (2029): ₡ ${t29.toLocaleString('es-CR')}\n\nTotal Trienal Solicitado: ₡ ${(t27 + t28 + t29).toLocaleString('es-CR')}`);
          }}>Resumen Trienal Total</button>
        </div>

        <div className="table-responsive-container" style={{ marginBottom: '16px' }}>
          <table className="institucional-data-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>CÓDIGO OG</th>
                <th style={{ width: '32%' }}>DETALLE DE OBJETO DE GASTO</th>
                <th style={{ width: '18%' }}>MONTO (₡)</th>
                <th>JUSTIFICACIÓN TÉCNICA</th>
                <th style={{ width: '6%', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {filasActuales.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px 20px', color: '#64748b' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>No hay objetos de gasto registrados para el año {anoActivo}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Haz clic en <strong>+ AGREGAR NUEVO OBJETO DE GASTO</strong> para comenzar a presupuestar partidas.</div>
                  </td>
                </tr>
              ) : (
                filasActuales.map((f) => (
                  <tr key={f.id}>
                    <td><span className="propuesta-codigo-pill">{f.codigo}</span></td>
                    <td className="og-detalle-cell"><strong>{f.detalle}</strong></td>
                    <td className="og-monto-cell">₡ {Number(f.monto || 0).toLocaleString('es-CR')},00</td>
                    <td className="og-justificacion-cell">{f.justificacion}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" className="btn-icon-action btn-icon-delete" onClick={() => handleEliminarFila(f.id)} title="Eliminar partida">
                        <IconoCie nombre="close" tamano={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!mostrarFormNuevaFila && (
          <button type="button" className="btn-dashed-add-row" onClick={() => setMostrarFormNuevaFila(true)}>+ AGREGAR NUEVO OBJETO DE GASTO (NUEVA FILA)</button>
        )}

        {mostrarFormNuevaFila && (
          <div className="new-expense-card-panel">
            <div className="new-expense-header">+ FORMULARIO DE NUEVA FILA — SELECCIÓN DE OBJETO DE GASTO (OG)</div>
            <form onSubmit={handleInsertarFila} style={{ padding: '20px' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">1. SELECCIONAR OBJETO DE GASTO (CATÁLOGO VIE):</label>
                <select className="modal-form-select" value={ogSeleccionado} onChange={(e) => setOgSeleccionado(e.target.value)}>
                  {CATALOGO_OG.map(item => (
                    <option key={item.codigo} value={item.codigo}>{item.codigo} — {item.detalle} ({item.categoria})</option>
                  ))}
                </select>
              </div>

              {ogActualObj.esAsistencia ? (
                <div className="auto-calc-box">
                  <div className="calc-title">CALCULADORA AUTOMÁTICA DE ASISTENCIA ESTUDIANTIL (TARIFA VIE ₡2.400/HORA):</div>
                  <div className="calc-inputs-row">
                    <div>
                      <span className="calc-label">Estudiantes:</span>
                      <LimitedInput type="number" min="1" max="10" showCounter={false} className="form-table-input" value={numEstudiantes} onChange={(e) => setNumEstudiantes(Math.max(1, Number(e.target.value)))} />
                    </div>
                    <div>
                      <span className="calc-label">Horas/Mes:</span>
                      <LimitedInput type="number" min="1" max="40" showCounter={false} className="form-table-input" value={horasMes} onChange={(e) => setHorasMes(Math.max(1, Number(e.target.value)))} />
                    </div>
                    <div>
                      <span className="calc-label">Meses (Máx 10):</span>
                      <LimitedInput type="number" min="1" max="10" showCounter={false} className="form-table-input" value={meses} onChange={(e) => setMeses(Math.min(10, Math.max(1, Number(e.target.value))))} />
                    </div>
                    <div className="subtotal-calc-display">
                      <span className="calc-label">Subtotal Calculado:</span>
                      <span className="calc-amount">₡ {subtotalCalculado.toLocaleString('es-CR')},00</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="modal-form-group">
                  <LimitedInput label="Monto Estimado Solicitado (₡)" type="text" required formatoMonto={true} showCounter={false} className="modal-form-input" value={montoManual} onChange={(e) => setMontoManual(e.target.value)} />
                </div>
              )}

              <div className="modal-form-group" style={{ marginTop: '16px' }}>
                <LimitedTextarea 
                  label="2. JUSTIFICACIÓN TÉCNICA Y OPERATIVA DE LA FILA:" 
                  rows={3} 
                  required 
                  maxLength={500} 
                  placeholder="Detalle la justificación técnica, número de beneficiarios, actividades o reactivos que amparan este gasto..." 
                  className="modal-form-input" 
                  style={{ resize: 'vertical' }} 
                  value={justificacionFila} 
                  onChange={(e) => setJustificacionFila(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="btn-nueva-propuesta">
                  <IconoCie nombre="check" tamano={14} /> Insertar Fila
                </button>
                <button type="button" className="btn-proposal-action btn-outline" onClick={() => { 
                  if (confirm('¿Está seguro de que desea cancelar? Se perderán los datos ingresados.')) {
                    setMostrarFormNuevaFila(false);
                    setJustificacionFila('');
                    setMontoManual('');
                  }
                }}>
                  <IconoCie nombre="close" tamano={14} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="presupuesto-summary-footer-box">
          <div className="categories-breakdown">
            <span>Servicios: <strong>₡ {totalServicios.toLocaleString('es-CR')}</strong></span>
            <span className="sep">•</span>
            <span>Materiales: <strong>₡ {totalMateriales.toLocaleString('es-CR')}</strong></span>
            <span className="sep">•</span>
            <span>Becas: <strong>₡ {totalBecas.toLocaleString('es-CR')}</strong></span>
            <span className="sep">•</span>
            <span>Equipo: <strong>₡ {totalEquipo.toLocaleString('es-CR')}</strong></span>
          </div>
          <div className="grand-total-amount">
            PRESUPUESTO TOTAL AÑO {anoActivo}: <strong>₡ {granTotalAno.toLocaleString('es-CR')},00</strong>
          </div>
        </div>

        <div className="form-footer-action-bar">
          <div className="footer-left">
            <button type="button" className="btn-form-nav btn-outline" onClick={handleExportarExcel}>
              <IconoCie nombre="barChart" tamano={14} /> Exportar Excel
            </button>
          </div>
          <div className="footer-center">
            <button type="button" className="btn-form-nav btn-outline" onClick={handleGuardarBorrador} disabled={guardando}>
              Guardar Borrador
            </button>
          </div>
          <div className="footer-right">
            <button type="button" className="btn-form-nav btn-primary" onClick={handleEnviarPresupuesto} disabled={guardando}>
              Enviar Presupuesto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormularioPresupuesto;