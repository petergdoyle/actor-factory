from src.actor_factory.providers.base import ILLMProvider
from src.actor_factory.providers.factory import MockLLMProvider
from src.actor_factory.providers.ollama import OllamaProvider

class ProviderRegistry:
    """
    Factory registry for creating LLM providers based on the model_id.
    """
    @staticmethod
    def get_provider(model_id: str) -> ILLMProvider:
        if model_id.startswith("ollama:"):
            return OllamaProvider()
        elif model_id == "mock":
            return MockLLMProvider()
        else:
            # Fallback or future cloud providers (e.g., openai:, bedrock:)
            raise ValueError(f"Unsupported provider for model_id: {model_id}")
