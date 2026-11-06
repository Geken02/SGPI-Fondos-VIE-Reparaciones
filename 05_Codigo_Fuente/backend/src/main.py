# src/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Base de datos y Configuración
from src.database import engine, Base
from src.config import settings

# Modelos (Importar * asegura que SQLAlchemy registre todas las tablas)
from src.models import *  

# ============================================================================
# IMPORTACIÓN DE ROUTERS
# ============================================================================
# Auth y Core
from src.api.routers import auth
from src.api.routers import notificaciones as router_notificaciones
from src.api.routers.investigador import propuestas as router_investigador
from src.api.routers.vinculacion import dictamenes as router_vinculacion
from src.api.routers import archivos

# Administración y Dashboard
from src.api.routers.admin import usuarios, catalogos, auditoria, dashboard 

# Comité Técnico
from src.api.routers.comite_tecnico import comite_tecnico

# Consejo de Escuela (Incluye las adiciones de Deryan)
from src.api.routers.consejo_escuela import acuerdos, votaciones, propuestas, asignaciones

# VIE, CIE y Dirección
from src.api.routers.vie import miembro_cie
from src.api.routers.vie import expedientes, subsanaciones, preferencias
from src.api.routers import direccion_investigacion
from src.api.routers import archivos

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from src.api.routers.consejo_escuela import asignaciones

# ============================================================================
# INICIALIZACIÓN DE LA APP
# ============================================================================
app = FastAPI(title="SGPI Fondos VIE")

# Configuración de CORS (Dinámica para funcionar en Localhost y en la Nube)
# Lee la variable de entorno CORS_ORIGINS, o usa localhost por defecto
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# INCLUSIÓN DE ROUTERS
# ============================================================================
# 1. Auth y Notificaciones
app.include_router(auth.router)
app.include_router(router_notificaciones.router)

# 2. Módulos Principales
app.include_router(router_investigador.router)
app.include_router(router_vinculacion.router)
app.include_router(archivos.router)

# 3. Administración
app.include_router(usuarios.router, prefix="/api/admin", tags=["Administración"])
app.include_router(catalogos.router, prefix="/api/admin", tags=["Administración"]) 
app.include_router(auditoria.router, prefix="/api/admin", tags=["Administración"])
app.include_router(dashboard.router)

# 4. Comités y Evaluación
app.include_router(comite_tecnico.router)
app.include_router(acuerdos.router)
app.include_router(votaciones.router)
app.include_router(propuestas.router)
app.include_router(asignaciones.router)  # <-- Adición clave de Deryan
app.include_router(miembro_cie.router)
app.include_router(direccion_investigacion.router)

# 5. Gestión VIE
app.include_router(expedientes.router)
app.include_router(subsanaciones.router)
app.include_router(preferencias.router)
app.include_router(archivos.router)
app.include_router(asignaciones.router)


# ============================================================================
# ENDPOINTS DE SALUD Y RAÍZ
# ============================================================================
@app.get("/")
def root():
    return {
        "message": "SGPI API - Backend funcionando", 
        "docs": "/docs",
        "cors_origins": cors_origins # Útil para depurar en la nube
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}