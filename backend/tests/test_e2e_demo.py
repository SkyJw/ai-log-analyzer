from pathlib import Path
from zipfile import ZipFile

from app.services.archive_service import ArchiveService
from app.services.boot_reconstruction_service import BootReconstructionService
from app.services.diagnosis_workflow import DiagnosisWorkflow
from app.services.playbook_service import PlaybookService
from app.services.segment_service import SegmentService
from app.services.whitelist_service import LogWhitelistService


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_DIR = PROJECT_ROOT / "backend" / "tests" / "fixtures" / "demo_logs" / "snapshot_0"
PLAYBOOK_DIR = PROJECT_ROOT / "configs" / "diagnosis_playbooks"
WHITELIST_DIR = PROJECT_ROOT / "configs" / "log_whitelist"


def build_demo_archive(tmp_path: Path) -> Path:
    archive_path = tmp_path / "demo_logs.zip"
    with ZipFile(archive_path, "w") as archive:
        for log_file in sorted(FIXTURE_DIR.glob("*.log")):
            archive.write(log_file, log_file.name)
    return archive_path


def test_demo_logs_cover_full_analysis_path(tmp_path: Path) -> None:
    assert FIXTURE_DIR.exists()

    archive_result = ArchiveService().inspect_and_extract(
        build_demo_archive(tmp_path),
        tmp_path / "extract",
    )
    whitelist = LogWhitelistService.from_directory(WHITELIST_DIR)
    segments_by_snapshot = {}
    classifications = []
    all_segments = []

    for snapshot in archive_result.snapshots:
        snapshot_segments = []
        for extracted_file in snapshot.extracted_files:
            classification = whitelist.classify_path(extracted_file.path)
            classifications.append(classification)
            file_segments = SegmentService().create_segments(extracted_file.path, classification.entry)
            snapshot_segments.extend(file_segments)
            all_segments.extend(file_segments)
        segments_by_snapshot[snapshot.snapshot_index] = snapshot_segments

    boot_sessions = BootReconstructionService().reconstruct(segments_by_snapshot)
    diagnosis_result = DiagnosisWorkflow(
        playbook_service=PlaybookService.from_directory(PLAYBOOK_DIR),
    ).run(
        question="升级后为什么没有正常启动？",
        segments=all_segments,
        boot_sessions=boot_sessions,
        classifications=classifications,
    )

    assert archive_result.package_type == "single_snapshot_archive"
    assert {classification.status for classification in classifications} == {"analyzed"}
    assert any("driver_probe" in segment.tags for segment in all_segments)
    assert any("reset" in segment.tags for segment in all_segments)
    assert boot_sessions[0].final_state == "abnormal"
    assert boot_sessions[0].reset_detected is True
    assert {"boot_region_abnormal", "driver_probe_failure"}.issubset(
        {finding.playbook_id for finding in diagnosis_result.findings}
    )
    assert diagnosis_result.final_answer
