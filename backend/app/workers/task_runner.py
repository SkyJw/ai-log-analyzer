from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from app.core.config import get_settings
from app.models.schemas import (
    AnalysisTaskCreate,
    AnalysisTaskView,
    ApprovedCaseView,
    BootSessionView,
    DiagnosisFindingView,
    EvidenceSnippetView,
)
from app.services.archive_service import ArchiveService
from app.services.boot_reconstruction_service import BootReconstructionService, BootSessionResult
from app.services.diagnosis_workflow import DiagnosisFindingResult, DiagnosisWorkflow
from app.services.playbook_service import PlaybookService
from app.services.segment_service import CandidateSegment, SegmentService
from app.services.whitelist_service import FileClassification, LogWhitelistService


@dataclass
class FollowUpMessageView:
    message_id: str
    role: str
    content: str
    cited_evidence: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class AnalysisTaskRecord:
    task: AnalysisTaskView
    classifications: list[FileClassification] = field(default_factory=list)
    segments: list[CandidateSegment] = field(default_factory=list)
    follow_ups: list[FollowUpMessageView] = field(default_factory=list)


class InMemoryTaskStore:
    def __init__(self) -> None:
        self.tasks: dict[str, AnalysisTaskRecord] = {}
        self.cases: dict[str, ApprovedCaseView] = {}

    def add_task(self, record: AnalysisTaskRecord) -> None:
        self.tasks[record.task.task_id] = record

    def list_tasks(self) -> list[AnalysisTaskView]:
        return [record.task for record in self.tasks.values()]

    def get_record(self, task_id: str) -> AnalysisTaskRecord | None:
        return self.tasks.get(task_id)

    def add_case(self, approved_case: ApprovedCaseView) -> None:
        self.cases[approved_case.case_id] = approved_case

    def list_cases(self) -> list[ApprovedCaseView]:
        return list(self.cases.values())


class TaskRunner:
    def __init__(self, store: InMemoryTaskStore | None = None) -> None:
        self.settings = get_settings()
        self.store = store or InMemoryTaskStore()
        self.project_root = Path(__file__).resolve().parents[3]
        self.whitelist_service = LogWhitelistService.from_directory(
            self.project_root / "configs" / "log_whitelist"
        )
        self.playbook_service = PlaybookService.from_directory(
            self.project_root / "configs" / "diagnosis_playbooks"
        )

    def create_task(
        self,
        payload: AnalysisTaskCreate,
        archive_filename: str,
        archive_stream: BinaryIO,
    ) -> AnalysisTaskView:
        task_id = uuid4().hex
        task_dir = self.settings.storage_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        archive_path = task_dir / archive_filename
        archive_path.write_bytes(archive_stream.read())

        archive_result = ArchiveService().inspect_and_extract(archive_path, task_dir / "extract")
        classifications: list[FileClassification] = []
        all_segments: list[CandidateSegment] = []
        snapshot_segments: dict[int, list[CandidateSegment]] = {}

        for snapshot in archive_result.snapshots:
            segments_for_snapshot: list[CandidateSegment] = []
            for extracted_file in snapshot.extracted_files:
                classification = self.whitelist_service.classify_path(extracted_file.path)
                classifications.append(classification)
                file_segments = SegmentService().create_segments(extracted_file.path, classification.entry)
                segments_for_snapshot.extend(file_segments)
                all_segments.extend(file_segments)
            snapshot_segments[snapshot.snapshot_index] = segments_for_snapshot

        boot_sessions = BootReconstructionService().reconstruct(snapshot_segments)
        diagnosis_result = DiagnosisWorkflow(
            playbook_service=self.playbook_service,
        ).run(
            question=payload.question,
            segments=all_segments,
            boot_sessions=boot_sessions,
            classifications=classifications,
        )

        task = AnalysisTaskView(
            task_id=task_id,
            question=payload.question,
            status="completed",
            package_type=archive_result.package_type,
            snapshot_count=len(archive_result.snapshots),
            final_answer=diagnosis_result.final_answer,
            boot_sessions=[self._boot_session_view(session) for session in boot_sessions],
            diagnosis_findings=[
                self._diagnosis_finding_view(finding, all_segments)
                for finding in diagnosis_result.findings
            ],
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.store.add_task(
            AnalysisTaskRecord(
                task=task,
                classifications=classifications,
                segments=all_segments,
            )
        )
        return task

    def answer_follow_up(self, task_id: str, question: str) -> FollowUpMessageView | None:
        record = self.store.get_record(task_id)
        if record is None:
            return None

        evidence = self._task_evidence(record.task)
        message = FollowUpMessageView(
            message_id=uuid4().hex,
            role="assistant",
            content=f"基于当前任务证据回答：{question}",
            cited_evidence=evidence,
        )
        record.follow_ups.append(message)
        return message

    def approve_case(
        self,
        task_id: str,
        reviewer: str,
        final_effective_conclusion: str,
        diagnosis_process: str | None = None,
        solution_or_next_action: str | None = None,
        applicable_conditions: str | None = None,
        non_applicable_conditions: str | None = None,
    ) -> ApprovedCaseView | None:
        record = self.store.get_record(task_id)
        if record is None:
            return None

        approved = ApprovedCaseView(
            case_id=uuid4().hex,
            original_question=record.task.question,
            problem_tags=[finding.playbook_id for finding in record.task.diagnosis_findings],
            final_effective_conclusion=final_effective_conclusion,
            key_evidence_fragments=self._task_evidence(record.task),
            diagnosis_process=diagnosis_process,
            solution_or_next_action=solution_or_next_action,
            applicable_conditions=applicable_conditions,
            non_applicable_conditions=non_applicable_conditions,
            source_analysis_task_id=task_id,
            reviewer=reviewer,
            approved_at=datetime.now(UTC),
            status="active",
        )
        self.store.add_case(approved)
        return approved

    def _boot_session_view(self, session: BootSessionResult) -> BootSessionView:
        return BootSessionView(
            session_id=session.session_id,
            snapshot_index=session.snapshot_index,
            display_name=session.display_name,
            final_state=session.final_state,
            abnormal_stage=session.abnormal_stage,
            reset_detected=session.reset_detected,
            confidence=session.confidence,
            evidence_files=session.strong_evidence + session.weak_evidence,
            key_events=session.key_events,
            missing_information=session.missing_information,
        )

    def _diagnosis_finding_view(
        self,
        finding: DiagnosisFindingResult,
        segments: list[CandidateSegment],
    ) -> DiagnosisFindingView:
        evidence_views = [
            self._evidence_view(index, segment)
            for index, segment in enumerate(segments)
            if self._segment_reference(segment) in finding.evidence
        ]
        return DiagnosisFindingView(
            finding_id=finding.finding_id,
            playbook_id=finding.playbook_id,
            related_boot_session_id=finding.related_boot_session_id,
            title=finding.title,
            summary=finding.summary,
            confidence=finding.confidence,
            evidence=evidence_views,
            next_checks=finding.next_checks,
        )

    def _evidence_view(self, index: int, segment: CandidateSegment) -> EvidenceSnippetView:
        return EvidenceSnippetView(
            snippet_id=f"evidence-{index}",
            source_file=str(segment.source_file),
            boot_session_id=None,
            content=segment.content,
            strength="strong" if segment.score > 0 else "weak",
            line_start=segment.line_start,
            line_end=segment.line_end,
            segment_id=segment.segment_id,
        )

    def _task_evidence(self, task: AnalysisTaskView) -> list[str]:
        evidence: list[str] = []
        for finding in task.diagnosis_findings:
            evidence.extend(snippet.source_file for snippet in finding.evidence)
        return evidence or [session.session_id for session in task.boot_sessions]

    def _segment_reference(self, segment: CandidateSegment) -> str:
        return f"{segment.source_file}:{segment.line_start}-{segment.line_end}"


task_runner = TaskRunner()
