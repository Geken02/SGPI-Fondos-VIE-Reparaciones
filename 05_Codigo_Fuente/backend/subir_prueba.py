# subir_archivo_real.py
import boto3
import os

# Configuración directa de SeaweedFS
S3_ENDPOINT = "http://localhost:8333"
S3_ACCESS_KEY = "any"
S3_SECRET_KEY = "any"
S3_BUCKET_NAME = "sgpi-propuestas"

s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

# 1. Crear un archivo PDF dummy válido mínimamente
nombre_local = "prueba.pdf"
with open(nombre_local, "wb") as f:
    f.write(b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000178 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n284\n%%EOF")

# 2. La ruta EXACTA que la base de datos está buscando
ruta_en_s3 = "propuestas/2/Form-04.pdf"

print(f"Subiendo a: {S3_BUCKET_NAME}/{ruta_en_s3} ...")

try:
    s3_client.upload_file(
        nombre_local,
        S3_BUCKET_NAME,
        ruta_en_s3,
        ExtraArgs={"ContentType": "application/pdf"}
    )
    print(f"✅ ¡Éxito! El archivo ahora existe en SeaweedFS.")
    print(f"🔗 URL: {S3_ENDPOINT}/{S3_BUCKET_NAME}/{ruta_en_s3}")
    
    # Limpiar archivo local
    os.remove(nombre_local)
except Exception as e:
    print(f"❌ Error al subir: {e}")