// src/pages/Perfil.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';

const Perfil = () => {
  const { usuario, rolActivo, formatearNombreRol, cargarPerfil } = useAuth();
  const fileInputRef = useRef(null);

  // ─────────────────────────────────────────────
  // Estados para la foto de perfil
  // ─────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const [urlFotoPerfil, setUrlFotoPerfil] = useState(null);

  // ─────────────────────────────────────────────
  // Estados del perfil
  // ─────────────────────────────────────────────
  const [datosPerfil, setDatosPerfil] = useState({
    nombreCompleto: usuario
      ? `${usuario.nombre || ''} ${usuario.apellido1 || ''} ${usuario.apellido2 || ''}`.trim()
      : 'Investigador',
    gradoAcademico: 'Doctorado en Ciencias Biológicas',
    orcidId: '0000-0002-1825-0097',
    scopusId: '571952314900',
    telefono: usuario?.telefono || '+506 2511-4523',
    institucion: 'Tecnológico de Costa Rica (TEC)',
    escuela: usuario?.escuela || 'Escuela de Ingeniería Electrónica',
    departamento: 'Departamento de Bioingeniería',
    correo: usuario?.correo || 'investigador@tec.ac.cr',
    especialidad: 'Biotecnología Agrícola y Ambiental'
  });

  const [tags, setTags] = useState(['Biotecnología', 'Educación STEM', 'Ingeniería Ambiental']);
  const [nuevoTag, setNuevoTag] = useState('');
  const [mostrarInputTag, setMostrarInputTag] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  // ─────────────────────────────────────────────
  // Cargar datos del usuario cuando cambia el contexto
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (usuario) {
      setDatosPerfil(prev => ({
        ...prev,
        nombreCompleto: `${usuario.nombre || ''} ${usuario.apellido1 || ''} ${usuario.apellido2 || ''}`.trim(),
        telefono: usuario.telefono || prev.telefono,
        escuela: usuario.escuela || prev.escuela,
        correo: usuario.correo || prev.correo
      }));
    }
  }, [usuario]);

  // ─────────────────────────────────────────────
  // Cargar la foto de perfil desde el backend
  // ─────────────────────────────────────────────
  useEffect(() => {
    const cargarFoto = async () => {
      if (!usuario?.usuarioId) return;
      try {
        const data = await adminService.obtenerFotoPerfil(usuario.usuarioId);
        if (data?.tieneFoto && data?.urlPublica) {
          setUrlFotoPerfil(data.urlPublica);
        } else {
          setUrlFotoPerfil(null);
        }
      } catch (err) {
        console.warn('No se pudo cargar la foto de perfil:', err);
      }
    };
    cargarFoto();
  }, [usuario?.usuarioId]);

  // ─────────────────────────────────────────────
  // Limpieza de memoria (URL.createObjectURL)
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ─────────────────────────────────────────────
  // Determinar qué imagen mostrar
  // ─────────────────────────────────────────────
  const obtenerUrlImagen = () => {
    if (previewUrl) return previewUrl;
    if (urlFotoPerfil) return urlFotoPerfil;

    const nombreParaAvatar = encodeURIComponent(datosPerfil.nombreCompleto || 'Usuario');
    return `https://ui-avatars.com/api/?name=${nombreParaAvatar}&background=002855&color=fff&size=256`;
  };

  // ─────────────────────────────────────────────
  // Selección de archivo con validaciones
  // ─────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      setErrorFoto('Solo se permiten imágenes en formato JPG, PNG o WebP.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorFoto('La imagen no debe superar los 5 MB.');
      return;
    }

    setErrorFoto('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ─────────────────────────────────────────────
  // Subir foto al backend
  // ─────────────────────────────────────────────
  const handleSubirFoto = async () => {
    if (!selectedFile || !usuario?.usuarioId) return;

    setSubiendoFoto(true);
    setErrorFoto('');

    try {
      const respuesta = await adminService.actualizarFotoPerfil(usuario.usuarioId, selectedFile);

      if (respuesta?.urlPublica) {
        setUrlFotoPerfil(respuesta.urlPublica);
      }

      if (cargarPerfil) {
        await cargarPerfil();
      }

      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      setMensajeGuardado(true);
      setTimeout(() => setMensajeGuardado(false), 3000);
    } catch (err) {
      console.error('Error subiendo foto:', err);
      const msg = err.response?.data?.detail || 'Error al subir la imagen. Intente nuevamente.';
      setErrorFoto(msg);
    } finally {
      setSubiendoFoto(false);
    }
  };

  // ─────────────────────────────────────────────
  // Cancelar selección de foto
  // ─────────────────────────────────────────────
  const handleCancelarFoto = () => {
    setSelectedFile(null);
    setErrorFoto('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─────────────────────────────────────────────
  // Guardar cambios del perfil (datos académicos)
  // ─────────────────────────────────────────────
  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      const partes = datosPerfil.nombreCompleto.trim().split(/\s+/);
      const nombre = partes[0] || 'Investigador';
      const apellido1 = partes[1] || '';
      const apellido2 = partes.slice(2).join(' ') || '';

      await authService.actualizarPerfil({
        nombre,
        apellido1,
        apellido2,
        telefono: datosPerfil.telefono
      });

      if (cargarPerfil) {
        await cargarPerfil();
      }
      setMensajeGuardado(true);
      setTimeout(() => setMensajeGuardado(false), 3000);
    } catch (err) {
      console.warn('No se pudo persistir en backend remoto:', err);
    }
  };

  // ─────────────────────────────────────────────
  // Gestión de tags / áreas de interés
  // ─────────────────────────────────────────────
  const handleAgregarTag = (e) => {
    e.preventDefault();
    if (nuevoTag.trim() && !tags.includes(nuevoTag.trim())) {
      setTags([...tags, nuevoTag.trim()]);
      setNuevoTag('');
      setMostrarInputTag(false);
    }
  };

  return (
    <div className="perfil-page-container">
      <div className="dashboard-main-card">
        {/* ─── Encabezado ─── */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Perfil del{' '}
              {rolActivo?.toLowerCase().includes('vinculacion')
                ? 'Evaluador de Vinculación'
                : 'Investigador'}
            </h1>
            <p className="dashboard-subtitle">
              Gestiona sus datos académicos, filiación institucional e identificadores científicos.
            </p>
          </div>

          <div className="dashboard-actions-group">
            <button type="button" className="btn-cancel" onClick={() => window.history.back()}>
              Cancelar
            </button>
            <button type="button" className="btn-nueva-propuesta" onClick={handleGuardar}>
              Guardar Cambios
            </button>
          </div>
        </div>

        {mensajeGuardado && (
          <div className="alert-guardado-exito">
            ✓ Cambios guardados correctamente en su perfil institucional.
          </div>
        )}

        {/* ─── Layout en dos columnas ─── */}
        <div className="perfil-layout-grid">
          {/* ─── Columna Izquierda: Identidad ─── */}
          <div className="perfil-col-identidad">
            <div className="perfil-avatar-wrapper">
              <img
                src={obtenerUrlImagen()}
                alt={`Foto de perfil de ${datosPerfil.nombreCompleto}`}
                className="perfil-foto-grande"
                onError={(e) => {
                  const nombreFallback = encodeURIComponent(datosPerfil.nombreCompleto || 'Usuario');
                  e.target.src = `https://ui-avatars.com/api/?name=${nombreFallback}&background=002855&color=fff&size=256`;
                }}
              />

              {!selectedFile ? (
                <button
                  type="button"
                  className="btn-cambiar-foto"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷 Cambiar foto
                </button>
              ) : (
                <div
                  className="perfil-foto-acciones"
                  style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
                >
                  <button
                    type="button"
                    className="btn-nueva-propuesta"
                    style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                    onClick={handleSubirFoto}
                    disabled={subiendoFoto}
                  >
                    {subiendoFoto ? 'Subiendo...' : '✓ Guardar Foto'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ flex: 1, fontSize: '13px', padding: '8px' }}
                    onClick={handleCancelarFoto}
                    disabled={subiendoFoto}
                  >
                    ✕ Cancelar
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                aria-label="Seleccionar nueva foto de perfil"
              />
            </div>

            {errorFoto && (
              <div
                className="alert-error"
                style={{
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginTop: '12px',
                  textAlign: 'center'
                }}
              >
                ⚠️ {errorFoto}
              </div>
            )}

            <h3 className="perfil-nombre-lateral">{datosPerfil.nombreCompleto}</h3>
            <p className="perfil-rol-lateral">{formatearNombreRol(rolActivo)}</p>
            <p className="perfil-especialidad-lateral">{datosPerfil.especialidad}</p>

            <div className="perfil-divider" />

            {/* ─── Áreas de interés ─── */}
            <div className="perfil-tags-seccion">
              <h4 className="perfil-seccion-minititle">Áreas de interés</h4>
              <div className="perfil-tags-list">
                {tags.map((tag) => (
                  <span key={tag} className="perfil-tag-chip">
                    {tag}
                  </span>
                ))}
              </div>

              {mostrarInputTag ? (
                <form onSubmit={handleAgregarTag} className="perfil-nuevo-tag-form">
                  <input
                    type="text"
                    value={nuevoTag}
                    onChange={(e) => setNuevoTag(e.target.value)}
                    placeholder="Nueva área..."
                    className="modal-input"
                    style={{ padding: '6px 10px', fontSize: '13px', width: '100%' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="submit"
                      className="btn-nueva-propuesta"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      Añadir
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => setMostrarInputTag(false)}
                    >
                      ✕
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn-agregar-tag"
                  onClick={() => setMostrarInputTag(true)}
                >
                  + Agregar tag
                </button>
              )}
            </div>

            <div className="perfil-divider" />

            {/* ─── Proyectos Activos ─── */}
            <div className="perfil-proyectos-seccion">
              <h4 className="perfil-seccion-minititle">Proyectos Activos (2)</h4>
              <div className="perfil-proyecto-item">
                <div className="perfil-proyecto-codigo">CYTED-BIOTEM</div>
                <div className="perfil-proyecto-rol">Investigadora Principal</div>
              </div>
              <div className="perfil-proyecto-item">
                <div className="perfil-proyecto-codigo">Distribución Eje</div>
                <div className="perfil-proyecto-rol">Co-Investigadora</div>
              </div>
            </div>
          </div>

          {/* ─── Columna Derecha: Formulario ─── */}
          <div className="perfil-col-formulario">
            <div className="perfil-form-block">
              <h2 className="column-title">Datos Académicos e Identificadores</h2>
              <p className="column-subtitle">
                Información verificada para publicaciones y convocatorias de investigación.
              </p>

              <div className="perfil-fields-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={datosPerfil.nombreCompleto}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, nombreCompleto: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Grado Académico</label>
                  <input
                    type="text"
                    value={datosPerfil.gradoAcademico}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, gradoAcademico: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <label>ORCID ID</label>
                    <span className="badge-validado">✓ Validado</span>
                  </div>
                  <input
                    type="text"
                    value={datosPerfil.orcidId}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, orcidId: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono de Oficina</label>
                  <input
                    type="text"
                    value={datosPerfil.telefono}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, telefono: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Scopus Author ID</label>
                  <input
                    type="text"
                    value={datosPerfil.scopusId}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, scopusId: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>
              </div>
            </div>

            <div className="perfil-divider" />

            <div className="perfil-form-block">
              <h2 className="column-title">Información Institucional</h2>
              <p className="column-subtitle">
                Filiación oficial dentro del Tecnológico de Costa Rica.
              </p>

              <div className="perfil-fields-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Institución</label>
                  <input
                    type="text"
                    value={datosPerfil.institucion}
                    disabled
                    className="modal-input input-readonly"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Escuela / Centro de Investigación</label>
                  <input
                    type="text"
                    value={datosPerfil.escuela}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, escuela: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Departamento</label>
                  <input
                    type="text"
                    value={datosPerfil.departamento}
                    onChange={(e) =>
                      setDatosPerfil({ ...datosPerfil, departamento: e.target.value })
                    }
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <label>Correo Electrónico Institucional</label>
                    <span className="badge-oficial-tec">Oficial TEC</span>
                  </div>
                  <input
                    type="email"
                    value={datosPerfil.correo}
                    disabled
                    className="modal-input input-readonly"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default Perfil;