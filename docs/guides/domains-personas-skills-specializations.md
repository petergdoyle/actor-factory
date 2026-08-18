# Domains, Personas, Skills & Specializations

A practical guide to understanding and constructing the four core building blocks of ActorFactory.

---

## The Core Idea

ActorFactory manufactures specialized AI actors by composing three independent dimensions into a focused system prompt:

```
Persona (WHO) × Specialization (WITH WHAT EXPERTISE) × Skill (WHAT) = Specialized Actor
```

A **Domain** provides the operational context that ties it all together. Rather than writing one massive general-purpose prompt, you atomize expertise into small, reusable components and combine them at runtime.

---

## Domains

A Domain defines the problem space your actors operate in. Think of it as the operational context — the world the actor inhabits.

### Purpose

- Establishes boundaries and context for actors
- Carries default parameters (tech stack, methodology, tooling) that downstream prompts can reference
- Groups related actors under a shared problem space

### Structure

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Human-readable domain name |
| `description` | string | What this domain covers |
| `parameters` | JSON object | Key-value context data (stack, methodology, tooling, etc.) |

### Example

```json
{
  "name": "Infrastructure & Ops",
  "description": "Site reliability engineering, network topology, and cloud infrastructure.",
  "parameters": {
    "cloud_provider": "AWS",
    "container_orchestration": "Kubernetes / EKS",
    "iac_tool": "Terraform",
    "observability": "Datadog / Prometheus"
  }
}
```

### How to Construct a Domain

1. **Identify the problem space** — What professional discipline or department does this cover?
2. **Write a concise description** — One sentence that explains the scope.
3. **Define parameters** — What contextual variables matter for actors working in this domain? These are defaults that give the actor situational awareness (e.g., preferred cloud, language, framework).

### Guidelines

- Keep domains broad enough to contain multiple actors but narrow enough to be meaningful. "Software Engineering" is a good domain. "Technology" is too broad. "React button components" is too narrow.
- Parameters should be factual context, not instructions. They answer "what's the environment?" not "what should you do?"

---

## Personas (Actors)

A Persona defines **WHO** the LLM is — its professional identity, cognitive approach, and quality standards. In the codebase these are called "Actors" but conceptually they represent persona archetypes.

### Purpose

- Shapes how the model *thinks* and what it *prioritizes*
- Defines the vocabulary the model uses naturally
- Sets quality expectations from a specific professional perspective

### Structure

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Short identifier (e.g., "Software Architect") |
| `title` | string | Full professional title |
| `description` | string | One-sentence role summary |
| `domain_id` | UUID | Links this actor to its home domain |
| `core_concerns` | list of strings | What this role cares about (4-8 items) |
| `vocabulary` | string | Domain-specific terms the role uses naturally |
| `thinking_patterns` | list of strings | How this role approaches problems (3-5 items) |
| `quality_criteria` | list of strings | What "good" looks like from this perspective |

### Example

```json
{
  "name": "Site Reliability Engineer",
  "title": "Site Reliability Engineer / Cloud Architect",
  "description": "Designs and operates infrastructure for reliability, performance, and cost efficiency.",
  "domain_id": "<infrastructure_ops_domain_id>",
  "core_concerns": [
    "Network topology & security boundaries",
    "Deployment automation & rollback",
    "Monitoring, alerting, and SLO/SLI compliance",
    "Disaster recovery & capacity planning"
  ],
  "vocabulary": "VPC, subnet, load balancer, CDN, K8s, IaC, SLA, SLO, SLI, blue-green deployment, canary release, RTO, RPO",
  "thinking_patterns": [
    "Design for failure — assume any component can go down",
    "Automate everything that's done more than twice",
    "Measure before optimizing",
    "Principle of least privilege for all access"
  ],
  "quality_criteria": [
    "No single points of failure",
    "Recovery procedures are documented and automated",
    "All infrastructure is reproducible from code",
    "Observability covers all critical execution paths"
  ]
}
```

### How to Construct a Persona

1. **Pick the professional archetype** — What expert would you hire to solve this class of problem? Name the role and give it a full title.

2. **Write the description** — One sentence: what does this professional do?

3. **Define core concerns (4-8 items)** — Ask yourself: "When this expert reviews work, what do they look for first?" These are the filters that determine what's relevant.

4. **List vocabulary** — What jargon does this expert use without explanation? This grounds the model in domain-appropriate language.

5. **Define thinking patterns (3-5 items)** — How does this expert approach a new problem? These become reasoning directives (e.g., "Define interfaces before implementations").

6. **Define quality criteria (3-5 items)** — What does a good outcome look like from this expert's perspective? These become the internal quality bar.

### Guidelines

- Personas are **identity**, not instructions. They describe who the model *is*, not what it should *do* on a specific task. The Skill handles the task.
- Keep thinking patterns as heuristics, not procedures. "Design for failure" is a thinking pattern. "First create a VPC, then add subnets" is a procedure.
- Vocabulary should be terms the persona uses *naturally* — if you'd explain it to a layperson, it probably doesn't belong in the vocabulary list.

---

## Skills

A Skill defines **WHAT** the LLM produces — the output artifact, its format, validation rules, and quality criteria.

### Purpose

- Constrains the model's output to a specific format
- Defines what makes the output correct (validation rules)
- Provides positive guidance (quality patterns) and negative steering (anti-patterns)
- Determines the validation strategy (machine-parseable vs. human-reviewed)

### Structure

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Skill name |
| `description` | string | What this skill produces |
| `output_format` | string | Expected artifact format |
| `validation_level` | enum | `machine`, `structural`, `heuristic`, or `human` |
| `validation_rules` | list of strings | Specific checkable constraints |
| `quality_patterns` | list of strings | What good output looks like |
| `anti_patterns` | list of strings | What to avoid |

### Validation Levels

| Level | Meaning | Example | Auto-Retry? |
|-------|---------|---------|:-----------:|
| `machine` | Binary pass/fail via parser or schema validator | Mermaid syntax, OpenAPI spec | ✅ Yes |
| `structural` | Template/format rules that can be checked programmatically | INVEST story structure | ⚠️ Partial |
| `heuristic` | Rule-based coverage analysis requiring judgment | Domain NFR coverage | ⚠️ Partial |
| `human` | Requires subjective expert review | Design trade-off analysis | ❌ No |

### Example

```json
{
  "name": "Mermaid Diagram Building",
  "description": "Produce valid Mermaid.js diagram code that renders correctly.",
  "output_format": "```mermaid block containing flowchart, sequence, or class diagram```",
  "validation_level": "machine",
  "validation_rules": [
    "Must parse without errors in mermaid.js parser",
    "Nodes with special characters must use quoted labels: A[\"label\"]",
    "Every subgraph must have a matching end",
    "No style or linkStyle directives that crash parser"
  ],
  "quality_patterns": [
    "Nodes have meaningful descriptive labels, not A/B/C",
    "Subgraphs represent logical or network boundaries",
    "Edge labels describe interaction protocols or payload"
  ],
  "anti_patterns": [
    "Single-letter node names with no context",
    "Missing subgraph grouping in multi-tier architecture diagrams",
    "Hallucinated syntax or unclosed quotes"
  ]
}
```

### How to Construct a Skill

1. **Name the output artifact** — What does the LLM produce when using this skill? A diagram? A story? A schema? An analysis report?

2. **Describe the output format** — Be specific about structure. "Mermaid code block" or "Structured JSON with Title, As a…, I want…, So that…" gives the model a concrete target.

3. **Choose the validation level** — Can a machine verify correctness? If yes → `machine`. Does it follow a known template? → `structural`. Requires domain judgment? → `heuristic`. Only a human can tell? → `human`.

4. **Write validation rules (4-8 items)** — These are concrete, checkable constraints. Write them as assertions: "Must do X", "Every Y must have Z". These form the hard pass/fail boundary.

5. **Write quality patterns (3-6 items)** — What does *good* look like beyond mere correctness? These are positive signals — mark each with ✓ mentally.

6. **Write anti-patterns (3-6 items)** — What common failure modes should the model avoid? Be specific about what goes wrong, not just "don't be bad."

### Guidelines

- Skills are **cross-cutting**. Any persona can use any skill. A Security Architect can write user stories. A Product Owner can review API designs. Don't couple skills to specific personas.
- Validation rules should be objectively assessable. If you can't write a test for it, it's probably a quality pattern, not a validation rule.
- Anti-patterns are most effective when they describe *specific* failure modes you've actually seen in LLM output, not abstract warnings.

---

## Specializations

A Specialization defines **WITH WHAT platform/vendor/methodology expertise** the LLM operates. It narrows generic knowledge into platform-specific references.

### Purpose

- Adds vendor-specific tools, services, and terminology
- Sets platform constraints the model must follow
- Provides concrete examples of correct usage
- Enables auto-detection from solution parameters via keyword matching

### Structure

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Platform/vendor name |
| `description` | string | What this expertise covers |
| `services_and_patterns` | string | Specific tools, services, and patterns to reference |
| `constraints` | list of strings | Design rules for this platform |
| `examples` | list of strings | Concrete correct-usage examples |
| `detection_keywords` | list of strings | Words that trigger auto-detection |

### Example

```json
{
  "name": "Amazon Web Services (AWS)",
  "description": "AWS cloud platform expertise — services, patterns, and Well-Architected Framework.",
  "services_and_patterns": "Lambda, ECS/Fargate, API Gateway, S3, DynamoDB, RDS/Aurora, SQS/SNS, EventBridge, IAM, VPC, CloudWatch",
  "constraints": [
    "Reference specific AWS service names, not generic equivalents",
    "Consider AWS Well-Architected Framework pillars",
    "Account for AWS service limits and cold starts"
  ],
  "examples": [
    "Use SQS for async decoupling instead of generic message queue",
    "Reference DynamoDB single-table design principles",
    "Use EventBridge for cross-account event routing"
  ],
  "detection_keywords": ["aws", "lambda", "ecs", "fargate", "s3", "dynamodb", "aurora", "sqs", "sns", "eventbridge", "cloudwatch", "vpc"]
}
```

### Auto-Detection

Specializations can be automatically activated based on text content (e.g., solution parameters or project descriptions). The detection flow:

1. Scan input text for each specialization's `detection_keywords`
2. Calculate a confidence score based on keyword match count
3. Activate specializations that meet the threshold (≥30% confidence)

| Keyword Matches | Confidence |
|:---------------:|:----------:|
| 1 keyword | 30–60% |
| 2–3 keywords | 60–90% |
| 4+ keywords | 90–100% |

### How to Construct a Specialization

1. **Identify the platform or methodology** — What vendor, technology, or framework expertise does this represent?

2. **Write a description** — One sentence covering what this expertise includes.

3. **List services and patterns** — What specific tools, services, APIs, or patterns should the model reference when this specialization is active? List 8-15 items. These replace generic terms with specific ones (e.g., "SQS" instead of "message queue").

4. **Define constraints (3-5 items)** — What rules must the model follow when operating in this platform context? These are hard design rules, not suggestions.

5. **Provide examples (2-4 items)** — Concrete correct-usage examples that demonstrate the constraints in action. These can serve as few-shot guidance.

6. **Define detection keywords (10-30 items)** — What words in a project description or tech stack indicate this specialization is relevant? Include service names, abbreviations, and common terms. All lowercase.

### Guidelines

- Specializations are additive. Multiple specializations can be active simultaneously (e.g., AWS + Kubernetes + Serverless). Design each one to be composable without conflicting.
- Constraints should be *platform rules*, not generic best practices. "Use IAM roles, not access keys" is a platform constraint. "Follow security best practices" is not.
- Detection keywords should be unambiguous. "lambda" clearly indicates AWS. "function" does not.

---

## How They Compose Together

When a Composition is created (linking one Actor + Skills + Specializations), the system compiles a structured system prompt with three sections:

```
┌─────────────────────────────────────────────────────┐
│  1. IDENTITY & CORE CONCERNS                        │
│     ← From Persona                                  │
│     Who you are, what you care about, how you think │
├─────────────────────────────────────────────────────┤
│  2. EXPERTISE & CONSTRAINTS                         │
│     ← From Specialization(s)                        │
│     Platform knowledge, services, design rules      │
├─────────────────────────────────────────────────────┤
│  3. TASK FORMAT & QUALITY CRITERIA                  │
│     ← From Skill                                    │
│     Output format, validation rules, do's & don'ts  │
└─────────────────────────────────────────────────────┘
```

### Example Composition

**Name:** "Cloud Architect — Mermaid Diagrammer"

| Dimension | Selection |
|-----------|-----------|
| Persona | Site Reliability Engineer |
| Specializations | AWS, Kubernetes & Cloud Native |
| Skill | Mermaid Diagram Building |

This produces an actor that thinks like an SRE, references specific AWS and K8s services, and outputs valid Mermaid diagram syntax — all from three reusable, independently editable components.

### Key Principle

> Any combination is valid. Associations between components are hints, not gates.

A Security Architect can produce business process flows. A Product Owner can review API designs. The composition system makes the common path easy while keeping all paths open.

---

## Quick Reference: Construction Checklist

### New Domain
- [ ] Clear problem-space name
- [ ] One-sentence description of scope
- [ ] Parameters with key contextual variables (stack, tools, methodology)

### New Persona
- [ ] Professional role name and title
- [ ] One-sentence description
- [ ] 4-8 core concerns (what this expert looks for)
- [ ] Vocabulary string (domain jargon)
- [ ] 3-5 thinking patterns (heuristics, not procedures)
- [ ] 3-5 quality criteria (what "good" looks like)
- [ ] Linked to a domain

### New Skill
- [ ] Output artifact name
- [ ] Description of what it produces
- [ ] Explicit output format
- [ ] Validation level chosen (machine/structural/heuristic/human)
- [ ] 4-8 validation rules (checkable assertions)
- [ ] 3-6 quality patterns (positive signals)
- [ ] 3-6 anti-patterns (specific failure modes)

### New Specialization
- [ ] Platform/vendor/methodology name
- [ ] One-sentence description
- [ ] 8-15 services and patterns to reference
- [ ] 3-5 platform-specific constraints
- [ ] 2-4 concrete usage examples
- [ ] 10-30 detection keywords (lowercase, unambiguous)

---

## API Endpoints

All entities are managed via the RESTful API:

| Entity | Endpoints |
|--------|-----------|
| Domains | `GET/POST /api/v1/domains`, `DELETE /api/v1/domains/{id}` |
| Actors | `GET/POST /api/v1/actors`, `DELETE /api/v1/actors/{id}` |
| Skills | `GET/POST /api/v1/skills`, `DELETE /api/v1/skills/{id}` |
| Specializations | `GET/POST /api/v1/specializations`, `DELETE /api/v1/specializations/{id}` |
| Compositions | `GET/POST /api/v1/compositions`, `DELETE /api/v1/compositions/{id}` |
| Preview | `POST /api/v1/compose/preview` — Real-time prompt compilation |

---

*Document version: 2026-08-14*
