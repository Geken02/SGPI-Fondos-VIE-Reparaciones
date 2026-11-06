class Settings:
    # Base de datos (conectada al contenedor Docker local)
    DATABASE_URL: str = "postgresql+psycopg://postgres:123456@localhost:5432/sgpi_db"
    
    # Seguridad JWT (Clave de prueba para el prototipo)
    SECRET_KEY: str = "1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS (Origen del frontend en desarrollo)
    FRONTEND_URL: str = "http://localhost:5173"

# Instancia única para importar en todo el proyecto
settings = Settings()