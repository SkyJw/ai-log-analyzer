from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Log Analyzer"
    database_url: str = "sqlite:///./data/ai_log_analyzer.db"
    storage_dir: Path = Path("./data/storage")
    model_provider: str = "fake"
    minimax_api_key: str | None = None
    minimax_base_url: str = "https://api.minimax.chat/v1"
    minimax_model: str = "MiniMax-M2.7"

    model_config = SettingsConfigDict(env_prefix="AI_LOG_ANALYZER_", env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
