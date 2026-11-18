from datetime import datetime
from typing import Optional
from sqlalchemy import func, desc
from sqlalchemy.orm import Session, joinedload

from src.models.logs import Logs

def listar_actividad_sistema(
    sesion: Session,
    pagina: int = 1,
    tamano_pagina: int = 50,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    usuario_id: Optional[int] = None,
    tipo_evento_id: Optional[int] = None,
    severidad_id: Optional[int] = None,
    busqueda: Optional[str] = None
):
    # Query base con eager loading de todas las relaciones para obtener nombres en una sola consulta
    query = sesion.query(Logs).options(
        joinedload(Logs.tipoEvento),
        joinedload(Logs.severidad),
        joinedload(Logs.source),
        joinedload(Logs.usuario),
        joinedload(Logs.objeto1),
        joinedload(Logs.objeto2)
    )
    
    # Aplicar filtros dinámicos solo si se proporcionan
    if fecha_inicio:
        query = query.filter(Logs.creadoEn >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Logs.creadoEn <= fecha_fin)
    if usuario_id:
        query = query.filter(Logs.usuarioId == usuario_id)
    if tipo_evento_id:
        query = query.filter(Logs.tipoEventoId == tipo_evento_id)
    if severidad_id:
        query = query.filter(Logs.severidadId == severidad_id)
    if busqueda:
        query = query.filter(Logs.descripcion.ilike(f"%{busqueda}%"))
        
    # Ordenar por fecha descendente (los más recientes primero)
    query = query.order_by(desc(Logs.creadoEn))
    
    # Conteo total para la paginación
    total = query.count()
    
    # Aplicar paginación
    offset = (pagina - 1) * tamano_pagina
    logs = query.offset(offset).limit(tamano_pagina).all()
    
    # Mapeo manual para aplanar la respuesta y extraer los nombres de las relaciones
    items = []
    for log in logs:
        items.append({
            "logId": log.logId,
            "tipoEventoId": log.tipoEventoId,
            "nombreEvento": log.tipoEvento.nombreEvento if log.tipoEvento else None,
            "severidadId": log.severidadId,
            "nombreSeveridad": log.severidad.nombreSeveridad if log.severidad else None,
            "descripcion": log.descripcion,
            "sourceId": log.sourceId,
            "nombreSource": log.source.nombreSource if log.source else None,
            "usuarioId": log.usuarioId,
            "nombreUsuario": f"{log.usuario.nombreUsuario} {log.usuario.apellido1Usuario}".strip() if log.usuario else "Sistema",
            "referenciaId1": log.referenciaId1,
            "descripcionReferencia1": log.descripcionReferencia1,
            "referenciaId2": log.referenciaId2,
            "descripcionReferencia2": log.descripcionReferencia2,
            "objetoId1": log.objetoId1,
            "nombreObjeto1": log.objeto1.nombreObjeto if log.objeto1 else None,
            "objetoId2": log.objetoId2,
            "nombreObjeto2": log.objeto2.nombreObjeto if log.objeto2 else None,
            "datosAnteriores": log.datosAnteriores,
            "datosNuevos": log.datosNuevos,
            "creadoEn": log.creadoEn
        })
        
    metadatos = {
        "total": total,
        "pagina": pagina,
        "tamanoPagina": tamano_pagina,
        "totalPaginas": (total + tamano_pagina - 1) // tamano_pagina if tamano_pagina > 0 else 0
    }
    
    return items, metadatos