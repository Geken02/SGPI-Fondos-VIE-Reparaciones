import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url, titulo, onClose }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargarDocx = async () => {
      setLoading(true);
      setError(null);

      if (!containerRef.current) return;

      try {
        // 1. Obtener el archivo desde la URL
        const response = await fetch(url);

        // 2. Verificar que la respuesta del servidor sea exitosa (200 OK)
        if (!response.ok) {
          throw new Error(`El servidor respondió con error: ${response.status} ${response.statusText}`);
        }

        // 3. Verificar que el servidor no esté devolviendo una página HTML (error 404/500 en HTML)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('El servidor devolvió una página web (HTML) en lugar del documento Word. Verifica la ruta del archivo en el backend.');
        }

        // 4. Convertir la respuesta a Blob (formato binario)
        const blob = await response.blob();

        // 5. Verificar que el archivo no esté vacío
        if (blob.size === 0) {
          throw new Error('El archivo está vacío o no existe en el almacenamiento.');
        }

        // 6. Renderizar el documento Word en el contenedor
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = ''; // Limpiar contenido previo
          
          await renderAsync(blob, containerRef.current, undefined, {
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
          setError(err.message || 'No se pudo leer el archivo Word.');
          
          // Mostrar mensaje de error amigable en la interfaz
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div style="text-align: center; padding: 40px; color: #991b1b;">
                <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">⚠️ No se pudo cargar el documento</p>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">
                  ${err.message}
                </p>
                <a href="${url}" target="_blank" rel="noopener noreferrer" 
                   style="display: inline-block; padding: 10px 20px; background: #002855; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  ⬇️ Intentar descargar directamente
                </a>
              </div>
            `;
          }
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

    // Función de limpieza al desmontar el componente
    return () => {
      isMounted = false;
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
        {/* Header del Modal */}
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
            aria-label="Cerrar visor de Word"
            style={{ 
              background: 'none', border: 'none', fontSize: '24px', 
              cursor: 'pointer', color: '#64748b', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
          >
            ✕
          </button>
        </div>

        {/* Contenedor del Documento */}
        <div 
          className="docx-viewer-container" 
          ref={containerRef}
          style={{ 
            flex: 1, overflow: 'auto', padding: '24px', background: '#f1f5f9' 
          }}
        >
          {loading && !error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>Procesando y cargando el documento Word...</p>
            </div>
          )}
        </div>
      </div>

      {/* Estilos inyectados para que el documento Word se vea como una hoja de papel */}
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
        
        /* Modo de alto contraste para el visor Word */
        .high-contrast-mode .docx-modal-content {
          background: #000000 !important;
          border: 2px solid #ffffff !important;
        }
        .high-contrast-mode .docx-viewer-container {
          background: #000000 !important;
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
        .high-contrast-mode .docx-wrapper h3,
        .high-contrast-mode .docx-wrapper span {
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}