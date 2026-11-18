import PDFViewer from './PDFViewer';
import DocxViewer from './DocxViewer';
import ExcelViewer from './ExcelViewer';

export default function UniversalViewer({ url, tipoArchivo }) {
  // ✅ CAMBIADO: de 'const' a 'let' para poder reasignarlo si es necesario
  let extension = tipoArchivo || (url ? url.split('.').pop().toLowerCase().split('?')[0] : '');

  // Normalización: Si el sistema manda "excel", lo tratamos como "xlsx"
  if (extension === 'excel') {
    extension = 'xlsx';
  }

  const renderizarVisor = () => {
    if (extension === 'pdf') return <PDFViewer url={url} />;
    
    if (['doc', 'docx'].includes(extension)) return <DocxViewer url={url} />;
    
    // ✅ 'excel' agregado por seguridad, aunque ya lo normalizamos arriba
    if (['xls', 'xlsx', 'csv', 'excel'].includes(extension)) return <ExcelViewer url={url} />;
    
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
      return <img src={url} alt="Vista previa" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />;
    }
    
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Vista previa no disponible para <strong>.{extension}</strong>.</p>
        <a href={url} download style={{ color: '#002855', textDecoration: 'underline', fontWeight: 600 }}>
          ⬇️ Descargar archivo
        </a>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ background: '#e2e8f0', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
          {extension.toUpperCase() || 'DOC'}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9' }}>
        {renderizarVisor()}
      </div>
    </div>
  );
}