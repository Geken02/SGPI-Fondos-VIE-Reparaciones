# crear_bucket.py
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://localhost:8333',
    aws_access_key_id='any',
    aws_secret_access_key='any'
)

try:
    s3.create_bucket(Bucket='sgpi-propuestas')
    print("Bucket 'sgpi-propuestas' creado.")
except Exception as e:
    print(f"ℹ{e}")