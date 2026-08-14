"use client";
import { useState, useEffect } from 'react';

export interface Actor { id: string; name: string; title: string; }
export interface Skill { id: string; name: string; validation_level: string; }
export interface Specialization { id: string; name: string; }
export interface Composition {
  id?: string;
  name: string;
  actor_id: string;
  skill_ids: string[];
  specialization_ids: string[];
}

const API_BASE = "http://localhost:8000/api/v1";

export default function Composer({ onSelectForTesting }: { onSelectForTesting?: (comp: Composition, prompt: string) => void }) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);

  // Selection
  const [selectedActorId, setSelectedActorId] = useState<string>("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);

  // Preview & Save
  const [compName, setCompName] = useState("");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [actorRes, skillRes, specRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/actors`),
        fetch(`${API_BASE}/skills`),
        fetch(`${API_BASE}/specializations`),
        fetch(`${API_BASE}/compositions`)
      ]);
      if (actorRes.ok) {
        const d = await actorRes.json();
        setActors(d);
        if (d.length > 0 && !selectedActorId) setSelectedActorId(d[0].id);
      }
      if (skillRes.ok) {
        const d = await skillRes.json();
        setSkills(d);
        if (d.length > 0 && selectedSkillIds.length === 0) setSelectedSkillIds([d[0].id]);
      }
      if (specRes.ok) {
        const d = await specRes.json();
        setSpecs(d);
        if (d.length > 0 && selectedSpecIds.length === 0) setSelectedSpecIds([d[0].id]);
      }
      if (compRes.ok) {
        const d = await compRes.json();
        setCompositions(d);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto compile prompt when selections change
  useEffect(() => {
    if (!selectedActorId) return;

    const compilePreview = async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`${API_BASE}/compose/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: selectedActorId,
            skill_ids: selectedSkillIds,
            specialization_ids: selectedSpecIds
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCompiledPrompt(data.compiled_prompt);
          if (!compName) {
            setCompName(`${data.actor_name} + Skills`);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timeout = setTimeout(compilePreview, 150);
    return () => clearTimeout(timeout);
  }, [selectedActorId, selectedSkillIds, selectedSpecIds]);

  const toggleSkill = (id: string) => {
    if (selectedSkillIds.includes(id)) {
      setSelectedSkillIds(selectedSkillIds.filter(s => s !== id));
    } else {
      setSelectedSkillIds([...selectedSkillIds, id]);
    }
  };

  const toggleSpec = (id: string) => {
    if (selectedSpecIds.includes(id)) {
      setSelectedSpecIds(selectedSpecIds.filter(s => s !== id));
    } else {
      setSelectedSpecIds([...selectedSpecIds, id]);
    }
  };

  const handleSaveComposition = async () => {
    if (!selectedActorId || !compName.trim()) return;
    const payload: Composition = {
      name: compName,
      actor_id: selectedActorId,
      skill_ids: selectedSkillIds,
      specialization_ids: selectedSpecIds
    };
    try {
      const res = await fetch(`${API_BASE}/compositions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSavedComposition = (c: Composition) => {
    setSelectedActorId(c.actor_id);
    setSelectedSkillIds(c.skill_ids || []);
    setSelectedSpecIds(c.specialization_ids || []);
    setCompName(c.name);
  };

  const handleDeleteComposition = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/compositions/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Saved Compositions Bar */}
      {compositions.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '12px' }}>
            Saved Actor Profiles:
          </span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px' }}>
            {compositions.map(c => (
              <span key={c.id} className="tag-chip accent" style={{ cursor: 'pointer', padding: '4px 10px' }} onClick={() => loadSavedComposition(c)}>
                🔗 {c.name}
                <span className="remove-btn" style={{ marginLeft: '6px' }} onClick={(e) => { e.stopPropagation(); if (c.id) handleDeleteComposition(c.id); }}>✕</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="composer-view">
        {/* Step 1: Base Actor */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge active">Step 1</span>
            <h3 style={{ fontSize: '16px' }}>Select Base Actor (WHO)</h3>
          </div>
          <div className="entity-card-list">
            {actors.map(a => (
              <div 
                key={a.id} 
                className={`entity-card ${a.id === selectedActorId ? 'selected' : ''}`}
                onClick={() => setSelectedActorId(a.id)}
              >
                <span className="entity-card-title">🎭 {a.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Specializations & Skills */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge active">Step 2</span>
              <h3 style={{ fontSize: '16px' }}>Platform Specializations</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {specs.map(s => {
                const isSelected = selectedSpecIds.includes(s.id);
                return (
                  <div 
                    key={s.id} 
                    className={`list-item-badge ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)', background: isSelected ? 'rgba(107, 124, 255, 0.1)' : 'var(--bg-tertiary)' }}
                    onClick={() => toggleSpec(s.id)}
                  >
                    <span>🔧 {s.name}</span>
                    <span>{isSelected ? "✅" : "+"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge active">Step 3</span>
              <h3 style={{ fontSize: '16px' }}>Executable Capability / Skill</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {skills.map(sk => {
                const isSelected = selectedSkillIds.includes(sk.id);
                return (
                  <div 
                    key={sk.id} 
                    className={`list-item-badge ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)', background: isSelected ? 'rgba(107, 124, 255, 0.1)' : 'var(--bg-tertiary)' }}
                    onClick={() => toggleSkill(sk.id)}
                  >
                    <span>⚡ {sk.name}</span>
                    <span>{isSelected ? "✅" : "+"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Live System Prompt Preview */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px' }}>Compiled System Prompt Preview</h3>
            {previewLoading && <span className="badge warning">Compiling...</span>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Profile Name</label>
            <input 
              type="text" 
              placeholder="e.g. AWS SRE + Mermaid Skill" 
              value={compName} 
              onChange={e => setCompName(e.target.value)} 
            />
          </div>

          <div className="prompt-preview-box" style={{ flex: 1 }}>
            {compiledPrompt || "// Select an Actor persona to preview compiled prompt..."}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleSaveComposition} disabled={!selectedActorId || !compName.trim()}>
              {saveSuccess ? "✓ Profile Saved!" : "Save Profile"}
            </button>
            {onSelectForTesting && (
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSelectForTesting({ name: compName, actor_id: selectedActorId, skill_ids: selectedSkillIds, specialization_ids: selectedSpecIds }, compiledPrompt)}>
                Test in Bench →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
