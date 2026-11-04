// src/utils/validaciones.js

/**
 * Valida que el correo sea del dominio @tec.ac.cr
 */
export const validarCorreoTEC = (correo) => {
  if (!correo || correo.trim() === '') {
    return 'El correo institucional es obligatorio.';
  }
  
  const regex = /^[a-zA-Z0-9._%+-]+@tec\.ac\.cr$/;
  if (!regex.test(correo)) {
    return 'El correo debe ser institucional del TEC (ejemplo: usuario@tec.ac.cr).';
  }
  
  return null; // null = válido
};

/**
 * Valida la fortaleza de la contraseña
 */
export const validarFortalezaContrasena = (contrasena) => {
  if (!contrasena || contrasena === '') {
    return 'La contraseña es obligatoria.';
  }
  
  if (contrasena.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  
  if (!/[A-Z]/.test(contrasena)) {
    return 'La contraseña debe contener al menos una letra mayúscula.';
  }
  
  if (!/[a-z]/.test(contrasena)) {
    return 'La contraseña debe contener al menos una letra minúscula.';
  }
  
  if (!/[0-9]/.test(contrasena)) {
    return 'La contraseña debe contener al menos un número.';
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(contrasena)) {
    return 'La contraseña debe contener al menos un carácter especial (!@#$%^&*).';
  }
  
  return null; // null = válido
};

/**
 * Calcula el nivel de fortaleza de la contraseña (0-4)
 * 0: Vacía, 1: Débil, 2: Regular, 3: Buena, 4: Fuerte
 */
export const calcularFortalezaContrasena = (contrasena) => {
  if (!contrasena) return 0;
  
  let puntaje = 0;
  
  if (contrasena.length >= 8) puntaje++;
  if (/[A-Z]/.test(contrasena)) puntaje++;
  if (/[a-z]/.test(contrasena)) puntaje++;
  if (/[0-9]/.test(contrasena)) puntaje++;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(contrasena)) puntaje++;
  
  return Math.min(puntaje, 4);
};

/**
 * Valida que un campo no esté vacío
 */
export const validarRequerido = (valor, nombreCampo) => {
  if (!valor || valor.trim() === '') {
    return `${nombreCampo} es obligatorio.`;
  }
  return null;
};

/**
 * Valida que dos contraseñas coincidan
 */
export const validarCoincidenciaContrasenas = (contrasena, confirmacion) => {
  if (contrasena !== confirmacion) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
};