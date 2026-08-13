from typing import Generator
from src.actor_factory.providers.base import ILLMProvider, LLMProviderRequest

class MockLLMProvider(ILLMProvider):
    """
    A mock provider for testing orchestration without hitting an actual LLM API.
    """
    def execute_completion(self, payload: LLMProviderRequest) -> str:
        return f"[MOCK COMPLETION]\nSystem: {payload.system_prompt[:50]}...\nUser: {payload.user_prompt[:50]}..."

    def execute_stream(self, payload: LLMProviderRequest) -> Generator[str, None, None]:
        response = self.execute_completion(payload)
        for chunk in response.split():
            yield chunk + " "
