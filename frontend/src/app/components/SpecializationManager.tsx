"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

export interface Specialization {
  id?: string;
  name: string;
  description: string;
  services_and_patterns: string;
  constraints: string[];
  examples: string[];
  detection_keywords: string[];
}

export default function SpecializationManager() {
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");

  const [constraints, setConstraints] = useState<string[]>([]);
  const [newConstraint, setNewConstraint] = useState("");

  const [examples, setExamples] = useState<string[]>([]);
  const [newExample, setNewExample] = useState("");

  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  const loadSpecs = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/specializations`);
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
    setServices(s.services_and_patterns || "");
    setConstraints(s.constraints || []);
    setExamples(s.examples || []);
    setKeywords(s.detection_keywords || []);
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setServices("");
    setConstraints([]);
    setExamples([]);
    setKeywords([]);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Specialization name is required.");

    const payload: Specialization = {
      id: selectedId || undefined,
      name,
      description,
      services_and_patterns: services,
      constraints,
      examples,
      detection_keywords: keywords,
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/specializations`, {
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
      const res = await fetch(`${getApiBaseUrl()}/specializations/${id}`, { method: "DELETE" });
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

  const filtered = specs.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
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

        <input 
          type="text" 
          placeholder="Filter specializations..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔧</span>
              <p>No specializations defined yet.</p>
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
                  <span className="badge active">Expertise</span>
                </div>
                <p className="entity-card-desc">{s.description || "No description."}</p>
                <div className="tag-container">
                  {s.detection_keywords.slice(0, 3).map((k, i) => (
                    <span key={i} className="tag-chip">{k}</span>
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
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Specialization" : "Create Platform / Domain Expertise"}</h2>
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
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Amazon Web Services (AWS), Kubernetes & Cloud Native, STEM Assessments" 
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Scope of technical or domain expertise..." 
            style={{ minHeight: '60px' }}
          />
        </div>

        <div className="form-group">
          <label>Services & Core Patterns (Comma-separated or list)</label>
          <input 
            type="text" 
            value={services} 
            onChange={e => setServices(e.target.value)} 
            placeholder="e.g. Lambda, ECS/Fargate, DynamoDB, Step Functions, SQS/SNS" 
          />
        </div>

        {/* Constraints */}
        <div className="form-group">
          <label>Platform Constraints & Guidelines</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add constraint (e.g. Reference specific AWS service names, check numerical setup step-by-step)..." 
              value={newConstraint}
              onChange={e => setNewConstraint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(constraints, setConstraints, newConstraint, setNewConstraint)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(constraints, setConstraints, newConstraint, setNewConstraint)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {constraints.map((c, i) => (
              <span key={i} className="tag-chip accent">
                {c}
                <button className="tag-chip-remove" onClick={() => removeItem(constraints, setConstraints, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div className="form-group">
          <label>Usage Examples</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add usage example..." 
              value={newExample}
              onChange={e => setNewExample(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(examples, setExamples, newExample, setNewExample)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(examples, setExamples, newExample, setNewExample)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {examples.map((ex, i) => (
              <span key={i} className="tag-chip accent">
                {ex}
                <button className="tag-chip-remove" onClick={() => removeItem(examples, setExamples, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Detection Keywords */}
        <div className="form-group">
          <label>Auto-Detection Keywords</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add detection keyword (e.g. aws, lambda, stem, rubric)..." 
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(keywords, setKeywords, newKeyword, setNewKeyword)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(keywords, setKeywords, newKeyword, setNewKeyword)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {keywords.map((kw, i) => (
              <span key={i} className="tag-chip">
                {kw}
                <button className="tag-chip-remove" onClick={() => removeItem(keywords, setKeywords, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button className="btn-primary" onClick={handleSave}>
            Save Specialization
          </button>
        </div>
      </div>
    </div>
  );
}
