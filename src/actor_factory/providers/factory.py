from typing import Generator, Optional
from src.actor_factory.providers.base import (
    ILLMProvider,
    LLMProviderRequest,
    LLMResult,
    TokenUsage,
    DETAIL_MINIMAL,
    resolve_detail_level,
)


class MockLLMProvider(ILLMProvider):
    """
    A mock provider for testing orchestration without hitting an actual LLM API.
    """
    def _text(self, payload: LLMProviderRequest) -> str:
        return (
            f"[MOCK COMPLETION]\nSystem: {payload.system_prompt[:50]}...\n"
            f"User: {payload.user_prompt[:50]}..."
        )

    def _result(self, payload: LLMProviderRequest, text: str) -> LLMResult:
        if resolve_detail_level() == DETAIL_MINIMAL:
            return LLMResult(text=text)
        prompt_t = len((payload.system_prompt + payload.user_prompt).split())
        completion_t = len(text.split())
        return LLMResult(
            text=text,
            tokens=TokenUsage(
                prompt=prompt_t,
                completion=completion_t,
                total=prompt_t + completion_t,
                approximate=True,  # mock estimates by word count
            ),
            finish_reason="stop",
            raw_meta={"provider": "mock"},
        )

    def execute_completion(self, payload: LLMProviderRequest) -> LLMResult:
        return self._result(payload, self._text(payload))

    def execute_stream(
        self, payload: LLMProviderRequest
    ) -> Generator[str, None, Optional[LLMResult]]:
        text = self._text(payload)
        for chunk in text.split():
            yield chunk + " "
        return self._result(payload, text)
