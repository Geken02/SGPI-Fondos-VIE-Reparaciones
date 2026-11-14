import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { comiteTecnicoService } from '../services/comiteTecnicoService';

export default function DocxViewer({ documentoId, titulo, onClose }) {
  const docContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const cargarDocx = async () => {
      setLoading(true);
      setError(null);

      try {
        // ✅ 1. Usamos el servicio para obtener el Blob (incluye el token de auth automáticamente)
        const blob = await comiteTecnicoService.obtenerArchivoDocumento(documentoId);

        // ✅ 2. Verificar que realmente sea un archivo y no un error HTML disfrazado
        if (blob.type && blob.type.includes('text/html')) {
          throw new Error('El servidor devolvió una página de error en lugar del documento.');
        }

        if (blob.size === 0) {
          throw new Error('El archivo está vacío o no existe.');
        }

        // ✅ 3. Renderizar el Blob directamente
        if (isMounted && docContainerRef.current) {
          await renderAsync(blob, docContainerRef.current, undefined, {
            className: "docx-wrapper",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            trimXmlDeclaration: true,
          });
        }
      } catch (err) {
        console.error("Error cargando Word:", err);
        if (isMounted) {
          setError(err.message || 'No se pudo cargar el documento.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (documentoId) {
      cargarDocx();
    }

    return () => {
      isMounted = false;
      if (docContainerRef.current) {
        docContainerRef.current.innerHTML = '';
      }
    };
  }, [documentoId]);

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
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
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
              </div>
            </div>
          )}

          {/* Contenedor interno dedicado para docx-preview */}
          <div ref={docContainerRef} />
        </div>
      </div>

      <style>{`
        .docx-wrapper {
          background: white; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin: 0 auto; max-width: 800px; min-height: 100%; font-family: 'Calibri', 'Arial', sans-serif;
        }
      `}</style>
    </div>
  );
}