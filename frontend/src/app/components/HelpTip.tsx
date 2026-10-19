"use client";

import { useState } from 'react';

/**
 * A small "?" affordance that reveals a short explanation on hover/focus.
 * Use inline next to a control label for contextual, non-intrusive help.
 *
 *   <label>Specialization <HelpTip text="Domain-specific expertise layered on the persona." /></label>
 */
export default function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: '4px' }}>
      <span
        role="button"
        tabIndex={0}
        aria-label="Help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        ?
      </span>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '140%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            width: 'max-content',
            maxWidth: '260px',
            padding: '8px 10px',
            borderRadius: '6px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 400,
            lineHeight: 1.45,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
