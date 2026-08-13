# ActorFactory Architecture

This document describes the core architecture of the ActorFactory Engine.

## System Topology

```mermaid
flowchart TD
    UI[Downstream App / UI] -->|ProjectContext & Raw Input| API[FastAPI Gateway]
    API --> Assembler[Contextual Assembler]
    Assembler --> DB[(SQLite / Storage Layer)]
    DB -.->|Domain Profiles & Capabilities| Assembler
    Assembler --> LLM[LLM Gateway / Pluggable Provider]
    LLM -->|Streamed Output| UI
```

## Persona × Skill Composition

Based on the StoryForge design, actors are composed dynamically:

```mermaid
classDiagram
    class DomainActorProfile {
        +UUID id
        +String actor_name
        +String domain
        +List~String~ specializations
        +List~CapabilityIngredient~ composition
        +compile_actor_system_prompt() String
    }
    class CapabilityIngredient {
        +UUID id
        +String name
        +String ingredient_type
        +String core_logic_instruction
    }
    
    DomainActorProfile *-- CapabilityIngredient : "composes 1..N"
```

The system dynamically merges these capabilities at runtime based on the context request to generate highly constrained and specific instructions for Small Language Models (SLMs).
