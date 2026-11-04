// src/components/InputValidado.jsx
import { useState } from 'react';

const InputValidado = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  icon,
  disabled = false,
  autoComplete,
  maxLength
}) => {
  const [tocado, setTocado] = useState(false);

  const handleBlur = (e) => {
    setTocado(true);
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    onChange(e);
    // Si el usuario empieza a escribir después de tocar el campo, marcamos como tocado
    if (!tocado) setTocado(true);
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          className={`form-input ${error && tocado ? 'input-error' : ''}`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
        />
      </div>
      {error && tocado && (
        <div className="input-error-message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default InputValidado;