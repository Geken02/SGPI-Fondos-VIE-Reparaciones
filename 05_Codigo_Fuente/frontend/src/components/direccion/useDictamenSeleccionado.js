import { useParams, useNavigate } from 'react-router-dom';
import { direccionService } from '../../services/direccionService';
import { useCarga } from '../cie/useCarga';

// Resuelve el dictamen de trabajo: el de la URL o, si no hay, el primero pendiente.
export const useDictamenSeleccionado = (rutaBase) => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const lista = useCarga(() => direccionService.listarDictamenes());
  const datosLista = lista.datos;
  const elegido = codigo || (datosLista && (datosLista.find((d) => d.estado !== 'completado') || datosLista[0])?.codigo) || null;
  const detalle = useCarga(
    () => (elegido ? direccionService.obtenerDictamen(elegido) : Promise.resolve(null)),
    [elegido],
  );
  const cambiar = (c) => navigate(`${rutaBase}/${c}`);
  return { lista, detalle, elegido, cambiar };
};
