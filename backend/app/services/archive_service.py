from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from zipfile import BadZipFile, ZipFile


class UnsafeArchiveError(ValueError):
    pass


@dataclass(frozen=True)
class ExtractedArchiveFile:
    path: Path
    size_bytes: int


@dataclass(frozen=True)
class BootSnapshot:
    snapshot_index: int
    display_name: str
    archive_path: Path
    extracted_files: list[ExtractedArchiveFile] = field(default_factory=list)


@dataclass(frozen=True)
class ArchiveIntakeResult:
    package_type: str
    snapshots: list[BootSnapshot]
    extracted_files: list[ExtractedArchiveFile] = field(default_factory=list)


class ArchiveService:
    def __init__(self, max_total_size_bytes: int = 512 * 1024 * 1024) -> None:
        self.max_total_size_bytes = max_total_size_bytes

    def inspect_and_extract(self, archive_path: Path, destination: Path) -> ArchiveIntakeResult:
        destination.mkdir(parents=True, exist_ok=True)
        extracted_root = destination / "root"
        extracted_files = self._extract_zip(archive_path, extracted_root)

        numbered_inner_archives = self._find_numbered_inner_archives(extracted_root)
        if numbered_inner_archives:
            snapshots = [
                self._extract_inner_snapshot(index, inner_archive, destination / "snapshots")
                for index, inner_archive in sorted(numbered_inner_archives.items())
            ]
            return ArchiveIntakeResult(
                package_type="multi_snapshot_archive",
                snapshots=snapshots,
                extracted_files=extracted_files,
            )

        return ArchiveIntakeResult(
            package_type="single_snapshot_archive",
            snapshots=[
                BootSnapshot(
                    snapshot_index=0,
                    display_name=self._display_name(0),
                    archive_path=archive_path,
                    extracted_files=extracted_files,
                )
            ],
            extracted_files=extracted_files,
        )

    def _extract_inner_snapshot(
        self,
        snapshot_index: int,
        archive_path: Path,
        snapshots_root: Path,
    ) -> BootSnapshot:
        snapshot_destination = snapshots_root / str(snapshot_index)
        files = self._extract_zip(archive_path, snapshot_destination)
        return BootSnapshot(
            snapshot_index=snapshot_index,
            display_name=self._display_name(snapshot_index),
            archive_path=archive_path,
            extracted_files=files,
        )

    def _extract_zip(self, archive_path: Path, destination: Path) -> list[ExtractedArchiveFile]:
        try:
            with ZipFile(archive_path) as archive:
                members = archive.infolist()
                total_size = sum(member.file_size for member in members)
                if total_size > self.max_total_size_bytes:
                    raise UnsafeArchiveError("Archive exceeds configured uncompressed size limit")

                extracted: list[ExtractedArchiveFile] = []
                for member in members:
                    if member.is_dir():
                        continue

                    target = self._safe_target(destination, member.filename)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(member) as source, target.open("wb") as output:
                        output.write(source.read())
                    extracted.append(ExtractedArchiveFile(path=target, size_bytes=member.file_size))
                return extracted
        except BadZipFile as error:
            raise UnsafeArchiveError("Unsupported or corrupt zip archive") from error

    def _safe_target(self, destination: Path, member_name: str) -> Path:
        member_path = Path(member_name)
        if member_path.is_absolute() or ".." in member_path.parts:
            raise UnsafeArchiveError(f"Unsafe archive path: {member_name}")

        destination_root = destination.resolve()
        target = (destination / member_path).resolve()
        if not target.is_relative_to(destination_root):
            raise UnsafeArchiveError(f"Archive path escapes destination: {member_name}")
        return target

    def _find_numbered_inner_archives(self, root: Path) -> dict[int, Path]:
        inner_archives: dict[int, Path] = {}
        for path in root.rglob("*.zip"):
            match = re.search(r"(?:^|[^0-9])(\d+)$", path.stem)
            if match:
                inner_archives[int(match.group(1))] = path
        return inner_archives

    def _display_name(self, snapshot_index: int) -> str:
        return f"最近第 {snapshot_index + 1} 次启动"
