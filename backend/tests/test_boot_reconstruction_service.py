from pathlib import Path

from app.services.boot_reconstruction_service import BootReconstructionService
from app.services.segment_service import CandidateSegment


def segment(
    snapshot: int,
    source_type: str,
    content: str,
    tags: list[str],
    score: int = 0,
) -> CandidateSegment:
    return CandidateSegment(
        segment_id=f"s{snapshot}-{source_type}",
        source_file=Path(f"{source_type}.log"),
        source_type=source_type,
        content=content,
        line_start=1,
        line_end=1,
        tags=tags,
        score=score,
    )


def test_snapshot_indexes_are_displayed_as_recent_boot_order() -> None:
    sessions = BootReconstructionService().reconstruct(
        {
            1: [segment(1, "kernel", "Linux version", ["kernel"])],
            0: [segment(0, "bootloader", "U-Boot", ["bootloader"])],
        }
    )

    assert [session.display_name for session in sessions] == [
        "最近第 1 次启动",
        "最近第 2 次启动",
    ]


def test_kernel_reset_segment_marks_reset_and_abnormal_stage() -> None:
    sessions = BootReconstructionService().reconstruct(
        {
            0: [
                segment(
                    0,
                    "kernel",
                    "watchdog reset detected before userspace",
                    ["kernel", "reset"],
                    score=10,
                )
            ]
        }
    )

    assert sessions[0].reset_detected is True
    assert sessions[0].final_state == "abnormal"
    assert sessions[0].abnormal_stage == "kernel"
    assert sessions[0].strong_evidence == ["kernel.log:1-1"]


def test_missing_userspace_without_error_is_unknown_with_missing_information() -> None:
    sessions = BootReconstructionService().reconstruct(
        {
            0: [
                segment(0, "bootloader", "U-Boot started", ["bootloader"]),
                segment(0, "kernel", "Linux version", ["kernel"]),
            ]
        }
    )

    assert sessions[0].final_state == "unknown"
    assert "userspace evidence" in sessions[0].missing_information


def test_userspace_and_board_service_evidence_marks_success() -> None:
    sessions = BootReconstructionService().reconstruct(
        {
            0: [
                segment(0, "kernel", "Linux version", ["kernel"]),
                segment(0, "userspace", "systemd started", ["userspace"]),
                segment(0, "board_service", "board service ready", ["board_service"]),
            ]
        }
    )

    assert sessions[0].final_state == "success"
    assert sessions[0].confidence == "medium"
