import json
import httpx
from typing import Generator
from src.actor_factory.providers.base import ILLMProvider, LLMProviderRequest

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

    def execute_completion(self, payload: LLMProviderRequest) -> str:
        model = self._get_model_name(payload.model_id)
        url = f"{self.base_url}/api/generate"
        data = {
            "model": model,
            "system": payload.system_prompt,
            "prompt": payload.user_prompt,
            "stream": False,
            "options": {
                "temperature": payload.temperature,
                "num_predict": payload.max_tokens
            }
        }
        with httpx.Client() as client:
            response = client.post(url, json=data, timeout=120.0)
            if response.status_code == 404:
                available = self._fetch_available_models()
                # If there's an available model, try to use the first available model automatically
                if available:
                    data["model"] = available[0]
                    resp2 = client.post(url, json=data, timeout=120.0)
                    if resp2.status_code == 200:
                        return resp2.json().get("response", "")
                return f"[OLLAMA ERROR]: Model '{model}' not found in Ollama. Available pulled models: {', '.join(available) if available else 'None'}. Please run 'ollama pull {model}' or select an available model in LLM Configurations."
            response.raise_for_status()
            return response.json().get("response", "")

    def execute_stream(self, payload: LLMProviderRequest) -> Generator[str, None, None]:
        model = self._get_model_name(payload.model_id)
        url = f"{self.base_url}/api/generate"
        data = {
            "model": model,
            "system": payload.system_prompt,
            "prompt": payload.user_prompt,
            "stream": True,
            "options": {
                "temperature": payload.temperature,
                "num_predict": payload.max_tokens
            }
        }
        
        available = self._fetch_available_models()
        # If requested model isn't pulled, but we have an available model (e.g. gemma4:12b), auto-fallback to available model!
        if available and model not in available and f"{model}:latest" not in available:
            # Check if any model matches
            match = next((m for m in available if model in m or m in model), None)
            if match:
                model = match
            else:
                model = available[0]
            data["model"] = model
            yield f"ℹ️ [Auto-resolved model to '{model}']\n\n"

        # Streaming timeout policy: a short connect timeout (fail fast if Ollama
        # is down), but NO read timeout — a large local model can take minutes to
        # generate, and the stream must not be killed mid-generation. As long as
        # tokens keep arriving the connection stays open.
        timeout = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=10.0)
        produced_any = False
        with httpx.Client() as client:
            try:
                with client.stream("POST", url, json=data, timeout=timeout) as response:
                    if response.status_code == 404:
                        yield f"\n[OLLAMA ERROR]: Model '{model}' not found on Ollama server at {self.base_url}.\nAvailable models: {', '.join(available) if available else 'None'}.\nPlease run 'ollama pull {model}' or select an available model in LLM Configurations."
                        return
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if chunk.get("response"):
                                    produced_any = True
                                    yield chunk["response"]
                                # Surface an Ollama-reported error in the stream body.
                                if chunk.get("error"):
                                    yield f"\n[OLLAMA ERROR]: {chunk['error']}"
                                    produced_any = True
                            except json.JSONDecodeError:
                                continue
            except httpx.ConnectError:
                yield (
                    f"\n[OLLAMA CONNECTION ERROR]: Could not connect to Ollama at {self.base_url}. "
                    "Is the Ollama daemon running?"
                )
                return
            except Exception as e:
                yield f"\n[OLLAMA ERROR]: {type(e).__name__}: {str(e)}"
                return

        # A completed-but-empty stream is a real failure mode (model produced
        # nothing). Never end silently — tell the user what happened.
        if not produced_any:
            yield (
                f"\n[NO OUTPUT]: The model '{model}' returned an empty response. "
                "This can happen if the model is still loading, the prompt was rejected, "
                "or the model ran out of context. Try again, or select a different model."
            )
