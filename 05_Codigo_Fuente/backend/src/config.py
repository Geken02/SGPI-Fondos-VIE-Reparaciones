# src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # El valor por defecto es local, pero el .env lo sobrescribirá
    DATABASE_URL: str = "postgresql+psycopg://postgres:123456@localhost:5432/sgpi_db"
    
    SECRET_KEY: str = "clave_secreta_super_larga_para_desarrollo_local_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    FRONTEND_URL: str = "http://localhost:5173"
    
    SUPABASE_URL: str = ""
    SUPABASE_S3_ACCESS_KEY: str = ""
    SUPABASE_S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "sgpi-propuestas"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()