# ActorFactory 🤖🏭

ActorFactory is a universal, domain-agnostic infrastructure layer designed to build, catalog, and orchestrate specialized "Actor Armies" built from atomized capability sets. 

Traditional enterprise software struggles to extract deterministic, reliable outputs from stochastic Large Language Models (LLMs). ActorFactory solves this by shifting away from general-purpose prompts and instead manufacturing dynamic composable profiles (Generalizations + Skills + Concerns + Perspectives) optimized for lightweight Small Language Models (SLMs).

## 🚀 The Multi-Application Topology

ActorFactory is not a single application; it is the universal intelligence engine that sits underneath specific use cases. Downstream applications consume ActorFactory via a decoupled, LLM-blind backend API:

                  ┌──────────────────────────────┐
                  │         ActorFactory         │ (Universal Core Engine)
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  StoryForge AI   │   │   GradeMark AI   │   │   LogisticsOS    │ (Downstream Apps)
│ (Project Mgmt)   │   │  (Academic QA)   │   │ (Online Order)   │
└──────────────────┘   └──────────────────┘   └──────────────────┘

## 🛠️ Core Capabilities
- **Actor Factory & Catalog:** Define atomic skills and dynamically combine them into reusable expert profiles at runtime.
- **Contextual Assembly:** Seamlessly inject methodology parameters (e.g., Agile vs. Waterfall, Greenfield vs. Migration) without exposing prompt engineering complexity to the frontend.
- **Pluggable Gateway:** Hot-swap between cloud frontier models and local private SLMs using uniform configuration toggles.
- **Telemetry & Judge-In-The-Loop:** Comprehensively log requests and responses, utilizing a top-tier model to asynchronously critique and automatically patch underlying skill templates.
S