# test_s3.py
from src.utils.s3_client import s3_client, S3_BUCKET_NAME

try:
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME)
    print(f"Conexión exitosa. Archivos en el bucket: {response.get('KeyCount', 0)}")
    print(f"Bucket: {S3_BUCKET_NAME}")
except Exception as e:
    print(f"Error de conexión: {e}")