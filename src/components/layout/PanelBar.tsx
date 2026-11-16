'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, X } from 'lucide-react';

/**
 * A screen's side detail ("This reading", "Your measurements") as a bar above
 * the message bar, instead of a third column that is always open.
 *
 * Tapping the bar raises the detail in a sheet anchored to it and closes back
 * into it (apple-design: spatial consistency, the panel comes from what was
 * pressed). Escape or the close button dismisses it; the screen behind keeps
 * its full width the rest of the time.
 */
export function PanelBar({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    sheet.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      {open && (
        <div
          ref={sheet}
          tabIndex={-1}
          role="dialog"
          aria-label={label}
          className="meo-sheet"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', zIndex: 30,
            maxHeight: '62vh', overflowY: 'auto', outline: 'none',
            background: 'var(--mc-sheet, rgba(22,48,48,0.96))',
            backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: '1px solid rgba(var(--mc-fg-rgb),0.14)', borderRadius: 16,
            boxShadow: '0 -18px 40px rgba(0,0,0,0.25)',
          }}
        >
          {/* Each panel carries its own heading, so the sheet adds only a close button. */}
          <div style={{ position: 'sticky', top: 0, height: 0, display: 'flex', justifyContent: 'flex-end', zIndex: 1 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={`Close ${label}`}
              className="meo-press"
              style={{ background: 'transparent', border: 0, padding: 6, margin: '10px 12px 0 0', height: 28, cursor: 'pointer', color: 'var(--mc-text)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
      <button
        type="button"
        data-tour="panel-bar"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="meo-press flex items-center"
        style={{
          gap: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '7px 15px',
          color: open ? 'var(--mc-on-accent)' : 'var(--mc-text)',
          background: open ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),0.07)',
          border: `1px solid ${open ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),0.14)'}`,
        }}
      >
        {label}
        <ChevronUp className="h-4 w-4" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease-out' }} />
      </button>
    </div>
  );
}

export default PanelBar;
