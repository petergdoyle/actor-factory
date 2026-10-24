"use client";

import { useEffect, useRef, useState, Fragment } from 'react';

/**
 * Self-contained markdown renderer with Mermaid support.
 *
 * Deliberately dependency-light: we parse a practical subset of Markdown
 * ourselves (headings, lists, tables, blockquotes, fenced code, inline
 * emphasis/code/links) instead of pulling the react-markdown remark/rehype
 * chain, which keeps the client bundle small and avoids version churn.
 *
 * Mermaid is loaded lazily on the client (browser only) and rendered per
 * fenced ```mermaid block, with graceful fallback to the raw source when a
 * diagram fails to parse.
 */

type Block =
  | { kind: 'code'; lang: string; content: string }
  | { kind: 'mermaid'; content: string }
  | { kind: 'heading'; level: number; content: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; content: string }
  | { kind: 'hr' }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'p'; content: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const splitRow = (l: string) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code / mermaid
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      const lang = (fence[1] || '').toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      if (lang === 'mermaid') {
        blocks.push({ kind: 'mermaid', content: buf.join('\n') });
      } else {
        blocks.push({ kind: 'code', lang, content: buf.join('\n') });
      }
      continue;
    }

    // Blank line
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length, content: h[2].trim() });
      i++;
      continue;
    }

    // Table (header row + separator row)
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const header = splitRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', content: buf.join('\n') });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Paragraph (gather until blank line or a block starter)
    const buf: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', content: buf.join('\n') });
  }

  return blocks;
}

/** Render inline markdown (bold, italic, inline code, links) to React nodes. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Tokenize on: `code`, **bold**, *italic*/_italic_, [label](url)
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={`${keyPrefix}-t${n++}`}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${n++}`} className="md-inline-code">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${n++}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={`${keyPrefix}-i${n++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('_')) {
      nodes.push(<em key={`${keyPrefix}-u${n++}`}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith('[')) {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        nodes.push(
          <a key={`${keyPrefix}-l${n++}`} href={lm[2]} target="_blank" rel="noopener noreferrer" className="md-link">
            {lm[1]}
          </a>
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-x${n++}`}>{tok}</Fragment>);
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(<Fragment key={`${keyPrefix}-t${n++}`}>{text.slice(last)}</Fragment>);
  return nodes;
}

let mermaidInitPromise: Promise<any> | null = null;
function getMermaid(dark: boolean) {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'strict',
      });
      return mermaid;
    });
  }
  return mermaidInitPromise;
}

function MermaidDiagram({ code, id, dark }: { code: string; id: string; dark: boolean }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trimmed = code.trim();
    if (!trimmed) return;

    // Reset prior state so a stale error/SVG from an earlier (e.g. partial,
    // mid-stream) version of this diagram does not linger once the code changes.
    setError(null);

    // Mermaid source reaching this view may be a partial mid-stream fragment or
    // the final, server-repaired diagram. Use a UNIQUE render id per attempt:
    // mermaid.render injects a temp DOM node keyed by that id and, on failure,
    // can leave an orphan that poisons a later render reusing the same id. A
    // fresh id each attempt guarantees a clean render when the final text lands.
    const renderId = `mmd-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    getMermaid(dark)
      .then((mermaid) => mermaid.render(renderId, trimmed))
      .then((res: { svg: string }) => {
        if (!cancelled) { setSvg(res.svg); setError(null); }
      })
      .catch((e: any) => {
        if (!cancelled) { setSvg(''); setError(e?.message || 'Failed to render diagram'); }
      });

    return () => {
      cancelled = true;
    };
  }, [code, id, dark]);

  if (error) {
    return (
      <div className="md-mermaid-error">
        <p style={{ fontSize: '12px', color: '#e5484d', marginBottom: '6px' }}>
          Mermaid render error: {error}
        </p>
        <pre className="md-code-block"><code>{code}</code></pre>
      </div>
    );
  }

  if (!svg) {
    return <pre className="md-code-block"><code>{code}</code></pre>;
  }

  return <div className="md-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Tiny stable hash of a string, for re-keying a diagram when its content
// changes (e.g. when streamed text is replaced by the repaired final text).
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export default function MarkdownView({ source, dark = true }: { source: string; dark?: boolean }) {
  const blocks = parseBlocks(source);
  const idBase = useRef(Math.random().toString(36).slice(2));

  return (
    <div className="markdown-body">
      {blocks.map((b, idx) => {
        const key = `blk-${idx}`;
        switch (b.kind) {
          case 'mermaid':
            // Key by content hash so React remounts the diagram when its source
            // changes (partial mid-stream -> final repaired), forcing a clean
            // re-render instead of reusing a component stuck on a stale error.
            return (
              <MermaidDiagram
                key={`${key}-${hashString(b.content)}`}
                code={b.content}
                id={`${idBase.current}-${idx}`}
                dark={dark}
              />
            );
          case 'code':
            return (
              <pre key={key} className="md-code-block" data-lang={b.lang}>
                <code>{b.content}</code>
              </pre>
            );
          case 'heading': {
            const H = `h${Math.min(b.level, 6)}` as keyof React.JSX.IntrinsicElements;
            return <H key={key} className={`md-h md-h${b.level}`}>{renderInline(b.content, key)}</H>;
          }
          case 'ul':
            return (
              <ul key={key} className="md-ul">
                {b.items.map((it, j) => <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="md-ol">
                {b.items.map((it, j) => <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>)}
              </ol>
            );
          case 'quote':
            return <blockquote key={key} className="md-quote">{renderInline(b.content, key)}</blockquote>;
          case 'hr':
            return <hr key={key} className="md-hr" />;
          case 'table':
            return (
              <div key={key} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>{b.header.map((c, j) => <th key={`${key}-h${j}`}>{renderInline(c, `${key}-h${j}`)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={`${key}-r${r}`}>
                        {row.map((c, j) => <td key={`${key}-r${r}c${j}`}>{renderInline(c, `${key}-r${r}c${j}`)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'p':
          default:
            return <p key={key} className="md-p">{renderInline((b as any).content, key)}</p>;
        }
      })}
    </div>
  );
}
