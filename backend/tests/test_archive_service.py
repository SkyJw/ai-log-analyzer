from pathlib import Path
from zipfile import ZipFile

import pytest

from app.services.archive_service import ArchiveUnsafePathError, analyze_archive


def _write_zip(path: Path, files: dict[str, str | bytes]) -> None:
    with ZipFile(path, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def test_multi_snapshot_archive_detects_inner_suffixes_and_orders_them(tmp_path: Path) -> None:
    inner_archives: dict[str, bytes] = {}
    for index in [2, 0, 1]:
        inner_path = tmp_path / f"snapshot_{index}.zip"
        _write_zip(inner_path, {f"boot-{index}.log": f"boot {index}"})
        inner_archives[f"snapshots/snapshot_{index}.zip"] = inner_path.read_bytes()

    outer_path = tmp_path / "startup.zip"
    _write_zip(outer_path, inner_archives)

    result = analyze_archive(outer_path, tmp_path / "extract")

    assert result.archive_type == "multi_snapshot_archive"
    assert [snapshot.snapshot_index for snapshot in result.snapshots] == [0, 1, 2]
    assert [snapshot.display_name for snapshot in result.snapshots] == [
        "最近第 1 次启动",
        "最近第 2 次启动",
        "最近第 3 次启动",
    ]
    assert [snapshot.archive_path.name for snapshot in result.snapshots] == [
        "snapshot_0.zip",
        "snapshot_1.zip",
        "snapshot_2.zip",
    ]
    assert [file.name for file in result.snapshots[0].extracted_files] == ["boot-0.log"]


def test_single_snapshot_archive_direct_logs_use_snapshot_index_zero(tmp_path: Path) -> None:
    archive_path = tmp_path / "current_boot.zip"
    _write_zip(archive_path, {"logs/boot.log": "kernel boot", "startup.log": "userspace"})

    result = analyze_archive(archive_path, tmp_path / "extract")

    assert result.archive_type == "single_snapshot_archive"
    assert len(result.snapshots) == 1
    snapshot = result.snapshots[0]
    assert snapshot.snapshot_index == 0
    assert snapshot.display_name == "最近第 1 次启动"
    assert snapshot.archive_path is None
    assert {file.name for file in snapshot.extracted_files} == {"boot.log", "startup.log"}


def test_unsafe_paths_are_rejected(tmp_path: Path) -> None:
    archive_path = tmp_path / "unsafe.zip"
    _write_zip(archive_path, {"../evil.log": "owned"})

    with pytest.raises(ArchiveUnsafePathError):
        analyze_archive(archive_path, tmp_path / "extract")
