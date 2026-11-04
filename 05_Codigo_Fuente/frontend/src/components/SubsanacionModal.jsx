// src/components/SubsanacionModal.jsx
import { useState } from 'react';

export default function SubsanacionModal({ isOpen, onClose, propuesta, onSubmit }) {
  const [detalle, setDetalle] = useState('');
  const [documentosFaltantes, setDocumentosFaltantes] = useState({
    form04: false,
    form05: false,
    form06: false,
    otros: false
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!detalle.trim()) {
      alert('Por favor, detalle los documentos faltantes o correcciones requeridas');
      return;
    }
    
    onSubmit({
      propuestaId: propuesta.propuestaId,
      detalle,
      documentosFaltantes,
      fechaSolicitud: new Date()
    });
    
    setDetalle('');
    setDocumentosFaltantes({ form04: false, form05: false, form06: false, otros: false });
    onClose();
  };

  const maxCaracteres = 2000;
  const caracteresRestantes = maxCaracteres - detalle.length;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 40, 85, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: '#002855',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              Solicitar Subsanación
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: '#64748b',
              fontSize: '14px'
            }}>
              Complete los documentos o correcciones requeridas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#fee2e2';
              e.target.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#94a3b8';
            }}
          >
            ×
          </button>
        </div>

        {/* Info de la propuesta */}
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          borderLeft: '4px solid #002855'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
            Propuesta:
          </div>
          <div style={{ fontWeight: '600', color: '#002855', marginBottom: '8px' }}>
            {propuesta.codigoPropuesta} - {propuesta.titulo}
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Investigador: {propuesta.investigador}
          </div>
        </div>

        {/* Checklist de documentos */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#334155',
            marginBottom: '12px',
            fontSize: '14px'
          }}>
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
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: documentosFaltantes[doc.key] ? '#eff6ff' : '#f8fafc',
                border: `2px solid ${documentosFaltantes[doc.key] ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
                <input
                  type="checkbox"
                  checked={documentosFaltantes[doc.key]}
                  onChange={(e) => setDocumentosFaltantes({
                    ...documentosFaltantes,
                    [doc.key]: e.target.checked
                  })}
                  style={{
                    marginRight: '12px',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#002855'
                  }}
                />
                <span style={{ color: '#334155', fontSize: '14px' }}>{doc.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Detalle de correcciones */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            color: '#334155',
            marginBottom: '8px',
            fontSize: '14px'
          }}>
            Detalle de documentos faltantes o correcciones requeridas{' '}
            <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej: Favor adjuntar el Form-06 (Presupuesto) firmado y el dictamen de Vinculación..."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '12px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: caracteresRestantes < 100 ? '#dc2626' : '#64748b',
            textAlign: 'right'
          }}>
            {caracteresRestantes} / {maxCaracteres} caracteres
          </div>
        </div>

        {/* Acciones */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '2px solid #e2e8f0',
              backgroundColor: 'white',
              color: '#475569',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#94a3b8';
              e.target.style.color = '#1e293b';
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!detalle.trim()}
            style={{
              padding: '10px 24px',
              border: 'none',
              backgroundColor: detalle.trim() ? '#002855' : '#cbd5e1',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: detalle.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: detalle.trim() ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (detalle.trim()) {
                e.target.style.backgroundColor = '#003a7a';
              }
            }}
          >
            Enviar Solicitud
          </button>
        </div>
      </div>
    </div>
  );
}