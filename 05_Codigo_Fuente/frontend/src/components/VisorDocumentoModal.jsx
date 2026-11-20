import { useEffect, useState } from 'react';
import api from '../services/api';
import UniversalViewer from './UniversalViewer';

export default function VisorDocumentoModal({ documentoId, nombreArchivo, onClose }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    let objectUrl = null;

    const cargar = async () => {
      try {
        const respuesta = await api.get(`/api/comite-tecnico/documentos/${documentoId}/ver`, {
          responseType: 'blob',
        });
        if (!respuesta.data || respuesta.data.size === 0) {
          throw new Error('El servidor devolvió un archivo vacío.');
        }
        objectUrl = URL.createObjectURL(respuesta.data);
        if (activo) setUrl(objectUrl);
      } catch (e) {
        if (activo) {
          const detalle = e.response?.data?.detail;
          setError(typeof detalle === 'string' ? detalle : 'No se pudo obtener el documento. Verifica que el archivo exista y que tengas permisos para consultarlo.');
        }
      }
    };

    cargar();
    return () => {
      activo = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentoId]);

  const extension = (nombreArchivo || '').split('.').pop()?.toLowerCase() || '';

  return (
    <div className="gv-visor-overlay" role="dialog" aria-modal="true" aria-label={`Visualizador: ${nombreArchivo || 'documento'}`} onClick={onClose}>
      <div className="gv-visor-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>{nombreArchivo || 'Documento'}</strong>
          <button type="button" onClick={onClose} aria-label="Cerrar visualizador">×</button>
        </header>
        <div className="gv-visor-contenido">
          {error ? <p role="alert" style={{ padding: 24, color: '#991b1b' }}>{error}</p>
            : url ? <UniversalViewer url={url} tipoArchivo={extension} />
            : <p role="status" style={{ padding: 24, textAlign: 'center' }}>Cargando documento...</p>}
        </div>
      </div>
    </div>
  );
}
