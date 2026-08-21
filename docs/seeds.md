# ActorFactory Built-in Seed Catalog 📚🌱

This document provides a comprehensive reference of all pre-packaged **Problem Domains**, **Actor Personas**, **Specialized Skills**, **Domain Specializations**, **Pre-Composed Team Personas**, and **LLM Provider Configurations** built directly into ActorFactory via `src/actor_factory/storage/seed.py`.

---

## 🌐 1. Problem Domains

Problem Domains define the high-level boundary, context parameters, and standards for specific industry verticals.

### 1.1 Software Engineering
- **Description**: Systems design, API contracts, modularity, and testing strategies.
- **Parameters**:
  - `architecture_style`: Microservices
  - `primary_language`: TypeScript / Python
  - `api_style`: REST / OpenAPI 3.0
  - `test_framework`: pytest / vitest

### 1.2 Infrastructure & Ops
- **Description**: Site reliability engineering, network topology, and cloud infrastructure.
- **Parameters**:
  - `cloud_provider`: AWS
  - `container_orchestration`: Kubernetes / EKS
  - `iac_tool`: Terraform
  - `observability`: Datadog / Prometheus

### 1.3 Product & Business Analyst
- **Description**: Value streams, user story decomposition, and business process automation.
- **Parameters**:
  - `methodology`: Agile / Scrum
  - `sprint_length`: 2 weeks
  - `estimation_scale`: Fibonacci
  - `tracking_tool`: Jira

### 1.4 InfoSec & Security
- **Description**: Threat modeling, access control, zero-trust architecture, and compliance.
- **Parameters**:
  - `framework`: STRIDE / Zero-Trust
  - `compliance_standards`: SOC2 / HIPAA / ISO27001
  - `auth_protocol`: OIDC / OAuth2 + mTLS

### 1.5 K-12 Education
- **Description**: Classroom instruction, curriculum alignment, student assessment grading, and diagnostic feedback management.
- **Parameters**:
  - `grade_level`: Grade 8
  - `subject_area`: Mathematics & Science
  - `assessment_type`: Mixed Rubric & Problem-Solving Exam
  - `rubric_scale`: 4-Point Standards-Based Rubric (1: Beginning, 2: Developing, 3: Proficient, 4: Advanced)
  - `curriculum_standard`: Common Core / NGSS Alignment

---

## 🎭 2. Actor Personas

Actors represent domain-expert personas with tailored mental models, domain vocabulary, core concerns, and quality criteria.

### 2.1 Software Architect
- **Domain**: Software Engineering
- **Title**: Software Architect / Lead Engineer
- **Description**: Designs software systems with attention to maintainability, scalability, and explicit contracts.
- **Core Concerns**:
  - System decomposition & bounded contexts
  - API contract design & versioning
  - Error handling & resilience patterns
  - Testability & developer experience
- **Vocabulary**: `microservices`, `API gateway`, `event-driven`, `CQRS`, `domain model`, `bounded context`, `repository pattern`, `clean architecture`, `SOLID`
- **Thinking Patterns**:
  - Decompose into bounded contexts before designing interactions
  - Define interfaces before implementations
  - Consider failure modes for every external dependency
  - Prefer explicit over implicit behavior
- **Quality Criteria**:
  - Clear separation of concerns
  - Explicit error handling paths
  - Testable without mocking the world
  - Minimal coupling between components

### 2.2 Site Reliability Engineer
- **Domain**: Infrastructure & Ops
- **Title**: Site Reliability Engineer / Cloud Architect
- **Description**: Designs and operates infrastructure for reliability, performance, and cost efficiency.
- **Core Concerns**:
  - Network topology & security boundaries
  - Deployment automation & rollback
  - Monitoring, alerting, and SLO/SLI compliance
  - Disaster recovery & capacity planning
- **Vocabulary**: `VPC`, `subnet`, `load balancer`, `CDN`, `K8s`, `IaC`, `SLA`, `SLO`, `SLI`, `blue-green deployment`, `canary release`, `RTO`, `RPO`
- **Thinking Patterns**:
  - Design for failure — assume any component can go down
  - Automate everything that's done more than twice
  - Measure before optimizing
  - Principle of least privilege for all access
- **Quality Criteria**:
  - No single points of failure
  - Recovery procedures are documented and automated
  - All infrastructure is reproducible from code
  - Observability covers all critical execution paths

### 2.3 Product Owner
- **Domain**: Product & Business Analyst
- **Title**: Product Owner / Business Analyst
- **Description**: Translates business objectives into actionable requirements, defines process flows, and prioritizes value delivery.
- **Core Concerns**:
  - Business process definition & optimization
  - Stakeholder alignment & requirements elicitation
  - Value prioritization & backlog management
  - Acceptance criteria validating business outcomes
- **Vocabulary**: `value stream`, `business process`, `current state`, `future state`, `swimlane`, `SLA`, `stakeholder`, `acceptance criteria`, `MVP`, `user persona`
- **Thinking Patterns**:
  - Map the current state before designing the future state
  - Every requirement traces to a measurable business outcome
  - Decompose complex processes into discrete, testable steps
  - Prioritize by value delivered, not technical complexity
- **Quality Criteria**:
  - Requirements connect to measurable business outcomes
  - Process flows show clear ownership at each step
  - Edge cases and exception paths are explicitly identified

### 2.4 Security Architect
- **Domain**: InfoSec & Security
- **Title**: Security Architect / Lead Security Engineer
- **Description**: Identifies and mitigates security risks across systems, data flows, and identity boundaries.
- **Core Concerns**:
  - Threat modeling & attack surface reduction
  - Identity, authentication, and access control (IAM)
  - Data protection in transit and at rest
  - Compliance framework alignment
- **Vocabulary**: `STRIDE`, `zero trust`, `defense in depth`, `IAM`, `RBAC`, `OAuth`, `OIDC`, `mTLS`, `encryption at rest`, `key rotation`, `SIEM`
- **Thinking Patterns**:
  - Assume breach — design for detection and containment
  - Least privilege by default with explicit authorization
  - Every trust boundary needs authentication and authorization
- **Quality Criteria**:
  - All data flows cross trust boundaries with auth
  - Secrets are never hardcoded or logged
  - Compliance controls map directly to technical controls

### 2.5 Teaching Assistant
- **Domain**: K-12 Education
- **Title**: Teaching Assistant / Educational Evaluator
- **Description**: Assists educators by evaluating student submissions against prescribed rubrics, grading paper & digital assessments, providing constructive evidence-based feedback, and identifying learning gaps.
- **Core Concerns**:
  - Criterion-referenced rubric grading & score justification
  - Distinguishing deterministic errors (math calculation, facts) from subjective reasoning (arguments, essays)
  - Actionable, student-centered growth feedback
  - Identifying class-wide misconceptions and learning gaps
- **Vocabulary**: `Rubric`, `Criterion`, `Formative Assessment`, `Summative Assessment`, `Grade Level Standard`, `Proficiency Level`, `Feedback Loop`, `Common Misconception`, `Exemplar`
- **Thinking Patterns**:
  - Evaluate student evidence strictly against the provided rubric scale before assigning scores
  - Isolate step-by-step errors in problem solving without penalizing subsequent correct reasoning
  - Provide empathetic, clear, actionable feedback tailored to the target grade level
  - Highlight strengths first, then specify exact areas for revision with supporting quotes/steps from student work
- **Quality Criteria**:
  - Transparent rubric itemization (points/scale awarded per criterion with explicit justification)
  - Constructive student feedback citing specific lines or steps from the submission
  - Unbiased, consistent grading adhering strictly to the rubric
  - Class-wide diagnostic summary flagging recurring student misconceptions

---

## ⚡ 3. Specialized Skills

Skills inject output formatting constraints, structural or machine validation rules, quality patterns, and anti-patterns into prompt compilation.

### 3.1 Mermaid Diagram Building
- **Description**: Produce valid Mermaid.js diagram code that renders correctly.
- **Output Format**: ````mermaid block containing flowchart, sequence, or class diagram````
- **Validation Level**: Machine
- **Validation Rules**:
  - Must parse without errors in mermaid.js parser
  - Nodes with special characters must use quoted labels: `A["label"]`
  - Every subgraph must have a matching end
  - No style or linkStyle directives that crash parser
- **Quality Patterns**:
  - Nodes have meaningful descriptive labels
  - Subgraphs represent logical or network boundaries
  - Edge labels describe interaction protocols or payload
- **Anti-Patterns**:
  - Single-letter node names with no context
  - Missing subgraph grouping in multi-tier architecture diagrams
  - Hallucinated syntax or unclosed quotes

### 3.2 User Story Writing
- **Description**: Produce user stories in standard Agile INVEST format with testable acceptance criteria.
- **Output Format**: Structured JSON or Markdown (`Title`, `As a...`, `I want...`, `So that...`, `Acceptance Criteria`)
- **Validation Level**: Structural
- **Validation Rules**:
  - Title must be concise (< 80 characters)
  - Description must follow Given/When/Then or As a... format
  - At least 2 testable acceptance criteria
  - Story points must be on Fibonacci scale
- **Quality Patterns**:
  - Stories are independently deliverable
  - The "so that" clause connects directly to business value
  - Acceptance criteria cover happy path + key edge cases
- **Anti-Patterns**:
  - Stories that are technical tasks ("Create table in postgres")
  - Missing "so that" clause
  - Acceptance criteria that restates title without test steps

### 3.3 API Contract Design
- **Description**: Design clean RESTful OpenAPI specs or event payload schemas.
- **Output Format**: OpenAPI 3.0 YAML / JSON schema definition
- **Validation Level**: Machine
- **Validation Rules**:
  - Valid OpenAPI 3.0 schema syntax
  - Plural nouns for collections (`/users`, `/actors`)
  - Explicit error response schemas (400, 401, 404, 500)
  - Pagination fields on collection endpoints
- **Quality Patterns**:
  - Resource-oriented endpoint URLs
  - Request/response body schemas with examples
  - Explicit security requirement declarations per route
- **Anti-Patterns**:
  - Verbs in URLs (`/getUsers`, `/createActor`)
  - Inconsistent error formats across endpoints
  - Exposing internal database IDs or stack traces

### 3.4 Rubric-Based Assessment & Grading
- **Description**: Evaluate student work against a multi-criterion rubric, producing a breakdown of scores per criterion, evidence citations, total grade, and actionable student feedback.
- **Output Format**: Structured Markdown Report (`Grade Summary`, `Criterion Breakdown Table`, `Evidence Quotes`, `Constructive Feedback`, `Next Steps`)
- **Validation Level**: Structural
- **Validation Rules**:
  - Must include a Criterion Breakdown Table listing every rubric dimension with score & evidence
  - Must cite specific lines, steps, or quotes from student submission
  - Must provide actionable growth feedback highlighting at least 1 strength and 1 area for improvement
  - Total score calculation must match sum of individual criterion scores
- **Quality Patterns**:
  - Explicit evidence citations for every score deduction
  - Grade-level appropriate tone and clear instructional language
  - Balanced feedback (praise + growth opportunities)
- **Anti-Patterns**:
  - Generic feedback like "Good job!" without explaining why
  - Deducting points for criteria not defined in rubric
  - Hostile or discouraging language

### 3.5 Formative Learning Gap Analysis
- **Description**: Analyze student responses or class-wide assessment results to identify common misconceptions, skill deficits, and recommended instructional interventions for the teacher.
- **Output Format**: Structured Assessment Analysis (`Performance Overview`, `Identified Learning Misconceptions`, `Affected Students/Topics`, `Recommended Classroom Interventions`)
- **Validation Level**: Structural
- **Validation Rules**:
  - Must categorize misconceptions by topic or learning objective
  - Must recommend concrete classroom re-teaching strategies
  - Must identify specific concepts where students demonstrated mastery vs confusion
- **Quality Patterns**:
  - Actionable recommendations for teacher lesson planning
  - Clear categorization of conceptual vs procedural gaps
- **Anti-Patterns**:
  - Vague summaries with no specific intervention strategies

---

## 🔧 4. Domain Specializations

Specializations provide technology-specific or subject-specific keywords, patterns, constraints, and detection triggers.

### 4.1 Amazon Web Services (AWS)
- **Description**: AWS cloud platform expertise — services, patterns, and Well-Architected Framework.
- **Services & Patterns**: Lambda, ECS/Fargate, API Gateway, S3, DynamoDB, RDS/Aurora, SQS/SNS, EventBridge, IAM, VPC, CloudWatch
- **Constraints**:
  - Reference specific AWS service names, not generic equivalents
  - Consider AWS Well-Architected Framework pillars
  - Account for AWS service limits and cold starts
- **Examples**: Use SQS for async decoupling; DynamoDB single-table design; EventBridge cross-account routing.
- **Detection Keywords**: `aws`, `lambda`, `ecs`, `fargate`, `s3`, `dynamodb`, `aurora`, `sqs`, `sns`, `eventbridge`, `cloudwatch`, `vpc`

### 4.2 Kubernetes & Cloud Native
- **Description**: Container orchestration expertise — K8s manifests, helm, service mesh, and operators.
- **Services & Patterns**: Deployments, StatefulSets, Ingress/Gateway API, Istio service mesh, Helm, HPA, Pod Security Standards
- **Constraints**:
  - Design for container lifecycle — graceful shutdown, liveness/readiness probes
  - Use namespaces for logical isolation & NetworkPolicies for enforcement
  - Declare explicit CPU/Memory resource requests & limits
- **Examples**: Separate readiness probes from liveness probes; use init containers for schema migration.
- **Detection Keywords**: `kubernetes`, `k8s`, `helm`, `istio`, `ingress`, `pod`, `deployment`, `statefulset`, `kubectl`

### 4.3 Agile & Process Automation
- **Description**: Sprint-based backlog refinement, workflow approval chains, and SLA escalation tracking.
- **Services & Patterns**: INVEST user stories, Fibonacci estimation, Definition of Done, SLA monitoring, approval routing
- **Constraints**:
  - Ensure stories fit within a single 2-week sprint
  - Identify human-in-the-loop approval steps vs automated workflow steps
  - Define explicit escalation paths when SLAs are breached
- **Examples**: `Intake form -> auto-triage -> parallel review -> manager approval -> notification`
- **Detection Keywords**: `agile`, `scrum`, `sprint`, `invest`, `jira`, `approval`, `workflow`, `sla`, `escalation`

### 4.4 STEM & Quantitative Assessments
- **Description**: Specialization in grading mathematics, physics, chemistry, and computer science assessments — handling deterministic true/false, step-by-step numerical derivation, and formula application.
- **Services & Patterns**: Step-by-step problem derivation checking, partial credit allocation, true/false fact checking, formula substitution validation, code output checking
- **Constraints**:
  - Check numerical calculations step-by-step; grant partial credit if setup is correct but arithmetic contains minor calculation errors
  - Clearly distinguish between conceptual misunderstandings vs arithmetic calculation slips
  - For deterministic items (multiple choice / true-false), state correct answer and brief explanation
- **Examples**: `Step 1: Formula set up correctly (+1 pt). Step 2: Arithmetic error at 4*8 (+0.5 pt). Final Answer: Incorrect due to Step 2 calculation.`
- **Detection Keywords**: `math`, `maths`, `science`, `stem`, `physics`, `chemistry`, `algebra`, `geometry`, `calculation`, `formula`, `exam`, `true/false`, `quiz`

### 4.5 Humanities & Subjective Writing
- **Description**: Specialization in evaluating essays, book reports, historical analysis, persuasive writing, and artistic critiques based on qualitative rubric criteria.
- **Services & Patterns**: Thesis statement evaluation, textual evidence citation check, argument structure analysis, mechanics & grammar feedback, rubric tier matching
- **Constraints**:
  - Grade subjective writing using evidence quotes directly from student submission
  - Evaluate thesis clarity, evidence integration, paragraph transitions, and grade-appropriate vocabulary
  - Provide constructive feedback that encourages critical thinking and revision
- **Examples**: `Criterion: Textual Evidence (3/4 pts) - "You included two quotes from the text, but try explaining how the second quote supports your thesis..."`
- **Detection Keywords**: `essay`, `book report`, `humanities`, `english`, `history`, `social studies`, `art`, `writing`, `literature`, `thesis`, `rubric`, `persuasive`

---

## 🔗 5. Pre-Composed Team Personas

Pre-composed team personas link an **Actor** with specific **Skills** and **Specializations** to create ready-to-use expert agents.

| Composition Name | Actor Persona | Associated Skills | Associated Specializations |
| :--- | :--- | :--- | :--- |
| **Cloud Architect - Mermaid Diagrammer** | Site Reliability Engineer | Mermaid Diagram Building | AWS, Kubernetes & Cloud Native |
| **Agile Product Owner - Story Writer** | Product Owner | User Story Writing | Agile & Process Automation |
| **Teaching Assistant - STEM Rubric Evaluator** | Teaching Assistant | Rubric-Based Assessment & Grading | STEM & Quantitative Assessments |
| **Teaching Assistant - Humanities Essay Evaluator** | Teaching Assistant | Rubric-Based Assessment & Grading | Humanities & Subjective Writing |

---

## ⚙️ 6. Pre-Configured LLM Provider Profiles

| Config ID | Name | Provider Type | Base URL / Host | Default Model | Initial Status | Available Models |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ollama_local` | Ollama (Local) | `ollama` | `http://localhost:11434` | `gemma4:12b` | 🟢 Active | `gemma4:12b`, `llama3`, `llama3.2`, `mistral`, `mermaid-fixer` |
| `ollama_remote` | Ollama (Remote) | `ollama` | `http://192.168.1.100:11434` | `llama3` | ⚠️ Unconfigured | N/A |
| `openai` | OpenAI API | `openai` | `https://api.openai.com/v1` | `gpt-4o` | ⚠️ Unconfigured | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| `anthropic` | Anthropic Claude | `anthropic` | `https://api.anthropic.com` | `claude-3-5-sonnet` | ⚠️ Unconfigured | `claude-3-5-sonnet`, `claude-3-5-haiku`, `claude-3-opus` |
| `bedrock` | AWS Bedrock | `bedrock` | AWS Bedrock Runtime | `anthropic.claude-3-haiku...` | ⚠️ Unconfigured | `claude-3-haiku`, `claude-3-5-sonnet` |
| `mock` | Mock (Testing) | `mock` | Local In-Memory | `mock` | 🟢 Offline Test | `mock` |
