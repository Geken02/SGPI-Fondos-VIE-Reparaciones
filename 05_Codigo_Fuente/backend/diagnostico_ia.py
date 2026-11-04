# diagnostico_ia.py
from src.utils.s3_client import s3_client, S3_BUCKET_NAME
from src.database import engine
from sqlalchemy import text
from docx import Document
import io

print("=" * 60)
print("DIAGNÓSTICO COMPLETO DEL FLUJO IA")
print("=" * 60)

# 1. Verificar archivos en SeaweedFS
print("\n1️⃣  Verificando archivos en SeaweedFS...")
try:
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix="propuestas/2/")
    archivos = response.get('Contents', [])
    
    if archivos:
        print(f"✅ Archivos encontrados:")
        for archivo in archivos:
            print(f"   - {archivo['Key']} ({archivo['Size']} bytes)")
    else:
        print("❌ No hay archivos en propuestas/2/")
except Exception as e:
    print(f"❌ Error: {e}")

# 2. Verificar ruta en base de datos
print("\n2️⃣  Verificando ruta en base de datos...")
try:
    query = "SELECT rutaArchivo, nombreArchivo FROM propuestadocumentos WHERE propuestaId = 2"
    with engine.connect() as conn:
        result = conn.execute(text(query)).fetchone()
    
    if result:
        print(f"✅ Ruta en BD: {result[0]}")
        print(f"   Nombre: {result[1]}")
    else:
        print("❌ No hay registros en propuesta_documentos para propuestaId=2")
except Exception as e:
    print(f"❌ Error: {e}")

# 3. Intentar descargar y extraer texto
print("\n3️⃣  Intentando descargar y extraer texto...")
try:
    ruta_archivo = "propuestas/2/Form-04.docx"
    response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=ruta_archivo)
    docx_bytes = response['Body'].read()
    
    print(f"✅ Archivo descargado: {len(docx_bytes)} bytes")
    
    # Extraer texto
    doc = Document(io.BytesIO(docx_bytes))
    texto = ""
    for para in doc.paragraphs:
        texto += para.text + "\n"
    
    print(f"✅ Texto extraído: {len(texto)} caracteres")
    print(f"\n📄 Primeros 500 caracteres:")
    print("-" * 60)
    print(texto[:500])
    print("-" * 60)
    
except Exception as e:
    print(f"❌ Error: {e}")

# 4. Verificar que Ollama esté corriendo
print("\n4️⃣  Verificando conexión con Ollama...")
import requests
try:
    response = requests.get("http://localhost:11434/api/tags", timeout=5)
    if response.status_code == 200:
        modelos = response.json().get("models", [])
        print(f"✅ Ollama está corriendo. Modelos disponibles:")
        for modelo in modelos:
            print(f"   - {modelo['name']}")
    else:
        print(f"❌ Ollama respondió con código {response.status_code}")
except Exception as e:
    print(f"❌ Error conectando con Ollama: {e}")

print("\n" + "=" * 60)
print("DIAGNÓSTICO COMPLETADO")
print("=" * 60)