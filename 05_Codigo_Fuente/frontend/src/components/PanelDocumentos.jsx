import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';
import UniversalViewer from './UniversalViewer';

// Iconos SVG
const IconEye = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconDownload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconCross = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function PanelDocumentos({ propuestaId }) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [docAbierto, setDocAbierto] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await comiteTecnicoService.obtenerDocumentosPropuesta(propuestaId);
        setDocumentos(res.data.documentos || []);
      } catch (err) {
        console.error('Error cargando documentos:', err);
        setError('No se pudieron cargar los documentos del expediente.');
      } finally {
        setCargando(false);
      }
    };

    if (propuestaId) {
      cargar();
    }
  }, [propuestaId]);

  const tiposMap = {
    1: 'Form-04 (Formulario de Proyecto)',
    2: 'Form-05 (Plan de Acción y Riesgos)',
    3: 'Form-06 (Presupuesto)',
    4: 'Dictamen de Vinculación',
    5: 'Aval de Comité Ético'
  };

  const detectarTipoArchivo = (nombreArchivo, url) => {
    const texto = ((nombreArchivo || '') + ' ' + (url || '')).toLowerCase();
    if (texto.includes('.pdf')) return 'pdf';
    if (texto.includes('.docx') || texto.includes('.doc')) return 'docx';
    if (texto.includes('.xlsx') || texto.includes('.xls') || texto.includes('.csv')) return 'excel';
    if (texto.includes('.png') || texto.includes('.jpg') || texto.includes('.jpeg') || texto.includes('.gif')) return 'imagen';
    return 'otro';
  };

  const obtenerIconoDocumento = (tipo) => {
    const color = '#002855';
    const baseProps = {
      width: "22", height: "22", viewBox: "0 0 24 24", fill: "none",
      stroke: color, strokeWidth: "2", strokeLinecap: "round",
      strokeLinejoin: "round", "aria-hidden": "true"
    };

    switch (tipo) {
      case 'pdf':
        return (
          <svg {...baseProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <text x="8" y="18" fontSize="7" fontWeight="bold" fill={color} stroke="none">PDF</text>
          </svg>
        );
      case 'docx':
        return (
          <svg {...baseProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <text x="7" y="18" fontSize="6" fontWeight="bold" fill={color} stroke="none">DOC</text>
          </svg>
        );
      case 'excel':
        return (
          <svg {...baseProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <text x="7" y="18" fontSize="6" fontWeight="bold" fill={color} stroke="none">XLS</text>
          </svg>
        );
      default:
        return <svg {...baseProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
    }
  };

  const abrirVisor = (doc) => {
    const url = doc.urlDescarga;
    if (!url) {
      alert('Este documento no tiene un archivo asociado.');
      return;
    }
    const tipo = detectarTipoArchivo(doc.nombreArchivo, url);
    setDocAbierto({
      url,
      titulo: doc.nombreArchivo || tiposMap[doc.tipoDocumentoId] || 'Documento',
      tipo
    });
  };

  if (cargando) {
    return (
      <div className="panel-documentos" style={{ padding: '20px' }}>
        <h3 className="panel-titulo" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#002855' }}>Expediente de la Propuesta</h3>
        <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Cargando documentos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel-documentos" style={{ padding: '20px' }}>
        <h3 className="panel-titulo" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#002855' }}>Expediente de la Propuesta</h3>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '16px', borderRadius: '8px' }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel-documentos">
        <h3 className="panel-titulo" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#002855' }}>Expediente de la Propuesta</h3>

        {documentos.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No hay documentos adjuntos a esta propuesta.</p>
        ) : (
          <div className="lista-documentos" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documentos.map((doc) => {
              const nombreDocumento = tiposMap[doc.tipoDocumentoId] || `Documento tipo ${doc.tipoDocumentoId}`;
              const tipoArchivo = detectarTipoArchivo(doc.nombreArchivo, doc.urlDescarga);

              return (
                <div key={doc.documentoId} className="documento-item" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                  <div className="documento-info" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="documento-icono-wrapper" style={{ flexShrink: 0, marginTop: '2px' }}>
                      {obtenerIconoDocumento(tipoArchivo)}
                    </div>
                    <div className="documento-detalles" style={{ flex: 1, minWidth: 0 }}>
                      <span className="documento-nombre" style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>{nombreDocumento}</span>
                      {doc.nombreArchivo && (
                        <span className="documento-archivo" style={{ display: 'block', fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>{doc.nombreArchivo}</span>
                      )}
                    </div>
                  </div>

                  {doc.urlDescarga && (
                    <div className="documento-acciones" style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-ver-doc"
                        onClick={() => abrirVisor(doc)}
                        aria-label={`Ver ${nombreDocumento} en línea`}
                        style={{ flex: 1, padding: '8px 12px', background: '#002855', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <IconEye /> Ver
                      </button>
                      <a
                        href={doc.urlDescarga}
                        download={doc.nombreArchivo || true}
                        className="btn-descargar-directo"
                        aria-label={`Descargar ${nombreDocumento}`}
                        style={{ flex: 1, padding: '8px 12px', background: '#f1f5f9', color: '#334155', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <IconDownload /> Descargar
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {docAbierto && (
        <div className="modal-overlay" onClick={() => setDocAbierto(null)} role="dialog" aria-modal="true" aria-label={`Visor de documento: ${docAbierto.titulo}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '95%', maxWidth: '1000px', height: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#002855', fontWeight: '600' }}>{docAbierto.titulo}</h3>
              <button onClick={() => setDocAbierto(null)} aria-label="Cerrar visor" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                <IconCross />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9' }}>
              <UniversalViewer url={docAbierto.url} tipoArchivo={docAbierto.tipo} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .high-contrast-mode .btn-ver-doc {
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .btn-descargar-directo {
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .modal-overlay {
          background: rgba(0, 0, 0, 0.95) !important;
        }
        .high-contrast-mode .modal-content {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .documento-item {
          background: #000000 !important;
          border: 1px solid #ffffff !important;
        }
        .high-contrast-mode .documento-nombre {
          color: #ffffff !important;
        }
        .high-contrast-mode .documento-archivo {
          color: #cccccc !important;
        }
      `}</style>
    </>
  );
}