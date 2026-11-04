// src/components/CatalogoForm.jsx
import { useState, useEffect } from 'react';

// Configuración de campos por tipo de catálogo con límites exactos de la BD
const CONFIG_CAMPOS = {
  'escuelas': {
    campos: [
      { nombre: 'codigoEscuela', label: 'Código', tipo: 'text', requerido: true, placeholder: 'ESC-001', maxLength: 10 },
      { nombre: 'nombreEscuela', label: 'Nombre de la Escuela', tipo: 'text', requerido: true, placeholder: 'Escuela de Ingeniería en Computación', maxLength: 150 },
      { nombre: 'campusId', label: 'Campus', tipo: 'select', requerido: true, opciones: [
        { valor: 1, texto: 'Campus Central Cartago' },
        { valor: 2, texto: 'Campus San Carlos' },
        { valor: 3, texto: 'Campus Limón' },
        { valor: 4, texto: 'Sede Interuniversitaria de San José' },
      ]},
    ]
  },
  'lineas-investigacion': {
    campos: [
      { nombre: 'nombreLinea', label: 'Nombre de la Línea', tipo: 'text', requerido: true, placeholder: 'Inteligencia Artificial', maxLength: 200 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false, placeholder: 'Descripción detallada...', maxLength: 500 },
    ]
  },
  'roles-equipo': {
    campos: [
      { nombre: 'nombreRol', label: 'Nombre del Rol', tipo: 'text', requerido: true, placeholder: 'Coordinador', maxLength: 30 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false, placeholder: 'Descripción del rol...', maxLength: 300 },
    ]
  },
  'niveles-trl': {
    campos: [
      { nombre: 'nivelTrlId', label: 'Nivel TRL', tipo: 'number', requerido: true, placeholder: '1', min: 1, max: 9, hint: 'Debe ser un número entre 1 y 9' },
      { nombre: 'descripcionNivel', label: 'Descripción', tipo: 'textarea', requerido: true, placeholder: 'Principios básicos observados...', maxLength: 500 },
    ]
  },
  'tipos-hora': {
    campos: [
      { nombre: 'codigoTipo', label: 'Código', tipo: 'text', requerido: true, placeholder: 'VIE', maxLength: 20 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'text', requerido: true, placeholder: 'Horas de Vinculación e Investigación', maxLength: 100 },
    ]
  },
  'modalidades': {
    campos: [
      { nombre: 'nombreModalidad', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Básica', maxLength: 30 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false, placeholder: 'Descripción de la modalidad...', maxLength: 300 },
    ]
  },
  'campus': {
    campos: [
      { nombre: 'nombreCampus', label: 'Nombre del Campus', tipo: 'text', requerido: true, placeholder: 'Campus Central Cartago', maxLength: 50 },
    ]
  },
  'convocatorias': {
    campos: [
      { nombre: 'nombreConvocatoria', label: 'Nombre', tipo: 'text', requerido: true, placeholder: 'Convocatoria 2027', maxLength: 100 },
      { nombre: 'fechaApertura', label: 'Fecha de Apertura', tipo: 'date', requerido: true },
      { nombre: 'fechaCierre', label: 'Fecha de Cierre', tipo: 'date', requerido: true, hint: 'Debe ser posterior a la fecha de apertura' },
      { nombre: 'fechaBloqueoOrion', label: 'Fecha de Bloqueo en Orión', tipo: 'date', requerido: false, hint: 'Debe ser posterior o igual a la fecha de cierre' },
    ]
  },
  'etapas': {
    campos: [
      { nombre: 'nombreEtapa', label: 'Nombre de la Etapa', tipo: 'text', requerido: true, placeholder: 'Formulación', maxLength: 100 },
      { nombre: 'orden', label: 'Orden', tipo: 'number', requerido: true, placeholder: '1', min: 1 },
    ]
  },
  'configuraciones': {
    campos: [
      { nombre: 'claveConfig', label: 'Clave', tipo: 'text', requerido: true, placeholder: 'MAX_PRESUPUESTO', maxLength: 100 },
      { nombre: 'valorConfig', label: 'Valor', tipo: 'text', requerido: true, placeholder: '5000000', maxLength: 1000 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', requerido: false, maxLength: 255 },
    ]
  },
};

export default function CatalogoForm({ catalogo, datosExistentes, onSubmit, onCancel, cargando }) {
  const [formData, setFormData] = useState({});
  const [errores, setErrores] = useState({});

  const config = CONFIG_CAMPOS[catalogo] || { campos: [] };

  useEffect(() => {
    if (datosExistentes) {
      setFormData(datosExistentes);
    } else {
      const defaults = {};
      config.campos.forEach(campo => {
        defaults[campo.nombre] = campo.tipo === 'checkbox' ? false : (campo.min !== undefined ? campo.min : '');
      });
      setFormData(defaults);
    }
    setErrores({});
  }, [datosExistentes, catalogo, config.campos]);

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
    
    config.campos.forEach(campo => {
      const valor = formData[campo.nombre];
      const valorStr = valor ? valor.toString().trim() : '';

      if (campo.requerido && !valorStr) {
        nuevosErrores[campo.nombre] = 'Este campo es obligatorio';
        return;
      }

      if (valorStr) {
        // Validación específica: Niveles TRL (1 a 9)
        if (campo.nombre === 'nivelTrlId') {
          const num = parseInt(valorStr, 10);
          if (isNaN(num) || num < 1 || num > 9) {
            nuevosErrores[campo.nombre] = 'El nivel TRL debe ser un número entre 1 y 9';
          }
        }

        // Validación específica: Lógica de fechas en Convocatorias
        if (catalogo === 'convocatorias') {
          if (campo.nombre === 'fechaCierre' && formData.fechaApertura) {
            if (new Date(valor) < new Date(formData.fechaApertura)) {
              nuevosErrores[campo.nombre] = 'La fecha de cierre no puede ser anterior a la fecha de apertura';
            }
          }
          if (campo.nombre === 'fechaBloqueoOrion' && formData.fechaCierre) {
            if (new Date(valor) < new Date(formData.fechaCierre)) {
              nuevosErrores[campo.nombre] = 'La fecha de bloqueo no puede ser anterior a la fecha de cierre';
            }
          }
        }

        if (campo.maxLength && valorStr.length > campo.maxLength) {
          nuevosErrores[campo.nombre] = `Máximo ${campo.maxLength} caracteres permitidos`;
        }
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validar()) {
      const datosFinales = { ...formData };
      config.campos.forEach(campo => {
        if (campo.tipo === 'number' && datosFinales[campo.nombre]) {
          datosFinales[campo.nombre] = Number(datosFinales[campo.nombre]);
        }
      });
      onSubmit(datosFinales);
    }
  };

  const renderizarCampo = (campo) => {
    const valor = formData[campo.nombre] !== undefined ? formData[campo.nombre] : '';
    const error = errores[campo.nombre];
    const valorStr = valor ? valor.toString() : '';
    const porcentaje = campo.maxLength > 0 ? (valorStr.length / campo.maxLength) * 100 : 0;
    
    const colorContador = porcentaje >= 100 ? 'text-red-600 font-bold' : porcentaje >= 80 ? 'text-amber-600 font-semibold' : 'text-gray-500';
    const claseBorde = error ? 'error' : porcentaje >= 100 ? 'border-red-500' : porcentaje >= 80 ? 'border-amber-500' : '';

    switch (campo.tipo) {
      case 'textarea':
        return (
          <div className="relative">
            <textarea
              className={`form-textarea ${claseBorde}`}
              value={valor}
              onChange={(e) => handleChange(campo.nombre, e.target.value)}
              placeholder={campo.placeholder}
              maxLength={campo.maxLength}
              rows={4}
            />
            {campo.maxLength && (
              <div className="absolute right-2 bottom-2 text-xs pointer-events-none select-none bg-white px-1 rounded">
                <span className={colorContador}>{valorStr.length}/{campo.maxLength}</span>
              </div>
            )}
          </div>
        );
      
      case 'select':
        return (
          <select
            className={`form-select ${claseBorde}`}
            value={valor}
            onChange={(e) => handleChange(campo.nombre, e.target.value)}
          >
            <option value="">Seleccione...</option>
            {campo.opciones.map(op => (
              <option key={op.valor} value={op.valor}>{op.texto}</option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            className={`form-input ${claseBorde}`}
            value={valor}
            onChange={(e) => {
              let val = e.target.value;
              
              // PREVENCIÓN ACTIVA: Si es el campo TRL, forzamos que sea estrictamente 1 dígito entre 1 y 9
              if (campo.nombre === 'nivelTrlId') {
                if (val === '') {
                  handleChange(campo.nombre, '');
                } else {
                  const num = parseInt(val, 10);
                  // Si el usuario escribe algo fuera de rango, lo corregimos o ignoramos el cambio
                  if (num >= 1 && num <= 9) {
                    handleChange(campo.nombre, num);
                  }
                  // Si escribe "10", el input se queda en "1" (el último valor válido)
                }
              } else {
                // Para otros campos numéricos (como 'orden'), comportamiento normal
                handleChange(campo.nombre, val);
              }
            }}
            placeholder={campo.placeholder}
            min={campo.min}
            max={campo.max}
          />
        );
      
      case 'checkbox':
        return (
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={!!valor}
              onChange={(e) => handleChange(campo.nombre, e.target.checked)}
            />
            <span>{campo.label}</span>
          </label>
        );
      
      default:
        return (
          <div className="relative">
            <input
              type={campo.tipo}
              className={`form-input ${claseBorde}`}
              value={valor}
              onChange={(e) => handleChange(campo.nombre, e.target.value)}
              placeholder={campo.placeholder}
              maxLength={campo.maxLength}
              min={campo.min}
              max={campo.max}
            />
            {campo.maxLength && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none select-none bg-white px-1 rounded">
                <span className={colorContador}>{valorStr.length}/{campo.maxLength}</span>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {config.campos.map(campo => (
        <div key={campo.nombre} className="form-group">
          {campo.tipo !== 'checkbox' && (
            <label className="form-label">
              {campo.label}
              {campo.requerido && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
          )}
          {renderizarCampo(campo)}
          {errores[campo.nombre] && (
            <div className="form-error">{errores[campo.nombre]}</div>
          )}
          {campo.hint && !errores[campo.nombre] && (
            <div className="form-hint">{campo.hint}</div>
          )}
        </div>
      ))}

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={cargando}>
          Cancelar
        </button>
        <button type="submit" className="btn-submit" disabled={cargando}>
          {cargando && <div className="spinner-small"></div>}
          {datosExistentes ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}