'use client';

import React, { useEffect, useState } from 'react';
import { Persona, PERSONAS, getPersona, setPersona } from './persona';

/**
 * The lens control, shown on the panel and on a patient.
 *
 * This is the practitioner-facing half of "one record, three lenses". The
 * selector exists on the panel rather than buried in settings because the
 * storyboard's claim is that the SAME data reads three ways — and that claim is
 * only legible if switching is one click away from the patient you are reading.
 *
 * `onChange` lets a page refetch; the value is also persisted so the next screen
 * opens in the lens you were already using.
 */
export function LensSwitcher({
  onChange,
  compact = false,
}: {
  onChange?: (p: Persona) => void;
  compact?: boolean;
}) {
  const [persona, setLocal] = useState<Persona>('physician');

  // Read after mount: localStorage is not available during SSR, and reading it
  // in render would make the server and client markup disagree.
  useEffect(() => setLocal(getPersona()), []);

  const pick = (p: Persona) => {
    setLocal(p);
    setPersona(p);
    onChange?.(p);
  };

  return (
    <div>
      {!compact && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'var(--mc-text)',
            marginBottom: 8,
          }}
        >
          Your view
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PERSONAS.map((p) => {
          const active = p.id === persona;
          return (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              title={p.blurb}
              aria-pressed={active}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                color: active ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),.65)',
                background: active ? 'rgba(var(--mc-accent-rgb),.12)' : 'rgba(var(--mc-fg-rgb),.06)',
                border: `1px solid ${active ? 'rgba(var(--mc-accent-rgb),.45)' : 'rgba(var(--mc-fg-rgb),.14)'}`,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {!compact && (
        <div style={{ fontSize: 11.5, color: 'var(--mc-text)', marginTop: 8, lineHeight: 1.5 }}>
          Changes what leads and how it reads. Never changes a value, a threshold,
          or whether a flag is raised.
        </div>
      )}
    </div>
  );
}

export default LensSwitcher;
