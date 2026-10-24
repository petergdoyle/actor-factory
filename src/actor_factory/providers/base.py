from abc import ABC, abstractmethod
from typing import Generator, Optional
from pydantic import BaseModel, Field


class LLMProviderRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    model_id: str = "ollama:gemma3:12b"
    temperature: float = 0.2
    top_p: Optional[float] = None
    max_tokens: int = 4096
    seed: Optional[int] = None


class TokenUsage(BaseModel):
    """Token counts for a call. ``approximate`` marks word-count fallbacks so a
    consumer can tell real provider counts from estimates."""

    prompt: int = 0
    completion: int = 0
    total: int = 0
    approximate: bool = False


class LLMResult(BaseModel):
    """The rich result of an LLM call — the canonical return shape for providers.

    ``text`` is always present. The rest is **best-effort, maximal by default**:
    providers populate everything they can (tokens, finish_reason, provider-side
    timing, and any extra metadata). A provider that cannot supply a field leaves
    it at its default, and the audit layer approximates where needed.
    """

    text: str = ""
    tokens: TokenUsage = Field(default_factory=TokenUsage)
    finish_reason: Optional[str] = None
    # Provider-reported wall time in ms, when available (distinct from the
    # route's own wall-clock measurement).
    provider_duration_ms: Optional[int] = None
    # Any extra provider-native metadata (kept for debugging / future use).
    raw_meta: dict = Field(default_factory=dict)


# Detail levels for what a provider captures and returns.
#   "maximal" (default) — capture tokens, finish_reason, provider timing, raw_meta.
#   "minimal"           — capture only the generated text; skip metadata parsing.
# Set globally via the ACTORFACTORY_PROVIDER_DETAIL env var.
DETAIL_MAXIMAL = "maximal"
DETAIL_MINIMAL = "minimal"


def resolve_detail_level() -> str:
    """Return the configured provider detail level (maximal by default).

    Controlled by ``ACTORFACTORY_PROVIDER_DETAIL``; any value other than
    ``minimal`` (case-insensitive) resolves to ``maximal``.
    """
    import os

    val = os.getenv("ACTORFACTORY_PROVIDER_DETAIL", DETAIL_MAXIMAL).strip().lower()
    return DETAIL_MINIMAL if val == DETAIL_MINIMAL else DETAIL_MAXIMAL


class ILLMProvider(ABC):
    @abstractmethod
    def execute_completion(self, payload: LLMProviderRequest) -> LLMResult:
        """Synchronous/blocking generation. Returns a rich :class:`LLMResult`."""
        ...

    @abstractmethod
    def execute_stream(
        self, payload: LLMProviderRequest
    ) -> Generator[str, None, Optional[LLMResult]]:
        """SSE-compatible streaming generation.

        Yields text chunks. When the stream completes, the generator **returns**
        (via ``StopIteration.value``) a rich :class:`LLMResult` carrying the final
        tokens/finish_reason/metadata — so a caller can both stream the text live
        and capture full stats once the stream ends. Callers that only want text
        can ignore the return value.
        """
        ...
