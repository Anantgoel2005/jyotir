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
    # LLM Provider Configuration (defaults to Groq)
    groq_api_key: str = ""
    llm_api_key: str = ""
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"
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
    def active_llm_api_key(self) -> str:
        return self.groq_api_key or self.llm_api_key or self.deepseek_api_key

    @property
    def active_llm_base_url(self) -> str:
        if self.groq_api_key:
            return "https://api.groq.com/openai/v1"
        if self.llm_base_url and self.llm_base_url != "https://api.groq.com/openai/v1":
            return self.llm_base_url
        if self.deepseek_api_key and not self.groq_api_key and not self.llm_api_key:
            return "https://api.deepseek.com"
        return self.llm_base_url or "https://api.groq.com/openai/v1"

    @property
    def active_llm_model(self) -> str:
        if self.groq_api_key or self.llm_api_key:
            return self.llm_model or "llama-3.3-70b-versatile"
        if self.deepseek_api_key:
            return self.deepseek_model or "deepseek-v4-flash"
        return self.llm_model or "llama-3.3-70b-versatile"

    @property
    def cors_origins_list(self) -> list[str]:
        origins = json.loads(self.cors_origins)
        if not isinstance(origins, list):
            raise ValueError("CORS_ORIGINS must be a JSON list")
        return [str(origin) for origin in origins]

    @model_validator(mode="after")
    def validate_production(self):
        if self.app_env == "production":
            if not self.active_llm_api_key or not self.astrology_api_key:
                raise ValueError("Provider API keys (ASTROLOGY_API_KEY and GROQ_API_KEY / LLM_API_KEY) are required in production")
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
