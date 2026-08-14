"use client";
import { useState, useEffect } from 'react';

export interface Actor {
  id?: string;
  name: string;
  title: string;
  description: string;
  domain_id?: string;
  core_concerns: string[];
  vocabulary: string;
  thinking_patterns: string[];
  quality_criteria: string[];
}

export interface Domain {
  id: string;
  name: string;
}

const API_BASE = "http://localhost:8000/api/v1";

export default function ActorManager() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const [vocabulary, setVocabulary] = useState("");

  // List Item Editors
  const [coreConcerns, setCoreConcerns] = useState<string[]>([]);
  const [newConcern, setNewConcern] = useState("");

  const [thinkingPatterns, setThinkingPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");

  const [qualityCriteria, setQualityCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState("");

  const loadData = async () => {
    try {
      const [actorRes, domainRes] = await Promise.all([
        fetch(`${API_BASE}/actors`),
        fetch(`${API_BASE}/domains`)
      ]);
      if (actorRes.ok) {
        const actorData = await actorRes.json();
        setActors(actorData);
        if (actorData.length > 0 && !selectedId) {
          selectActor(actorData[0]);
        }
      }
      if (domainRes.ok) {
        const domainData = await domainRes.json();
        setDomains(domainData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectActor = (a: Actor) => {
    setSelectedId(a.id || null);
    setName(a.name);
    setTitle(a.title || "");
    setDescription(a.description || "");
    setDomainId(a.domain_id || "");
    setVocabulary(a.vocabulary || "");
    setCoreConcerns(a.core_concerns || []);
    setThinkingPatterns(a.thinking_patterns || []);
    setQualityCriteria(a.quality_criteria || []);
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setTitle("");
    setDescription("");
    setDomainId("");
    setVocabulary("");
    setCoreConcerns([]);
    setThinkingPatterns([]);
    setQualityCriteria([]);
  };

  const handleSave = async () => {
    const payload: Actor = {
      id: selectedId || undefined,
      name,
      title,
      description,
      domain_id: domainId || undefined,
      core_concerns: coreConcerns,
      vocabulary,
      thinking_patterns: thinkingPatterns,
      quality_criteria: qualityCriteria,
    };

    try {
      const res = await fetch(`${API_BASE}/actors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await loadData();
        selectActor(saved);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Actor Persona?")) return;
    try {
      const res = await fetch(`${API_BASE}/actors/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
        handleNew();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addItem = (list: string[], setList: (val: string[]) => void, item: string, setItem: (val: string) => void) => {
    if (!item.trim()) return;
    setList([...list, item.trim()]);
    setItem("");
  };

  const removeItem = (list: string[], setList: (val: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const filtered = actors.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    (a.title && a.title.toLowerCase().includes(search.toLowerCase())) ||
    (a.description && a.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Actors / Personas ({actors.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + New Actor
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Filter actors..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🎭</span>
              <p>No actors found.</p>
            </div>
          ) : (
            filtered.map(a => (
              <div 
                key={a.id} 
                className={`entity-card ${a.id === selectedId ? 'selected' : ''}`}
                onClick={() => selectActor(a)}
              >
                <div className="entity-card-header">
                  <span className="entity-card-title">{a.name}</span>
                  <span className="badge active">Persona</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-accent)', fontWeight: 500 }}>{a.title}</p>
                <p className="entity-card-desc">{a.description || "No description."}</p>
                <div className="tag-container">
                  {a.core_concerns.slice(0, 2).map((c, i) => (
                    <span key={i} className="tag-chip">{c}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Editor Form */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Actor Persona" : "Create New Actor Persona"}</h2>
          {selectedId && (
            <button className="btn-danger" onClick={() => handleDelete(selectedId)}>
              Delete
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Actor Name</label>
            <input 
              type="text" 
              placeholder="e.g. Software Architect, SRE" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Full Professional Title</label>
            <input 
              type="text" 
              placeholder="e.g. Site Reliability Engineer / Cloud Architect" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Domain Association</label>
            <select value={domainId} onChange={e => setDomainId(e.target.value)}>
              <option value="">-- Select Domain (Optional) --</option>
              {domains.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Vocabulary (Comma Separated)</label>
            <input 
              type="text" 
              placeholder="microservices, API gateway, SOLID, idempotency" 
              value={vocabulary} 
              onChange={e => setVocabulary(e.target.value)} 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Identity & Core Mission Description</label>
          <textarea 
            placeholder="Describes who this expert is and their primary objective..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>

        {/* List Editors */}
        <div className="form-group">
          <label>Core Concerns</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add core concern (e.g. System decomposition & modularity)" 
              value={newConcern} 
              onChange={e => setNewConcern(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(coreConcerns, setCoreConcerns, newConcern, setNewConcern))}
            />
            <button className="btn-secondary" onClick={() => addItem(coreConcerns, setCoreConcerns, newConcern, setNewConcern)}>Add</button>
          </div>
          {coreConcerns.map((c, i) => (
            <div key={i} className="list-item-badge">
              <span>• {c}</span>
              <span className="delete-icon" onClick={() => removeItem(coreConcerns, setCoreConcerns, i)}>✕</span>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>How You Approach Problems (Thinking Patterns)</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add thinking pattern (e.g. Design for failure — assume any component can fail)" 
              value={newPattern} 
              onChange={e => setNewPattern(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(thinkingPatterns, setThinkingPatterns, newPattern, setNewPattern))}
            />
            <button className="btn-secondary" onClick={() => addItem(thinkingPatterns, setThinkingPatterns, newPattern, setNewPattern)}>Add</button>
          </div>
          {thinkingPatterns.map((p, i) => (
            <div key={i} className="list-item-badge">
              <span>🧠 {p}</span>
              <span className="delete-icon" onClick={() => removeItem(thinkingPatterns, setThinkingPatterns, i)}>✕</span>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Quality Criteria</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add quality criterion (e.g. Minimal coupling between components)" 
              value={newCriterion} 
              onChange={e => setNewCriterion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(qualityCriteria, setQualityCriteria, newCriterion, setNewCriterion))}
            />
            <button className="btn-secondary" onClick={() => addItem(qualityCriteria, setQualityCriteria, newCriterion, setNewCriterion)}>Add</button>
          </div>
          {qualityCriteria.map((q, i) => (
            <div key={i} className="list-item-badge">
              <span>✓ {q}</span>
              <span className="delete-icon" onClick={() => removeItem(qualityCriteria, setQualityCriteria, i)}>✕</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button className="btn-secondary" onClick={handleNew}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Actor Persona
          </button>
        </div>
      </div>
    </div>
  );
}
