from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
from src.config import settings

from src.models import *  

from src.api.routers import auth
from src.api.routers.consejo_escuela import acuerdos
from src.api.routers.admin import usuarios, catalogos, auditoria, dashboard 
from src.api.routers.comite_tecnico import comite_tecnico

from src.api.routers import notificaciones as router_notificaciones
from src.api.routers.investigador import propuestas as router_investigador
from src.api.routers.vinculacion import dictamenes as router_vinculacion

from src.api.routers.consejo_escuela import acuerdos
from src.api.routers.admin import usuarios, catalogos, auditoria, dashboard 

from src.api.routers.consejo_escuela import acuerdos, votaciones, propuestas
from src.api.routers.vie import miembro_cie
from src.api.routers import direccion_investigacion
from src.api.routers.vie import expedientes, subsanaciones, preferencias

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 

app = FastAPI(title="SGPI Fondos VIE")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Inclusión de routers por módulo
app.include_router(auth.router)
app.include_router(router_notificaciones.router)
app.include_router(router_investigador.router)
app.include_router(router_vinculacion.router)
app.include_router(acuerdos.router)
app.include_router(catalogos.router, prefix="/api/admin") 
app.include_router(usuarios.router, prefix="/api/admin", tags=["Administración"])
app.include_router(auditoria.router, prefix="/api/admin", tags=["Administración"])
app.include_router(dashboard.router)
app.include_router(comite_tecnico.router)
app.include_router(votaciones.router)
app.include_router(propuestas.router)
app.include_router(miembro_cie.router)
app.include_router(direccion_investigacion.router)
app.include_router(expedientes.router)
app.include_router(subsanaciones.router)
app.include_router(preferencias.router)


@app.get("/")
def root():
    return {"message": "SGPI API - Backend funcionando", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}