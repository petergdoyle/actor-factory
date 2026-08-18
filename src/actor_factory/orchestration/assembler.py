from typing import List, Optional
from pydantic import BaseModel

from src.actor_factory.models.core import DomainActorProfile, DomainContext

class TeamOrchestrationRequest(BaseModel):
    domain_context: DomainContext
    raw_user_input: str
    target_actors: List[DomainActorProfile]
    supplemental_reference: Optional[str] = None

class ContextualAssembler:
    @staticmethod
    def compile_user_prompt(context: DomainContext, raw_input: str, supplemental_reference: Optional[str] = None) -> str:
        prompt = [
            f"Analyze the following raw input within the structural operational context of the {context.domain_name} domain.",
            "DOMAIN PARAMETERS:"
        ]
        
        for key, value in context.parameters.items():
            prompt.append(f"- {key}: {value}")
            
        if supplemental_reference and supplemental_reference.strip():
            prompt.append("\nSUPPLEMENTAL REFERENCE MATERIAL / PRESCRIBED RUBRIC:")
            prompt.append("---")
            prompt.append(supplemental_reference.strip())
            prompt.append("---")

        prompt.append("\nRAW PROJECT INPUT PAYLOAD / SUBMISSION TO EVALUATE:")
        prompt.append("---")
        prompt.append(raw_input)
        prompt.append("---")
        
        return "\n".join(prompt)
