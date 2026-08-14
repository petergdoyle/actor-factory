"use client";
import { useState, useEffect } from 'react';

export interface Domain {
  id?: string;
  name: str;
  description: str;
  parameters: Record<string, any>;
}

const API_BASE = "http://localhost:8000/api/v1";

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paramsJson, setParamsJson] = useState("{\n  \"architecture_style\": \"microservices\"\n}");
  const [jsonError, setJsonError] = useState("");

  const loadDomains = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/domains`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
        if (data.length > 0 && !selectedId) {
          selectDomain(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const selectDomain = (d: Domain) => {
    setSelectedId(d.id || null);
    setName(d.name);
    setDescription(d.description || "");
    setParamsJson(JSON.stringify(d.parameters || {}, null, 2));
    setJsonError("");
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setParamsJson("{\n  \n}");
    setJsonError("");
  };

  const handleSave = async () => {
    setJsonError("");
    let parsedParams = {};
    try {
      parsedParams = JSON.parse(paramsJson);
    } catch (e: any) {
      setJsonError("Invalid JSON in Parameters");
      return;
    }

    const payload: Domain = {
      id: selectedId || undefined,
      name,
      description,
      parameters: parsedParams,
    };

    try {
      const res = await fetch(`${API_BASE}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await loadDomains();
        selectDomain(saved);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Domain?")) return;
    try {
      const res = await fetch(`${API_BASE}/domains/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadDomains();
        handleNew();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = domains.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Domains ({domains.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + New Domain
          </button>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Filter domains..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🌐</span>
              <p>No domains found.</p>
            </div>
          ) : (
            filtered.map(d => (
              <div 
                key={d.id} 
                className={`entity-card ${d.id === selectedId ? 'selected' : ''}`}
                onClick={() => selectDomain(d)}
              >
                <div className="entity-card-header">
                  <span className="entity-card-title">{d.name}</span>
                  <span className="badge">Domain</span>
                </div>
                <p className="entity-card-desc">{d.description || "No description provided."}</p>
                <div className="tag-container">
                  {Object.keys(d.parameters || {}).slice(0, 3).map(k => (
                    <span key={k} className="tag-chip accent">{k}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Editor Form */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Domain" : "Create New Domain"}</h2>
          {selectedId && (
            <button className="btn-danger" onClick={() => handleDelete(selectedId)}>
              Delete
            </button>
          )}
        </div>

        <div className="form-group">
          <label>Domain Name</label>
          <input 
            type="text" 
            placeholder="e.g. Software Engineering, Health Tech, Supply Chain" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            placeholder="Describe the operational boundaries of this domain..." 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Domain Parameters (JSON Schema / Defaults)</label>
          <textarea 
            style={{ fontFamily: 'Geist Mono, monospace', minHeight: '180px' }} 
            value={paramsJson} 
            onChange={e => setParamsJson(e.target.value)} 
          />
          {jsonError && <span style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{jsonError}</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'auto' }}>
          <button className="btn-secondary" onClick={handleNew}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save Domain
          </button>
        </div>
      </div>
    </div>
  );
}
