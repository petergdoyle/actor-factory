import json
import httpx
from typing import Generator, Optional
from src.actor_factory.providers.base import (
    ILLMProvider,
    LLMProviderRequest,
    LLMResult,
    TokenUsage,
    DETAIL_MINIMAL,
    resolve_detail_level,
)


class OllamaProvider(ILLMProvider):
    """
    Provider for local Ollama instances with auto model resolution & friendly error handling.
    """
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")

    def _get_model_name(self, model_id: str) -> str:
        # Expected format "ollama:model_name", e.g., "ollama:gemma3:12b" or "gemma3:12b"
        return model_id.split(":", 1)[-1] if ":" in model_id and not model_id.startswith("ollama:") else (
            model_id.replace("ollama:", "") if model_id.startswith("ollama:") else model_id
        )

    def _fetch_available_models(self) -> list[str]:
        try:
            url = f"{self.base_url}/api/tags"
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            pass
        return []

    def _options(self, payload: LLMProviderRequest) -> dict:
        opts: dict = {
            "temperature": payload.temperature,
            "num_predict": payload.max_tokens,
        }
        if payload.top_p is not None:
            opts["top_p"] = payload.top_p
        if payload.seed is not None:
            opts["seed"] = payload.seed
        return opts

    @staticmethod
    def _result_from_final(final: dict, text: str, minimal: bool) -> LLMResult:
        """Build an LLMResult from Ollama's final (done) JSON object."""
        if minimal:
            return LLMResult(text=text)
        prompt_t = int(final.get("prompt_eval_count", 0) or 0)
        completion_t = int(final.get("eval_count", 0) or 0)
        total_dur_ns = final.get("total_duration")
        provider_ms = int(total_dur_ns / 1_000_000) if total_dur_ns else None
        return LLMResult(
            text=text,
            tokens=TokenUsage(
                prompt=prompt_t,
                completion=completion_t,
                total=prompt_t + completion_t,
                approximate=False,
            ),
            finish_reason=final.get("done_reason"),
            provider_duration_ms=provider_ms,
            raw_meta={
                k: final.get(k)
                for k in ("load_duration", "prompt_eval_duration", "eval_duration", "model")
                if final.get(k) is not None
            },
        )

    def execute_completion(self, payload: LLMProviderRequest) -> LLMResult:
        minimal = resolve_detail_level() == DETAIL_MINIMAL
        model = self._get_model_name(payload.model_id)
        url = f"{self.base_url}/api/generate"
        data = {
            "model": model,
            "system": payload.system_prompt,
            "prompt": payload.user_prompt,
            "stream": False,
            "options": self._options(payload),
        }
        with httpx.Client() as client:
            response = client.post(url, json=data, timeout=120.0)
            if response.status_code == 404:
                available = self._fetch_available_models()
                if available:
                    data["model"] = available[0]
                    resp2 = client.post(url, json=data, timeout=120.0)
                    if resp2.status_code == 200:
                        body = resp2.json()
                        return self._result_from_final(body, body.get("response", ""), minimal)
                return LLMResult(
                    text=(
                        f"[OLLAMA ERROR]: Model '{model}' not found in Ollama. "
                        f"Available pulled models: {', '.join(available) if available else 'None'}. "
                        f"Please run 'ollama pull {model}' or select an available model in LLM Configurations."
                    ),
                    finish_reason="error",
                )
            response.raise_for_status()
            body = response.json()
            return self._result_from_final(body, body.get("response", ""), minimal)

    def execute_stream(
        self, payload: LLMProviderRequest
    ) -> Generator[str, None, Optional[LLMResult]]:
        minimal = resolve_detail_level() == DETAIL_MINIMAL
        model = self._get_model_name(payload.model_id)
        url = f"{self.base_url}/api/generate"
        data = {
            "model": model,
            "system": payload.system_prompt,
            "prompt": payload.user_prompt,
            "stream": True,
            "options": self._options(payload),
        }

        available = self._fetch_available_models()
        # If requested model isn't pulled, but we have an available model, auto-fallback.
        if available and model not in available and f"{model}:latest" not in available:
            match = next((m for m in available if model in m or m in model), None)
            model = match if match else available[0]
            data["model"] = model
            yield f"ℹ️ [Auto-resolved model to '{model}']\n\n"

        # Streaming timeout policy: short connect timeout (fail fast if Ollama is
        # down), but NO read timeout — a large local model can take minutes to
        # generate, and the stream must not be killed mid-generation.
        timeout = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=10.0)
        produced_any = False
        collected: list[str] = []
        final_obj: dict = {}
        with httpx.Client() as client:
            try:
                with client.stream("POST", url, json=data, timeout=timeout) as response:
                    if response.status_code == 404:
                        msg = (
                            f"\n[OLLAMA ERROR]: Model '{model}' not found on Ollama server at {self.base_url}.\n"
                            f"Available models: {', '.join(available) if available else 'None'}.\n"
                            f"Please run 'ollama pull {model}' or select an available model in LLM Configurations."
                        )
                        yield msg
                        return LLMResult(text=msg, finish_reason="error")
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if chunk.get("response"):
                            produced_any = True
                            text = chunk["response"]
                            collected.append(text)
                            yield text
                        if chunk.get("error"):
                            err = f"\n[OLLAMA ERROR]: {chunk['error']}"
                            collected.append(err)
                            produced_any = True
                            yield err
                        # Ollama marks the final summary object with done=true.
                        if chunk.get("done") and not minimal:
                            final_obj = chunk
            except httpx.ConnectError:
                msg = (
                    f"\n[OLLAMA CONNECTION ERROR]: Could not connect to Ollama at {self.base_url}. "
                    "Is the Ollama daemon running?"
                )
                yield msg
                return LLMResult(text="".join(collected) + msg, finish_reason="error")
            except Exception as e:
                msg = f"\n[OLLAMA ERROR]: {type(e).__name__}: {str(e)}"
                yield msg
                return LLMResult(text="".join(collected) + msg, finish_reason="error")

        # A completed-but-empty stream is a real failure mode. Never end silently.
        if not produced_any:
            msg = (
                f"\n[NO OUTPUT]: The model '{model}' returned an empty response. "
                "This can happen if the model is still loading, the prompt was rejected, "
                "or the model ran out of context. Try again, or select a different model."
            )
            yield msg
            return LLMResult(text=msg, finish_reason="empty")

        text = "".join(collected)
        if minimal or not final_obj:
            return LLMResult(text=text)
        return self._result_from_final(final_obj, text, minimal=False)
