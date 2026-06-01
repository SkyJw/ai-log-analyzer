from __future__ import annotations

from dataclasses import dataclass, field

from app.services.segment_service import CandidateSegment


@dataclass(frozen=True)
class BootSessionResult:
    session_id: str
    snapshot_index: int
    display_name: str
    source_archives: list[str] = field(default_factory=list)
    bootloader_logs: list[str] = field(default_factory=list)
    kernel_logs: list[str] = field(default_factory=list)
    userspace_logs: list[str] = field(default_factory=list)
    board_service_logs: list[str] = field(default_factory=list)
    config_and_version_evidence: list[str] = field(default_factory=list)
    key_events: list[str] = field(default_factory=list)
    final_state: str = "unknown"
    abnormal_stage: str | None = None
    reset_detected: bool = False
    confidence: str = "unknown"
    strong_evidence: list[str] = field(default_factory=list)
    weak_evidence: list[str] = field(default_factory=list)
    missing_information: list[str] = field(default_factory=list)


class BootReconstructionService:
    def reconstruct(
        self,
        snapshot_segments: dict[int, list[CandidateSegment]],
    ) -> list[BootSessionResult]:
        return [
            self._reconstruct_snapshot(snapshot_index, segments)
            for snapshot_index, segments in sorted(snapshot_segments.items())
        ]

    def _reconstruct_snapshot(
        self,
        snapshot_index: int,
        segments: list[CandidateSegment],
    ) -> BootSessionResult:
        reset_segment = self._first_segment_with_tag(segments, "reset")
        error_segment = self._first_error_segment(segments)
        stage_sources = self._stage_sources(segments)

        final_state = self._final_state(stage_sources, reset_segment, error_segment)
        abnormal_stage = self._abnormal_stage(reset_segment, error_segment)
        strong_evidence = self._strong_evidence(segments)
        weak_evidence = self._weak_evidence(segments, strong_evidence)
        missing_information = self._missing_information(stage_sources)

        return BootSessionResult(
            session_id=f"snapshot-{snapshot_index}",
            snapshot_index=snapshot_index,
            display_name=f"最近第 {snapshot_index + 1} 次启动",
            bootloader_logs=stage_sources["bootloader"],
            kernel_logs=stage_sources["kernel"],
            userspace_logs=stage_sources["userspace"],
            board_service_logs=stage_sources["board_service"],
            key_events=self._key_events(segments),
            final_state=final_state,
            abnormal_stage=abnormal_stage,
            reset_detected=reset_segment is not None,
            confidence=self._confidence(final_state, strong_evidence),
            strong_evidence=strong_evidence,
            weak_evidence=weak_evidence,
            missing_information=missing_information,
        )

    def _stage_sources(self, segments: list[CandidateSegment]) -> dict[str, list[str]]:
        sources = {
            "bootloader": [],
            "kernel": [],
            "userspace": [],
            "board_service": [],
        }
        for segment in segments:
            if segment.source_type in sources:
                sources[segment.source_type].append(str(segment.source_file))
        return sources

    def _final_state(
        self,
        stage_sources: dict[str, list[str]],
        reset_segment: CandidateSegment | None,
        error_segment: CandidateSegment | None,
    ) -> str:
        if reset_segment or error_segment:
            return "abnormal"
        if stage_sources["userspace"] and stage_sources["board_service"]:
            return "success"
        return "unknown"

    def _abnormal_stage(
        self,
        reset_segment: CandidateSegment | None,
        error_segment: CandidateSegment | None,
    ) -> str | None:
        if reset_segment:
            return reset_segment.source_type
        if error_segment:
            return error_segment.source_type
        return None

    def _missing_information(self, stage_sources: dict[str, list[str]]) -> list[str]:
        missing = []
        if not stage_sources["bootloader"]:
            missing.append("bootloader evidence")
        if not stage_sources["kernel"]:
            missing.append("kernel evidence")
        if not stage_sources["userspace"]:
            missing.append("userspace evidence")
        if not stage_sources["board_service"]:
            missing.append("board service evidence")
        return missing

    def _strong_evidence(self, segments: list[CandidateSegment]) -> list[str]:
        return [
            self._evidence_reference(segment)
            for segment in segments
            if segment.score >= 8 or "reset" in segment.tags or "driver_probe" in segment.tags
        ]

    def _weak_evidence(
        self,
        segments: list[CandidateSegment],
        strong_evidence: list[str],
    ) -> list[str]:
        strong = set(strong_evidence)
        return [
            self._evidence_reference(segment)
            for segment in segments
            if self._evidence_reference(segment) not in strong
        ]

    def _key_events(self, segments: list[CandidateSegment]) -> list[str]:
        events = []
        for segment in segments:
            if "reset" in segment.tags:
                events.append(f"{segment.source_type}: reset detected")
            elif "driver_probe" in segment.tags:
                events.append(f"{segment.source_type}: driver probe failure")
            elif "error" in segment.tags:
                events.append(f"{segment.source_type}: error detected")
        return events

    def _confidence(self, final_state: str, strong_evidence: list[str]) -> str:
        if final_state == "success":
            return "medium"
        if strong_evidence:
            return "medium"
        return "low"

    def _first_segment_with_tag(
        self,
        segments: list[CandidateSegment],
        tag: str,
    ) -> CandidateSegment | None:
        return next((segment for segment in segments if tag in segment.tags), None)

    def _first_error_segment(self, segments: list[CandidateSegment]) -> CandidateSegment | None:
        return next((segment for segment in segments if "error" in segment.tags), None)

    def _evidence_reference(self, segment: CandidateSegment) -> str:
        return f"{segment.source_file}:{segment.line_start}-{segment.line_end}"
