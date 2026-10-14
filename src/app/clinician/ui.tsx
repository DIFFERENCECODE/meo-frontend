'use client';

/**
 * The practitioner portal's design kit, taken from the storyboard frames
 * (~/Downloads/MeO-Practitioner-Storyboard) rather than from Tailwind defaults.
 * docs/storyboard-vs-implementation.md measured the drift; these values close it:
 * the half-pixel type scale, two muted tones (#c3d0d0 for sentences, #a3b4b4 for
 * labels and metadata), 10px default radius, 16px cards, 0.82 card fill.
 *
 * Interaction follows the apple-design skill: feedback on press, not on release
 * (.mc-press), motion only where it shows what changed, and a quiet equivalent
 * under prefers-reduced-motion.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mic, SendHorizontal, X } from 'lucide-react';
import { apiFetch } from '@/app/lib/auth';
import { getPersona, setPersona, type Persona } from './persona';

export const T = {
  lime: '#a4d65e',
  limeHover: '#c5e98f',
  ink: '#1a3a3a',
  text: '#ffffff',
  muted: '#c3d0d0',
  dim: '#a3b4b4',
  orange: '#f97316',
  amber: '#eab839',
  red: '#ef4444',
  blue: '#7cc5d8',
  card: 'rgba(40,70,70,0.82)',
  cardBorder: 'rgba(255,255,255,0.12)',
  row: 'rgba(255,255,255,0.03)',
  rowBorder: 'rgba(255,255,255,0.08)',
  chip: 'rgba(255,255,255,0.07)',
  chipBorder: 'rgba(255,255,255,0.14)',
};

/** One stylesheet for the things inline styles cannot express. */
export function PortalStyles() {
  return (
    <style>{`
      .mc-press { transition: transform 100ms ease-out, background-color 120ms ease-out, border-color 120ms ease-out; }
      .mc-press:active { transform: scale(0.97); }
      .mc-row { transition: background-color 120ms ease-out, border-color 120ms ease-out; }
      .mc-row:hover { background: rgba(255,255,255,0.055) !important; }
      .mc-row:active { background: rgba(255,255,255,0.075) !important; }
      .mc-portal a:hover { color: inherit; }
      .mc-portal :focus-visible { outline: 2px solid ${T.lime}; outline-offset: 2px; border-radius: 10px; }
      .mc-sheet { transform-origin: bottom center; animation: mc-rise 220ms cubic-bezier(0.2, 0.9, 0.3, 1); }
      @keyframes mc-rise { from { opacity: 0; transform: translateY(8px) scale(0.985); } to { opacity: 1; transform: none; } }
      .mc-md p, .mc-md li, .mc-md td, .mc-md th, .mc-md blockquote { font-size: inherit; line-height: inherit; color: inherit; }
      .mc-md h1, .mc-md h2, .mc-md h3, .mc-md h4 { font-size: 13.5px; font-weight: 700; color: #ffffff; margin: 8px 0 4px; }
      .mc-md blockquote { margin: 0; padding-left: 10px; border-left: 2px solid rgba(255,255,255,0.14); }
      .mc-md p { margin: 0 0 6px; } .mc-md p:last-child { margin-bottom: 0; }
      .mc-md ul { margin: 0; padding-left: 18px; } .mc-md li { margin: 2px 0; }
      .mc-md strong { color: #ffffff; font-weight: 700; }
      .mc-md table { border-collapse: collapse; margin-top: 4px; }
      .mc-md td, .mc-md th { padding: 3px 12px 3px 0; text-align: left; font-weight: 500; }
      @media (prefers-reduced-motion: reduce) {
        .mc-press, .mc-row { transition: none; }
        .mc-press:active { transform: none; }
        .mc-sheet { animation: mc-fade 150ms ease; }
        @keyframes mc-fade { from { opacity: 0; } to { opacity: 1; } }
      }
      @media (prefers-reduced-transparency: reduce) {
        .mc-glass { backdrop-filter: none !important; background: #1d4040 !important; }
      }
    `}</style>
  );
}

export function Label({ children, color = T.dim, style }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, ...style }}>
      {children}
    </div>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <section
      style={{
        background: T.card, border: `1px solid ${accent ?? T.cardBorder}`, borderRadius: 16,
        padding: '16px 20px', ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Pill({ children, color, solid, size = 12, style }: {
  children: React.ReactNode; color?: string; solid?: boolean; size?: number; style?: React.CSSProperties;
}) {
  const c = color ?? T.muted;
  return (
    <span
      style={{
        display: 'inline-block', fontSize: size, fontWeight: color ? 700 : 600, whiteSpace: 'nowrap',
        color: solid ? T.ink : c,
        background: solid ? c : color ? 'rgba(255,255,255,0.06)' : T.chip,
        border: `1px solid ${solid ? c : color ?? T.chipBorder}`,
        borderRadius: 999, padding: size <= 11 ? '3px 10px' : '5px 12px', ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Btn({ children, primary, onClick, href, disabled, type, style }: {
  children: React.ReactNode; primary?: boolean; onClick?: () => void; href?: string;
  disabled?: boolean; type?: 'button' | 'submit'; style?: React.CSSProperties;
}) {
  const s: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600,
    fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', textDecoration: 'none',
    borderRadius: 12, padding: '11px 18px', opacity: disabled ? 0.5 : 1,
    color: primary ? T.ink : T.text,
    background: primary ? T.lime : T.chip,
    border: `1px solid ${primary ? T.lime : T.chipBorder}`,
    ...style,
  };
  if (href) return <Link href={href} className="mc-press" style={s}>{children}</Link>;
  return <button type={type ?? 'button'} className="mc-press" onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}

export function PageHeader({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 28px 0' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>{right}</div>}
    </header>
  );
}

/** A screen: header, a scrolling body, and (optionally) the ask bar pinned below. */
export function Screen({ header, children, ask }: { header: React.ReactNode; children: React.ReactNode; ask?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 28px 20px' }}>{children}</div>
      {ask}
    </div>
  );
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="mc-md" style={{ fontSize: 13.5, lineHeight: 1.55, color: T.muted }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

/** GET with the practitioner's token. `reload` refetches after a write. */
export function useAuthed<D>(url: string | null) {
  const [data, setData] = useState<D | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!url) return;
    let live = true;
    setLoading(true);
    setError(null);
    apiFetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'This patient is not in your caseload.' : `Couldn't load (${r.status}).`);
        return r.json();
      })
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [url, n]);

  return { data, loading, error, reload: useCallback(() => setN((x) => x + 1), []) };
}

// ─── Lens ─────────────────────────────────────────────────────────────────────

const LENS_EVENT = 'meo:persona';

/** The current lens, kept in step across the sidebar and every screen. */
export function usePersona(): [Persona, (p: Persona) => void] {
  const [p, setP] = useState<Persona>('physician');
  useEffect(() => {
    setP(getPersona());
    const on = () => setP(getPersona());
    window.addEventListener(LENS_EVENT, on);
    return () => window.removeEventListener(LENS_EVENT, on);
  }, []);
  const set = useCallback((next: Persona) => {
    setPersona(next);
    window.dispatchEvent(new Event(LENS_EVENT));
  }, []);
  return [p, set];
}

// ─── Patient screens ──────────────────────────────────────────────────────────

const PATIENT_TABS = [
  { seg: '', label: 'Brief' },
  { seg: '/review', label: 'Needs review' },
  { seg: '/between', label: 'Between visits' },
  { seg: '/after', label: 'After the session' },
];

/** The four views of one patient, in the order a consult uses them. */
export function PatientTabs({ id }: { id: string }) {
  const path = usePathname();
  const base = `/clinician/patients/${id}`;
  return (
    <nav aria-label="Patient views" style={{ display: 'flex', gap: 6 }}>
      {PATIENT_TABS.map((t) => {
        const href = base + t.seg;
        const active = path === href;
        return (
          <Link
            key={t.seg}
            href={href}
            className="mc-press"
            aria-current={active ? 'page' : undefined}
            style={{
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none',
              borderRadius: 999, padding: '5px 12px',
              color: active ? T.ink : T.muted,
              background: active ? T.lime : T.chip,
              border: `1px solid ${active ? T.lime : T.chipBorder}`,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface PatientSummary { session_id: string; patient_name: string; metabolic_goals?: string[] }

export function usePatient(id: string) {
  return useAuthed<PatientSummary>(id ? `/api/clinician?session_id=${encodeURIComponent(id)}` : null);
}

export function firstName(full?: string | null) {
  return (full || '').trim().split(/\s+/)[0] || 'them';
}

// ─── Ask bar ──────────────────────────────────────────────────────────────────

interface Turn { q: string; a: string | null }

/**
 * The storyboard's ask bar, pinned to the bottom of a patient screen. Answers
 * rise in a sheet anchored to the bar they came from, and close back into it.
 * Translucent so the screen stays visible behind the conversation.
 */
export function AskBar({ patientId, placeholder }: { patientId: string; placeholder: string }) {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [open, setOpen] = useState(false);
  const busy = turns.length > 0 && turns[turns.length - 1].a === null;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [turns]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput('');
    setOpen(true);
    setTurns((t) => [...t, { q, a: null }]);
    let a: string;
    try {
      const res = await apiFetch(`/api/clinician/${patientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const d = await res.json().catch(() => ({}));
      a = res.ok ? (d.response || 'No answer came back.') : `Couldn't answer (${res.status}). Try again.`;
    } catch {
      a = "Couldn't reach MeO. Check your connection and try again.";
    }
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)));
  };

  return (
    <div style={{ position: 'relative', padding: '12px 28px 20px' }}>
      {open && turns.length > 0 && (
        <div
          className="mc-sheet mc-glass"
          role="log"
          aria-live="polite"
          style={{
            position: 'absolute', left: 28, right: 28, bottom: 'calc(100% - 4px)', maxHeight: '52vh', overflowY: 'auto',
            background: 'rgba(22,48,48,0.86)', backdropFilter: 'blur(18px) saturate(140%)',
            border: `1px solid ${T.chipBorder}`, borderRadius: 16, padding: '14px 18px',
            boxShadow: '0 -18px 40px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Label>Asked about this patient</Label>
            <div style={{ flex: 1 }} />
            <button aria-label="Close answers" onClick={() => setOpen(false)} className="mc-press"
              style={{ background: 'transparent', border: 0, color: T.dim, cursor: 'pointer', padding: 4 }}>
              <X size={16} />
            </button>
          </div>
          {turns.map((t, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i ? `1px solid ${T.rowBorder}` : undefined }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>{t.q}</div>
              {t.a === null ? <div style={{ fontSize: 13, color: T.dim }}>Reading the record…</div> : <Markdown text={t.a} />}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.26)',
          border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14, padding: '11px 11px 11px 16px',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => turns.length && setOpen(true)}
          placeholder={placeholder}
          aria-label="Ask MeO about this patient"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: T.text, fontSize: 13.5, fontFamily: 'inherit' }}
        />
        <button type="button" aria-label="Voice input is not available in the portal yet" disabled
          style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
          <Mic size={15} color={T.muted} />
        </button>
        <button type="submit" aria-label="Send" className="mc-press" disabled={busy || !input.trim()}
          style={{ width: 34, height: 34, borderRadius: 10, background: T.lime, border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: busy || !input.trim() ? 0.6 : 1 }}>
          <SendHorizontal size={15} color={T.ink} />
        </button>
      </form>
    </div>
  );
}

/** Loading and error states that say what is happening, in place. */
export function State({ loading, error, children }: { loading?: boolean; error?: string | null; children: React.ReactNode }) {
  if (error) return <Card><div style={{ fontSize: 13.5, color: T.muted }}>{error}</div></Card>;
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: 74, borderRadius: 16, background: 'rgba(40,70,70,0.5)', border: `1px solid ${T.rowBorder}` }} />
        ))}
      </div>
    );
  }
  return <>{children}</>;
}
