// src/pages/admin/Usuarios.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { catalogoService } from '../../services/catalogoService';
import Modal from '../../components/Modal';
import UserForm from '../../components/UserForm';
import '../../styles/usuarios.css';

// Funciones dinámicas para roles
const formatearNombreRol = (nombreRol) => {
  if (!nombreRol) return 'Sin rol asignado';
  return nombreRol
    .replace(/([A-Z])/g, ' $1')
    .replace(/\bVie\b/g, 'VIE')
    .replace(/\bCie\b/g, 'CIE')
    .trim();
};

const generarColorRol = (nombreRol) => {
  const paleta = [
    'bg-purple-100 text-purple-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-700',
  ];

  if (!nombreRol) return 'bg-gray-100 text-gray-700';

  let hash = 0;
  for (let i = 0; i < nombreRol.length; i++) {
    hash = nombreRol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paleta[Math.abs(hash) % paleta.length];
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [escuelas, setEscuelas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [tamanoPagina] = useState(10);
  
  // Estados de modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [cargandoForm, setCargandoForm] = useState(false);
  
  // Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
    cargarRoles();
    cargarEscuelas();
  }, [pagina, busqueda, filtroRol, filtroEstado]);

  const cargarRoles = async () => {
    try {
      const response = await adminService.listarRoles();
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error cargando roles:', error);
    }
  };

  const cargarEscuelas = async () => {
    try {
      const response = await catalogoService.escuelas.listar({ tamanoPagina: 100 });
      setEscuelas(response.data.items || []);
    } catch (error) {
      console.error('Error cargando escuelas:', error);
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const rolSeleccionado = filtroRol ? roles.find(r => r.nombreRol === filtroRol) : null;
      
      const params = {
        pagina,
        tamanoPagina,
        busqueda: busqueda || undefined,
        rolId: rolSeleccionado ? rolSeleccionado.rolId : undefined,
        incluirInactivos: true,
      };

      const response = await adminService.listarUsuarios(params);
      let usuariosFiltrados = response.data.items || [];
      
      if (filtroEstado === 'activo') {
        usuariosFiltrados = usuariosFiltrados.filter(u => u.activo === true);
      } else if (filtroEstado === 'inactivo') {
        usuariosFiltrados = usuariosFiltrados.filter(u => u.activo === false);
      }
      
      setUsuarios(usuariosFiltrados);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsuarios([]);
      setTotalRegistros(0);
    } finally {
      setCargando(false);
    }
  };

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };
  const handleCrear = async (formData) => {
    setCargandoForm(true);
    try {
      const { rolId, ...datosUsuario } = formData;
      
      // 👇 LIMPIEZA DE DATOS: Convertir strings vacíos a null para evitar error 422
      const datosLimpios = {
        ...datosUsuario,
        escuelaId: datosUsuario.escuelaId === '' ? null : parseInt(datosUsuario.escuelaId, 10),
        telefono: datosUsuario.telefono === '' ? null : datosUsuario.telefono,
        apellido2Usuario: datosUsuario.apellido2Usuario === '' ? null : datosUsuario.apellido2Usuario,
      };
      
      const response = await adminService.crearUsuario(datosLimpios);
      const nuevoUsuario = response.data;
      
      if (rolId) {
        await adminService.asignarRol(nuevoUsuario.usuarioId, { rolId: parseInt(rolId) });
      }
      
      mostrarToast('Usuario creado exitosamente');
      setModalCrearAbierto(false);
      cargarDatos();
    } catch (error) {
      console.error('Error creando usuario:', error);
      
      const detail = error.response?.data?.detail;
      const mensajeError = Array.isArray(detail) 
        ? detail[0]?.msg || 'Error de validación en los datos' 
        : (typeof detail === 'string' ? detail : 'Error al crear el usuario');
      
      mostrarToast(mensajeError, 'error');
    } finally {
      setCargandoForm(false);
    }
  };

    const handleEditar = async (formData) => {
    setCargandoForm(true);
    try {
      const { rolId, contrasena, ...datosUsuario } = formData;
      
      // 1. Limpieza de datos (evita el error 422 de strings vacíos)
      const datosLimpios = {
        ...datosUsuario,
        escuelaId: datosUsuario.escuelaId === '' ? null : parseInt(datosUsuario.escuelaId, 10),
        telefono: datosUsuario.telefono === '' ? null : datosUsuario.telefono,
        apellido2Usuario: datosUsuario.apellido2Usuario === '' ? null : datosUsuario.apellido2Usuario,
      };

      if (contrasena && contrasena.trim() !== '') {
        datosLimpios.contrasena = contrasena;
      }
      
      // 2. Actualizar datos básicos del usuario
      await adminService.actualizarUsuario(usuarioEditando.usuarioId, datosLimpios);
      
      // 3. Lógica blindada para el rol
      if (rolId) {
        const rolIdNumerico = parseInt(rolId, 10);
        const rolActual = usuarioEditando.roles?.[0]?.rolId;
        
        // Solo intentamos asignar si el rol es DIFERENTE al que ya tiene
        if (rolIdNumerico !== rolActual) {
          try {
            await adminService.asignarRol(usuarioEditando.usuarioId, { rolId: rolIdNumerico });
          } catch (error) {
            if (error.response?.status !== 409) {
              throw error;
            }
            console.log("El usuario ya tenía este rol asignado, se omite la re-asignación.");
          }
        }
      }
      
      mostrarToast('Usuario actualizado exitosamente');
      setModalEditarAbierto(false);
      setUsuarioEditando(null);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      
      const detail = error.response?.data?.detail;
      const mensajeError = Array.isArray(detail) 
        ? detail[0]?.msg || 'Error de validación en los datos' 
        : (typeof detail === 'string' ? detail : 'Error al actualizar el usuario');
      
      mostrarToast(mensajeError, 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  const handleCambiarEstado = async (usuario) => {
    if (!window.confirm(`¿Está seguro de ${usuario.activo ? 'desactivar' : 'activar'} este usuario?`)) {
      return;
    }

    try {
      await adminService.cambiarEstadoUsuario(usuario.usuarioId, { activo: !usuario.activo });
      mostrarToast(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`);
      cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      mostrarToast('Error al cambiar el estado', 'error');
    }
  };

  const totalPaginas = Math.ceil(totalRegistros / tamanoPagina);

  const obtenerIniciales = (nombre, apellido1) => {
    const inicial1 = nombre?.[0] || '';
    const inicial2 = apellido1?.[0] || '';
    return `${inicial1}${inicial2}`.toUpperCase();
  };

  const obtenerInfoRol = (usuario) => {
    if (!usuario.roles || usuario.roles.length === 0) {
      return { nombre: 'Sin rol', color: 'bg-gray-100 text-gray-700' };
    }
    const rolNombre = usuario.roles[0].nombreRol;
    return {
      nombre: formatearNombreRol(rolNombre),
      color: generarColorRol(rolNombre),
    };
  };

  const formatearUltimoAcceso = (fecha) => {
    if (!fecha) return 'Nunca';
    const ahora = new Date();
    const acceso = new Date(fecha);
    const diffHoras = Math.floor((ahora - acceso) / (1000 * 60 * 60));
    
    if (diffHoras < 1) return 'Ahora';
    if (diffHoras < 24) return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7) return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    return acceso.toLocaleDateString('es-CR');
  };

  return (
    <div className="usuarios-container">
      {toast && (
        <div className={`toast ${toast.tipo}`}>
          <span className="toast-icon">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      <div className="breadcrumbs">
        <Link to="/dashboard">Comité técnico</Link>
        <span className="breadcrumb-separator">›</span>
        <span>Gestión de Usuarios y Roles</span>
      </div>

      <div className="usuarios-header">
        <h1>Gestión de Usuarios y Roles</h1>
        <p>Crear, editar y asignar roles y permisos de acceso.</p>
      </div>

      <div className="usuarios-filtros">
        <div className="filtro-busqueda">
          <svg className="filtro-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="filtro-input"
          />
        </div>

        <select
          value={filtroRol}
          onChange={(e) => { setFiltroRol(e.target.value); setPagina(1); }}
          className="filtro-select"
        >
          <option value="">Todos los roles</option>
          {roles.map(rol => (
            <option key={rol.rolId} value={rol.nombreRol}>
              {formatearNombreRol(rol.nombreRol)}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
          className="filtro-select"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        <button className="btn-agregar" onClick={() => setModalCrearAbierto(true)}>
          + Agregar Usuario
        </button>
      </div>

      <div className="tabla-container">
        {cargando ? (
          <div className="tabla-loading">
            <div className="spinner"></div>
            <p>Cargando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="tabla-vacia">
            <p>No se encontraron usuarios</p>
          </div>
        ) : (
          <table className="tabla-usuarios">
            <thead>
              <tr>
                <th className="col-checkbox"></th>
                <th className="col-avatar"></th>
                <th>Nombre Completo</th>
                <th>Correo Institucional</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Escuela/Dependencia</th>
                <th>Último Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => {
                const infoRol = obtenerInfoRol(usuario);
                return (
                  <tr key={usuario.usuarioId}>
                    <td className="col-checkbox">
                      <input type="checkbox" className="checkbox-row" />
                    </td>
                    <td className="col-avatar">
                      <div className="avatar-circle">
                        {obtenerIniciales(usuario.nombreUsuario, usuario.apellido1Usuario)}
                      </div>
                    </td>
                    <td className="nombre-completo">
                      {usuario.nombreUsuario} {usuario.apellido1Usuario} {usuario.apellido2Usuario}
                    </td>
                    <td className="correo">{usuario.correoInstitucional}</td>
                    <td>
                      <span className={`rol-badge ${infoRol.color}`}>
                        {infoRol.nombre}
                      </span>
                    </td>
                    <td>
                      <span className={`estado-badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="escuela">
                      {usuario.nombreEscuela || 'VIE'}
                    </td>
                    <td className="ultimo-acceso">
                      {formatearUltimoAcceso(usuario.ultimoAcceso)}
                    </td>
                    <td>
                      <div className="acciones-celda">
                        <button 
                          className="btn-accion" 
                          title="Editar"
                          onClick={() => {
                            setUsuarioEditando(usuario);
                            setModalEditarAbierto(true);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="btn-accion" 
                          title={usuario.activo ? 'Desactivar' : 'Activar'}
                          onClick={() => handleCambiarEstado(usuario)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {usuario.activo ? (
                              <>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                              </>
                            ) : (
                              <>
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                                <line x1="12" y1="2" x2="12" y2="12"/>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="paginacion">
        <div className="paginacion-info">
          Mostrando {usuarios.length > 0 ? ((pagina - 1) * tamanoPagina + 1) : 0}-
          {Math.min(pagina * tamanoPagina, totalRegistros)} de {totalRegistros} usuarios
        </div>
        <div className="paginacion-botones">
          <button
            className="btn-paginacion"
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
          >
            ← Anterior
          </button>
          {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              className={`btn-paginacion ${pagina === num ? 'active' : ''}`}
              onClick={() => setPagina(num)}
            >
              {num}
            </button>
          ))}
          <button
            className="btn-paginacion"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente →
          </button>
        </div>
      </div>

      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="Crear Nuevo Usuario"
        size="large"
      >
        <UserForm
          roles={roles}
          escuelas={escuelas}
          onSubmit={handleCrear}
          onCancel={() => setModalCrearAbierto(false)}
          cargando={cargandoForm}
        />
      </Modal>

      <Modal
        isOpen={modalEditarAbierto}
        onClose={() => {
          setModalEditarAbierto(false);
          setUsuarioEditando(null);
        }}
        title="Editar Usuario"
        size="large"
      >
        <UserForm
          usuario={usuarioEditando}
          roles={roles}
          escuelas={escuelas}
          onSubmit={handleEditar}
          onCancel={() => {
            setModalEditarAbierto(false);
            setUsuarioEditando(null);
          }}
          cargando={cargandoForm}
        />
      </Modal>
    </div>
  );
}