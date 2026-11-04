# src/services/admin/usuario_service.py
"""
Servicio del Módulo 5: Administración — Gestión de usuarios, roles, permisos y accesibilidad.

Reglas de negocio implementadas (según README + Diccionario de Datos):
- Solo correos institucionales @tec.ac.cr (validar_correo_institucional).
- Contraseñas siempre hasheadas con bcrypt; los responses jamás exponen el hash.
- Un usuario puede tener múltiples roles (UsuarioRol) con expiración opcional.
- Soft-delete de usuarios (activo=false) para preservar la trazabilidad forense de Logs.
- Permisos por rol (RolPermisos) con reemplazo atómico del set completo (PUT).
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from src.models.catalogos import AsignacionesGestora, PreferenciasAccesibilidad
from src.models.escuelas import Escuela
from src.models.roles import Permisos, RolPermisos, RolesSistema, UsuarioRol
from src.models.usuarios import Usuario
from src.utils.helpers import validar_correo_institucional
from src.utils.seguridad import generar_hash_contrasena


def _ahora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _usuario_o_404(sesion: Session, usuario_id: int) -> Usuario:
    usuario = sesion.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail=f"Usuario con id {usuario_id} no encontrado")
    return usuario

def listar_usuarios(
    sesion: Session,
    *,
    pagina: int = 1,
    tamano_pagina: int = 50,
    busqueda: Optional[str] = None,
    escuela_id: Optional[int] = None,
    rol_id: Optional[int] = None,
    incluir_inactivos: bool = False,
) -> tuple[list[Usuario], dict]:
    
    consulta = select(Usuario).options(
        selectinload(Usuario.roles).selectinload(UsuarioRol.rol),
        selectinload(Usuario.escuela) 
    )

    if not incluir_inactivos:
        consulta = consulta.where(Usuario.activo.is_(True))
    if busqueda:
        consulta = consulta.where(
            or_(
                Usuario.correoInstitucional.ilike(f"%{busqueda}%"),
                Usuario.nombreUsuario.ilike(f"%{busqueda}%"),
                Usuario.apellido1Usuario.ilike(f"%{busqueda}%"),
            )
        )
    if escuela_id:
        consulta = consulta.where(Usuario.escuelaId == escuela_id)
    if rol_id:
        consulta = consulta.where(
            Usuario.usuarioId.in_(
                select(UsuarioRol.usuarioId).where(UsuarioRol.rolId == rol_id, UsuarioRol.activo.is_(True))
            )
        )

    total = sesion.execute(select(func.count()).select_from(consulta.subquery())).scalar_one()
    total_paginas = max(1, -(-total // tamano_pagina))

    registros = sesion.execute(
        consulta.order_by(Usuario.apellido1Usuario, Usuario.nombreUsuario)
        .offset((pagina - 1) * tamano_pagina)
        .limit(tamano_pagina)
    ).scalars().all()

    return list(registros), {"total": total, "pagina": pagina, "tamanoPagina": tamano_pagina, "totalPaginas": total_paginas}

def obtener_usuario(sesion: Session, usuario_id: int) -> Usuario:
    return _usuario_o_404(sesion, usuario_id)


def crear_usuario(sesion: Session, datos: dict, auditor_id: int) -> Usuario:
    """Alta de usuario: valida dominio TEC, unicidad de correo y hashea la contraseña."""
    correo = datos["correoInstitucional"]
    if not validar_correo_institucional(correo):
        raise HTTPException(status_code=422, detail="El correo debe pertenecer al dominio institucional @tec.ac.cr")

    existe = sesion.execute(select(Usuario).where(Usuario.correoInstitucional == correo)).scalars().first()
    if existe:
        raise HTTPException(status_code=409, detail=f"Ya existe un usuario registrado con el correo {correo}")

    escuela_id = datos.get("escuelaId")
    if escuela_id and sesion.get(Escuela, escuela_id) is None:
        raise HTTPException(status_code=422, detail=f"La escuela {escuela_id} no existe")

    contrasena = datos.pop("contrasena")
    usuario = Usuario(**datos, contrasenaHash=generar_hash_contrasena(contrasena))
    usuario.usuarioAuditoriaId = auditor_id
    usuario.ultimaAuditoria = _ahora()

    sesion.add(usuario)
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def actualizar_usuario(sesion: Session, usuario_id: int, datos: dict, auditor_id: int) -> Usuario:
    usuario = _usuario_o_404(sesion, usuario_id)

    correo = datos.get("correoInstitucional")
    if correo:
        if not validar_correo_institucional(correo):
            raise HTTPException(status_code=422, detail="El correo debe pertenecer al dominio institucional @tec.ac.cr")
        conflicto = sesion.execute(
            select(Usuario).where(Usuario.correoInstitucional == correo, Usuario.usuarioId != usuario_id)
        ).scalars().first()
        if conflicto:
            raise HTTPException(status_code=409, detail=f"El correo {correo} ya está en uso por otro usuario")

    escuela_id = datos.get("escuelaId")
    if escuela_id and sesion.get(Escuela, escuela_id) is None:
        raise HTTPException(status_code=422, detail=f"La escuela {escuela_id} no existe")

    contrasena = datos.pop("contrasena", None)
    if contrasena:
        usuario.contrasenaHash = generar_hash_contrasena(contrasena)

    for clave, valor in datos.items():
        if valor is not None:
            setattr(usuario, clave, valor)

    usuario.usuarioAuditoriaId = auditor_id
    usuario.ultimaAuditoria = _ahora()
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def cambiar_activo_usuario(sesion: Session, usuario_id: int, activo: bool, auditor_id: int) -> Usuario:
    """Soft-delete: nunca se elimina físicamente para proteger la cadena de auditoría."""
    usuario = _usuario_o_404(sesion, usuario_id)

    if not activo and usuario.usuarioId == 1:
        raise HTTPException(status_code=409, detail="El usuario base del sistema (id 1) no puede desactivarse")

    usuario.activo = activo
    usuario.usuarioAuditoriaId = auditor_id
    usuario.ultimaAuditoria = _ahora()
    sesion.commit()
    sesion.refresh(usuario)
    return usuario


def reset_contrasena(sesion: Session, usuario_id: int, nueva_contrasena: str, auditor_id: int) -> None:
    """El administrador fija una contraseña temporal; el hash anterior se descarta."""
    usuario = _usuario_o_404(sesion, usuario_id)
    usuario.contrasenaHash = generar_hash_contrasena(nueva_contrasena)
    usuario.usuarioAuditoriaId = auditor_id
    usuario.ultimaAuditoria = _ahora()
    sesion.commit()


# ---------------------------------------------------------------- Roles del usuario
def roles_de_usuario(sesion: Session, usuario_id: int) -> list[UsuarioRol]:
    asignaciones = sesion.execute(
        select(UsuarioRol)
        .where(UsuarioRol.usuarioId == usuario_id)
        .order_by(UsuarioRol.asignadoEn.desc())
    ).scalars().all()
    return list(asignaciones)

def asignar_rol(sesion: Session, usuario_id: int, rol_id: int, fecha_expiracion: datetime | None, admin_usuario_id: int):
    """
    Asigna un rol a un usuario. Si ya existe pero está inactivo, lo reactiva.
    Si ya está activo, lanza un error 400.
    """
    # 1. Verificar si el rol existe
    rol = sesion.query(RolesSistema).filter(RolesSistema.rolId == rol_id).first()
    if not rol or not rol.activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe o está inactivo."
        )

    # 2. Buscar si ya existe una asignación para este usuario y rol
    asignacion_existente = sesion.query(UsuarioRol).filter(
        UsuarioRol.usuarioId == usuario_id,
        UsuarioRol.rolId == rol_id
    ).first()

    if asignacion_existente:
        if asignacion_existente.activo:
            # Ya tiene el rol activo, no hacemos nada y lanzamos error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario ya tiene el rol '{rol.nombreRol}' asignado activamente."
            )
        else:
            # Estaba inactivo, lo reactivamos y actualizamos los datos de auditoría
            asignacion_existente.activo = True
            asignacion_existente.asignadoPorId = admin_usuario_id
            asignacion_existente.asignadoEn = datetime.now(timezone.utc)
            asignacion_existente.fechaExpiracion = fecha_expiracion
            asignacion_existente.usuarioAuditoriaId = admin_usuario_id
            asignacion_existente.ultimaAuditoria = datetime.now(timezone.utc)
            sesion.add(asignacion_existente)
            return asignacion_existente

    # 3. Si no existe, creamos una nueva asignación
    nueva_asignacion = UsuarioRol(
        usuarioId=usuario_id,
        rolId=rol_id,
        asignadoPorId=admin_usuario_id,
        asignadoEn=datetime.now(timezone.utc),
        fechaExpiracion=fecha_expiracion,
        activo=True,
        usuarioAuditoriaId=admin_usuario_id,
        ultimaAuditoria=datetime.now(timezone.utc)
    )
    sesion.add(nueva_asignacion)
    return nueva_asignacion


# ---------------------------------------------------------------- Roles del usuario
def asignar_rol(sesion: Session, usuario_id: int, rol_id: int, fecha_expiracion: datetime | None, admin_usuario_id: int) -> UsuarioRol:
    """
    Asigna un rol a un usuario. Si ya existe pero está inactivo, lo reactiva.
    Si ya está activo, lanza un error 400. Evita UniqueViolation.
    """
    # 1. Verificar si el rol existe y está activo
    rol = sesion.query(RolesSistema).filter(RolesSistema.rolId == rol_id).first()
    if not rol or not rol.activo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe o está inactivo."
        )

    # 2. Buscar si ya existe una asignación para este usuario y rol
    asignacion_existente = sesion.query(UsuarioRol).filter(
        UsuarioRol.usuarioId == usuario_id,
        UsuarioRol.rolId == rol_id
    ).first()

    if asignacion_existente:
        if asignacion_existente.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario ya tiene el rol '{rol.nombreRol}' asignado activamente."
            )
        else:
            # Estaba inactivo: lo reactivamos y actualizamos los datos de auditoría
            asignacion_existente.activo = True
            asignacion_existente.asignadoPorId = admin_usuario_id
            asignacion_existente.asignadoEn = _ahora()
            asignacion_existente.fechaExpiracion = fecha_expiracion
            asignacion_existente.usuarioAuditoriaId = admin_usuario_id
            asignacion_existente.ultimaAuditoria = _ahora()
            sesion.commit()
            sesion.refresh(asignacion_existente)
            return asignacion_existente

    # 3. Si no existe, creamos una nueva asignación
    nueva_asignacion = UsuarioRol(
        usuarioId=usuario_id,
        rolId=rol_id,
        asignadoPorId=admin_usuario_id,
        asignadoEn=_ahora(),
        fechaExpiracion=fecha_expiracion,
        activo=True,
        usuarioAuditoriaId=admin_usuario_id,
        ultimaAuditoria=_ahora()
    )
    sesion.add(nueva_asignacion)
    sesion.commit()
    sesion.refresh(nueva_asignacion)
    return nueva_asignacion


def revocar_rol(sesion: Session, usuario_id: int, usuario_rol_id: int, auditor_id: int) -> UsuarioRol:
    """
    Revoca un rol de un usuario (soft-delete).
    Mantiene el registro en UsuarioRol con activo=FALSE para trazabilidad.
    """
    asignacion = sesion.get(UsuarioRol, usuario_rol_id)
    
    if not asignacion or asignacion.usuarioId != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación de rol no encontrada para este usuario"
        )
    
    if not asignacion.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este rol ya fue revocado anteriormente"
        )
    
    # Soft-delete: marcar como inactivo
    asignacion.activo = False
    asignacion.fechaExpiracion = _ahora() # Usamos la función auxiliar del archivo para consistencia
    asignacion.usuarioAuditoriaId = auditor_id
    asignacion.ultimaAuditoria = _ahora()
    
    sesion.commit()
    sesion.refresh(asignacion)
    
    return asignacion


# ---------------------------------------------------------------- Catálogo de roles y permisos
def listar_roles(sesion: Session, incluir_inactivos: bool = False) -> list[RolesSistema]:
    consulta = select(RolesSistema).order_by(RolesSistema.nombreRol)
    if not incluir_inactivos:
        consulta = consulta.where(RolesSistema.activo.is_(True))
    return list(sesion.execute(consulta).scalars().all())


def crear_rol(sesion: Session, datos: dict, auditor_id: int) -> RolesSistema:
    existe = sesion.execute(select(RolesSistema).where(RolesSistema.nombreRol == datos["nombreRol"])).scalars().first()
    if existe:
        raise HTTPException(status_code=409, detail=f"Ya existe un rol llamado '{datos['nombreRol']}'")
    rol = RolesSistema(**datos, usuarioAuditoriaId=auditor_id, ultimaAuditoria=_ahora())
    sesion.add(rol)
    sesion.commit()
    sesion.refresh(rol)
    return rol


def actualizar_rol(sesion: Session, rol_id: int, datos: dict, auditor_id: int) -> RolesSistema:
    rol = sesion.get(RolesSistema, rol_id)
    if rol is None:
        raise HTTPException(status_code=404, detail=f"Rol con id {rol_id} no encontrado")
    nuevo_nombre = datos.get("nombreRol")
    if nuevo_nombre:
        conflicto = sesion.execute(
            select(RolesSistema).where(RolesSistema.nombreRol == nuevo_nombre, RolesSistema.rolId != rol_id)
        ).scalars().first()
        if conflicto:
            raise HTTPException(status_code=409, detail=f"Ya existe un rol llamado '{nuevo_nombre}'")
    for clave, valor in datos.items():
        if valor is not None:
            setattr(rol, clave, valor)
    rol.usuarioAuditoriaId = auditor_id
    rol.ultimaAuditoria = _ahora()
    sesion.commit()
    sesion.refresh(rol)
    return rol


def cambiar_activo_rol(sesion: Session, rol_id: int, activo: bool, auditor_id: int) -> RolesSistema:
    """No se puede desactivar un rol que tenga asignaciones activas de usuarios."""
    rol = sesion.get(RolesSistema, rol_id)
    if rol is None:
        raise HTTPException(status_code=404, detail=f"Rol con id {rol_id} no encontrado")
    if not activo:
        cantidad = sesion.execute(
            select(func.count()).select_from(UsuarioRol).where(UsuarioRol.rolId == rol_id, UsuarioRol.activo.is_(True))
        ).scalar_one()
        if cantidad > 0:
            raise HTTPException(
                status_code=409,
                detail=f"No se puede desactivar el rol '{rol.nombreRol}': {cantidad} usuario(s) lo tienen asignado",
            )
    rol.activo = activo
    rol.usuarioAuditoriaId = auditor_id
    rol.ultimaAuditoria = _ahora()
    sesion.commit()
    sesion.refresh(rol)
    return rol


def listar_permisos(sesion: Session, modulo_id: Optional[int] = None) -> list[Permisos]:
    consulta = select(Permisos).order_by(Permisos.nombrePermiso)
    if modulo_id:
        consulta = consulta.where(Permisos.moduloId == modulo_id)
    return list(sesion.execute(consulta).scalars().all())


def crear_permiso(sesion: Session, datos: dict, auditor_id: int) -> Permisos:
    from src.models.catalogos import ModulosSistema
    if sesion.get(ModulosSistema, datos["moduloId"]) is None:
        raise HTTPException(status_code=422, detail=f"El módulo {datos['moduloId']} no existe")
    existe = sesion.execute(select(Permisos).where(Permisos.nombrePermiso == datos["nombrePermiso"])).scalars().first()
    if existe:
        raise HTTPException(status_code=409, detail=f"Ya existe el permiso '{datos['nombrePermiso']}'")
    permiso = Permisos(**datos, usuarioAuditoriaId=auditor_id, ultimaAuditoria=_ahora())
    sesion.add(permiso)
    sesion.commit()
    sesion.refresh(permiso)
    return permiso


def permisos_de_rol(sesion: Session, rol_id: int) -> list[int]:
    filas = sesion.execute(select(RolPermisos.permisoId).where(RolPermisos.rolId == rol_id)).scalars().all()
    return list(filas)


def reemplazar_permisos_rol(sesion: Session, rol_id: int, permiso_ids: list[int], auditor_id: int) -> list[int]:
    """PUT: reemplaza de forma atómica el set de permisos del rol."""
    rol = sesion.get(RolesSistema, rol_id)
    if rol is None:
        raise HTTPException(status_code=404, detail=f"Rol con id {rol_id} no encontrado")

    permisos_validos = sesion.execute(select(Permisos.permisoId).where(Permisos.permisoId.in_(permiso_ids))).scalars().all()
    invalidos = set(permiso_ids) - set(permisos_validos)
    if invalidos:
        raise HTTPException(status_code=422, detail=f"Permisos inexistentes: {sorted(invalidos)}")

    sesion.query(RolPermisos).filter(RolPermisos.rolId == rol_id).delete()
    for permiso_id in permiso_ids:
        sesion.add(RolPermisos(rolId=rol_id, permisoId=permiso_id, usuarioAuditoriaId=auditor_id, ultimaAuditoria=_ahora()))
    sesion.commit()
    return permisos_de_rol(sesion, rol_id)


# ---------------------------------------------------------------- Preferencias de accesibilidad (WCAG 2.1 AA)
def obtener_preferencias(sesion: Session, usuario_id: int) -> Optional[PreferenciasAccesibilidad]:
    _usuario_o_404(sesion, usuario_id)
    return sesion.execute(
        select(PreferenciasAccesibilidad).where(PreferenciasAccesibilidad.usuarioId == usuario_id)
    ).scalars().first()


def guardar_preferencias(sesion: Session, usuario_id: int, datos: dict, auditor_id: int) -> PreferenciasAccesibilidad:
    from src.models.catalogos import FiltrosDaltonismo, TamaniosFuente

    tamanio_id = datos.get("tamanioFuenteId")
    filtro_id = datos.get("filtroDaltonismoId")
    if tamanio_id and sesion.get(TamaniosFuente, tamanio_id) is None:
        raise HTTPException(status_code=422, detail=f"Tamaño de fuente {tamanio_id} inválido")
    if filtro_id and sesion.get(FiltrosDaltonismo, filtro_id) is None:
        raise HTTPException(status_code=422, detail=f"Filtro de daltonismo {filtro_id} inválido")

    preferencia = obtener_preferencias(sesion, usuario_id)
    if preferencia is None:
        preferencia = PreferenciasAccesibilidad(usuarioId=usuario_id)
        sesion.add(preferencia)

    for clave, valor in datos.items():
        if valor is not None:
            setattr(preferencia, clave, valor)
    preferencia.usuarioAuditoriaId = auditor_id
    preferencia.ultimaAuditoria = _ahora()
    sesion.commit()
    sesion.refresh(preferencia)
    return preferencia


# ---------------------------------------------------------------- Asignaciones Gestora VIE ↔ Escuela
def listar_asignaciones_gestora(sesion: Session, escuela_id: Optional[int] = None) -> list[AsignacionesGestora]:
    consulta = select(AsignacionesGestora).where(AsignacionesGestora.activo.is_(True))
    if escuela_id:
        consulta = consulta.where(AsignacionesGestora.escuelaId == escuela_id)
    return list(sesion.execute(consulta.order_by(AsignacionesGestora.escuelaId)).scalars().all())

def asignar_gestora(sesion: Session, escuela_id: int, gestora_vie_id: int, auditor_id: int) -> AsignacionesGestora:
    """Registra o reactiva la asignación de una persona gestora VIE a una escuela."""
    if sesion.get(Escuela, escuela_id) is None:
        raise HTTPException(status_code=422, detail=f"La escuela {escuela_id} no existe")
    
    gestora = _usuario_o_404(sesion, gestora_vie_id)
    if not gestora.activo:
        raise HTTPException(status_code=422, detail="La persona gestora está inactiva")

    # Buscar CUALQUIER asignación existente (activa o inactiva) para esta escuela y gestora
    asignacion_existente = sesion.execute(
        select(AsignacionesGestora).where(
            AsignacionesGestora.escuelaId == escuela_id,
            AsignacionesGestora.gestoraVIEId == gestora_vie_id
        )
    ).scalars().first()

    if asignacion_existente:
        if asignacion_existente.activo:
            # Ya está activa, no hacemos nada y devolvemos la existente
            return asignacion_existente
        else:
            # Estaba inactiva (revocada), la reactivamos
            asignacion_existente.activo = True
            asignacion_existente.usuarioAuditoriaId = auditor_id
            asignacion_existente.ultimaAuditoria = _ahora()
            sesion.commit()
            sesion.refresh(asignacion_existente)
            return asignacion_existente

    # Si no existe ninguna, creamos una nueva
    nueva_asignacion = AsignacionesGestora(
        escuelaId=escuela_id, 
        gestoraVIEId=gestora_vie_id, 
        usuarioAuditoriaId=auditor_id, 
        ultimaAuditoria=_ahora()
    )
    sesion.add(nueva_asignacion)
    sesion.commit()
    sesion.refresh(nueva_asignacion)
    return nueva_asignacion


def revocar_asignacion_gestora(sesion: Session, asignacion_id: int, auditor_id: int) -> None:
    asignacion = sesion.get(AsignacionesGestora, asignacion_id)
    if asignacion is None:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if not asignacion.activo:
        raise HTTPException(status_code=409, detail="La asignación ya estaba revocada")
    asignacion.activo = False
    asignacion.usuarioAuditoriaId = auditor_id
    asignacion.ultimaAuditoria = _ahora()
    sesion.commit()

