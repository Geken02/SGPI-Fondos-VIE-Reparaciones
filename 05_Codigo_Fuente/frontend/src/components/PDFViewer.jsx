import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// ✅ OPTIMIZACIÓN PARA VERCEL: Usar CDN para el worker evita errores de build
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PDFViewer({ url, titulo }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error('Error cargando PDF:', err);
    setError('No se pudo cargar el documento. Verifique que el archivo sea un PDF válido y esté accesible.');
  };

  return (
    <div className="pdf-viewer">
      {titulo && <h3 className="pdf-titulo">{titulo}</h3>}

      {error && (
        <div className="pdf-error" role="alert">
          <p>{error}</p>
          {url && (
            <a href={url} download className="pdf-link-fallback" target="_blank" rel="noopener noreferrer">
              Descargar PDF directamente
            </a>
          )}
        </div>
      )}

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

      {numPages && (
        <div className="pdf-controles">
          <button
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <span aria-live="polite">Página {pageNumber} de {numPages}</span>
          <button
            onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}