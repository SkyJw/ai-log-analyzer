from pathlib import Path

from app.core.config import get_settings


def get_storage_dir() -> Path:
    storage_dir = get_settings().storage_dir
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir
