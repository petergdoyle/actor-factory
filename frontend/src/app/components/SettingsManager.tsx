"use client";
import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'high-contrast';

const THEME_KEY = 'actorfactory-theme';

const themes: { id: Theme; label: string; description: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', description: 'Default dark theme with subtle gradients and glass panels.', icon: '🌙' },
  { id: 'light', label: 'Light', description: 'Clean light background with high readability for bright environments.', icon: '☀️' },
  { id: 'high-contrast', label: 'High Contrast', description: 'Maximum contrast with larger text and bold borders for visual accessibility.', icon: '👁️' },
];

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

export default function SettingsManager() {
  const [activeTheme, setActiveTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = getStoredTheme();
    setActiveTheme(stored);
    applyTheme(stored);
  }, []);

  const handleThemeChange = (theme: Theme) => {
    setActiveTheme(theme);
    applyTheme(theme);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
      <div className="glass-panel">
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Appearance</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Choose a display theme. Your selection is saved locally and applied instantly.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {themes.map((theme) => (
            <label
              key={theme.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: '12px',
                border: activeTheme === theme.id
                  ? '2px solid var(--accent-color)'
                  : '1px solid var(--border-color)',
                background: activeTheme === theme.id
                  ? 'rgba(107, 124, 255, 0.08)'
                  : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => handleThemeChange(theme.id)}
            >
              <input
                type="radio"
                name="theme"
                value={theme.id}
                checked={activeTheme === theme.id}
                onChange={() => handleThemeChange(theme.id)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '24px' }}>{theme.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {theme.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {theme.description}
                </div>
              </div>
              {activeTheme === theme.id && (
                <span className="badge active" style={{ fontSize: '11px' }}>Active</span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="glass-panel">
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>About</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          ActorFactory — Universal AI Actor Composition Engine
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Version</span>
          <span>0.1.0</span>
          <span style={{ color: 'var(--text-muted)' }}>Frontend</span>
          <span>Next.js + React</span>
          <span style={{ color: 'var(--text-muted)' }}>Backend</span>
          <span>FastAPI + SQLite</span>
          <span style={{ color: 'var(--text-muted)' }}>LLM Layer</span>
          <span>Pluggable (Ollama, OpenAI, Claude, Bedrock)</span>
        </div>
      </div>
    </div>
  );
}
