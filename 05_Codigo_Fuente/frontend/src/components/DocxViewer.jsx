import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url, titulo, onClose }) {
  const docContainerRef = useRef(null);
  const [estado, setEstado] = useState('cargando'); // cargando | exito | error
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const cargarDocx = async () => {
      setEstado('cargando');
      setMensaje('Descargando archivo...');

      try {
        // ✅ Timeout de 15 segundos para detectar cuelgues
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`El servidor respondió ${response.status}. Verifica la ruta del archivo en Supabase.`);
        }

        setMensaje('Verificando integridad del archivo...');

        // ✅ CRÍTICO: Convertir a ArrayBuffer (no Blob) para poder leer los bytes
        const arrayBuffer = await response.arrayBuffer();

        // ✅ Verificar tamaño mínimo (un .docx válido pesa al menos ~5KB)
        if (arrayBuffer.byteLength < 1000) {
          const texto = new TextDecoder().decode(arrayBuffer);
          throw new Error(
            `El archivo pesa solo ${arrayBuffer.byteLength} bytes. Contenido recibido:\n\n${texto.substring(0, 300)}`
          );
        }

        // ✅ Verificar firma "PK" (los .docx son ZIP y empiezan con P K)
        const primerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
        const firma = String.fromCharCode(...primerBytes);
        console.log('🔍 Firma del archivo:', firma, '| Bytes:', primerBytes);

        if (firma !== 'PK') {
          // Es HTML o texto plano disfrazado de docx
          const texto = new TextDecoder().decode(arrayBuffer.slice(0, 500));
          throw new Error(
            `El archivo NO es un .docx válido. Firma encontrada: "${firma}" (esperado: "PK").\n\n` +
            `Los primeros caracteres del contenido son:\n${texto}`
          );
        }

        setMensaje('Renderizando documento...');

        // ✅ Renderizar con ArrayBuffer
        if (isMounted && docContainerRef.current) {
          await renderAsync(arrayBuffer, docContainerRef.current, undefined, {
            className: 'docx-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            trimXmlDeclaration: true,
          });

          if (isMounted) {
            setEstado('exito');
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('❌ Error cargando Word:', err);
        if (isMounted) {
          setEstado('error');
          setMensaje(err.name === 'AbortError'
            ? 'El servidor tardó demasiado en responder (>15s). Verifica que la URL del archivo sea correcta.'
            : err.message
          );
        }
      }
    };

    if (url) {
      cargarDocx();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f1f5f9' }}>
          {estado === 'cargando' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <p>{mensaje}</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                URL: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>{url}</code>
              </p>
            </div>
          )}

          {estado === 'error' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                background: '#fee2e2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '20px', maxWidth: '600px',
                margin: '0 auto', textAlign: 'left'
              }}>
                <p style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '12px' }}>
                  ⚠️ No se pudo cargar el documento
                </p>
                <pre style={{
                  color: '#64748b', fontSize: '12px', whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word', background: '#ffffff',
                  padding: '12px', borderRadius: '6px', border: '1px solid #fecaca',
                  maxHeight: '200px', overflow: 'auto'
                }}>
                  {mensaje}
                </pre>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
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
                    ⬇️ Descargar archivo original
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Contenedor donde docx-preview inyecta el documento */}
          <div ref={docContainerRef} style={{ display: estado === 'exito' ? 'block' : 'none' }} />
        </div>
      </div>

      <style>{`
        .docx-wrapper {
          background: white; padding: 40px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin: 0 auto; max-width: 800px; min-height: 100%;
          font-family: 'Calibri', 'Arial', sans-serif;
        }
        .high-contrast-mode .docx-modal-content { background: #000 !important; border: 2px solid #fff !important; }
        .high-contrast-mode .docx-wrapper { background: #000 !important; color: #fff !important; border: 1px solid #fff !important; }
      `}</style>
    </div>
  );
}
