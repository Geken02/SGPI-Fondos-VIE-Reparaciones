import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propuestaService } from '../services/propuestaService';
import { LimitedInput, LimitedTextarea } from '../components/LimitedInput';
import { exportarPresupuestoExcel } from '../utils/exportUtils';

const CATALOGO_OG = [
  { codigo: '6-02-03-03', detalle: 'Becas estudiante asistente especial', categoria: 'Becas', esAsistencia: true, rubroId: 9 },
  { codigo: '1-05-02-01', detalle: 'Viáticos dentro del país (Equipo TEC)', categoria: 'Servicios', esAsistencia: false, rubroId: 3 },
  { codigo: '2-01-99-01', detalle: 'Otros productos químicos y reactivos', categoria: 'Materiales', esAsistencia: false, rubroId: 4 },
  { codigo: '5-01-05-01', detalle: 'Equipo sanitario, de lab e investigación', categoria: 'Equipo', esAsistencia: false, rubroId: 8 },
  { codigo: '1-04-01-01', detalle: 'Servicios de gestión y software en la nube', categoria: 'Servicios', esAsistencia: false, rubroId: 6 },
  { codigo: '2-04-01-01', detalle: 'Materiales y suministros eléctricos / sensores', categoria: 'Materiales', esAsistencia: false, rubroId: 4 }
];

const PRESUPUESTO_INICIAL = {
  2027: [],
  2028: [],
  2029: []
};

const FormularioPresupuesto = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propuestaIdUrl = searchParams.get('propuestaId') || searchParams.get('id');

  const [propuesta, setPropuesta] = useState(null);
  const [anoActivo, setAnoActivo] = useState(2027);
  const [presupuestos, setPresupuestos] = useState(PRESUPUESTO_INICIAL);
  const [mostrarFormNuevaFila, setMostrarFormNuevaFila] = useState(false);

  // Estados de la calculadora de asistencia
  const [ogSeleccionado, setOgSeleccionado] = useState(CATALOGO_OG[0].codigo);
  const [numEstudiantes, setNumEstudiantes] = useState(1);
  const [horasMes, setHorasMes] = useState(20);
  const [meses, setMeses] = useState(10);
  const [montoManual, setMontoManual] = useState('');
  const [justificacionFila, setJustificacionFila] = useState('');

  const [guardadoMsg, setGuardadoMsg] = useState('Borrador listo para presupuestar');
  const [guardando, setGuardando] = useState(false);

  const storageKey = `propuesta_${propuestaIdUrl || 'temp'}_presupuesto`;

  // Cargar datos de la propuesta y presupuesto guardado
  useEffect(() => {
    const cargarDatos = async () => {
      let id = propuestaIdUrl;
      if (!id) {
        id = localStorage.getItem('propuesta_activa_id');
        if (!id) {
          try {
            const misProps = await propuestaService.obtenerMisPropuestas();
            if (misProps && misProps.length > 0) {
              id = String(misProps[0].propuestaId);
              localStorage.setItem('propuesta_activa_id', id);
            }
          } catch (_e) {}
        }
        if (id) {
          navigate(`/dashboard/presupuesto?propuestaId=${id}`, { replace: true });
        }
      }

      const activeKey = `propuesta_${id || 'temp'}_presupuesto`;
      let datosLocales = null;
      try {
        const localRaw = localStorage.getItem(activeKey);
        if (localRaw) {
          datosLocales = JSON.parse(localRaw);
          const tieneFilas = Object.values(datosLocales).some(arr => Array.isArray(arr) && arr.length > 0);
          if (tieneFilas) {
            setPresupuestos(datosLocales);
            setGuardadoMsg('Borrador cargado');
          }
        }
      } catch (_err) {
        console.warn('Error leyendo presupuesto local:', _err);
      }

      if (id) {
        localStorage.setItem('propuesta_activa_id', String(id));
        try {
          const propData = await propuestaService.obtenerPropuesta(id);
          if (propData) {
            setPropuesta(propData);

            const tieneFilasLocales = datosLocales && Object.values(datosLocales).some(arr => Array.isArray(arr) && arr.length > 0);
            // Si no haba guardado en localStorage pero s en la base de datos
            if (!tieneFilasLocales && propData.presupuesto && propData.presupuesto.length > 0) {
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
                  justificacion: 'Rubro presupuestado registrado en el sistema',
                  categoria: catObj.categoria,
                  rubroId: item.rubroId
                });
              });
              setPresupuestos(transformado);
              localStorage.setItem(activeKey, JSON.stringify(transformado));
              setGuardadoMsg('Sincronizado con BD');
            }
          }
        } catch (err) {
          console.warn('No se pudo cargar la propuesta desde el backend:', err);
        }
      }
    };

    cargarDatos();
  }, [propuestaIdUrl, storageKey]);

  // Guardar en localStorage de forma reactiva
  const persistirPresupuestos = (nuevosPresupuestos) => {
    setPresupuestos(nuevosPresupuestos);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nuevosPresupuestos));
    } catch (_err) {
      console.warn('Error persistiendo presupuestos:', _err);
    }
  };

  // Calcular subtotal de asistencia si aplica
  const ogActualObj = CATALOGO_OG.find(item => item.codigo === ogSeleccionado) || CATALOGO_OG[0];
  const subtotalCalculado = ogActualObj.esAsistencia ? (numEstudiantes * horasMes * meses * 2400) : Number(montoManual || 0);

  // Filas del año activo
  const filasActuales = presupuestos[anoActivo] || [];

  // Calcular totales por categoría para el año activo
  const totalServicios = filasActuales.filter(f => f.categoria === 'Servicios').reduce((acc, f) => acc + f.monto, 0);
  const totalMateriales = filasActuales.filter(f => f.categoria === 'Materiales').reduce((acc, f) => acc + f.monto, 0);
  const totalBecas = filasActuales.filter(f => f.categoria === 'Becas').reduce((acc, f) => acc + f.monto, 0);
  const totalEquipo = filasActuales.filter(f => f.categoria === 'Equipo').reduce((acc, f) => acc + f.monto, 0);
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

    const updated = {
      ...presupuestos,
      [anoActivo]: [...filasActuales, nueva]
    };

    persistirPresupuestos(updated);
    setMostrarFormNuevaFila(false);
    setJustificacionFila('');
    setMontoManual('');
    setGuardadoMsg('Partida guardada ' + new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleEliminarFila = (id) => {
    const updated = {
      ...presupuestos,
      [anoActivo]: filasActuales.filter(f => f.id !== id)
    };
    persistirPresupuestos(updated);
    setGuardadoMsg('Cambios guardados ' + new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleGuardarBorrador = async () => {
    setGuardando(true);
    const id = propuestaIdUrl || localStorage.getItem('propuesta_activa_id');
    const activeKey = `propuesta_${id || 'temp'}_presupuesto`;

    try {
      localStorage.setItem(activeKey, JSON.stringify(presupuestos));
      localStorage.setItem('propuesta_presupuesto_ultimo', JSON.stringify(presupuestos));
    } catch (_err) {
      console.warn(_err);
    }

    // Sincronizar en base de datos si existe id
    if (id) {
      try {
        const payload = [];
        Object.entries(presupuestos).forEach(([anio, filas]) => {
          (filas || []).forEach(f => {
            payload.push({
              rubroId: f.rubroId || (CATALOGO_OG.find(c => c.codigo === f.codigo)?.rubroId || 1),
              montoSolicitado: Number(f.monto) || 0,
              anioEjecucion: Number(anio),
              esDuradero: f.categoria === 'Equipo'
            });
          });
        });
        await propuestaService.guardarPresupuestoCompleto(id, payload);
        window.dispatchEvent(new Event('propuestaCreada'));
      } catch (err) {
        console.warn('Error al guardar presupuesto en el backend:', err);
      }
    }

    const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    setGuardadoMsg('Guardado');
    setGuardando(false);
    alert('¡Borrador del Presupuesto Operativo (Formulario 06) guardado con éxito!');
  };

  const handleEnviarPresupuesto = async () => {
    const totalRubros = Object.values(presupuestos).reduce((acc, curr) => acc + (curr?.length || 0), 0);
    if (totalRubros === 0) {
      alert('Por favor agregue al menos un objeto de gasto antes de enviar el presupuesto a la VIE.');
      return;
    }

    setGuardando(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(presupuestos));
    } catch (_e) {}

    if (propuestaIdUrl) {
      localStorage.setItem(`propuesta_${propuestaIdUrl}_form06_enviado`, 'true');

      try {
        const payload = [];
        Object.entries(presupuestos).forEach(([anio, filas]) => {
          (filas || []).forEach(f => {
            payload.push({
              rubroId: f.rubroId || (CATALOGO_OG.find(c => c.codigo === f.codigo)?.rubroId || 1),
              montoSolicitado: Number(f.monto) || 0,
              anioEjecucion: Number(anio),
              esDuradero: f.categoria === 'Equipo'
            });
          });
        });
        await propuestaService.guardarPresupuestoCompleto(propuestaIdUrl, payload);
      } catch (err) {
        console.warn('Error al persistir presupuesto en la BD:', err);
      }
    }

    window.dispatchEvent(new Event('propuestaCreada'));

    setTimeout(() => {
      alert('¡Presupuesto Operativo (Formulario 06) enviado exitosamente a la VIE!');
      setGuardando(false);
      navigate('/dashboard/propuestas');
    }, 450);
  };

  const handleExportarExcel = async () => {
    await exportarPresupuestoExcel(presupuestos, propuesta, usuario);
  };

  return (
    <div className="formulario-proyecto-master-wrapper">
      {/* Header Institucional */}
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
        {/* Encabezado del Proyecto Seleccionado */}
        <div className="presupuesto-project-header">
          <div>
            <span className="project-badge-tag">PROYECTO SELECCIONADO</span>
            <h1 className="presupuesto-project-title">
              {propuesta?.titulo || 'Evaluación del Impacto Bioclimático en la Región Central'}
            </h1>
          </div>
          <div className="regimen-badge">
            {propuesta?.codigoPropuesta ? `Código: ${propuesta.codigoPropuesta}` : 'Régimen: Consolidado 2 (hasta 20 h)'}
          </div>
        </div>

        {/* Tabs de Años */}
        <div className="presupuesto-years-tabs">
          <button 
            type="button" 
            className={`tab-year-btn ${anoActivo === 2027 ? 'active' : ''}`}
            onClick={() => setAnoActivo(2027)}
          >
            ★ Año 1 (2027)
          </button>
          <button 
            type="button" 
            className={`tab-year-btn ${anoActivo === 2028 ? 'active' : ''}`}
            onClick={() => setAnoActivo(2028)}
          >
            Año 2 (2028)
          </button>
          <button 
            type="button" 
            className={`tab-year-btn ${anoActivo === 2029 ? 'active' : ''}`}
            onClick={() => setAnoActivo(2029)}
          >
            Año 3 (2029)
          </button>
          <button 
            type="button" 
            className="tab-year-btn"
            onClick={() => alert(`Resumen Trienal Consolidado:
Año 1 (2027): ₡ ${((presupuestos[2027] || []).reduce((a, b) => a + b.monto, 0)).toLocaleString('es-CR')}
Año 2 (2028): ₡ ${((presupuestos[2028] || []).reduce((a, b) => a + b.monto, 0)).toLocaleString('es-CR')}
Año 3 (2029): ₡ ${((presupuestos[2029] || []).reduce((a, b) => a + b.monto, 0)).toLocaleString('es-CR')}
Total Trienal Solicitado: ₡ ${Object.values(presupuestos).flat().reduce((a, b) => a + b.monto, 0).toLocaleString('es-CR')}`)}
          >
            Resumen Trienal Total
          </button>
        </div>

        {/* Tabla de Rubros Actuales */}
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
                    <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                      No hay objetos de gasto registrados para el año {anoActivo}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                      Haz clic en <strong>+ AGREGAR NUEVO OBJETO DE GASTO</strong> para comenzar a presupuestar partidas.
                    </div>
                  </td>
                </tr>
              ) : (
                filasActuales.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="propuesta-codigo-pill">{f.codigo}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#002855' }}>{f.detalle}</td>
                    <td style={{ fontWeight: 700, color: '#0369A1', fontSize: '15px' }}>
                      ₡ {Number(f.monto || 0).toLocaleString('es-CR')},00
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>{f.justificacion}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        className="btn-icon-action btn-icon-delete"
                        onClick={() => handleEliminarFila(f.id)}
                        title="Eliminar partida"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Botón para Desplegar Formulario de Nueva Fila */}
        {!mostrarFormNuevaFila && (
          <button 
            type="button" 
            className="btn-dashed-add-row"
            onClick={() => setMostrarFormNuevaFila(true)}
          >
            + AGREGAR NUEVO OBJETO DE GASTO (NUEVA FILA)
          </button>
        )}

        {/* Formulario de Nueva Fila Expandible */}
        {mostrarFormNuevaFila && (
          <div className="new-expense-card-panel">
            <div className="new-expense-header">
              + FORMULARIO DE NUEVA FILA — SELECCIÓN DE OBJETO DE GASTO (OG)
            </div>

            <form onSubmit={handleInsertarFila} style={{ padding: '20px' }}>
              <div className="modal-form-group">
                <label className="modal-form-label">1. SELECCIONAR OBJETO DE GASTO (CATÁLOGO VIE):</label>
                <select 
                  className="modal-form-select"
                  value={ogSeleccionado}
                  onChange={(e) => setOgSeleccionado(e.target.value)}
                >
                  {CATALOGO_OG.map(item => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.codigo} — {item.detalle} ({item.categoria})
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculadora automática de asistencia si el rubro es de becas/asistencia */}
              {ogActualObj.esAsistencia ? (
                <div className="auto-calc-box">
                  <div className="calc-title">
                    CALCULADORA AUTOMÁTICA DE ASISTENCIA ESTUDIANTIL (TARIFA VIE ₡2.400/HORA):
                  </div>
                  <div className="calc-inputs-row">
                    <div>
                      <span className="calc-label">Estudiantes:</span>
                      <LimitedInput 
                        type="number" 
                        min="1" 
                        max="10"
                        showCounter={false}
                        className="form-table-input"
                        value={numEstudiantes}
                        onChange={(e) => setNumEstudiantes(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div>
                      <span className="calc-label">Horas/Mes:</span>
                      <LimitedInput 
                        type="number" 
                        min="1" 
                        max="40"
                        showCounter={false}
                        className="form-table-input"
                        value={horasMes}
                        onChange={(e) => setHorasMes(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div>
                      <span className="calc-label">Meses (Máx 10):</span>
                      <LimitedInput 
                        type="number" 
                        min="1" 
                        max="10"
                        showCounter={false}
                        className="form-table-input"
                        value={meses}
                        onChange={(e) => setMeses(Math.min(10, Math.max(1, Number(e.target.value))))}
                      />
                    </div>
                    <div className="subtotal-calc-display">
                      <span className="calc-label">Subtotal Calculado:</span>
                      <span className="calc-amount">₡ {subtotalCalculado.toLocaleString('es-CR')},00</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="modal-form-group">
                  <LimitedInput 
                    label="Monto Estimado Solicitado (₡)"
                    type="number" 
                    step="50000"
                    min="0"
                    required
                    showCounter={false}
                    className="modal-form-input"
                    value={montoManual}
                    onChange={(e) => setMontoManual(Math.max(0, Number(e.target.value) || 0))}
                  />
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
                  ✔ Insertar Fila
                </button>
                <button 
                  type="button" 
                  className="btn-proposal-action btn-outline"
                  onClick={() => setMostrarFormNuevaFila(false)}
                >
                  ✖ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Barra de Resumen por Categorías y Gran Total */}
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

        {/* Botones Inferiores de Acción */}
        <div className="form-footer-action-bar">
          <div className="footer-left">
            <button 
              type="button" 
              className="btn-form-nav btn-outline"
              onClick={handleExportarExcel}
            >
              📊 Exportar Excel
            </button>
          </div>
          <div className="footer-center">
            <button 
              type="button" 
              className="btn-form-nav btn-outline"
              onClick={handleGuardarBorrador}
              disabled={guardando}
            >
              Guardar Borrador
            </button>
          </div>
          <div className="footer-right">
            <button 
              type="button" 
              className="btn-form-nav btn-primary"
              onClick={handleEnviarPresupuesto}
              disabled={guardando}
            >
              Enviar Presupuesto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormularioPresupuesto;