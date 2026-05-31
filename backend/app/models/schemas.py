from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer

QuestionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class ApiModel(BaseModel):
    @field_serializer(
        "created_at",
        "updated_at",
        "started_at",
        "ended_at",
        "approved_at",
        check_fields=False,
        when_used="json",
    )
    def serialize_utc_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        if value.tzinfo is None:
            utc_value = value.replace(tzinfo=UTC)
        else:
            utc_value = value.astimezone(UTC)
        return utc_value.isoformat().replace("+00:00", "Z")


class HealthResponse(ApiModel):
    status: str


class AnalysisTaskCreate(ApiModel):
    question: QuestionText
    uploaded_file_ids: list[int] = Field(default_factory=list)


class UploadedFileView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    filename: str
    storage_path: str
    content_type: str | None = None
    size_bytes: int | None = None
    created_at: datetime


class EvidenceSnippetView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    finding_id: int | None = None
    boot_session_id: int | None = None
    source_file: str
    text: str
    start_line: int | None = None
    end_line: int | None = None
    segment_id: str | None = None
    evidence_type: str = "direct"
    strength: str = "strong"


class BootSessionView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    session_id: str
    snapshot_index: int
    display_name: str
    final_state: str
    abnormal_stage: str | None = None
    reset_detected: bool = False
    confidence: str = "unknown"
    evidence_files: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    key_events: list[str] = Field(default_factory=list)


class DiagnosisFindingView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    boot_session_id: int | None = None
    playbook_id: str
    title: str
    summary: str
    severity: str = "medium"
    confidence: str = "unknown"
    evidence_ids: list[int] = Field(default_factory=list)
    next_checks: list[str] = Field(default_factory=list)


class FollowUpMessageView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    question: str
    answer: str | None = None
    evidence_ids: list[int] = Field(default_factory=list)
    created_at: datetime


class AnalysisTaskView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    status: str
    answer_summary: str | None = None
    created_at: datetime
    updated_at: datetime
    uploaded_files: list[UploadedFileView] = Field(default_factory=list)
    boot_sessions: list[BootSessionView] = Field(default_factory=list)
    diagnosis_findings: list[DiagnosisFindingView] = Field(default_factory=list)
    evidence_snippets: list[EvidenceSnippetView] = Field(default_factory=list)
    follow_up_messages: list[FollowUpMessageView] = Field(default_factory=list)


class FollowUpQuestionCreate(ApiModel):
    question: QuestionText


class ApprovedCaseView(ApiModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    question: str
    answer_summary: str
    diagnosis_summary: str
    key_evidence_fragments: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    enabled: bool = True
    approved_by: str | None = None
    approved_at: datetime
