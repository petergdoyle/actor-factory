"use client";
import { useState, useEffect } from 'react';
import DomainManager from './components/DomainManager';
import ActorManager from './components/ActorManager';
import SkillManager from './components/SkillManager';
import SpecializationManager from './components/SpecializationManager';
import Composer, { Composition } from './components/Composer';
import TestBench from './components/TestBench';
import LLMConfigManager from './components/LLMConfigManager';
import HelpDocs from './components/HelpDocs';

type Tab = 'domains' | 'actors' | 'skills' | 'specializations' | 'composer' | 'testbench' | 'llm_configs' | 'help';

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
      const res = await fetch("http://localhost:8000/api/v1/health/stack");
      if (res.ok) {
        const data = await res.json();
        setStackHealth({
          api_status: data.api_status || 'online',
          llm_status: data.llm_status || 'offline',
          active_provider: data.active_provider || 'Ollama (Local)',
          active_model: data.active_model || 'llama3',
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

  const handleSelectForTesting = (comp: Composition, prompt: string) => {
    setActiveComposition(comp);
    setInitialPrompt(prompt);
    setActiveTab('testbench');
  };

  const handleSeedData = async () => {
    if (!confirm("Seed database with default Domains, Personas, Skills, Specializations, and LLM Configs?")) return;
    try {
      const res = await fetch("http://localhost:8000/api/v1/seed", { method: "POST" });
      if (res.ok) {
        alert("Seed data successfully populated!");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to seed database.");
    }
  };

  return (
    <div className="app-shell">
      {/* Top Navigation Header */}
      <header className="top-header">
        <a href="#" className="brand-logo">
          <span>ActorFactory</span> 🤖
        </a>

        {/* Tab Navigation */}
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'domains' ? 'active' : ''}`}
            onClick={() => setActiveTab('domains')}
          >
            🌐 Domains
          </button>
          <button 
            className={`tab-btn ${activeTab === 'actors' ? 'active' : ''}`}
            onClick={() => setActiveTab('actors')}
          >
            🎭 Actors
          </button>
          <button 
            className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            ⚡ Skills
          </button>
          <button 
            className={`tab-btn ${activeTab === 'specializations' ? 'active' : ''}`}
            onClick={() => setActiveTab('specializations')}
          >
            🔧 Specializations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'composer' ? 'active' : ''}`}
            onClick={() => setActiveTab('composer')}
          >
            🔗 Composer
          </button>
          <button 
            className={`tab-btn ${activeTab === 'testbench' ? 'active' : ''}`}
            onClick={() => setActiveTab('testbench')}
          >
            🧪 Test Bench
          </button>
          <button 
            className={`tab-btn ${activeTab === 'llm_configs' ? 'active' : ''}`}
            onClick={() => setActiveTab('llm_configs')}
          >
            ⚙️ LLM Configurations
          </button>
          <button 
            className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            📚 Help &amp; Docs
          </button>
        </nav>

        {/* Stack Status & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Stack Health Status Indicators */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          </div>

          <button 
            className="btn-secondary" 
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={handleSeedData}
            title="Populate default seed data from specification docs"
          >
            🌱 Seed Library
          </button>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="main-container">
        {activeTab === 'domains' && <DomainManager />}
        {activeTab === 'actors' && <ActorManager />}
        {activeTab === 'skills' && <SkillManager />}
        {activeTab === 'specializations' && <SpecializationManager />}
        {activeTab === 'composer' && <Composer onSelectForTesting={handleSelectForTesting} />}
        {activeTab === 'testbench' && <TestBench activeComposition={activeComposition} initialPrompt={initialPrompt} />}
        {activeTab === 'llm_configs' && <LLMConfigManager onConfigChanged={checkHealth} />}
        {activeTab === 'help' && <HelpDocs />}
      </main>
    </div>
  );
}
