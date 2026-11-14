import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuración del worker (Versión estable)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export default function PdfViewer({ url, titulo }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#525659', padding: '20px', minHeight: '500px' }}>
      <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<p style={{color:'white'}}>Cargando PDF...</p>}>
        <Page pageNumber={pageNumber} width={Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 800)} />
      </Document>
      
      {numPages && (
        <div style={{ marginTop: '15px', display: 'flex', gap: '15px', color: 'white', alignItems: 'center' }}>
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} style={{padding: '5px 10px'}}>← Anterior</button>
          <span>Página {pageNumber} de {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages} style={{padding: '5px 10px'}}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}