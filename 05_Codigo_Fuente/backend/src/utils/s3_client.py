# src/utils/s3_client.py
import boto3
from botocore.config import Config
import os

# Obtener variables de entorno (con valores por defecto para desarrollo local si fallan)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tu-proyecto.supabase.co")
SUPABASE_S3_ACCESS_KEY = os.getenv("any")
SUPABASE_S3_SECRET_KEY = os.getenv("any")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "sgpi-propuestas")

# El endpoint de S3 de Supabase siempre tiene este formato:
S3_ENDPOINT = f"{SUPABASE_URL}/storage/v1/s3"

# Cliente S3 configurado para Supabase
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=SUPABASE_S3_ACCESS_KEY,
    aws_secret_access_key=SUPABASE_S3_SECRET_KEY,
    config=Config(signature_version='s3v4', region_name='auto')
)

def obtener_url_documento(ruta_archivo: str) -> str:
    # Supabase usa una URL pública diferente para descargar, o podemos generar una URL firmada
    # Por simplicidad, usamos la URL pública si el bucket lo permite, o la ruta relativa
    return f"{SUPABASE_URL}/storage/v1/object/public/{S3_BUCKET_NAME}/{ruta_archivo}"

def subir_archivo(ruta_local: str, ruta_s3: str, content_type: str = "application/octet-stream") -> str:
    s3_client.upload_file(
        ruta_local,
        S3_BUCKET_NAME,
        ruta_s3,
        ExtraArgs={"ContentType": content_type}
    )
    return obtener_url_documento(ruta_s3)

def eliminar_archivo(ruta_s3: str) -> bool:
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=ruta_s3)
        return True
    except Exception as e:
        print(f"Error eliminando archivo: {e}")
        return False