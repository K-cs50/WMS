# pyrefly: ignore[missing-import]
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SECRET_KEY: str = "wms-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite+aiosqlite:///./wms.db"
    GEMINI_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    APP_ENV: str = "development"

    @property
    def cors_origins_list(self):
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
