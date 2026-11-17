import { useState, useEffect } from 'react';

export default function SubsanacionModal({ isOpen, onClose, propuesta, onSubmit }) {
  const [detalle, setDetalle] = useState('');
  const [documentosFaltantes, setDocumentosFaltantes] = useState({
    form04: false,
    form05: false,
    form06: false,
    otros: false
  });

  // Detectar si el modo alto contraste está activo globalmente
  const [esAltoContraste, setEsAltoContraste] = useState(false);

  useEffect(() => {
    const verificarAltoContraste = () => {
      const tieneClase = typeof document !== 'undefined' && (
        document.body.classList.contains('high-contrast-mode') || 
        document.documentElement.classList.contains('high-contrast-mode')
      );
      const tieneStorage = typeof localStorage !== 'undefined' && localStorage.getItem('modoAltoContraste') === 'true';
      setEsAltoContraste(tieneClase || tieneStorage);
    };

    verificarAltoContraste();
    
    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(verificarAltoContraste);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!detalle.trim()) {
      alert('Por favor, detalle los documentos faltantes o correcciones requeridas');
      return;
    }
    onSubmit({ propuestaId: propuesta.propuestaId, detalle, documentosFaltantes, fechaSolicitud: new Date() });
    setDetalle('');
    setDocumentosFaltantes({ form04: false, form05: false, form06: false, otros: false });
    onClose();
  };

  const maxCaracteres = 2000;
  const caracteresRestantes = maxCaracteres - detalle.length;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: esAltoContraste ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 40, 85, 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      {/* Usamos las clases globales para que el CSS haga todo el trabajo pesado */}
      <div className="modal-content card" style={{
        maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto',
        padding: '24px', borderRadius: esAltoContraste ? '0px' : '8px'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: `1px solid var(--color-borde)`, paddingBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--color-texto-principal)' }}>
              Solicitar Subsanación
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-texto-secundario)' }}>
              Complete los documentos o correcciones requeridas
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="btn-outline"
            style={{ border: 'none', background: 'transparent', padding: '4px', fontSize: '24px', lineHeight: 1, color: 'var(--color-texto-secundario)' }}
          >
            ×
          </button>
        </div>

        {/* Info de la propuesta */}
        <div style={{ backgroundColor: 'var(--color-fondo)', padding: '16px', borderRadius: '6px', marginBottom: '24px', borderLeft: `4px solid var(--color-primario)` }}>
          <div style={{ fontSize: '12px', color: 'var(--color-texto-secundario)', marginBottom: '4px', fontWeight: '600' }}>Propuesta:</div>
          <div style={{ fontWeight: '700', color: 'var(--color-texto-principal)', marginBottom: '8px' }}>
            {propuesta.codigoPropuesta} - {propuesta.titulo}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-texto-secundario)' }}>Investigador: {propuesta.investigador}</div>
        </div>

        {/* Checklist de documentos */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '700', color: 'var(--color-texto-principal)', marginBottom: '12px', fontSize: '14px' }}>
            Documentos a subsanar:
          </label>
          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              { key: 'form04', label: 'Form-04 (Formulario de Proyecto)' },
              { key: 'form05', label: 'Form-05 (Plan de Acción y Riesgos)' },
              { key: 'form06', label: 'Form-06 (Presupuesto Operativo)' },
              { key: 'otros', label: 'Otros documentos/anexos' }
            ].map((doc) => (
              <label key={doc.key} style={{
                display: 'flex', alignItems: 'center', padding: '12px',
                backgroundColor: documentosFaltantes[doc.key] ? 'var(--color-progreso-fondo)' : 'var(--color-fondo-tarjeta)',
                border: `2px solid ${documentosFaltantes[doc.key] ? 'var(--color-primario)' : 'var(--color-borde)'}`,
                borderRadius: esAltoContraste ? '0px' : '6px', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={documentosFaltantes[doc.key]}
                  onChange={(e) => setDocumentosFaltantes({ ...documentosFaltantes, [doc.key]: e.target.checked })}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primario)' }}
                />
                <span style={{ color: 'var(--color-texto-principal)', fontSize: '14px', fontWeight: documentosFaltantes[doc.key] ? '700' : '400' }}>
                  {doc.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Detalle de correcciones */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: '700', color: 'var(--color-texto-principal)', marginBottom: '8px', fontSize: '14px' }}>
            Detalle de documentos faltantes o correcciones requeridas <span style={{ color: 'var(--color-peligro)' }}>*</span>
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: Favor adjuntar el Form-06 firmado..."
            style={{
              width: '100%', minHeight: '120px', padding: '12px',
              backgroundColor: 'var(--color-fondo-tarjeta)', color: 'var(--color-texto-principal)',
              border: `2px solid var(--color-borde)`, borderRadius: esAltoContraste ? '0px' : '6px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
          />
          <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: '700', color: caracteresRestantes < 100 ? 'var(--color-peligro)' : 'var(--color-texto-secundario)', textAlign: 'right' }}>
            {caracteresRestantes} / {maxCaracteres} caracteres
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-outline" style={{ padding: '10px 20px', fontSize: '14px' }}>
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!detalle.trim()} 
            className="btn-access" 
            style={{ padding: '10px 24px', fontSize: '14px', opacity: detalle.trim() ? 1 : 0.5, cursor: detalle.trim() ? 'pointer' : 'not-allowed' }}
          >
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}