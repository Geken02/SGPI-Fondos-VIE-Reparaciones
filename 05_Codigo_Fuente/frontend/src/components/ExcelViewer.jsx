import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelViewer({ url }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cargarExcel = async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        if (!hoja) throw new Error('El archivo no contiene hojas de cálculo.');
        const html = XLSX.utils.sheet_to_html(hoja, { editable: false });
        if (isMounted) setHtmlContent(html);
      } catch (err) {
        console.error('Error cargando Excel:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (url) cargarExcel();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return <p role="status" aria-live="polite" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Cargando hoja de cálculo...</p>;
  if (error) return (
    <div role="alert" style={{ textAlign: 'center', padding: '40px' }}>
      <p style={{ color: '#991b1b', fontWeight: 'bold' }}>⚠️ {error}</p>
      <a href={url} download style={{ display: 'inline-block', marginTop: '12px', padding: '10px 20px', background: '#002855', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>⬇️ Descargar archivo</a>
    </div>
  );

  return (
    <div className="excel-table-container" style={{ height: '100%', overflow: 'auto', background: '#fff', padding: '20px' }} dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}