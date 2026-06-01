from __future__ import annotations

from typing import Protocol

from app.core.config import Settings, get_settings


class ModelProvider(Protocol):
    def analyze(self, prompt: str) -> dict[str, object]:
        pass

    def chat(self, messages: list[dict[str, str]]) -> str:
        pass

    def summarize(self, text: str) -> str:
        pass

    def embed(self, text: str) -> list[float]:
        pass


class FakeModelProvider:
    def analyze(self, prompt: str) -> dict[str, object]:
        return {
            "provider": "fake",
            "operation": "analyze",
            "input": prompt,
            "facts": [],
        }

    def chat(self, messages: list[dict[str, str]]) -> str:
        return "fake answer"

    def summarize(self, text: str) -> str:
        return "fake summary"

    def embed(self, text: str) -> list[float]:
        return [0.0]


class MiniMaxModelProvider:
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    def analyze(self, prompt: str) -> dict[str, object]:
        raise RuntimeError("MiniMax analyze API is not enabled in unit-test mode")

    def chat(self, messages: list[dict[str, str]]) -> str:
        raise RuntimeError("MiniMax chat API is not enabled in unit-test mode")

    def summarize(self, text: str) -> str:
        raise RuntimeError("MiniMax summarize API is not enabled in unit-test mode")

    def embed(self, text: str) -> list[float]:
        raise RuntimeError("MiniMax embed API is not enabled in unit-test mode")


class ModelGateway:
    def __init__(self, provider: ModelProvider | None = None) -> None:
        self.provider = provider or self.from_settings(get_settings()).provider

    @classmethod
    def from_settings(cls, settings: Settings) -> "ModelGateway":
        provider_name = settings.model_provider.lower()
        if provider_name == "fake":
            return cls(FakeModelProvider())
        if provider_name == "minimax":
            if not settings.minimax_api_key:
                raise ValueError("AI_LOG_ANALYZER_MINIMAX_API_KEY is required for MiniMax")
            return cls(
                MiniMaxModelProvider(
                    api_key=settings.minimax_api_key,
                    model=settings.minimax_model,
                    base_url=settings.minimax_base_url,
                )
            )
        raise ValueError(f"Unsupported model provider: {settings.model_provider}")

    def analyze(self, prompt: str) -> dict[str, object]:
        return self.provider.analyze(prompt)

    def chat(self, messages: list[dict[str, str]]) -> str:
        return self.provider.chat(messages)

    def summarize(self, text: str) -> str:
        return self.provider.summarize(text)

    def embed(self, text: str) -> list[float]:
        return self.provider.embed(text)
