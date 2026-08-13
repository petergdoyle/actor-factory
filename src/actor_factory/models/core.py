from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from uuid import UUID, uuid4

class CapabilityIngredient(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    ingredient_type: Literal["Persona", "Specialization", "Skill", "Validator"]
    core_logic_instruction: str

class DomainActorProfile(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    actor_name: str
    
    # The Matrix Components
    base_persona: CapabilityIngredient
    specializations: List[CapabilityIngredient]
    skill: CapabilityIngredient
    
    def compile_actor_system_prompt(self) -> str:
        instructions = [f"Act as a professional {self.actor_name}."]
        
        # 1. Identity
        instructions.append(f"\nYOUR IDENTITY & CORE CONCERNS:")
        instructions.append(self.base_persona.core_logic_instruction)
        
        # 2. Expertise
        if self.specializations:
            instructions.append(f"\nYOUR EXPERTISE & CONSTRAINTS:")
            for spec in self.specializations:
                instructions.append(f"[{spec.name}]: {spec.core_logic_instruction}")
                
        # 3. Task Format
        instructions.append(f"\nCURRENT TASK FORMAT & QUALITY CRITERIA:")
        instructions.append(f"[{self.skill.name}]: {self.skill.core_logic_instruction}")
        
        return "\n".join(instructions)

class DomainContext(BaseModel):
    domain_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
