"""
form05_router_helpers.py
========================
Snippet con la lógica que debe agregar el router (archivos.py o
propuesta_import.py) para resolver las iniciales del Form-05 a IDs reales
de Usuario usando la tabla Usuarios y la tabla ColaboradoresExternos.

ESTE ARCHIVO ES DE REFERENCIA — no se ejecuta standalone.  Pega las funciones
y el bloque de código actualizado en tu router donde tengas
_persistir_datos_form05.

Flujo:
  1. El parser devuelve equipo_map = {"MCHR": "Mario Chacón Rivas", ...}
  2. El router arma un cache iniciales → usuarioId consultando:
       a) Usuarios por nombre + apellido1
       b) ColaboradoresExternos por nombre + apellido1
       c) IntegrantesEquipoPropuesta ya cargados (que tienen ORCID)
  3. Para cada actividad, recorre participantes_lista y resuelve IDs
  4. Inserta en ParticipantesActividad con el usuarioId correcto
  5. Reporta iniciales no resueltas (GAS, etc.) para que el gestor las revise
"""
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timezone


from src.models.usuarios import Usuario
from src.models.propuesta_equipo import ColaboradoresExternos
from src.models.propuesta_equipo import IntegrantesEquipoPropuesta
from src.models.propuesta_plan import ParticipantesActividad, TiposResponsabilidad, Actividades


# ============================================================================
# 1. CONSTRUIR EL CACHE: iniciales → usuarioId
# ============================================================================

def _construir_cache_iniciales(
    sesion: Session,
    propuesta_id: int,
    equipo_map: Dict[str, str],
) -> Dict[str, dict]:
    """
    Para cada par {iniciales → nombre_completo} del equipo_map, busca el
    usuarioId correspondiente en:

      1. IntegrantesEquipoPropuesta (ya cargados con ORCID desde el Form-04)
      2. Usuarios (TEC staff)
      3. ColaboradoresExternos (externos)

    Devuelve:
        {
          "MCHR": {"usuarioId": 4, "nombre": "Mario Chacón Rivas",
                   "origen": "Usuarios"},
          "NPR":  {"usuarioId": None, "colaboradorId": 7,
                   "nombre": "Nelson Pérez Rojas", "origen": "ColaboradoresExternos"},
          "PCD":  {"usuarioId": None, "nombre": "Persona usuaria LESCO",
                   "origen": "NoEncontrado"},
          ...
        }

    Para colaboradores externos SIN usuarioId, el router puede:
      - Crear un Usuario "dummy" con el rol "Colaborador Externo", o
      - Saltar la inserción en ParticipantesActividad (que requiere usuarioId).
    """
    cache: Dict[str, dict] = {}

    for iniciales, nombre_completo in equipo_map.items():
        # 1. Buscar en IntegrantesEquipoPropuesta — el Form-04 ya debería haber
        # cargado a Mario Chacón Rivas y Yuen Law con sus ORCIDs.
        integrante = sesion.query(IntegrantesEquipoPropuesta).filter(
            IntegrantesEquipoPropuesta.propuestaId == propuesta_id,
            IntegrantesEquipoPropuesta.orcid != None,
        ).all()

        usuario_encontrado = None
        for integ in integrante:
            usuario = sesion.query(Usuario).filter(
                Usuario.usuarioId == integ.usuarioId,
                Usuario.activo == True,
            ).first()
            if usuario:
                nombre_full = f"{usuario.nombreUsuario} {usuario.apellido1Usuario or ''} {usuario.apellido2Usuario or ''}".strip()
                # Coincidencia flexible: comparar por substring
                if _nombres_coinciden(nombre_completo, nombre_full):
                    usuario_encontrado = usuario
                    break

        if usuario_encontrado:
            cache[iniciales] = {
                "usuarioId": usuario_encontrado.usuarioId,
                "nombre": nombre_completo,
                "origen": "IntegrantesEquipoPropuesta",
            }
            continue

        # 2. Buscar directamente en Usuarios por nombre
        usuario = _buscar_usuario_por_nombre(sesion, nombre_completo)
        if usuario:
            cache[iniciales] = {
                "usuarioId": usuario.usuarioId,
                "nombre": nombre_completo,
                "origen": "Usuarios",
            }
            continue

        # 3. Buscar en ColaboradoresExternos
        col = _buscar_colaborador_por_nombre(sesion, propuesta_id, nombre_completo)
        if col:
            cache[iniciales] = {
                "usuarioId": None,         # ColaboradoresExternos no tiene usuarioId
                "colaboradorId": col.colaboradorId,
                "nombre": nombre_completo,
                "origen": "ColaboradoresExternos",
            }
            continue

        # 4. No encontrado — reportar para que el gestor lo resuelva manualmente
        cache[iniciales] = {
            "usuarioId": None,
            "nombre": nombre_completo,
            "origen": "NoEncontrado",
        }

    return cache


def _nombres_coinciden(nombre_a: str, nombre_b: str) -> bool:
    """Coincidencia flexible entre dos nombres completos."""
    if not nombre_a or not nombre_b:
        return False
    # Normalizar: lowercase, quitar acentos, colapsar espacios
    import unicodedata
    def norm(s):
        s = unicodedata.normalize("NFKD", s.lower())
        s = "".join(c for c in s if not unicodedata.combining(c))
        return " ".join(s.split())
    a, b = norm(nombre_a), norm(nombre_b)
    # Coincidencia si uno contiene al otro o comparten tokens principales
    if a == b:
        return True
    tokens_a = set(a.split())
    tokens_b = set(b.split())
    # Al menos 2 tokens en común, o el primer token + apellido coinciden
    comunes = tokens_a & tokens_b
    if len(comunes) >= 2:
        return True
    if len(tokens_a) >= 2 and len(tokens_b) >= 2:
        if list(tokens_a)[0] == list(tokens_b)[0]:
            return True
    return False


def _buscar_usuario_por_nombre(sesion: Session, nombre_completo: str):
    """Busca un Usuario por nombre completo (nombre + apellido1)."""
    if not nombre_completo:
        return None
    partes = nombre_completo.split(maxsplit=1)
    nombre_pila = partes[0]
    apellidos = partes[1] if len(partes) > 1 else ""
    apellido1 = apellidos.split()[0] if apellidos.split() else ""

    if apellido1:
        return sesion.query(Usuario).filter(
            Usuario.nombreUsuario.ilike(f"%{nombre_pila}%"),
            Usuario.apellido1Usuario.ilike(f"%{apellido1}%"),
            Usuario.activo == True,
        ).first()
    return sesion.query(Usuario).filter(
        Usuario.nombreUsuario.ilike(nombre_pila),
        Usuario.activo == True,
    ).first()


def _buscar_colaborador_por_nombre(sesion: Session, propuesta_id: int, nombre_completo: str):
    """Busca un ColaboradoresExternos por nombre en una propuesta."""
    if not nombre_completo:
        return None
    partes = nombre_completo.split(maxsplit=1)
    nombre_pila = partes[0]
    apellido1 = ""
    if len(partes) > 1:
        apellido1 = partes[1].split()[0] if partes[1].split() else ""

    q = sesion.query(ColaboradoresExternos).filter(
        ColaboradoresExternos.propuestaId == propuesta_id,
    )
    if apellido1:
        return q.filter(
            ColaboradoresExternos.nombreColaborador.ilike(f"%{nombre_pila}%"),
            ColaboradoresExternos.apellido1Colaborador.ilike(f"%{apellido1}%"),
        ).first()
    return q.filter(
        ColaboradoresExternos.nombreColaborador.ilike(nombre_pila),
    ).first()


# ============================================================================
# 2. BLOQUE ACTUALIZADO PARA _persistir_datos_form05
# ============================================================================
# Reemplaza el bloque que procesa "UPSERT Participantes de la actividad"
# (al final de _persistir_datos_form05) por este:

def _persistir_participantes_actividad(
    sesion: Session,
    propuesta_id: int,
    datos: dict,
    usuario_actual,
    cache_iniciales: Dict[str, dict],
) -> List[dict]:
    """
    Recorre las actividades y crea los registros en ParticipantesActividad
    usando el cache de iniciales → usuarioId.

    Devuelve una lista de advertencias para que el router las incluya en la
    respuesta HTTP.
    """
    ahora = datetime.now(timezone.utc)
    advertencias: List[dict] = []

    # Buscar el TipoResponsabilidad correspondiente a "Investigador" o el
    # primero disponible como fallback.
    tipo_resp_default = sesion.query(TiposResponsabilidad).filter(
        TiposResponsabilidad.nombreTipoResponsabilidad.ilike("%investigador%")
    ).first() or sesion.query(TiposResponsabilidad).first()

    if not tipo_resp_default:
        advertencias.append({
            "tipo": "config",
            "mensaje": "No hay TiposResponsabilidad en la BD. No se insertaron participantes.",
        })
        return advertencias

    # Mapeo: el valor "Supervisa/Participa/Ejecuta" del Excel → un tipo de
    # responsabilidad específico (si existe).  Si no, usar el default.
    mapping_resp = {
        "Ejecuta": "Ejecuta",
        "Supervisa": "Supervisa",
        "Participa": "Participa",
    }

    for i, act in enumerate(datos.get("actividades", [])):
        actividad_db = sesion.query(Actividades).filter(
            Actividades.propuestaId == propuesta_id,
            Actividades.descripcionActividad.ilike(f"%{act['descripcion'][:80]}%"),
        ).first()
        if not actividad_db:
            continue

        # Resolver el TipoResponsabilidad del campo "responsabilidad"
        tipo_resp = tipo_resp_default
        if act.get("responsabilidad"):
            for keyword, _ in mapping_resp.items():
                if keyword.lower() in act["responsabilidad"].lower():
                    tr = sesion.query(TiposResponsabilidad).filter(
                        TiposResponsabilidad.nombreTipoResponsabilidad.ilike(f"%{keyword}%"),
                    ).first()
                    if tr:
                        tipo_resp = tr
                        break

        # Para cada participante (en participantes_lista), insertar en
        # ParticipantesActividad con el usuarioId resuelto desde el cache.
        for p in act.get("participantes_lista", []):
            iniciales = p["iniciales"]
            info = cache_iniciales.get(iniciales)
            usuario_id = info["usuarioId"] if info else None

            if not usuario_id:
                advertencias.append({
                    "tipo": "participante_sin_usuario",
                    "iniciales": iniciales,
                    "nombre": p.get("nombre", ""),
                    "actividad": act["descripcion"][:80],
                    "origen": info["origen"] if info else "NoEncontrado",
                })
                continue

            # Verificar si ya existe (idempotencia)
            existe = sesion.query(ParticipantesActividad).filter(
                ParticipantesActividad.actividadId == actividad_db.actividadId,
                ParticipantesActividad.usuarioId == usuario_id,
                ParticipantesActividad.tipoResponsabilidadId == tipo_resp.tipoResponsabilidadId,
            ).first()
            if existe:
                continue

            sesion.add(ParticipantesActividad(
                actividadId=actividad_db.actividadId,
                usuarioId=usuario_id,
                tipoResponsabilidadId=tipo_resp.tipoResponsabilidadId,
                creadoEn=ahora,
                usuarioAuditoriaId=usuario_actual.usuarioId,
                ultimaAuditoria=ahora,
            ))

    # Reportar también las iniciales completamente desconocidas (como GAS)
    for ini in datos.get("iniciales_desconocidas", []):
        advertencias.append({
            "tipo": "inicial_desconocida",
            "iniciales": ini,
            "mensaje": f"Las iniciales '{ini}' aparecen en el Excel pero no están "
                       "en la tabla de equipo. Verifique si es un miembro nuevo.",
        })

    return advertencias


# ============================================================================
# 3. CÓMO INTEGRARLO EN _persistir_datos_form05
# ============================================================================
# En tu router, al FINAL del bloque de Form-05 (antes del commit), agrega:

def _persistir_datos_form05_actualizado(
    sesion: Session,
    propuesta_id: int,
    datos: dict,
    usuario_actual,
):
    """
    Versión actualizada que devuelve también un reporte de advertencias
    sobre participantes no resueltos.
    """
    # ... (todo el código existente que ya tienes) ...

    # ====== NUEVO: construir cache de iniciales y persistir participantes ======
    equipo_map = datos.get("equipo_map", {})
    cache_iniciales = _construir_cache_iniciales(sesion, propuesta_id, equipo_map)
    advertencias = _persistir_participantes_actividad(
        sesion, propuesta_id, datos, usuario_actual, cache_iniciales
    )

    # Imprimir en logs
    for adv in advertencias:
        if adv["tipo"] == "inicial_desconocida":
            print(f"⚠️  {adv['mensaje']}")
        elif adv["tipo"] == "participante_sin_usuario":
            print(f"⚠️  Participante sin usuarioId: "
                  f"{adv['iniciales']} ({adv['nombre']}) en actividad '{adv['actividad']}'. "
                  f"Origen: {adv['origen']}")

    # El router puede devolver estas advertencias en la respuesta HTTP
    # para que el frontend las muestre al usuario.
    return advertencias
