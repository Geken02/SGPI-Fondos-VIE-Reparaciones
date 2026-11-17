// Ruta heredada: la validación normativa unificada sustituye esta pantalla.
import { Navigate, useParams } from 'react-router-dom';

const RevisionVIE = () => {
  const { expedienteId } = useParams();
  return <Navigate to={expedienteId
    ? `/gestora/validacion-normativa/${encodeURIComponent(expedienteId)}`
    : '/gestora/validacion-normativa'} replace />;
};

export default RevisionVIE;
