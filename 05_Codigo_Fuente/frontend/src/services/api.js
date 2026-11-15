import axios from 'axios';

const api = axios.create({
  baseURL: 'https://sgpi-fondos-vie-reparaciones.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agregar token automáticamente a cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // O como guardes tu token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;