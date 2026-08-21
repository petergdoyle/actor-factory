"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

export interface Composition {
  id?: string;
  name: string;
  actor_id: string;
  skill_ids: string[];
  specialization_ids: string[];
}

export default function Composer({ onSelectForTesting }: { onSelectForTesting?: (comp: Composition, prompt: string) => void }) {
  const [actors, setActors] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);

  // Selected Matrix Ingredients
  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');

  const [compName, setCompName] = useState<string>('');
  const [compiledPrompt, setCompiledPrompt] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [actRes, sklRes, spcRes, cmpRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/actors`),
        fetch(`${getApiBaseUrl()}/skills`),
        fetch(`${getApiBaseUrl()}/specializations`),
        fetch(`${getApiBaseUrl()}/compositions`),
      ]);

      if (actRes.ok) {
        const actData = await actRes.json();
        setActors(actData);
        if (actData.length > 0 && !selectedActorId) setSelectedActorId(actData[0].id);
      }
      if (sklRes.ok) {
        const sklData = await sklRes.json();
        setSkills(sklData);
        if (sklData.length > 0 && !selectedSkillId) setSelectedSkillId(sklData[0].id);
      }
      if (spcRes.ok) {
        const spcData = await spcRes.json();
        setSpecializations(spcData);
        if (spcData.length > 0 && !selectedSpecId) setSelectedSpecId(spcData[0].id);
      }
      if (cmpRes.ok) {
        setCompositions(await cmpRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedActor = actors.find(a => a.id === selectedActorId);
  const selectedSkill = skills.find(s => s.id === selectedSkillId);
  const selectedSpec = specializations.find(s => s.id === selectedSpecId);

  // Auto-generate Composition Name
  useEffect(() => {
    if (selectedActor && selectedSpec) {
      setCompName(`${selectedActor.name} - ${selectedSpec.name}`);
    }
  }, [selectedActorId, selectedSpecId]);

  // Real-time Preview Compilation
  const handlePreview = async () => {
    if (!selectedActorId) return;
    setIsPreviewing(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/compose/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_id: selectedActorId,
          skill_ids: selectedSkillId ? [selectedSkillId] : [],
          specialization_ids: selectedSpecId ? [selectedSpecId] : []
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCompiledPrompt(data.compiled_prompt);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewing(false);
    }
  };

  useEffect(() => {
    if (selectedActorId) {
      handlePreview();
    }
  }, [selectedActorId, selectedSkillId, selectedSpecId]);

  const handleSaveComposition = async () => {
    if (!compName.trim()) return alert("Composition name is required.");
    if (!selectedActorId) return alert("Must select a base Persona.");

    const payload: Composition = {
      name: compName,
      actor_id: selectedActorId,
      skill_ids: selectedSkillId ? [selectedSkillId] : [],
      specialization_ids: selectedSpecId ? [selectedSpecId] : []
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/compositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Composition Profile saved!");
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="split-view" style={{ gridTemplateColumns: '400px 1fr' }}>
      {/* Matrix Ingredient Selection Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Saved Profiles List */}
        {compositions.length > 0 && (
          <div className="glass-panel" style={{ padding: '12px 16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Saved Composition Profiles ({compositions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {compositions.map(c => (
                <div 
                  key={c.id} 
                  className="tag-chip accent" 
                  style={{ justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px' }}
                >
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Base Persona */}
        <div className="glass-panel">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            1. Select Base Persona (WHO)
          </label>
          <select value={selectedActorId} onChange={e => setSelectedActorId(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Persona...</option>
            {actors.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.title || 'Persona'})</option>
            ))}
          </select>
          {selectedActor && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {selectedActor.description}
            </p>
          )}
        </div>

        {/* Step 2: Specialization */}
        <div className="glass-panel">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            2. Select Specialization (WITH WHAT EXPERTISE)
          </label>
          <select value={selectedSpecId} onChange={e => setSelectedSpecId(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Specialization...</option>
            {specializations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedSpec && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {selectedSpec.description}
            </p>
          )}
        </div>

        {/* Step 3: Skill */}
        <div className="glass-panel">
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            3. Select Executable Skill (WHAT)
          </label>
          <select value={selectedSkillId} onChange={e => setSelectedSkillId(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Skill...</option>
            {skills.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedSkill && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {selectedSkill.description}
            </p>
          )}
        </div>

        {/* Save Profile Form */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600 }}>Save Composition Profile</label>
          <input 
            type="text" 
            value={compName} 
            onChange={e => setCompName(e.target.value)}
            placeholder="Composition Profile Name..."
          />
          <button className="btn-primary" onClick={handleSaveComposition}>
            Save Profile to Catalog
          </button>
        </div>
      </div>

      {/* Right Real-time Prompt Compilation Canvas */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px' }}>Compiled System Prompt Preamble</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Real-time 3D Matrix compilation (Persona × Specialization × Skill)
            </p>
          </div>
          {onSelectForTesting && selectedActor && (
            <button 
              className="btn-primary" 
              onClick={() => onSelectForTesting({
                name: compName,
                actor_id: selectedActorId,
                skill_ids: selectedSkillId ? [selectedSkillId] : [],
                specialization_ids: selectedSpecId ? [selectedSpecId] : []
              }, compiledPrompt)}
            >
              🧪 Load into Test Bench
            </button>
          )}
        </div>

        <div className="prompt-preview-box" style={{ flex: 1 }}>
          {isPreviewing ? (
            <span style={{ color: 'var(--text-muted)' }}>Compiling system prompt preamble...</span>
          ) : compiledPrompt ? (
            compiledPrompt
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Select ingredients on the left to compile system prompt.</span>
          )}
        </div>
      </div>
    </div>
  );
}
