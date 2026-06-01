from pathlib import Path

from app.services.segment_service import SegmentService
from app.services.whitelist_service import LogWhitelistService


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = PROJECT_ROOT / "configs" / "log_whitelist"


def test_whitelisted_file_is_classified_as_analyzed(tmp_path: Path) -> None:
    log_file = tmp_path / "kernel_history.log"
    log_file.write_text("Linux version 6.1\n", encoding="utf-8")

    classification = LogWhitelistService.from_directory(CONFIG_DIR).classify_path(log_file)

    assert classification.status == "analyzed"
    assert classification.entry is not None
    assert classification.entry.id == "kernel_history_log"
    assert classification.entry.scope_strategy == "multi_boot_split"


def test_unknown_file_is_classified_as_ignored(tmp_path: Path) -> None:
    log_file = tmp_path / "random.bin"
    log_file.write_bytes(b"\x00\x01")

    classification = LogWhitelistService.from_directory(CONFIG_DIR).classify_path(log_file)

    assert classification.status == "ignored"
    assert classification.entry is None


def test_multi_boot_split_creates_candidate_segments_with_boot_markers(tmp_path: Path) -> None:
    log_file = tmp_path / "kernel_history.log"
    log_file.write_text(
        "\n".join(
            [
                "noise before boot",
                "Linux version 6.1.0",
                "Kernel command line: root=/dev/mmcblk0p2",
                "driver foo probe failed with error -110",
                "watchdog reset detected",
                "Linux version 6.1.0",
                "Kernel command line: root=/dev/mmcblk0p3",
                "system booted",
            ]
        ),
        encoding="utf-8",
    )
    classification = LogWhitelistService.from_directory(CONFIG_DIR).classify_path(log_file)

    segments = SegmentService().create_segments(log_file, classification.entry)

    assert len(segments) == 2
    assert segments[0].source_type == "kernel"
    assert {"kernel", "reset", "driver_probe"}.issubset(set(segments[0].tags))
    assert "noise" in segments[1].tags
    assert segments[0].score > segments[1].score


def test_keyword_window_segments_include_context(tmp_path: Path) -> None:
    log_file = tmp_path / "kernel_history.log"
    log_file.write_text(
        "\n".join(
            [
                "Linux version 6.1.0",
                "line before",
                "probe failed with error -110",
                "line after",
            ]
        ),
        encoding="utf-8",
    )
    classification = LogWhitelistService.from_directory(CONFIG_DIR).classify_path(log_file)

    keyword_segments = SegmentService(keyword_context_lines=1).keyword_segments(
        log_file,
        classification.entry,
    )

    assert len(keyword_segments) == 1
    assert "line before" in keyword_segments[0].content
    assert "line after" in keyword_segments[0].content
