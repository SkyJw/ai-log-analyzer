from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class AnalysisTask(Base):
    __tablename__ = "analysis_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    answer_summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        default=utc_now,
        onupdate=utc_now,
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
    evidence_snippets: Mapped[list["EvidenceSnippet"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    follow_up_messages: Mapped[list["FollowUpMessage"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )
    approved_cases: Mapped[list["ApprovedCase"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    task: Mapped["AnalysisTask"] = relationship(back_populates="uploaded_files")


class BootSession(Base):
    __tablename__ = "boot_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    final_state: Mapped[str] = mapped_column(String(32), nullable=False)
    abnormal_stage: Mapped[str | None] = mapped_column(String(64))
    reset_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    evidence_files: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    key_events: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    task: Mapped["AnalysisTask"] = relationship(back_populates="boot_sessions")
    diagnosis_findings: Mapped[list["DiagnosisFinding"]] = relationship(back_populates="boot_session")
    evidence_snippets: Mapped[list["EvidenceSnippet"]] = relationship(back_populates="boot_session")


class DiagnosisFinding(Base):
    __tablename__ = "diagnosis_findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    boot_session_id: Mapped[int | None] = mapped_column(ForeignKey("boot_sessions.id"))
    playbook_id: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="medium", nullable=False)
    confidence: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)
    evidence_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    next_checks: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    task: Mapped["AnalysisTask"] = relationship(back_populates="diagnosis_findings")
    boot_session: Mapped["BootSession | None"] = relationship(back_populates="diagnosis_findings")
    evidence_snippets: Mapped[list["EvidenceSnippet"]] = relationship(back_populates="finding")


class EvidenceSnippet(Base):
    __tablename__ = "evidence_snippets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    finding_id: Mapped[int | None] = mapped_column(ForeignKey("diagnosis_findings.id"))
    boot_session_id: Mapped[int | None] = mapped_column(ForeignKey("boot_sessions.id"))
    source_file: Mapped[str] = mapped_column(String(255), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_line: Mapped[int | None] = mapped_column(Integer)
    end_line: Mapped[int | None] = mapped_column(Integer)
    segment_id: Mapped[str | None] = mapped_column(String(120))
    evidence_type: Mapped[str] = mapped_column(String(64), default="direct", nullable=False)
    strength: Mapped[str] = mapped_column(String(32), default="strong", nullable=False)

    task: Mapped["AnalysisTask"] = relationship(back_populates="evidence_snippets")
    finding: Mapped["DiagnosisFinding | None"] = relationship(back_populates="evidence_snippets")
    boot_session: Mapped["BootSession | None"] = relationship(back_populates="evidence_snippets")


class FollowUpMessage(Base):
    __tablename__ = "follow_up_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    evidence_ids: Mapped[list[int]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    task: Mapped["AnalysisTask"] = relationship(back_populates="follow_up_messages")


class ApprovedCase(Base):
    __tablename__ = "approved_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("analysis_tasks.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer_summary: Mapped[str] = mapped_column(Text, nullable=False)
    diagnosis_summary: Mapped[str] = mapped_column(Text, nullable=False)
    key_evidence_fragments: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(120))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=utc_now)

    task: Mapped["AnalysisTask"] = relationship(back_populates="approved_cases")
