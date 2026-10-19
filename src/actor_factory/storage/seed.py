from uuid import uuid4
from src.actor_factory.models.core import Domain, Actor, Skill, Specialization, Composition, Goal, Sample, LLMProviderConfig
from src.actor_factory.storage.sqlite import SQLiteStorage

def seed_default_data(storage: SQLiteStorage, force: bool = False):
    # 1. LLM Configs
    existing_llm_configs = {c.id: c for c in storage.list_llm_configs()}
    llm_configs = [
        LLMProviderConfig(
            id="ollama_local",
            name="Ollama (Local)",
            provider_type="ollama",
            base_url="http://localhost:11434",
            active_model="gemma3:12b",  # default for actor-factory: mature, steady structured output, fits M3 16-24GB
            is_active=True,
            status="online",
            available_models=["gemma3:12b", "llama3.2:latest"]
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
        if cfg.id not in existing_llm_configs or force:
            storage.save_llm_config(cfg)

    # Gather existing entities by name to prevent duplicates & reuse IDs
    existing_domains = {d.name: d.id for d in storage.list_domains()}
    existing_actors = {a.name: a.id for a in storage.list_actors()}
    existing_skills = {s.name: s.id for s in storage.list_skills()}
    existing_specs = {s.name: s.id for s in storage.list_specializations()}
    existing_comps = {c.name: c.id for c in storage.list_compositions()}
    existing_goals = {g.key: g.id for g in storage.list_goals()}

    if existing_domains and not force:
        # Catalog already seeded. Top up Goals if they're missing (e.g. an
        # existing DB from before Goals existed) without disturbing other data.
        if not existing_goals:
            _seed_goals(storage, resolve_from_db=True)
        return

    # If force, clear duplicates from sqlite table first
    if force:
        with storage._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM domains")
            cursor.execute("DELETE FROM actors")
            cursor.execute("DELETE FROM skills")
            cursor.execute("DELETE FROM specializations")
            cursor.execute("DELETE FROM compositions")
            cursor.execute("DELETE FROM goals")
            conn.commit()
        existing_domains = {}
        existing_actors = {}
        existing_skills = {}
        existing_specs = {}
        existing_comps = {}

    # 1. DOMAINS
    domain_se = Domain(
        id=existing_domains.get("Software Engineering", uuid4()),
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
        id=existing_domains.get("Infrastructure & Ops", uuid4()),
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
        id=existing_domains.get("Product & Business Analyst", uuid4()),
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
        id=existing_domains.get("InfoSec & Security", uuid4()),
        name="InfoSec & Security",
        description="Threat modeling, access control, zero-trust architecture, and compliance.",
        parameters={
            "framework": "STRIDE / Zero-Trust",
            "compliance_standards": "SOC2 / HIPAA / ISO27001",
            "auth_protocol": "OIDC / OAuth2 + mTLS"
        }
    )
    domain_edu = Domain(
        id=existing_domains.get("K-12 Education", uuid4()),
        name="K-12 Education",
        description="Classroom instruction, curriculum alignment, student assessment grading, and diagnostic feedback management.",
        parameters={
            "grade_level": "Grade 8",
            "subject_area": "Mathematics & Science",
            "assessment_type": "Mixed Rubric & Problem-Solving Exam",
            "rubric_scale": "4-Point Standards-Based Rubric (1: Beginning, 2: Developing, 3: Proficient, 4: Advanced)",
            "curriculum_standard": "Common Core / NGSS Alignment"
        }
    )

    domain_ea = Domain(
        id=existing_domains.get("Enterprise Architecture", uuid4()),
        name="Enterprise Architecture",
        description="Enterprise-wide systems strategy, integration patterns, technology governance, and business-IT alignment across organizational boundaries.",
        parameters={
            "framework": "TOGAF / Zachman",
            "integration_style": "Event-Driven / ESB / API-Led Connectivity",
            "governance_model": "Architecture Review Board (ARB)",
            "modeling_notation": "ArchiMate / UML / BPMN",
            "portfolio_management": "Application Rationalization / Technology Radar"
        }
    )

    for d in [domain_se, domain_ops, domain_po, domain_sec, domain_edu, domain_ea]:
        storage.save_domain(d)

    # 2. ACTORS (PERSONAS)
    actor_swe = Actor(
        id=existing_actors.get("Software Architect", uuid4()),
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
        id=existing_actors.get("Site Reliability Engineer", uuid4()),
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
        id=existing_actors.get("Product Owner", uuid4()),
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
        id=existing_actors.get("Security Architect", uuid4()),
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

    actor_ta = Actor(
        id=existing_actors.get("Teaching Assistant", uuid4()),
        name="Teaching Assistant",
        title="Teaching Assistant / Educational Evaluator",
        description="Assists educators by evaluating student submissions against prescribed rubrics, grading paper & digital assessments, providing constructive evidence-based feedback, and identifying learning gaps.",
        domain_id=domain_edu.id,
        core_concerns=[
            "Criterion-referenced rubric grading & score justification",
            "Distinguishing deterministic errors (math calculation, facts) from subjective reasoning (arguments, essays)",
            "Actionable, student-centered growth feedback",
            "Identifying class-wide misconceptions and learning gaps"
        ],
        vocabulary="Rubric, Criterion, Formative Assessment, Summative Assessment, Grade Level Standard, Proficiency Level, Feedback Loop, Common Misconception, Exemplar",
        thinking_patterns=[
            "Evaluate student evidence strictly against the provided rubric scale before assigning scores",
            "Isolate step-by-step errors in problem solving without penalizing subsequent correct reasoning",
            "Provide empathetic, clear, actionable feedback tailored to the target grade level",
            "Highlight strengths first, then specify exact areas for revision with supporting quotes/steps from student work"
        ],
        quality_criteria=[
            "Transparent rubric itemization (points/scale awarded per criterion with explicit justification)",
            "Constructive student feedback citing specific lines or steps from the submission",
            "Unbiased, consistent grading adhering strictly to the rubric",
            "Class-wide diagnostic summary flagging recurring student misconceptions"
        ]
    )

    actor_ea = Actor(
        id=existing_actors.get("Enterprise Architect", uuid4()),
        name="Enterprise Architect",
        title="Enterprise Architect / Chief Architect",
        description="Designs and governs the enterprise technology landscape, ensuring alignment between business strategy and IT capabilities through integration patterns, standards, and roadmaps.",
        domain_id=domain_ea.id,
        core_concerns=[
            "Business-IT alignment and capability mapping",
            "Application portfolio rationalization",
            "Enterprise integration patterns and data flow",
            "Technology standards and governance",
            "Migration and modernization roadmaps"
        ],
        vocabulary="capability map, application portfolio, integration bus, canonical data model, bounded context, technology radar, reference architecture, transition architecture, target state, as-is/to-be, ArchiMate, TOGAF ADM, interoperability, data lineage, API gateway, event mesh",
        thinking_patterns=[
            "Map business capabilities before selecting technology solutions",
            "Assess current state (as-is) before designing target state (to-be)",
            "Evaluate integration complexity and coupling across system boundaries",
            "Balance standardization with team autonomy using governance guardrails",
            "Consider total cost of ownership across the full application lifecycle"
        ],
        quality_criteria=[
            "Clear traceability from business capability to technology component",
            "Explicit integration contracts between bounded contexts",
            "Defined transition states with measurable migration milestones",
            "Technology choices justified against governance principles",
            "Minimized redundancy across the application portfolio"
        ]
    )

    for a in [actor_swe, actor_sre, actor_po, actor_sec, actor_ta, actor_ea]:
        storage.save_actor(a)

    # 3. SKILLS
    skill_mermaid = Skill(
        id=existing_skills.get("Mermaid Diagram Building", uuid4()),
        name="Mermaid Diagram Building",
        description="Produce valid Mermaid.js diagram code that renders correctly.",
        output_format="```mermaid block containing flowchart, sequence, or class diagram```",
        validation_level="machine",
        validation_rules=[
            "Must parse without errors in mermaid.js parser",
            "ALWAYS wrap a node label in double quotes when it contains ANY of: "
            "parentheses ( ), a line break <br/>, a slash /, angle brackets, or '&'. "
            "Example: AuthSvc[\"Auth Service<br/>(Cognito)\"], not AuthSvc[Auth Service<br/>(Cognito)].",
            "For database/cylinder shapes the quotes go INSIDE the brackets: "
            "DB[(\"Orders<br/>Table\")], not DB[(Orders<br/>Table)].",
            "EVERY edge must use a full arrow. Use --> (solid) or -.-> (dotted). "
            "Never write --|label| or -.|label|; the correct forms are -->|label| and -.->|label|.",
            "Define every node with its label on first use; do not introduce a new node "
            "with a label inside an edge statement if it already has a :::class applied.",
            "Every subgraph must have a matching 'end'.",
            "Do not emit style or linkStyle directives that reference undefined ids.",
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
        id=existing_skills.get("User Story Writing", uuid4()),
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
        id=existing_skills.get("API Contract Design", uuid4()),
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

    skill_rubric_grading = Skill(
        id=existing_skills.get("Rubric-Based Assessment & Grading", uuid4()),
        name="Rubric-Based Assessment & Grading",
        description="Evaluate student work against a multi-criterion rubric, producing a breakdown of scores per criterion, evidence citations, total grade, and actionable student feedback.",
        output_format="Structured Markdown Report: Grade Summary, Criterion Breakdown Table (Criterion, Score, Justification), Evidence Quotes, Constructive Feedback, and Next Steps",
        validation_level="structural",
        validation_rules=[
            "Must include a Criterion Breakdown Table listing every rubric dimension with score & evidence",
            "Must cite specific lines, steps, or quotes from the student's submission",
            "Must provide actionable growth feedback highlighting at least 1 strength and 1 area for improvement",
            "Total score calculation must match the sum of individual criterion scores"
        ],
        quality_patterns=[
            "Explicit evidence citations for every score deduction",
            "Grade-level appropriate tone and clear instructional language",
            "Balanced feedback (praise + growth opportunities)"
        ],
        anti_patterns=[
            "Generic feedback like 'Good job!' without explaining why",
            "Deducting points for criteria not defined in the rubric",
            "Hostile or discouraging language"
        ]
    )

    skill_gap_analysis = Skill(
        id=existing_skills.get("Formative Learning Gap Analysis", uuid4()),
        name="Formative Learning Gap Analysis",
        description="Analyze student responses or class-wide assessment results to identify common misconceptions, skill deficits, and recommended instructional interventions for the teacher.",
        output_format="Structured Assessment Analysis: Performance Overview, Identified Learning Misconceptions, Affected Students/Topics, Recommended Classroom Interventions",
        validation_level="structural",
        validation_rules=[
            "Must categorize misconceptions by topic or learning objective",
            "Must recommend concrete classroom re-teaching strategies",
            "Must identify specific concepts where students demonstrated mastery vs confusion"
        ],
        quality_patterns=[
            "Actionable recommendations for teacher lesson planning",
            "Clear categorization of conceptual vs procedural gaps"
        ],
        anti_patterns=[
            "Vague summaries with no specific intervention strategies"
        ]
    )

    skill_eai = Skill(
        id=existing_skills.get("Enterprise Application Integration", uuid4()),
        name="Enterprise Application Integration",
        description="Design integration solutions connecting disparate enterprise systems using messaging, APIs, and event-driven patterns.",
        output_format="Integration architecture document with pattern selection, data mapping, and sequence diagrams",
        validation_level="structural",
        validation_rules=[
            "Must identify source and target systems with their data contracts",
            "Must specify integration pattern (pub/sub, request/reply, file transfer, shared DB)",
            "Must define error handling and retry/dead-letter strategy",
            "Must address data transformation and canonical model mapping"
        ],
        quality_patterns=[
            "Loose coupling between integrated systems",
            "Idempotent message consumers for reliability",
            "Clear data ownership and system-of-record designation",
            "Versioned contracts for backward compatibility"
        ],
        anti_patterns=[
            "Point-to-point spaghetti integrations without a backbone",
            "Shared mutable database as integration mechanism",
            "Synchronous calls across trust boundaries without circuit breakers",
            "Unversioned or undocumented data contracts"
        ]
    )

    skill_adr = Skill(
        id=existing_skills.get("Architecture Decision Records", uuid4()),
        name="Architecture Decision Records",
        description="Document architectural decisions with context, constraints, options considered, and rationale in a structured ADR format.",
        output_format="Markdown ADR: Title, Status, Context, Decision, Consequences, Alternatives Considered",
        validation_level="structural",
        validation_rules=[
            "Must include context describing the forces at play",
            "Must list at least two alternatives considered with trade-offs",
            "Must state the decision clearly and unambiguously",
            "Must articulate both positive and negative consequences"
        ],
        quality_patterns=[
            "Context grounded in concrete business or technical constraints",
            "Trade-off analysis with quantifiable criteria where possible",
            "Consequences tied to specific quality attributes (performance, maintainability, cost)",
            "Cross-references to related ADRs or governance principles"
        ],
        anti_patterns=[
            "Vague context that does not constrain the decision space",
            "Missing alternatives — presenting only the chosen option",
            "Consequences that only list benefits without risks",
            "Decisions that cannot be revisited or have no expiry trigger"
        ]
    )

    skill_roadmap = Skill(
        id=existing_skills.get("Technology Roadmap Planning", uuid4()),
        name="Technology Roadmap Planning",
        description="Produce phased technology roadmaps that align platform modernization with business priorities and organizational capacity.",
        output_format="Roadmap document with phases, milestones, dependencies, and risk assessment",
        validation_level="structural",
        validation_rules=[
            "Must define clear phases with time horizons (Now / Next / Later or quarterly)",
            "Must identify dependencies between initiatives",
            "Must map each initiative to a business capability or strategic objective",
            "Must include risk/complexity assessment per initiative"
        ],
        quality_patterns=[
            "Incremental value delivery — no big-bang migrations",
            "Explicit decision gates between phases",
            "Capacity and skills assessment for each phase",
            "Measurable success criteria for phase completion"
        ],
        anti_patterns=[
            "Roadmaps disconnected from business strategy",
            "Multi-year plans with no intermediate checkpoints",
            "Technology-first thinking without capability mapping",
            "Missing dependency analysis leading to blocked initiatives"
        ]
    )

    for sk in [skill_mermaid, skill_story, skill_api, skill_rubric_grading, skill_gap_analysis, skill_eai, skill_adr, skill_roadmap]:
        storage.save_skill(sk)

    # 4. SPECIALIZATIONS
    spec_aws = Specialization(
        id=existing_specs.get("Amazon Web Services (AWS)", uuid4()),
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
        id=existing_specs.get("Kubernetes & Cloud Native", uuid4()),
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
        id=existing_specs.get("Agile & Process Automation", uuid4()),
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

    spec_stem = Specialization(
        id=existing_specs.get("STEM & Quantitative Assessments", uuid4()),
        name="STEM & Quantitative Assessments",
        description="Specialization in grading mathematics, physics, chemistry, and computer science assessments — handling deterministic true/false, step-by-step numerical derivation, and formula application.",
        services_and_patterns="Step-by-step problem derivation checking, partial credit allocation, true/false fact checking, formula substitution validation, code output checking",
        constraints=[
            "Check numerical calculations step-by-step; grant partial credit if setup is correct but arithmetic contains minor calculation errors",
            "Clearly distinguish between conceptual misunderstandings (e.g. wrong formula applied) vs arithmetic calculation slips",
            "For deterministic items (multiple choice / true-false), state the correct answer and brief explanation"
        ],
        examples=[
            "Step 1: Formula set up correctly (+1 pt). Step 2: Arithmetic error at 4*8 (+0.5 pt). Final Answer: Incorrect due to Step 2 calculation."
        ],
        detection_keywords=["math", "maths", "science", "stem", "physics", "chemistry", "algebra", "geometry", "calculation", "formula", "exam", "true/false", "quiz"]
    )

    spec_humanities = Specialization(
        id=existing_specs.get("Humanities & Subjective Writing", uuid4()),
        name="Humanities & Subjective Writing",
        description="Specialization in evaluating essays, book reports, historical analysis, persuasive writing, and artistic critiques based on qualitative rubric criteria.",
        services_and_patterns="Thesis statement evaluation, textual evidence citation check, argument structure analysis, mechanics & grammar feedback, rubric tier matching",
        constraints=[
            "Grade subjective writing using evidence quotes directly from the student submission",
            "Evaluate thesis clarity, evidence integration, paragraph transitions, and grade-appropriate vocabulary",
            "Provide constructive feedback that encourages critical thinking and revision"
        ],
        examples=[
            "Criterion: Textual Evidence (3/4 pts) - 'You included two quotes from the text, but try explaining how the second quote supports your thesis about the main character's motivation.'"
        ],
        detection_keywords=["essay", "book report", "humanities", "english", "history", "social studies", "art", "writing", "literature", "thesis", "rubric", "persuasive"]
    )

    spec_sap = Specialization(
        id=existing_specs.get("SAP ERP & S/4HANA", uuid4()),
        name="SAP ERP & S/4HANA",
        description="SAP enterprise resource planning platform expertise — modules, integration points, and migration patterns from ECC to S/4HANA.",
        services_and_patterns="SAP S/4HANA, SAP ECC, ABAP, SAP Fiori, SAP BTP (Business Technology Platform), RFC/BAPI, IDoc, OData, SAP Integration Suite, CDS Views",
        constraints=[
            "Reference specific SAP module names (FI, CO, MM, SD, PP, HCM)",
            "Consider SAP clean core principles for S/4HANA extensions",
            "Account for SAP release cycles and upgrade compatibility",
            "Distinguish between on-premise, private cloud, and public cloud editions"
        ],
        examples=[
            "Use SAP Integration Suite for middleware instead of custom PI/PO flows",
            "Leverage CDS views for analytical reporting instead of classic ABAP reports",
            "Design Fiori apps following SAP UX guidelines for launchpad integration"
        ],
        detection_keywords=["sap", "s4hana", "abap", "fiori", "bapi", "idoc", "btp", "hana"]
    )

    spec_salesforce = Specialization(
        id=existing_specs.get("Salesforce Platform", uuid4()),
        name="Salesforce Platform",
        description="Salesforce CRM and platform expertise — Sales Cloud, Service Cloud, custom development, and integration patterns.",
        services_and_patterns="Sales Cloud, Service Cloud, Marketing Cloud, Experience Cloud, Apex, Lightning Web Components, Salesforce Flow, Platform Events, Change Data Capture, MuleSoft, Salesforce Connect",
        constraints=[
            "Respect Salesforce governor limits (SOQL queries, DML operations, CPU time)",
            "Design for multi-tenant shared infrastructure constraints",
            "Follow Salesforce Well-Architected Framework principles",
            "Consider ISV packaging vs. unmanaged customization trade-offs"
        ],
        examples=[
            "Use Platform Events for async integration instead of outbound messages",
            "Implement Change Data Capture for near-real-time data replication",
            "Design Apex triggers with bulkification patterns for governor limit compliance"
        ],
        detection_keywords=["salesforce", "apex", "soql", "lightning", "lwc", "sfdc", "sales cloud", "service cloud"]
    )

    spec_mulesoft = Specialization(
        id=existing_specs.get("MuleSoft & API-Led Connectivity", uuid4()),
        name="MuleSoft & API-Led Connectivity",
        description="MuleSoft Anypoint Platform expertise — API-led connectivity, DataWeave transformations, and enterprise integration network design.",
        services_and_patterns="Anypoint Platform, Mule Runtime, CloudHub, Runtime Fabric, API Manager, Exchange, DataWeave, RAML/OAS, Experience API, Process API, System API, Anypoint MQ",
        constraints=[
            "Follow three-layer API-led connectivity pattern (System, Process, Experience)",
            "Design APIs as reusable assets discoverable via Anypoint Exchange",
            "Account for CloudHub worker sizing and vCore allocation",
            "Use DataWeave for all data transformations — avoid Java when possible"
        ],
        examples=[
            "Expose SAP BAPI as a System API with OData-to-REST transformation",
            "Orchestrate multi-system workflows in a Process API layer",
            "Implement circuit breaker and retry policies in API Manager"
        ],
        detection_keywords=["mulesoft", "anypoint", "dataweave", "raml", "cloudhub", "mule", "api-led"]
    )

    spec_servicenow = Specialization(
        id=existing_specs.get("ServiceNow Platform", uuid4()),
        name="ServiceNow Platform",
        description="ServiceNow ITSM, ITOM, and platform development expertise — workflows, integrations, and enterprise service management.",
        services_and_patterns="ITSM, ITOM, ITBM, CMDB, Flow Designer, IntegrationHub, Service Portal, App Engine Studio, Scripted REST APIs, ATF, Update Sets, Scoped Applications",
        constraints=[
            "Follow ServiceNow best practices for scoped application development",
            "Design integrations through IntegrationHub rather than custom MID server scripts",
            "Maintain CMDB data quality with discovery and reconciliation rules",
            "Consider upgrade compatibility — avoid modifying out-of-box objects directly"
        ],
        examples=[
            "Use Flow Designer for no-code workflow orchestration instead of legacy workflows",
            "Implement CMDB-driven service mapping for impact analysis",
            "Design Scripted REST APIs for bi-directional integration with external ITSM tools"
        ],
        detection_keywords=["servicenow", "itsm", "itom", "cmdb", "snow", "flow designer", "integrationhub"]
    )

    spec_oracle = Specialization(
        id=existing_specs.get("Oracle ERP Cloud & Fusion", uuid4()),
        name="Oracle ERP Cloud & Fusion",
        description="Oracle Cloud ERP and Fusion Applications expertise — financials, procurement, supply chain, and integration via Oracle Integration Cloud.",
        services_and_patterns="Oracle ERP Cloud, Oracle Fusion, Oracle Integration Cloud (OIC), VBCS, Oracle APEX, BI Publisher, OTBI, FBDI, REST/SOAP APIs, Oracle SOA Suite, PaaS Extension",
        constraints=[
            "Prefer Oracle Integration Cloud (OIC) for SaaS-to-SaaS connectivity",
            "Use FBDI for bulk data imports rather than custom interfaces",
            "Follow Oracle extension framework patterns — avoid kernel modifications",
            "Design reports using OTBI for real-time or BI Publisher for pixel-perfect output"
        ],
        examples=[
            "Implement OIC recipes for Workday-to-Oracle HCM data sync",
            "Use FBDI templates for high-volume journal import during migration",
            "Design VBCS extensions for custom Fusion UI requirements"
        ],
        detection_keywords=["oracle", "fusion", "oic", "erp cloud", "fbdi", "otbi", "oracle integration"]
    )

    for sp in [spec_aws, spec_k8s, spec_agile, spec_stem, spec_humanities, spec_sap, spec_salesforce, spec_mulesoft, spec_servicenow, spec_oracle]:
        storage.save_specialization(sp)

    # 5. INITIAL COMPOSITION
    comp1 = Composition(
        id=existing_comps.get("Cloud Architect - Mermaid Diagrammer", uuid4()),
        name="Cloud Architect - Mermaid Diagrammer",
        actor_id=actor_sre.id,
        skill_ids=[skill_mermaid.id],
        specialization_ids=[spec_aws.id, spec_k8s.id]
    )
    comp2 = Composition(
        id=existing_comps.get("Agile Product Owner - Story Writer", uuid4()),
        name="Agile Product Owner - Story Writer",
        actor_id=actor_po.id,
        skill_ids=[skill_story.id],
        specialization_ids=[spec_agile.id]
    )
    comp3 = Composition(
        id=existing_comps.get("Teaching Assistant - STEM Rubric Evaluator", uuid4()),
        name="Teaching Assistant - STEM Rubric Evaluator",
        actor_id=actor_ta.id,
        skill_ids=[skill_rubric_grading.id],
        specialization_ids=[spec_stem.id]
    )
    comp4 = Composition(
        id=existing_comps.get("Teaching Assistant - Humanities Essay Evaluator", uuid4()),
        name="Teaching Assistant - Humanities Essay Evaluator",
        actor_id=actor_ta.id,
        skill_ids=[skill_rubric_grading.id],
        specialization_ids=[spec_humanities.id]
    )

    for c in [comp1, comp2, comp3, comp4]:
        storage.save_composition(c)

    # 6. GOALS (+ SAMPLES) — seeded from the DB so the same definitions serve
    # both a full seed and a top-up on an older DB that predates Goals.
    _seed_goals(storage)


def _seed_goals(storage: "SQLiteStorage", resolve_from_db: bool = True) -> None:
    """Seed the default Goals (+ Samples) for every domain actor.

    A Goal is a defined task an actor is asked to achieve. Its `key` is the
    audit-log call_type — the unit of tracking and tuning. Samples are
    interchangeable example inputs that all exercise the same goal. Entity ids
    are resolved by name/key from the DB, so this is safe to run as a top-up
    against an existing catalog without disturbing other data.
    """
    dom = {d.name: d.id for d in storage.list_domains()}
    act = {a.name: a.id for a in storage.list_actors()}
    sk = {s.name: s.id for s in storage.list_skills()}
    existing_goals = {g.key: g.id for g in storage.list_goals()}

    # Any referenced entity must exist; bail quietly if the catalog is absent.
    if not dom or not act:
        return

    goals = [
        # ── Software Engineering: Software Architect ──
        Goal(
            id=existing_goals.get("build_mermaid_diagram", uuid4()),
            key="build_mermaid_diagram",
            name="Build a Mermaid Diagram",
            description="Produce a valid, renderable Mermaid diagram of a system or flow.",
            domain_id=dom["Software Engineering"],
            actor_ids=[act["Software Architect"], act["Site Reliability Engineer"], act["Enterprise Architect"]],
            suggested_skill_id=sk.get("Mermaid Diagram Building"),
            samples=[
                Sample(label="E-commerce checkout flow", input="Design an e-commerce checkout flow with auth, payment processing, inventory reservation, and email notifications. Produce an architecture overview and a Mermaid diagram of the services and their interactions."),
                Sample(label="Real-time notification service", input="Design a real-time notification service that fans out events to web, mobile push, and email. Address delivery guarantees, backpressure, and retry/dead-letter handling. Include a Mermaid diagram."),
                Sample(label="CI/CD pipeline", input="Diagram a CI/CD pipeline from commit to production: build, test, security scan, staging deploy, approval gate, and blue-green production rollout. Include a Mermaid diagram."),
            ],
        ),
        Goal(
            id=existing_goals.get("api_design", uuid4()),
            key="api_design",
            name="Design an API Contract",
            description="Design a clean REST/OpenAPI contract or event schema for a service.",
            domain_id=dom["Software Engineering"],
            actor_ids=[act["Software Architect"]],
            suggested_skill_id=sk.get("API Contract Design"),
            samples=[
                Sample(label="Orders API", input="Design a REST API for an Orders service: create/read/cancel orders, list a customer's orders with pagination, and explicit error responses. Provide an OpenAPI 3.0 sketch."),
                Sample(label="Webhook event schema", input="Design the event payload schema a payment provider would POST to our webhook for payment success, failure, and refund events, with versioning and idempotency keys."),
                Sample(label="Search API", input="Design a product search API with filtering, sorting, faceted results, and cursor pagination. Include request/response schemas and error cases."),
            ],
        ),

        # ── Infrastructure & Ops: Site Reliability Engineer ──
        Goal(
            id=existing_goals.get("design_infrastructure", uuid4()),
            key="design_infrastructure",
            name="Design Cloud Infrastructure",
            description="Design reliable, scalable cloud infrastructure with a topology diagram.",
            domain_id=dom["Infrastructure & Ops"],
            actor_ids=[act["Site Reliability Engineer"]],
            suggested_skill_id=sk.get("Mermaid Diagram Building"),
            samples=[
                Sample(label="HA web tier on AWS", input="Design a highly available, auto-scaling web tier on AWS across three availability zones, with a load balancer, health checks, and zero-downtime deploys. Include a Mermaid diagram of the network topology and failover paths."),
                Sample(label="Multi-region DR", input="Design a multi-region disaster-recovery setup for a stateful service with an RPO of 5 minutes and an RTO of 30 minutes. Cover data replication, failover, and failback. Include a Mermaid diagram."),
                Sample(label="Observability stack", input="Design an observability stack (metrics, logs, traces) for a microservices platform, including collection, storage, alerting, and dashboards. Include a Mermaid diagram."),
            ],
        ),
        Goal(
            id=existing_goals.get("write_runbook", uuid4()),
            key="write_runbook",
            name="Write an Incident Runbook",
            description="Write an operational runbook for detecting and resolving an incident.",
            domain_id=dom["Infrastructure & Ops"],
            actor_ids=[act["Site Reliability Engineer"]],
            samples=[
                Sample(label="Elevated 5xx errors", input="Write an incident response runbook for a sudden spike in 5xx errors on the checkout API. Cover detection, triage, mitigation, rollback, and comms, with clear ownership at each step."),
                Sample(label="Database failover", input="Write a runbook for a primary database failure: detection, promoting a replica, redirecting traffic, verifying integrity, and post-incident review."),
                Sample(label="Certificate expiry", input="Write a runbook for a TLS certificate expiry outage: detection, emergency reissue/rotation, validation, and prevention via monitoring."),
            ],
        ),

        # ── Product & Business Analyst: Product Owner ──
        Goal(
            id=existing_goals.get("generate_stories", uuid4()),
            key="generate_stories",
            name="Write User Stories",
            description="Decompose a need into INVEST user stories with testable acceptance criteria.",
            domain_id=dom["Product & Business Analyst"],
            actor_ids=[act["Product Owner"]],
            suggested_skill_id=sk.get("User Story Writing"),
            samples=[
                Sample(label="Returns workflow", input="Our customers need to return online orders. Break this into INVEST user stories with testable acceptance criteria, covering initiating a return, printing a label, tracking status, and issuing a refund."),
                Sample(label="Saved payment methods", input="Customers want to save and reuse payment methods. Write user stories covering adding, selecting, editing, and deleting a saved method, with security-aware acceptance criteria."),
                Sample(label="Order notifications", input="Customers want notifications about their order status. Write user stories for email and push notifications across order placed, shipped, and delivered, with opt-out handling."),
            ],
        ),
        Goal(
            id=existing_goals.get("process_analysis", uuid4()),
            key="process_analysis",
            name="Analyze a Business Process",
            description="Map a current-state process and propose an improved future state with a flow diagram.",
            domain_id=dom["Product & Business Analyst"],
            actor_ids=[act["Product Owner"]],
            suggested_skill_id=sk.get("Mermaid Diagram Building"),
            samples=[
                Sample(label="Invoice approval", input="Map the current-state manual invoice approval process (email-based, no tracking) and propose a future-state automated workflow with approval routing and SLA escalation. Include a Mermaid swimlane-style diagram."),
                Sample(label="Customer onboarding", input="Map the current customer onboarding process and propose a streamlined future state that reduces time-to-value. Include a Mermaid diagram."),
                Sample(label="Support ticket triage", input="Analyze the support ticket triage process and propose an automated routing and prioritization workflow. Include a Mermaid diagram with decision points."),
            ],
        ),

        # ── InfoSec & Security: Security Architect ──
        Goal(
            id=existing_goals.get("threat_modeling", uuid4()),
            key="threat_modeling",
            name="Threat-Model a System",
            description="Perform a STRIDE threat model with trust boundaries and mitigations.",
            domain_id=dom["InfoSec & Security"],
            actor_ids=[act["Security Architect"]],
            suggested_skill_id=sk.get("Mermaid Diagram Building"),
            samples=[
                Sample(label="Customer login", input="Perform a STRIDE threat model of a customer login flow that uses email/password plus OAuth social login. Identify threats per category, the trust boundaries, and concrete mitigations. Include a Mermaid data-flow diagram with trust boundaries."),
                Sample(label="Payment processing", input="Threat-model the payment processing path from checkout to third-party gateway. Identify threats, PCI-relevant controls, and mitigations. Include a Mermaid diagram."),
                Sample(label="Admin API", input="Threat-model an internal admin API that can modify customer accounts. Cover authn/authz, privilege escalation, auditing, and mitigations. Include a Mermaid diagram."),
            ],
        ),
        Goal(
            id=existing_goals.get("security_review", uuid4()),
            key="security_review",
            name="Security Review",
            description="Review a design or configuration for security issues and recommend fixes.",
            domain_id=dom["InfoSec & Security"],
            actor_ids=[act["Security Architect"]],
            samples=[
                Sample(label="Secrets handling", input="Review this approach and flag security issues: API keys committed to the repo in config.json, passed to services via environment variables, and logged at startup for debugging. Recommend a compliant secrets strategy."),
                Sample(label="S3 bucket exposure", input="Review an architecture where user-uploaded files are stored in a public S3 bucket with predictable object keys. Identify the risks and recommend a secure design."),
                Sample(label="JWT handling", input="Review a design that stores JWTs in localStorage and never expires them. Identify the risks and recommend secure token handling."),
            ],
        ),

        # ── K-12 Education: Teaching Assistant ──
        Goal(
            id=existing_goals.get("evaluate_student_rubric", uuid4()),
            key="evaluate_student_rubric",
            name="Grade a Student Submission",
            description="Evaluate a student's work against a provided rubric with evidence and feedback.",
            domain_id=dom["K-12 Education"],
            actor_ids=[act["Teaching Assistant"]],
            suggested_skill_id=sk.get("Rubric-Based Assessment & Grading"),
            samples=[
                Sample(
                    label="Math exam (with rubric)",
                    input="EVALUATE STUDENT SUBMISSION:\n\nStudent Name: Alex Smith\nMath Exam Answers:\nProblem 1: 3x + 5 = 20 => 3x = 15 => x = 5 (Step-by-step derivation correct)\nProblem 2: Calculate area of circle (r=4): A = pi * 4^2 = 16 * 3.14 = 50.24 (Correct)\nProblem 3: 4 * 8 = 36 (Arithmetic error, setup was correct)",
                    supplemental_label="Grading Rubric",
                    supplemental="PRESCRIBED MATH GRADING RUBRIC (4-Point Scale):\n- 4 (Advanced): Complete conceptual understanding. All work shown step-by-step with accurate arithmetic and clear reasoning.\n- 3 (Proficient): Clear understanding. Correct setup and formula application; a minor arithmetic slip permitted (-0.5 pt).\n- 2 (Developing): Partial understanding. Correct formula choice but multiple calculation errors or incomplete steps.\n- 1 (Beginning): Minimal understanding. Incorrect formula applied or unattempted steps.",
                ),
                Sample(
                    label="Short essay (with rubric)",
                    input="EVALUATE STUDENT SUBMISSION:\n\nStudent Name: Jordan Lee\nPrompt: Argue whether school uniforms should be mandatory.\nEssay: School uniforms should be required because they reduce distractions and make mornings easier. Everyone looks the same so there is less bullying about clothes. Some people say uniforms limit expression but students can express themselves in other ways.",
                    supplemental_label="Grading Rubric",
                    supplemental="ESSAY RUBRIC (4 dimensions, 100 pts):\n1. Thesis & Argument (25): clear, defensible thesis with support.\n2. Evidence (25): specific evidence with analysis.\n3. Structure & Transitions (25): logical progression.\n4. Grammar & Style (25): grade-appropriate mechanics.",
                ),
                Sample(
                    label="Science short answer",
                    input="EVALUATE STUDENT SUBMISSION:\n\nStudent Name: Sam Rivera\nQuestion: Explain why ice floats on water.\nAnswer: Ice floats because it is lighter than water. When water freezes it expands so it is less dense.",
                    supplemental_label="Grading Rubric",
                    supplemental="SCIENCE SHORT-ANSWER RUBRIC (4-Point): 4 = correct concept (density) with accurate explanation; 3 = correct concept, minor imprecision; 2 = partially correct; 1 = incorrect concept.",
                ),
            ],
        ),
        Goal(
            id=existing_goals.get("learning_gap_analysis", uuid4()),
            key="learning_gap_analysis",
            name="Analyze Learning Gaps",
            description="Analyze class results to surface misconceptions and recommend interventions.",
            domain_id=dom["K-12 Education"],
            actor_ids=[act["Teaching Assistant"]],
            suggested_skill_id=sk.get("Formative Learning Gap Analysis"),
            samples=[
                Sample(label="Fractions quiz", input="Analyze these class results on a fractions quiz: 18 of 24 students correctly found common denominators, but 15 of 24 incorrectly added numerators AND denominators when summing fractions. Identify the misconception and recommend concrete re-teaching strategies."),
                Sample(label="Reading comprehension", input="Analyze class results on a reading comprehension unit: most students identified the main idea but struggled to cite textual evidence. Identify the gap and recommend targeted interventions."),
                Sample(label="Algebra word problems", input="Analyze results where students solve equations correctly in isolation but fail to translate word problems into equations. Identify the gap and recommend instructional strategies."),
            ],
        ),

        # ── Enterprise Architecture: Enterprise Architect ──
        Goal(
            id=existing_goals.get("integration_design", uuid4()),
            key="integration_design",
            name="Design System Integration",
            description="Design an integration architecture connecting enterprise systems.",
            domain_id=dom["Enterprise Architecture"],
            actor_ids=[act["Enterprise Architect"]],
            suggested_skill_id=sk.get("Enterprise Application Integration"),
            samples=[
                Sample(label="CRM + ERP + legacy", input="Design an integration architecture connecting a Salesforce CRM, an SAP ERP, and a legacy on-prem order management system. Specify the integration pattern, canonical data model, error/retry strategy, and system-of-record ownership. Include a Mermaid diagram."),
                Sample(label="HR data sync", input="Design an integration to sync employee data from Workday to three downstream systems with different schemas and update frequencies. Address canonical modeling and idempotency. Include a Mermaid diagram."),
                Sample(label="Event backbone", input="Design an event-driven backbone so that an 'order placed' event reliably reaches inventory, billing, and analytics. Cover the messaging pattern, schema governance, and failure handling. Include a Mermaid diagram."),
            ],
        ),
        Goal(
            id=existing_goals.get("technology_roadmap", uuid4()),
            key="technology_roadmap",
            name="Plan a Technology Roadmap",
            description="Produce a phased modernization roadmap aligned to business priorities.",
            domain_id=dom["Enterprise Architecture"],
            actor_ids=[act["Enterprise Architect"]],
            suggested_skill_id=sk.get("Technology Roadmap Planning"),
            samples=[
                Sample(label="Monolith to services", input="Produce a phased technology roadmap to modernize a monolithic retail platform into domain-aligned services over 18 months. Use Now/Next/Later phases with dependencies, decision gates, and risk per initiative."),
                Sample(label="Cloud migration", input="Produce a roadmap to migrate on-prem workloads to the cloud over four quarters, sequencing by risk and dependency, with capability and skills assessment per phase."),
                Sample(label="Data platform modernization", input="Produce a roadmap to consolidate fragmented reporting databases into a governed data platform, with phases, dependencies, and measurable success criteria."),
            ],
        ),
    ]

    for g in goals:
        storage.save_goal(g)
