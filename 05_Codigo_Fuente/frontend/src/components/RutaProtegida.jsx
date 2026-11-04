// src/components/RutaProtegida.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, roles } = useAuth();
  
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  
  // Si no se especifican roles, cualquier usuario autenticado puede pasar
  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return children;
  }
  
  // Verificar si el usuario tiene al menos uno de los roles permitidos
  const tienePermiso = roles.some(rol => rolesPermitidos.includes(rol));
  
  if (!tienePermiso) {
    // Redirigir al dashboard correspondiente a su rol
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}