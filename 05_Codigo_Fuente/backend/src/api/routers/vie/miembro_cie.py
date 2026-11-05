
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.vie import miembro_cie_service
from src.utils.dependencias import requerir_rol, obtener_usuario_actual
from src.models.usuarios import Usuario
from src.api.schemas.vie.miembro_cie import EvaluacionCIEEntrada,ResolucionCIEEntrada


router = APIRouter(
    prefix="/miembro-cie",
    tags=["Miembro CIE"],
)


ROLES_CIE = ["MiembroCIE", "CoordinadorCIE", "PresidenteCIE", "SuperAdministrador", "Administrador"]


@router.get(
    "/expedientes",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def listar_expedientes_cie(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return miembro_cie_service.listar_expedientes_cie(
        db,
        usuario.usuarioId,
    )


@router.get(
    "/rubrica",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def obtener_rubrica_cie(
    db: Session = Depends(get_db),
):
    return miembro_cie_service.obtener_rubrica_cie(db)



@router.get(
    "/expedientes/{codigo}",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def obtener_expediente_cie(
    codigo: str,
    db: Session = Depends(get_db),
):
    expediente = miembro_cie_service.obtener_expediente_cie(
        db,
        codigo,
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una propuesta con ese código.",
        )

    return expediente

@router.get(
    "/expedientes/{codigo}/evaluacion",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def obtener_evaluacion_cie(
    codigo: str,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    evaluacion = miembro_cie_service.obtener_evaluacion_cie(
        db,
        codigo,
        usuario.usuarioId,
    )

    if evaluacion is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una evaluación CIE para esta propuesta y usuario.",
        )

    return evaluacion

@router.put(
    "/expedientes/{codigo}/evaluacion",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def guardar_evaluacion_cie(
    codigo: str,
    datos: EvaluacionCIEEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return miembro_cie_service.guardar_evaluacion_cie(
        db,
        codigo,
        usuario.usuarioId,
        datos,
    )


@router.post(
    "/expedientes/{codigo}/resolucion",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def registrar_resolucion_cie(
    codigo: str,
    datos: ResolucionCIEEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return miembro_cie_service.registrar_resolucion_cie(
        db, codigo, usuario.usuarioId, datos
    )


@router.get(
    "/resoluciones",
    dependencies=[Depends(requerir_rol(ROLES_CIE))],
)
def listar_resoluciones_cie(
    db: Session = Depends(get_db),
):
    return miembro_cie_service.listar_resoluciones_cie(db)
