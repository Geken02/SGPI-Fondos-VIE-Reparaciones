import socket

host = "db.uuhejjfivuwphsahpqhf.supabase.co"
try:
    ip = socket.gethostbyname(host)
    print(f"✅ ÉXITO: Tu PC puede ver a Supabase. La IP es: {ip}")
except socket.gaierror as e:
    print(f"❌ FALLO DE DNS: Tu PC no puede resolver el dominio. Error: {e}")