import React from 'react';

/**
 * Componente de Input con control visual estricto de límite de caracteres,
 * bloqueo de caracteres excedentes, alerta visual roja y prevención de números negativos.
 */
export const formatearMontoEspacios = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val).replace(/\s+/g, '');
  if (!str) return '';
  const partes = str.split('.');
  const enteros = partes[0].replace(/\D/g, '');
  if (!enteros) return '';
  const formateado = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return partes.length > 1 ? `${formateado}.${partes[1].slice(0, 2)}` : formateado;
};

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
  showCounter,
  formatoMonto = false,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const rawVal = value !== null && value !== undefined ? String(value).replace(/\s+/g, '') : '';
  const currentLength = rawVal.length;
  const isAtLimit = Boolean(maxLength && currentLength >= maxLength);
  const shouldShowCounter = showCounter !== undefined ? showCounter : Boolean(label);

  // Accesibilidad: id estable para ligar label↔campo y describir contador/error con el lector de pantalla.
  const autoId = React.useId();
  const fieldId = id || name || autoId;
  const counterId = `${fieldId}-counter`;
  const errorId = `${fieldId}-error`;
  const showCounterField = Boolean(maxLength && shouldShowCounter && type !== 'number' && type !== 'date');
  const describedBy = [showCounterField ? counterId : null, isAtLimit ? errorId : null].filter(Boolean).join(' ') || undefined;

  const displayValue = formatoMonto
    ? (isFocused ? rawVal : formatearMontoEspacios(rawVal))
    : (value !== null && value !== undefined ? value : '');

  const handleChange = (e) => {
    let val = e.target.value;
    if (formatoMonto) {
      val = val.replace(/\s+/g, '');
      const parts = val.split('.');
      let clean = parts[0].replace(/\D/g, '');
      if (parts.length > 1) {
        clean = clean + '.' + parts[1].replace(/\D/g, '').slice(0, 2);
      }
      val = clean;
      if (maxLength && val.length > maxLength) {
        val = val.slice(0, maxLength);
      }
    } else if (type === 'number') {
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

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e) => {
    if (type === 'number' || formatoMonto) {
      // Bloquear signo negativo, positivo y exponencial
      if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <div className="limited-field-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', ...(label || (maxLength && shouldShowCounter) ? {} : { justifyContent: 'center' }), ...containerStyle }}>
      {(label || (maxLength && shouldShowCounter)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          {label && (
            <label htmlFor={fieldId} className="limited-input-label" style={{ fontSize: '13px', fontWeight: 600 }}>
              {label} {required && <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span>}
            </label>
          )}
          {showCounterField && (
            <span 
              id={counterId}
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
        type={formatoMonto ? 'text' : type}
        inputMode={formatoMonto ? 'numeric' : undefined}
        id={fieldId}
        name={name}
        aria-describedby={describedBy}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        title={formatoMonto && rawVal ? `₡ ${formatearMontoEspacios(rawVal)}` : undefined}
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
        <span id={errorId} role="alert" className="limit-error-msg" style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
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

  // Accesibilidad: id estable para ligar label↔campo y describir contador/error con el lector de pantalla.
  const autoId = React.useId();
  const fieldId = id || name || autoId;
  const counterId = `${fieldId}-counter`;
  const errorId = `${fieldId}-error`;
  const showCounterField = Boolean(maxLength && showCounter);
  const describedBy = [showCounterField ? counterId : null, isAtLimit ? errorId : null].filter(Boolean).join(' ') || undefined;

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
            <label htmlFor={fieldId} className="limited-input-label" style={{ fontSize: '13px', fontWeight: 600 }}>
              {label} {required && <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span>}
            </label>
          )}
          {showCounterField && (
            <span 
              id={counterId}
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
        id={fieldId}
        name={name}
        aria-describedby={describedBy}
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
        <span id={errorId} role="alert" className="limit-error-msg" style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          ⚠️ Límite de texto superado
        </span>
      )}
    </div>
  );
};
