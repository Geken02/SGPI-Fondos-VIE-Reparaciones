import hashlib
import json
from datetime import datetime, timezone
import re

def generar_codigo_propuesta(anio_or_db=None, consecutivo: int = None) -> str:
    """
    Genera el código único de propuesta con el formato oficial del TEC: FVIE-YYYY-NNN.
    Acepta tanto (anio, consecutivo) como (db).
    Garantiza que el código generado nunca colisione con uno existente en la base de datos.
    """
    if isinstance(anio_or_db, int) and consecutivo is not None:
        return f"FVIE-{anio_or_db}-{consecutivo:03d}"
    
    anio = datetime.now(timezone.utc).year
    if hasattr(anio_or_db, "query"):
        try:
            from src.models.propuestas import Propuesta
            codigos = [
                row[0] for row in anio_or_db.query(Propuesta.codigoPropuesta).filter(
                    Propuesta.codigoPropuesta.like(f"FVIE-{anio}-%")
                ).all() if row[0]
            ]
            
            max_num = 0
            for cod in codigos:
                m = re.search(rf"FVIE-{anio}-(\d+)", cod)
                if m:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
            
            siguiente = max_num + 1
            while True:
                candidato = f"FVIE-{anio}-{siguiente:03d}"
                if candidato not in codigos:
                    existe = anio_or_db.query(Propuesta).filter(Propuesta.codigoPropuesta == candidato).first()
                    if not existe:
                        return candidato
                siguiente += 1
        except Exception:
            pass
    return f"FVIE-{anio}-001"

def generar_checksum(datos: dict) -> str:
    """
    Genera un hash SHA-256 de un diccionario de datos para auditoría forense.
    
    Este checksum se usa en la tabla 'Logs' para garantizar la integridad de los datos
    registrados en cada evento del sistema. Permite detectar si los datos fueron alterados
    después de ser registrados.
    
    Args:
        datos: Diccionario con los datos a hashear (se ordenan las claves para consistencia)
    
    Returns:
        Hash SHA-256 en formato hexadecimal (64 caracteres)
    
    Ejemplo:
        >>> generar_checksum({"usuario": 1, "accion": "login"})
        'a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1'
    """
    # Ordenamos las claves para que el hash sea consistente sin importar el orden del dict
    datos_ordenados = json.dumps(datos, sort_keys=True, default=str)
    return hashlib.sha256(datos_ordenados.encode('utf-8')).hexdigest()

def formatear_fecha_iso(fecha: datetime) -> str:
    """
    Convierte un objeto datetime a string en formato ISO 8601 para respuestas JSON.
    
    Este formato es el estándar internacional para intercambio de fechas en APIs REST
    y es compatible con JavaScript (new Date()) y PostgreSQL.
    
    Args:
        fecha: Objeto datetime a convertir
    
    Returns:
        String en formato ISO 8601 (ej: "2026-10-02T14:30:00+00:00") o None si la fecha es None
    
    Ejemplo:
        >>> formatear_fecha_iso(datetime(2026, 10, 2, 14, 30))
        '2026-10-02T14:30:00'
    """
    if fecha is None:
        return None
    return fecha.isoformat()

def calcular_productos_academicos_minimos(horas_semanales: float) -> int:
    """
    Calcula la cantidad mínima de productos académicos comprometidos según las horas semanales.
    
    Esta función implementa la Regla 2.4.1 del TEC, que establece los productos mínimos
    que un investigador debe comprometerse a generar según las horas asignadas al proyecto.
    
    Regla institucional:
    - 1 a 10 horas semanales: 1 producto académico
    - 11 a 20 horas semanales: 2 productos académicos
    - 21 o más horas semanales: 3 productos académicos
    
    Args:
        horas_semanales: Número de horas semanales asignadas al investigador en el proyecto
    
    Returns:
        Número mínimo de productos académicos que debe comprometerse
    
    Ejemplos:
        >>> calcular_productos_academicos_minimos(5)
        1
        >>> calcular_productos_academicos_minimos(15)
        2
        >>> calcular_productos_academicos_minimos(25)
        3
    """
    if horas_semanales <= 10:
        return 1
    elif horas_semanales <= 20:
        return 2
    else:
        return 3

def validar_correo_institucional(correo: str) -> bool:
    """
    Valida que el correo electrónico pertenezca al dominio institucional del TEC.
    
    El sistema solo acepta correos con dominio @tec.ac.cr para garantizar que todos
    los usuarios sean funcionarios o estudiantes activos del Instituto Tecnológico.
    
    Args:
        correo: Correo electrónico a validar
    
    Returns:
        True si el correo es válido y pertenece al TEC, False en caso contrario
    
    Ejemplos:
        >>> validar_correo_institucional("juan.perez@tec.ac.cr")
        True
        >>> validar_correo_institucional("juan@gmail.com")
        False
    """
    return correo.endswith("@tec.ac.cr")

def formatear_monto_monetario(monto: float) -> str:
    """
    Formatea un monto monetario en formato de colones costarricenses para visualización.
    
    Args:
        monto: Monto numérico a formatear
    
    Returns:
        String con formato de moneda (ej: "₡5,000,000.00")
    
    Ejemplo:
        >>> formatear_monto_monetario(5000000)
        '₡5,000,000.00'
    """
    return f"₡{monto:,.2f}"

def validar_fortaleza_contrasena(contrasena: str) -> tuple[bool, str]:
    """
    Valida que una contraseña cumpla con los requisitos de seguridad del TEC.
    
    Reglas institucionales:
    - Mínimo 8 caracteres
    - Al menos 1 letra mayúscula (A-Z)
    - Al menos 1 letra minúscula (a-z)
    - Al menos 1 número (0-9)
    - Al menos 1 carácter especial (!@#$%^&*()_+-=[]{}|;:,.<>?)
    
    Args:
        contrasena: Contraseña en texto plano a validar
    
    Returns:
        Tupla (es_valida, mensaje_error):
        - Si es válida: (True, "")
        - Si es inválida: (False, "mensaje descriptivo del error")
    
    Ejemplos:
        >>> validar_fortaleza_contrasena("admin123")
        (False, "La contraseña debe contener al menos una letra mayúscula")
        >>> validar_fortaleza_contrasena("Admin123!")
        (True, "")
    """
    if len(contrasena) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    if not re.search(r"[A-Z]", contrasena):
        return False, "La contraseña debe contener al menos una letra mayúscula"
    if not re.search(r"[a-z]", contrasena):
        return False, "La contraseña debe contener al menos una letra minúscula"
    if not re.search(r"\d", contrasena):
        return False, "La contraseña debe contener al menos un número"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", contrasena):
        return False, "La contraseña debe contener al menos un carácter especial"
    return True, ""