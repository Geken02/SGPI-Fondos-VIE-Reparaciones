# SGPI Backend - Sistema de Gestión de Propuestas de Investigación

API REST construida con **FastAPI** y **SQLAlchemy** para gestionar el ciclo de vida de propuestas de investigación de los Fondos VIE del Instituto Tecnológico de Costa Rica (TEC).

---

## Tabla de Contenidos

1. [Arquitectura](#-arquitectura)
2. [Estructura de Carpetas](#-estructura-de-carpetas)
3. [Tecnologías](#-tecnologías)
4. [Requisitos Previos](#-requisitos-previos)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Levantar el Servidor](#-levantar-el-servidor)
7. [Distribución de Módulos por Miembro](#-distribución-de-módulos-por-miembro)
8. [Endpoints por Módulo](#-endpoints-por-módulo)
9. [Convenciones de Código](#-convenciones-de-código)
10. [Flujo de Trabajo con Git](#-flujo-de-trabajo-con-git)
11. [Troubleshooting](#-troubleshooting)

---

## Arquitectura

El backend sigue una **arquitectura por capas** con separación clara de responsabilidades, alineada a los **6 módulos institucionales** del proyecto:

```
┌─────────────────────────────────────────────────────────────┐
│  API Layer (FastAPI)                                        │
│  api/routers/{modulo}/  →  Endpoints HTTP                   │
│  api/schemas/{modulo}/  →  Validación Pydantic              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Services Layer (Lógica de Negocio)                         │
│  services/{modulo}/  →  Reglas del TEC por rol              │
│  services genéricos  →  auth, notificaciones, auditoría     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Models Layer (SQLAlchemy ORM)                              │
│  models/{dominio}.py  →  Mapeo 1:1 con PostgreSQL           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Database (PostgreSQL 15 en Docker)                         │
│  ~60 tablas + catálogos del TEC                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas

```

---

### 🔄 **5. Actualizar "Estructura de Carpetas"**
*Reemplaza el árbol de carpetas para que refleje la separación granular de modelos y servicios que creamos (esto es vital para que Nahomy, Félix y Deryan sepan dónde trabajar):*

```markdown
## Estructura de Carpetas

```text
backend/
├── requirements.txt              # Dependencias Python (compatibles con 3.13)
└── src/
    ├── main.py                   # Punto de entrada de FastAPI
    ├── config.py                 # Configuración directa (DB, JWT, CORS)
    ├── database.py               # Conexión SQLAlchemy + Session
    │
    ├── api/                      # 🌐 CAPA DE API
    │   ├── routers/              # Endpoints HTTP por los 7 módulos
    │   │   ├── auth.py           # Genérico: /login, /perfil
    │   │   ├── investigador/     # Módulo 1: Formulación
    │   │   ├── vinculacion/     # Módulo 2: Evaluación Temprana
    │   │   ├── comite_tecnico/  # Módulo 3: Evaluación Técnica
    │   │   ├── consejo_escuela/ # Módulo 4: Aprobación Institucional
    │   │   ├── vie/             # Módulo 5: Validación y Resolución
    │   │   ├── administracion/  # Módulo 6: Configuración del Sistema
    │   │   └── consulta_historica/ # Módulo 7: Trazabilidad y Métricas
    │   │
    │   └── schemas/              # 📋 Validación Pydantic por módulo
    │       ├── auth.py
    │       ├── investigador/
    │       ├── vinculacion/
    │       ├── comite_tecnico/
    │       ├── consejo_escuela/
    │       ├── vie/
    │       ├── administracion/
    │       └── consulta_historica/
    │
    ├── models/                   # 🗄️ MODELOS SQLAlchemy (1 archivo por tabla/domino)
    │   ├── usuarios.py           # Usuario
    │   ├── escuelas.py           # Escuela, Campus
    │   ├── roles.py              # RolesSistema, UsuarioRol, Permisos
    │   ├── convocatorias.py      # Convocatorias, Etapas, EstadosPropuesta
    │   ├── propuestas.py         # Propuesta (cabecera)
    │   ├── propuesta_contenido.py# PropuestaContenido, PropuestaDeclaraciones
    │   ├── propuesta_equipo.py   # Integrantes, Colaboradores, RolesEquipo
    │   ├── propuesta_plan.py     # Objetivos, Actividades, Riesgos, Medidas
    │   ├── propuesta_documentos.py# Documentos, TiposDocumento
    │   ├── presupuesto.py        # Presupuesto, Rubros, Financiamiento
    │   ├── aspectos_eticos.py    # AspectosEticos, EntesRegulatorios, EstadosAval
    │   ├── bibliografia.py       # Autores, Fuentes, Referencias
    │   ├── productos_academicos.py# ProductosAcademicos
    │   ├── evaluaciones.py       # Evaluaciones, Criterios, Detalle
    │   ├── dictamenes.py         # Dictamenes, TiposDictamen
    │   ├── acuerdos.py           # AcuerdosConsejo, TiposAcuerdo
    │   ├── subsanaciones.py      # Subsanaciones, EstadosSubsanacion
    │   ├── notificaciones.py     # Notificaciones, Canales, TiposNotificacion
    │   ├── logs.py               # Logs, TiposEvento, Severidades, Objetos
    │   └── catalogos.py          # Líneas, TiposHora, TRL, Modalidades, etc.
    │
    ├── services/                 # ⚙️ LÓGICA DE NEGOCIO (por rol)
    │   ├── auth_service.py       # Genérico: login, JWT, bcrypt
    │   ├── notificacion_service.py # Genérico: correos/sistema
    │   ├── auditoria_service.py  # Genérico: registro de logs forenses
    │   ├── investigador/         # Lógica Form-04, 05, 06
    │   ├── vinculacion/         # Lógica Dictamen de Vinculación
    │   ├── comite_tecnico/      # Lógica Rúbrica-02, Consolidación
    │   ├── consejo_escuela/     # Lógica Votación, Form-07/08
    │   ├── vie/                 # Lógica Subsanaciones, Checklist, CIE
    │   ├── administracion/      # Lógica CRUD Catálogos, Usuarios
    │   └── consulta_historica/  # Lógica Reportes y Métricas
    │
    └── utils/                    # 🛠️ HERRAMIENTAS transversales
        ├── security.py           # Hashing bcrypt, generación/validación JWT
        ├── dependencies.py       # get_db, get_current_user, check_rol
        └── helpers.py            # Generar códigos FVIE-YYYY-NNN, fechas
```

---

## Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Python** | **3.13** | Lenguaje principal (¡Usar esta versión específica!) |
| **FastAPI** | 0.115+ | Framework web async, documentación Swagger automática |
| **SQLAlchemy** | 2.0+ | ORM para mapeo objeto-relacional |
| **Pydantic** | 2.10+ | Validación de datos y schemas |
| **python-jose** | 3.3+ | Generación y validación de JWT |
| **passlib[bcrypt]** | 1.7+ | Hashing seguro de contraseñas |
| **psycopg[binary]**| **3.2.3** | Driver moderno de PostgreSQL (sin compilación en Windows) |
| **uvicorn** | 0.34+ | Servidor ASGI para desarrollo/producción |
| **PostgreSQL** | 15 (Docker) | Base de datos relacional |
---

##  Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

- [ ] **Python 3.11 o superior** ([Descargar](https://www.python.org/downloads/))
- [ ] **Docker Desktop** corriendo ([Descargar](https://www.docker.com/products/docker-desktop/))
- [ ] **Git** ([Descargar](https://git-scm.com/))
- [ ] **PostgreSQL corriendo en Docker** (ver sección de instalación)

Verifica las versiones:
```bash
python --version    # Debe ser 3.13+
docker --version    # Debe estar corriendo
git --version
```

---

## Instalación y Configuración

### 1. Clonar el repositorio y entrar al backend

```bash
cd SGPI-Fondos-VIE/05_Codigo_Fuente/backend
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```


### 3. Levantar la base de datos con Docker

Desde la raíz del proyecto (`SGPI-Fondos-VIE`):

```bash
cd 05_Codigo_Fuente/database
docker-compose up -d
```

Verifica que esté corriendo:
```bash
docker ps
```

Deberías ver `sgpi_postgres` y `sgpi_pgadmin` en estado `Up`.

---

## ▶Levantar el Servidor

Desde la carpeta `backend/`:

```bash
# Modo desarrollo (con recarga automática)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Una vez levantado, accede a:

- **Swagger UI (documentación interactiva):** http://localhost:8000/docs
- **ReDoc (documentación alternativa):** http://localhost:8000/redoc
- **Health check:** http://localhost:8000/health

---

## Distribución de Módulos por Miembro



| Módulo | Carpeta en `api/routers/` | Responsable | Alcance Principal (Basado estrictamente en el PDF) |
|--------|---------------------------|-------------|---------------------------------------------------|
| **Módulo 1: Investigador** | `investigador/` | Nahomy | **Formulación:** Llenado guiado del Form-04 (17 secciones), Gestor de equipo con validación de horas (ORCID, tipos de hora), Calculadora de productos académicos (Regla 2.4.1), Aspectos éticos/TRL, Repositorio de adjuntos (Form-05, Form-06, cartas) y Bandeja de notificaciones. |
| **Módulo 2: Vinculación** | `vinculacion/` | Nahomy | **Evaluación Temprana:** Visor de propuestas previo al Comité, evaluación de potencial de innovación (PI) y nivel TRL, y Editor de Dictamen Técnico de Vinculación. |
| **Módulo 3: Comité Técnico** | `comite_tecnico/` | Gerald | **Evaluación Técnica:** Bandeja de entrada y control de completitud (Asistente), Visor unificado de expedientes, **Rúbrica-02 Digital** con bloqueo de requisitos obligatorios () y cálculo automático (≥ 0.70), y Módulo de consolidación para generar oficio y dictamen (Coordinador). |
| **Módulo 4: Consejo de Escuela** | `consejo_escuela/` | Deryan | **Aprobación Institucional:** Bandeja de recepción y enrutamiento (Asistente), Visor de notas y Módulo de votación para generar aval (Consejo de Profesores), y Generador de Acuerdos de Consejo pre-llenados (Form-07/08) con validación de horas/carga/presupuesto y firma digital (Dirección). |
| **Módulo 5: VIE** | `vie/` | Félix | **Validación y Resolución:** Checklist de validación transversal y **Módulo de Subsanación** (Gestora VIE), Visor de expediente consolidado y Rúbrica VIE Digital para aprobar/rechazar (CIE), y Generador de documentos oficiales de notificación de resolución (Dirección de Investigación). |
| **Módulo 6: Administración** | `administracion/` | Gerald | **Configuración del Sistema:** Gestor de catálogos (Escuelas, Líneas, Tipos de Hora, TRL), Configurador de convocatorias (fechas límite, bloqueo Orión), Gestor de usuarios/roles/permisos (incluyendo asignación de escuelas a Gestoras VIE), y Acceso global (Superadmin para pruebas). |
| **Módulo 7: Consulta Histórica** | `consulta_historica/` | **Equipo completo** | **Trazabilidad y Métricas:** Dashboard de métricas macro (gráficos por escuela/línea/tipo), Buscador histórico cruzado con filtros combinados, y Ficha de Trazabilidad Total del Proyecto (línea de tiempo unificada de todas las etapas). |
| **Transversal (Base)** | `auth.py` + `services/` genéricos | Gerald | **Infraestructura Base:** Autenticación (Login, JWT), Notificaciones (sistema/email), y Auditoría (Logs forenses). |

> **Regla de oro:** Cada miembro trabaja **exclusivamente** en las carpetas de su módulo. Nunca modifiques código en carpetas de otro miembro sin coordinación previa.

---

##  Convenciones de Código

### Nomenclatura
- **Archivos Python:** `snake_case.py` (ej: `propuesta_service.py`)
- **Clases:** `PascalCase` (ej: `PropuestaCreate`)
- **Funciones/Métodos:** `snake_case` (ej: `crear_propuesta()`)
- **Variables:** `snake_case` (ej: `usuario_id`)
- **Constantes:** `UPPER_SNAKE_CASE` (ej: `MAX_PALABRAS_RESUMEN`)

### Estructura de un Router (ejemplo)

```python
# api/routers/investigador/propuestas.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database import get_db
from src.api.schemas.investigador.propuestas import PropuestaCreate, PropuestaResponse
from src.services.investigador.propuesta_service import crear_propuesta
from src.utils.dependencies import get_current_user
from src.models.usuarios import Usuario

router = APIRouter(prefix="/investigador/propuestas", tags=["Módulo 1: Investigador"])

@router.post("/", response_model=PropuestaResponse, status_code=201)
def crear_nueva_propuesta(
    data: PropuestaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Crea una nueva propuesta en estado BORRADOR.
    Solo accesible para usuarios con rol InvestigadorCoordinador.
    """
    return crear_propuesta(db=db, usuario=current_user, data=data)
```

### Estructura de un Service (ejemplo)

```python
# services/investigador/propuesta_service.py
from sqlalchemy.orm import Session
from src.models.propuestas import Propuesta
from src.api.schemas.investigador.propuestas import PropuestaCreate
from src.services.auditoria_service import registrar_evento
from src.utils.helpers import generar_codigo_propuesta

def crear_propuesta(db: Session, usuario, data: PropuestaCreate) -> Propuesta:
    """Lógica de negocio para crear propuesta."""
    
    # 1. Validaciones de negocio
    if len(data.resumen.split()) > 500:
        raise ValueError("El resumen no puede exceder 500 palabras")
    
    # 2. Crear la propuesta
    propuesta = Propuesta(
        codigoPropuesta=generar_codigo_propuesta(),
        titulo=data.titulo,
        investigadorCoordId=usuario.usuarioId,
        estadoId=1,  # BORRADOR
        # ... más campos
    )
    db.add(propuesta)
    db.commit()
    db.refresh(propuesta)
    
    # 3. Registrar en auditoría
    registrar_evento(
        db=db,
        usuario_id=usuario.usuarioId,
        tipo_evento="CREAR_PROPUESTA",
        objeto_id=propuesta.propuestaId
    )
    
    return propuesta
```

### Commits
Usa el formato **Conventional Commits**:

```bash
git commit -m "feat(investigador): agregar endpoint para crear propuesta"
git commit -m "fix(comite): corregir cálculo de nota en rúbrica"
git commit -m "docs: actualizar README del backend"
git commit -m "refactor(auth): simplificar lógica de validación JWT"
```

Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Flujo de Trabajo con Git

### Antes de empezar a trabajar
```bash
git pull origin main
```

### Durante el desarrollo
1. Crea una rama para tu módulo:
   ```bash
   git checkout -b feature/modulo-investigador
   ```

2. Haz commits frecuentes y descriptivos:
   ```bash
   git add .
   git commit -m "feat(investigador): agregar schema PropuestaCreate"
   ```

3. Sube tu rama:
   ```bash
   git push origin feature/modulo-investigador
   ```

4. Crea un **Pull Request** en GitHub para revisar e integrar.

### Nunca hagas
-  Push directo a `main` sin revisión
- Modificar carpetas de otros módulos sin coordinación
- Commits con mensajes como "cambios varios" o "fix"

---

## Pruebas

### Probar el Login (usuario de prueba)

1. Abre http://localhost:8000/docs
2. Haz clic en `POST /auth/login` → "Try it out"
3. Usa las credenciales de prueba:
   ```json
   {
     "correo": "sistema@tec.ac.cr",
     "contrasena": "admin123"
   }
   ```
4. Copia el `access_token` recibido
5. Haz clic en el botón **"Authorize"** (candado arriba a la derecha) y pega el token con el prefijo `Bearer `:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
6. Ahora puedes probar endpoints protegidos como `GET /auth/perfil`

### Crear más usuarios de prueba

```bash
docker exec -it sgpi_postgres psql -U sgpi_user -d sgpi_db
```

```sql
-- Ver usuarios existentes
SELECT "usuarioId", "correoInstitucional", "nombreUsuario" FROM "Usuarios";

-- Insertar un nuevo usuario de prueba (contraseña: admin123 hasheada)
INSERT INTO "Usuarios" ("correoInstitucional", "nombreUsuario", "apellido1Usuario", "activo", "contrasenaHash")
VALUES ('felix@tec.ac.cr', 'Félix', 'Morales', TRUE, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILp92S.0i');
```

---

##  Troubleshooting

### Error: "No module named 'src'"
```bash
# Asegúrate de estar en la carpeta backend/ y el venv activado
cd SGPI-Fondos-VIE/05_Codigo_Fuente/backend
venv\Scripts\activate   # Windows
```

### Error: "Connection refused" a la base de datos
```bash
# Verifica que Docker esté corriendo
docker ps

# Si no está el contenedor, levántalo
cd SGPI-Fondos-VIE/05_Codigo_Fuente/database
docker-compose up -d
```

### Error: "Table doesn't exist"
```bash
# La base de datos no se inicializó correctamente
cd SGPI-Fondos-VIE/05_Codigo_Fuente/database
docker-compose down -v    # Borra volumen corrupto
docker-compose up -d      # Reinicia limpio
```

### Error: "Token invalid or expired"
- Verifica que el `SECRET_KEY` en `.env` sea el mismo que se usó para generar el token
- El token expira en 30 minutos por defecto (configurable en `.env`)

### Swagger no carga los endpoints
```bash
# Reinicia el servidor con --reload
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Recursos Útiles

- [Documentación oficial de FastAPI](https://fastapi.tiangolo.com/)
- [Documentación de SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Guía de Pydantic V2](https://docs.pydantic.dev/latest/)
- [Modelo de Datos del Proyecto](../../03_Base_de_Datos/Diccionario_Datos.md)
- [Análisis de lo Existente (roles y módulos)](../../01_Documentacion/Analisis_de_lo_Existente.pdf)

---

*Última actualización: 1 de octubre de 2026*