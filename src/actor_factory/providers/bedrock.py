"""AWS Bedrock provider using the Converse API.

Converse is model-agnostic (Claude, Llama, Nova, …) and returns token usage and a
stop reason, so it maps cleanly onto the canonical :class:`LLMResult`. ``boto3`` is
imported lazily so Ollama-only installs don't need it — it's an optional extra.

Model id convention: ``bedrock:<modelId>``, e.g.
``bedrock:us.anthropic.claude-3-5-haiku-20241022-v1:0``.
"""

import os
from typing import Generator, Optional

from src.actor_factory.providers.base import (
    ILLMProvider,
    LLMProviderRequest,
    LLMResult,
    TokenUsage,
    DETAIL_MINIMAL,
    resolve_detail_level,
)


class BedrockProvider(ILLMProvider):
    def __init__(self, region: Optional[str] = None):
        self.region = region or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"

    def _client(self):
        # Lazy import: boto3 is an optional dependency (only needed for Bedrock).
        try:
            import boto3  # noqa: PLC0415
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "The Bedrock provider requires boto3. Install it, e.g. "
                "`uv pip install boto3` (or the 'bedrock' optional extra)."
            ) from e
        return boto3.client("bedrock-runtime", region_name=self.region)

    @staticmethod
    def _model_id(model_id: str) -> str:
        return model_id.split(":", 1)[1] if model_id.startswith("bedrock:") else model_id

    @staticmethod
    def _inference_config(payload: LLMProviderRequest) -> dict:
        cfg: dict = {"temperature": payload.temperature, "maxTokens": payload.max_tokens}
        if payload.top_p is not None:
            cfg["topP"] = payload.top_p
        return cfg

    def _build_kwargs(self, payload: LLMProviderRequest) -> dict:
        kwargs: dict = {
            "modelId": self._model_id(payload.model_id),
            "messages": [{"role": "user", "content": [{"text": payload.user_prompt}]}],
            "inferenceConfig": self._inference_config(payload),
        }
        if payload.system_prompt:
            kwargs["system"] = [{"text": payload.system_prompt}]
        return kwargs

    @staticmethod
    def _result_from_usage(text: str, usage: dict, stop_reason: Optional[str], minimal: bool) -> LLMResult:
        if minimal:
            return LLMResult(text=text)
        prompt_t = int((usage or {}).get("inputTokens", 0) or 0)
        completion_t = int((usage or {}).get("outputTokens", 0) or 0)
        total_t = int((usage or {}).get("totalTokens", prompt_t + completion_t) or 0)
        return LLMResult(
            text=text,
            tokens=TokenUsage(prompt=prompt_t, completion=completion_t, total=total_t, approximate=False),
            finish_reason=stop_reason,
            raw_meta={"api": "converse"},
        )

    def execute_completion(self, payload: LLMProviderRequest) -> LLMResult:
        minimal = resolve_detail_level() == DETAIL_MINIMAL
        try:
            resp = self._client().converse(**self._build_kwargs(payload))
        except Exception as e:
            return LLMResult(text=f"[BEDROCK ERROR]: {type(e).__name__}: {e}", finish_reason="error")
        blocks = resp.get("output", {}).get("message", {}).get("content", [])
        text = "".join(b.get("text", "") for b in blocks)
        return self._result_from_usage(text, resp.get("usage", {}), resp.get("stopReason"), minimal)

    def execute_stream(
        self, payload: LLMProviderRequest
    ) -> Generator[str, None, Optional[LLMResult]]:
        minimal = resolve_detail_level() == DETAIL_MINIMAL
        collected: list[str] = []
        usage: dict = {}
        stop_reason: Optional[str] = None
        try:
            resp = self._client().converse_stream(**self._build_kwargs(payload))
        except Exception as e:
            msg = f"[BEDROCK ERROR]: {type(e).__name__}: {e}"
            yield msg
            return LLMResult(text=msg, finish_reason="error")

        try:
            for event in resp.get("stream", []):
                if "contentBlockDelta" in event:
                    text = event["contentBlockDelta"].get("delta", {}).get("text", "")
                    if text:
                        collected.append(text)
                        yield text
                elif "messageStop" in event:
                    stop_reason = event["messageStop"].get("stopReason")
                elif "metadata" in event and not minimal:
                    usage = event["metadata"].get("usage", {}) or usage
        except Exception as e:
            msg = f"\n[BEDROCK STREAM ERROR]: {type(e).__name__}: {e}"
            yield msg
            return LLMResult(text="".join(collected) + msg, finish_reason="error")

        text = "".join(collected)
        if not text:
            msg = "\n[NO OUTPUT]: Bedrock returned an empty response."
            yield msg
            return LLMResult(text=msg, finish_reason="empty")
        if minimal:
            return LLMResult(text=text)
        return self._result_from_usage(text, usage, stop_reason, minimal=False)
