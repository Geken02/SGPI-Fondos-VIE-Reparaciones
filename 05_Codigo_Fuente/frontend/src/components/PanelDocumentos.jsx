// src/components/PanelDocumentos.jsx
import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';

export default function PanelDocumentos({ propuestaId }) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  // Mapeo profesional sin emojis
  const tiposMap = {
    1: 'Form-04 (Formulario de Proyecto)',
    2: 'Form-05 (Plan de Acción y Riesgos)',
    3: 'Form-06 (Presupuesto)',
    4: 'Dictamen de Vinculación',
    5: 'Aval de Comité Ético'
  };

  // Icono SVG profesional y limpio para documentos
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
                
                {doc.urlDescarga && (
                  <a 
                    href={doc.urlDescarga} 
                    className="btn-descargar" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Consultar
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}