from app.core.config import Settings
from app.services.model_gateway import (
    FakeModelProvider,
    MiniMaxModelProvider,
    ModelGateway,
)


class RecordingProvider:
    def __init__(self) -> None:
        self.calls: list[tuple[str, object]] = []

    def analyze(self, prompt: str) -> dict[str, object]:
        self.calls.append(("analyze", prompt))
        return {"ok": True}

    def chat(self, messages: list[dict[str, str]]) -> str:
        self.calls.append(("chat", messages))
        return "answer"

    def summarize(self, text: str) -> str:
        self.calls.append(("summarize", text))
        return "summary"

    def embed(self, text: str) -> list[float]:
        self.calls.append(("embed", text))
        return [0.1, 0.2]


def test_fake_provider_returns_deterministic_json() -> None:
    provider = FakeModelProvider()

    assert provider.analyze("kernel reset") == {
        "provider": "fake",
        "operation": "analyze",
        "input": "kernel reset",
        "facts": [],
    }
    assert provider.chat([{"role": "user", "content": "why"}]) == "fake answer"
    assert provider.summarize("long text") == "fake summary"
    assert provider.embed("boot") == [0.0]


def test_minimax_provider_is_selected_by_config_without_calling_api() -> None:
    gateway = ModelGateway.from_settings(
        Settings(
            model_provider="minimax",
            minimax_api_key="test-key",
            minimax_model="MiniMax-M2.7",
        )
    )

    assert isinstance(gateway.provider, MiniMaxModelProvider)
    assert gateway.provider.model == "MiniMax-M2.7"


def test_gateway_delegates_all_business_operations_to_provider() -> None:
    provider = RecordingProvider()
    gateway = ModelGateway(provider)

    assert gateway.analyze("prompt") == {"ok": True}
    assert gateway.chat([{"role": "user", "content": "question"}]) == "answer"
    assert gateway.summarize("content") == "summary"
    assert gateway.embed("content") == [0.1, 0.2]
    assert provider.calls == [
        ("analyze", "prompt"),
        ("chat", [{"role": "user", "content": "question"}]),
        ("summarize", "content"),
        ("embed", "content"),
    ]
