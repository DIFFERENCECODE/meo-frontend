'use client';

/**
 * "Your fortnight": the panel opens on the work done, not the tools.
 *
 * The outcome a practitioner pays for is the follow-up handled and the right
 * patients brought to them, so the panel leads with that in one sentence and
 * three counts. Every number is counted from the caseload rows (plan checks,
 * the drift rule, the bloods rule); nothing is estimated, and time saved is
 * not claimed as a number because MeO cannot measure it.
 */

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { PanelRow } from './PanelTriage';
import { T } from './ui';

function Stat({ n, of, label, sub }: { n: number | string; of?: number; label: string; sub: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
        {of != null && <span style={{ fontSize: 14, fontWeight: 600 }}>of {of}</span>}
      </div>
      <div style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export function Fortnight({ rows }: { rows: PanelRow[] }) {
  if (!rows.length) return null;
  const total = rows.length;
  const needYou = rows.filter((r) => r.urgency_level !== 'low');
  const logging = rows.filter((r) => (r.drift?.active_7d ?? 0) > 0).length;
  const quiet = rows.filter((r) => r.drift?.status === 'quiet' || r.drift?.status === 'not_started');
  const planned = rows.filter((r) => r.plan).length;

  return (
    <section
      aria-label="Your fortnight"
      style={{
        background: 'rgba(var(--mc-accent-rgb),0.08)', border: '1px solid rgba(var(--mc-accent-rgb),0.35)',
        borderRadius: 16, padding: '18px 22px', marginBottom: 14,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.35 }}>
        Over the last fortnight MeO checked the plans of {planned === total ? `your ${total} patients` : `${planned} of your ${total} patients`} against what they logged.{' '}
        <span style={{ color: T.lime }}>{needYou.length === 0 ? 'Nobody needs you right now.' : `${needYou.length} need${needYou.length === 1 ? 's' : ''} you.`}</span>
      </h2>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginTop: 16 }}>
        <Stat n={total} label="Briefs ready" sub="each opens with your plan and how it went" />
        <Stat n={logging} of={total} label="Still logging" sub={quiet.length ? `in the last 7 days · ${quiet.length} gone quiet` : 'in the last 7 days'} />
        <Stat n={needYou.length} of={total} label="Need you" sub="for a stated reason, nothing else interrupts" />
      </div>

      {needYou.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
          {needYou.map((r) => (
            <Link
              key={r.session_id}
              href={`/clinician/patients/${r.session_id}`}
              className="mc-row"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: T.text,
                padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--mc-fg-rgb),0.04)', border: `1px solid ${T.rowBorder}`,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 140 }}>{r.name}</span>
              <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{r.urgency_reason}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.lime, whiteSpace: 'nowrap' }}>Open brief</span>
              <ChevronRight size={15} aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
