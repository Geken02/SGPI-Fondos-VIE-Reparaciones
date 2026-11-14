import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';
import PDFViewer from './PDFViewer';

export default function PanelDocumentos({ propuestaId }) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pdfAbierto, setPdfAbierto] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await comiteTecnicoService.obtenerDocumentosPropuesta(propuestaId);
        setDocumentos(res.data.documentos || []);
      } catch (err) {
        console.error('Error cargando documentos:', err);
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

  const DocumentIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#002855' }} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  if (cargando) {
    return (
      <div className="panel-cargando">
        <p>Cargando expediente...</p>
      </div>
    );
  }

  return (
    <>
      <div className="panel-documentos">
        <h3 className="panel-titulo">Expediente de la Propuesta</h3>
        
        {documentos.length === 0 ? (
          <p className="sin-documentos">No hay documentos adjuntos a esta propuesta.</p>
        ) : (
          <div className="lista-documentos">
            {documentos.map((doc) => {
              const nombreDocumento = tiposMap[doc.tipoDocumentoId] || `Documento tipo ${doc.tipoDocumentoId}`;
              
              return (
                <div key={doc.documentoId} className="documento-item">
                  <div className="documento-info">
                    <div className="documento-icono-wrapper">
                      <DocumentIcon />
                    </div>
                    <div className="documento-detalles">
                      <span className="documento-nombre">{nombreDocumento}</span>
                      {doc.fechaSubida && (
                        <span className="documento-fecha">
                          Subido: {new Date(doc.fechaSubida).toLocaleDateString('es-CR')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {/* ✅ Botón para ver en línea (usa el proxy del backend) */}
                    <button 
                      className="btn-ver-pdf-inline"
                      onClick={() => setPdfAbierto({ 
                        url: doc.urlVerEnLinea,  // ← CAMBIADO: usa urlVerEnLinea
                        titulo: nombreDocumento 
                      })}
                      aria-label={`Ver ${nombreDocumento} en línea`}
                      style={{ 
                        flex: 1, 
                        padding: '6px 12px', 
                        background: '#002855', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      👁️ Ver
                    </button>
                    
                    {/* ✅ Enlace para descargar directamente (usa URL pública) */}
                    <a 
                      href={doc.urlDescarga}  // ← MANTIENE: usa urlDescarga para descargar
                      className="btn-descargar-directo"
                      download
                      aria-label={`Descargar ${nombreDocumento}`}
                      style={{ 
                        flex: 1,
                        padding: '6px 12px', 
                        background: '#f1f5f9', 
                        color: '#334155', 
                        borderRadius: '6px', 
                        textDecoration: 'none', 
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background 0.2s'
                      }}
                    >
                      ⬇️ Descargar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal del Visor de PDF */}
      {pdfAbierto && (
        <PDFViewer 
          url={pdfAbierto.url} 
          titulo={pdfAbierto.titulo} 
          onClose={() => setPdfAbierto(null)} 
        />
      )}
    </>
  );
}