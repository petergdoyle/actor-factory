"use client";
import { useState, useEffect } from 'react';

export interface Skill {
  id?: string;
  name: string;
  description: string;
  output_format: string;
  validation_level: "machine" | "structural" | "heuristic" | "human";
  validation_rules: string[];
  quality_patterns: string[];
  anti_patterns: string[];
}

const API_BASE = "http://localhost:8000/api/v1";

export default function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [validationLevel, setValidationLevel] = useState<"machine" | "structural" | "heuristic" | "human">("heuristic");

  // Lists
  const [validationRules, setValidationRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  const [qualityPatterns, setQualityPatterns] = useState<string[]>([]);
  const [newQuality, setNewQuality] = useState("");

  const [antiPatterns, setAntiPatterns] = useState<string[]>([]);
  const [newAnti, setNewAnti] = useState("");

  const loadSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
        if (data.length > 0 && !selectedId) {
          selectSkill(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const selectSkill = (s: Skill) => {
    setSelectedId(s.id || null);
    setName(s.name);
    setDescription(s.description || "");
    setOutputFormat(s.output_format || "");
    setValidationLevel(s.validation_level || "heuristic");
    setValidationRules(s.validation_rules || []);
    setQualityPatterns(s.quality_patterns || []);
    setAntiPatterns(s.anti_patterns || []);
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setOutputFormat("");
    setValidationLevel("heuristic");
    setValidationRules([]);
    setQualityPatterns([]);
    setAntiPatterns([]);
  };

  const handleSave = async () => {
    const payload: Skill = {
      id: selectedId || undefined,
      name,
      description,
      output_format: outputFormat,
      validation_level: validationLevel,
      validation_rules: validationRules,
      quality_patterns: qualityPatterns,
      anti_patterns: antiPatterns,
    };

    try {
      const res = await fetch(`${API_BASE}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await loadSkills();
        selectSkill(saved);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Skill?")) return;
    try {
      const res = await fetch(`${API_BASE}/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadSkills();
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

  const filtered = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Executable Skills ({skills.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + New Skill
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Filter skills..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">⚡</span>
              <p>No skills found.</p>
            </div>
          ) : (
            filtered.map(s => (
              <div 
                key={s.id} 
                className={`entity-card ${s.id === selectedId ? 'selected' : ''}`}
                onClick={() => selectSkill(s)}
              >
                <div className="entity-card-header">
                  <span className="entity-card-title">{s.name}</span>
                  <span className={`badge ${s.validation_level === 'machine' ? 'success' : s.validation_level === 'structural' ? 'active' : 'warning'}`}>
                    {s.validation_level}
                  </span>
                </div>
                <p className="entity-card-desc">{s.description || "No description."}</p>
                {s.output_format && (
                  <span className="tag-chip accent" style={{ fontSize: '10px' }}>
                    📄 {s.output_format.slice(0, 40)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Editor Form */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Skill" : "Create New Skill"}</h2>
          {selectedId && (
            <button className="btn-danger" onClick={() => handleDelete(selectedId)}>
              Delete
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Skill Name</label>
            <input 
              type="text" 
              placeholder="e.g. Mermaid Diagram Building, User Story Writing" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label>Validation Level</label>
            <select value={validationLevel} onChange={e => setValidationLevel(e.target.value as any)}>
              <option value="machine">Machine (Binary Parser / Deterministic)</option>
              <option value="structural">Structural (Schema / Template Conformance)</option>
              <option value="heuristic">Heuristic (Coverage / Rules)</option>
              <option value="human">Human (Subjective Judgment)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description & Purpose</label>
          <textarea 
            placeholder="Describes what artifact or executable output this skill produces..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Output Format Specification</label>
          <input 
            type="text" 
            placeholder="e.g. ```mermaid code block``` or OpenAPI 3.0 YAML" 
            value={outputFormat} 
            onChange={e => setOutputFormat(e.target.value)} 
          />
        </div>

        {/* Validation Rules */}
        <div className="form-group">
          <label>Validation Rules</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add validation rule (e.g. Must parse without errors in mermaid.js)" 
              value={newRule} 
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(validationRules, setValidationRules, newRule, setNewRule))}
            />
            <button className="btn-secondary" onClick={() => addItem(validationRules, setValidationRules, newRule, setNewRule)}>Add</button>
          </div>
          {validationRules.map((r, i) => (
            <div key={i} className="list-item-badge">
              <span>⚖️ {r}</span>
              <span className="delete-icon" onClick={() => removeItem(validationRules, setValidationRules, i)}>✕</span>
            </div>
          ))}
        </div>

        {/* Quality Patterns */}
        <div className="form-group">
          <label>Quality Patterns (What Good Looks Like)</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add quality pattern (e.g. Nodes have descriptive labels, not A/B/C)" 
              value={newQuality} 
              onChange={e => setNewQuality(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(qualityPatterns, setQualityPatterns, newQuality, setNewQuality))}
            />
            <button className="btn-secondary" onClick={() => addItem(qualityPatterns, setQualityPatterns, newQuality, setNewQuality)}>Add</button>
          </div>
          {qualityPatterns.map((q, i) => (
            <div key={i} className="list-item-badge" style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
              <span style={{ color: 'var(--success)' }}>✓ {q}</span>
              <span className="delete-icon" onClick={() => removeItem(qualityPatterns, setQualityPatterns, i)}>✕</span>
            </div>
          ))}
        </div>

        {/* Anti-Patterns */}
        <div className="form-group">
          <label>Anti-Patterns (What to Avoid)</label>
          <div className="list-input-row">
            <input 
              type="text" 
              placeholder="Add anti-pattern (e.g. Single-letter node names with no context)" 
              value={newAnti} 
              onChange={e => setNewAnti(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(antiPatterns, setAntiPatterns, newAnti, setNewAnti))}
            />
            <button className="btn-secondary" onClick={() => addItem(antiPatterns, setAntiPatterns, newAnti, setNewAnti)}>Add</button>
          </div>
          {antiPatterns.map((a, i) => (
            <div key={i} className="list-item-badge" style={{ borderColor: 'rgba(248, 113, 113, 0.3)' }}>
              <span style={{ color: 'var(--error)' }}>✗ {a}</span>
              <span className="delete-icon" onClick={() => removeItem(antiPatterns, setAntiPatterns, i)}>✕</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button className="btn-secondary" onClick={handleNew}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Skill
          </button>
        </div>
      </div>
    </div>
  );
}
