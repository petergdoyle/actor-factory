from abc import ABC, abstractmethod
from typing import Generator
from pydantic import BaseModel

class LLMProviderRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    model_id: str = "ollama:llama3"
    temperature: float = 0.2
    max_tokens: int = 4096

class ILLMProvider(ABC):
    @abstractmethod
    def execute_completion(self, payload: LLMProviderRequest) -> str:
        """Synchronous or blocking text generation."""
        pass

    @abstractmethod
    def execute_stream(self, payload: LLMProviderRequest) -> Generator[str, None, None]:
        """Server-Sent Event (SSE) compatible streaming generation."""
        pass
