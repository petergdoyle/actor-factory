# Guide: Running the Test Bench

A practical walkthrough of a full Test Bench run.

## 1. Choose what the model should be

Either:
- **Load a preset Composition Profile** from the dropdown (a saved Persona + Specialization + Skill bundle), or
- Pick the **Persona**, **Specialization**, and **Skill** individually in the Active Composition Profile panel.

Selecting a Domain also loads a relevant **sample input** automatically.

## 2. Provide the input

The **Raw Input Payload** is the actual task: a design brief, a student submission to grade, code to review, etc. Use **Load sample input…** to drop in a domain-relevant example, or type your own.

The **LLM Goal Tag** labels the kind of call for the audit log (e.g. `evaluate_student_rubric`). It is metadata, not an instruction.

## 3. (Optional) Attach reference material

For evaluation tasks, attach a **grading rubric** (pick a sample or paste your own) so the model scores against your exact criteria.

## 4. Pick a model

The **Model Provider** dropdown defaults to your active configured model — and, when one is already loaded in Ollama's memory, to that (so there's no cold-load delay). You can override it per run.

## 5. Run and read

Click **Run Composition Engine**. Output streams as raw text while generating; once complete, the rendered view shows formatted Markdown with any Mermaid diagrams drawn. Toggle **Raw / Rendered**, and use **Download .md** to save the result.

## Tips

- Larger models (e.g. gemma3:12b) give richer, more complete structured output but take longer per run. Smaller models (e.g. llama3.2) iterate faster.
- The first run after an idle period includes a one-time model load; subsequent runs are faster while the model stays warm.
- Mermaid diagrams are automatically repaired for common syntax slips before rendering, so near-valid diagrams still display.
