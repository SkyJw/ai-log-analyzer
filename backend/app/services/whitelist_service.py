from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass(frozen=True)
class LogWhitelistEntry:
    id: str
    name: str
    path_patterns: list[str]
    source_type: str
    parser: str
    scope_strategy: str
    boot_split_markers: list[str] = field(default_factory=list)
    max_boot_sessions: int = 1
    max_size_mb: int = 20
    extractors: list[str] = field(default_factory=list)
    related_playbooks: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class FileClassification:
    path: Path
    status: str
    entry: LogWhitelistEntry | None = None
    reason: str | None = None


class LogWhitelistService:
    def __init__(self, entries: list[LogWhitelistEntry]) -> None:
        self.entries = entries

    @classmethod
    def from_directory(cls, config_dir: Path) -> "LogWhitelistService":
        entries = [
            cls._load_entry(path)
            for path in sorted(config_dir.glob("*.yaml"))
        ]
        return cls(entries)

    @staticmethod
    def _load_entry(path: Path) -> LogWhitelistEntry:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        return LogWhitelistEntry(
            id=raw["id"],
            name=raw["name"],
            path_patterns=list(raw.get("path_patterns", [])),
            source_type=raw["source_type"],
            parser=raw["parser"],
            scope_strategy=raw["scope_strategy"],
            boot_split_markers=list(raw.get("boot_split_markers", [])),
            max_boot_sessions=int(raw.get("max_boot_sessions", 1)),
            max_size_mb=int(raw.get("max_size_mb", 20)),
            extractors=list(raw.get("extractors", [])),
            related_playbooks=list(raw.get("related_playbooks", [])),
        )

    def classify_path(self, path: Path) -> FileClassification:
        normalized = path.as_posix()
        for entry in self.entries:
            if any(self._matches(normalized, path.name, pattern) for pattern in entry.path_patterns):
                if path.exists() and path.stat().st_size > entry.max_size_mb * 1024 * 1024:
                    return FileClassification(path=path, status="ignored", reason="file_too_large")
                return FileClassification(path=path, status="analyzed", entry=entry)

        return FileClassification(path=path, status="ignored", reason="not_in_whitelist")

    def classify_paths(self, paths: list[Path]) -> list[FileClassification]:
        return [self.classify_path(path) for path in paths]

    def _matches(self, normalized_path: str, file_name: str, pattern: str) -> bool:
        return fnmatch.fnmatch(normalized_path, pattern) or fnmatch.fnmatch(file_name, pattern)
