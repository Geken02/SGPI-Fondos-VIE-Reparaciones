// src/components/ResetPasswordForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { traducirErrorBackend } from '../utils/mensajes';
import {
  validarFortalezaContrasena,
  validarCoincidenciaContrasenas
} from '../utils/validaciones';
import InputValidado from './InputValidado';
import IndicadorFortaleza from './IndicadorFortaleza';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);
  const [tokenValido, setTokenValido] = useState(null);

  useEffect(() => {
    if (token) {
      verificarToken();
    }
  }, [token]);

  const verificarToken = async () => {
    try {
      await authService.verificarToken(token);
      setTokenValido(true);
    } catch (err) {
      setTokenValido(false);
      setErrorGeneral(traducirErrorBackend(err));
    }
  };

  const IconoCandado = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );

  const validarFormulario = () => {
    const nuevosErrores = {};
    
    const errorNueva = validarFortalezaContrasena(nuevaContrasena);
    if (errorNueva) nuevosErrores.nuevaContrasena = errorNueva;
    
    const errorConfirmar = validarCoincidenciaContrasenas(nuevaContrasena, confirmarContrasena);
    if (errorConfirmar) nuevosErrores.confirmarContrasena = errorConfirmar;
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorGeneral('');
    
    if (!validarFormulario()) return;
    
    setCargando(true);
    try {
      await authService.recuperarContrasena(token, { nuevaContrasena });
      setExito('Contraseña actualizada correctamente. Redirigiendo...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErrorGeneral(traducirErrorBackend(err));
    } finally {
      setCargando(false);
    }
  };

  // Requisitos visuales de la contraseña
  const requisitos = [
    { texto: 'Mínimo 8 caracteres', cumplido: nuevaContrasena.length >= 8 },
    { texto: 'Al menos una mayúscula', cumplido: /[A-Z]/.test(nuevaContrasena) },
    { texto: 'Al menos una minúscula', cumplido: /[a-z]/.test(nuevaContrasena) },
    { texto: 'Al menos un número', cumplido: /[0-9]/.test(nuevaContrasena) },
    { texto: 'Al menos un carácter especial', cumplido: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(nuevaContrasena) }
  ];

  if (tokenValido === false) {
    return (
      <>
        <div className="alert alert-error">{errorGeneral}</div>
        <Link to="/olvide-mi-contrasena" className="back-link">
          Solicitar un nuevo enlace
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorGeneral && <div className="alert alert-error">{errorGeneral}</div>}
      {exito && <div className="alert alert-success">{exito}</div>}

      <InputValidado
        label="Nueva contraseña"
        type="password"
        value={nuevaContrasena}
        onChange={(e) => {
          setNuevaContrasena(e.target.value);
          if (errores.nuevaContrasena) setErrores({ ...errores, nuevaContrasena: null });
        }}
        error={errores.nuevaContrasena}
        placeholder="Nueva contraseña"
        icon={IconoCandado}
        autoComplete="new-password"
      />

      <IndicadorFortaleza contrasena={nuevaContrasena} />

      <div className="requisitos-contrasena">
        <strong style={{ display: 'block', marginBottom: '8px', color: '#374151' }}>
          Requisitos de seguridad:
        </strong>
        {requisitos.map((req, idx) => (
          <div key={idx} className={`requisito-item ${req.cumplido ? 'cumplido' : ''}`}>
            <span className="requisito-icono">
              {req.cumplido ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              )}
            </span>
            {req.texto}
          </div>
        ))}
      </div>

      <InputValidado
        label="Confirmar contraseña"
        type="password"
        value={confirmarContrasena}
        onChange={(e) => {
          setConfirmarContrasena(e.target.value);
          if (errores.confirmarContrasena) setErrores({ ...errores, confirmarContrasena: null });
        }}
        error={errores.confirmarContrasena}
        placeholder="Repite la contraseña"
        icon={IconoCandado}
        autoComplete="new-password"
      />

      <button type="submit" className="btn-primary" disabled={cargando} style={{ marginTop: '20px' }}>
        {cargando && <span className="spinner"></span>}
        Actualizar contraseña
      </button>
    </form>
  );
};

export default ResetPasswordForm;