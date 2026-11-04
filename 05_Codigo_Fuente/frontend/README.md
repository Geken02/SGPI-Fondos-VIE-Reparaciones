# 🎓 SGPI - Frontend (Sistema de Gestión de Propuestas de Investigación)

**Fondos VIE - Tecnológico de Costa Rica**

Interfaz de usuario del sistema de gestión de propuestas de investigación financiadas por los Fondos VIE del TEC. Construido con React, Vite y JavaScript moderno.

![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)
![Versión](https://img.shields.io/badge/versión-1.0.0-blue)
![Licencia](https://img.shields.io/badge/licencia-Privada-red)

---

## 🚀 Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.x | Biblioteca de UI |
| **Vite** | 5.x | Build tool y dev server |
| **React Router DOM** | 6.x | Navegación y rutas |
| **Axios** | 1.x | Cliente HTTP para API |
| **CSS3** | - | Estilos personalizados |
| **JavaScript (ES6+)** | - | Lenguaje principal |

---

## 📁 Estructura del Proyecto

```
frontend/
├── public/
│   └── logo-tec.png              # Logo oficial del TEC
├── src/
│   ├── components/               # Componentes reutilizables
│   │   ├── DashboardLayout.jsx   # Layout principal del dashboard
│   │   ├── ForgotPasswordForm.jsx
│   │   ├── Header.jsx            # Barra superior
│   │   ├── IndicadorFortaleza.jsx
│   │   ├── InputValidado.jsx     # Input con validación personalizada
│   │   ├── LoginForm.jsx
│   │   ├── Logo.jsx
│   │   ├── ResetPasswordForm.jsx
│   │   └── Sidebar.jsx           # Menú lateral
│   ├── context/
│   │   └── AuthContext.jsx       # Contexto de autenticación global
│   ├── pages/
│   │   ├── Dashboard.jsx         # Página de inicio
│   │   ├── ForgotPassword.jsx
│   │   ├── Login.jsx
│   │   └── ResetPassword.jsx
│   ├── services/
│   │   ├── api.js                # Configuración de Axios
│   │   └── authService.js        # Servicios de autenticación
│   ├── styles/
│   │   ├── dashboard.css         # Estilos del dashboard
│   │   ├── global.css            # Estilos globales
│   │   └── login.css             # Estilos del login
│   ├── utils/
│   │   ├── mensajes.js           # Traductor de errores
│   │   └── validaciones.js       # Funciones de validación
│   ├── App.jsx                   # Componente raíz con rutas
│   └── main.jsx                  # Punto de entrada
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18.x o superior) → [Descargar](https://nodejs.org/)
- **npm** (versión 9.x o superior) → Viene incluido con Node.js
- **Backend SGPI** corriendo en `http://localhost:8000` → [Ver repositorio del backend](../backend/README.md)

---

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/sgpi-fondos-vie.git
cd sgpi-fondos-vie/05_Codigo_Fuente/frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El frontend estará disponible en **http://localhost:5173**

---

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (opcional para desarrollo local):

```env
VITE_API_URL=http://localhost:8000
```

> **Nota:** Por defecto, el frontend apunta a `http://localhost:8000`. Para producción, cambia esta variable.

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo con hot-reload |
| `npm run build` | Compila el proyecto para producción |
| `npm run preview` | Previsualiza la build de producción localmente |
| `npm run lint` | Ejecuta el linter para verificar código |

---

## Flujo de Autenticación

### 1. **Login** (`/login`)
- El usuario ingresa su correo institucional (`@tec.ac.cr`) y contraseña.
- El frontend valida el formato antes de enviar al backend.
- Si las credenciales son correctas, el backend devuelve un token JWT.
- El token se guarda en `localStorage` y el usuario es redirigido al dashboard.

### 2. **Olvidé mi Contraseña** (`/olvide-mi-contrasena`)
- El usuario ingresa su correo institucional.
- El backend genera un token de recuperación temporal (30 minutos).
- En modo desarrollo, el enlace se muestra en la respuesta. En producción, se enviaría por email.

### 3. **Recuperar Contraseña** (`/recuperar-contrasena?token=...`)
- El usuario ingresa el token (desde el enlace) y una nueva contraseña.
- El frontend valida la fortaleza de la contraseña en tiempo real.
- Si es válida, el backend actualiza la contraseña y el token se invalida.

### 4. **Dashboard** (`/dashboard`)
- Ruta protegida: requiere token JWT válido.
- Si el token expira o es inválido, el usuario es redirigido automáticamente al login.
- Muestra información del usuario autenticado y menú de navegación.

---

## Validaciones Implementadas

### Correo Institucional
- Debe ser obligatorio.
- Debe tener formato válido de email.
- **Debe pertenecer al dominio `@tec.ac.cr, o otros formatos oficiales`**.

### Contraseña
- Mínimo 8 caracteres.
- Al menos 1 letra mayúscula.
- Al menos 1 letra minúscula.
- Al menos 1 número.
- Al menos 1 carácter especial (`!@#$%^&*()_+-=[]{}|;:,.<>?`).

### Indicador de Fortaleza
El sistema muestra un indicador visual (Débil → Fuerte) mientras el usuario escribe su contraseña, con requisitos que se marcan en verde al cumplirse.

---

##  Diseño y Estilos

El frontend replica fielmente el diseño institucional del TEC:

- **Fuente:** Roboto (Google Fonts)
- **Color primario:** `#002855` (Azul oficial del TEC)
- **Fondo:** `#f5f7fa` (Gris azulado claro)
- **Tarjetas:** Blancas con sombras suaves y bordes redondeados
- **Iconos:** SVG inline para consistencia y rendimiento

### Componentes de UI Reutilizables
- `InputValidado`: Input con validación personalizada y mensajes de error inline.
- `IndicadorFortaleza`: Barra de progreso visual para contraseñas.
- `Sidebar`: Menú lateral con navegación activa.
- `Header`: Barra superior con información del usuario.

---

## Endpoints del Backend Consumidos

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/auth/login` | Iniciar sesión | ❌ No |
| `GET` | `/auth/perfil` | Obtener datos del usuario | ✅ Sí (Bearer) |
| `POST` | `/auth/olvide-mi-contrasena` | Solicitar recuperación | ❌ No |
| `GET` | `/auth/verificar-token-recuperacion/{token}` | Validar token | ❌ No |
| `POST` | `/auth/recuperar-contrasena/{token}` | Resetear contraseña |  No |

---

##  Contribución

### Flujo de trabajo con Git

1. Crea una rama desde `main`:
   ```bash
   git checkout -b feature/nombre-de-la-funcionalidad
   ```

2. Realiza tus cambios y haz commit:
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   ```

3. Sube tu rama y crea un Pull Request:
   ```bash
   git push origin feature/nombre-de-la-funcionalidad
   ```

### Convenciones de Commit

- `feat:` Nueva funcionalidad
- `fix:` Corrección de errores
- `style:` Cambios de estilo (CSS, formato)
- `docs:` Documentación
- `refactor:` Refactorización de código

---

## Build para Producción

```bash
npm run build
```

Los archivos compilados se generarán en la carpeta `dist/`. Puedes previsualizarlos con:

```bash
npm run preview
```

---

## Problemas Conocidos

- El token JWT no se refresca automáticamente (expira después de 30 minutos).
- En modo desarrollo, el enlace de recuperación de contraseña se muestra en la respuesta (en producción se enviaría por email).

---