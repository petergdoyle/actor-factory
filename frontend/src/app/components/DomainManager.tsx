"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

export interface Domain {
  id?: string;
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paramJson, setParamJson] = useState("{\n}");

  const loadDomains = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/domains`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
        if (data.length > 0 && !selectedId) {
          selectDomain(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const selectDomain = (d: Domain) => {
    setSelectedId(d.id || null);
    setName(d.name);
    setDescription(d.description);
    setParamJson(JSON.stringify(d.parameters, null, 2));
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setParamJson("{\n  \"key\": \"value\"\n}");
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Domain name is required.");
    let parsedParams = {};
    try {
      parsedParams = JSON.parse(paramJson);
    } catch (e) {
      return alert("Invalid JSON in Parameters field.");
    }

    const payload: Domain = {
      id: selectedId || undefined,
      name,
      description,
      parameters: parsedParams
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/domains`, {
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
    if (!confirm("Are you sure you want to delete this domain?")) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/domains/${id}`, { method: "DELETE" });
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

        <input 
          type="text" 
          placeholder="Filter domains..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="entity-card-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🌐</span>
              <p>No problem domains defined yet.</p>
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
                  {Object.keys(d.parameters || {}).map(key => (
                    <span key={key} className="tag-chip">{key}</span>
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
          <h2 style={{ fontSize: '20px' }}>{selectedId ? "Edit Domain" : "Create Problem Domain"}</h2>
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
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Software Engineering, Logistics, Finance" 
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="High-level description of this operational domain..." 
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label>Domain Parameters (JSON Schema / Defaults)</label>
          <textarea 
            value={paramJson} 
            onChange={e => setParamJson(e.target.value)} 
            style={{ fontFamily: 'Geist Mono, monospace', flex: 1, minHeight: '160px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => selectedId ? selectDomain(domains.find(d => d.id === selectedId)!) : handleNew()}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Domain
          </button>
        </div>
      </div>
    </div>
  );
}
