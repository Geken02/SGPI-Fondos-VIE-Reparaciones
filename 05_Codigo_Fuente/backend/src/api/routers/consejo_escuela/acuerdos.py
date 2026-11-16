from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from src.database import get_db
from src.models.acuerdos import AcuerdosConsejo, TiposAcuerdo
from src.models.catalogos import TiposHora
from src.models.propuestas import Propuesta
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta
from src.models.propuesta_contenido import PropuestaContenido
from src.models.usuarios import Usuario
from src.models.escuelas import Escuela
from src.models.catalogos import Modalidades
from src.api.schemas.consejo_escuela.acuerdos import (
    AcuerdoCrear,
    AcuerdoActualizar,
    AcuerdoRespuesta,
)
from src.services.consejo_escuela import acuerdo_service
from src.services.acuerdo_generator import generar_acuerdo_word

router = APIRouter(
    prefix="/consejo-escuela/acuerdos",
    tags=["Consejo de Escuela - Acuerdos"],
)

@router.get("/", response_model=list[AcuerdoRespuesta])
def listar_acuerdos(db: Session = Depends(get_db)):
    return acuerdo_service.listar_acuerdos(db)

@router.get("/catalogos/tipos-acuerdo")
def listar_tipos_acuerdo(db: Session = Depends(get_db)):
    """Lista todos los tipos de acuerdo activos"""
    tipos = db.query(TiposAcuerdo).filter(TiposAcuerdo.activo == True).all()
    return [
        {
            "tipoAcuerdoId": t.tipoAcuerdoId,
            "nombre": t.nombreTipoAcuerdo,
            "descripcion": t.descripcion
        }
        for t in tipos
    ]

@router.get("/catalogos/tipos-hora")
def listar_tipos_hora(db: Session = Depends(get_db)):
    """Lista todos los tipos de hora activos"""
    tipos = db.query(TiposHora).filter(TiposHora.activo == True).all()
    return [
        {
            "tipoHoraId": t.tipoHoraId,
            "codigo": t.codigoTipo,
            "descripcion": t.descripcion
        }
        for t in tipos
    ]

@router.get("/propuestas-disponibles")
def listar_propuestas_disponibles(db: Session = Depends(get_db)):
    """Lista propuestas en estado de aval para generar acuerdos"""
    from src.models.convocatorias import EstadosPropuesta
    
    # Buscar estados que requieren acuerdo (EN_CONSEJO, AVALADA, etc.)
    estados_acuerdo = db.query(EstadosPropuesta).filter(
        EstadosPropuesta.codigoEstadoPropuesta.in_(['EN_CONSEJO', 'AVALADA', 'APROBADA'])
    ).all()
    
    if not estados_acuerdo:
        return []
    
    estado_ids = [e.estadoPropuestaId for e in estados_acuerdo]
    
    propuestas = db.query(Propuesta).filter(
        Propuesta.estadoId.in_(estado_ids)
    ).all()
    
    resultado = []
    for p in propuestas:
        escuela = db.query(Escuela).filter(Escuela.escuelaId == p.escuelaId).first()
        modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == p.modalidadId).first()
        
        resultado.append({
            "propuestaId": p.propuestaId,
            "codigoPropuesta": p.codigoPropuesta,
            "titulo": p.titulo,
            "escuela": escuela.nombreEscuela if escuela else "Sin escuela",
            "modalidad": modalidad.nombreModalidad if modalidad else "Sin modalidad",
            "fechaInicio": p.fechaInicio.isoformat() if p.fechaInicio else None,
            "fechaFinalizacion": p.fechaFinalizacion.isoformat() if p.fechaFinalizacion else None
        })
    
    return resultado

@router.get("/{acuerdo_id}", response_model=AcuerdoRespuesta)
def obtener_acuerdo(acuerdo_id: int, db: Session = Depends(get_db)):
    acuerdo = acuerdo_service.obtener_acuerdo(db, acuerdo_id)
    if not acuerdo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el acuerdo.",
        )
    return acuerdo

@router.post("/", response_model=AcuerdoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_acuerdo(datos: AcuerdoCrear, db: Session = Depends(get_db)):
    try:
        return acuerdo_service.crear_acuerdo(db, datos)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

@router.post("/{acuerdo_id}/generar-documento")
def generar_documento_acuerdo(
    acuerdo_id: int,
    db: Session = Depends(get_db)
):
    """Genera el documento Word oficial del acuerdo (Form-07 o Form-08)"""
    acuerdo = acuerdo_service.obtener_acuerdo(db, acuerdo_id)
    if not acuerdo:
        raise HTTPException(status_code=404, detail="Acuerdo no encontrado")
    
    propuesta = db.query(Propuesta).filter(Propuesta.propuestaId == acuerdo.propuestaId).first()
    if not propuesta:
        raise HTTPException(status_code=404, detail="Propuesta no encontrada")
    
    # Obtener datos completos
    escuela = db.query(Escuela).filter(Escuela.escuelaId == propuesta.escuelaId).first()
    modalidad = db.query(Modalidades).filter(Modalidades.modalidadId == propuesta.modalidadId).first()
    tipo_acuerdo = db.query(TiposAcuerdo).filter(TiposAcuerdo.tipoAcuerdoId == acuerdo.tipoAcuerdoId).first()
    
    # Obtener integrantes
    integrantes = db.query(IntegrantesEquipoPropuesta).filter(
        IntegrantesEquipoPropuesta.propuestaId == propuesta.propuestaId
    ).all()
    
    integrantes_data = []
    for intg in integrantes:
        usuario = db.query(Usuario).filter(Usuario.usuarioId == intg.usuarioId).first()
        tipo_hora = db.query(TiposHora).filter(TiposHora.tipoHoraId == intg.tipoHoraId).first()
        
        integrantes_data.append({
            "nombre": f"{usuario.nombreUsuario} {usuario.apellido1Usuario}" if usuario else "Desconocido",
            "escuela": escuela.nombreEscuela if escuela else "TEC",
            "rol": "Coordinador" if intg.usuarioId == propuesta.investigadorCoordId else "Investigador",
            "horas": intg.horasSemanales,
            "tipoHora": tipo_hora.codigoTipo if tipo_hora else "VIE",
            "periodo": f"{propuesta.fechaInicio.year}-{propuesta.fechaFinalizacion.year}" if propuesta.fechaInicio else "2027-2029"
        })
    
    # Determinar si es Form-07 (coordinadora) o Form-08 (participante)
    es_coordinadora = propuesta.escuelaId == escuela.escuelaId if escuela else True
    tipo_formulario = "Form-07" if es_coordinadora else "Form-08"
    
    # Generar documento
    doc_bytes = generar_acuerdo_word({
        "numeroAcuerdo": acuerdo.numeroAcuerdo or f"AC-{acuerdo.acuerdoId}-2027",
        "fechaAcuerdo": acuerdo.fechaAcuerdo.isoformat() if acuerdo.fechaAcuerdo else None,
        "escuela": escuela.nombreEscuela if escuela else "Escuela de Ingeniería",
        "propuesta": {
            "titulo": propuesta.titulo,
            "codigo": propuesta.codigoPropuesta,
            "modalidad": modalidad.nombreModalidad if modalidad else "Investigación",
            "fechaInicio": propuesta.fechaInicio,
            "fechaFinalizacion": propuesta.fechaFinalizacion
        },
        "integrantes": integrantes_data,
        "presupuesto": acuerdo.presupuestoAprobado or 0,
        "horasAprobadas": acuerdo.horasAprobadas or 0,
        "tipoFormulario": tipo_formulario
    })
    
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    
    filename = f"{tipo_formulario}_{propuesta.codigoPropuesta}.docx"
    
    return StreamingResponse(
        BytesIO(doc_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.patch("/{acuerdo_id}", response_model=AcuerdoRespuesta)
def actualizar_acuerdo(
    acuerdo_id: int,
    datos: AcuerdoActualizar,
    db: Session = Depends(get_db),
):
    try:
        return acuerdo_service.actualizar_acuerdo(db, acuerdo_id, datos)
    except ValueError as error:
        codigo = (
            status.HTTP_404_NOT_FOUND
            if str(error) == "El acuerdo indicado no existe."
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=codigo, detail=str(error)) from error