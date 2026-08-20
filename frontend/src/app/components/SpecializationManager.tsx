"use client";
import { useState, useEffect } from 'react';

export interface Specialization {
  id?: string;
  name: string;
  description: string;
  services_and_patterns: string;
  constraints: string[];
  examples: string[];
  detection_keywords: string[];
}

const API_BASE = "/api/v1";

export default function SpecializationManager() {
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servicesPatterns, setServicesPatterns] = useState("");

  // Lists
  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState("");

  const [examples, setExamples] = useState<string[]>([]);
  const [newExample, setNewExample] = useState("");

  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  const loadSpecs = async () => {
    try {
      const res = await fetch(`${API_BASE}/specializations`);
      if (res.ok) {
        const data = await res.json();
        setSpecs(data);
        if (data.length > 0 && !selectedId) {
          selectSpec(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSpecs();
  }, []);

  const selectSpec = (s: Specialization) => {
    setSelectedId(s.id || null);
    setName(s.name);
    setDescription(s.description || "");
    setServicesPatterns(s.services_and_patterns || "");
    setConstraints(s.constraints || []);
    setExamples(s.examples || []);
    setKeywords(s.detection_keywords || []);
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setServicesPatterns("");
    setConstraints([]);
    setExamples([]);
    setKeywords([]);
  };

  const handleSave = async () => {
    const payload: Specialization = {
      id: selectedId || undefined,
      name,
      description,
      services_and_patterns: servicesPatterns,
      constraints,
      examples,
      detection_keywords: keywords,
    };

    try {
      const res = await fetch(`${API_BASE}/specializations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await loadSpecs();
        selectSpec(saved);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Specialization?")) return;
    try {
      const res = await fetch(`${API_BASE}/specializations/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadSpecs();
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

  const addKeywordTag = () => {
    if (!newKeyword.trim()) return;
    const parts = newKeyword.split(',').map(p => p.trim()).filter(Boolean);
    const updated = Array.from(new Set([...keywords, ...parts]));
    setKeywords(updated);
    setNewKeyword("");
  };

  const removeKeywordTag = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const filtered = specs.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Specializations ({specs.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + New Specialization
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Filter specializations..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔧</span>
              <p>No specializations found.</p>
            </div>
          ) : (
            filtered.map(s => (
              <div 
                key={s.id} 
                className={`entity-card ${s.id === selectedId ? 'selected' : ''}`}
                onClick={() => selectSpec(s)}
              >
                <div className="entity-card-header">
                  <span className="entity-card-title">{s.name}</span>
                  <span className="badge">Platform</span>
                </div>
                <p className="entity-card-desc">{s.description || "No description."}</p>
                <div className="tag-container">
                  {s.detection_keywords.slice(0, 4).map((kw, i) => (
                    <span key={i} className="tag-chip accent">{kw}</span>
                  ))}
                  {s.detection_keywords.length > 4 && (
                    <span className="tag-chip">+{s.detection_keywords.length - 4}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Editor Form */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Specialization" : "Create New Specialization"}</h2>
          {selectedId && (
            <button className="btn-danger" onClick={() => handleDelete(selectedId)}>
              Delete
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Specialization Name</label>
          <input 
            type="text" 
            placeholder="e.g. Amazon Web Services (AWS), Kubernetes, Serverless" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            placeholder="Platform or vendor expertise details..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Services & Key Architecture Patterns</label>
          <input 
            type="text" 
            placeholder="e.g. Lambda, ECS, S3, DynamoDB, EventBridge, IAM" 
            value={servicesPatterns} 
            onChange={e => setServicesPatterns(e.target.value)} 
          />
        </div>

        {/* Detection Keywords Tags */}
        <div className="form-group">
          <label>Auto-Detection Keywords (Comma Separated)</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="e.g. aws, lambda, ecs, fargate, s3" 
              value={newKeyword} 
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeywordTag())}
            />
            <button className="btn-secondary" onClick={addKeywordTag}>Add Tag(s)</button>
          </div>
          <div className="tag-container" style={{ marginTop: '8px' }}>
            {keywords.map((kw) => (
              <span key={kw} className="tag-chip accent">
                {kw}
                <span className="remove-btn" onClick={() => removeKeywordTag(kw)}>✕</span>
              </span>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div className="form-group">
          <label>Platform Constraints & Rules</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add constraint (e.g. Reference specific AWS service names, not generic equivalents)" 
              value={newConstraint} 
              onChange={e => setNewConstraint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(constraints, setConstraints, newConstraint, setNewConstraint))}
            />
            <button className="btn-secondary" onClick={() => addItem(constraints, setConstraints, newConstraint, setNewConstraint)}>Add</button>
          </div>
          {constraints.map((c, i) => (
            <div key={i} className="list-item-badge">
              <span>🛑 {c}</span>
              <span className="delete-icon" onClick={() => removeItem(constraints, setConstraints, i)}>✕</span>
            </div>
          ))}
        </div>

        {/* Examples */}
        <div className="form-group">
          <label>Usage Examples</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add example (e.g. Use SQS for decoupling instead of generic queue)" 
              value={newExample} 
              onChange={e => setNewExample(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(examples, setExamples, newExample, setNewExample))}
            />
            <button className="btn-secondary" onClick={() => addItem(examples, setExamples, newExample, setNewExample)}>Add</button>
          </div>
          {examples.map((ex, i) => (
            <div key={i} className="list-item-badge">
              <span>💡 {ex}</span>
              <span className="delete-icon" onClick={() => removeItem(examples, setExamples, i)}>✕</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button className="btn-secondary" onClick={handleNew}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Specialization
          </button>
        </div>
      </div>
    </div>
  );
}
