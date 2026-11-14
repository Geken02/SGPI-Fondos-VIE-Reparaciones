import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url, titulo, onClose }) {
  const docContainerRef = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let isMounted = true;

    const cargarDocx = async () => {
      setEstado('cargando');
      setMensaje('Descargando archivo desde Supabase...');

      try {
        // Fetch directo a la URL pública de Supabase
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`El servidor respondió ${response.status}. Verifica que la URL sea pública.`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Validación básica de tamaño
        if (arrayBuffer.byteLength < 1000) {
          throw new Error(`El archivo es demasiado pequeño (${arrayBuffer.byteLength} bytes).`);
        }

        // Validar que sea un archivo ZIP/DOCX real (debe empezar con "PK")
        const primerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
        const firma = String.fromCharCode(...primerBytes);

        if (firma !== 'PK') {
          throw new Error(`El archivo no es un .docx válido (firma: "${firma}", esperado: "PK").`);
        }

        setMensaje('Renderizando documento...');

        if (isMounted && docContainerRef.current) {
          await renderAsync(arrayBuffer, docContainerRef.current, undefined, {
            className: 'docx-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
          });
          if (isMounted) setEstado('exito');
        }
      } catch (err) {
        console.error('❌ Error cargando Word:', err);
        if (isMounted) {
          setEstado('error');
          setMensaje(err.message);
        }
      }
    };

    if (url) cargarDocx();

    return () => { isMounted = false; };
  }, [url]);

  return (
    <div className="docx-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="docx-modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '95%', maxWidth: '900px', height: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#002855' }}>{titulo || 'Documento Word'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f1f5f9' }}>
          {estado === 'cargando' && <p style={{ textAlign: 'center', color: '#64748b' }}>{mensaje}</p>}
          
          {estado === 'error' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
                <p style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '12px' }}>⚠️ No se pudo cargar el documento</p>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>{mensaje}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" download style={{ display: 'inline-block', padding: '10px 20px', background: '#002855', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
                  ⬇️ Descargar archivo directamente
                </a>
              </div>
            </div>
          )}

          <div ref={docContainerRef} style={{ display: estado === 'exito' ? 'block' : 'none' }} />
        </div>
      </div>

      <style>{`
        .docx-wrapper { background: white; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 0 auto; max-width: 800px; min-height: 100%; font-family: 'Calibri', 'Arial', sans-serif; }
      `}</style>
    </div>
  );
}