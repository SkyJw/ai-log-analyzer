from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.db import AnalysisTask, Base
from app.models.schemas import (
    AnalysisTaskCreate,
    AnalysisTaskView,
    ApprovedCaseView,
    BootSessionView,
    DiagnosisFindingView,
    FollowUpMessageView,
    UploadedFileView,
    FollowUpQuestionCreate,
)


def test_analysis_task_create_requires_question() -> None:
    with pytest.raises(ValidationError):
        AnalysisTaskCreate()

    task = AnalysisTaskCreate(question=" 升级后没有从预期启动区启动 ")

    assert task.question == "升级后没有从预期启动区启动"


@pytest.mark.parametrize("schema_class", [AnalysisTaskCreate, FollowUpQuestionCreate])
def test_question_create_schemas_reject_blank_questions(schema_class: type) -> None:
    with pytest.raises(ValidationError):
        schema_class(question="   ")


@pytest.mark.parametrize("schema_class", [AnalysisTaskCreate, FollowUpQuestionCreate])
def test_question_create_schemas_reject_overlong_questions(schema_class: type) -> None:
    with pytest.raises(ValidationError):
        schema_class(question="x" * 1001)


def test_boot_session_view_contains_evidence_files() -> None:
    session = BootSessionView(
        id=1,
        task_id=7,
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


def test_orm_metadata_contains_core_tables() -> None:
    assert {
        "analysis_tasks",
        "uploaded_files",
        "boot_sessions",
        "diagnosis_findings",
        "evidence_snippets",
        "follow_up_messages",
        "approved_cases",
    }.issubset(Base.metadata.tables)


def test_diagnosis_finding_view_serializes_core_information() -> None:
    finding = DiagnosisFindingView(
        id=11,
        task_id=7,
        boot_session_id=1,
        playbook_id="driver_probe_failure",
        title="Driver probe failure",
        summary="I2C probe failed before userspace startup.",
        severity="high",
        confidence="medium",
        evidence_ids=[101, 102],
        next_checks=["check power rail", "check pinmux"],
    )

    assert finding.model_dump() == {
        "id": 11,
        "task_id": 7,
        "boot_session_id": 1,
        "playbook_id": "driver_probe_failure",
        "title": "Driver probe failure",
        "summary": "I2C probe failed before userspace startup.",
        "severity": "high",
        "confidence": "medium",
        "evidence_ids": [101, 102],
        "next_checks": ["check power rail", "check pinmux"],
    }


def test_approved_case_view_serializes_core_information() -> None:
    approved_at = datetime(2026, 5, 31, 15, 30, tzinfo=UTC)
    approved_case = ApprovedCaseView(
        id=5,
        task_id=7,
        question="升级后为什么没有从预期启动区启动？",
        answer_summary="Kernel started from fallback partition after probe failure.",
        diagnosis_summary="Probe failure caused fallback boot path.",
        key_evidence_fragments=["boot.log: probe failed with -110"],
        tags=["boot", "driver"],
        enabled=True,
        approved_by="reviewer",
        approved_at=approved_at,
    )

    assert approved_case.model_dump(mode="json") == {
        "id": 5,
        "task_id": 7,
        "question": "升级后为什么没有从预期启动区启动？",
        "answer_summary": "Kernel started from fallback partition after probe failure.",
        "diagnosis_summary": "Probe failure caused fallback boot path.",
        "key_evidence_fragments": ["boot.log: probe failed with -110"],
        "tags": ["boot", "driver"],
        "enabled": True,
        "approved_by": "reviewer",
        "approved_at": "2026-05-31T15:30:00Z",
    }


def test_analysis_task_view_includes_uploaded_files_and_follow_up_messages() -> None:
    created_at = datetime(2026, 5, 31, 15, 30)
    task = AnalysisTaskView(
        id=7,
        question="升级后没有从预期启动区启动",
        status="completed",
        answer_summary="Fallback boot was used.",
        created_at=created_at,
        updated_at=created_at,
        uploaded_files=[
            UploadedFileView(
                id=21,
                task_id=7,
                filename="boot.log",
                storage_path="storage/tasks/7/boot.log",
                content_type="text/plain",
                size_bytes=2048,
                created_at=created_at,
            )
        ],
        follow_up_messages=[
            FollowUpMessageView(
                id=31,
                task_id=7,
                question="驱动失败发生在哪个阶段？",
                answer="kernel 阶段",
                evidence_ids=[101],
                created_at=created_at,
            )
        ],
    )

    dumped = task.model_dump(mode="json")

    assert dumped["uploaded_files"][0]["filename"] == "boot.log"
    assert dumped["uploaded_files"][0]["created_at"] == "2026-05-31T15:30:00Z"
    assert dumped["follow_up_messages"][0]["question"] == "驱动失败发生在哪个阶段？"
    assert dumped["follow_up_messages"][0]["created_at"] == "2026-05-31T15:30:00Z"


def test_sqlite_round_trip_task_datetimes_serialize_as_utc_z() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)

    with session_factory() as session:
        task = AnalysisTask(
            question="升级后没有从预期启动区启动",
            created_at=datetime(2026, 5, 31, 15, 30),
            updated_at=datetime(2026, 5, 31, 15, 35),
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        dumped = AnalysisTaskView.model_validate(task).model_dump(mode="json")

    assert dumped["created_at"] == "2026-05-31T15:30:00Z"
    assert dumped["updated_at"] == "2026-05-31T15:35:00Z"
