from src.actor_factory.providers.base import ILLMProvider
from src.actor_factory.providers.factory import MockLLMProvider
from src.actor_factory.providers.ollama import OllamaProvider
from src.actor_factory.providers.bedrock import BedrockProvider

class ProviderRegistry:
    """
    Factory registry for creating LLM providers based on the model_id.
    """
    @staticmethod
    def get_provider(model_id: str) -> ILLMProvider:
        if model_id.startswith("ollama:"):
            return OllamaProvider()
        elif model_id.startswith("bedrock:"):
            return BedrockProvider()
        elif model_id == "mock":
            return MockLLMProvider()
        else:
            raise ValueError(f"Unsupported provider for model_id: {model_id}")
