"use client";
import { useState, useEffect } from 'react';

export interface AuditEntry {
  id: string;
  timestamp: string;
  duration_ms: number;
  git: { sha: string; branch: string };
  call_type: string;
  call_id: string;
  domain_context: any;
  prompt_construction: {
    template_used: string;
    modifiers: {
      persona?: string;
      persona_title?: string;
      specializations?: string[];
      skill?: string;
      preamble_char_count?: number;
    };
  };
  llm: {
    provider: string;
    model: string;
    system_prompt: string;
    user_prompt: string;
    response: string;
    tokens?: { prompt: number; completion: number; total: number };
  };
}

const API_BASE = "http://localhost:8000/api/v1";

export default function AuditLogManager() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter State
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [callType, setCallType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(25);

  // Logging Controls Config State
  const [showControls, setShowControls] = useState(false);
  const [loggingConfig, setLoggingConfig] = useState<{ enabled: boolean; disabled_call_types: string[]; known_call_types: string[] }>({
    enabled: true,
    disabled_call_types: [],
    known_call_types: [
      "design_ecommerce_solution",
      "testbench_execution",
      "analyze_requirements",
      "generate_stories",
      "build_mermaid_diagram"
    ]
  });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (callType && callType !== "all") params.append("call_type", callType);
      if (searchQuery) params.append("search_query", searchQuery);
      params.append("limit", limit.toString());

      const res = await fetch(`${API_BASE}/llm/audit-logs/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/llm/audit-logs/config`);
      if (res.ok) {
        const data = await res.json();
        setLoggingConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  const handleToggleCallType = async (type: string) => {
    const disabled = loggingConfig.disabled_call_types.includes(type)
      ? loggingConfig.disabled_call_types.filter(t => t !== type)
      : [...loggingConfig.disabled_call_types, type];

    const updatedConfig = { ...loggingConfig, disabled_call_types: disabled };
    setLoggingConfig(updatedConfig);

    try {
      await fetch(`${API_BASE}/llm/audit-logs/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Banner & Logging Controls Toggle */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>📋 Prompt Engineering Audit Log</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Captures every LLM goal execution with full composition context: selected persona, specializations detected, skills applied, complete prompts sent, and raw model responses.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => setShowControls(!showControls)}>
            ⚙️ Logging Controls {showControls ? "▲" : "▼"}
          </button>
        </div>

        {/* Collapsible Logging Controls Panel */}
        {showControls && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
              Toggle Call Types to Record
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {loggingConfig.known_call_types.map(t => {
                const isEnabled = !loggingConfig.disabled_call_types.includes(t);
                return (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: isEnabled ? 'var(--success)' : 'var(--text-muted)' }}>
                    <input 
                      type="checkbox" 
                      checked={isEnabled} 
                      onChange={() => handleToggleCallType(t)} 
                    />
                    <span>{t}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end', padding: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
          <label>End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
          <label>Goal / Call Type</label>
          <select value={callType} onChange={e => setCallType(e.target.value)}>
            <option value="all">All Call Types</option>
            {loggingConfig.known_call_types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '220px' }}>
          <label>Search Query</label>
          <input 
            type="text" 
            placeholder="Search prompts, responses, personas..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0, width: '100px' }}>
          <label>Limit</label>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <button className="btn-primary" style={{ padding: '10px 20px', height: '42px' }} onClick={loadLogs} disabled={loading}>
          {loading ? "Searching..." : "🔍 Search Logs"}
        </button>
      </div>

      {/* Log Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {entries.length === 0 ? (
          <div className="glass-panel empty-state">
            <span className="empty-state-icon">📋</span>
            <p>No audit log entries found for the selected date range and filters.</p>
          </div>
        ) : (
          entries.map(entry => {
            const isExpanded = expandedId === entry.id;
            const mods = entry.prompt_construction?.modifiers || {};
            const tokens = entry.llm?.tokens;

            return (
              <div 
                key={entry.id} 
                className="glass-panel" 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '16px 20px',
                  borderColor: isExpanded ? 'var(--accent-color)' : 'var(--border-color)',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                {/* Header Card Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge active" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {entry.call_type}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      🎭 {mods.persona_title || mods.persona || "Unknown Persona"}
                    </span>
                    {mods.skill && (
                      <span className="tag-chip accent">⚡ {mods.skill}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="badge success">
                      {entry.llm?.provider}/{entry.llm?.model}
                    </span>
                    {tokens?.total && (
                      <span className="badge">{tokens.total} tokens</span>
                    )}
                    <span className="badge">{entry.duration_ms} ms</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }} onClick={e => e.stopPropagation()}>
                    
                    {/* Composition Modifiers Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Specializations Detected:</span>
                        <div className="tag-container" style={{ marginTop: '4px' }}>
                          {(mods.specializations || []).length > 0 
                            ? mods.specializations?.map(s => <span key={s} className="tag-chip accent">{s}</span>)
                            : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
                          }
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Git SHA & Metadata:</span>
                        <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-primary)' }}>
                          Git: <code>{entry.git?.sha}</code> ({entry.git?.branch}) | Preamble length: {mods.preamble_char_count || 0} chars
                        </div>
                      </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        Compiled System Prompt
                      </label>
                      <div className="prompt-preview-box" style={{ maxHeight: '200px' }}>
                        {entry.llm?.system_prompt}
                      </div>
                    </div>

                    {/* User Prompt (LLM Goal) */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        User Prompt / Raw LLM Goal
                      </label>
                      <div className="prompt-preview-box" style={{ maxHeight: '160px' }}>
                        {entry.llm?.user_prompt}
                      </div>
                    </div>

                    {/* LLM Response */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        LLM Model Response
                      </label>
                      <div className="prompt-preview-box" style={{ maxHeight: '300px' }}>
                        {entry.llm?.response}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
