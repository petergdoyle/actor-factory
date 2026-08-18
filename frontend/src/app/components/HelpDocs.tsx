"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

interface DocEntry {
  path: string;
  title: string;
  filename: string;
}

interface DocCategory {
  id: string;
  label: string;
  docs: DocEntry[];
}

const API_BASE = "http://localhost:8000/api/v1";

export default function HelpDocs() {
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/docs`)
      .then(r => r.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const loadDoc = async (path: string) => {
    setLoading(true);
    setSelectedDoc(path);
    try {
      const res = await fetch(`${API_BASE}/docs/${path}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        setTitle(data.title);
      } else {
        setContent('*Document not found.*');
        setTitle('Error');
      }
    } catch {
      setContent('*Failed to load document.*');
      setTitle('Error');
    } finally {
      setLoading(false);
    }
  };

  // Filter docs by search query
  const filteredCategories = categories.map(cat => ({
    ...cat,
    docs: cat.docs.filter(d =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.filename.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(cat => cat.docs.length > 0);

  // Simple markdown-to-HTML renderer (no external dependency needed)
  const renderMarkdown = useCallback((md: string) => {
    let html = md
      // Code blocks (```...```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
        const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre class="code-block"><code class="language-${lang}">${escaped}</code></pre>`;
      })
      // Headers
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr />')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Tables (basic support)
      .replace(/^\|(.+)\|$/gm, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => /^[\s:-]+$/.test(c))) {
          return ''; // separator row
        }
        const isHeader = false; // simplified — first row after a heading
        const cellHtml = cells.map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cellHtml}</tr>`;
      });

    // Wrap consecutive <li> items in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Wrap consecutive <tr> items in <table>
    html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');

    // Paragraphs for remaining plain text lines
    html = html
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<')) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('\n');

    return html;
  }, []);

  return (
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 140px)' }}>
      
      {/* Left Navigation Panel */}
      <div style={{ width: '280px', flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>📚</span>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Documentation</h2>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>

          {/* Category tree */}
          <nav style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredCategories.map(cat => (
              <div key={cat.id}>
                <h3 style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '8px'
                }}>
                  {cat.label}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {cat.docs.map(doc => (
                    <button
                      key={doc.path}
                      onClick={() => loadDoc(doc.path)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: selectedDoc === doc.path ? 'rgba(107, 124, 255, 0.15)' : 'transparent',
                        color: selectedDoc === doc.path ? 'var(--text-accent)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: selectedDoc === doc.path ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedDoc !== doc.path) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedDoc !== doc.path) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span style={{ fontSize: '11px', opacity: 0.6 }}>📄</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Right Content Panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedDoc ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📚</div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              ActorFactory Documentation
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Select a document from the left to get started, or explore by category below.
            </p>

            {/* Category cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="glass-panel"
                  style={{ padding: '16px', cursor: 'pointer' }}
                  onClick={() => cat.docs[0] && loadDoc(cat.docs[0].path)}
                >
                  <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)', marginBottom: '6px' }}>
                    {cat.label}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {cat.docs.length} document{cat.docs.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>

            {/* API Docs link */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-accent)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}
              >
                📖 API Reference (Swagger) →
              </a>
            </div>
          </div>
        ) : loading ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            Loading...
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '32px', overflowX: 'auto' }} ref={contentRef}>
            {/* Back button */}
            <button
              onClick={() => { setSelectedDoc(null); setContent(''); setTitle(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-accent)',
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '16px',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              ← Back to all docs
            </button>
            
            {/* Rendered markdown */}
            <article
              className="docs-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
