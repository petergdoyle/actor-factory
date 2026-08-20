"""AWS Bedrock LLM provider using the Converse API.

Uses the model-agnostic Converse API so any Bedrock model (Gemma, Claude,
Llama, Mistral, etc.) works without format-specific code paths.
"""

import json
import os
from typing import Generator

from src.actor_factory.providers.base import ILLMProvider, LLMProviderRequest


class BedrockProvider(ILLMProvider):
    """
    Provider for AWS Bedrock via the Converse API.

    Expects model_id format: "bedrock:<model-id>" e.g. "bedrock:google.gemma-3-27b-it"
    Uses IAM role credentials from the ECS task role (no explicit keys needed).
    """

    def __init__(self, region: str | None = None):
        self._region = region or os.environ.get("AWS_REGION", "us-west-2")

    def _get_model_id(self, model_id: str) -> str:
        """Strip the 'bedrock:' prefix to get the Bedrock model identifier."""
        if model_id.startswith("bedrock:"):
            return model_id[len("bedrock:"):]
        return model_id

    def _get_client(self):
        try:
            import boto3
        except ImportError:
            raise ImportError(
                "boto3 is required for Bedrock provider. "
                "Install with: pip install boto3"
            )
        return boto3.client("bedrock-runtime", region_name=self._region)

    def execute_completion(self, payload: LLMProviderRequest) -> str:
        """Generate completion via AWS Bedrock Converse API."""
        client = self._get_client()
        model_id = self._get_model_id(payload.model_id)

        messages = [{"role": "user", "content": [{"text": payload.user_prompt}]}]

        kwargs = {
            "modelId": model_id,
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": payload.max_tokens,
                "temperature": payload.temperature,
            },
        }
        if payload.system_prompt:
            kwargs["system"] = [{"text": payload.system_prompt}]

        response = client.converse(**kwargs)
        return response["output"]["message"]["content"][0]["text"]

    def execute_stream(self, payload: LLMProviderRequest) -> Generator[str, None, None]:
        """Stream completion via AWS Bedrock ConverseStream API."""
        client = self._get_client()
        model_id = self._get_model_id(payload.model_id)

        messages = [{"role": "user", "content": [{"text": payload.user_prompt}]}]

        kwargs = {
            "modelId": model_id,
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": payload.max_tokens,
                "temperature": payload.temperature,
            },
        }
        if payload.system_prompt:
            kwargs["system"] = [{"text": payload.system_prompt}]

        response = client.converse_stream(**kwargs)

        for event in response["stream"]:
            if "contentBlockDelta" in event:
                delta = event["contentBlockDelta"].get("delta", {})
                text = delta.get("text", "")
                if text:
                    yield text
