from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from app.services.whitelist_service import LogWhitelistEntry


@dataclass(frozen=True)
class CandidateSegment:
    segment_id: str
    source_file: Path
    source_type: str
    content: str
    line_start: int
    line_end: int
    tags: list[str] = field(default_factory=list)
    score: int = 0


class SegmentService:
    ERROR_KEYWORDS = ("error", "fail", "failed", "timeout")
    RESET_KEYWORDS = ("reset", "watchdog")
    DRIVER_PROBE_KEYWORDS = ("probe failed", "probe error")

    def __init__(self, keyword_context_lines: int = 50) -> None:
        self.keyword_context_lines = keyword_context_lines

    def create_segments(self, log_file: Path, entry: LogWhitelistEntry | None) -> list[CandidateSegment]:
        if entry is None:
            return []

        lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
        if entry.scope_strategy == "multi_boot_split":
            return self._multi_boot_segments(log_file, entry, lines)

        return [self._build_segment(log_file, entry, lines, 0, len(lines), "segment-0")]

    def keyword_segments(
        self,
        log_file: Path,
        entry: LogWhitelistEntry | None,
    ) -> list[CandidateSegment]:
        if entry is None:
            return []

        lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
        segments: list[CandidateSegment] = []
        for index, line in enumerate(lines):
            normalized = line.lower()
            if not self._has_keyword(normalized):
                continue

            start = max(0, index - self.keyword_context_lines)
            end = min(len(lines), index + self.keyword_context_lines + 1)
            segments.append(
                self._build_segment(
                    log_file,
                    entry,
                    lines,
                    start,
                    end,
                    f"keyword-{len(segments)}",
                )
            )
        return segments

    def _multi_boot_segments(
        self,
        log_file: Path,
        entry: LogWhitelistEntry,
        lines: list[str],
    ) -> list[CandidateSegment]:
        marker_indexes = self._boot_boundary_indexes(lines, entry.boot_split_markers)
        marker_indexes = marker_indexes[: entry.max_boot_sessions]
        if not marker_indexes:
            return [self._build_segment(log_file, entry, lines, 0, len(lines), "segment-0")]

        segments: list[CandidateSegment] = []
        for offset, start in enumerate(marker_indexes):
            end = marker_indexes[offset + 1] if offset + 1 < len(marker_indexes) else len(lines)
            segments.append(
                self._build_segment(
                    log_file,
                    entry,
                    lines,
                    start,
                    end,
                    f"boot-{offset}",
                )
            )
        return segments

    def _boot_boundary_indexes(self, lines: list[str], markers: list[str]) -> list[int]:
        strong_boundaries = ("Linux version", "Booting Linux", "U-Boot")
        primary_indexes = [
            index
            for index, line in enumerate(lines)
            if any(marker in line for marker in strong_boundaries)
        ]
        if primary_indexes:
            return primary_indexes

        return [
            index
            for index, line in enumerate(lines)
            if self._is_boot_marker(line, markers)
        ]

    def _build_segment(
        self,
        log_file: Path,
        entry: LogWhitelistEntry,
        lines: list[str],
        start: int,
        end: int,
        segment_id: str,
    ) -> CandidateSegment:
        content_lines = lines[start:end]
        content = "\n".join(content_lines)
        tags = self._tags_for_content(content, entry.source_type)
        return CandidateSegment(
            segment_id=segment_id,
            source_file=log_file,
            source_type=entry.source_type,
            content=content,
            line_start=start + 1,
            line_end=end,
            tags=tags,
            score=self._score(tags),
        )

    def _tags_for_content(self, content: str, source_type: str) -> list[str]:
        normalized = content.lower()
        tags = [source_type]
        if any(keyword in normalized for keyword in self.ERROR_KEYWORDS):
            tags.append("error")
        if any(keyword in normalized for keyword in self.RESET_KEYWORDS):
            tags.append("reset")
        if any(keyword in normalized for keyword in self.DRIVER_PROBE_KEYWORDS):
            tags.append("driver_probe")
        if len(tags) == 1:
            tags.append("noise")
        return tags

    def _score(self, tags: list[str]) -> int:
        score = 0
        if "reset" in tags:
            score += 10
        if "driver_probe" in tags:
            score += 8
        if "error" in tags:
            score += 5
        if "noise" in tags:
            score -= 1
        return score

    def _is_boot_marker(self, line: str, markers: list[str]) -> bool:
        return any(marker in line for marker in markers)

    def _has_keyword(self, normalized_line: str) -> bool:
        return (
            any(keyword in normalized_line for keyword in self.ERROR_KEYWORDS)
            or any(keyword in normalized_line for keyword in self.RESET_KEYWORDS)
            or any(keyword in normalized_line for keyword in self.DRIVER_PROBE_KEYWORDS)
        )
