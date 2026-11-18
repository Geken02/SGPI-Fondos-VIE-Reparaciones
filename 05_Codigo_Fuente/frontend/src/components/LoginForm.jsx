// src/components/LoginForm.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traducirErrorBackend } from '../utils/mensajes';
import { validarCorreoTEC, validarRequerido } from '../utils/validaciones';

const LoginForm = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Iconos SVG integrados para garantizar compatibilidad
  const IconoCorreo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13L2 4"/>
    </svg>
  );

  const IconoCandado = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );

  const IconoError = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );

  const validarFormulario = () => {
    const nuevosErrores = {};
    
    const errorCorreo = validarCorreoTEC(correo);
    if (errorCorreo) nuevosErrores.correo = errorCorreo;
    
    const errorContrasena = validarRequerido(contrasena, 'La contraseña');
    if (errorContrasena) nuevosErrores.contrasena = errorContrasena;
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGeneral('');
    
    if (!validarFormulario()) return;
    
    setCargando(true);

    try {
      const perfil = await login(correo, contrasena);
      const roles = perfil?.roles ?? [];

      if (roles.includes('MiembroCIE')) {
        navigate('/miembro-cie', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorGeneral(traducirErrorBackend(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="login-form">
      {errorGeneral && (
        <div className="alert alert-error" role="alert">
          {errorGeneral}
        </div>
      )}

      {/* Campo de Correo */}
      <div className="form-group">
        <label htmlFor="correo" className="form-label">Correo institucional</label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            {IconoCorreo}
          </span>
          <input
            id="correo"
            type="email"
            className={`form-input ${errores.correo ? 'input-error' : ''}`}
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              if (errores.correo) setErrores({ ...errores, correo: null });
            }}
            placeholder="usuario@tec.ac.cr"
            autoComplete="email"
            aria-invalid={!!errores.correo}
            aria-describedby={errores.correo ? "error-correo" : undefined}
          />
        </div>
        {errores.correo && (
          <div id="error-correo" className="input-error-message" role="alert">
            {IconoError}
            <span>{errores.correo}</span>
          </div>
        )}
      </div>

      {/* Campo de Contraseña */}
      <div className="form-group">
        <label htmlFor="contrasena" className="form-label">Contraseña</label>
        <div className="input-wrapper">
          <span className="input-icon" aria-hidden="true">
            {IconoCandado}
          </span>
          <input
            id="contrasena"
            type="password"
            className={`form-input ${errores.contrasena ? 'input-error' : ''}`}
            value={contrasena}
            onChange={(e) => {
              setContrasena(e.target.value);
              if (errores.contrasena) setErrores({ ...errores, contrasena: null });
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!errores.contrasena}
            aria-describedby={errores.contrasena ? "error-contrasena" : undefined}
          />
        </div>
        {errores.contrasena && (
          <div id="error-contrasena" className="input-error-message" role="alert">
            {IconoError}
            <span>{errores.contrasena}</span>
          </div>
        )}
      </div>

      {/* Botón de Envío */}
      <button type="submit" className="btn-primary" disabled={cargando}>
        <span className="spinner-slot">
          {cargando && <span className="spinner"></span>}
        </span>
        <span className="btn-label">{cargando ? 'Ingresando...' : 'Ingresar'}</span>
      </button>

      {/* Enlaces de ayuda */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Link to="/olvide-mi-contrasena" className="forgot-link">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <p className="support-text">
        Si tienes problemas de acceso, contacta a soporte VIE
      </p>
    </form>
  );
};

export default LoginForm;