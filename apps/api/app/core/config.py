from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    database_url: str = "postgresql+asyncpg://trafscope:trafscope@localhost:5432/trafscope"
    redis_url: str = "redis://localhost:6379/0"
    encryption_key: str = "change-me"
    openai_api_key: str | None = None
    gsc_client_id: str | None = None
    gsc_client_secret: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()

