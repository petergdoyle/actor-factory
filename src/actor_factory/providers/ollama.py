import json
import httpx
from typing import Generator
from src.actor_factory.providers.base import ILLMProvider, LLMProviderRequest

class OllamaProvider(ILLMProvider):
    """
    Provider for local Ollama instances.
    """
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip("/")

    def _get_model_name(self, model_id: str) -> str:
        # Expected format "ollama:model_name", e.g., "ollama:llama3"
        return model_id.split(":", 1)[-1] if ":" in model_id else model_id

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
        with httpx.Client() as client:
            with client.stream("POST", url, json=data, timeout=120.0) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            if "response" in chunk:
                                yield chunk["response"]
                        except json.JSONDecodeError:
                            continue
