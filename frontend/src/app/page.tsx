"use client";
import { useState } from 'react';
import DomainManager from './components/DomainManager';
import ActorManager from './components/ActorManager';
import SkillManager from './components/SkillManager';
import SpecializationManager from './components/SpecializationManager';
import Composer, { Composition } from './components/Composer';
import TestBench from './components/TestBench';

type Tab = 'domains' | 'actors' | 'skills' | 'specializations' | 'composer' | 'testbench';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('domains');
  const [activeComposition, setActiveComposition] = useState<Composition | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');

  const handleSelectForTesting = (comp: Composition, prompt: string) => {
    setActiveComposition(comp);
    setInitialPrompt(prompt);
    setActiveTab('testbench');
  };

  const handleSeedData = async () => {
    if (!confirm("Seed database with default Domains, Personas, Skills, and Specializations from AI Engineering specifications?")) return;
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
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px' }}>
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
      </main>
    </div>
  );
}
