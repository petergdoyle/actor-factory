from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from uuid import UUID, uuid4


# ──────────────────────────────────────────────
# Domain
# ──────────────────────────────────────────────

class Domain(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str = ""
    parameters: Dict[str, Any] = Field(default_factory=dict)


# ──────────────────────────────────────────────
# Actor (Persona)
# ──────────────────────────────────────────────

class Actor(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    title: str = ""
    description: str = ""
    domain_id: Optional[UUID] = None
    core_concerns: List[str] = Field(default_factory=list)
    vocabulary: str = ""
    thinking_patterns: List[str] = Field(default_factory=list)
    quality_criteria: List[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Skill
# ──────────────────────────────────────────────

class Skill(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str = ""
    output_format: str = ""
    validation_level: Literal["machine", "structural", "heuristic", "human"] = "heuristic"
    validation_rules: List[str] = Field(default_factory=list)
    quality_patterns: List[str] = Field(default_factory=list)
    anti_patterns: List[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Specialization
# ──────────────────────────────────────────────

class Specialization(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str = ""
    services_and_patterns: str = ""
    constraints: List[str] = Field(default_factory=list)
    examples: List[str] = Field(default_factory=list)
    detection_keywords: List[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Composition (saved actor profile linking entities)
# ──────────────────────────────────────────────

class Composition(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    actor_id: UUID
    skill_ids: List[UUID] = Field(default_factory=list)
    specialization_ids: List[UUID] = Field(default_factory=list)


# ──────────────────────────────────────────────
# LLM Provider Configuration
# ──────────────────────────────────────────────

class LLMProviderConfig(BaseModel):
    id: str  # e.g., "ollama_local", "ollama_remote", "openai", "anthropic", "bedrock", "mock"
    name: str  # e.g., "Ollama (Local)"
    provider_type: Literal["ollama", "openai", "anthropic", "bedrock", "mock"]
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    active_model: str = "mock"
    is_active: bool = False
    status: Literal["online", "offline", "unconfigured"] = "unconfigured"
    available_models: List[str] = Field(default_factory=list)


# ──────────────────────────────────────────────
# Backward-compatible models (existing orchestration)
# ──────────────────────────────────────────────

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


# ──────────────────────────────────────────────
# Helper: Convert rich models → CapabilityIngredient for orchestration
# ──────────────────────────────────────────────

def actor_to_capability(actor: Actor) -> CapabilityIngredient:
    """Convert a rich Actor model to a CapabilityIngredient for prompt compilation."""
    instruction_parts = []
    if actor.description:
        instruction_parts.append(actor.description)
    if actor.core_concerns:
        instruction_parts.append("\nCORE CONCERNS:")
        for concern in actor.core_concerns:
            instruction_parts.append(f"- {concern}")
    if actor.vocabulary:
        instruction_parts.append(f"\nVOCABULARY: {actor.vocabulary}")
    if actor.thinking_patterns:
        instruction_parts.append("\nTHINKING PATTERNS:")
        for pattern in actor.thinking_patterns:
            instruction_parts.append(f"- {pattern}")
    if actor.quality_criteria:
        instruction_parts.append("\nQUALITY CRITERIA:")
        for criterion in actor.quality_criteria:
            instruction_parts.append(f"- {criterion}")
    
    return CapabilityIngredient(
        id=actor.id,
        name=actor.title or actor.name,
        ingredient_type="Persona",
        core_logic_instruction="\n".join(instruction_parts)
    )

def skill_to_capability(skill: Skill) -> CapabilityIngredient:
    """Convert a rich Skill model to a CapabilityIngredient for prompt compilation."""
    instruction_parts = []
    if skill.description:
        instruction_parts.append(skill.description)
    if skill.output_format:
        instruction_parts.append(f"\nOUTPUT FORMAT: {skill.output_format}")
    if skill.validation_rules:
        instruction_parts.append("\nVALIDATION RULES:")
        for rule in skill.validation_rules:
            instruction_parts.append(f"- {rule}")
    if skill.quality_patterns:
        instruction_parts.append("\nQUALITY PATTERNS:")
        for pattern in skill.quality_patterns:
            instruction_parts.append(f"✓ {pattern}")
    if skill.anti_patterns:
        instruction_parts.append("\nANTI-PATTERNS:")
        for pattern in skill.anti_patterns:
            instruction_parts.append(f"✗ {pattern}")
    
    return CapabilityIngredient(
        id=skill.id,
        name=skill.name,
        ingredient_type="Skill",
        core_logic_instruction="\n".join(instruction_parts)
    )

def specialization_to_capability(spec: Specialization) -> CapabilityIngredient:
    """Convert a rich Specialization model to a CapabilityIngredient for prompt compilation."""
    instruction_parts = []
    if spec.description:
        instruction_parts.append(spec.description)
    if spec.services_and_patterns:
        instruction_parts.append(f"\nSERVICES & PATTERNS: {spec.services_and_patterns}")
    if spec.constraints:
        instruction_parts.append("\nCONSTRAINTS:")
        for c in spec.constraints:
            instruction_parts.append(f"- {c}")
    if spec.examples:
        instruction_parts.append("\nEXAMPLES:")
        for ex in spec.examples:
            instruction_parts.append(f"- {ex}")
    
    return CapabilityIngredient(
        id=spec.id,
        name=spec.name,
        ingredient_type="Specialization",
        core_logic_instruction="\n".join(instruction_parts)
    )
