# Building Blocks: Domain, Persona, Specialization, Skill

ActorFactory composes a system prompt from four kinds of reusable block. Understanding what each one contributes is the key to using the tool well.

## Domain — the problem space

A **Domain** sets the context and supplies parameters. For example, *Software Engineering* carries parameters like `architecture_style: microservices` and `api_style: REST / OpenAPI`. The domain frames everything the persona reasons about.

## Persona (Actor) — WHO is answering

A **Persona** (also called an Actor) is the identity the model adopts: its role, core concerns, vocabulary, thinking patterns, and quality criteria. For example, a *Software Architect* decomposes into bounded contexts, defines interfaces before implementations, and considers failure modes.

The persona answers **who** is responding.

## Specialization — WITH what expertise

A **Specialization** layers domain-specific expertise on top of the persona. For example, *Amazon Web Services (AWS)* tells the model to reference specific AWS services and the Well-Architected Framework rather than generic equivalents.

The specialization answers **with what expertise**.

## Skill — WHAT output form

A **Skill** defines the shape and quality bar of the output: its format, validation rules, quality patterns, and anti-patterns. For example, *Mermaid Diagram Building* requires valid, renderable Mermaid with quoted labels and complete arrows.

The skill answers **what** the model should produce and in what form.

## How they combine

When you select a Persona × Specialization × Skill, ActorFactory compiles them — identity first, then expertise, then the task format and quality criteria — into one system prompt. The **Composer** shows you exactly what that compiled prompt looks like.
