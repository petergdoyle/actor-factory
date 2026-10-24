from src.actor_factory.providers.base import ILLMProvider
from src.actor_factory.providers.factory import MockLLMProvider
from src.actor_factory.providers.ollama import OllamaProvider


class ProviderRegistry:
    """
    Factory registry for creating LLM providers based on the model_id.

    Supported providers (others are out of scope):
      - ``ollama:<model>``   → OllamaProvider (local)
      - ``bedrock:<modelId>``→ BedrockProvider (AWS, optional boto3)
      - ``mock``             → MockLLMProvider (testing)
    """
    @staticmethod
    def get_provider(model_id: str) -> ILLMProvider:
        if model_id.startswith("ollama:"):
            return OllamaProvider()
        if model_id.startswith("bedrock:"):
            # Imported here so boto3 stays an optional dependency.
            from src.actor_factory.providers.bedrock import BedrockProvider
            return BedrockProvider()
        if model_id == "mock":
            return MockLLMProvider()
        raise ValueError(f"Unsupported provider for model_id: {model_id}")
