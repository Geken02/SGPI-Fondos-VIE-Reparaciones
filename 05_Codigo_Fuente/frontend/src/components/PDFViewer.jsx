import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export default function PDFViewer({ url }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(null);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <p style={{ color: '#991b1b', fontWeight: 'bold' }}>⚠️ No se pudo cargar el PDF</p>
      <a href={url} target="_blank" rel="noopener noreferrer" download style={{ display: 'inline-block', marginTop: '12px', padding: '10px 20px', background: '#002855', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>⬇️ Descargar archivo</a>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', background: '#525659', padding: '20px', display: 'flex', justifyContent: 'center' }}>
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => { console.error('Error PDF:', err); setError(err.message); }}
          loading={<p style={{ color: 'white' }}>Cargando PDF...</p>}
        >
          <Page pageNumber={pageNumber} width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 120 : 800)} renderTextLayer renderAnnotationLayer />
        </Document>
      </div>
      {numPages && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '12px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} style={{ padding: '8px 16px', background: '#002855', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>← Anterior</button>
          <span aria-live="polite">Página {pageNumber} de {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} style={{ padding: '8px 16px', background: '#002855', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}