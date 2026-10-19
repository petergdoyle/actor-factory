"use client";
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Composition } from './Composer';
import { getApiBaseUrl } from '../utils/api';
import ScreenIntro from './ScreenIntro';
import HelpTip from './HelpTip';

// Rendered view loads Mermaid lazily in the browser only (no SSR).
const MarkdownView = dynamic(() => import('./MarkdownView'), {
  ssr: false,
  loading: () => <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading renderer…</div>,
});

export interface LLMOption {
  id: string;
  name: string;
  model_id: string;
}

export interface DomainItem {
  id: string;
  name: string;
  description: string;
  parameters: any;
}

export interface ActorItem {
  id: string;
  name: string;
  title: string;
  description: string;
  domain_id?: string;
}

export interface SkillItem {
  id: string;
  name: string;
  description: string;
  output_format: string;
}

export interface SpecializationItem {
  id: string;
  name: string;
  description: string;
}

export interface GoalSample {
  label: string;
  input: string;
  supplemental?: string;
  supplemental_label?: string;
}

export interface GoalItem {
  id: string;
  key: string;
  name: string;
  description: string;
  domain_id?: string;
  actor_ids: string[];
  suggested_skill_id?: string;
  samples: GoalSample[];
}

export default function TestBench({ activeComposition, initialPrompt }: { activeComposition?: Composition | null, initialPrompt?: string }) {
  // Empty until the active config loads; backend resolves active default when empty.
  const [modelId, setModelId] = useState('');
  const [callType, setCallType] = useState('design_ecommerce_solution');
  const [availableModelOptions, setAvailableModelOptions] = useState<LLMOption[]>([
    { id: 'mock', name: 'Mock Provider (Testing)', model_id: 'mock' },
    { id: 'ollama_gemma3', name: 'Ollama (gemma3:12b)', model_id: 'ollama:gemma3:12b' },
    { id: 'ollama_llama32', name: 'Ollama (llama3.2:latest)', model_id: 'ollama:llama3.2:latest' },
    { id: 'openai', name: 'OpenAI (gpt-4o)', model_id: 'openai:gpt-4o' },
    { id: 'anthropic', name: 'Anthropic (claude-3-5-sonnet)', model_id: 'anthropic:claude-3-5-sonnet' },
  ]);

  // Catalog Lists from Backend
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationItem[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);

  // Goal selection drives the task: its `key` becomes the audit call_type and
  // its samples populate the sample-input dropdown. Advanced users can type a
  // custom goal key instead.
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [advancedGoal, setAdvancedGoal] = useState(false);

  // Selected Identifiers
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');

  // Form State
  const [domainName, setDomainName] = useState('Software Engineering');
  const [domainParams, setDomainParams] = useState('{\n  "architecture_style": "microservices",\n  "cloud_provider": "AWS"\n}');
  
  const [personaName, setPersonaName] = useState('Software Architect');
  const [personaDesc, setPersonaDesc] = useState('Designs software systems with attention to maintainability, scalability, and explicit contracts.');
  
  const [specName, setSpecName] = useState('Amazon Web Services (AWS)');
  const [specDesc, setSpecDesc] = useState('AWS cloud platform expertise — services, patterns, and Well-Architected Framework.');
  
  const [skillName, setSkillName] = useState('Mermaid Diagram Building');
  const [skillDesc, setSkillDesc] = useState('Produce valid Mermaid.js diagram code that renders correctly.');

  // Supplemental Reference State (generic — a rubric, coding standard, spec, …)
  const [supplementalRef, setSupplementalRef] = useState<string>('');
  const [supplementalLabel, setSupplementalLabel] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [rawRequirements, setRawRequirements] = useState('Design an e-commerce checkout flow with auth, payment processing, inventory reservation, and email notifications.');
  const [output, setOutput] = useState('// Output will stream here from the FastAPI backend execution engine...');
  const [isStreaming, setIsStreaming] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [viewMode, setViewMode] = useState<'raw' | 'rendered'>('rendered');
  const [hasRun, setHasRun] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // When a composition is handed over from the Composer ("Load into Test
  // Bench"), fully populate the persona / specialization / skill selections —
  // not just the name. Runs once the catalogs have loaded so the ids resolve.
  useEffect(() => {
    if (!activeComposition) return;
    if (actors.length === 0 && skills.length === 0 && specializations.length === 0) return;

    if (activeComposition.actor_id) handleActorChange(activeComposition.actor_id);
    if (activeComposition.skill_ids && activeComposition.skill_ids.length > 0) {
      handleSkillChange(activeComposition.skill_ids[0]);
    }
    if (activeComposition.specialization_ids && activeComposition.specialization_ids.length > 0) {
      handleSpecChange(activeComposition.specialization_ids[0]);
    }

    // Default to the first goal for the composition's domain/actor.
    const actor = actors.find(a => a.id === activeComposition.actor_id);
    const ctxGoals = goalsForContext(actor?.domain_id || '', activeComposition.actor_id || '');
    if (ctxGoals.length > 0) applyGoal(ctxGoals[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeComposition, actors, skills, specializations, goals]);

  // Load catalogs from backend
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const [domRes, actRes, sklRes, spcRes, cmpRes, goalRes, cfgRes] = await Promise.all([
          fetch(`${apiBase}/domains`),
          fetch(`${apiBase}/actors`),
          fetch(`${apiBase}/skills`),
          fetch(`${apiBase}/specializations`),
          fetch(`${apiBase}/compositions`),
          fetch(`${apiBase}/goals`),
          fetch(`${apiBase}/llm/configs`)
        ]);

        if (domRes.ok) setDomains(await domRes.json());
        if (actRes.ok) setActors(await actRes.json());
        if (sklRes.ok) setSkills(await sklRes.json());
        if (spcRes.ok) setSpecializations(await spcRes.json());
        if (cmpRes.ok) setCompositions(await cmpRes.json());
        if (goalRes.ok) setGoals(await goalRes.json());

        if (cfgRes.ok) {
          const configs = await cfgRes.json();
          const options: LLMOption[] = [
            { id: 'mock', name: 'Mock Provider (Testing)', model_id: 'mock' }
          ];

          configs.forEach((cfg: any) => {
            if (cfg.available_models && cfg.available_models.length > 0) {
              cfg.available_models.forEach((m: string) => {
                options.push({
                  id: `${cfg.id}_${m}`,
                  name: `${cfg.name} (${m})`,
                  model_id: cfg.provider_type === 'ollama' ? `ollama:${m}` : `${cfg.provider_type}:${m}`
                });
              });
            } else if (cfg.active_model) {
              options.push({
                id: `${cfg.id}_${cfg.active_model}`,
                name: `${cfg.name} (${cfg.active_model})`,
                model_id: cfg.provider_type === 'ollama' ? `ollama:${cfg.active_model}` : `${cfg.provider_type}:${cfg.active_model}`
              });
            }
          });

          if (options.length > 1) {
            setAvailableModelOptions(options);

            // Default the Test Bench to the user's Active Default config/model,
            // not a hard-coded gemma/llama heuristic.
            const activeCfg = configs.find((cfg: any) => cfg.is_active);
            if (activeCfg && activeCfg.active_model) {
              const activeModelId = activeCfg.provider_type === 'ollama'
                ? `ollama:${activeCfg.active_model}`
                : `${activeCfg.provider_type}:${activeCfg.active_model}`;
              // Prefer the exact matching option; otherwise fall back to the id string.
              const match = options.find(o => o.model_id === activeModelId);
              setModelId(match ? match.model_id : activeModelId);
            } else {
              const firstOllama = options.find(o => o.model_id.startsWith("ollama:"));
              if (firstOllama) setModelId(firstOllama.model_id);
            }

            // Prefer a model already loaded in Ollama's memory (zero cold-load
            // delay). On limited hardware only one model runs at a time, so if
            // something is loaded, default to it over the stored active model.
            try {
              const loadedRes = await fetch(`${apiBase}/llm/loaded`);
              if (loadedRes.ok) {
                const loaded = await loadedRes.json();
                if (loaded.recommended) {
                  const loadedModelId = `ollama:${loaded.recommended}`;
                  const match = options.find(o => o.model_id === loadedModelId);
                  if (match) setModelId(match.model_id);
                }
              }
            } catch {
              // Non-fatal: keep the active-config default if /llm/loaded fails.
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadCatalogData();
  }, []);

  // Handle Domain Selection -> Auto-fills Domain params & Strictly Filters Personas
  // Goals available for the current domain + actor context. A goal with no
  // actor_ids applies to any actor in its domain.
  const goalsForContext = (domainId: string, actorId: string): GoalItem[] =>
    goals.filter(
      g =>
        (!domainId || g.domain_id === domainId) &&
        (!actorId || g.actor_ids.length === 0 || g.actor_ids.includes(actorId))
    );

  // Apply a goal's sample to the input / supplemental fields.
  const applyGoalSample = (sample: GoalSample) => {
    setRawRequirements(sample.input);
    setSupplementalRef(sample.supplemental || '');
    setSupplementalLabel(sample.supplemental_label || '');
  };

  // Select a goal: its key becomes the audit call_type; load its first sample.
  const applyGoal = (goal: GoalItem) => {
    setSelectedGoalId(goal.id);
    setCallType(goal.key);
    if (goal.samples.length > 0) applyGoalSample(goal.samples[0]);
  };

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    const selected = domains.find(d => d.id === domainId);
    if (selected) {
      setDomainName(selected.name);
      setDomainParams(JSON.stringify(selected.parameters, null, 2));

      const matchingActors = actors.filter(a => a.domain_id === domainId);
      const actorId = matchingActors.length > 0 ? matchingActors[0].id : '';
      if (actorId) {
        handleActorChange(actorId, domainId);
      } else {
        setSelectedActorId('');
      }

      // Default to the first goal for this domain/actor and load its sample.
      const ctxGoals = goalsForContext(domainId, actorId);
      if (ctxGoals.length > 0) {
        applyGoal(ctxGoals[0]);
      } else {
        setSelectedGoalId('');
      }
    } else {
      setSelectedActorId('');
    }
  };

  // Handle Actor Selection -> Syncs associated Domain
  const handleActorChange = (actorId: string, currentDomainId?: string) => {
    setSelectedActorId(actorId);
    const selected = actors.find(a => a.id === actorId);
    if (selected) {
      setPersonaName(selected.name);
      setPersonaDesc(selected.description || selected.title);

      const targetDomainId = currentDomainId || selected.domain_id;
      if (targetDomainId && targetDomainId !== selectedDomainId) {
        const dom = domains.find(d => d.id === targetDomainId);
        if (dom) {
          setSelectedDomainId(dom.id);
          setDomainName(dom.name);
          setDomainParams(JSON.stringify(dom.parameters, null, 2));
        }
      }
    }
  };

  // Handle Specialization Selection
  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId);
    const selected = specializations.find(s => s.id === specId);
    if (selected) {
      setSpecName(selected.name);
      setSpecDesc(selected.description);
    }
  };

  // Handle Skill Selection
  const handleSkillChange = (skillId: string) => {
    setSelectedSkillId(skillId);
    const selected = skills.find(s => s.id === skillId);
    if (selected) {
      setSkillName(selected.name);
      setSkillDesc(selected.description);
    }
  };

  // Load Preset Saved Composition Profile
  const handleLoadComposition = (compId: string) => {
    const comp = compositions.find(c => c.id === compId);
    if (!comp) return;

    if (comp.actor_id) {
      handleActorChange(comp.actor_id);
    }

    if (comp.skill_ids && comp.skill_ids.length > 0) {
      handleSkillChange(comp.skill_ids[0]);
    }

    if (comp.specialization_ids && comp.specialization_ids.length > 0) {
      handleSpecChange(comp.specialization_ids[0]);
    }

    // Load a relevant sample input from the catalog, based on the domain the
    // composition's actor belongs to.
    // Default to the first goal for the composition's domain/actor, loading its
    // sample input and generic supplemental material.
    const actor = actors.find(a => a.id === comp.actor_id);
    const ctxGoals = goalsForContext(actor?.domain_id || '', comp.actor_id || '');
    if (ctxGoals.length > 0) applyGoal(ctxGoals[0]);
  };

  // Handle Local File Upload (Rubrics, Docs, Code, OpenAPI specs)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSupplementalRef(content);
      }
    };
    reader.readAsText(file);
  };

  const downloadMarkdown = () => {
    const safe = (personaName || 'composition').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe || 'composition'}-${stamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!rawRequirements.trim()) return;
    
    setIsStreaming(true);
    setHasRun(true);
    setRunError(null);
    setOutput('');
    setDuration(0);
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      setDuration(Date.now() - startTime);
    }, 100);

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(domainParams);
    } catch (e) {
      setOutput('Error parsing Domain Parameters JSON');
      setIsStreaming(false);
      clearInterval(interval);
      return;
    }

    const payload = {
      model_id: modelId,
      temperature: 0.2,
      call_type: callType,
      request: {
        domain_context: {
          domain_name: domainName,
          parameters: parsedParams
        },
        raw_user_input: rawRequirements,
        supplemental_reference: supplementalRef,
        target_actors: [
          {
            id: selectedActorId || "00000000-0000-0000-0000-000000000000",
            actor_name: personaName,
            base_persona: {
              id: "00000000-0000-0000-0000-000000000001",
              name: personaName,
              ingredient_type: "Persona",
              core_logic_instruction: personaDesc
            },
            specializations: [
              {
                id: selectedSpecId || "00000000-0000-0000-0000-000000000002",
                name: specName,
                ingredient_type: "Specialization",
                core_logic_instruction: specDesc
              }
            ],
            skill: {
              id: selectedSkillId || "00000000-0000-0000-0000-000000000003",
              name: skillName,
              ingredient_type: "Skill",
              core_logic_instruction: skillDesc
            }
          }
        ]
      }
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      let fullText = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setOutput(prev => prev + chunk);
        }
      }

      // Never leave the canvas blank. If the stream produced nothing, say so
      // explicitly rather than flipping silently to Idle.
      if (!fullText.trim()) {
        setRunError('The run completed but no output was received. The model may still be loading, may have timed out, or returned an empty response. Try running again, or pick a smaller/faster model.');
        return;
      }

      // Once streaming completes, repair any Mermaid blocks server-side via the
      // shared mermaid-repair library. All repair logic lives there — the
      // frontend holds none.
      await finalizeOutput(fullText);
    } catch (err: any) {
      setRunError(err?.message || 'The run failed before any output was received.');
    } finally {
      setIsStreaming(false);
      clearInterval(interval);
    }
  };

  const finalizeOutput = async (rawText: string) => {
    if (!rawText.trim()) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/mermaid/repair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: rawText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.changed && data.markdown) {
          setOutput(data.markdown);
        }
      }
    } catch {
      // Non-fatal: keep the raw streamed output if repair is unavailable.
    }
  };

  const filteredActors = selectedDomainId 
    ? actors.filter(a => a.domain_id === selectedDomainId)
    : actors;

  const getDomainNameForActor = (dId?: string) => {
    if (!dId) return "";
    const dom = domains.find(d => d.id === dId);
    return dom ? dom.name : "";
  };

  return (
    <>
      <ScreenIntro id="testbench" title="🧪 Test Bench — run a composition against a real task">
        Pick (or load) a Persona + Specialization + Skill, choose a <strong>Goal</strong> (the task the actor
        performs), load one of its <strong>sample inputs</strong> or write your own, pick a model, and run. The
        goal is logged with each run so you can track and tune per goal. The system prompt is compiled from your
        building blocks on the server; here you provide the task and watch the output stream back.
      </ScreenIntro>
    <div className="split-view" style={{ gridTemplateColumns: '430px 1fr' }}>
      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Preset Composition Quick Loader */}
        {compositions.length > 0 && (
          <div className="glass-panel" style={{ padding: '12px 16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              ⚡ Load Preset Composition Profile
            </label>
            <select onChange={e => handleLoadComposition(e.target.value)} disabled={isStreaming} style={{ width: '100%', fontSize: '13px' }}>
              <option value="">Select a saved profile...</option>
              {compositions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Domain Context */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>Domain Context</h2>
            {domains.length > 0 && (
              <select 
                value={selectedDomainId} 
                onChange={e => handleDomainChange(e.target.value)} 
                disabled={isStreaming} 
                style={{ width: 'auto', fontSize: '12px', padding: '3px 8px' }}
              >
                <option value="">All Domains...</option>
                {domains.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Domain Name</label>
            <input value={domainName} onChange={e => setDomainName(e.target.value)} disabled={isStreaming} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Parameters (JSON Schema / Defaults)</label>
            <textarea style={{ minHeight: '80px', fontFamily: 'Geist Mono, monospace', fontSize: '12px' }} value={domainParams} onChange={e => setDomainParams(e.target.value)} disabled={isStreaming} />
          </div>
        </div>

        {/* Active Composition Profile */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px' }}>Active Composition Profile</h2>
          
          {/* Persona Selector */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label>1. Persona (Base Identity)<HelpTip text="WHO is answering — the role the model adopts, with its concerns, vocabulary, and quality bar (e.g. Software Architect)." /></label>
              {actors.length > 0 && (
                <select 
                  value={selectedActorId} 
                  onChange={e => handleActorChange(e.target.value)} 
                  disabled={isStreaming} 
                  style={{ width: 'auto', fontSize: '11px', padding: '2px 6px' }}
                >
                  <option value="">Pick Persona...</option>
                  {filteredActors.map(a => {
                    const dName = getDomainNameForActor(a.domain_id);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} {dName ? `[${dName}]` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
            <input value={personaName} onChange={e => setPersonaName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={personaDesc} onChange={e => setPersonaDesc(e.target.value)} disabled={isStreaming} />
          </div>
          
          {/* Specialization Selector */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label>2. Specialization (Expertise)<HelpTip text="WITH what expertise — domain-specific knowledge layered on the persona (e.g. AWS services and patterns)." /></label>
              {specializations.length > 0 && (
                <select 
                  value={selectedSpecId} 
                  onChange={e => handleSpecChange(e.target.value)} 
                  disabled={isStreaming} 
                  style={{ width: 'auto', fontSize: '11px', padding: '2px 6px' }}
                >
                  <option value="">Pick Specialization...</option>
                  {specializations.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <input value={specName} onChange={e => setSpecName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={specDesc} onChange={e => setSpecDesc(e.target.value)} disabled={isStreaming} />
          </div>

          {/* Skill Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label>3. Skill (Output Format)<HelpTip text="WHAT the model produces and in what form — the output format and quality rules (e.g. a valid Mermaid diagram)." /></label>
              {skills.length > 0 && (
                <select 
                  value={selectedSkillId} 
                  onChange={e => handleSkillChange(e.target.value)} 
                  disabled={isStreaming} 
                  style={{ width: 'auto', fontSize: '11px', padding: '2px 6px' }}
                >
                  <option value="">Pick Skill...</option>
                  {skills.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <input value={skillName} onChange={e => setSkillName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={skillDesc} onChange={e => setSkillDesc(e.target.value)} disabled={isStreaming} />
          </div>
        </div>
      </div>

      {/* Main Execution Canvas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Supplemental Reference Material / Rubric Upload Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📎 {supplementalLabel || 'Supplemental Reference Material'}
              <HelpTip text="Optional reference material for the goal — a grading rubric, coding standard, reference spec, etc. Provided alongside the input so the model works against your criteria." />
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Upload File Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                accept=".txt,.md,.json,.csv,.py,.ts,.yaml,.yml,.pdf"
              />
              <button 
                className="btn-secondary" 
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
              >
                📁 Upload Reference File
              </button>
            </div>
          </div>

          <textarea 
            value={supplementalRef}
            onChange={e => setSupplementalRef(e.target.value)}
            placeholder="Optional: paste or upload reference material for this goal (e.g. a grading rubric, coding standard, architecture guidelines, or reference answer)..."
            disabled={isStreaming}
            style={{ minHeight: '90px', fontFamily: 'Geist Mono, monospace', fontSize: '12px' }}
          />

          {fileName && (
            <span style={{ fontSize: '11px', color: 'var(--success)' }}>
              ✓ Loaded reference file: <strong>{fileName}</strong> ({supplementalRef.length} chars)
            </span>
          )}
        </div>

        {/* Input Payload Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Raw Input Payload
              </label>

              {/* Goal selector — the task this actor is asked to achieve. Its
                  key is logged as the audit call_type (tuning/tracking unit). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Goal<HelpTip text="The task this actor is asked to perform. Its key is logged so runs can be tracked and the prompt tuned per goal. Selecting a goal loads its sample inputs." />:
                </span>
                {advancedGoal ? (
                  <input
                    type="text"
                    value={callType}
                    onChange={e => setCallType(e.target.value)}
                    placeholder="custom goal key"
                    disabled={isStreaming}
                    style={{ width: '200px', padding: '2px 8px', fontSize: '12px' }}
                  />
                ) : (
                  <select
                    value={selectedGoalId}
                    disabled={isStreaming}
                    onChange={e => {
                      const g = goals.find(x => x.id === e.target.value);
                      if (g) applyGoal(g);
                    }}
                    style={{ width: 'auto', fontSize: '12px', padding: '2px 8px' }}
                    title="Select a goal for this domain/actor"
                  >
                    <option value="">Select a goal…</option>
                    {goalsForContext(selectedDomainId, selectedActorId).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setAdvancedGoal(!advancedGoal)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  title="Toggle a custom goal key"
                >
                  {advancedGoal ? 'pick goal' : 'custom'}
                </button>
              </div>

              {/* Samples for the selected goal. */}
              {(() => {
                const g = goals.find(x => x.id === selectedGoalId);
                if (!g || g.samples.length === 0) return null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sample:</span>
                    <select
                      value=""
                      disabled={isStreaming}
                      onChange={e => {
                        const idx = parseInt(e.target.value, 10);
                        if (!Number.isNaN(idx) && g.samples[idx]) applyGoalSample(g.samples[idx]);
                      }}
                      style={{ width: 'auto', fontSize: '12px', padding: '2px 8px' }}
                      title="Load a sample input for this goal"
                    >
                      <option value="">Load sample input…</option>
                      {g.samples.map((s, i) => (
                        <option key={i} value={i}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Model Provider:</span>
              <select value={modelId} onChange={e => setModelId(e.target.value)} disabled={isStreaming} style={{ width: 'auto', padding: '4px 10px' }}>
                {modelId === '' && (
                  <option value="">Active Default</option>
                )}
                {availableModelOptions.map(opt => (
                  <option key={opt.id} value={opt.model_id}>{opt.name}</option>
                ))}
              </select>
            </div>
          </div>

          <textarea 
            value={rawRequirements}
            onChange={e => setRawRequirements(e.target.value)}
            placeholder="Enter the task for the actor to perform, or load a sample input for the selected goal..."
            disabled={isStreaming}
            style={{ minHeight: '90px' }}
          />

          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={isStreaming || !rawRequirements.trim()}
          >
            {isStreaming ? '⚡ Streaming Output...' : ' Run Composition Engine'}
          </button>
        </div>

        {/* Execution Canvas Output */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '16px' }}>Execution Canvas</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Raw / Rendered toggle */}
              <div style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('rendered')}
                  style={{
                    padding: '4px 10px', fontSize: '12px', border: 'none', cursor: 'pointer',
                    background: viewMode === 'rendered' ? 'var(--accent-color)' : 'transparent',
                    color: viewMode === 'rendered' ? 'var(--bg-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Rendered
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  style={{
                    padding: '4px 10px', fontSize: '12px', border: 'none', cursor: 'pointer',
                    background: viewMode === 'raw' ? 'var(--accent-color)' : 'transparent',
                    color: viewMode === 'raw' ? 'var(--bg-primary)' : 'var(--text-secondary)'
                  }}
                >
                  Raw
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={downloadMarkdown}
                disabled={isStreaming || !hasRun || !output.trim()}
                title="Download output as a .md file"
              >
                ⬇ Download .md
              </button>
              <span className={`badge ${isStreaming ? 'active' : ''}`}>
                {isStreaming ? 'Streaming' : 'Idle'}
              </span>
            </div>
          </div>
          {/* Error banner — prominent, never silent. */}
          {runError && (
            <div
              className="glass-panel"
              style={{
                padding: '12px 16px',
                marginBottom: '10px',
                borderLeft: '3px solid #e5484d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5484d', marginBottom: '4px' }}>
                  ⚠️ Run did not complete
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {runError}
                </div>
              </div>
              <button
                onClick={() => setRunError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
          <div
            ref={outputRef}
            className="prompt-preview-box"
            style={{ flex: 1, minHeight: '300px', overflowY: 'auto' }}
          >
            {/* While streaming, show raw text as it arrives. If nothing has
                arrived yet, show an explicit working indicator so a long cold
                start never looks like a hang. */}
            {isStreaming && !output.trim() ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <span className="spinner" aria-hidden="true" />
                <span>Running the model… large local models can take a minute or more on the first call while the model loads into memory.</span>
              </div>
            ) : viewMode === 'raw' || !hasRun || isStreaming ? (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{output}</pre>
            ) : (
              <MarkdownView source={output} dark />
            )}
          </div>
          {/* Elapsed-time footer. Pinned to the bottom and right-aligned with a
              fixed-width, tabular figure so the changing value never shifts
              other controls. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Elapsed:&nbsp;</span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: '56px',
                textAlign: 'right',
              }}
            >
              {(duration / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
