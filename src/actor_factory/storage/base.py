from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from src.actor_factory.models.core import (
    CapabilityIngredient,
    DomainActorProfile,
    Domain,
    Actor,
    Skill,
    Specialization,
    Composition,
)

class IStorageLayer(ABC):
    """
    Abstract Base Class defining the pluggable storage interface.
    """
    
    # ── Domain ──
    @abstractmethod
    def list_domains(self) -> List[Domain]:
        pass

    @abstractmethod
    def get_domain(self, domain_id: UUID) -> Optional[Domain]:
        pass

    @abstractmethod
    def save_domain(self, domain: Domain) -> None:
        pass

    @abstractmethod
    def delete_domain(self, domain_id: UUID) -> None:
        pass

    # ── Actor ──
    @abstractmethod
    def list_actors(self) -> List[Actor]:
        pass

    @abstractmethod
    def get_actor(self, actor_id: UUID) -> Optional[Actor]:
        pass

    @abstractmethod
    def save_actor(self, actor: Actor) -> None:
        pass

    @abstractmethod
    def delete_actor(self, actor_id: UUID) -> None:
        pass

    # ── Skill ──
    @abstractmethod
    def list_skills(self) -> List[Skill]:
        pass

    @abstractmethod
    def get_skill(self, skill_id: UUID) -> Optional[Skill]:
        pass

    @abstractmethod
    def save_skill(self, skill: Skill) -> None:
        pass

    @abstractmethod
    def delete_skill(self, skill_id: UUID) -> None:
        pass

    # ── Specialization ──
    @abstractmethod
    def list_specializations(self) -> List[Specialization]:
        pass

    @abstractmethod
    def get_specialization(self, spec_id: UUID) -> Optional[Specialization]:
        pass

    @abstractmethod
    def save_specialization(self, spec: Specialization) -> None:
        pass

    @abstractmethod
    def delete_specialization(self, spec_id: UUID) -> None:
        pass

    # ── Composition ──
    @abstractmethod
    def list_compositions(self) -> List[Composition]:
        pass

    @abstractmethod
    def get_composition(self, comp_id: UUID) -> Optional[Composition]:
        pass

    @abstractmethod
    def save_composition(self, comp: Composition) -> None:
        pass

    @abstractmethod
    def delete_composition(self, comp_id: UUID) -> None:
        pass

    # ── Legacy Capabilities / Profiles ──
    @abstractmethod
    def get_capability(self, capability_id: UUID) -> Optional[CapabilityIngredient]:
        pass

    @abstractmethod
    def list_capabilities(self) -> List[CapabilityIngredient]:
        pass

    @abstractmethod
    def save_capability(self, capability: CapabilityIngredient) -> None:
        pass

    @abstractmethod
    def get_profile(self, profile_id: UUID) -> Optional[DomainActorProfile]:
        pass

    @abstractmethod
    def list_profiles(self) -> List[DomainActorProfile]:
        pass

    @abstractmethod
    def save_profile(self, profile: DomainActorProfile) -> None:
        pass
