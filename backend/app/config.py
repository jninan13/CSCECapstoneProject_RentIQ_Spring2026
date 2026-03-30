"""
Configuration settings for the application.
Uses Pydantic settings for type validation and env var management.
"""
import json
import os
from pydantic_settings import BaseSettings
from typing import Optional


def get_allowed_origins():
    """Read ALLOWED_ORIGINS from env var (JSON list) or use defaults for local dev."""
    env_origins = os.environ.get("ALLOWED_ORIGINS")
    if env_origins:
        return json.loads(env_origins)
    return [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
    ]


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RentIQ API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/property_finder"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    
    # Maps
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    
    # CORS - reads from ALLOWED_ORIGINS env var in production,
    # falls back to localhost for local dev
    ALLOWED_ORIGINS: list = get_allowed_origins()
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
