# src/utils/s3_client.py
import boto3
from botocore.config import Config

# Configuración de SeaweedFS local
S3_ENDPOINT = "http://localhost:8333"
S3_ACCESS_KEY = "any"
S3_SECRET_KEY = "any"
S3_BUCKET_NAME = "sgpi-propuestas"

# Cliente S3
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    config=Config(signature_version='s3v4')
)


def obtener_url_documento(ruta_archivo: str) -> str:
    return f"{S3_ENDPOINT}/{S3_BUCKET_NAME}/{ruta_archivo}"


def subir_archivo(ruta_local: str, ruta_s3: str, content_type: str = "application/pdf") -> str:
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