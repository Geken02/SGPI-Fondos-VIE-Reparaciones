import React from 'react';

/**
 * Componente de Input con control visual estricto de límite de caracteres,
 * bloqueo de caracteres excedentes, alerta visual roja y prevención de números negativos.
 */
export const LimitedInput = ({
  label,
  value = '',
  onChange,
  maxLength,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  style = {},
  containerStyle = {},
  min,
  max,
  step,
  name,
  id,
  showCounter = true,
  ...props
}) => {
  const strVal = value !== null && value !== undefined ? String(value) : '';
  const currentLength = strVal.length;
  const isAtLimit = Boolean(maxLength && currentLength >= maxLength);

  const handleChange = (e) => {
    let val = e.target.value;
    if (type === 'number') {
      const minVal = min !== undefined ? Number(min) : 0;
      if (val !== '' && Number(val) < minVal) {
        val = String(minVal);
      }
    } else if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }
    if (onChange) {
      e.target.value = val;
      onChange(e);
    }
  };

  const handleKeyDown = (e) => {
    if (type === 'number') {
      // Bloquear signo negativo, positivo y exponencial
      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <div className="limited-field-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', ...containerStyle }}>
      {(label || (maxLength && showCounter)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          {label && (
            <label className="limited-field-label" style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>
              {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
          )}
          {maxLength && showCounter && type !== 'number' && type !== 'date' && (
            <span 
              className={`limited-counter ${isAtLimit ? 'at-limit' : ''}`}
              style={{
                fontSize: '11px',
                color: isAtLimit ? '#ef4444' : '#64748b',
                fontWeight: isAtLimit ? 700 : 400,
                marginLeft: 'auto'
              }}
            >
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
      )}
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        min={type === 'number' ? (min !== undefined ? min : 0) : min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} ${isAtLimit ? 'input-at-limit' : ''}`}
        style={{
          borderColor: isAtLimit ? '#ef4444' : undefined,
          color: isAtLimit ? '#b91c1c' : undefined,
          ...style
        }}
        {...props}
      />
      {isAtLimit && (
        <span className="limit-error-msg" style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ⚠️ Límite de texto superado
        </span>
      )}
    </div>
  );
};

/**
 * Componente de Textarea con contador de caracteres, bloqueo al límite,
 * alerta visual roja y mensaje institucional de límite superado.
 */
export const LimitedTextarea = ({
  label,
  value = '',
  onChange,
  maxLength,
  placeholder = '',
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  style = {},
  containerStyle = {},
  name,
  id,
  showCounter = true,
  ...props
}) => {
  const strVal = value !== null && value !== undefined ? String(value) : '';
  const currentLength = strVal.length;
  const isAtLimit = Boolean(maxLength && currentLength >= maxLength);

  const handleChange = (e) => {
    let val = e.target.value;
    if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }
    if (onChange) {
      e.target.value = val;
      onChange(e);
    }
  };

  return (
    <div className="limited-field-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', ...containerStyle }}>
      {(label || (maxLength && showCounter)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          {label && (
            <label className="limited-field-label" style={{ fontSize: '13px', fontWeight: 600, color: '#002855' }}>
              {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
          )}
          {maxLength && showCounter && (
            <span 
              className={`limited-counter ${isAtLimit ? 'at-limit' : ''}`}
              style={{
                fontSize: '11px',
                color: isAtLimit ? '#ef4444' : '#64748b',
                fontWeight: isAtLimit ? 700 : 400,
                marginLeft: 'auto'
              }}
            >
              {currentLength} / {maxLength} caracteres
            </span>
          )}
        </div>
      )}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`${className} ${isAtLimit ? 'input-at-limit' : ''}`}
        style={{
          borderColor: isAtLimit ? '#ef4444' : undefined,
          color: isAtLimit ? '#b91c1c' : undefined,
          ...style
        }}
        {...props}
      />
      {isAtLimit && (
        <span className="limit-error-msg" style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ⚠️ Límite de texto superado
        </span>
      )}
    </div>
  );
};
