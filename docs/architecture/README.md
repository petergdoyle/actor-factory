# Architecture

[← Back to the ActorFactory README](../../README.md)

Internal architecture and AI-engineering documentation for ActorFactory — the core
topology, data models, storage, seeding, and the prompt/composition design.

> These are internal engineering docs, not served by the in-app Help & Documentation
> feature (which is scoped to `docs/help/`).

## Contents

| Doc | What's in it |
|-----|--------------|
| [Overview](./overview.md) | Core topology, 3D composition matrix, data models, validation spectrum, LLM configurations, prompt audit log engine, and API routes |
| [Consumption Strategy](./consumption-strategy.md) | How apps use ActorFactory — Model A (runtime composition via a hosted service) vs Model B (published versioned actor definitions + shared compile library); the now/then roadmap |
| [UML Prompt Model](./uml-prompt-model.md) | The conceptual spine: a prompt as an identity; Domain / Actor / Goal (= use case = API call) / Specialization × Skill mapped to UML |
| [Seed Engine & Factory Reset](./seed-engine.md) | Idempotent seeding and database reset pattern |
| [Seed Catalog](./seeds.md) | Reference inventory of all default domains, personas, skills, specializations, compositions, and providers |
| [Storage Layer](./storage-layer.md) | Persistence design |

## AI Engineering

Under [`ai-engineering/`](./ai-engineering/):

| Doc | What's in it |
|-----|--------------|
| [AI Strategy & Blueprint](./ai-engineering/ai-strategy.md) | Multi-tiered AI application architecture blueprint |
| [Persona × Skill Composition](./ai-engineering/persona-skill-composition.md) | Building validatable AI expertise & feedback chains |
| [Matrix Composition Summary](./ai-engineering/persona-skill-specialization-summary.md) | Personas, Skills, Specializations matrix summary |
| [Goals & Samples](./ai-engineering/goals-and-samples.md) | First-class Goals and Samples scoped to domain actors |
| [Prompt Template Definitions](./ai-engineering/prompt-template-definitions.md) | Specification catalog of default templates |
| [Prompt Composition Reference](./ai-engineering/prompt-composition-reference.md) | Prompt preamble construction & formatting guide |
| [Specialized Small Models](./ai-engineering/specialized-small-models.md) | SLM optimization, QLoRA fine-tuning, and model routing |
