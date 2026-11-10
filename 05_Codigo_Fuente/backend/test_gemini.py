import requests
import json

print("="*60)
print("🧪 PRUEBA DIRECTA DE API DE GEMINI (v3 - Anti-Timeout)")
print("="*60)

api_key = input("\n1. Pega tu API Key de Google AI Studio: ").strip()
if not api_key:
    print("❌ No se proporcionó clave.")
    exit()

base_url = "https://generativelanguage.googleapis.com/v1beta"

# Lista de modelos a probar en orden de preferencia
modelos_a_probar = ["gemini-3.8-flash", "gemini-1.5-flash", "gemini-flash-latest"]

print("\n🔍 Probando generación de contenido (esto puede tardar unos segundos)...")

for modelo in modelos_a_probar:
    print(f"🔄 Intentando con: {modelo} ...")
    generate_url = f"{base_url}/models/{modelo}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": "Responde ÚNICAMENTE con la palabra: FUNCIONA"}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        # Aumentamos el timeout a 60 segundos para evitar cortes por lentitud de red
        gen_response = requests.post(generate_url, json=payload, headers=headers, timeout=60)
        
        if gen_response.status_code == 200:
            resultado = gen_response.json()
            texto = resultado["candidates"][0]["content"]["parts"][0]["text"]
            print(f"\n🎉 ¡ÉXITO TOTAL con el modelo: {modelo}!")
            print(f"✅ La IA respondió: {texto.strip()}")
            print(f"👉 INSTRUCCIÓN: Usa '{modelo}' en tu archivo ia_service.py")
            exit() # Salimos del script porque ya funcionó
        else:
            print(f"   ⚠️ Falló con código {gen_response.status_code}: {gen_response.text[:100]}")
            
    except requests.exceptions.ReadTimeout:
        print(f"   ⏱️ Timeout (la red tardó mucho). Probando siguiente modelo...")
    except Exception as e:
        print(f"   ❌ Error de red: {e}")

print("\n❌ Ningún modelo respondió a tiempo. Revisa tu conexión a internet, VPN o Firewall.")