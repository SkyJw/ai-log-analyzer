from pathlib import Path

from app.services.boot_reconstruction_service import BootSessionResult
from app.services.diagnosis_workflow import DiagnosisWorkflow
from app.services.model_gateway import ModelGateway
from app.services.playbook_service import PlaybookService
from app.services.segment_service import CandidateSegment
from app.services.whitelist_service import LogWhitelistService


PROJECT_ROOT = Path(__file__).resolve().parents[2]
PLAYBOOK_DIR = PROJECT_ROOT / "configs" / "diagnosis_playbooks"
WHITELIST_DIR = PROJECT_ROOT / "configs" / "log_whitelist"


class ScriptedProvider:
    def __init__(self) -> None:
        self.analyze_prompts: list[str] = []
        self.chat_messages: list[list[dict[str, str]]] = []

    def analyze(self, prompt: str) -> dict[str, object]:
        self.analyze_prompts.append(prompt)
        return {
            "facts": [
                {
                    "stage": "kernel",
                    "event_type": "driver_probe_failure",
                    "evidence": "probe failed with error -110",
                    "confidence": "medium",
                }
            ]
        }

    def chat(self, messages: list[dict[str, str]]) -> str:
        self.chat_messages.append(messages)
        return "直接回答：当前日志显示 kernel 阶段驱动 probe 失败，需要补充设备树和总线访问信息。"

    def summarize(self, text: str) -> str:
        return "summary"

    def embed(self, text: str) -> list[float]:
        return [0.0]


def kernel_segment() -> CandidateSegment:
    return CandidateSegment(
        segment_id="seg-1",
        source_file=Path("kernel_history.log"),
        source_type="kernel",
        content="driver foo probe failed with error -110",
        line_start=10,
        line_end=12,
        tags=["kernel", "error", "driver_probe"],
        score=13,
    )


def abnormal_kernel_session() -> BootSessionResult:
    return BootSessionResult(
        session_id="snapshot-0",
        snapshot_index=0,
        display_name="最近第 1 次启动",
        final_state="abnormal",
        abnormal_stage="kernel",
        confidence="medium",
        key_events=["kernel: driver probe failure"],
        strong_evidence=["kernel_history.log:10-12"],
    )


def test_playbook_loader_loads_active_yaml_playbooks() -> None:
    service = PlaybookService.from_directory(PLAYBOOK_DIR)

    playbooks = {playbook.id: playbook for playbook in service.active_playbooks()}

    assert {"boot_region_abnormal", "driver_probe_failure", "userspace_service_startup"}.issubset(
        playbooks
    )
    assert playbooks["driver_probe_failure"].status == "active"
    assert "kernel" in playbooks["driver_probe_failure"].applicable_sources


def test_related_playbooks_are_selected_from_whitelist_and_boot_facts(tmp_path: Path) -> None:
    log_file = tmp_path / "kernel_history.log"
    log_file.write_text("driver foo probe failed with error -110", encoding="utf-8")
    classification = LogWhitelistService.from_directory(WHITELIST_DIR).classify_path(log_file)

    selected = PlaybookService.from_directory(PLAYBOOK_DIR).select_related_playbooks(
        classifications=[classification],
        boot_sessions=[abnormal_kernel_session()],
    )

    assert [playbook.id for playbook in selected] == ["driver_probe_failure"]


def test_diagnosis_workflow_outputs_findings_and_direct_answer(tmp_path: Path) -> None:
    log_file = tmp_path / "kernel_history.log"
    log_file.write_text("driver foo probe failed with error -110", encoding="utf-8")
    classification = LogWhitelistService.from_directory(WHITELIST_DIR).classify_path(log_file)
    provider = ScriptedProvider()

    result = DiagnosisWorkflow(
        playbook_service=PlaybookService.from_directory(PLAYBOOK_DIR),
        model_gateway=ModelGateway(provider),
    ).run(
        question="升级后为什么没有正常启动？",
        segments=[kernel_segment()],
        boot_sessions=[abnormal_kernel_session()],
        classifications=[classification],
    )

    assert result.final_answer.startswith("直接回答")
    assert provider.analyze_prompts
    assert provider.chat_messages
    assert len(result.findings) == 1
    finding = result.findings[0]
    assert finding.playbook_id == "driver_probe_failure"
    assert finding.related_boot_session_id == "snapshot-0"
    assert finding.confidence == "medium"
    assert finding.evidence == ["kernel_history.log:10-12"]
    assert "检查 power/reset/clock/pinmux" in finding.next_checks
