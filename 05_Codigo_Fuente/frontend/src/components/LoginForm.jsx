// src/components/LoginForm.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { traducirErrorBackend } from '../utils/mensajes';
import { validarCorreoTEC, validarRequerido } from '../utils/validaciones';
import InputValidado from './InputValidado';

const LoginForm = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Iconos SVG
  const IconoCorreo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M22 4L12 13L2 4"/>
    </svg>
  );

  const IconoCandado = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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
      await login(correo, contrasena);
      navigate('/dashboard/admin'); 
      navigate('/dashboard');
      navigate('/dashboard/admin'); 
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
    <form onSubmit={handleSubmit} noValidate>
      {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}

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

      <InputValidado
        label="Contraseña"
        type="password"
        value={contrasena}
        onChange={(e) => {
          setContrasena(e.target.value);
          if (errores.contrasena) setErrores({ ...errores, contrasena: null });
        }}
        error={errores.contrasena}
        placeholder="••••••••"
        icon={IconoCandado}
        autoComplete="current-password"
      />

      <button type="submit" className="btn-primary" disabled={cargando}>
        {cargando && <span className="spinner"></span>}
        Ingresar
      </button>

      <div>
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