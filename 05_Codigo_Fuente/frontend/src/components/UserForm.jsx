// src/components/UserForm.jsx
import { useState, useEffect } from 'react';

// Componente externo para evitar pérdida de foco
const InputConLimite = ({ nombre, label, tipo, placeholder, maxLength, requerido, valor, error, onChange }) => {
  const porcentaje = maxLength > 0 ? (valor.length / maxLength) * 100 : 0;
  
  const manejarCambio = (e) => {
    let nuevoValor = e.target.value;
    if (nombre === 'telefono') {
      nuevoValor = nuevoValor.replace(/[^0-9-]/g, '');
    }
    onChange(nombre, nuevoValor);
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label} {requerido && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div className="relative">
        <input
          type={tipo}
          inputMode={nombre === 'telefono' ? 'numeric' : undefined}
          className={`form-input ${error ? 'error' : ''}`}
          value={valor}
          onChange={manejarCambio}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        {maxLength && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none select-none bg-white px-1 rounded">
            <span style={{ color: porcentaje >= 100 ? '#dc2626' : porcentaje >= 80 ? '#d97706' : '#6b7280', fontWeight: porcentaje >= 80 ? '600' : '400' }}>
              {valor.length}/{maxLength}
            </span>
          </div>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

export default function UserForm({ usuario, roles, escuelas, onSubmit, onCancel, cargando }) {
  const [formData, setFormData] = useState({
    correoInstitucional: '',
    nombreUsuario: '',
    apellido1Usuario: '',
    apellido2Usuario: '',
    telefono: '',
    escuelaId: '',
    contrasena: '',
    rolId: '',
    activo: true,
  });
  const [errores, setErrores] = useState({});
  const [rolesAsignados, setRolesAsignados] = useState([]);
  const [nuevoRolId, setNuevoRolId] = useState('');
  const [gestionandoRol, setGestionandoRol] = useState(null);
  const [mensajeRol, setMensajeRol] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    if (usuario) {
      setFormData({
        correoInstitucional: usuario.correoInstitucional || '',
        nombreUsuario: usuario.nombreUsuario || '',
        apellido1Usuario: usuario.apellido1Usuario || '',
        apellido2Usuario: usuario.apellido2Usuario || '',
        telefono: usuario.telefono || '',
        escuelaId: usuario.escuelaId || '',
        contrasena: '',
        rolId: usuario.roles?.[0]?.rolId || '',
        activo: usuario.activo !== undefined ? usuario.activo : true,
      });
      setRolesAsignados(usuario.roles?.filter(r => r.activo) || []);
    } else {
      setFormData({
        correoInstitucional: '',
        nombreUsuario: '',
        apellido1Usuario: '',
        apellido2Usuario: '',
        telefono: '',
        escuelaId: '',
        contrasena: '',
        rolId: '',
        activo: true,
      });
      setRolesAsignados([]);
    }
    setErrores({});
    setNuevoRolId('');
    setMensajeRol({ texto: '', tipo: '' });
  }, [usuario]);

  const handleChange = (nombre, valor) => {
    setFormData(prev => ({ ...prev, [nombre]: valor }));
    if (errores[nombre]) {
      setErrores(prev => {
        const nuevos = { ...prev };
        delete nuevos[nombre];
        return nuevos;
      });
    }
  };

  const validar = () => {
    const nuevosErrores = {};
    
    if (!formData.correoInstitucional) {
      nuevosErrores.correoInstitucional = 'El correo es obligatorio';
    } else if (!formData.correoInstitucional.endsWith('@tec.ac.cr')) {
      nuevosErrores.correoInstitucional = 'Debe ser un correo institucional @tec.ac.cr';
    }
    
    if (!formData.nombreUsuario) nuevosErrores.nombreUsuario = 'El nombre es obligatorio';
    if (!formData.apellido1Usuario) nuevosErrores.apellido1Usuario = 'El primer apellido es obligatorio';
    
    if (!usuario && !formData.contrasena) {
      nuevosErrores.contrasena = 'La contraseña es obligatoria para nuevos usuarios';
    } else if (formData.contrasena && formData.contrasena.length < 8) {
      nuevosErrores.contrasena = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validar()) {
      const datosEnvio = { ...formData };
      if (usuario && !datosEnvio.contrasena) {
        delete datosEnvio.contrasena;
      }
      onSubmit(datosEnvio);
    }
  };

  // ============================================================================
  // GESTIÓN DE ROLES - CON MANEJO CORRECTO DE RESPUESTAS 204
  // ============================================================================
  const handleRevocarRol = async (usuarioRolId, nombreRol) => {
    if (!window.confirm(`¿Revocar el rol "${nombreRol}" a este usuario?`)) return;

    setGestionandoRol(usuarioRolId);
    setMensajeRol({ texto: '', tipo: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/usuarios/${usuario.usuarioId}/roles/${usuarioRolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // El backend devuelve 204 No Content (sin cuerpo JSON)
      if (response.status === 204) {
        setRolesAsignados(prev => prev.filter(r => r.usuarioRolId !== usuarioRolId));
        setMensajeRol({ texto: `Rol "${nombreRol}" revocado exitosamente.`, tipo: 'exito' });
      } else if (!response.ok) {
        // Intentar leer JSON solo si hay contenido
        const text = await response.text();
        let errorMsg = 'Error al revocar el rol';
        try {
          const err = JSON.parse(text);
          errorMsg = err.detail || errorMsg;
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      } else {
        // Si devuelve 200 con cuerpo
        const data = await response.json();
        setRolesAsignados(prev => prev.filter(r => r.usuarioRolId !== usuarioRolId));
        setMensajeRol({ texto: `Rol "${nombreRol}" revocado exitosamente.`, tipo: 'exito' });
      }
    } catch (err) {
      setMensajeRol({ texto: err.message, tipo: 'error' });
    } finally {
      setGestionandoRol(null);
    }
  };

  const handleAsignarRol = async () => {
    if (!nuevoRolId) {
      setMensajeRol({ texto: 'Seleccione un rol para asignar', tipo: 'error' });
      return;
    }

    setGestionandoRol('asignar');
    setMensajeRol({ texto: '', tipo: '' });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/usuarios/${usuario.usuarioId}/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rolId: parseInt(nuevoRolId) })
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Error al asignar el rol';
        try {
          const err = JSON.parse(text);
          errorMsg = err.detail || errorMsg;
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }

      // Manejar respuesta 201 con cuerpo o 204 sin cuerpo
      if (response.status === 204) {
        // Si no hay cuerpo, recargar roles desde el backend
        const rolesRes = await fetch(`/api/admin/usuarios/${usuario.usuarioId}/roles`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRolesAsignados(rolesData.filter(r => r.activo));
        }
      } else {
        const nuevoRol = await response.json();
        setRolesAsignados(prev => [...prev, nuevoRol]);
      }
      
      setNuevoRolId('');
      setMensajeRol({ texto: 'Rol asignado exitosamente.', tipo: 'exito' });
    } catch (err) {
      setMensajeRol({ texto: err.message, tipo: 'error' });
    } finally {
      setGestionandoRol(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <InputConLimite 
          nombre="correoInstitucional" 
          label="Correo Institucional" 
          tipo="email" 
          placeholder="usuario@tec.ac.cr" 
          maxLength={100} 
          requerido={true}
          valor={formData.correoInstitucional}
          error={errores.correoInstitucional}
          onChange={handleChange}
        />

        <InputConLimite 
          nombre="telefono" 
          label="Teléfono" 
          tipo="text" 
          placeholder="2550-0000" 
          maxLength={15} 
          requerido={false}
          valor={formData.telefono}
          error={errores.telefono}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <InputConLimite 
          nombre="nombreUsuario" 
          label="Nombre" 
          tipo="text" 
          placeholder="Juan" 
          maxLength={50} 
          requerido={true}
          valor={formData.nombreUsuario}
          error={errores.nombreUsuario}
          onChange={handleChange}
        />

        <InputConLimite 
          nombre="apellido2Usuario" 
          label="Segundo Apellido" 
          tipo="text" 
          placeholder="Carlos" 
          maxLength={50} 
          requerido={false}
          valor={formData.apellido2Usuario}
          error={errores.apellido2Usuario}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <InputConLimite 
          nombre="apellido1Usuario" 
          label="Primer Apellido" 
          tipo="text" 
          placeholder="Pérez" 
          maxLength={50} 
          requerido={true}
          valor={formData.apellido1Usuario}
          error={errores.apellido1Usuario}
          onChange={handleChange}
        />

        <div className="form-group">
          <label className="form-label">Escuela / Dependencia</label>
          <select
            className="form-select"
            value={formData.escuelaId}
            onChange={(e) => handleChange('escuelaId', e.target.value)}
          >
            <option value="">Sin escuela asignada</option>
            {escuelas.map(escuela => (
              <option key={escuela.escuelaId} value={escuela.escuelaId}>
                {escuela.nombreEscuela}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gestión de Roles */}
      {usuario && (
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label">Roles Asignados</label>
          
          {mensajeRol.texto && (
            <div className={`alerta-mensaje ${mensajeRol.tipo === 'exito' ? 'alerta-exito' : 'alerta-error'}`} style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '14px',
              backgroundColor: mensajeRol.tipo === 'exito' ? '#dcfce7' : '#fee2e2',
              color: mensajeRol.tipo === 'exito' ? '#166534' : '#991b1b',
              border: `1px solid ${mensajeRol.tipo === 'exito' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {mensajeRol.texto}
            </div>
          )}

          {rolesAsignados.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic', margin: '8px 0' }}>
              Sin roles asignados
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
              {rolesAsignados.map(rol => (
                <li
                  key={rol.usuarioRolId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    marginBottom: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#0f172a' }}>{rol.nombreRol}</span>
                  <button
                    type="button"
                    onClick={() => handleRevocarRol(rol.usuarioRolId, rol.nombreRol)}
                    disabled={gestionandoRol === rol.usuarioRolId}
                    className="btn-cancel"
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      borderColor: '#fecaca'
                    }}
                  >
                    {gestionandoRol === rol.usuarioRolId ? 'Revocando...' : 'Revocar'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <select
              className="form-select"
              value={nuevoRolId}
              onChange={(e) => setNuevoRolId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Agregar otro rol...</option>
              {roles
                .filter(r => !rolesAsignados.some(ar => ar.rolId === r.rolId))
                .map(rol => (
                  <option key={rol.rolId} value={rol.rolId}>
                    {rol.nombreRol}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAsignarRol}
              disabled={gestionandoRol === 'asignar' || !nuevoRolId}
              className="btn-submit"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {gestionandoRol === 'asignar' ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      )}

      {/* Rol principal para nuevos usuarios */}
      {!usuario && (
        <div className="form-group">
          <label className="form-label">
            Rol Asignado <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            className="form-select"
            value={formData.rolId}
            onChange={(e) => handleChange('rolId', e.target.value)}
          >
            <option value="">Sin rol asignado</option>
            {roles.map(rol => (
              <option key={rol.rolId} value={rol.rolId}>
                {rol.nombreRol}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Estado del Usuario */}
      {usuario && (
        <div className="form-group">
          <label className="form-label">Estado del Usuario</label>
          <select
            className="form-select"
            value={formData.activo ? 'true' : 'false'}
            onChange={(e) => handleChange('activo', e.target.value === 'true')}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo (Soft-delete)</option>
          </select>
          <div className="form-hint">
            {formData.activo 
              ? "El usuario puede iniciar sesión y acceder al sistema." 
              : "El usuario no podrá iniciar sesión, pero sus datos se mantienen para auditoría."}
          </div>
        </div>
      )}

      {/* Contraseña */}
      <div className="form-group">
        <label className="form-label">
          Contraseña {!usuario && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        <input
          type="password"
          className={`form-input ${errores.contrasena ? 'error' : ''}`}
          value={formData.contrasena}
          onChange={(e) => handleChange('contrasena', e.target.value)}
          placeholder={usuario ? "Dejar en blanco para mantener la actual" : "Mínimo 8 caracteres"}
        />
        {errores.contrasena && <div className="form-error">{errores.contrasena}</div>}
        <div className="form-hint">
          {usuario 
            ? "Solo complete este campo si desea restablecer la contraseña." 
            : "La contraseña se encriptará automáticamente (mínimo 8 caracteres)."}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={cargando}>
          Cancelar
        </button>
        <button type="submit" className="btn-submit" disabled={cargando}>
          {cargando && <div className="spinner-small"></div>}
          {usuario ? 'Actualizar Usuario' : 'Crear Usuario'}
        </button>
      </div>
    </form>
  );
}