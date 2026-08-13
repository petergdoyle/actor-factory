import pytest
from src.actor_factory.models.core import CapabilityIngredient, DomainActorProfile, DomainContext
from src.actor_factory.orchestration.assembler import ContextualAssembler

def test_actor_system_prompt_compilation():
    persona = CapabilityIngredient(
        name="High School Evaluator",
        ingredient_type="Persona",
        core_logic_instruction="You are an expert high school teacher evaluating student performance."
    )
    spec = CapabilityIngredient(
        name="Math Assessment",
        ingredient_type="Specialization",
        core_logic_instruction="You specialize in algebraic step-by-step verification."
    )
    skill = CapabilityIngredient(
        name="Assessment Grading",
        ingredient_type="Skill",
        core_logic_instruction="Output a final grade from A-F with justifications."
    )
    
    profile = DomainActorProfile(
        actor_name="Senior Math Evaluator",
        base_persona=persona,
        specializations=[spec],
        skill=skill
    )
    
    prompt = profile.compile_actor_system_prompt()
    
    assert "Act as a professional Senior Math Evaluator." in prompt
    assert "YOUR IDENTITY & CORE CONCERNS:" in prompt
    assert "You are an expert high school teacher" in prompt
    assert "[Math Assessment]" in prompt
    assert "algebraic step-by-step verification" in prompt
    assert "[Assessment Grading]" in prompt

def test_contextual_assembler():
    context = DomainContext(
        domain_name="Public School Education",
        parameters={
            "school_district": "Austin ISD",
            "rubric_type": "standardized_v2",
            "subject": "Algebra 1"
        }
    )
    
    raw_input = "Student essay: I think the answer is 42 because 6x7=42."
    compiled = ContextualAssembler.compile_user_prompt(context, raw_input)
    
    assert "Public School Education domain" in compiled
    assert "school_district: Austin ISD" in compiled
    assert "rubric_type: standardized_v2" in compiled
    assert "Student essay:" in compiled
