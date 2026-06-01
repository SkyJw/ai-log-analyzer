from pathlib import Path
from zipfile import ZipFile

import pytest

from app.services.archive_service import ArchiveService, UnsafeArchiveError


def write_zip(path: Path, files: dict[str, str | bytes]) -> None:
    with ZipFile(path, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def build_inner_snapshot(path: Path, file_name: str, content: str) -> bytes:
    with ZipFile(path, "w") as archive:
        archive.writestr(file_name, content)
    return path.read_bytes()


def test_multi_snapshot_archive_detects_numbered_inner_archives(tmp_path: Path) -> None:
    snapshot_0 = build_inner_snapshot(tmp_path / "snapshot_0.zip", "boot.log", "U-Boot")
    snapshot_1 = build_inner_snapshot(tmp_path / "snapshot_1.zip", "kernel.log", "Linux version")
    snapshot_2 = build_inner_snapshot(tmp_path / "snapshot_2.zip", "startup.log", "service ok")
    upload = tmp_path / "upload.zip"
    write_zip(
        upload,
        {
            "board_logs_2.zip": snapshot_2,
            "board_logs_0.zip": snapshot_0,
            "board_logs_1.zip": snapshot_1,
        },
    )

    result = ArchiveService().inspect_and_extract(upload, tmp_path / "extract")

    assert result.package_type == "multi_snapshot_archive"
    assert [snapshot.snapshot_index for snapshot in result.snapshots] == [0, 1, 2]
    assert result.snapshots[0].display_name == "最近第 1 次启动"
    assert any(file.path.name == "boot.log" for file in result.snapshots[0].extracted_files)


def test_single_snapshot_archive_is_snapshot_zero(tmp_path: Path) -> None:
    upload = tmp_path / "single.zip"
    write_zip(upload, {"boot.log": "U-Boot", "kernel.log": "Linux version"})

    result = ArchiveService().inspect_and_extract(upload, tmp_path / "extract")

    assert result.package_type == "single_snapshot_archive"
    assert len(result.snapshots) == 1
    assert result.snapshots[0].snapshot_index == 0
    assert {file.path.name for file in result.snapshots[0].extracted_files} == {
        "boot.log",
        "kernel.log",
    }


def test_unsafe_archive_paths_are_rejected(tmp_path: Path) -> None:
    upload = tmp_path / "unsafe.zip"
    write_zip(upload, {"../evil.log": "escape"})

    with pytest.raises(UnsafeArchiveError):
        ArchiveService().inspect_and_extract(upload, tmp_path / "extract")


def test_archive_total_uncompressed_size_limit_is_enforced(tmp_path: Path) -> None:
    upload = tmp_path / "too-large.zip"
    write_zip(upload, {"large.log": b"x" * 32})

    with pytest.raises(UnsafeArchiveError):
        ArchiveService(max_total_size_bytes=16).inspect_and_extract(upload, tmp_path / "extract")
