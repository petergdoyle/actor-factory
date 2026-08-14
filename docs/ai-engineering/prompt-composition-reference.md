# Prompt Composition System — Reference Guide

## Overview

StoryForge AI uses a **Persona × Skill × Specialization** composition model to build focused, high-quality prompts for any LLM. Rather than writing ad-hoc prompt text per feature, the system composes structured context from three independent, admin-editable dimensions and delivers it as a preamble to every LLM call.

The result: consistent, domain-aware, platform-specific prompts that can be tuned per model, tested comparatively, and evolved without code changes.

---

## The Three Dimensions

### 1. Personas — WHO the model acts as

A persona defines the professional archetype the LLM embodies for a given call. It shapes how the model *thinks*, what *concerns* it prioritizes, and what *vocabulary* it uses naturally.

| Field | Purpose | Impact on Prompt |
|-------|---------|-----------------|
| `title` | Display name (e.g., "Product Owner / Business Process Analyst") | Identity statement: "You are a..." |
| `description` | One-sentence role summary | Context setting |
| `core_concerns` | What this role cares about (6-8 items) | "YOUR CORE CONCERNS:" section — filters what's relevant |
| `vocabulary` | Domain terms the role uses naturally | Not injected directly but informs quality checks |
| `thinking_patterns` | How this role approaches problems (4-5 items) | "HOW YOU APPROACH PROBLEMS:" — guides reasoning style |
| `quality_criteria` | What "good" looks like from this perspective | Internal consistency checks |

**Current Personas:**

| ID | Title | Focus |
|----|-------|-------|
| `software_engineering` | Software Architect / Engineer | System decomposition, APIs, resilience, testing |
| `infrastructure_ops` | SRE / Cloud Architect | Reliability, deployment, monitoring, cost |
| `enterprise_architecture` | Enterprise Architect | Integration, governance, portfolio, compliance |
| `infosec` | Security Architect / Engineer | Threats, access control, encryption, compliance |
| `data_engineering_bi` | Data Engineer / BI Architect | Pipelines, quality, lineage, schema evolution |
| `machine_learning_ai` | ML / MLOps Engineer | Models, features, serving, drift, reproducibility |
| `product_owner` | Product Owner / Business Process Analyst | Process flows, value prioritization, stakeholder alignment |

### 2. Skills — WHAT the model produces

A skill defines the output capability — what format, what quality criteria, what validation rules apply, and what anti-patterns to avoid.

| Field | Purpose | Impact on Prompt |
|-------|---------|-----------------|
| `name` | Display name | "CURRENT TASK:" section header |
| `description` | What this skill produces | Task context |
| `output_format` | Expected format (e.g., "```mermaid code block") | Output constraint |
| `validation_level` | How verifiable: machine / structural / heuristic / human | Determines retry strategy |
| `validation_rules` | Specific checkable constraints (5-8 items) | "VALIDATION RULES:" — model must satisfy these |
| `quality_patterns` | What good output looks like (4-6 items) | "QUALITY CRITERIA:" — positive guidance |
| `anti_patterns` | What bad output looks like (4-6 items) | "AVOID:" — negative steering |

**Current Skills:**

| ID | Name | Validation Level | Key Constraint |
|----|------|-----------------|----------------|
| `mermaid_diagram` | Mermaid Diagram Building | machine | Must parse in mermaid.js |
| `story_writing` | User Story Writing | structural | INVEST criteria, Given/When/Then AC |
| `requirements_analysis` | Requirements Analysis | heuristic | Traceable, measurable, unambiguous |
| `api_design` | API Design | machine | Valid OpenAPI schema |
| `threat_modeling` | Threat Modeling | heuristic | STRIDE coverage, actionable mitigations |
| `business_process_flow` | Business Process Flow | machine | Swimlanes, decision points, start/end states |

### 3. Specializations — WHAT platform expertise the model brings

A specialization adds vendor/platform/methodology knowledge that narrows the model's references from generic to specific.

| Field | Purpose | Impact on Prompt |
|-------|---------|-----------------|
| `name` | Platform name | "YOUR PLATFORM EXPERTISE:" section |
| `description` | What this expertise covers | Context |
| `services_and_patterns` | Specific tools/services (8-15 items) | Listed as "Key patterns:" |
| `constraints` | Design rules for this platform (3-4 items) | Bullet constraints |
| `examples` | Concrete usage examples | Not always injected but available for few-shot |
| `detection_keywords` | Terms that trigger auto-detection | Used by specialization detector |

**Current Specializations:**

| ID | Name | Auto-Detection Example |
|----|------|----------------------|
| `aws` | Amazon Web Services | "Lambda", "DynamoDB", "EKS", "S3" |
| `azure` | Microsoft Azure | "Azure Functions", "Cosmos DB", "Entra ID" |
| `gcp` | Google Cloud Platform | "BigQuery", "Cloud Run", "Pub/Sub" |
| `serverless` | Serverless / Event-Driven | "event-driven", "Lambda", "cold start" |
| `kubernetes` | Kubernetes / Container Orchestration | "k8s", "Helm", "service mesh", "pod" |
| `agile_scrum` | Agile / Scrum Methodology | "sprint", "backlog", "story points" |
| `process_automation` | Business Process Automation | "workflow", "approval chain", "escalation" |

---

## Associations (Soft Recommendations)

Associations are non-enforced suggestions that guide admins and the UI toward sensible combinations.

### How they work

- **Personas → Skills:** `recommended_skills` — which skills this persona typically uses
- **Personas → Specializations:** `recommended_specializations` — which platforms this persona typically works with
- **Skills → Personas:** `recommended_personas` — which personas typically perform this skill

### Association Matrix

| Persona | Recommended Skills | Recommended Specializations |
|---------|-------------------|---------------------------|
| Software Engineering | mermaid, stories, requirements, api, process_flow | aws, azure, gcp, serverless, k8s, process_auto |
| Infrastructure & Ops | mermaid, stories, requirements, threat_model | aws, azure, gcp, k8s, serverless |
| Enterprise Architecture | mermaid, stories, requirements, api, process_flow | aws, azure, gcp, agile, process_auto |
| InfoSec | mermaid, threat_model, requirements, stories | aws, azure, gcp, k8s |
| Data Engineering & BI | mermaid, stories, requirements, api | aws, azure, gcp, serverless |
| ML & AI | mermaid, stories, requirements, api | aws, azure, gcp, k8s, serverless |
| Product Owner | mermaid, stories, requirements, process_flow | agile, process_auto |

### Key Principle

> Any combination is valid at runtime. Associations are hints, not gates.
> A Security Architect can produce business process flows. A Product Owner can review API designs.
> The associations guide the default experience, not limit the possible.

---

## How Composition Works at Runtime

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Caller provides: domains, skill, solution_parameters_text   │
│     e.g., ["software_engineering"], "mermaid_diagram", "AWS..." │
├─────────────────────────────────────────────────────────────────┤
│  2. Auto-detect specializations from text                       │
│     "AWS Lambda, DynamoDB" → aws (0.91), serverless (0.65)      │
├─────────────────────────────────────────────────────────────────┤
│  3. Load persona, skill, specializations from YAML              │
│     Validated on load (invalid templates skipped with log)      │
├─────────────────────────────────────────────────────────────────┤
│  4. Compose preamble: persona + specializations + skill         │
│     ~1500-2500 chars of focused, structured context             │
├─────────────────────────────────────────────────────────────────┤
│  5. Prepend preamble to existing task-specific system prompt    │
│     General context (who, what platform) → Specific task rules  │
├─────────────────────────────────────────────────────────────────┤
│  6. Log composition metadata in audit trail                     │
│     persona, specializations, skill, source, char_count         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features Built to Support This

### 1. YAML-Driven Templates (Zero-Code Customization)

All template data lives in editable YAML files:
```
src/storyforge/templates/prompt_engineering/
├── personas/         (7 files)
├── specializations/  (7 files)
└── skills/           (6 files)
```

**Impact:** Admins can add personas, skills, or specializations by creating a single YAML file. No code changes, no deployments, no developer involvement.

### 2. Admin CRUD API + React UI

Full REST API at `/api/v1/admin/prompt-templates/` with:
- List, detail, create, update, delete
- Version history and rollback
- Validation status endpoint
- Association map endpoint

React Admin panel with sub-tabs for each template type, inline editing, history modal, and reload capability.

**Impact:** Product & Process Team can manage prompt engineering through a browser — no file system access needed.

### 3. Structural Validation

Every save and every startup validates templates against schema:
- Required fields, type checking, length limits
- Allowed values (e.g., `validation_level` must be one of 4 values)
- Model override structure validation
- Invalid templates are skipped (not loaded), logged for admin attention

**Impact:** Prevents corruption from causing silent failures. Admins get immediate feedback on saves (422 with specific error messages).

### 4. Version History + Rollback

Every save archives the previous version with a timestamp:
```
personas/.history/
  software_engineering_2026-08-10T22-15-30.yaml
  software_engineering_2026-08-11T09-30-00.yaml
```

Rollback restores any historical version (and archives current before doing so).

**Impact:** Zero-risk template editing. Bad change? Rollback in one click. The system never loses a known-good state.

### 5. Auto-Detection from Solution Parameters

Specializations are automatically detected from the user's tech stack and platform descriptions:
```
Input: "AWS Lambda, DynamoDB, event-driven serverless architecture"
Detected: aws (0.91), serverless (0.65)
```

Each specialization defines `detection_keywords` — admin-editable lists of terms that trigger association.

**Impact:** Users don't manually tag their project with platforms. The system infers it from what they've already described, making the right expertise available without extra steps.

### 6. Model Override Architecture

Each YAML template supports a `model_overrides` section:
```yaml
model_overrides:
  "ollama/gemma3:12b":
    thinking_patterns:
      - "Be very explicit about syntax rules"
      - "Provide concrete examples in your reasoning"
  "openai/gpt-4o":
    thinking_patterns:
      - "Think step by step but be concise"
```

**Impact:** The same persona/skill/specialization works across different LLMs, but smaller models can get more explicit guidance while larger models get briefer prompts. One template definition, tunable per model.

### 7. Full Audit Trail

Every LLM call logs the composition that was used:
```json
{
  "prompt_modifiers": {
    "persona": "software_engineering",
    "persona_title": "Software Architect / Engineer",
    "specializations": ["aws", "serverless"],
    "specialization_source": "auto-detected",
    "skill": "mermaid_diagram",
    "preamble_char_count": 2144
  }
}
```

**Impact:** Complete traceability for A/B testing. Compare results across:
- Different persona configurations
- Different specialization combinations
- Different LLM models
- Different template versions (via git SHA in audit log)

---

## Testability

### What's testable today

| Layer | How to test | Automated? |
|-------|-------------|-----------|
| Template YAML validity | Startup validation + save-time validation | ✅ |
| Specialization detection | Unit test: text in → detected IDs out | ✅ (deterministic) |
| Prompt composition | Unit test: inputs → preamble string content | ✅ (deterministic) |
| Mermaid syntax output | Mermaid.js parser (binary pass/fail) | ✅ (auto-retry on fail) |
| Model comparison | Audit log diffing (same prompt, different models) | ⚠️ Manual review |
| Output quality | Rubric scoring against quality_patterns | ⚠️ Heuristic |

### How to test a template change

1. Edit template in Admin UI
2. Validation runs immediately — errors shown, save blocked if invalid
3. Previous version archived automatically
4. Run a generation (diagram, story, etc.) — audit log captures full composition
5. Compare output against previous audit entries
6. If output degraded → rollback in one click

### Comparative testing across models

1. Generate with Model A → audit log captures full prompt + response
2. Use replay endpoint: `POST /api/v1/llm/replay` with `log_id` + different model
3. Both responses are in the audit log — compare side by side
4. The `prompt_modifiers` in both entries confirm they used the same composition

---

## Extensibility Path

| To add... | Do this | Effort |
|-----------|---------|--------|
| A new persona (e.g., "QA Engineer") | Create YAML file in `personas/` | 5 minutes |
| A new skill (e.g., "Test Case Writing") | Create YAML file in `skills/` | 5 minutes |
| A new platform (e.g., "Salesforce") | Create YAML in `specializations/` with keywords | 5 minutes |
| Model-specific tuning | Add `model_overrides` section to any YAML | 2 minutes per model |
| New detection keywords | Edit `detection_keywords` list in specialization YAML | 1 minute |
| Association changes | Edit `recommended_*` lists in YAML | 1 minute |

No code changes. No deployments. No developer time. The Product & Process Team owns the prompt engineering configuration.

---

## Design Principles

1. **Composition over hardcoding** — Three independent dimensions combine at runtime instead of one monolithic prompt per feature.

2. **Soft over strict** — Associations guide but don't gate. Any combination works; recommendations make the common path easy.

3. **Editable over compiled** — YAML over Python. Admin UI over file editing. Hot-reload over restarts.

4. **Validated over trusted** — Every template is structurally validated. Every save is versioned. Every call is logged.

5. **Narrow over broad** — Each dimension adds constraints that shrink the LLM's solution space. Tighter target → better results from any model size.

---

*Document version: 2026-08-11*
*System: StoryForge AI — Prompt Composition Engine*
