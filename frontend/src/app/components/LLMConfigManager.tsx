"use client";
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';

export interface LLMConfig {
  id: string;
  name: string;
  provider_type: 'ollama' | 'openai' | 'anthropic' | 'bedrock' | 'mock';
  base_url: string;
  api_key?: string;
  active_model: string;
  is_active: boolean;
  status: 'online' | 'offline' | 'unconfigured' | 'error';
  available_models: string[];
}

export default function LLMConfigManager({ onConfigChanged }: { onConfigChanged?: () => void }) {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latency_ms: number; message: string } | null>(null);

  // Form State
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<LLMConfig['provider_type']>('ollama');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [apiKey, setApiKey] = useState('');
  const [activeModel, setActiveModel] = useState('gemma3:12b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  const loadConfigs = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/configs`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
        if (data.length > 0 && !selectedId) {
          selectConfig(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const selectConfig = (c: LLMConfig) => {
    setSelectedId(c.id);
    setId(c.id);
    setName(c.name);
    setProviderType(c.provider_type);
    setBaseUrl(c.base_url || '');
    setApiKey(c.api_key || '');
    setActiveModel(c.active_model || '');
    setAvailableModels(c.available_models || []);
    setTestResult(null);
    setModelsError(null);
    setManualEntry(false);
    // Live-refresh the model list from the provider on select.
    fetchModels({ base: c.base_url || '', provider: c.provider_type, configId: c.id });
  };

  const handleNew = () => {
    setSelectedId(null);
    setId(`provider_${Date.now()}`);
    setName('');
    setProviderType('ollama');
    setBaseUrl('http://localhost:11434');
    setApiKey('');
    setActiveModel('gemma3:12b');
    setAvailableModels(['gemma3:12b', 'llama3.2:latest']);
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Provider name is required.");

    const payload: LLMConfig = {
      id: id || `provider_${Date.now()}`,
      name,
      provider_type: providerType,
      base_url: baseUrl,
      api_key: apiKey,
      active_model: activeModel,
      is_active: selectedId ? (configs.find(c => c.id === selectedId)?.is_active || false) : false,
      status: 'offline',
      available_models: availableModels
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        await loadConfigs();
        selectConfig(saved);
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: selectedId,
          provider_type: providerType,
          base_url: baseUrl,
          api_key: apiKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          status: data.status,
          latency_ms: data.latency_ms,
          message: data.message
        });

        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
      } else {
        setTestResult({
          status: 'error',
          latency_ms: 0,
          message: `HTTP Error ${res.status}: Failed to reach provider endpoint`
        });
      }
    } catch (e: any) {
      setTestResult({
        status: 'error',
        latency_ms: 0,
        message: e.message || 'Connection failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSetActive = async (configId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: configId,
          active_model: activeModel
        })
      });

      if (res.ok) {
        await loadConfigs();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm("Are you sure you want to remove this LLM provider configuration?")) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/llm/configs/${configId}`, { method: "DELETE" });
      if (res.ok) {
        await loadConfigs();
        handleNew();
        if (onConfigChanged) onConfigChanged();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModels = async (opts?: { base?: string; provider?: string; configId?: string | null }) => {
    const base = opts?.base ?? baseUrl;
    const provider = opts?.provider ?? providerType;
    const configId = opts?.configId ?? selectedId;

    // Only Ollama (and mock) support live discovery here.
    if (provider !== 'ollama' && provider !== 'mock') {
      setModelsError(null);
      return;
    }

    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const params = new URLSearchParams({ provider_type: provider });
      if (base) params.set('base_url', base);
      if (configId) params.set('config_id', configId);

      const res = await fetch(`${getApiBaseUrl()}/llm/models?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const models: string[] = data.models || [];
        setAvailableModels(models);
        if (data.status !== 'online') {
          setModelsError(data.message || 'Provider is offline.');
        } else if (models.length === 0) {
          setModelsError('No models found. Pull one with: ollama pull <model>');
        }
      } else {
        setModelsError(`Failed to load models (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      setModelsError(e.message || 'Failed to reach provider.');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const addModel = () => {
    if (!newModel.trim()) return;
    if (!availableModels.includes(newModel.trim())) {
      setAvailableModels([...availableModels, newModel.trim()]);
    }
    setNewModel('');
  };

  const removeModel = (m: string) => {
    setAvailableModels(availableModels.filter(item => item !== m));
  };

  return (
    <div className="split-view">
      {/* Left List */}
      <div className="entity-list-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>LLM Providers ({configs.length})</h2>
          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleNew}>
            + Add Provider
          </button>
        </div>

        <div className="entity-card-list">
          {configs.map(c => (
            <div 
              key={c.id} 
              className={`entity-card ${c.id === selectedId ? 'selected' : ''}`}
              onClick={() => selectConfig(c)}
            >
              <div className="entity-card-header">
                <span className="entity-card-title">{c.name}</span>
                <span className={`badge ${c.is_active ? 'success' : ''}`}>
                  {c.is_active ? 'Active Default' : c.status}
                </span>
              </div>
              <p className="entity-card-desc" style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px' }}>
                {c.provider_type.toUpperCase()} • {c.active_model || 'No model selected'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {c.base_url || 'Cloud API'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px' }}>{selectedId ? `Configure ${name}` : 'Add LLM Provider'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedId && (
              <button className="btn-secondary" onClick={() => handleSetActive(selectedId)}>
                Set Active Default
              </button>
            )}
            {selectedId && (
              <button className="btn-danger" onClick={() => handleDelete(selectedId)}>
                Delete Provider
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Provider Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Ollama Local Daemon, Azure OpenAI, Anthropic" 
            />
          </div>

          <div className="form-group">
            <label>Provider Type</label>
            <select 
              value={providerType} 
              onChange={e => setProviderType(e.target.value as LLMConfig['provider_type'])}
            >
              <option value="ollama">Ollama Local Daemon</option>
              <option value="openai">OpenAI API</option>
              <option value="anthropic">Anthropic Claude API</option>
              <option value="bedrock">AWS Bedrock</option>
              <option value="mock">Mock Provider (Local Testing)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Base URL Endpoint</label>
            <input 
              type="text" 
              value={baseUrl} 
              onChange={e => setBaseUrl(e.target.value)} 
              placeholder="e.g. http://localhost:11434 or https://api.openai.com/v1" 
            />
          </div>

          <div className="form-group">
            <label>API Key (Optional for local Ollama)</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="sk-..." 
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Active Default Model</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 10px', fontSize: '12px' }}
                onClick={() => fetchModels()}
                disabled={isLoadingModels}
              >
                {isLoadingModels ? 'Loading...' : '⟳ Refresh models'}
              </button>
              <button
                type="button"
                onClick={() => setManualEntry(!manualEntry)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {manualEntry ? 'Pick from list' : 'Enter manually'}
              </button>
            </div>
          </div>

          {manualEntry ? (
            <input
              type="text"
              value={activeModel}
              onChange={e => setActiveModel(e.target.value)}
              placeholder="e.g. gemma3:12b, llama3.2:latest, gpt-4o, claude-3-5-sonnet"
            />
          ) : (
            <select
              value={activeModel}
              onChange={e => setActiveModel(e.target.value)}
              disabled={isLoadingModels}
            >
              <option value="">
                {isLoadingModels ? 'Loading models...' : 'Select a model...'}
              </option>
              {/* Keep a previously-saved model selectable even if the daemon is offline. */}
              {activeModel && !availableModels.includes(activeModel) && (
                <option value={activeModel}>{activeModel} (saved)</option>
              )}
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          {modelsError && (
            <p style={{ fontSize: '12px', color: 'var(--danger, #e5484d)', marginTop: '6px' }}>
              {modelsError}
            </p>
          )}
        </div>

        {/* Model Discovery / List */}
        <div className="form-group">
          <label>Available Models {availableModels.length > 0 ? `(${availableModels.length} discovered)` : ''}</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              value={newModel} 
              onChange={e => setNewModel(e.target.value)} 
              placeholder="Manually add a model ID (fallback)..." 
              onKeyDown={e => e.key === 'Enter' && addModel()}
            />
            <button className="btn-secondary" style={{ padding: '0 16px' }} onClick={addModel}>
              Add Model
            </button>
          </div>
          <div className="tag-container">
            {availableModels.map(m => (
              <span 
                key={m} 
                className={`tag-chip ${m === activeModel ? 'accent' : ''}`}
                onClick={() => setActiveModel(m)}
                style={{ cursor: 'pointer' }}
              >
                {m} {m === activeModel ? '★' : ''}
                <button className="tag-chip-remove" onClick={(e) => { e.stopPropagation(); removeModel(m); }}>×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Connection Test Results */}
        {testResult && (
          <div className={`glass-panel ${testResult.status === 'online' ? 'success' : 'error'}`} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>
                {testResult.status === 'online' ? '✅ Connection Successful' : '❌ Connection Failed'}
              </span>
              {testResult.latency_ms > 0 && (
                <span className="badge">{testResult.latency_ms}ms</span>
              )}
            </div>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>{testResult.message}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? 'Testing Latency...' : '⚡ Test Connection & Discover Models'}
          </button>

          <button className="btn-primary" onClick={handleSave}>
            Save Provider Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
