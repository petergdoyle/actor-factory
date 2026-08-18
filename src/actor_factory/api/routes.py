import time
import httpx
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
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
    LLMProviderConfig,
    actor_to_capability,
    skill_to_capability,
    specialization_to_capability,
)
from src.actor_factory.orchestration.assembler import TeamOrchestrationRequest, ContextualAssembler
from src.actor_factory.providers.registry import ProviderRegistry
from src.actor_factory.providers.base import LLMProviderRequest
from src.actor_factory.storage.sqlite import SQLiteStorage
from src.actor_factory.storage.seed import seed_default_data
from src.actor_factory.llm.audit_logger import (
    log_llm_call,
    query_audit_logs,
    list_log_dates,
    get_audit_config,
    save_audit_config,
    DEFAULT_CALL_TYPES,
)

router = APIRouter(prefix="/api/v1")

# Dependency for storage
def get_storage():
    storage = SQLiteStorage()
    # Auto-seed on first load if database is empty
    seed_default_data(storage, force=False)
    return storage


# ──────────────────────────────────────────────
# STACK HEALTH ENDPOINT
# ──────────────────────────────────────────────
@router.get("/health/stack")
def check_stack_health(storage: SQLiteStorage = Depends(get_storage)):
    configs = storage.list_llm_configs()
    active_cfg = next((c for c in configs if c.is_active), None)
    if not active_cfg and configs:
        active_cfg = configs[0]

    llm_status = "offline"
    latency_ms = 0
    active_model_str = active_cfg.active_model if active_cfg else "mock"
    provider_name = active_cfg.name if active_cfg else "Mock (Testing)"

    if active_cfg:
        if active_cfg.provider_type == "mock":
            llm_status = "online"
        elif active_cfg.provider_type == "ollama":
            url = f"{(active_cfg.base_url or 'http://localhost:11434').rstrip('/')}/api/tags"
            t0 = time.time()
            try:
                with httpx.Client(timeout=3.0) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        llm_status = "online"
                        latency_ms = int((time.time() - t0) * 1000)
            except Exception:
                llm_status = "offline"
        elif active_cfg.api_key or active_cfg.base_url:
            llm_status = "online" if active_cfg.api_key else "unconfigured"

    return {
        "api_status": "online",
        "llm_status": llm_status,
        "active_provider": provider_name,
        "active_provider_id": active_cfg.id if active_cfg else "mock",
        "active_model": active_model_str,
        "base_url": active_cfg.base_url if active_cfg else None,
        "latency_ms": latency_ms,
        "timestamp": time.time()
    }


# ──────────────────────────────────────────────
# LLM AUDIT LOG ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/llm/audit-logs")
def list_audit_log_dates():
    """Returns available log dates and compressed archive file status."""
    return list_log_dates()

@router.get("/llm/audit-logs/search")
def search_audit_logs(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    call_type: Optional[str] = Query(None),
    search_query: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """
    Search audit log entries across date range (start_date -> end_date).
    Decompresses gzip archives on-demand for historical range queries.
    """
    return query_audit_logs(
        start_date=start_date,
        end_date=end_date,
        call_type=call_type,
        search_query=search_query,
        limit=limit
    )

@router.get("/llm/audit-logs/config")
def get_audit_logging_config():
    """Gets logging controls and disabled call-types."""
    config = get_audit_config()
    config["known_call_types"] = DEFAULT_CALL_TYPES
    return config

@router.put("/llm/audit-logs/config")
def update_audit_logging_config(config: Dict[str, Any]):
    """Updates audit logging controls configuration."""
    save_audit_config(config)
    return get_audit_config()


# ──────────────────────────────────────────────
# LLM PROVIDER CONFIG ENDPOINTS
# ──────────────────────────────────────────────
@router.get("/llm/configs", response_model=List[LLMProviderConfig])
def list_llm_configs(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_llm_configs()

@router.post("/llm/configs", response_model=LLMProviderConfig)
def save_llm_config(config: LLMProviderConfig, storage: SQLiteStorage = Depends(get_storage)):
    storage.save_llm_config(config)
    return config

@router.delete("/llm/configs/{config_id}")
def delete_llm_config(config_id: str, storage: SQLiteStorage = Depends(get_storage)):
    storage.delete_llm_config(config_id)
    return {"status": "deleted", "id": config_id}

class TestLLMPayload(BaseModel):
    config_id: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    provider_type: Optional[str] = None

@router.post("/llm/test")
def test_llm_connection(payload: TestLLMPayload, storage: SQLiteStorage = Depends(get_storage)):
    cfg = storage.get_llm_config(payload.config_id)
    base_url = payload.base_url or (cfg.base_url if cfg else None) or "http://localhost:11434"
    provider_type = payload.provider_type or (cfg.provider_type if cfg else "ollama")

    if provider_type == "mock":
        return {
            "status": "online",
            "message": "Mock provider active and operational.",
            "latency_ms": 1,
            "models": ["mock"]
        }
    elif provider_type == "ollama":
        url = f"{base_url.rstrip('/')}/api/tags"
        t0 = time.time()
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    latency = int((time.time() - t0) * 1000)
                    data = resp.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    if cfg:
                        cfg.status = "online"
                        cfg.available_models = models
                        storage.save_llm_config(cfg)
                    return {
                        "status": "online",
                        "message": f"Successfully connected to Ollama instance at {base_url}.",
                        "latency_ms": latency,
                        "models": models
                    }
                else:
                    return {
                        "status": "offline",
                        "message": f"Ollama returned HTTP status {resp.status_code}.",
                        "latency_ms": 0,
                        "models": []
                    }
        except Exception as e:
            if cfg:
                cfg.status = "offline"
                storage.save_llm_config(cfg)
            return {
                "status": "offline",
                "message": f"Could not connect to Ollama at {base_url}: {str(e)}",
                "latency_ms": 0,
                "models": []
            }
    else:
        has_key = bool(payload.api_key or (cfg and cfg.api_key))
        return {
            "status": "online" if has_key else "unconfigured",
            "message": "API key configured." if has_key else "API key missing.",
            "latency_ms": 15 if has_key else 0,
            "models": cfg.available_models if cfg else []
        }

class SetActiveLLMPayload(BaseModel):
    config_id: str
    active_model: str

@router.post("/llm/active")
def set_active_llm(payload: SetActiveLLMPayload, storage: SQLiteStorage = Depends(get_storage)):
    cfg = storage.get_llm_config(payload.config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="LLM config not found")
    
    cfg.is_active = True
    cfg.active_model = payload.active_model
    storage.save_llm_config(cfg)
    return {"status": "success", "active_config": cfg}


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

    base_persona_cap = actor_to_capability(actor)
    spec_caps = [specialization_to_capability(s) for s in specs]
    
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
    return {"status": "success", "message": "Default domains, actors, skills, specializations, and LLM configs seeded."}


# ──────────────────────────────────────────────
# LEGACY / ORCHESTRATION ENDPOINTS WITH AUDIT LOGGING
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
    call_type: str = "testbench_execution"
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

    provider_name = payload.model_id.split(":", 1)[0] if ":" in payload.model_id else payload.model_id
    model_name = payload.model_id.split(":", 1)[-1] if ":" in payload.model_id else payload.model_id

    modifiers = {
        "persona": actor.actor_name,
        "persona_title": actor.base_persona.name if hasattr(actor, 'base_persona') else actor.actor_name,
        "specializations": [sp.name for sp in actor.specializations] if hasattr(actor, 'specializations') else [],
        "skill": actor.skill.name if hasattr(actor, 'skill') else "Default Skill",
        "preamble_char_count": len(system_prompt)
    }
    domain_ctx = payload.request.domain_context.model_dump()
    
    # 4. Stream output with audit log wrapper
    try:
        provider = ProviderRegistry.get_provider(payload.model_id)
        stream_gen = provider.execute_stream(provider_req)

        def audit_logging_wrapper():
            full_response = []
            start_time = time.time()
            try:
                for chunk in stream_gen:
                    full_response.append(chunk)
                    yield chunk
            finally:
                duration_ms = int((time.time() - start_time) * 1000)
                response_text = "".join(full_response)
                call_id = f"{actor.actor_name.lower().replace(' ', '_')}/{payload.call_type}"
                
                log_llm_call(
                    call_type=payload.call_type,
                    call_id=call_id,
                    domain_context=domain_ctx,
                    prompt_modifiers=modifiers,
                    provider=provider_name,
                    model=model_name,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_text=response_text,
                    duration_ms=duration_ms
                )

        return StreamingResponse(audit_logging_wrapper(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
