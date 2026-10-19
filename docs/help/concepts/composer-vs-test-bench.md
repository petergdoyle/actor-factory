# Composer vs. Test Bench

These two screens work together but do different jobs. A common point of confusion is seeing the compiled prompt in the Composer but not in the Test Bench — this guide clears that up.

## Composer — design and read the instructions

The Composer is where you **build and inspect the system prompt**:

- Pick a Persona × Specialization × Skill.
- It live-compiles and shows you the actual **Compiled System Prompt Preamble** — the instructions the model will receive.
- You can **Save Profile to Catalog** (a reusable Composition) or **Load into Test Bench**.

Think of the Composer as: *design and read the instructions.*

## Test Bench — run the instructions against a real task

The Test Bench is where you **execute** a composition:

- Pick (or load) a composition, provide a **raw input** (the actual task or submission), optionally attach reference material (like a grading rubric), pick a model, and **Run**.
- The output streams back. Mermaid diagrams are repaired and rendered once the run completes.

Think of the Test Bench as: *feed a real task to those instructions and see what the model produces.*

## Why the system prompt shows in the Composer but not the Test Bench

The compiled **system prompt** is assembled the same way in both places (from the persona/spec/skill). The Composer *displays* it; the Test Bench sends the building blocks to the server, which recompiles the system prompt at run time and streams the result.

So in the Test Bench you provide and see the **raw input** (your task); the system prompt runs behind the scenes. The two screens are two halves of the same loop: **compose the instructions, then run a task against them.**

## Reference material (rubrics)

In the Test Bench you can attach **supplemental reference material** — most commonly a grading rubric for evaluation tasks. This is passed alongside your input so the model grades or reviews against your exact criteria.
