"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

export interface AuditLogEntry {
  timestamp: string;
  call_id: string;
  call_type: string;
  git: {
    sha: string;
    branch: string;
  };
  llm: {
    provider: string;
    model: string;
    system_prompt_length: number;
    system_prompt: string;
    user_prompt: string;
    temperature: number;
    response: string;
    duration_ms: number;
  };
  modifiers: {
    persona: string;
    persona_title: string;
    specializations: string[];
    skill: string;
    preamble_char_count: number;
  };
  domain_context: any;
}

export default function AuditLogManager() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filter & Search State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [callTypeFilter, setCallTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (callTypeFilter) params.append('call_type', callTypeFilter);
      if (searchQuery) params.append('query', searchQuery);
      params.append('limit', limit.toString());

      const res = await fetch(`${getApiBaseUrl()}/llm/audit-logs/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // API may return a bare array or { entries: [...] }
        setLogs(Array.isArray(data) ? data : (data.entries || []));
      }
    } catch (e) {
      console.error("Failed to fetch audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/audit-logs/config`);
      if (res.ok) {
        const data = await res.json();
        // API returns { known_call_types: [...], disabled_call_types: [...] }
        // Build a Record<string, boolean> map for the UI
        if (data.logging_enabled) {
          setConfig(data.logging_enabled);
        } else if (data.known_call_types) {
          const disabled = new Set(data.disabled_call_types || []);
          const configMap: Record<string, boolean> = {};
          for (const ct of data.known_call_types) {
            configMap[ct] = !disabled.has(ct);
          }
          setConfig(configMap);
        }
      }
    } catch (e) {
      console.error("Failed to fetch audit log config", e);
    }
  };

  const handleToggleConfig = async (key: string, enabled: boolean) => {
    const newConfig = { ...config, [key]: enabled };
    setConfig(newConfig);
    try {
      // Send as disabled_call_types array (matching API shape)
      const disabled_call_types = Object.entries(newConfig)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      await fetch(`${getApiBaseUrl()}/llm/audit-logs/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled_call_types })
      });
    } catch (e) {
      console.error("Failed to update audit log config", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Start Date
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              style={{ width: '130px', padding: '4px 8px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              End Date
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              style={{ width: '130px', padding: '4px 8px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              LLM Goal / Call Type
            </label>
            <select 
              value={callTypeFilter} 
              onChange={e => setCallTypeFilter(e.target.value)} 
              style={{ width: '180px', padding: '4px 8px', fontSize: '12px' }}
            >
              <option value="">All Call Types...</option>
              {Object.keys(config).map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Search Prompt / Response
            </label>
            <input 
              type="text" 
              placeholder="Search keyword..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ width: '180px', padding: '4px 8px', fontSize: '12px' }}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Limit
            </label>
            <select 
              value={limit} 
              onChange={e => setLimit(Number(e.target.value))} 
              style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <button 
            className="btn-primary" 
            style={{ padding: '6px 14px', marginTop: '16px', fontSize: '12px' }}
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? 'Searching...' : '🔍 Search Logs'}
          </button>
        </div>

        <button 
          className="btn-secondary" 
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => setShowConfigDrawer(!showConfigDrawer)}
        >
          ⚙️ Logging Controls ({Object.keys(config).length})
        </button>
      </div>

      {/* Logging Controls Drawer */}
      {showConfigDrawer && (
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Call-Type Logging Controls</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Toggle recording for specific LLM call types. Disabling a call type stops appending entries to daily log archives.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {Object.entries(config).map(([key, isEnabled]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isEnabled} 
                  onChange={e => handleToggleConfig(key, e.target.checked)} 
                />
                <span style={{ fontFamily: 'Geist Mono, monospace' }}>{key}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {logs.length === 0 ? (
          <div className="glass-panel empty-state">
            <span className="empty-state-icon">📋</span>
            <p>No audit log entries found matching your query.</p>
          </div>
        ) : (
          logs.map((entry, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div key={idx} className="glass-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge active" style={{ textTransform: 'none', fontFamily: 'Geist Mono, monospace' }}>
                      {entry.call_type}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{entry.modifiers?.persona}</span>
                    <span className="tag-chip">{entry.modifiers?.skill}</span>
                    {entry.modifiers?.specializations?.map((s, i) => (
                      <span key={i} className="tag-chip accent">{s}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className="badge">{entry.llm?.duration_ms}ms</span>
                    <span className="badge success">{entry.llm?.model}</span>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    >
                      {isExpanded ? 'Collapse ▲' : 'Inspect ▼'}
                    </button>
                  </div>
                </div>

                {/* Compact View */}
                {!isExpanded && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', marginTop: '4px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      <strong>User Prompt:</strong> {entry.llm?.user_prompt}
                    </div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      <strong>Response:</strong> {entry.llm?.response}
                    </div>
                  </div>
                )}

                {/* Expanded Detailed View */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' }}>
                    {/* Metadata Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>GIT COMMIT SHA</span>
                        <code style={{ fontSize: '11px' }}>{entry.git?.sha || 'local'} ({entry.git?.branch || 'main'})</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>PROVIDER & MODEL</span>
                        <span>{entry.llm?.provider} / {entry.llm?.model}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>PREAMBLE LENGTH</span>
                        <span>{entry.modifiers?.preamble_char_count} chars</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>TEMPERATURE</span>
                        <span>{entry.llm?.temperature}</span>
                      </div>
                    </div>

                    {/* Compiled System Prompt */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                        1. Compiled System Prompt Preamble
                      </label>
                      <pre className="prompt-preview-box" style={{ maxHeight: '180px', fontSize: '11px', marginTop: '4px' }}>
                        {entry.llm?.system_prompt}
                      </pre>
                    </div>

                    {/* User Prompt */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                        2. User Input Payload
                      </label>
                      <pre className="prompt-preview-box" style={{ maxHeight: '140px', fontSize: '11px', marginTop: '4px' }}>
                        {entry.llm?.user_prompt}
                      </pre>
                    </div>

                    {/* LLM Response */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase' }}>
                        3. Recorded LLM Response
                      </label>
                      <pre className="prompt-preview-box" style={{ maxHeight: '240px', fontSize: '11px', marginTop: '4px' }}>
                        {entry.llm?.response}
                      </pre>
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
