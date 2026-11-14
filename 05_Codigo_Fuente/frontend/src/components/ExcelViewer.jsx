import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelViewer({ url, titulo }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarExcel = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Tomamos la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a HTML
        const html = XLSX.utils.sheet_to_html(worksheet, { editable: false });
        setHtmlContent(html);
      } catch (error) {
        console.error("Error cargando Excel:", error);
        setError("No se pudo leer el archivo Excel.");
      }
    };
    cargarExcel();
  }, [url]);

  if (error) return <p style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</p>;

  return (
    <div style={{ padding: '20px', background: '#ffffff', overflow: 'auto', maxHeight: '70vh' }}>
      {/* Estilos básicos para que la tabla del Excel se vea bien */}
      <style>{`
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
        th { background-color: #f3f4f6; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9fafb; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}