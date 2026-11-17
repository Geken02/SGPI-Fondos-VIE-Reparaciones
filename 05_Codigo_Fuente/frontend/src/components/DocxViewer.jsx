import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url }) {
  const docContainerRef = useRef(null);
  const [estado, setEstado] = useState('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let isMounted = true;

    const cargarDocx = async () => {
      setEstado('cargando');
      setMensaje('Descargando archivo...');
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength < 1000) throw new Error('El archivo está vacío o es demasiado pequeño.');

        const firma = String.fromCharCode(new Uint8Array(arrayBuffer.slice(0, 2))[0], new Uint8Array(arrayBuffer.slice(0, 2))[1]);
        if (firma !== 'PK') throw new Error('El archivo no es un .docx válido.');

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
        if (isMounted) { setEstado('error'); setMensaje(err.message); }
      }
    };

    if (url) cargarDocx();
    return () => { isMounted = false; };
  }, [url]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {estado === 'cargando' && <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>{mensaje}</p>}
      {estado === 'error' && (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '10px' }}>⚠️ No se pudo cargar el documento</p>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>{mensaje}</p>
          <a href={url} target="_blank" rel="noopener noreferrer" download
             style={{ display: 'inline-block', padding: '10px 20px', background: '#002855', color: 'white', textDecoration: 'none', borderRadius: '6px' }}>
            ⬇️ Descargar archivo
          </a>
        </div>
      )}
      <div ref={docContainerRef} style={{ flex: 1, overflow: 'auto', display: estado === 'exito' ? 'block' : 'none' }} />
      <style>{`
        .docx-wrapper { background: white; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 0 auto; max-width: 800px; font-family: 'Calibri','Arial',sans-serif; }
      `}</style>
    </div>
  );
}