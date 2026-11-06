# src/utils/s3_client.py
import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv

# 1. Forzar la carga del archivo .env (busca en el directorio actual y padres)
load_dotenv()

# 2. Leer variables de entorno
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_S3_ACCESS_KEY = os.getenv("SUPABASE_S3_ACCESS_KEY")
SUPABASE_S3_SECRET_KEY = os.getenv("SUPABASE_S3_SECRET_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "sgpi-propuestas")

# 3. Validación temprana para evitar errores crípticos de boto3
if not SUPABASE_URL:
    raise ValueError("❌ ERROR: La variable SUPABASE_URL no está definida en tu archivo .env")

# 4. Construir el endpoint correcto de Supabase
S3_ENDPOINT = f"{SUPABASE_URL}/storage/v1/s3"

# 5. Inicializar el cliente de boto3
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=SUPABASE_S3_ACCESS_KEY,
    aws_secret_access_key=SUPABASE_S3_SECRET_KEY,
    config=Config(signature_version='s3v4', region_name='auto') # 'auto' es requerido por Supabase
)

def obtener_url_documento(ruta_archivo: str) -> str:
    """Genera la URL pública del archivo en Supabase Storage."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{S3_BUCKET_NAME}/{ruta_archivo}"

def subir_archivo(ruta_local: str, ruta_s3: str, content_type: str = "application/octet-stream") -> str:
    """Sube un archivo local a Supabase Storage."""
    s3_client.upload_file(
        ruta_local,
        S3_BUCKET_NAME,
        ruta_s3,
        ExtraArgs={"ContentType": content_type}
    )
    return obtener_url_documento(ruta_s3)

def eliminar_archivo(ruta_s3: str) -> bool:
    """Elimina un archivo de Supabase Storage."""
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=ruta_s3)
        return True
    except Exception as e:
        print(f"Error eliminando archivo: {e}")
        return False