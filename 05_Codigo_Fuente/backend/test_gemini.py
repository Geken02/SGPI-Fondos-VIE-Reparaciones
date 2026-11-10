import requests
import json
import re

print("="*70)
print(" PRUEBA LOCAL DE HUGGING FACE API (Gratis + Cloud)")
print("="*70)

api_token = input("\n1. Pega tu API Token de Hugging Face (debe empezar con 'hf_'): ").strip()

if not api_token:
    print("❌ No se proporcionó token.")
    exit()

if not api_token.startswith("hf_"):
    print("️ ADVERTENCIA: El token debería empezar con 'hf_'. ¿Estás seguro de que es correcto?")
    continuar = input("¿Deseas continuar de todos modos? (s/n): ")
    if continuar.lower() != 's':
        exit()

# Configuración
model = "mistralai/Mistral-7B-Instruct-v0.2"
api_url = f"https://api-inference.huggingface.co/models/{model}"
headers = {
    "Authorization": f"Bearer {api_token}",
    "Content-Type": "application/json"
}

print(f"\n🔍 Probando conexión con: {model}")
print("⏳ Enviando petición (la primera vez puede tardar 20-30 segundos)...")

# Prompt de prueba simple
prompt = "<s>[INST] Responde ÚNICAMENTE con este JSON: {\"estado\": \"FUNCIONA\"} [/INST]"

payload = {
    "inputs": prompt,
    "parameters": {
        "temperature": 0.1,
        "max_new_tokens": 50,
        "return_full_text": False
    }
}

try:
    response = requests.post(api_url, headers=headers, json=payload, timeout=60)
    
    if response.status_code == 503:
        print("\n⏳ El modelo se está cargando en los servidores de Hugging Face.")
        print("   Esto es normal la primera vez. Espera 30 segundos y vuelve a ejecutar el script.")
        exit()
    
    if response.status_code != 200:
        print(f"\n❌ ERROR de API (Código {response.status_code}):")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2))
        except:
            print(response.text)
        exit()
    
    # Procesar respuesta
    data = response.json()
    
    if isinstance(data, list) and "generated_text" in data[0]:
        texto_generado = data[0]["generated_text"]
        print(f"\n✅ ¡Respuesta recibida!")
        print(f"📝 Texto generado: {texto_generado.strip()}")
        
        # Intentar extraer y validar JSON
        try:
            # Buscar patrón JSON en la respuesta
            match = re.search(r'\{[^}]*\}', texto_generado)
            if match:
                json_str = match.group(0)
                json_validado = json.loads(json_str)
                
                print("\n" + "="*70)
                print(" ¡ÉXITO TOTAL!")
                print("="*70)
                print(f"✅ Hugging Face API funciona correctamente.")
                print(f"✅ JSON válido extraído: {json.dumps(json_validado)}")
                print("\n👉 INSTRUCCIONES PARA RENDER:")
                print(f"   1. Ve a Render → Environment Variables")
                print(f"   2. Agrega: HF_API_TOKEN = {api_token[:10]}...")
                print(f"   3. En tu ia_service.py, usa el modelo:")
                print(f'      MODELO_ACTIVO = "{model}"')
                print("="*70)
            else:
                print("\n⚠️ La respuesta no contiene un JSON claro, pero la API respondió.")
                print("   Esto puede ser normal. El parser del código principal es más robusto.")
                
        except json.JSONDecodeError:
            print("\n⚠️ La API respondió, pero el texto no es JSON válido.")
            print("   Esto puede pasar si el modelo no siguió bien las instrucciones.")
            print("   El código principal tiene un parser más robusto para manejar esto.")
    else:
        print(f"\n❌ Respuesta inesperada de la API:")
        print(json.dumps(data, indent=2))
        
except requests.exceptions.Timeout:
    print("\n❌ Timeout: La petición tardó más de 60 segundos.")
    print("   Esto puede pasar si Hugging Face está cargando el modelo.")
    print("   Espera unos minutos y vuelve a intentar.")
except Exception as e:
    print(f"\n❌ Error inesperado: {e}")