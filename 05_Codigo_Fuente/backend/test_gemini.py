import requests
import json

print("="*70)
print("🧪 PRUEBA LOCAL DE CLOUDFLARE WORKERS AI (100% Gratis, Sin Tarjeta)")
print("="*70)

account_id = input("\n1. Pega tu Account ID de Cloudflare: ").strip()
api_token = input("2. Pega tu API Token de Cloudflare: ").strip()

if not account_id or not api_token:
    print("❌ Faltan datos.")
    exit()

# Modelo gratuito de Cloudflare (Llama 3 8B)
model = "@cf/meta/llama-3.1-8b-instruct"
url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"

headers = {
    "Authorization": f"Bearer {api_token}",
    "Content-Type": "application/json"
}

payload = {
    "messages": [
        {"role": "system", "content": "Responde ÚNICAMENTE con este JSON: {\"estado\": \"FUNCIONA\"}"},
        {"role": "user", "content": "Hola"}
    ]
}

print(f"\n🔍 Probando conexión con Cloudflare...")
print("⏳ Enviando petición...")

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            contenido = data["result"]["response"]
            print("\n" + "="*70)
            print("🎉 ¡ÉXITO TOTAL!")
            print("="*70)
            print(f"✅ Cloudflare AI funciona correctamente.")
            print(f"✅ Respuesta: {contenido.strip()}")
            print("\n👉 INSTRUCCIONES PARA RENDER:")
            print(f"   1. Agrega variable: CF_ACCOUNT_ID = {account_id}")
            print(f"   2. Agrega variable: CF_API_TOKEN = {api_token[:15]}...")
            print("="*70)
        else:
            print(f"\n❌ Error de Cloudflare: {data.get('errors')}")
    else:
        print(f"\n❌ ERROR HTTP {response.status_code}:")
        print(response.text)
        
except Exception as e:
    print(f"\n❌ Error de red: {e}")