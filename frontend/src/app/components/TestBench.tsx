"use client";
import { useState, useRef, useEffect } from 'react';
import { Composition } from './Composer';

export default function TestBench({ activeComposition, initialPrompt }: { activeComposition?: Composition | null, initialPrompt?: string }) {
  const [modelId, setModelId] = useState('mock');
  const [domainName, setDomainName] = useState('Software Engineering');
  const [domainParams, setDomainParams] = useState('{\n  "architecture_style": "microservices",\n  "cloud_provider": "AWS"\n}');
  
  const [personaName, setPersonaName] = useState('Software Architect');
  const [personaDesc, setPersonaDesc] = useState('You are an expert Software Architect designing scalable microservices.');
  
  const [specName, setSpecName] = useState('AWS & Cloud Native');
  const [specDesc, setSpecDesc] = useState('You specialize in AWS serverless and container patterns.');
  
  const [skillName, setSkillName] = useState('Mermaid Architecture Diagram');
  const [skillDesc, setSkillDesc] = useState('Output valid mermaid code blocks visualizing system topology.');

  const [rawRequirements, setRawRequirements] = useState('Design an e-commerce checkout flow with auth, payment processing, inventory reservation, and email notifications.');
  const [output, setOutput] = useState('// Output will stream here from the FastAPI backend execution engine...');
  const [isStreaming, setIsStreaming] = useState(false);
  const [duration, setDuration] = useState(0);

  const outputRef = useRef<HTMLDivElement>(null);

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
      request: {
        domain_context: {
          domain_name: domainName,
          parameters: parsedParams
        },
        raw_user_input: rawRequirements,
        target_actors: [
          {
            id: "00000000-0000-0000-0000-000000000000",
            actor_name: personaName,
            base_persona: {
              id: "00000000-0000-0000-0000-000000000001",
              name: personaName,
              ingredient_type: "Persona",
              core_logic_instruction: personaDesc
            },
            specializations: [
              {
                id: "00000000-0000-0000-0000-000000000002",
                name: specName,
                ingredient_type: "Specialization",
                core_logic_instruction: specDesc
              }
            ],
            skill: {
              id: "00000000-0000-0000-0000-000000000003",
              name: skillName,
              ingredient_type: "Skill",
              core_logic_instruction: skillDesc
            }
          }
        ]
      }
    };

    try {
      const res = await fetch("http://localhost:8000/api/v1/orchestrate", {
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

  return (
    <div className="split-view" style={{ gridTemplateColumns: '400px 1fr' }}>
      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel">
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Domain Context</h2>
          <div className="form-group">
            <label>Domain Name</label>
            <input value={domainName} onChange={e => setDomainName(e.target.value)} disabled={isStreaming} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Parameters (JSON)</label>
            <textarea style={{ minHeight: '80px', fontFamily: 'Geist Mono, monospace' }} value={domainParams} onChange={e => setDomainParams(e.target.value)} disabled={isStreaming} />
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px' }}>Active Composition Profile</h2>
          
          <div className="form-group">
            <label>1. Persona (Base Identity)</label>
            <input value={personaName} onChange={e => setPersonaName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={personaDesc} onChange={e => setPersonaDesc(e.target.value)} disabled={isStreaming} />
          </div>
          
          <div className="form-group">
            <label>2. Specialization (Expertise)</label>
            <input value={specName} onChange={e => setSpecName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={specDesc} onChange={e => setSpecDesc(e.target.value)} disabled={isStreaming} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>3. Skill (Output Format)</label>
            <input value={skillName} onChange={e => setSkillName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '6px' }} />
            <input value={skillDesc} onChange={e => setSkillDesc(e.target.value)} disabled={isStreaming} />
          </div>
        </div>
      </div>

      {/* Main Execution Canvas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Raw Input Payload / User Prompt
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Model Provider:</span>
              <select value={modelId} onChange={e => setModelId(e.target.value)} disabled={isStreaming} style={{ width: 'auto', padding: '4px 10px' }}>
                <option value="mock">Mock Provider</option>
                <option value="ollama:llama3">Ollama (llama3)</option>
              </select>
            </div>
          </div>

          <textarea 
            value={rawRequirements}
            onChange={e => setRawRequirements(e.target.value)}
            placeholder="Enter the payload for the actor to process..."
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
