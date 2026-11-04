# SGPI - Sistema de Gestión de Propuestas de Investigación (Fondos VIE)

**Curso:** Diseño de Software  
**Profesor:** Mario Chacón Rivas  
**Institución:** Instituto Tecnológico de Costa Rica (TEC)  
**Fecha de inicio:** Septiembre 2026

---

## 👥 Equipo de Trabajo

| Nombre | Rol en el equipo |
|--------|------------------|
| Gómez Ruiz, Nahomy Guisell | Programadora principal |
| Hernández Gamboa, Gerald Josúe | Programador principal |
| Morales Cerdas, Félix Gabriel | Programador principal |
| Fallas Padilla, Deryan Antonio | Programador principal |

---

## 📌 Descripción del Proyecto

Prototipo de sistema para la gestión, evaluación y seguimiento de propuestas de investigación financiadas por los **Fondos VIE** del Instituto Tecnológico de Costa Rica (TEC). El sistema digitaliza el flujo institucional completo que involucra **13 roles diferenciados**, desde la formulación de la propuesta por parte del investigador hasta la resolución final del Consejo de Investigación y Extensión (CIE).

### Objetivos clave
- Centralizar el flujo de propuestas en un solo entorno digital
- Garantizar trazabilidad documental en cada etapa del proceso
- Incorporar estándares de accesibilidad (WCAG 2.1 AA, soporte para daltonismo)
- Eliminar el *hardcoding* de reglas de negocio mediante catálogos dinámicos
- Optimizar el rendimiento mediante normalización vertical y desnormalización controlada

---

## 📂 Estructura del Repositorio

```
SGPI-Fondos-VIE (password:Sgpi-VIE123)/
│
├── 01_Documentacion/                    # Entregables académicos
│   ├── Analisis_de_lo_Existente.pdf     # Análisis de personas, roles y necesidades
│   └── Modelo_de_Datos_Relacional.pdf   # Diccionario de datos y DER
│
├── 02_Diseno_UI_UX/                     # Prototipo visual
│   ├── Enlace_Prototipo_Figma.txt
│   ├── Assets/                          # Logos, íconos, imágenes del TEC
│   └── Capturas_Pantalla/               # Evidencias de pantallas clave
│
├── 03_Base_de_Datos/                    # Documentación académica de la BD
│   ├── Diagramas/                       # DER y Diagrama Relacional
│   └── Diccionario_Datos.md             # Diccionario en formato markdown
│
├── 04_Referencias_Normativas/           # Documentos oficiales del TEC
│   ├── 1-Disposiciones_Convocatoria_2027.pdf
│   ├── 2-Rubricas_Investigacion_2027.xlsx
│   ├── 3-Formulario_Proyecto_Form04.docx
│   ├── 4-Plan_Accion_Riesgos_Form05.xlsx
│   ├── 5-Plantilla_Presupuesto_Form06.xlsx
│   ├── 6-Acuerdo_Instancia_Coordinadora_Form07.docx
│   └── 7-Acuerdo_Instancia_Participante_Form08.docx
│
└── 05_Codigo_Fuente/                    # Código real del proyecto
    │
    ├── backend/                         # API y lógica de negocio (Python + FastAPI)
    │   ├── requirements.txt             # Dependencias Python
    │   ├── .env.example                 # Variables de entorno de ejemplo
    │   └── src/
    │       ├── main.py                  # Punto de entrada de FastAPI
    │       ├── config.py                # Configuración (DB, JWT, CORS)
    │       ├── database.py              # Conexión SQLAlchemy + Session
    │       │
    │       ├── api/                     # CAPA DE API (Interfaz con el Frontend)
    │       │   ├── routers/             # Endpoints HTTP divididos por los 6 módulos
    │       │   │   ├── auth.py          # Genérico: /login, /perfil, /logout
    │       │   │   ├── investigador/     # Módulo 1: Formulación
    │       │   │   │   └── propuestas.py
    │       │   │   ├── comite_tecnico/  # Módulo 2: Evaluación Técnica
    │       │   │   │   └── evaluaciones.py
    │       │   │   ├── consejo_escuela/ # Módulo 3: Aprobación Institucional
    │       │   │   │   └── acuerdos.py
    │       │   │   ├── vie/             # Módulo 4: Validación VIE
    │       │   │   │   └── subsanaciones.py
    │       │   │   ├── admin/           # Módulo 5: Administración
    │       │   │   │   └── catalogos.py
    │       │   │   └── consulta_historica/ # Módulo 6: Consulta Histórica
    │       │   │       └── reportes.py
    │       │   │
    │       │   └── schemas/             #  Validación Pydantic por módulo
    │       │       ├── auth.py          # LoginRequest, Token, PerfilResponse
    │       │       ├── investigador/
    │       │       ├── comite_tecnico/
    │       │       ├── consejo_escuela/
    │       │       ├── vie/
    │       │       ├── admin/
    │       │       └── consulta_historica/
    │       │
    │       ├── models/                  # MODELOS SQLAlchemy (por dominio de tablas)
    │       │   ├── usuarios.py          # Usuario, Escuela, Campus, Roles, Permisos
    │       │   ├── propuestas.py        # Propuesta, Contenido, Declaraciones, Equipo
    │       │   ├── evaluaciones.py      # Evaluaciones, Rúbrica, Criterios, Detalle
    │       │   ├── convocatorias.py     # Convocatorias, Etapas, Estados
    │       │   ── auditoria.py         # Logs, Notificaciones, Documentos
    │       │
    │       ├── services/                # LÓGICA DE NEGOCIO (por rol + genéricos)
    │       │   ├── auth_service.py      # Genérico: login, JWT, hashing bcrypt
    │       │   ├── notificacion_service.py # Genérico: envío correos/sistema
    │       │   ├── auditoria_service.py # Genérico: registro de logs forenses
    │       │   ├── investigador/         # Lógica Form-04, Form-05, Form-06
    │       │   ├── comite_tecnico/      # Lógica Rúbrica-02, Dictamen Vinculación
    │       │   ├── consejo_escuela/     # Lógica Votación, Form-07/08
    │       │   ├── vie/                 # Lógica Subsanaciones, Checklist, CIE
    │       │   ├── admin/               # Lógica CRUD Catálogos, Usuarios
    │       │   └── consulta_historica/  # Lógica Reportes y Métricas
    │       │
    │       └── utils/                   # HERRAMIENTAS transversales
    │           ├── security.py          # Hashing bcrypt, generación/validación JWT
    │           ├── dependencies.py      # get_db, get_current_user, check_rol
    │           └── helpers.py           # Generar códigos FVIE-YYYY-NNN, fechas
    │
    ├── frontend/                        # ⚛️ Interfaz de usuario (React + Vite)
    │   ├── package.json
    │   ├── vite.config.js
    │   └── src/
    │       ├── components/              # Componentes reutilizables (UI)
    │       ├── pages/                   # Vistas/pantallas completas
    │       ├── services/                # Llamadas HTTP a la API (Axios/Fetch)
    │       ├── hooks/                   # Custom hooks (useAuth, useProposals)
    │       ├── context/                 # Context API (AuthContext, ThemeContext)
    │       ├── utils/                   # Formateo de fechas, validaciones
    │       └── assets/                  # Imágenes, logos, íconos
    │
    └── database/                        # 🗃️ Scripts SQL de la base de datos
        ├── scripts/
        │   ├── 01_create_tables.sql     # Creación de las ~60 tablas
        │   ├── 02_insert_catalogs.sql   # Datos semilla (catálogos del TEC)
        │   └── 03_indexes_constraints.sql # Índices y restricciones
```

> ⚠️ **Nota importante:** La carpeta `03_Base_de_Datos` es **exclusivamente para documentación académica** (diagramas y diccionario). El código SQL real vive en `05_Codigo_Fuente/database/scripts/`.

---

## Módulos del Sistema

El sistema se divide en **6 módulos principales** que reflejan el flujo institucional real:

| # | Módulo | Responsable principal |
|---|--------|----------------------|
| 1 | **Formulación** | Investigador Coordinador |
| 2 | **Evaluación Técnica** | Evaluador de Vinculación + Comité Técnico |
| 3 | **Aprobación Institucional** | Consejo de Escuela |
| 4 | **Validación y Resolución VIE** | Gestora VIE + CIE + Dirección de Investigación |
| 5 | **Administración del Sistema** | SuperAdministrador |
| 6 | **Consulta Histórica** | Transversal (todos los roles con permisos) |

---

## Roles Identificados (13 perfiles)

1. **Investigador Coordinador** - Lidera y formula la propuesta
2. **Evaluador de Vinculación** - Emite dictamen de PI y TRL
3. **Asistente del Comité Técnico** - Revisa completitud
4. **Coordinador del Comité Técnico** - Consolida notas y emite oficio
5. **Director de Escuela (Comité)** - Participa en evaluación técnica
6. **Profesor Evaluador (Comité)** - Evalúa independientemente con rúbrica
7. **Asistente del Consejo de Escuela** - Enruta expedientes
8. **Consejo de Profesores** - Aprueba/rechaza y genera aval
9. **Dirección del Consejo de Escuela** - Firma acuerdos (Form-07/08)
10. **Persona Gestora de la VIE** - Valida completitud y normativa
11. **Miembro del CIE** - Resolución final institucional
12. **Dirección de Investigación** - Notifica resoluciones
13. **Administrador del Sistema** - Gestiona catálogos, usuarios y permisos

---

## Modelo de Datos (Resumen)

El modelo cuenta con **~39 tablas** organizadas en 7 módulos lógicos, siguiendo el estándar **CamelCase** para tablas y **camelCase** para columnas, con PKs del tipo `[entidad]Id` y FKs del tipo `id[Entidad]`.

### Principales decisiones de diseño
- **Normalización vertical** de `Propuestas` en 3 tablas (`Propuestas`, `PropuestaContenido`, `PropuestaDeclaraciones`) para optimizar consultas de bandeja
- **Desnormalización controlada** con `etapaId` en `Propuestas` para filtros rápidos
- **Cero hardcoding**: catálogos dinámicos para reglas de negocio, rúbricas y configuraciones
- **Auditoría forense** con tabla `Logs` (BIGINT + JSONB)
- **Accesibilidad persistida** en `PreferenciasAccesibilidad` (WCAG 2.1 AA)

**Documento completo:** `03_Base_de_Datos/Diccionario_Datos.md`

---

## Tecnologías

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Backend** | Python (FastAPI) | Tipado fuerte, async, documentación automática |
| **Frontend** | React + Vite | Rápido, moderno, componente reutilizable |
| **Base de datos** | MySQL / PostgreSQL | Soporte JSONB, transacciones ACID |
| **Contenedores** | Docker + docker-compose | Reproducibilidad del entorno |
| **Control de versiones** | Git + GitHub | Colaboración en equipo |

---

## Cómo empezar

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/SGPI-Fondos-VIE.git
cd SGPI-Fondos-VIE
```

### 2. Levantar la base de datos
```bash
cd 05_Codigo_Fuente/database/scripts
# Redactado cuando se complete la base de datos
```

### 3. Iniciar el backend
```bash
cd 05_Codigo_Fuente/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
python src/main.py
```

### 4. Iniciar el frontend
```bash
cd 05_Codigo_Fuente/frontend
npm install
npm run dev
```

---

## Flujo de trabajo con Git

Para evitar conflictos entre los 3 miembros del equipo:

```bash
# 1. Antes de empezar a trabajar, siempre traer los últimos cambios
git pull origin main

# 2. Hacer los cambios necesarios...

# 3. Agregar y commitear con mensajes descriptivos
git add .
git commit -m "feat: agregar tabla de PlanAccionRiesgos"
# o
git commit -m "docs: actualizar análisis de tamaño de tablas"

# 4. Subir los cambios
git push origin main
```

### Convención de mensajes de commit
- `feat:` nueva funcionalidad
- `fix:` corrección de error
- `docs:` cambios en documentación
- `style:` formato, sin cambio de lógica
- `refactor:` reestructuración de código
- `test:` agregar/modificar pruebas

---

##  Estado del Proyecto

| Entregable | Estado | Responsable |
|------------|--------|-------------|
| Análisis de lo Existente | ✅ Completo | Nahomy |
| Análisis de Personas (User Personas) | ✅ Completo | Gerald |
| Inventario de Contenidos | ✅ Completo | Félix |
| Prototipo Figma (pantallas clave) | 🟡 En progreso (80%) | Todos |
| Modelo de Datos Relacional | ✅ Completo | Gerald |
| Diccionario de Datos | ✅ Completo | Todos |
| Análisis de tamaño de tablas | ✅ Completo | Nahomy |
| Scripts SQL de la BD | ⚪ Pendiente | Gerald |
| Implementación Backend | ⚪ Pendiente | Por definir |
| Implementación Frontend | ⚪ Pendiente | Por definir |

---

## Referencias Normativas

Todo el modelo se basa estrictamente en los documentos oficiales del TEC:
- Disposiciones de la Convocatoria Fondos VIE 2027
- Formulario Form-04 (Proyecto de Investigación)
- Form-05 (Plan de Acción y Gestión de Riesgos)
- Form-06 (Plantilla de Presupuesto)
- Form-07/08 (Acuerdos de Consejo)
- Rúbricas de Evaluación 2027 (Fortalecimiento, Básica/Aplicada, Desarrollo Tecnológico)

Todos los documentos originales están en `04_Referencias_Normativas/`

---


---

*Última actualización: 27 de septiembre de 2026*
