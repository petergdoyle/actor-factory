from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID

from src.actor_factory.models.core import (
    CapabilityIngredient,
    DomainActorProfile,
    DomainContext,
    Domain,
    Actor,
    Skill,
    Specialization,
    Composition,
    actor_to_capability,
    skill_to_capability,
    specialization_to_capability,
)
from src.actor_factory.orchestration.assembler import TeamOrchestrationRequest, ContextualAssembler
from src.actor_factory.providers.registry import ProviderRegistry
from src.actor_factory.providers.base import LLMProviderRequest
from src.actor_factory.storage.sqlite import SQLiteStorage
from src.actor_factory.storage.seed import seed_default_data

router = APIRouter(prefix="/api/v1")

# Dependency for storage
def get_storage():
    storage = SQLiteStorage()
    # Auto-seed on first load if database is empty
    seed_default_data(storage, force=False)
    return storage


# ──────────────────────────────────────────────
# DOMAIN ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/domains", response_model=List[Domain])
def list_domains(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_domains()

@router.post("/domains", response_model=Domain)
def save_domain(domain: Domain, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_domain(domain)
    return domain

@router.delete("/domains/{domain_id}")
def delete_domain(domain_id: UUID, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_domain(domain_id)
    return {"status": "deleted", "id": domain_id}


# ──────────────────────────────────────────────
# ACTOR ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/actors", response_model=List[Actor])
def list_actors(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_actors()

@router.post("/actors", response_model=Actor)
def save_actor(actor: Actor, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_actor(actor)
    return actor

@router.delete("/actors/{actor_id}")
def delete_actor(actor_id: UUID, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_actor(actor_id)
    return {"status": "deleted", "id": actor_id}


# ──────────────────────────────────────────────
# SKILL ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/skills", response_model=List[Skill])
def list_skills(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_skills()

@router.post("/skills", response_model=Skill)
def save_skill(skill: Skill, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_skill(skill)
    return skill

@router.delete("/skills/{skill_id}")
def delete_skill(skill_id: UUID, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_skill(skill_id)
    return {"status": "deleted", "id": skill_id}


# ──────────────────────────────────────────────
# SPECIALIZATION ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/specializations", response_model=List[Specialization])
def list_specializations(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_specializations()

@router.post("/specializations", response_model=Specialization)
def save_specialization(spec: Specialization, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_specialization(spec)
    return spec

@router.delete("/specializations/{spec_id}")
def delete_specialization(spec_id: UUID, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_specialization(spec_id)
    return {"status": "deleted", "id": spec_id}


# ──────────────────────────────────────────────
# COMPOSITION ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/compositions", response_model=List[Composition])
def list_compositions(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_compositions()

@router.post("/compositions", response_model=Composition)
def save_composition(comp: Composition, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_composition(comp)
    return comp

@router.delete("/compositions/{comp_id}")
def delete_composition(comp_id: UUID, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_composition(comp_id)
    return {"status": "deleted", "id": comp_id}


class ComposePreviewPayload(BaseModel):
    actor_id: UUID
    skill_ids: List[UUID] = []
    specialization_ids: List[UUID] = []

@router.post("/compose/preview")
def preview_composition(payload: ComposePreviewPayload, storage: SQLiteStorage = Depends(get_storage)):
    actor = storage.get_actor(payload.actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    skills = [storage.get_skill(sid) for sid in payload.skill_ids]
    skills = [s for s in skills if s is not None]

    specs = [storage.get_specialization(sp_id) for sp_id in payload.specialization_ids]
    specs = [s for s in specs if s is not None]

    # Build compiled system prompt
    base_persona_cap = actor_to_capability(actor)
    spec_caps = [specialization_to_capability(s) for s in specs]
    
    # Pick primary skill or merge skills
    if skills:
        skill_cap = skill_to_capability(skills[0])
    else:
        skill_cap = CapabilityIngredient(
            name="General Response",
            ingredient_type="Skill",
            core_logic_instruction="Provide a structured, accurate response."
        )

    profile = DomainActorProfile(
        actor_name=actor.title or actor.name,
        base_persona=base_persona_cap,
        specializations=spec_caps,
        skill=skill_cap
    )

    compiled_prompt = profile.compile_actor_system_prompt()
    return {
        "actor_name": actor.name,
        "compiled_prompt": compiled_prompt,
        "profile": profile.model_dump(mode="json")
    }


@router.post("/seed")
def seed_data(storage: SQLiteStorage = Depends(get_storage)):
    seed_default_data(storage, force=True)
    return {"status": "success", "message": "Default domains, actors, skills, and specializations seeded."}


# ──────────────────────────────────────────────
# LEGACY / ORCHESTRATION ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/capabilities", response_model=List[CapabilityIngredient])
def list_capabilities(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_capabilities()

@router.get("/profiles", response_model=List[DomainActorProfile])
def list_profiles(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_profiles()

class OrchestratePayload(BaseModel):
    model_id: str = "mock"
    temperature: float = 0.2
    request: TeamOrchestrationRequest

@router.post("/orchestrate")
def orchestrate(payload: OrchestratePayload):
    if not payload.request.target_actors:
        raise HTTPException(status_code=400, detail="Must provide at least one target actor")
    
    actor = payload.request.target_actors[0]
    
    # 1. Compile System Prompt
    system_prompt = actor.compile_actor_system_prompt()
    
    # 2. Compile User Prompt
    user_prompt = ContextualAssembler.compile_user_prompt(
        context=payload.request.domain_context,
        raw_input=payload.request.raw_user_input
    )
    
    # 3. Create Provider Request
    provider_req = LLMProviderRequest(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model_id=payload.model_id,
        temperature=payload.temperature
    )
    
    # 4. Stream output
    try:
        provider = ProviderRegistry.get_provider(payload.model_id)
        stream_gen = provider.execute_stream(provider_req)
        return StreamingResponse(stream_gen, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
