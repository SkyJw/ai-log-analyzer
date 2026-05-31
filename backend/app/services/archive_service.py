from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
from zipfile import ZipFile


DEFAULT_MAX_EXTRACT_BYTES = 512 * 1024 * 1024
_SNAPSHOT_SUFFIX_RE = re.compile(r"(\d+)$")


class ArchiveServiceError(Exception):
    """Base error for archive intake failures."""


class ArchiveUnsupportedError(ArchiveServiceError):
    """Raised when the uploaded archive format is not supported."""


class ArchiveUnsafePathError(ArchiveServiceError):
    """Raised when an archive member would escape the extraction directory."""


class ArchiveSizeLimitError(ArchiveServiceError):
    """Raised when extracted content exceeds the configured size limit."""


@dataclass(frozen=True)
class SnapshotMetadata:
    snapshot_index: int
    display_name: str
    extracted_files: list[Path]
    archive_path: Path | None = None
    source_path: Path | None = None


@dataclass(frozen=True)
class ArchiveIntakeResult:
    archive_type: str
    snapshots: list[SnapshotMetadata]
    source_path: Path
    extracted_root: Path


def analyze_archive(
    archive_path: Path | str,
    extraction_root: Path | str,
    *,
    max_extract_bytes: int = DEFAULT_MAX_EXTRACT_BYTES,
) -> ArchiveIntakeResult:
    source_path = Path(archive_path)
    extracted_root = Path(extraction_root)
    if not _is_zip_archive(source_path):
        raise ArchiveUnsupportedError(f"Unsupported archive format: {source_path.name}")

    if extracted_root.exists():
        shutil.rmtree(extracted_root)
    extracted_root.mkdir(parents=True, exist_ok=True)

    budget = _ExtractionBudget(max_extract_bytes)
    outer_root = extracted_root / "source"
    outer_files = _extract_zip(source_path, outer_root, budget)
    numbered_archives = sorted(
        (
            (snapshot_index, inner_archive)
            for inner_archive in outer_files
            if _is_zip_archive(inner_archive)
            for snapshot_index in [_snapshot_index_from_name(inner_archive)]
            if snapshot_index is not None
        ),
        key=lambda item: item[0],
    )

    if numbered_archives:
        snapshots = [
            _extract_inner_snapshot(snapshot_index, inner_archive, extracted_root, budget)
            for snapshot_index, inner_archive in numbered_archives
        ]
        return ArchiveIntakeResult(
            archive_type="multi_snapshot_archive",
            snapshots=snapshots,
            source_path=source_path,
            extracted_root=extracted_root,
        )

    return ArchiveIntakeResult(
        archive_type="single_snapshot_archive",
        snapshots=[
            SnapshotMetadata(
                snapshot_index=0,
                display_name=_display_name(0),
                extracted_files=outer_files,
                source_path=source_path,
            )
        ],
        source_path=source_path,
        extracted_root=extracted_root,
    )


@dataclass
class _ExtractionBudget:
    remaining_bytes: int

    def consume(self, file_size: int) -> None:
        if file_size > self.remaining_bytes:
            raise ArchiveSizeLimitError("Archive extracted size exceeds configured limit")
        self.remaining_bytes -= file_size


def _extract_inner_snapshot(
    snapshot_index: int,
    archive_path: Path,
    extracted_root: Path,
    budget: _ExtractionBudget,
) -> SnapshotMetadata:
    snapshot_root = extracted_root / f"snapshot_{snapshot_index}"
    extracted_files = _extract_zip(archive_path, snapshot_root, budget)
    return SnapshotMetadata(
        snapshot_index=snapshot_index,
        display_name=_display_name(snapshot_index),
        extracted_files=extracted_files,
        archive_path=archive_path,
        source_path=archive_path,
    )


def _extract_zip(archive_path: Path, destination: Path, budget: _ExtractionBudget) -> list[Path]:
    destination.mkdir(parents=True, exist_ok=True)
    extracted_files: list[Path] = []
    with ZipFile(archive_path) as archive:
        for member in archive.infolist():
            target_path = _safe_member_path(destination, member.filename)
            if member.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue
            if _is_zip_symlink(member.external_attr):
                raise ArchiveUnsafePathError(f"Unsafe archive member: {member.filename}")

            budget.consume(member.file_size)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target_path.open("wb") as target:
                shutil.copyfileobj(source, target)
            extracted_files.append(target_path)
    return extracted_files


def _safe_member_path(destination: Path, member_name: str) -> Path:
    normalized_name = member_name.replace("\\", "/")
    member_path = PurePosixPath(normalized_name)
    if (
        not normalized_name
        or member_path.is_absolute()
        or any(part in {"", ".", ".."} for part in member_path.parts)
        or ":" in member_path.parts[0]
    ):
        raise ArchiveUnsafePathError(f"Unsafe archive member: {member_name}")

    destination_root = destination.resolve()
    target_path = (destination / Path(*member_path.parts)).resolve()
    if not target_path.is_relative_to(destination_root):
        raise ArchiveUnsafePathError(f"Unsafe archive member: {member_name}")
    return target_path


def _snapshot_index_from_name(path: Path) -> int | None:
    match = _SNAPSHOT_SUFFIX_RE.search(path.stem)
    if match is None:
        return None
    return int(match.group(1))


def _display_name(snapshot_index: int) -> str:
    return f"最近第 {snapshot_index + 1} 次启动"


def _is_zip_archive(path: Path) -> bool:
    return path.suffix.lower() == ".zip"


def _is_zip_symlink(external_attr: int) -> bool:
    unix_mode = (external_attr >> 16) & 0o777777
    return stat.S_ISLNK(unix_mode)
