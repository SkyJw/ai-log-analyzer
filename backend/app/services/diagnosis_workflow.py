from __future__ import annotations

from dataclasses import dataclass, field

from app.services.boot_reconstruction_service import BootSessionResult
from app.services.model_gateway import ModelGateway
from app.services.playbook_service import DiagnosisPlaybook, PlaybookService
from app.services.segment_service import CandidateSegment
from app.services.whitelist_service import FileClassification


@dataclass(frozen=True)
class DiagnosisFindingResult:
    finding_id: str
    playbook_id: str
    related_boot_session_id: str | None
    title: str
    summary: str
    confidence: str
    evidence: list[str] = field(default_factory=list)
    next_checks: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class DiagnosisWorkflowResult:
    findings: list[DiagnosisFindingResult]
    final_answer: str
    extracted_facts: list[dict[str, object]] = field(default_factory=list)


class DiagnosisWorkflow:
    def __init__(
        self,
        playbook_service: PlaybookService,
        model_gateway: ModelGateway | None = None,
    ) -> None:
        self.playbook_service = playbook_service
        self.model_gateway = model_gateway or ModelGateway()

    def run(
        self,
        question: str,
        segments: list[CandidateSegment],
        boot_sessions: list[BootSessionResult],
        classifications: list[FileClassification],
    ) -> DiagnosisWorkflowResult:
        facts = self._extract_facts(segments)
        playbooks = self.playbook_service.select_related_playbooks(classifications, boot_sessions)
        findings = [
            self._finding_for_playbook(index, playbook, segments, boot_sessions, facts)
            for index, playbook in enumerate(playbooks)
        ]
        final_answer = self._answer_question(question, boot_sessions, findings)
        return DiagnosisWorkflowResult(
            findings=findings,
            final_answer=final_answer,
            extracted_facts=facts,
        )

    def _extract_facts(self, segments: list[CandidateSegment]) -> list[dict[str, object]]:
        facts: list[dict[str, object]] = []
        for segment in segments:
            if segment.score <= 0:
                continue
            result = self.model_gateway.analyze(
                "\n".join(
                    [
                        f"source_type={segment.source_type}",
                        f"tags={','.join(segment.tags)}",
                        segment.content,
                    ]
                )
            )
            raw_facts = result.get("facts", [])
            if isinstance(raw_facts, list):
                facts.extend(fact for fact in raw_facts if isinstance(fact, dict))
        return facts

    def _finding_for_playbook(
        self,
        index: int,
        playbook: DiagnosisPlaybook,
        segments: list[CandidateSegment],
        boot_sessions: list[BootSessionResult],
        facts: list[dict[str, object]],
    ) -> DiagnosisFindingResult:
        related_segments = [
            segment
            for segment in segments
            if segment.source_type in playbook.applicable_sources and segment.score > 0
        ]
        related_session = self._related_session(playbook, boot_sessions)
        evidence = [self._evidence_reference(segment) for segment in related_segments]
        confidence = self._confidence(evidence, facts)

        return DiagnosisFindingResult(
            finding_id=f"finding-{index}",
            playbook_id=playbook.id,
            related_boot_session_id=related_session.session_id if related_session else None,
            title=playbook.name,
            summary=self._summary(playbook, facts, related_segments),
            confidence=confidence,
            evidence=evidence,
            next_checks=playbook.next_checks,
        )

    def _related_session(
        self,
        playbook: DiagnosisPlaybook,
        boot_sessions: list[BootSessionResult],
    ) -> BootSessionResult | None:
        for session in boot_sessions:
            if session.abnormal_stage in playbook.applicable_sources:
                return session
            if playbook.id == "driver_probe_failure" and "driver probe" in " ".join(
                session.key_events
            ).lower():
                return session
        return boot_sessions[0] if boot_sessions else None

    def _answer_question(
        self,
        question: str,
        boot_sessions: list[BootSessionResult],
        findings: list[DiagnosisFindingResult],
    ) -> str:
        messages = [
            {
                "role": "system",
                "content": "Answer directly first, then cite evidence and uncertainty.",
            },
            {
                "role": "user",
                "content": (
                    f"question={question}\n"
                    f"boot_sessions={boot_sessions}\n"
                    f"findings={findings}"
                ),
            },
        ]
        return self.model_gateway.chat(messages)

    def _summary(
        self,
        playbook: DiagnosisPlaybook,
        facts: list[dict[str, object]],
        segments: list[CandidateSegment],
    ) -> str:
        if facts:
            event_type = facts[0].get("event_type", "diagnostic finding")
            return f"{playbook.name}: {event_type}"
        if segments:
            return f"{playbook.name}: matched {len(segments)} evidence segment(s)"
        return f"{playbook.name}: evidence is insufficient"

    def _confidence(self, evidence: list[str], facts: list[dict[str, object]]) -> str:
        if evidence and facts:
            return "medium"
        if evidence:
            return "low"
        return "unknown"

    def _evidence_reference(self, segment: CandidateSegment) -> str:
        return f"{segment.source_file}:{segment.line_start}-{segment.line_end}"
