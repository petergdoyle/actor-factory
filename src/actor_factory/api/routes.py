from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel

from src.actor_factory.models.core import CapabilityIngredient, DomainActorProfile, DomainContext
from src.actor_factory.orchestration.assembler import TeamOrchestrationRequest, ContextualAssembler
from src.actor_factory.providers.registry import ProviderRegistry
from src.actor_factory.providers.base import LLMProviderRequest
from src.actor_factory.storage.sqlite import SQLiteStorage

router = APIRouter(prefix="/api/v1")

# Dependency for storage
def get_storage():
    return SQLiteStorage()

@router.get("/capabilities", response_model=List[CapabilityIngredient])
def list_capabilities(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_capabilities()

@router.get("/profiles", response_model=List[DomainActorProfile])
def list_profiles(storage: SQLiteStorage = Depends(get_storage)):
    return storage.list_profiles()

class OrchestratePayload(BaseModel):
    model_id: str = "ollama:llama3"
    temperature: float = 0.2
    request: TeamOrchestrationRequest

@router.post("/orchestrate")
def orchestrate(payload: OrchestratePayload):
    # Just grab the first target actor for simplicity right now
    if not payload.request.target_actors:
        raise HTTPException(status_code=400, detail="Must provide at least one target actor")
    
    actor = payload.request.target_actors[0]
    
    # 1. Compile System Prompt (Persona + Skills + Validators)
    system_prompt = actor.compile_actor_system_prompt()
    
    # 2. Compile User Prompt (Context + Raw Input)
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
    
    # 4. Get Provider and Stream
    try:
        provider = ProviderRegistry.get_provider(payload.model_id)
        stream_gen = provider.execute_stream(provider_req)
        return StreamingResponse(stream_gen, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
