"use client";
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [modelId, setModelId] = useState('mock');
  const [domainName, setDomainName] = useState('Public School Education');
  const [domainParams, setDomainParams] = useState('{\n  "school_district": "Austin ISD",\n  "rubric_type": "standardized_v2",\n  "subject": "Algebra 1"\n}');
  
  const [personaName, setPersonaName] = useState('High School Evaluator');
  const [personaDesc, setPersonaDesc] = useState('You are an expert high school teacher evaluating student performance.');
  
  const [specName, setSpecName] = useState('Math Assessment');
  const [specDesc, setSpecDesc] = useState('You specialize in algebraic step-by-step verification.');
  
  const [skillName, setSkillName] = useState('Assessment Grading');
  const [skillDesc, setSkillDesc] = useState('Output a final grade from A-F with justifications.');

  const [rawRequirements, setRawRequirements] = useState('Student essay: I think the answer is 42 because 6x7=42.');
  const [output, setOutput] = useState('// Output will stream here from the FastAPI backend...');
  const [isStreaming, setIsStreaming] = useState(false);
  const [duration, setDuration] = useState(0);

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

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
    <main className="layout-grid">
      <div className="sidebar" style={{ maxWidth: '400px' }}>
        <h1 className="header-title">
          <span>ActorFactory</span> 🤖
        </h1>
        
        <div className="glass-panel">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Domain Context</h2>
          <div className="form-group">
            <label>Domain Name</label>
            <input value={domainName} onChange={e => setDomainName(e.target.value)} disabled={isStreaming} />
          </div>
          <div className="form-group">
            <label>Context Parameters (JSON)</label>
            <textarea style={{ minHeight: '100px' }} value={domainParams} onChange={e => setDomainParams(e.target.value)} disabled={isStreaming} />
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Matrix Composition</h2>
          <div className="form-group">
            <label>1. Persona (Base Identity)</label>
            <input value={personaName} onChange={e => setPersonaName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '8px' }} />
            <input value={personaDesc} onChange={e => setPersonaDesc(e.target.value)} disabled={isStreaming} />
          </div>
          <div className="form-group">
            <label>2. Specialization (Expertise)</label>
            <input value={specName} onChange={e => setSpecName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '8px' }} />
            <input value={specDesc} onChange={e => setSpecDesc(e.target.value)} disabled={isStreaming} />
          </div>
          <div className="form-group">
            <label>3. Skill (Format & Output)</label>
            <input value={skillName} onChange={e => setSkillName(e.target.value)} disabled={isStreaming} style={{ marginBottom: '8px' }} />
            <input value={skillDesc} onChange={e => setSkillDesc(e.target.value)} disabled={isStreaming} />
          </div>
        </div>
      </div>

      <div className="canvas">
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Raw Payload Input</label>
              <select value={modelId} onChange={e => setModelId(e.target.value)} disabled={isStreaming} style={{ width: 'auto', padding: '4px 8px' }}>
                <option value="mock">Mock Provider</option>
                <option value="ollama:llama3">Ollama (llama3)</option>
              </select>
            </div>
            <textarea 
              value={rawRequirements}
              onChange={e => setRawRequirements(e.target.value)}
              placeholder="Enter the payload for the actor to process..."
              disabled={isStreaming}
              style={{ minHeight: '80px', marginTop: '8px' }}
            ></textarea>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={isStreaming || !rawRequirements.trim()}
          >
            {isStreaming ? 'Executing Matrix...' : 'Run Composition Engine'}
          </button>
        </div>

        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px' }}>Execution Canvas</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className={`badge ${isStreaming ? 'active' : ''}`}>
                {isStreaming ? 'Streaming' : 'Idle'}
              </span>
              <span className="badge">{(duration / 1000).toFixed(1)}s</span>
            </div>
          </div>
          <div 
            ref={outputRef}
            className="canvas-output" 
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {output}
          </div>
        </div>
      </div>
    </main>
  );
}
