// src/components/admin/UserRoleManager.jsx
import { useState } from 'react';
import { toast } from 'react-hot-toast'; // O tu sistema de notificaciones

export default function UserRoleManager({ usuario, rolesAsignados, onRoleUpdated }) {
  const [revocando, setRevocando] = useState(null);

  const handleRevocarRol = async (usuarioRolId, rolNombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas revocar el rol "${rolNombre}" al usuario ${usuario.nombreUsuario}?`)) {
      return;
    }

    setRevocando(usuarioRolId);
    try {
      const response = await fetch(`/api/admin/usuarios/${usuario.usuarioId}/roles/${usuarioRolId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al revocar el rol');
      }

      toast.success(`Rol "${rolNombre}" revocado exitosamente`);
      
      // Notificar al componente padre para actualizar la lista
      if (onRoleUpdated) {
        onRoleUpdated(usuario.usuarioId, usuarioRolId, 'REVOKED');
      }
    } catch (error) {
      console.error('Error revocando rol:', error);
      toast.error(error.message);
    } finally {
      setRevocando(null);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Roles Asignados</h3>
      {rolesAsignados.length === 0 ? (
        <p className="text-sm text-gray-500 italic">Sin roles asignados</p>
      ) : (
        <div className="space-y-2">
          {rolesAsignados.map((rol) => (
            <div key={rol.usuarioRolId} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex-1">
                <span className="font-medium text-sm text-gray-800">{rol.nombreRol}</span>
                <div className="text-xs text-gray-500 mt-1">
                  Asignado: {new Date(rol.asignadoEn).toLocaleDateString('es-CR')}
                  {rol.fechaExpiracion && ` | Expira: ${new Date(rol.fechaExpiracion).toLocaleDateString('es-CR')}`}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  rol.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {rol.activo ? 'Activo' : 'Revocado'}
                </span>
                
                {rol.activo && (
                  <button
                    onClick={() => handleRevocarRol(rol.usuarioRolId, rol.nombreRol)}
                    disabled={revocando === rol.usuarioRolId}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Revocar rol"
                  >
                    {revocando === rol.usuarioRolId ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Revocando...
                      </span>
                    ) : (
                      'Revocar'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}