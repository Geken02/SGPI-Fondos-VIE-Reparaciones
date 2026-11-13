import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogoService } from '../../services/catalogoService';
import Modal from '../../components/Modal';
import CatalogoForm from '../../components/CatalogoForm';
import '../../styles/catalogos.css';

const NOMBRES_CATALOGOS = {
  'escuelas': 'Escuelas',
  'lineas-investigacion': 'Líneas de Investigación',
  'roles-equipo': 'Roles de Equipo',
  'niveles-trl': 'Niveles TRL',
  'tipos-hora': 'Tipos de Hora',
  'modalidades': 'Modalidades',
  'campus': 'Campus',
  'convocatorias': 'Convocatorias',
  'etapas': 'Etapas',
  'configuraciones': 'Configuraciones',
};

const CAMPOS_TABLA = {
  'escuelas': { id: 'escuelaId', clave: 'codigoEscuela', nombre: 'nombreEscuela', campus: 'nombreCampus' },
  'lineas-investigacion': { id: 'lineaId', clave: 'lineaId', nombre: 'nombreLinea' },
  'roles-equipo': { id: 'rolEquipoId', clave: 'rolEquipoId', nombre: 'nombreRol' },
  'niveles-trl': { id: 'nivelTrlId', clave: 'nivelTrlId', nombre: 'descripcionNivel' },
  'tipos-hora': { id: 'tipoHoraId', clave: 'codigoTipo', nombre: 'descripcion' },
  'modalidades': { id: 'modalidadId', clave: 'modalidadId', nombre: 'nombreModalidad' },
  'campus': { id: 'campusId', clave: 'campusId', nombre: 'nombreCampus' },
  'convocatorias': { id: 'convocatoriaId', clave: 'convocatoriaId', nombre: 'nombreConvocatoria' },
  'etapas': { id: 'etapaId', clave: 'etapaId', nombre: 'nombreEtapa' },
  'configuraciones': { id: 'configuracionId', clave: 'claveConfiguracion', nombre: 'valorConfiguracion', descripcion: 'descripcion' },
};

const obtenerValor = (registro, nombreCampo) => {
  if (!registro || !nombreCampo) return '—';
  if (registro[nombreCampo] !== undefined && registro[nombreCampo] !== null && registro[nombreCampo] !== '') {
    return registro[nombreCampo];
  }
  for (const key in registro) {
    if (typeof registro[key] === 'object' && registro[key] !== null && registro[key][nombreCampo] !== undefined) {
      return registro[key][nombreCampo];
    }
  }
  return '—';
};

const getRegistroKey = (registro, catalogo, index) => {
  const config = CAMPOS_TABLA[catalogo] || {};
  const idValor = registro[config.id] || `row-${index}`;
  return `${idValor}-${index}`;
};

const obtenerIdReal = (registro, catalogo) => {
  const config = CAMPOS_TABLA[catalogo] || {};
  return registro[config.id];
};

export default function Catalogos() {
  const [catalogoActivo, setCatalogoActivo] = useState('escuelas');
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [tamanoPagina] = useState(10);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [cargandoForm, setCargandoForm] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [catalogoActivo, pagina, busqueda]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const response = await catalogoService.listar(catalogoActivo, {
        pagina,
        tamanoPagina,
        busqueda: busqueda || undefined,
      });
      const items = response.data.items || [];
      console.log(`📦 DATOS CRUDOS DE ${catalogoActivo.toUpperCase()}:`, items);
      if (items.length > 0) {
        console.log(`🔑 CLAVES DISPONIBLES EN EL PRIMER REGISTRO:`, Object.keys(items[0]));
      }
      setDatos(items);
      setTotalRegistros(response.data.total || 0);
    } catch (error) {
      console.error(`Error cargando ${catalogoActivo}:`, error);
      setDatos([]);
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
      const datosLimpios = { ...formData };
      Object.keys(datosLimpios).forEach(key => {
        if (datosLimpios[key] === '') datosLimpios[key] = null;
      });
      await catalogoService.crear(catalogoActivo, datosLimpios);
      mostrarToast('Registro creado exitosamente');
      setModalCrearAbierto(false);
      cargarDatos();
    } catch (error) {
      console.error('Error creando registro:', error);
      const detail = error.response?.data?.detail;
      let mensajeError = 'Error al crear el registro';
      if (Array.isArray(detail)) {
        mensajeError = detail.map(err => `${err.loc.slice(1).join('.')}: ${err.msg}`).join(' | ');
      } else if (typeof detail === 'string') {
        mensajeError = detail;
      }
      mostrarToast(mensajeError, 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  const handleEditar = async (formData) => {
    setCargandoForm(true);
    try {
      const id = obtenerIdReal(registroEditando, catalogoActivo);
      if (!id) throw new Error("No se pudo identificar el ID del registro");
      const datosLimpios = { ...formData };
      Object.keys(datosLimpios).forEach(key => {
        if (datosLimpios[key] === '') datosLimpios[key] = null;
      });
      await catalogoService.actualizar(catalogoActivo, id, datosLimpios);
      mostrarToast('Registro actualizado exitosamente');
      setModalEditarAbierto(false);
      setRegistroEditando(null);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando registro:', error);
      const detail = error.response?.data?.detail;
      let mensajeError = 'Error al actualizar el registro';
      if (Array.isArray(detail)) {
        mensajeError = detail.map(err => `${err.loc.slice(1).join('.')}: ${err.msg}`).join(' | ');
      } else if (typeof detail === 'string') {
        mensajeError = detail;
      }
      mostrarToast(mensajeError, 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  const handleCambiarEstado = async (registro) => {
    if (!window.confirm(`¿Está seguro de ${registro.activo ? 'desactivar' : 'activar'} este registro?`)) {
      return;
    }
    try {
      const id = obtenerIdReal(registro, catalogoActivo);
      if (!id) throw new Error("No se pudo identificar el ID del registro");
      await catalogoService.cambiarEstado(catalogoActivo, id, !registro.activo);
      mostrarToast(`Registro ${registro.activo ? 'desactivado' : 'activado'} exitosamente`);
      cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      mostrarToast(error.message || 'Error al cambiar el estado', 'error');
    }
  };

  const totalPaginas = Math.ceil(totalRegistros / tamanoPagina);
  const config = CAMPOS_TABLA[catalogoActivo] || {};

  return (
    <div className="catalogos-container">
      {/* ✅ Toast con role="status" para lectores de pantalla */}
      {toast && (
        <div className={`toast ${toast.tipo}`} role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      {/* ✅ Breadcrumbs semánticos con <nav> y <ol> */}
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <ol>
          <li><Link to="/dashboard">Inicio</Link></li>
          <li className="breadcrumb-separator" aria-hidden="true">›</li>
          <li aria-current="page">Gestión de Catálogos</li>
        </ol>
      </nav>

      <header className="catalogos-header">
        <h1 id="titulo-catalogos">Gestión de Catálogos</h1>
        <p>Administrar los catálogos base del sistema.</p>
      </header>

      {/* ✅ Tabs con role="tablist" y aria-selected */}
      <div className="catalogos-tabs" role="tablist" aria-label="Categorías de catálogos">
        {Object.keys(NOMBRES_CATALOGOS).map((clave) => (
          <button
            key={clave}
            role="tab"
            id={`tab-${clave}`}
            aria-selected={catalogoActivo === clave}
            aria-controls="panel-catalogos"
            tabIndex={catalogoActivo === clave ? 0 : -1}
            className={`tab-btn ${catalogoActivo === clave ? 'active' : ''}`}
            onClick={() => {
              setCatalogoActivo(clave);
              setPagina(1);
              setBusqueda('');
            }}
          >
            {NOMBRES_CATALOGOS[clave]}
          </button>
        ))}
      </div>

      {/* ✅ Panel de contenido con role="tabpanel" */}
      <div
        id="panel-catalogos"
        role="tabpanel"
        aria-labelledby={`tab-${catalogoActivo}`}
      >
        <div className="catalogos-toolbar">
          <div className="search-box">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {/* ✅ Input con aria-label y id */}
            <input
              type="text"
              id="busqueda-catalogo"
              aria-label={`Buscar en ${NOMBRES_CATALOGOS[catalogoActivo]}`}
              placeholder={`Buscar ${NOMBRES_CATALOGOS[catalogoActivo].toLowerCase()}...`}
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              className="search-input"
            />
          </div>
          {/* ✅ Botón con aria-haspopup */}
          <button className="btn-agregar" onClick={() => setModalCrearAbierto(true)} aria-haspopup="dialog">
            + Agregar nuevo
          </button>
        </div>

        <div className="tabla-container">
          {cargando ? (
            <div className="tabla-loading" role="status" aria-live="polite">
              <div className="spinner"></div>
              <p>Cargando datos...</p>
            </div>
          ) : datos.length === 0 ? (
            <div className="tabla-vacia" role="status">
              <p>No se encontraron registros</p>
            </div>
          ) : (
            /* ✅ Tabla con aria-label y scope en th */
            <table className="tabla-datos" aria-label={`Registros de ${NOMBRES_CATALOGOS[catalogoActivo]}`}>
              <thead>
                <tr>
                  <th scope="col">CLAVE</th>
                  <th scope="col">NOMBRE</th>
                  <th scope="col">ESTATUS</th>
                  {config.campus && <th scope="col">CAMPUS</th>}
                  <th scope="col">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((registro, index) => {
                  const nombreRegistro = obtenerValor(registro, config.nombre);
                  return (
                    <tr key={getRegistroKey(registro, catalogoActivo, index)}>
                      <td>
                        <span className="clave-badge">
                          {obtenerValor(registro, config.clave)}
                        </span>
                      </td>
                      <td className="nombre-celda">
                        {nombreRegistro}
                      </td>
                      <td>
                        <span className={`estatus-badge ${registro.activo ? 'activo' : 'inactivo'}`} aria-label={`Estado: ${registro.activo ? 'Activo' : 'Inactivo'}`}>
                          {registro.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {config.campus && (
                        <td>{obtenerValor(registro, config.campus)}</td>
                      )}
                      <td>
                        <div className="acciones-celda">
                          {/* ✅ Botones con aria-label descriptivo */}
                          <button
                            className="btn-accion"
                            aria-label={`Editar ${nombreRegistro}`}
                            onClick={() => {
                              setRegistroEditando(registro);
                              setModalEditarAbierto(true);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            className="btn-accion"
                            aria-label={`${registro.activo ? 'Desactivar' : 'Activar'} ${nombreRegistro}`}
                            onClick={() => handleCambiarEstado(registro)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                              {registro.activo ? (
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

        {/* ✅ Paginación con aria-label y aria-current */}
        <div className="paginacion" role="navigation" aria-label="Paginación de registros">
          <div className="paginacion-info">
            Mostrando {datos.length > 0 ? ((pagina - 1) * tamanoPagina + 1) : 0}-
            {Math.min(pagina * tamanoPagina, totalRegistros)} de {totalRegistros} registros
          </div>
          <div className="paginacion-botones">
            <button
              className="btn-paginacion"
              disabled={pagina === 1}
              onClick={() => setPagina(pagina - 1)}
              aria-label="Ir a la página anterior"
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={`btn-paginacion ${pagina === num ? 'active' : ''}`}
                onClick={() => setPagina(num)}
                aria-label={`Ir a la página ${num}`}
                aria-current={pagina === num ? 'page' : undefined}
              >
                {num}
              </button>
            ))}
            <button
              className="btn-paginacion"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(pagina + 1)}
              aria-label="Ir a la página siguiente"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title={`Crear ${NOMBRES_CATALOGOS[catalogoActivo]}`}
        size="medium"
      >
        <CatalogoForm
          catalogo={catalogoActivo}
          onSubmit={handleCrear}
          onCancel={() => setModalCrearAbierto(false)}
          cargando={cargandoForm}
        />
      </Modal>

      <Modal
        isOpen={modalEditarAbierto}
        onClose={() => {
          setModalEditarAbierto(false);
          setRegistroEditando(null);
        }}
        title={`Editar ${NOMBRES_CATALOGOS[catalogoActivo]}`}
        size="medium"
      >
        <CatalogoForm
          catalogo={catalogoActivo}
          datosExistentes={registroEditando}
          onSubmit={handleEditar}
          onCancel={() => {
            setModalEditarAbierto(false);
            setRegistroEditando(null);
          }}
          cargando={cargandoForm}
        />
      </Modal>
    </div>
  );
}