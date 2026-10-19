"use client";
import { useState, useEffect } from 'react';
import DomainManager from './components/DomainManager';
import ActorManager from './components/ActorManager';
import SkillManager from './components/SkillManager';
import SpecializationManager from './components/SpecializationManager';
import Composer, { Composition } from './components/Composer';
import TestBench from './components/TestBench';
import LLMConfigManager from './components/LLMConfigManager';
import AuditLogManager from './components/AuditLogManager';
import SettingsManager, { getStoredTheme, applyTheme } from './components/SettingsManager';
import HelpDocs from './components/HelpDocs';
import { getApiBaseUrl } from './utils/api';

type Tab =
  | 'domains'
  | 'actors'
  | 'skills'
  | 'specializations'
  | 'composer'
  | 'testbench'
  | 'llm_configs'
  | 'audit_logs'
  | 'settings'
  | 'help';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  group: 'build' | 'run' | 'system';
}

// Grouped navigation: author the building blocks, then use them, then system.
const NAV_ITEMS: NavItem[] = [
  { id: 'domains', label: 'Domains', icon: '🌐', group: 'build' },
  { id: 'actors', label: 'Actors', icon: '🎭', group: 'build' },
  { id: 'skills', label: 'Skills', icon: '⚡', group: 'build' },
  { id: 'specializations', label: 'Specializations', icon: '🔧', group: 'build' },
  { id: 'composer', label: 'Composer', icon: '🔗', group: 'run' },
  { id: 'testbench', label: 'Test Bench', icon: '🧪', group: 'run' },
  { id: 'llm_configs', label: 'LLM Configurations', icon: '⚙️', group: 'system' },
  { id: 'audit_logs', label: 'Audit Log', icon: '📋', group: 'system' },
  { id: 'settings', label: 'Settings', icon: '🎨', group: 'system' },
  { id: 'help', label: 'Help & Documentation', icon: '📖', group: 'system' },
];

const GROUP_LABELS: Record<NavItem['group'], string> = {
  build: 'Build Blocks',
  run: 'Compose & Run',
  system: 'System',
};

interface StackHealth {
  api_status: 'online' | 'offline';
  llm_status: 'online' | 'offline' | 'unconfigured';
  active_provider: string;
  active_model: string;
  latency_ms: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('domains');
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  // Stack Health State
  const [stackHealth, setStackHealth] = useState<StackHealth>({
    api_status: 'offline',
    llm_status: 'offline',
    active_provider: 'Connecting...',
    active_model: 'mock',
    latency_ms: 0
  });

  const checkHealth = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/health/stack`);
      if (res.ok) {
        const data = await res.json();
        setStackHealth({
          api_status: data.api_status || 'online',
          llm_status: data.llm_status || 'offline',
          active_provider: data.active_provider || 'Ollama (Local)',
          active_model: data.active_model || 'gemma3:12b',
          latency_ms: data.latency_ms || 0
        });
      } else {
        setStackHealth(prev => ({ ...prev, api_status: 'offline', llm_status: 'offline' }));
      }
    } catch (e) {
      setStackHealth(prev => ({ ...prev, api_status: 'offline', llm_status: 'offline' }));
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply stored theme on mount
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  const handleSelectForTesting = (comp: Composition, prompt: string) => {
    setActiveComposition(comp);
    setInitialPrompt(prompt);
    setActiveTab('testbench');
  };

  const handleSeedData = async () => {
    if (!confirm("Seed database with default Domains, Personas, Skills, Specializations, and LLM Configs?")) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/seed`, { method: "POST" });
      if (res.ok) {
        alert("Seed data successfully populated!");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to seed database.");
    }
  };

  const groups: NavItem['group'][] = ['build', 'run', 'system'];

  return (
    <div className="app-shell">
      {/* Left Sidebar Navigation */}
      <aside className="app-sidebar">
        <a href="#" className="brand-logo">
          <span>ActorFactory</span> 🤖
        </a>

        <nav className="sidebar-nav">
          {groups.map(group => (
            <div key={group} className="sidebar-nav-group">
              <div className="sidebar-nav-group-label">{GROUP_LABELS[group]}</div>
              {NAV_ITEMS.filter(item => item.group === group).map(item => (
                <button
                  key={item.id}
                  className={`sidebar-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Pinned footer: stack status + seed action */}
        <div className="sidebar-footer">
          <span className={`badge ${stackHealth.api_status === 'online' ? 'success' : ''}`}>
            {stackHealth.api_status === 'online' ? '🟢 API Connected' : '🔴 API Offline'}
          </span>
          <span className={`badge ${stackHealth.llm_status === 'online' ? 'success' : stackHealth.llm_status === 'unconfigured' ? 'warning' : ''}`}>
            {stackHealth.llm_status === 'online'
              ? `🟢 LLM: ${stackHealth.active_model}`
              : stackHealth.llm_status === 'unconfigured'
              ? `⚠️ LLM Unconfigured`
              : `🔴 LLM Offline`}
          </span>
          <button
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', width: '100%' }}
            onClick={handleSeedData}
            title="Populate default seed data from specification docs"
          >
            🌱 Seed Library
          </button>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <main className="main-container">
        {/* The Test Bench stays MOUNTED across tab switches (hidden, not
            unmounted) so an in-flight LLM run and its streamed output are not
            lost when the user navigates away and comes back. Other screens are
            cheap to remount and load fresh. */}
        <div style={{ display: activeTab === 'testbench' ? 'block' : 'none' }}>
          <TestBench activeComposition={activeComposition} initialPrompt={initialPrompt} />
        </div>

        {activeTab === 'domains' && <DomainManager />}
        {activeTab === 'actors' && <ActorManager />}
        {activeTab === 'skills' && <SkillManager />}
        {activeTab === 'specializations' && <SpecializationManager />}
        {activeTab === 'composer' && <Composer onSelectForTesting={handleSelectForTesting} />}
        {activeTab === 'llm_configs' && <LLMConfigManager onConfigChanged={checkHealth} />}
        {activeTab === 'audit_logs' && <AuditLogManager />}
        {activeTab === 'settings' && <SettingsManager />}
        {activeTab === 'help' && <HelpDocs />}
      </main>
    </div>
  );
}
