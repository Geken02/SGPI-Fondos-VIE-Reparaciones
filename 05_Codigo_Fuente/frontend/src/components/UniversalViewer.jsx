import PdfViewer from './PdfViewer';
import DocxViewer from './DocxViewer';
import ExcelViewer from './ExcelViewer';

export default function UniversalViewer({ url, titulo, tipoArchivo }) {
  // Detectar extensión si no se pasa el tipo explícitamente
  const extension = tipoArchivo || (url ? url.split('.').pop().toLowerCase().split('?')[0] : '');

  const renderizarVisor = () => {
    // PDF
    if (['pdf'].includes(extension)) {
      return <PdfViewer url={url} titulo={titulo} />;
    }
    // Word
    if (['doc', 'docx'].includes(extension)) {
      return <DocxViewer url={url} titulo={titulo} />;
    }
    // Excel
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return <ExcelViewer url={url} titulo={titulo} />;
    }
    // Imagen (Respaldo)
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
      return <img src={url} alt={titulo} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />;
    }
    
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Vista previa no disponible para este tipo de archivo.</p>
        <a href={url} download className="btn-descargar" style={{ color: 'blue', textDecoration: 'underline' }}>
          Descargar archivo para verlo
        </a>
      </div>
    );
  };

  return (
    <div className="visor-universal-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="visor-header" style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#002855' }}>{titulo || 'Documento'}</h3>
        <span className="badge-tipo" style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          {extension.toUpperCase()}
        </span>
      </div>
      <div className="visor-content" style={{ flex: 1, overflow: 'auto' }}>
        {renderizarVisor()}
      </div>
    </div>
  );
}