from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class AnalysisTask(Base):
    __tablename__ = "analysis_tasks"

    task_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    package_type: Mapped[str | None] = mapped_column(String(64))
    snapshot_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    board_model: Mapped[str | None] = mapped_column(String(128))
    chip_model: Mapped[str | None] = mapped_column(String(128))
    software_version: Mapped[str | None] = mapped_column(String(128))
    problem_context: Mapped[str | None] = mapped_column(Text)
    expected_behavior: Mapped[str | None] = mapped_column(Text)
    final_answer: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    uploaded_files: Mapped[list["UploadedFile"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    boot_sessions: Mapped[list["BootSession"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    diagnosis_findings: Mapped[list["DiagnosisFinding"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    follow_up_messages: Mapped[list["FollowUpMessage"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    approved_cases: Mapped[list["ApprovedCase"]] = relationship(back_populates="source_task")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    file_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("analysis_tasks.task_id"), nullable=False)
    original_name: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    classification: Mapped[str] = mapped_column(String(64), nullable=False, default="ignored")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    task: Mapped[AnalysisTask] = relationship(back_populates="uploaded_files")


class BootSession(Base):
    __tablename__ = "boot_sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("analysis_tasks.task_id"), nullable=False)
    snapshot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    source_archives: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    bootloader_logs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    kernel_logs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    userspace_logs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    board_service_logs: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    config_and_version_evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    key_events: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    final_state: Mapped[str] = mapped_column(String(64), nullable=False, default="unknown")
    abnormal_stage: Mapped[str | None] = mapped_column(String(64))
    reset_detected: Mapped[bool] = mapped_column(nullable=False, default=False)
    confidence: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    strong_evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    weak_evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    missing_information: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    task: Mapped[AnalysisTask] = relationship(back_populates="boot_sessions")
    diagnosis_findings: Mapped[list["DiagnosisFinding"]] = relationship(back_populates="boot_session")
    evidence_snippets: Mapped[list["EvidenceSnippet"]] = relationship(back_populates="boot_session")


class DiagnosisFinding(Base):
    __tablename__ = "diagnosis_findings"

    finding_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("analysis_tasks.task_id"), nullable=False)
    boot_session_id: Mapped[str | None] = mapped_column(ForeignKey("boot_sessions.session_id"))
    playbook_id: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    next_checks: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    task: Mapped[AnalysisTask] = relationship(back_populates="diagnosis_findings")
    boot_session: Mapped[BootSession | None] = relationship(back_populates="diagnosis_findings")
    evidence_snippets: Mapped[list["EvidenceSnippet"]] = relationship(back_populates="finding")


class EvidenceSnippet(Base):
    __tablename__ = "evidence_snippets"

    snippet_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("analysis_tasks.task_id"), nullable=False)
    finding_id: Mapped[str | None] = mapped_column(ForeignKey("diagnosis_findings.finding_id"))
    boot_session_id: Mapped[str | None] = mapped_column(ForeignKey("boot_sessions.session_id"))
    source_file: Mapped[str] = mapped_column(String(512), nullable=False)
    segment_id: Mapped[str | None] = mapped_column(String(128))
    line_start: Mapped[int | None] = mapped_column(Integer)
    line_end: Mapped[int | None] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    strength: Mapped[str] = mapped_column(String(32), nullable=False, default="weak")

    finding: Mapped[DiagnosisFinding | None] = relationship(back_populates="evidence_snippets")
    boot_session: Mapped[BootSession | None] = relationship(back_populates="evidence_snippets")


class FollowUpMessage(Base):
    __tablename__ = "follow_up_messages"

    message_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("analysis_tasks.task_id"), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    cited_evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    task: Mapped[AnalysisTask] = relationship(back_populates="follow_up_messages")


class ApprovedCase(Base):
    __tablename__ = "approved_cases"

    case_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_analysis_task_id: Mapped[str] = mapped_column(
        ForeignKey("analysis_tasks.task_id"),
        nullable=False,
    )
    original_question: Mapped[str] = mapped_column(Text, nullable=False)
    problem_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    board_model: Mapped[str | None] = mapped_column(String(128))
    chip_model: Mapped[str | None] = mapped_column(String(128))
    software_version: Mapped[str | None] = mapped_column(String(128))
    input_log_summary: Mapped[str | None] = mapped_column(Text)
    boot_reconstruction_summary: Mapped[str | None] = mapped_column(Text)
    active_diagnosis_summary: Mapped[str | None] = mapped_column(Text)
    final_effective_conclusion: Mapped[str] = mapped_column(Text, nullable=False)
    key_evidence_fragments: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    diagnosis_process: Mapped[str | None] = mapped_column(Text)
    solution_or_next_action: Mapped[str | None] = mapped_column(Text)
    applicable_conditions: Mapped[str | None] = mapped_column(Text)
    non_applicable_conditions: Mapped[str | None] = mapped_column(Text)
    reviewer: Mapped[str] = mapped_column(String(128), nullable=False)
    approved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    extra_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    source_task: Mapped[AnalysisTask] = relationship(back_populates="approved_cases")
