from sqlalchemy import create_engine, inspect

from app.models.db import Base
from app.models.schemas import (
    AnalysisTaskCreate,
    ApprovedCaseView,
    BootSessionView,
    DiagnosisFindingView,
    EvidenceSnippetView,
    FollowUpQuestionCreate,
)


def test_analysis_task_create_requires_question() -> None:
    task = AnalysisTaskCreate(question="升级后没有从预期启动区启动")

    assert task.question == "升级后没有从预期启动区启动"


def test_boot_session_view_contains_evidence() -> None:
    session = BootSessionView(
        session_id="s0",
        snapshot_index=0,
        display_name="最近第 1 次启动",
        final_state="abnormal",
        abnormal_stage="kernel",
        reset_detected=True,
        confidence="medium",
        evidence_files=["boot.log"],
    )

    assert session.snapshot_index == 0
    assert session.evidence_files == ["boot.log"]


def test_diagnosis_and_evidence_views_preserve_traceability() -> None:
    evidence = EvidenceSnippetView(
        snippet_id="e1",
        source_file="kernel.log",
        boot_session_id="s0",
        content="watchdog reset detected",
        strength="strong",
        line_start=120,
        line_end=122,
    )
    finding = DiagnosisFindingView(
        finding_id="f1",
        playbook_id="driver_probe_failure",
        related_boot_session_id="s0",
        title="Kernel reset",
        summary="Watchdog reset in kernel stage",
        confidence="medium",
        evidence=[evidence],
        next_checks=["collect bootloader env"],
    )

    assert finding.evidence[0].source_file == "kernel.log"
    assert finding.next_checks == ["collect bootloader env"]


def test_follow_up_and_approved_case_views_cover_review_loop() -> None:
    follow_up = FollowUpQuestionCreate(question="还需要哪些日志？")
    approved = ApprovedCaseView(
        case_id="c1",
        original_question="升级后没有从预期启动区启动",
        problem_tags=["boot-region"],
        final_effective_conclusion="bootloader selected fallback partition",
        key_evidence_fragments=["boot.log: selected slot B"],
        source_analysis_task_id="task-1",
        reviewer="board-engineer",
        status="active",
    )

    assert follow_up.question == "还需要哪些日志？"
    assert approved.problem_tags == ["boot-region"]


def test_database_metadata_creates_required_tables() -> None:
    engine = create_engine("sqlite:///:memory:")

    Base.metadata.create_all(engine)

    table_names = set(inspect(engine).get_table_names())
    assert {
        "analysis_tasks",
        "uploaded_files",
        "boot_sessions",
        "diagnosis_findings",
        "evidence_snippets",
        "follow_up_messages",
        "approved_cases",
    }.issubset(table_names)


def test_analysis_task_table_has_operational_fields() -> None:
    columns = Base.metadata.tables["analysis_tasks"].columns

    assert "question" in columns
    assert "status" in columns
    assert "package_type" in columns
    assert "snapshot_count" in columns
