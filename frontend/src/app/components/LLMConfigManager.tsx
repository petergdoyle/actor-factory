"use client";
import { useState, useEffect } from 'react';

export interface LLMProviderConfig {
  id: str;
  name: str;
  provider_type: 'ollama' | 'openai' | 'anthropic' | 'bedrock' | 'mock';
  base_url?: string;
  api_key?: string;
  active_model: string;
  is_active: boolean;
  status: 'online' | 'offline' | 'unconfigured';
  available_models: string[];
}

const API_BASE = "http://localhost:8000/api/v1";

export default function LLMConfigManager({ onConfigChanged }: { onConfigChanged?: () => void }) {
  const [configs, setConfigs] = useState<LLMProviderConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("ollama_local");
  const [activeModel, setActiveModel] = useState<string>("llama3");

  // Editing state per provider
  const [editUrls, setEditUrls] = useState<Record<string, string>>({});
  const [editKeys, setEditKeys] = useState<Record<string, string>>({});

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [savingActive, setSavingActive] = useState(false);

  const loadConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE}/llm/configs`);
      if (res.ok) {
        const data: LLMProviderConfig[] = await res.json();
        setConfigs(data);

        // Pre-fill edit fields
        const urls: Record<string, string> = {};
        const keys: Record<string, string> = {};
        let activeCfg = data.find(c => c.is_active);
        if (!activeCfg && data.length > 0) activeCfg = data[0];

        data.forEach(c => {
          urls[c.id] = c.base_url || "";
          keys[c.id] = c.api_key || "";
        });
        setEditUrls(urls);
        setEditKeys(keys);

        if (activeCfg) {
          setActiveConfigId(activeCfg.id);
          setActiveModel(activeCfg.active_model);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSaveActiveConfig = async () => {
    setSavingActive(true);
    try {
      const res = await fetch(`${API_BASE}/llm/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: activeConfigId,
          active_model: activeModel
        })
      });
      if (res.ok) {
        await loadConfigs();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingActive(false);
    }
  };

  const handleTestConnection = async (config: LLMProviderConfig) => {
    setTestingId(config.id);
    try {
      const res = await fetch(`${API_BASE}/llm/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: config.id,
          base_url: editUrls[config.id] || config.base_url,
          api_key: editKeys[config.id] || config.api_key,
          provider_type: config.provider_type
        })
      });
      if (res.ok) {
        const result = await res.json();
        setTestResult(prev => ({ ...prev, [config.id]: result }));
        // Reload configs to catch updated status / model list
        loadConfigs();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e: any) {
      setTestResult(prev => ({
        ...prev,
        [config.id]: { status: "offline", message: e.message }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveProviderSettings = async (config: LLMProviderConfig) => {
    const updated: LLMProviderConfig = {
      ...config,
      base_url: editUrls[config.id] || "",
      api_key: editKeys[config.id] || ""
    };
    try {
      const res = await fetch(`${API_BASE}/llm/configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        await loadConfigs();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedProviderConfig = configs.find(c => c.id === activeConfigId);
  const availableModelsForActive = selectedProviderConfig?.available_models.length 
    ? selectedProviderConfig.available_models 
    : [selectedProviderConfig?.active_model || "llama3", "llama3", "llama3.2", "gemma3:12b", "mistral", "mermaid-fixer", "gpt-4o", "claude-3-5-sonnet"];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Informational Banner */}
      <div className="glass-panel" style={{ background: 'rgba(107, 124, 255, 0.08)', borderColor: 'rgba(107, 124, 255, 0.2)' }}>
        <h3 style={{ fontSize: '16px', color: 'var(--text-accent)', marginBottom: '6px' }}>
          🤖 What are LLM Provider Configurations?
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          ActorFactory supports multiple LLM engines — from local private Small Language Models (Ollama, llama3, gemma3:12b) to cloud providers (OpenAI, Anthropic, AWS Bedrock).
          Configure your provider endpoints, test latency, and set the active default model used for composition execution.
        </p>
      </div>

      {/* Active LLM Configuration Box */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>⚡ Active LLM Engine Configuration</h2>
          <span className="badge active">System Primary</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Active Provider</label>
            <select 
              value={activeConfigId} 
              onChange={e => {
                const newId = e.target.value;
                setActiveConfigId(newId);
                const cfg = configs.find(c => c.id === newId);
                if (cfg) setActiveModel(cfg.active_model);
              }}
            >
              {configs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.provider_type}) {c.is_active ? "★ Active" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Target Model</label>
            <select value={activeModel} onChange={e => setActiveModel(e.target.value)}>
              {availableModelsForActive.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', display: 'block' }}>
              ✓ {availableModelsForActive.length} models available for {selectedProviderConfig?.name || activeConfigId}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn-primary" onClick={handleSaveActiveConfig} disabled={savingActive}>
            {savingActive ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Available Providers List */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px' }}>Configured LLM Providers</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {configs.map(c => {
            const result = testResult[c.id];
            return (
              <div 
                key={c.id} 
                className="glass-panel" 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '20px',
                  borderColor: c.is_active ? 'var(--accent-color)' : 'var(--border-color)' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${c.status === 'online' ? 'success' : c.status === 'offline' ? 'warning' : ''}`}>
                      {c.status === 'online' ? '🟢 Online' : c.status === 'offline' ? '🔴 Offline' : '⚪ Unconfigured'}
                    </span>
                    <h3 style={{ fontSize: '16px' }}>{c.name}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({c.provider_type})</span>
                    {c.is_active && <span className="badge active">Active Default</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleTestConnection(c)}
                      disabled={testingId === c.id}
                    >
                      {testingId === c.id ? "Testing..." : "⚡ Test Connection"}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: c.provider_type === 'ollama' ? '2fr 1fr' : '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                  {c.provider_type === 'ollama' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Base Endpoint URL</label>
                      <input 
                        type="text" 
                        value={editUrls[c.id] ?? c.base_url ?? ""} 
                        onChange={e => setEditUrls({ ...editUrls, [c.id]: e.target.value })}
                        placeholder="http://localhost:11434" 
                      />
                    </div>
                  )}

                  {c.provider_type !== 'ollama' && c.provider_type !== 'mock' && (
                    <>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Base Endpoint URL</label>
                        <input 
                          type="text" 
                          value={editUrls[c.id] ?? c.base_url ?? ""} 
                          onChange={e => setEditUrls({ ...editUrls, [c.id]: e.target.value })}
                          placeholder="https://api.openai.com/v1" 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>API Key</label>
                        <input 
                          type="password" 
                          value={editKeys[c.id] ?? c.api_key ?? ""} 
                          onChange={e => setEditKeys({ ...editKeys, [c.id]: e.target.value })}
                          placeholder="sk-..." 
                        />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '8px 14px', fontSize: '13px' }}
                      onClick={() => handleSaveProviderSettings(c)}
                    >
                      Save Settings
                    </button>
                  </div>
                </div>

                {/* Connection Test Outcome */}
                {result && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: result.status === 'online' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', border: `1px solid ${result.status === 'online' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{result.message}</span>
                      {result.latency_ms > 0 && <span style={{ fontWeight: 600 }}>{result.latency_ms} ms</span>}
                    </div>
                    {result.models && result.models.length > 0 && (
                      <div className="tag-container" style={{ marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Models:</span>
                        {result.models.map((m: string) => (
                          <span key={m} className="tag-chip accent">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
