"""Validated application configuration."""

import json
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jyotir"
    app_env: str = "development"
    database_url: str = ""
    astrology_api_key: str = ""
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-v4-flash"
    cors_origins: str = '["http://localhost:3000", "https://jyotir.builtbyanant.site"]'
    session_days: int = 30
    reading_limit_daily: int = 3
    chat_limit_hourly: int = 30
    location_limit_minute: int = 30
    generation_max_attempts: int = 3
    generation_lease_seconds: int = 240
    geocoding_base_url: str = "https://geocoding-api.open-meteo.com/v1"

    @property
    def cors_origins_list(self) -> list[str]:
        origins = json.loads(self.cors_origins)
        if not isinstance(origins, list):
            raise ValueError("CORS_ORIGINS must be a JSON list")
        return [str(origin) for origin in origins]

    @model_validator(mode="after")
    def validate_production(self):
        if self.app_env == "production":
            if not self.database_url:
                raise ValueError("DATABASE_URL is required in production")
            if not self.deepseek_api_key or not self.astrology_api_key:
                raise ValueError("Provider API keys are required in production")
            if "*" in self.cors_origins_list:
                raise ValueError("Wildcard CORS is forbidden in production")
        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
