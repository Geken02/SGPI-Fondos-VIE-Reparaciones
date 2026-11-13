// src/components/ForgotPasswordForm.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { traducirErrorBackend } from '../utils/mensajes';
import { validarCorreoTEC } from '../utils/validaciones';
import InputValidado from './InputValidado';

const ForgotPasswordForm = () => {
  const [correo, setCorreo] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [exito, setExito] = useState('');
  const [enlace, setEnlace] = useState('');
  const [cargando, setCargando] = useState(false);

  // Icono SVG de correo
  const IconoCorreo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13L2 4"/>
    </svg>
  );

  const validarFormulario = () => {
    const nuevosErrores = {};
    const errorCorreo = validarCorreoTEC(correo);
    
    if (errorCorreo) {
      nuevosErrores.correo = errorCorreo;
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGeneral('');
    setExito('');
    setEnlace('');
    
    // 1. Validar en el frontend antes de llamar al backend
    if (!validarFormulario()) return;
    
    setCargando(true);

    try {
      const response = await authService.solicitarRecuperacion({ correoInstitucional: correo });
      setExito(response.mensaje);
      // En modo desarrollo/prototipo, mostramos el enlace para facilitar las pruebas
      if (response.enlaceRecuperacion) {
        setEnlace(response.enlaceRecuperacion);
      }
    } catch (err) {
      setErrorGeneral(traducirErrorBackend(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}
      {exito && <div className="alert alert-success">{exito}</div>}

      <InputValidado
        label="Correo institucional"
        type="email"
        value={correo}
        onChange={(e) => {
          setCorreo(e.target.value);
          if (errores.correo) setErrores({ ...errores, correo: null });
        }}
        error={errores.correo}
        placeholder="usuario@tec.ac.cr"
        icon={IconoCorreo}
        autoComplete="email"
      />

      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando && <span className="spinner"></span>}
        Enviar enlace de recuperación
      </button>

      {/* Enlace de recuperación visible solo en modo prototipo */}
      {enlace && (
        <div className="alert alert-info" style={{ marginTop: '16px', wordBreak: 'break-all' }}>
          <strong>Enlace de recuperación (solo prototipo):</strong>
          <br />
          <a href={enlace} style={{ color: '#002855', fontWeight: '500' }}>{enlace}</a>
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        <Link to="/login" className="back-link">
          ← Volver al inicio de sesión
        </Link>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;