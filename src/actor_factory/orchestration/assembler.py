from typing import List
from pydantic import BaseModel

from src.actor_factory.models.core import DomainActorProfile, DomainContext

class TeamOrchestrationRequest(BaseModel):
    domain_context: DomainContext
    raw_user_input: str
    target_actors: List[DomainActorProfile]

class ContextualAssembler:
    @staticmethod
    def compile_user_prompt(context: DomainContext, raw_input: str) -> str:
        prompt = [
            f"Analyze the following raw input within the structural operational context of the {context.domain_name} domain.",
            "DOMAIN PARAMETERS:"
        ]
        
        for key, value in context.parameters.items():
            prompt.append(f"- {key}: {value}")
            
        prompt.append("\nRaw Project Input Payload:")
        prompt.append("---")
        prompt.append(raw_input)
        prompt.append("---")
        
        return "\n".join(prompt)
