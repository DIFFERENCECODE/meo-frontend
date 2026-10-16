'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Panel triage — frame p00.
 *
 * The frame's own caption is the argument: "Sorted by what changed since you
 * last looked · Not alphabetical". A caseload in alphabetical order makes the
 * practitioner do the triage, which is the work this screen claims to take off
 * them. So the ordering is the feature, and it is labelled on the screen.
 *
 * A patient we could not enrich shows "—" and "no trend" rather than borrowing
 * another patient's numbers. The frame does exactly this for its two clients
 * with too little data, and it is the honest shape: a thin row is a patient we
 * cannot see, not a patient who is fine.
 */
export interface PanelRow {
  session_id: string;
  name: string;
  urgency_level: 'high' | 'medium' | 'low';
  urgency_reason: string;
  signal_tags?: string[];
  days_since_last_message: number | null;
  unfollowed_commitments: number;
  readings_count?: number;
  headline?: string | null;
  trend?: string;
  last_reading?: string | null;
  /**
   * Values on the latest panel that are kept but not believed (an HDL no home
   * strip should read, a waist typed in inches). They are excluded from the
   * headline and the flags, so the row says so instead of looking calmer than
   * the data is.
   */
  needs_review?: string[];
  /** The practitioner's own plan, counted by the Truth Engine. Null: no plan. */
  plan?: { lines: number; on_track: number; off_track: number; judged: number } | null;
}

const TREND: Record<string, { label: string; color: string }> = {
  improving:    { label: 'improving',   color: '#a4d65e' },
  steady:       { label: 'steady',      color: '#a4d65e' },
  worsening:    { label: 'worsening',   color: '#f97316' },
  slow:         { label: 'slow',        color: '#eab839' },
  'no trend':   { label: 'no trend',    color: '#ffffff' },
  'not started':{ label: 'not started', color: '#ef4444' },
};

export function PanelTiles({ rows, consults }: { rows: PanelRow[]; consults: number }) {
  const needReview = rows.filter((r) => r.urgency_level !== 'low').length;
  const stalled = rows.filter((r) => (r.readings_count ?? 0) === 1).length;
  const notStarted = rows.filter((r) => (r.readings_count ?? 0) === 0).length;
  const onTrack = rows.filter((r) => r.urgency_level === 'low' && (r.readings_count ?? 0) > 1).length;

  const tiles = [
    { label: 'Need review', n: needReview, sub: 'against what MeO flags on', color: '#f97316' },
    { label: 'Stalled', n: stalled, sub: 'no second reading', color: '#eab839' },
    { label: 'Not syncing', n: notStarted, sub: 'never started a test', color: '#ef4444' },
    { label: 'On track', n: onTrack, sub: 'trending to target', color: '#a4d65e' },
    { label: 'Consults this week', n: consults, sub: 'from your bookings', color: '#ffffff' },
  ];

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            background: 'rgba(40,70,70,0.82)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, flex: 1, padding: '15px 20px', minWidth: 0,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ffffff' }}>{t.label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 2, color: t.color }}>
            {t.n}
          </div>
          <div style={{ fontSize: 11.5, color: '#ffffff' }}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** The row's right-hand sentence: why it is where it is, then how the plan is going. */
function reasonLine(r: PanelRow): string {
  const parts = [r.urgency_reason].filter(Boolean);
  if (r.plan) {
    parts.push(r.plan.judged ? `plan ${r.plan.on_track}/${r.plan.judged} on track` : 'plan set, nothing recorded yet');
  }
  return parts.join(' · ');
}

export function PanelRows({ rows, to = '' }: { rows: PanelRow[]; to?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((r) => {
        const trend = TREND[r.trend ?? 'no trend'] ?? TREND['no trend'];
        const flags = r.unfollowed_commitments || 0;
        const initials = (r.name || r.session_id).replace(/[^A-Za-z ]/g, '').split(' ')
          .filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';
        const attention = r.urgency_level !== 'low';
        return (
          <Link
            key={r.session_id}
            href={`/clinician/patients/${r.session_id}${to}`}
            className="mc-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none',
              padding: '12px 16px', borderRadius: 12, color: '#ffffff',
              background: attention ? 'rgba(164,214,94,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${attention ? 'rgba(164,214,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <div
              style={{
                width: 34, height: 34, flex: 'none', borderRadius: '50%',
                background: 'rgba(164,214,94,0.2)', color: '#a4d65e', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {initials}
            </div>

            <div style={{ width: 148, flex: 'none' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name || 'Unknown'}</div>
              <div style={{ fontSize: 11, color: '#ffffff' }}>
                {r.readings_count ?? 0} reading{(r.readings_count ?? 0) === 1 ? '' : 's'} · {r.plan ? 'plan tracked' : 'no plan yet'}
              </div>
            </div>

            <div style={{ width: 140, flex: 'none', fontSize: 12.5, color: '#ffffff' }}>
              {r.headline ?? '—'}
              {(r.needs_review?.length ?? 0) > 0 && (
                <div title={r.needs_review!.join('\n')} style={{ fontSize: 11, color: '#eab839', marginTop: 2 }}>
                  {r.needs_review!.length} value{r.needs_review!.length === 1 ? '' : 's'} to confirm
                </div>
              )}
            </div>

            <div style={{ width: 92, flex: 'none' }}>
              <span
                style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 700, color: trend.color,
                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${trend.color}`,
                  borderRadius: 999, padding: '3px 10px',
                }}
              >
                {trend.label}
              </span>
            </div>

            <div title="Commitments they made with the coach that MeO has not followed up yet"
              style={{ width: 62, flex: 'none', textAlign: 'center', fontSize: 13, fontWeight: 800, color: flags ? '#f97316' : '#ffffff' }}>
              {flags} open
            </div>

            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#ffffff', textAlign: 'right' }}>{reasonLine(r)}</div>

            <ChevronRight className="h-4 w-4" style={{ color: '#ffffff', flexShrink: 0 }} />
          </Link>
        );
      })}
    </div>
  );
}
