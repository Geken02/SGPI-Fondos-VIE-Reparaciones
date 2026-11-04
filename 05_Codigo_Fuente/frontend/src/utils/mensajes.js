// src/utils/mensajes.js

/**
 * Traduce los errores genéricos de Pydantic (Backend) al español.
 */
export const traducirErrorBackend = (error) => {
  // 1. Errores de validación de Pydantic (Código 422)
  if (error.response?.status === 422) {
    const detalles = error.response.data.detail;
    
    if (Array.isArray(detalles) && detalles.length > 0) {
      const primerError = detalles[0];
      
      // Si el mensaje ya viene en español (por nuestros ValueError personalizados)
      if (primerError.msg && !primerError.msg.includes('String should') && !primerError.msg.includes('Field required')) {
        return primerError.msg.replace('Value error, ', '');
      }
      
      // Traducciones de los errores por defecto de Pydantic
      if (primerError.type === 'string_too_short') return 'El campo tiene muy pocos caracteres.';
      if (primerError.type === 'string_too_long') return 'El campo tiene demasiados caracteres.';
      if (primerError.msg.includes('Field required')) return 'Este campo es obligatorio.';
      if (primerError.type === 'value_error') return 'El valor ingresado no es válido.';
    }
    return 'Por favor, revise los datos ingresados.';
  }

  // 2. Errores HTTP personalizados del backend (400, 401, 404, 500)
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  // 3. Error genérico de red o servidor
  return 'Ocurrió un error inesperado. Por favor, intente de nuevo más tarde.';
};