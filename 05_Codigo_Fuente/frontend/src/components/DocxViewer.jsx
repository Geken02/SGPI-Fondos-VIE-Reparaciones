import { useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';

export default function DocxViewer({ url, titulo }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const cargarDocx = async () => {
      if (!containerRef.current) return;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = ''; // Limpiar
          // Renderizar el Word
          await renderAsync(blob, containerRef.current, undefined, {
            className: "docx-wrapper",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
          });
        }
      } catch (error) {
        console.error("Error cargando Word:", error);
        if (isMounted) containerRef.current.innerHTML = '<p style="color:red; text-align:center;">Error al cargar el documento Word.</p>';
      }
    };
    cargarDocx();
    return () => { isMounted = false; };
  }, [url]);

  return <div ref={containerRef} style={{ padding: '20px', background: '#f1f5f9', overflow: 'auto', maxHeight: '70vh' }} />;
}