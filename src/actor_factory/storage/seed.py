from uuid import uuid4
from src.actor_factory.models.core import Domain, Actor, Skill, Specialization, Composition, LLMProviderConfig
from src.actor_factory.storage.sqlite import SQLiteStorage

def seed_default_data(storage: SQLiteStorage, force: bool = False):
    # Check LLM configs seed
    existing_llm_configs = storage.list_llm_configs()
    if not existing_llm_configs or force:
        llm_configs = [
            LLMProviderConfig(
                id="ollama_local",
                name="Ollama (Local)",
                provider_type="ollama",
                base_url="http://localhost:11434",
                active_model="llama3",
                is_active=True,
                status="online",
                available_models=["llama3", "llama3.2", "mistral", "gemma3:12b", "mermaid-fixer"]
            ),
            LLMProviderConfig(
                id="ollama_remote",
                name="Ollama (Remote)",
                provider_type="ollama",
                base_url="http://192.168.1.100:11434",
                active_model="llama3",
                is_active=False,
                status="unconfigured",
                available_models=[]
            ),
            LLMProviderConfig(
                id="openai",
                name="OpenAI API",
                provider_type="openai",
                base_url="https://api.openai.com/v1",
                api_key="",
                active_model="gpt-4o",
                is_active=False,
                status="unconfigured",
                available_models=["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"]
            ),
            LLMProviderConfig(
                id="anthropic",
                name="Anthropic Claude",
                provider_type="anthropic",
                base_url="https://api.anthropic.com",
                api_key="",
                active_model="claude-3-5-sonnet",
                is_active=False,
                status="unconfigured",
                available_models=["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"]
            ),
            LLMProviderConfig(
                id="bedrock",
                name="AWS Bedrock",
                provider_type="bedrock",
                base_url="https://bedrock-runtime.us-east-1.amazonaws.com",
                active_model="anthropic.claude-3-haiku-20240307-v1:0",
                is_active=False,
                status="unconfigured",
                available_models=["anthropic.claude-3-haiku-20240307-v1:0", "anthropic.claude-3-5-sonnet-20240620-v1:0"]
            ),
            LLMProviderConfig(
                id="mock",
                name="Mock (Testing)",
                provider_type="mock",
                active_model="mock",
                is_active=False,
                status="online",
                available_models=["mock"]
            )
        ]
        for cfg in llm_configs:
            storage.save_llm_config(cfg)

    # Check if domains exist
    existing_domains = storage.list_domains()
    if existing_domains and not force:
        return

    # 1. DOMAINS
    domain_se = Domain(
        name="Software Engineering",
        description="Systems design, API contracts, modularity, and testing strategies.",
        parameters={
            "architecture_style": "microservices",
            "primary_language": "TypeScript / Python",
            "api_style": "REST / OpenAPI 3.0",
            "test_framework": "pytest / vitest"
        }
    )
    domain_ops = Domain(
        name="Infrastructure & Ops",
        description="Site reliability engineering, network topology, and cloud infrastructure.",
        parameters={
            "cloud_provider": "AWS",
            "container_orchestration": "Kubernetes / EKS",
            "iac_tool": "Terraform",
            "observability": "Datadog / Prometheus"
        }
    )
    domain_po = Domain(
        name="Product & Business Analyst",
        description="Value streams, user story decomposition, and business process automation.",
        parameters={
            "methodology": "Agile / Scrum",
            "sprint_length": "2 weeks",
            "estimation_scale": "Fibonacci",
            "tracking_tool": "Jira"
        }
    )
    domain_sec = Domain(
        name="InfoSec & Security",
        description="Threat modeling, access control, zero-trust architecture, and compliance.",
        parameters={
            "framework": "STRIDE / Zero-Trust",
            "compliance_standards": "SOC2 / HIPAA / ISO27001",
            "auth_protocol": "OIDC / OAuth2 + mTLS"
        }
    )

    for d in [domain_se, domain_ops, domain_po, domain_sec]:
        storage.save_domain(d)

    # 2. ACTORS (PERSONAS)
    actor_swe = Actor(
        name="Software Architect",
        title="Software Architect / Lead Engineer",
        description="Designs software systems with attention to maintainability, scalability, and explicit contracts.",
        domain_id=domain_se.id,
        core_concerns=[
            "System decomposition & bounded contexts",
            "API contract design & versioning",
            "Error handling & resilience patterns",
            "Testability & developer experience"
        ],
        vocabulary="microservices, API gateway, event-driven, CQRS, domain model, bounded context, repository pattern, clean architecture, SOLID",
        thinking_patterns=[
            "Decompose into bounded contexts before designing interactions",
            "Define interfaces before implementations",
            "Consider failure modes for every external dependency",
            "Prefer explicit over implicit behavior"
        ],
        quality_criteria=[
            "Clear separation of concerns",
            "Explicit error handling paths",
            "Testable without mocking the world",
            "Minimal coupling between components"
        ]
    )

    actor_sre = Actor(
        name="Site Reliability Engineer",
        title="Site Reliability Engineer / Cloud Architect",
        description="Designs and operates infrastructure for reliability, performance, and cost efficiency.",
        domain_id=domain_ops.id,
        core_concerns=[
            "Network topology & security boundaries",
            "Deployment automation & rollback",
            "Monitoring, alerting, and SLO/SLI compliance",
            "Disaster recovery & capacity planning"
        ],
        vocabulary="VPC, subnet, load balancer, CDN, K8s, IaC, SLA, SLO, SLI, blue-green deployment, canary release, RTO, RPO",
        thinking_patterns=[
            "Design for failure — assume any component can go down",
            "Automate everything that's done more than twice",
            "Measure before optimizing",
            "Principle of least privilege for all access"
        ],
        quality_criteria=[
            "No single points of failure",
            "Recovery procedures are documented and automated",
            "All infrastructure is reproducible from code",
            "Observability covers all critical execution paths"
        ]
    )

    actor_po = Actor(
        name="Product Owner",
        title="Product Owner / Business Analyst",
        description="Translates business objectives into actionable requirements, defines process flows, and prioritizes value delivery.",
        domain_id=domain_po.id,
        core_concerns=[
            "Business process definition & optimization",
            "Stakeholder alignment & requirements elicitation",
            "Value prioritization & backlog management",
            "Acceptance criteria validating business outcomes"
        ],
        vocabulary="value stream, business process, current state, future state, swimlane, SLA, stakeholder, acceptance criteria, MVP, user persona",
        thinking_patterns=[
            "Map the current state before designing the future state",
            "Every requirement traces to a measurable business outcome",
            "Decompose complex processes into discrete, testable steps",
            "Prioritize by value delivered, not technical complexity"
        ],
        quality_criteria=[
            "Requirements connect to measurable business outcomes",
            "Process flows show clear ownership at each step",
            "Edge cases and exception paths are explicitly identified"
        ]
    )

    actor_sec = Actor(
        name="Security Architect",
        title="Security Architect / Lead Security Engineer",
        description="Identifies and mitigates security risks across systems, data flows, and identity boundaries.",
        domain_id=domain_sec.id,
        core_concerns=[
            "Threat modeling & attack surface reduction",
            "Identity, authentication, and access control (IAM)",
            "Data protection in transit and at rest",
            "Compliance framework alignment"
        ],
        vocabulary="STRIDE, zero trust, defense in depth, IAM, RBAC, OAuth, OIDC, mTLS, encryption at rest, key rotation, SIEM",
        thinking_patterns=[
            "Assume breach — design for detection and containment",
            "Least privilege by default with explicit authorization",
            "Every trust boundary needs authentication and authorization"
        ],
        quality_criteria=[
            "All data flows cross trust boundaries with auth",
            "Secrets are never hardcoded or logged",
            "Compliance controls map directly to technical controls"
        ]
    )

    for a in [actor_swe, actor_sre, actor_po, actor_sec]:
        storage.save_actor(a)

    # 3. SKILLS
    skill_mermaid = Skill(
        name="Mermaid Diagram Building",
        description="Produce valid Mermaid.js diagram code that renders correctly.",
        output_format="```mermaid block containing flowchart, sequence, or class diagram```",
        validation_level="machine",
        validation_rules=[
            "Must parse without errors in mermaid.js parser",
            "Nodes with special characters must use quoted labels: A[\"label\"]",
            "Every subgraph must have a matching end",
            "No style or linkStyle directives that crash parser"
        ],
        quality_patterns=[
            "Nodes have meaningful descriptive labels, not A/B/C",
            "Subgraphs represent logical or network boundaries",
            "Edge labels describe interaction protocols or payload"
        ],
        anti_patterns=[
            "Single-letter node names with no context",
            "Missing subgraph grouping in multi-tier architecture diagrams",
            "Hallucinated syntax or unclosed quotes"
        ]
    )

    skill_story = Skill(
        name="User Story Writing",
        description="Produce user stories in standard Agile INVEST format with testable acceptance criteria.",
        output_format="Structured JSON or Markdown: Title, As a..., I want..., So that..., Acceptance Criteria",
        validation_level="structural",
        validation_rules=[
            "Title must be concise (< 80 characters)",
            "Description must follow Given/When/Then or As a... format",
            "At least 2 testable acceptance criteria",
            "Story points must be on Fibonacci scale"
        ],
        quality_patterns=[
            "Stories are independently deliverable",
            "The 'so that' clause connects directly to business value",
            "Acceptance criteria cover happy path + key edge cases"
        ],
        anti_patterns=[
            "Stories that are technical tasks: 'Create table in postgres'",
            "Missing 'so that' clause",
            "Acceptance criteria that restates the title without test steps"
        ]
    )

    skill_api = Skill(
        name="API Contract Design",
        description="Design clean RESTful OpenAPI specs or event payload schemas.",
        output_format="OpenAPI 3.0 YAML / JSON schema definition",
        validation_level="machine",
        validation_rules=[
            "Valid OpenAPI 3.0 schema syntax",
            "Plural nouns for collections (/users, /actors)",
            "Explicit error response schemas (400, 401, 404, 500)",
            "Pagination fields on collection endpoints"
        ],
        quality_patterns=[
            "Resource-oriented endpoint URLs",
            "Request/response body schemas with examples",
            "Explicit security requirement declarations per route"
        ],
        anti_patterns=[
            "Verbs in URLs: /getUsers, /createActor",
            "Inconsistent error formats across endpoints",
            "Exposing internal database IDs or stack traces"
        ]
    )

    for sk in [skill_mermaid, skill_story, skill_api]:
        storage.save_skill(sk)

    # 4. SPECIALIZATIONS
    spec_aws = Specialization(
        name="Amazon Web Services (AWS)",
        description="AWS cloud platform expertise — services, patterns, and Well-Architected Framework.",
        services_and_patterns="Lambda, ECS/Fargate, API Gateway, S3, DynamoDB, RDS/Aurora, SQS/SNS, EventBridge, IAM, VPC, CloudWatch",
        constraints=[
            "Reference specific AWS service names, not generic equivalents",
            "Consider AWS Well-Architected Framework pillars",
            "Account for AWS service limits and cold starts"
        ],
        examples=[
            "Use SQS for async decoupling instead of generic message queue",
            "Reference DynamoDB single-table design principles",
            "Use EventBridge for cross-account event routing"
        ],
        detection_keywords=["aws", "lambda", "ecs", "fargate", "s3", "dynamodb", "aurora", "sqs", "sns", "eventbridge", "cloudwatch", "vpc"]
    )

    spec_k8s = Specialization(
        name="Kubernetes & Cloud Native",
        description="Container orchestration expertise — K8s manifests, helm, service mesh, and operators.",
        services_and_patterns="Deployments, StatefulSets, Ingress/Gateway API, Istio service mesh, Helm, HPA, Pod Security Standards",
        constraints=[
            "Design for container lifecycle — graceful shutdown, liveness/readiness probes",
            "Use namespaces for logical isolation & NetworkPolicies for enforcement",
            "Declare explicit CPU/Memory resource requests & limits"
        ],
        examples=[
            "Separate readiness probes from liveness probes",
            "Use init containers for schema migration before application pod start"
        ],
        detection_keywords=["kubernetes", "k8s", "helm", "istio", "ingress", "pod", "deployment", "statefulset", "kubectl"]
    )

    spec_agile = Specialization(
        name="Agile & Process Automation",
        description="Sprint-based backlog refinement, workflow approval chains, and SLA escalation tracking.",
        services_and_patterns="INVEST user stories, Fibonacci estimation, Definition of Done, SLA monitoring, approval routing",
        constraints=[
            "Ensure stories fit within a single 2-week sprint",
            "Identify human-in-the-loop approval steps vs automated workflow steps",
            "Define explicit escalation paths when SLAs are breached"
        ],
        examples=[
            "Intake form -> auto-triage -> parallel review -> manager approval -> notification"
        ],
        detection_keywords=["agile", "scrum", "sprint", "invest", "jira", "approval", "workflow", "sla", "escalation"]
    )

    for sp in [spec_aws, spec_k8s, spec_agile]:
        storage.save_specialization(sp)

    # 5. INITIAL COMPOSITION
    comp1 = Composition(
        name="Cloud Architect - Mermaid Diagrammer",
        actor_id=actor_sre.id,
        skill_ids=[skill_mermaid.id],
        specialization_ids=[spec_aws.id, spec_k8s.id]
    )
    comp2 = Composition(
        name="Agile Product Owner - Story Writer",
        actor_id=actor_po.id,
        skill_ids=[skill_story.id],
        specialization_ids=[spec_agile.id]
    )
    for c in [comp1, comp2]:
        storage.save_composition(c)
