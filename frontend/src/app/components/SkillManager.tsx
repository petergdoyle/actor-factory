"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

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

export default function SkillManager() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [validationLevel, setValidationLevel] = useState<Skill["validation_level"]>("heuristic");

  const [validationRules, setValidationRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  const [qualityPatterns, setQualityPatterns] = useState<string[]>([]);
  const [newQuality, setNewQuality] = useState("");

  const [antiPatterns, setAntiPatterns] = useState<string[]>([]);
  const [newAnti, setNewAnti] = useState("");

  const loadSkills = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/skills`);
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
    if (!name.trim()) return alert("Skill name is required.");

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
      const res = await fetch(`${getApiBaseUrl()}/skills`, {
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
      const res = await fetch(`${getApiBaseUrl()}/skills/${id}`, { method: "DELETE" });
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
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Skills ({skills.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + New Skill
          </button>
        </div>

        <input 
          type="text" 
          placeholder="Filter skills..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">⚡</span>
              <p>No skills defined yet.</p>
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
                  <span className={`badge ${s.validation_level === 'machine' ? 'success' : ''}`}>
                    {s.validation_level}
                  </span>
                </div>
                <p className="entity-card-desc">{s.description || "No description."}</p>
                <div className="tag-container">
                  {s.validation_rules.slice(0, 2).map((r, i) => (
                    <span key={i} className="tag-chip">{r}</span>
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
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Skill" : "Create Executable Skill"}</h2>
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
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Mermaid Diagram Building, INVEST Story Writing" 
            />
          </div>

          <div className="form-group">
            <label>Validation Level</label>
            <select 
              value={validationLevel} 
              onChange={e => setValidationLevel(e.target.value as Skill["validation_level"])}
            >
              <option value="machine">Machine (Binary Parser / Compiler)</option>
              <option value="structural">Structural (Schema / Template Rules)</option>
              <option value="heuristic">Heuristic (Rule-Based Coverage)</option>
              <option value="human">Human (Subjective Review)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="What capability does this skill deliver..." 
            style={{ minHeight: '60px' }}
          />
        </div>

        <div className="form-group">
          <label>Output Format Specification</label>
          <input 
            type="text" 
            value={outputFormat} 
            onChange={e => setOutputFormat(e.target.value)} 
            placeholder="e.g. ```mermaid code block``` or OpenAPI 3.0 YAML" 
          />
        </div>

        {/* Validation Rules */}
        <div className="form-group">
          <label>Validation Rules (Must-pass structural constraints)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add validation rule..." 
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(validationRules, setValidationRules, newRule, setNewRule)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(validationRules, setValidationRules, newRule, setNewRule)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {validationRules.map((r, i) => (
              <span key={i} className="tag-chip accent">
                {r}
                <button className="tag-chip-remove" onClick={() => removeItem(validationRules, setValidationRules, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Quality Patterns */}
        <div className="form-group">
          <label>Quality Patterns (Best practices to demonstrate)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add quality pattern..." 
              value={newQuality}
              onChange={e => setNewQuality(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(qualityPatterns, setQualityPatterns, newQuality, setNewQuality)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(qualityPatterns, setQualityPatterns, newQuality, setNewQuality)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {qualityPatterns.map((qp, i) => (
              <span key={i} className="tag-chip accent">
                {qp}
                <button className="tag-chip-remove" onClick={() => removeItem(qualityPatterns, setQualityPatterns, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Anti Patterns */}
        <div className="form-group">
          <label>Anti-Patterns (Mistakes to explicitly avoid)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              placeholder="Add anti-pattern..." 
              value={newAnti}
              onChange={e => setNewAnti(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(antiPatterns, setAntiPatterns, newAnti, setNewAnti)}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={() => addItem(antiPatterns, setAntiPatterns, newAnti, setNewAnti)}>
              Add
            </button>
          </div>
          <div className="tag-container">
            {antiPatterns.map((ap, i) => (
              <span key={i} className="tag-chip accent">
                {ap}
                <button className="tag-chip-remove" onClick={() => removeItem(antiPatterns, setAntiPatterns, i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button className="btn-primary" onClick={handleSave}>
            Save Skill
          </button>
        </div>
      </div>
    </div>
  );
}
