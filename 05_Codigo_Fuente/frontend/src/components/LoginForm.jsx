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
    <form onSubmit={handleSubmit} noValidate className="login-form-estricto">
      {errorGeneral && (
        <div className="alert alert-error" role="alert">{errorGeneral}</div>
      )}

      {/* CAMPO CORREO */}
      <div className="form-group-estricto">
        <label htmlFor="correo" className="form-label-estricto">Correo institucional</label>
        <div className="input-wrapper-estricto">
          <span className="input-icon-estricto">{IconoCorreo}</span>
          <input
            id="correo"
            type="email"
            className={`form-input-estricto ${errores.correo ? 'input-error-estricto' : ''}`}
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value);
              if (errores.correo) setErrores({ ...errores, correo: null });
            }}
            placeholder="usuario@tec.ac.cr"
            autoComplete="email"
          />
        </div>
        {errores.correo && (
          <div className="input-error-message-estricto">
            {IconoError} <span>{errores.correo}</span>
          </div>
        )}
      </div>

      {/* CAMPO CONTRASEÑA */}
      <div className="form-group-estricto">
        <label htmlFor="contrasena" className="form-label-estricto">Contraseña</label>
        <div className="input-wrapper-estricto">
          <span className="input-icon-estricto">{IconoCandado}</span>
          <input
            id="contrasena"
            type="password"
            className={`form-input-estricto ${errores.contrasena ? 'input-error-estricto' : ''}`}
            value={contrasena}
            onChange={(e) => {
              setContrasena(e.target.value);
              if (errores.contrasena) setErrores({ ...errores, contrasena: null });
            }}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        {errores.contrasena && (
          <div className="input-error-message-estricto">
            {IconoError} <span>{errores.contrasena}</span>
          </div>
        )}
      </div>

      {/* BOTÓN BLINDADO */}
      <button type="submit" className="btn-primary-estricto" disabled={cargando}>
        {cargando && <span className="spinner-estricto"></span>}
        <span className="btn-text-estricto">{cargando ? 'Ingresando...' : 'Ingresar'}</span>
      </button>

      <div className="links-estricto">
        <Link to="/olvide-mi-contrasena" className="forgot-link-estricto">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <p className="support-text-estricto">
        Si tienes problemas de acceso, contacta a soporte VIE
      </p>
    </form>
  );
};

export default LoginForm;