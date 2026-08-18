"use client";
import { useState, useRef, useEffect } from 'react';
import { Composition } from './Composer';

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

const SAMPLE_RUBRICS = [
  {
    name: "K-12 Math 4-Point Rubric",
    content: `PRESCRIBED MATH GRADING RUBRIC (4-Point Scale):
- 4 (Advanced): Demonstrates complete conceptual understanding. All work shown step-by-step with 100% accurate arithmetic and clear mathematical reasoning.
- 3 (Proficient): Demonstrates clear conceptual understanding. Correct problem setup and formula application; minor calculation/arithmetic slip permitted (-0.5 pt).
- 2 (Developing): Partial understanding. Correct formula choice, but multiple calculation errors or incomplete solution steps.
- 1 (Beginning): Minimal understanding. Incorrect formula applied or unattempted steps.`
  },
  {
    name: "K-12 Essay Evaluation Rubric",
    content: `PRESCRIBED ESSAY EVALUATION RUBRIC (4 Dimensions, 100 Points Total):
1. Thesis & Argument (25 pts): Clear, defensible thesis statement supported by strong textual evidence.
2. Textual Evidence & Quotes (25 pts): Direct quotes cited accurately with explicit analysis explaining how evidence supports the claim.
3. Structure & Transitions (25 pts): Logical paragraph progression with clear topic sentences and smooth transitions.
4. Grammar & Style (25 pts): Grade-appropriate vocabulary, sentence variety, and minimal mechanical errors.`
  },
  {
    name: "Software Coding & Architecture Rubric",
    content: `SOFTWARE CODE REVIEW RUBRIC:
1. Modularity & SOLID (25%): Low coupling, single responsibility per module, explicit interfaces.
2. Error Handling (25%): No swallowed exceptions; explicit error pathways for external HTTP/DB calls.
3. Testability (25%): Pure business logic decoupled from I/O; clean unit test coverage.
4. Documentation & Schema (25%): Clear OpenAPI contracts or JSDoc/docstrings.`
  }
];

const API_BASE = "http://localhost:8000/api/v1";

export default function TestBench({ activeComposition, initialPrompt }: { activeComposition?: Composition | null, initialPrompt?: string }) {
  const [modelId, setModelId] = useState('ollama:gemma4:12b');
  const [callType, setCallType] = useState('design_ecommerce_solution');
  const [availableModelOptions, setAvailableModelOptions] = useState<LLMOption[]>([
    { id: 'mock', name: 'Mock Provider (Testing)', model_id: 'mock' },
    { id: 'ollama_gemma4', name: 'Ollama (gemma4:12b)', model_id: 'ollama:gemma4:12b' },
    { id: 'ollama_llama3', name: 'Ollama (llama3)', model_id: 'ollama:llama3' },
    { id: 'openai', name: 'OpenAI (gpt-4o)', model_id: 'openai:gpt-4o' },
    { id: 'anthropic', name: 'Anthropic (claude-3-5-sonnet)', model_id: 'anthropic:claude-3-5-sonnet' },
  ]);

  // Catalog Lists from Backend
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationItem[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);

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

  // Supplemental Reference / Rubric State
  const [supplementalRef, setSupplementalRef] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [rawRequirements, setRawRequirements] = useState('Design an e-commerce checkout flow with auth, payment processing, inventory reservation, and email notifications.');
  const [output, setOutput] = useState('// Output will stream here from the FastAPI backend execution engine...');
  const [isStreaming, setIsStreaming] = useState(false);
  const [duration, setDuration] = useState(0);

  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (activeComposition) {
      setPersonaName(activeComposition.name);
    }
  }, [activeComposition]);

  // Load catalogs from backend
  useEffect(() => {
    const loadCatalogData = async () => {
      try {
        const [domRes, actRes, sklRes, spcRes, cmpRes, cfgRes] = await Promise.all([
          fetch(`${API_BASE}/domains`),
          fetch(`${API_BASE}/actors`),
          fetch(`${API_BASE}/skills`),
          fetch(`${API_BASE}/specializations`),
          fetch(`${API_BASE}/compositions`),
          fetch(`${API_BASE}/llm/configs`)
        ]);

        if (domRes.ok) setDomains(await domRes.json());
        if (actRes.ok) setActors(await actRes.json());
        if (sklRes.ok) setSkills(await sklRes.json());
        if (spcRes.ok) setSpecializations(await spcRes.json());
        if (cmpRes.ok) setCompositions(await cmpRes.json());

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
            const firstOllama = options.find(o => o.model_id.includes("gemma") || o.model_id.startsWith("ollama:"));
            if (firstOllama) setModelId(firstOllama.model_id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadCatalogData();
  }, []);

  // Handle Domain Selection -> Auto-fills Domain params & Strictly Filters Personas
  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    const selected = domains.find(d => d.id === domainId);
    if (selected) {
      setDomainName(selected.name);
      setDomainParams(JSON.stringify(selected.parameters, null, 2));

      // Auto-set sample rubric if K-12 Education is chosen
      if (selected.name.includes("Education") || selected.name.includes("K-12")) {
        setSupplementalRef(SAMPLE_RUBRICS[0].content);
        setCallType("evaluate_student_rubric");
        setRawRequirements("EVALUATE STUDENT SUBMISSION:\n\nStudent Name: Alex Smith\nMath Exam Answers:\nProblem 1: 3x + 5 = 20 => 3x = 15 => x = 5 (Step-by-step derivation correct)\nProblem 2: Calculate area of circle (r=4): A = pi * 4^2 = 16 * 3.14 = 50.24 (Correct)\nProblem 3: 4 * 8 = 36 (Arithmetic Error, setup was correct)");
      }

      const matchingActors = actors.filter(a => a.domain_id === domainId);
      if (matchingActors.length > 0) {
        handleActorChange(matchingActors[0].id, domainId);
      } else {
        setSelectedActorId('');
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

    if (comp.name.includes("Teaching Assistant") || comp.name.includes("Rubric")) {
      setCallType("evaluate_student_rubric");
      setSupplementalRef(SAMPLE_RUBRICS[0].content);
      setRawRequirements("EVALUATE STUDENT SUBMISSION:\n\nStudent Name: Jordan Lee\n1. Solve 2x + 7 = 19: 2x = 12 => x = 6 (Correct)\n2. Factor x^2 - 9: (x-3)(x+3) (Correct)\n3. Calculate 12 * 7: 74 (Arithmetic Error)");
    } else {
      setCallType("design_ecommerce_solution");
    }
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

  const handleGenerate = async () => {
    if (!rawRequirements.trim()) return;
    
    setIsStreaming(true);
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
      const res = await fetch(`${API_BASE}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          setOutput(prev => prev + chunk);
        }
      }
    } catch (err: any) {
      setOutput(prev => prev + `\n\n[ERROR]: ${err.message}`);
    } finally {
      setIsStreaming(false);
      clearInterval(interval);
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
              <label>1. Persona (Base Identity)</label>
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
              <label>2. Specialization (Expertise)</label>
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
              <label>3. Skill (Output Format)</label>
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
              📎 Supplemental Reference Material / Grading Rubric
            </label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Preset Rubrics Selector */}
              <select 
                onChange={e => setSupplementalRef(e.target.value)} 
                disabled={isStreaming}
                style={{ width: 'auto', fontSize: '12px', padding: '3px 8px' }}
              >
                <option value="">Sample Rubrics...</option>
                {SAMPLE_RUBRICS.map((r, i) => (
                  <option key={i} value={r.content}>{r.name}</option>
                ))}
              </select>

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
                📁 Upload Rubric / Reference File
              </button>
            </div>
          </div>

          <textarea 
            value={supplementalRef}
            onChange={e => setSupplementalRef(e.target.value)}
            placeholder="Paste or upload supplemental evaluation material (e.g. Grading Rubric, Coding Standard, Architecture Guidelines, Reference Answer)..."
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Raw Input Payload / Student Submission
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LLM Goal Tag:</span>
                <input 
                  type="text" 
                  value={callType} 
                  onChange={e => setCallType(e.target.value)}
                  placeholder="e.g. evaluate_student_rubric"
                  disabled={isStreaming}
                  style={{ width: '200px', padding: '2px 8px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Model Provider:</span>
              <select value={modelId} onChange={e => setModelId(e.target.value)} disabled={isStreaming} style={{ width: 'auto', padding: '4px 10px' }}>
                {availableModelOptions.map(opt => (
                  <option key={opt.id} value={opt.model_id}>{opt.name}</option>
                ))}
              </select>
            </div>
          </div>

          <textarea 
            value={rawRequirements}
            onChange={e => setRawRequirements(e.target.value)}
            placeholder="Enter the raw student answer or project payload for the actor to process..."
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>Execution Canvas</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className={`badge ${isStreaming ? 'active' : ''}`}>
                {isStreaming ? 'Streaming' : 'Idle'}
              </span>
              <span className="badge">{(duration / 1000).toFixed(1)}s</span>
            </div>
          </div>
          <div 
            ref={outputRef}
            className="prompt-preview-box" 
            style={{ flex: 1, minHeight: '300px' }}
          >
            {output}
          </div>
        </div>
      </div>
    </div>
  );
}
