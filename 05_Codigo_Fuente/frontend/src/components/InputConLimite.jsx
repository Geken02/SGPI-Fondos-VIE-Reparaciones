// src/components/ui/InputConLimite.jsx
import { useState } from 'react';

export default function InputConLimite({ 
  label, 
  name, 
  value, 
  onChange, 
  maxLength, 
  placeholder = '', 
  required = false,
  type = 'text',
  error = ''
}) {
  const [isFocused, setIsFocused] = useState(false);

  // Calcular porcentaje de uso para colores dinámicos
  const porcentaje = maxLength > 0 ? (value.length / maxLength) * 100 : 0;
  
  // Determinar colores según el límite
  let borderColor = 'border-gray-300 focus:border-[#002855]';
  let counterColor = 'text-gray-500';

  if (porcentaje >= 100) {
    borderColor = 'border-red-500 focus:border-red-500';
    counterColor = 'text-red-600 font-bold';
  } else if (porcentaje >= 80) {
    borderColor = 'border-amber-500 focus:border-amber-500';
    counterColor = 'text-amber-600 font-semibold';
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={maxLength} // ⚠️ ESTO BLOQUEA LA ESCRITURA AL LÍmite DE LA BD
          required={required}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md shadow-sm outline-none transition-colors duration-200 ${borderColor}`}
        />
        
        {/* Contador en tiempo real */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
          <span className={counterColor}>
            {value.length}/{maxLength}
          </span>
        </div>
      </div>

      {/* Mensaje de error personalizado (si existe) */}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      
      {/* Mensaje de ayuda cuando está cerca del límite */}
      {porcentaje >= 90 && porcentaje < 100 && (
        <p className="mt-1 text-xs text-amber-600">
          ⚠️ Estás cerca del límite máximo permitido.
        </p>
      )}
    </div>
  );
}