'use client';

import React, { useId, useState } from 'react';

/**
 * A small "i" beside a term that explains it in one line, on hover, focus or
 * tap. For words a patient meets on screen and might not know (Biological Age
 * Score, "5 of 8", "provisional"). Plain language, never more than a sentence
 * or two; the full story lives in the Library and the assistant.
 */
export function InfoTip({ text, label = 'What does this mean?' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className="meo-press"
        style={{
          width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(var(--mc-fg-rgb),0.35)',
          background: 'transparent', color: 'var(--mc-text)', fontSize: 11, fontWeight: 700, lineHeight: '16px',
          padding: 0, cursor: 'help', textTransform: 'none', letterSpacing: 0,
        }}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="meo-fade"
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 40,
            width: 'max-content', maxWidth: 260, padding: '9px 12px', borderRadius: 10,
            background: 'var(--mc-sheet, rgba(22,48,48,0.97))', border: '1px solid rgba(var(--mc-fg-rgb),0.16)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.3)', color: 'var(--mc-text)',
            fontSize: 14, fontWeight: 500, lineHeight: 1.45, letterSpacing: 0, textTransform: 'none', textAlign: 'left',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export default InfoTip;
