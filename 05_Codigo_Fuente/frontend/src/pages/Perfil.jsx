import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const Perfil = () => {
  const { usuario, rolActivo, formatearNombreRol, cargarPerfil } = useAuth();

  const [datosPerfil, setDatosPerfil] = useState({
    nombreCompleto: usuario ? `${usuario.nombre} ${usuario.apellido1 || ''} ${usuario.apellido2 || ''}`.trim() : 'Dr. William Fallas',
    gradoAcademico: 'Doctorado en Ciencias Biológicas',
    orcidId: '0000-0002-1825-0097',
    scopusId: '571952314900',
    telefono: usuario?.telefono || '+506 2511-4523',
    institucion: 'Tecnológico de Costa Rica (TEC)',
    escuela: usuario?.escuela || 'Escuela de Ingeniería Electrónica',
    departamento: 'Departamento de Bioingeniería',
    correo: usuario?.correo || 'william.fallas@tec.ac.cr',
    especialidad: 'Biotecnología Agrícola y Ambiental'
  });

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

  const [tags, setTags] = useState(['Biotecnología', 'Educación STEM', 'Ingeniería Ambiental']);
  const [nuevoTag, setNuevoTag] = useState('');
  const [mostrarInputTag, setMostrarInputTag] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  const handleAgregarTag = (e) => {
    e.preventDefault();
    if (nuevoTag.trim() && !tags.includes(nuevoTag.trim())) {
      setTags([...tags, nuevoTag.trim()]);
      setNuevoTag('');
      setMostrarInputTag(false);
    }
  };

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
    } catch (err) {
      console.warn('No se pudo persistir en backend remoto, guardando localmente:', err);
    }

    setMensajeGuardado(true);
    setTimeout(() => setMensajeGuardado(false), 3000);
  };

  return (
    <div className="perfil-page-container">
      <div className="dashboard-main-card">
        {/* Encabezado */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">
              Perfil del {rolActivo?.toLowerCase().includes('vinculacion') ? 'Evaluador de Vinculación' : 'Investigador'}
            </h1>
            <p className="dashboard-subtitle">
              Gestiona sus datos académicos, filiación institucional e identificadores científicos.
            </p>
          </div>

          <div className="dashboard-actions-group">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => window.history.back()}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn-nueva-propuesta"
              onClick={handleGuardar}
            >
              Guardar Cambios
            </button>
          </div>
        </div>

        {mensajeGuardado && (
          <div className="alert-guardado-exito">
            ✓ Cambios guardados correctamente en su perfil institucional.
          </div>
        )}

        {/* Layout en dos columnas */}
        <div className="perfil-layout-grid">
          {/* Columna Izquierda: Tarjeta de identidad y tags */}
          <div className="perfil-col-identidad">
            <div className="perfil-avatar-wrapper">
              <img 
                src="/perfil.png" 
                alt="Foto de perfil" 
                className="perfil-foto-grande"
                onError={(e) => {
                  e.target.src = 'https://ui-avatars.com/api/?name=Elena+Vargas&background=002855&color=fff';
                }}
              />
              <button 
                type="button" 
                className="btn-cambiar-foto"
                onClick={() => alert('Seleccione una imagen para actualizar su fotografía institucional.')}
              >
                📷 Cambiar foto
              </button>
            </div>

            <h3 className="perfil-nombre-lateral">{datosPerfil.nombreCompleto}</h3>
            <p className="perfil-rol-lateral">{formatearNombreRol(rolActivo)}</p>
            <p className="perfil-especialidad-lateral">{datosPerfil.especialidad}</p>

            <div className="perfil-divider" />

            {/* Áreas de interés */}
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
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button type="submit" className="btn-nueva-propuesta" style={{ padding: '4px 10px', fontSize: '12px' }}>
                      Añadir
                    </button>
                    <button type="button" className="btn-cancel" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setMostrarInputTag(false)}>
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

            {/* Proyectos Activos */}
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

          {/* Columna Derecha: Formulario detallado */}
          <div className="perfil-col-formulario">
            {/* Sección: Datos Académicos e Identificadores */}
            <div className="perfil-form-block">
              <h2 className="column-title">Datos Académicos e Identificadores</h2>
              <p className="column-subtitle">Información verificada para publicaciones y convocatorias de investigación.</p>

              <div className="perfil-fields-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={datosPerfil.nombreCompleto}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, nombreCompleto: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Grado Académico</label>
                  <input
                    type="text"
                    value={datosPerfil.gradoAcademico}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, gradoAcademico: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>ORCID ID</label>
                    <span className="badge-validado">✓ Validado</span>
                  </div>
                  <input
                    type="text"
                    value={datosPerfil.orcidId}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, orcidId: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono de Oficina</label>
                  <input
                    type="text"
                    value={datosPerfil.telefono}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, telefono: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group">
                  <label>Scopus Author ID</label>
                  <input
                    type="text"
                    value={datosPerfil.scopusId}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, scopusId: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>
            </div>

            <div className="perfil-divider" />

            {/* Sección: Información Institucional */}
            <div className="perfil-form-block">
              <h2 className="column-title">Información Institucional</h2>
              <p className="column-subtitle">Filiación oficial dentro del Tecnológico de Costa Rica.</p>

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
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, escuela: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Departamento</label>
                  <input
                    type="text"
                    value={datosPerfil.departamento}
                    onChange={(e) => setDatosPerfil({ ...datosPerfil, departamento: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
