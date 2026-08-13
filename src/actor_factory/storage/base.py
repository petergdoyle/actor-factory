from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from src.actor_factory.models.core import CapabilityIngredient, DomainActorProfile

class IStorageLayer(ABC):
    """
    Abstract Base Class defining the pluggable storage interface.
    """
    
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
