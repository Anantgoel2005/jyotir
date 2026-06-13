"""
Jyotir configuration — loaded from environment variables.
Sources: defaults < .env file < environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional
import json


class Settings(BaseSettings):
    # -- App --------------------------------------------------
    app_name: str = "Jyotir"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # -- Database ---------------------------------------------
    database_url: str = "postgresql+asyncpg://jyotir:jyotir@localhost:5432/jyotir"
    redis_url: str = "redis://localhost:6379/0"

    # -- Astrology API ----------------------------------------
    astrology_api_key: str = ""

    # -- LLM (DeepSeek) ---------------------------------------
    deepseek_api_key: str = ""

    # -- CORS -------------------------------------------------
    cors_origins: str = '["http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.cors_origins)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
