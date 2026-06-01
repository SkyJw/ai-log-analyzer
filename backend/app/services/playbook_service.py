from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import yaml

from app.services.boot_reconstruction_service import BootSessionResult
from app.services.whitelist_service import FileClassification


@dataclass(frozen=True)
class DiagnosisPlaybook:
    id: str
    name: str
    version: str
    status: str
    applicable_sources: list[str]
    required_evidence: list[str] = field(default_factory=list)
    analysis_steps: list[str] = field(default_factory=list)
    common_causes: list[str] = field(default_factory=list)
    next_checks: list[str] = field(default_factory=list)
    output_requirements: list[str] = field(default_factory=list)
    related_log_types: list[str] = field(default_factory=list)


class PlaybookService:
    def __init__(self, playbooks: list[DiagnosisPlaybook]) -> None:
        self.playbooks = playbooks

    @classmethod
    def from_directory(cls, config_dir: Path) -> "PlaybookService":
        return cls([cls._load_playbook(path) for path in sorted(config_dir.glob("*.yaml"))])

    @staticmethod
    def _load_playbook(path: Path) -> DiagnosisPlaybook:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        return DiagnosisPlaybook(
            id=raw["id"],
            name=raw["name"],
            version=str(raw["version"]),
            status=raw["status"],
            applicable_sources=list(raw.get("applicable_sources", [])),
            required_evidence=list(raw.get("required_evidence", [])),
            analysis_steps=list(raw.get("analysis_steps", [])),
            common_causes=list(raw.get("common_causes", [])),
            next_checks=list(raw.get("next_checks", [])),
            output_requirements=list(raw.get("output_requirements", [])),
            related_log_types=list(raw.get("related_log_types", [])),
        )

    def active_playbooks(self) -> list[DiagnosisPlaybook]:
        return [playbook for playbook in self.playbooks if playbook.status == "active"]

    def select_related_playbooks(
        self,
        classifications: list[FileClassification],
        boot_sessions: list[BootSessionResult],
    ) -> list[DiagnosisPlaybook]:
        requested_ids = self._ids_from_classifications(classifications)
        requested_ids.update(self._ids_from_boot_facts(boot_sessions))

        selected = [
            playbook
            for playbook in self.active_playbooks()
            if playbook.id in requested_ids
        ]
        return sorted(selected, key=lambda playbook: playbook.id)

    def _ids_from_classifications(self, classifications: list[FileClassification]) -> set[str]:
        ids: set[str] = set()
        for classification in classifications:
            if classification.entry is None:
                continue
            ids.update(classification.entry.related_playbooks)
        return ids

    def _ids_from_boot_facts(self, boot_sessions: list[BootSessionResult]) -> set[str]:
        ids: set[str] = set()
        for session in boot_sessions:
            key_events = " ".join(session.key_events).lower()
            if session.abnormal_stage == "bootloader":
                ids.add("boot_region_abnormal")
            if session.abnormal_stage == "kernel" and "driver probe" in key_events:
                ids.add("driver_probe_failure")
            if session.abnormal_stage in {"userspace", "board_service"}:
                ids.add("userspace_service_startup")
        return ids
