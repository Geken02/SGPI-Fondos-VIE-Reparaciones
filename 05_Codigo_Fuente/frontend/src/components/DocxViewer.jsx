import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url, titulo, onClose }) {
  const docContainerRef = useRef(null); // Contenedor interno donde se renderiza el Word
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargarDocx = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`El servidor respondió con error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error(
            'El servidor devolvió HTML en lugar del documento. ' +
            'Verifica que la ruta del archivo en la BD coincida con la de Supabase.'
          );
        }

        const blob = await response.blob();

        if (blob.size === 0) {
          throw new Error('El archivo está vacío o no existe.');
        }

        // ✅ CORRECCIÓN: Renderizar en el contenedor interno SIN limpiar manualmente
        // renderAsync se encarga de reemplazar el contenido automáticamente
        if (isMounted && docContainerRef.current) {
          await renderAsync(blob, docContainerRef.current, undefined, {
            className: "docx-wrapper",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            trimXmlDeclaration: true,
            useBase64URL: false,
          });
        }
      } catch (err) {
        console.error("Error cargando Word:", err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (url) {
      cargarDocx();
    }

    return () => {
      isMounted = false;
      // ✅ Limpieza segura: solo si el contenedor existe
      if (docContainerRef.current) {
        docContainerRef.current.innerHTML = '';
      }
    };
  }, [url]);

  return (
    <div 
      className="docx-modal-overlay" 
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-label={`Visor de documento Word: ${titulo}`}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
      }}
    >
      <div 
        className="docx-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', width: '95%', maxWidth: '900px', height: '90vh',
          borderRadius: '12px', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ 
          padding: '16px 24px', borderBottom: '1px solid #e2e8f0', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#002855', fontWeight: '600' }}>
            {titulo || 'Documento Word'}
          </h3>
          <button 
            onClick={onClose} 
            aria-label="Cerrar visor"
            style={{ 
              background: 'none', border: 'none', fontSize: '24px', 
              cursor: 'pointer', color: '#64748b', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f1f5f9' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>Procesando documento Word...</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
                <p style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '12px' }}>
                  ⚠️ No se pudo cargar el documento
                </p>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', wordBreak: 'break-word' }}>
                  {error}
                </p>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  download
                  style={{ 
                    display: 'inline-block', padding: '10px 20px', background: '#002855', 
                    color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: '600' 
                  }}
                >
                  ⬇️ Intentar descargar directamente
                </a>
              </div>
            </div>
          )}

          {/* ✅ Contenedor interno dedicado para docx-preview */}
          <div ref={docContainerRef} />
        </div>
      </div>

      <style>{`
        .docx-wrapper {
          background: white;
          padding: 40px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin: 0 auto;
          max-width: 800px;
          min-height: 100%;
          font-family: 'Calibri', 'Arial', sans-serif;
        }
        .high-contrast-mode .docx-modal-content {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .docx-wrapper {
          background: #000000 !important;
          color: #ffffff !important;
          border: 1px solid #ffffff !important;
          box-shadow: none !important;
        }
        .high-contrast-mode .docx-wrapper p,
        .high-contrast-mode .docx-wrapper h1,
        .high-contrast-mode .docx-wrapper h2,
        .high-contrast-mode .docx-wrapper span {
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}