# ActorFactory 🤖🏭

ActorFactory is a universal, domain-agnostic infrastructure layer designed to build, catalog, and orchestrate specialized **Actor Armies** built from atomized capability sets.

Traditional enterprise software struggles to extract deterministic, reliable outputs from stochastic Large Language Models (LLMs). ActorFactory solves this by shifting away from general-purpose prompts and instead manufacturing dynamic composable profiles (**Personas × Specializations × Skills**) optimized for lightweight Small Language Models (SLMs) and cloud LLMs alike.

---

## 🚀 The Multi-Application Topology

ActorFactory is not a single application; it is the universal intelligence engine that sits underneath specific use cases. Downstream applications consume ActorFactory via a decoupled, LLM-blind backend API:

```
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
```

---

## 🛠️ Management Workspace Features

ActorFactory includes a modern, glassmorphic Next.js workspace for managing, configuring, and testing actor compositions:

- 🟢 **Live Stack Health Status**: Persistent header badges (`🟢 API Connected`, `🟢 LLM: llama3`) polling system health and latency.
- ⚙️ **LLM Configurations**: Manage LLM providers (Ollama Local, Ollama Remote, OpenAI, Anthropic, AWS Bedrock, Mock), base URLs, API keys, test connection latency, and discover available models.
- 🌐 **Domains**: Define problem domain operational contexts and default JSON parameter schemas.
- 🎭 **Actors (Personas)**: Define expert identities, core concerns, domain vocabulary, thinking patterns, and quality criteria.
- ⚡ **Skills**: Define cross-cutting executable capabilities with output formats, validation levels (`machine`, `structural`, `heuristic`), validation rules, quality patterns, and anti-patterns.
- 🔧 **Specializations**: Define platform/vendor expertise (e.g. AWS, Kubernetes, Agile), constraints, usage examples, and auto-detection keywords.
- 🔗 **Composer**: 3-step matrix selector (`Persona × Specialization × Skill`) with real-time prompt compilation preview and profile persistence.
- 🧪 **Test Bench**: Interactive execution canvas for streaming model outputs from local Ollama SLMs or cloud gateways.

---

## ⚡ Developer Quickstart & Makefile Commands

ActorFactory includes defensive, idempotent `make` dev lifecycle targets:

```bash
# 1. First-time setup (installs Python packages via uv sync + frontend npm packages)
make setup

# 2. Start development environment (FastAPI on :8000, Next.js on :3000)
make dev-up

# 3. Check health status of all local services
make dev-status

# 4. Restart development servers cleanly
make dev-restart

# 5. Stop background development servers
make dev-down

# 6. Run pytest automated test suite
make test
```

### All Makefile Targets Reference

| Target | Description |
|--------|-------------|
| `make help` | Show available targets |
| `make setup` | Set up Python `.venv` with `uv sync` and install frontend `npm` dependencies |
| `make dev-up` | Start FastAPI & Next.js background servers (idempotent, checks ports & setup prereqs) |
| `make dev-down` | Stop background servers cleanly (no-ops if servers aren't running) |
| `make dev-restart` | Restart development servers cleanly |
| `make dev-status` | Health check all services (`:8000/health`, `:3000`, Ollama `:11434`) |
| `make test` | Run tests with `pytest` |
| `make build-docker` | Build local Docker container image |
| `make run-docker` | Run Docker container locally |
| `make clean` | Clean virtual environment and `__pycache__` artifacts |

---

## 📚 Documentation Index

All core architectural designs, specification catalogs, and research documents are maintained under the `docs/` folder:

- 🏛️ **[System Architecture](file:///Users/peterdoyle/Dev/actor-factory/docs/architecture.md)** — Core topology, 3D composition matrix, data models, validation spectrum, LLM configurations, and API routes.
- 📐 **[AI Engineering Documentation](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/)**:
  - 🗺️ **[AI Strategy & Blueprint](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/ai-strategy.md)** — Multi-tiered AI application architecture blueprint.
  - 🧩 **[Persona × Skill Composition](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/persona-skill-composition.md)** — Building validatable AI expertise & feedback chains.
  - 📊 **[Matrix Composition Summary](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/persona-skill-specialization-summary.md)** — Personas, Skills, Specializations matrix summary.
  - 📖 **[Prompt Template Definitions](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/prompt-template-definitions.md)** — Complete specification catalog of default templates.
  - 📝 **[Prompt Composition Reference](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/prompt-composition-reference.md)** — Prompt preamble construction & formatting guide.
  - ⚡ **[Specialized Small Models](file:///Users/peterdoyle/Dev/actor-factory/docs/ai-engineering/specialized-small-models.md)** — SLM optimization, QLoRA fine-tuning, and model routing.