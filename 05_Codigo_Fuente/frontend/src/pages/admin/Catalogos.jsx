// src/pages/admin/Catalogos.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogoService } from '../../services/catalogoService';
import Modal from '../../components/Modal';
import CatalogoForm from '../../components/CatalogoForm';
import '../../styles/catalogos.css';

const NOMBRES_CATALOGOS = {
  'escuelas': 'Escuelas',
  'lineas-investigacion': 'Líneas de Investigación',
  'roles-equipo': 'Roles',
  'niveles-trl': 'Niveles TRL',
  'tipos-hora': 'Tipos de Hora',
  'modalidades': 'Modalidades',
  'campus': 'Campus',
  'convocatorias': 'Convocatorias',
  'etapas': 'Etapas',
  'configuraciones': 'Configuraciones',
};
const CAMPOS_TABLA = {
  'escuelas': { 
    id: 'escuelaId', 
    clave: 'codigoEscuela', 
    nombre: 'nombreEscuela', 
    campus: 'nombreCampus' 
  },
  'lineas-investigacion': { 
    id: 'lineaInvestigacionId', 
    clave: 'lineaInvestigacionId', 
    nombre: 'nombreLinea' 
  },
  'roles-equipo': { 
    id: 'rolEquipoId', 
    clave: 'rolEquipoId', 
    nombre: 'nombreRol' 
  },
  'niveles-trl': { 
    id: 'nivelTrlId', 
    clave: 'nivelTrlId', 
    nombre: 'descripcionNivel' 
  },
  'tipos-hora': { 
    id: 'tipoHoraId', 
    clave: 'codigoTipo', 
    nombre: 'descripcion' 
  },
  'modalidades': { 
    id: 'modalidadId', 
    clave: 'modalidadId', 
    nombre: 'nombreModalidad' 
  },
  'campus': { 
    id: 'campusId', 
    clave: 'campusId', 
    nombre: 'nombreCampus' 
  },
  'convocatorias': { 
    id: 'convocatoriaId', 
    clave: 'convocatoriaId', 
    nombre: 'nombreConvocatoria' 
  },
  'etapas': { 
    id: 'etapaId', 
    clave: 'etapaId', 
    nombre: 'nombreEtapa' 
  },
  'configuraciones': { 
    id: 'configuracionId', 
    clave: 'claveConfig', 
    nombre: 'valorConfig' 
  },
};

// ============================================================================
// FUNCIONES AUXILIARES (Pegar justo debajo de CAMPOS_TABLA)
// ============================================================================
// Función simple: devuelve el valor si existe, sino '—'
const obtenerValor = (registro, nombreCampo) => {
  if (!registro || !nombreCampo) return '—';
  return registro[nombreCampo] !== undefined && registro[nombreCampo] !== null && registro[nombreCampo] !== '' 
    ? registro[nombreCampo] 
    : '—';
};

// Función para key única de React
const getRegistroKey = (registro, catalogo, index) => {
  const config = CAMPOS_TABLA[catalogo] || {};
  const idValor = registro[config.id] || `row-${index}`;
  return `${idValor}-${index}`;
};

// Función para obtener el ID limpio para el backend
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
  
  // Estados de modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [cargandoForm, setCargandoForm] = useState(false);
  
  // Toast de notificación
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
      setDatos(response.data.items || []);
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
      // 1. LIMPIEZA DE DATOS: Convertir strings vacíos a null para que Pydantic los acepte
      const datosLimpios = { ...formData };
      Object.keys(datosLimpios).forEach(key => {
        if (datosLimpios[key] === '') {
          datosLimpios[key] = null;
        }
      });

      await catalogoService.crear(catalogoActivo, datosLimpios);
      mostrarToast('Registro creado exitosamente');
      setModalCrearAbierto(false);
      cargarDatos();
    } catch (error) {
      console.error('Error creando registro:', error);
      
      // 2. MANEJO INTELIGENTE DEL ERROR 422 (Te dirá exactamente qué falló)
      const detail = error.response?.data?.detail;
      let mensajeError = 'Error al crear el registro';
      
      if (Array.isArray(detail)) {
        // FastAPI devuelve un array. Lo unimos en un string legible.
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

      // 1. LIMPIEZA DE DATOS
      const datosLimpios = { ...formData };
      Object.keys(datosLimpios).forEach(key => {
        if (datosLimpios[key] === '') {
          datosLimpios[key] = null;
        }
      });

      await catalogoService.actualizar(catalogoActivo, id, datosLimpios);
      mostrarToast('Registro actualizado exitosamente');
      setModalEditarAbierto(false);
      setRegistroEditando(null);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando registro:', error);
      
      // 2. MANEJO INTELIGENTE DEL ERROR 422
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

  return (
    <div className="catalogos-container">
      {/* Toast de notificación */}
      {toast && (
        <div className={`toast ${toast.tipo}`}>
          <span className="toast-icon">{toast.tipo === 'success' ? '✓' : '✕'}</span>
          <span className="toast-message">{toast.mensaje}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/dashboard">Comité técnico</Link>
        <span className="breadcrumb-separator">›</span>
        <span>Gestión de Catálogos</span>
      </div>

      {/* Header */}
      <div className="catalogos-header">
        <h1>Gestión de Catálogos</h1>
        <p>Administrar Escuelas, Líneas de Investigación, Tipos de Hora y niveles TRL.</p>
      </div>

      {/* Tabs */}
      <div className="catalogos-tabs">
        {Object.keys(NOMBRES_CATALOGOS).map((clave) => (
          <button
            key={clave}
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

      {/* Toolbar */}
      <div className="catalogos-toolbar">
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder={`Buscar ${NOMBRES_CATALOGOS[catalogoActivo].toLowerCase()} por nombre o clave...`}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="search-input"
          />
        </div>
        <button className="btn-agregar" onClick={() => setModalCrearAbierto(true)}>
          + Agregar nuevo
        </button>
      </div>

      {/* Tabla */}
      <div className="tabla-container">
        {cargando ? (
          <div className="tabla-loading">
            <div className="spinner"></div>
            <p>Cargando datos...</p>
          </div>
        ) : datos.length === 0 ? (
          <div className="tabla-vacia">
            <p>No se encontraron registros</p>
          </div>
        ) : (
          <table className="tabla-datos">
            <thead>
              <tr>
                <th>CLAVE</th>
                <th>NOMBRE</th>
                <th>ESTATUS</th>
                {CAMPOS_TABLA[catalogoActivo]?.campus && <th>CAMPUS</th>}
                <th>ACCIONES</th>
              </tr>
            </thead>
           <tbody>
  {datos.map((registro, index) => {
    const config = CAMPOS_TABLA[catalogoActivo] || {};
    
    return (
      <tr key={getRegistroKey(registro, catalogoActivo, index)}>
        <td>
          <span className="clave-badge">
            {obtenerValor(registro, config.clave)}
          </span>
        </td>
        <td className="nombre-celda">
          {obtenerValor(registro, config.nombre)}
        </td>
        <td>
          <span className={`estatus-badge ${registro.activo ? 'activo' : 'inactivo'}`}>
            {registro.activo ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        
        {config.campus && (
          <td>
            {obtenerValor(registro, config.campus)}
          </td>
        )}
        
        <td>
          <div className="acciones-celda">
            <button 
              className="btn-accion" 
              title="Editar"
              onClick={() => {
                setRegistroEditando(registro);
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
              title={registro.activo ? 'Desactivar' : 'Activar'}
              onClick={() => handleCambiarEstado(registro)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Paginación */}
      <div className="paginacion">
        <div className="paginacion-info">
          Mostrando {datos.length > 0 ? ((pagina - 1) * tamanoPagina + 1) : 0}-
          {Math.min(pagina * tamanoPagina, totalRegistros)} de {totalRegistros} registros
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

      {/* Modal Crear */}
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

      {/* Modal Editar */}
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