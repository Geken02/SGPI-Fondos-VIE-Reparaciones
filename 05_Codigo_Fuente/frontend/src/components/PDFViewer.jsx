import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// ✅ CORRECCIÓN CRÍTICA: Rutas sin '/esm/' para que Rolldown/Vite 6 las resuelva correctamente
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración del worker vía CDN para evitar errores de build en Vercel
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ url, titulo, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error('Error cargando PDF:', err);
    setError('No se pudo cargar el documento. Verifique que la URL sea accesible y sea un PDF válido.');
  };

  return (
    <div 
      className="pdf-modal-overlay" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-label={`Visor de documento: ${titulo}`}
    >
      <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <h3 id="pdf-modal-title">{titulo || 'Visor de Documento'}</h3>
          <button 
            onClick={onClose} 
            className="pdf-close-btn" 
            aria-label="Cerrar visor de documento"
          >
            ✕
          </button>
        </div>
        
        <div className="pdf-viewer-container">
          {error ? (
            <div className="pdf-error" role="alert">
              <p>{error}</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="pdf-link-fallback">
                Descargar o abrir PDF directamente
              </a>
            </div>
          ) : (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="pdf-loading" role="status">
                  <p>Cargando documento...</p>
                </div>
              }
              options={{
                cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                cMapPacked: true,
              }}
            >
              <Page 
                pageNumber={pageNumber} 
                width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800)} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>

        {numPages && !error && (
          <div className="pdf-controls">
            <button 
              onClick={() => setPageNumber(p => Math.max(1, p - 1))} 
              disabled={pageNumber <= 1}
              aria-label="Página anterior"
            >
              ← Anterior
            </button>
            <span aria-live="polite">Página {pageNumber} de {numPages}</span>
            <button 
              onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} 
              disabled={pageNumber >= numPages}
              aria-label="Página siguiente"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}