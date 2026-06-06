from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str


class EvidenceSnippetView(BaseModel):
    snippet_id: str
    source_file: str
    boot_session_id: str | None = None
    content: str
    strength: str = "weak"
    line_start: int | None = None
    line_end: int | None = None
    segment_id: str | None = None


class DiagnosisFindingView(BaseModel):
    finding_id: str
    playbook_id: str
    related_boot_session_id: str | None = None
    title: str
    summary: str
    confidence: str
    evidence: list[EvidenceSnippetView] = Field(default_factory=list)
    next_checks: list[str] = Field(default_factory=list)


class BootSessionView(BaseModel):
    session_id: str
    snapshot_index: int
    display_name: str
    final_state: str
    abnormal_stage: str | None = None
    reset_detected: bool = False
    confidence: str = "unknown"
    evidence_files: list[str] = Field(default_factory=list)
    key_events: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)


class AnalysisTaskCreate(BaseModel):
    question: str
    board_model: str | None = None
    chip_model: str | None = None
    software_version: str | None = None
    problem_context: str | None = None
    expected_behavior: str | None = None


class AnalysisTaskView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    question: str
    status: str
    current_stage: str | None = None
    progress_percent: int = 0
    status_message: str | None = None
    error_message: str | None = None
    package_type: str | None = None
    snapshot_count: int = 0
    final_answer: str | None = None
    boot_sessions: list[BootSessionView] = Field(default_factory=list)
    diagnosis_findings: list[DiagnosisFindingView] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class FollowUpQuestionCreate(BaseModel):
    question: str


class ApprovedCaseView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    original_question: str
    problem_tags: list[str] = Field(default_factory=list)
    board_model: str | None = None
    chip_model: str | None = None
    software_version: str | None = None
    input_log_summary: str | None = None
    boot_reconstruction_summary: str | None = None
    active_diagnosis_summary: str | None = None
    final_effective_conclusion: str
    key_evidence_fragments: list[str] = Field(default_factory=list)
    diagnosis_process: str | None = None
    solution_or_next_action: str | None = None
    applicable_conditions: str | None = None
    non_applicable_conditions: str | None = None
    source_analysis_task_id: str
    reviewer: str
    approved_at: datetime | None = None
    status: str = "active"
