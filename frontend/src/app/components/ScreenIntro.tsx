"use client";

import { useState, useEffect } from 'react';

/**
 * A dismissible per-screen narrative banner. Explains what a screen is for and
 * what the user is actually doing. Dismissal is remembered per screen id in
 * localStorage so it stays out of the way once read.
 */
export default function ScreenIntro({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const storageKey = `af-intro-dismissed:${id}`;
  const [dismissed, setDismissed] = useState(true); // default hidden until we read storage (avoids flash)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* ignore */
    }
  };

  if (dismissed) {
    return (
      <button
        onClick={() => {
          setDismissed(false);
          try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
        }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '12px', padding: '0 0 10px 2px',
        }}
        title="Show the help for this screen"
      >
        ⓘ About this screen
      </button>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '14px 18px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        borderLeft: '3px solid var(--accent-color)',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {children}
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1 }}
        title="Dismiss"
        aria-label="Dismiss help"
      >
        ×
      </button>
    </div>
  );
}
