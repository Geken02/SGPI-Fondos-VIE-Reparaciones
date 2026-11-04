// src/components/rubrica/SugerenciaIA.jsx
import { useState, useEffect } from 'react';
import { comiteTecnicoService } from '../services/comiteTecnicoService';

export default function SugerenciaIA({ seccionNombre, criterioNombre, nivel, descripcionNivel, justificacion }) {
  const [sugerencia, setSugerencia] = useState('');
  const [cargando, setCargando] = useState(false);
  const [iaActiva, setIaActiva] = useState(false);

  useEffect(() => {
    const verificarIA = async () => {
      try {
        const res = await comiteTecnicoService.obtenerEstadoIA();
        setIaActiva(res.data.activa);
      } catch (err) {
        console.error('Error verificando IA:', err);
      }
    };
    verificarIA();
  }, []);

  useEffect(() => {
    if (!iaActiva || !justificacion || justificacion.length < 20) {
      setSugerencia('');
      return;
    }

    const timer = setTimeout(async () => {
      setCargando(true);
      try {
        const res = await comiteTecnicoService.analizarJustificacionIA({
          seccionNombre,
          criterioNombre,
          nivel,
          descripcionNivel,
          justificacion
        });
        setSugerencia(res.data.sugerencia);
      } catch (err) {
        console.error('Error en IA:', err);
      } finally {
        setCargando(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [justificacion, iaActiva, seccionNombre, criterioNombre, nivel, descripcionNivel]);

  if (!iaActiva) return null;
  if (!justificacion || justificacion.length < 20) return null;

  return (
    <div className="sugerencia-ia">
      <div className="sugerencia-header">
        <span className="sugerencia-icono">💡</span>
        <span className="sugerencia-titulo">Asistente IA</span>
      </div>
      {cargando ? (
        <p className="sugerencia-cargando">Analizando justificación...</p>
      ) : sugerencia ? (
        <p className="sugerencia-texto">{sugerencia}</p>
      ) : null}
    </div>
  );
}