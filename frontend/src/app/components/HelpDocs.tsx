"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getApiBaseUrl } from '../utils/api';

const MarkdownView = dynamic(() => import('./MarkdownView'), {
  ssr: false,
  loading: () => <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading…</div>,
});

interface DocEntry {
  slug: string;
  title: string;
  filename: string;
}
interface DocSection {
  id: string;
  label: string;
  docs: DocEntry[];
}

export default function HelpDocs() {
  const [sections, setSections] = useState<DocSection[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Load the docs tree once.
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/docs`)
      .then(r => (r.ok ? r.json() : { sections: [] }))
      .then(data => {
        const secs: DocSection[] = data.sections || [];
        setSections(secs);
        // Auto-open the first doc for an immediate landing view.
        const first = secs.flatMap(s => s.docs)[0];
        if (first) openDoc(first.slug);
      })
      .catch(() => setSections([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDoc = (slug: string) => {
    setSelectedSlug(slug);
    setLoading(true);
    fetch(`${getApiBaseUrl()}/docs/${slug}`)
      .then(r => (r.ok ? r.json() : { content: '*Document not found.*' }))
      .then(data => setContent(data.content || ''))
      .catch(() => setContent('*Failed to load document.*'))
      .finally(() => setLoading(false));
  };

  // Client-side filter by title/filename.
  const q = search.trim().toLowerCase();
  const filtered = sections
    .map(s => ({
      ...s,
      docs: s.docs.filter(
        d => !q || d.title.toLowerCase().includes(q) || d.filename.toLowerCase().includes(q)
      ),
    }))
    .filter(s => s.docs.length > 0);

  return (
    <div style={{ display: 'flex', gap: '24px', minHeight: 'calc(100vh - 100px)' }}>
      {/* Left index */}
      <div style={{ width: '260px', flexShrink: 0 }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>📖 Documentation</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search docs…"
          style={{ width: '100%', marginBottom: '14px', fontSize: '13px' }}
        />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {sections.length === 0 ? 'No documentation available yet.' : 'No matches.'}
            </p>
          )}
          {filtered.map(section => (
            <div key={section.id || 'overview'}>
              {section.label && section.label !== 'Overview' && (
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '4px' }}>
                  {section.label}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {section.docs.map(doc => (
                  <button
                    key={doc.slug}
                    onClick={() => openDoc(doc.slug)}
                    className={`sidebar-nav-btn ${selectedSlug === doc.slug ? 'active' : ''}`}
                    style={{ fontSize: '13px', padding: '6px 10px' }}
                  >
                    <span style={{ opacity: 0.6 }}>📄</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Right content */}
      <div className="glass-panel" style={{ flex: 1, minWidth: 0, padding: '28px 32px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
        ) : content ? (
          <MarkdownView source={content} dark />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '60px' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>📖</div>
            <p>Select a document from the left to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
