'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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
  'no trend':   { label: 'no trend',    color: '#a3b4b4' },
  'not started':{ label: 'not started', color: '#ef4444' },
};

export function PanelTiles({ rows }: { rows: PanelRow[] }) {
  const needReview = rows.filter((r) => r.urgency_level === 'high').length;
  const stalled = rows.filter((r) => (r.readings_count ?? 0) === 1).length;
  const notStarted = rows.filter((r) => (r.readings_count ?? 0) === 0).length;
  const onTrack = rows.filter((r) => r.urgency_level === 'low' && (r.readings_count ?? 0) > 1).length;
  const planBehind = rows.filter((r) => (r.plan?.off_track ?? 0) > 0).length;

  const tiles = [
    { label: 'Need review', n: needReview, sub: 'against your thresholds', color: '#f97316' },
    { label: 'Stalled', n: stalled, sub: 'no second reading', color: '#eab839' },
    { label: 'Not syncing', n: notStarted, sub: 'never started a test', color: '#ef4444' },
    { label: 'On track', n: onTrack, sub: 'trending to target', color: '#a4d65e' },
    { label: 'Plan behind', n: planBehind, sub: 'a line well short, 14 days', color: '#f97316' },
  ];

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            background: 'rgba(40,70,70,0.82)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, flex: 1, padding: '15px 20px',
          }}
        >
          <div className="t-label" style={{ color: '#a3b4b4' }}>{t.label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 2, color: t.color }}>
            {t.n}
          </div>
          <div style={{ fontSize: 11.5, color: '#a3b4b4' }}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function PanelRows({ rows }: { rows: PanelRow[] }) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((r) => {
        const trend = TREND[r.trend ?? 'no trend'] ?? TREND['no trend'];
        const flags = r.unfollowed_commitments || 0;
        const initials = (r.name || r.session_id).replace(/[^A-Za-z ]/g, '').split(' ')
          .filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';
        const attention = r.urgency_level !== 'low';
        return (
          <button
            key={r.session_id}
            onClick={() => router.push(`/clinician/patients?selected=${r.session_id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
              padding: '12px 16px', borderRadius: 10, color: '#ffffff', cursor: 'pointer',
              fontFamily: 'inherit',
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
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>{r.name || 'Unknown'}</div>
              <div style={{ fontSize: 11, color: '#a3b4b4' }}>
                {r.readings_count ?? 0} reading{(r.readings_count ?? 0) === 1 ? '' : 's'} · no lifestyle
              </div>
            </div>

            <div style={{ width: 160, fontSize: 12.5, color: '#c3d0d0' }}>
              {r.headline ?? '—'}
              {(r.needs_review?.length ?? 0) > 0 && (
                <div
                  title={r.needs_review!.join('\n')}
                  style={{ fontSize: 11, color: '#eab839', marginTop: 2 }}
                >
                  {r.needs_review!.length} value{r.needs_review!.length === 1 ? '' : 's'} to confirm
                </div>
              )}
            </div>

            <div style={{ width: 100, flex: 'none' }}>
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

            <div style={{ width: 118, flex: 'none' }}>
              {r.plan ? (
                <span
                  title={`${r.plan.lines} plan line${r.plan.lines === 1 ? '' : 's'}; ${r.plan.judged} with enough data to judge`}
                  style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    color: r.plan.off_track ? '#f97316' : r.plan.judged ? '#a4d65e' : '#a3b4b4',
                    border: `1px solid ${r.plan.off_track ? '#f97316' : r.plan.judged ? '#a4d65e' : 'rgba(255,255,255,0.2)'}`,
                    borderRadius: 999, padding: '3px 10px', background: 'rgba(255,255,255,0.06)',
                  }}
                >
                  {r.plan.judged
                    ? `Plan ${r.plan.on_track}/${r.plan.judged} on track`
                    : 'Plan: no data yet'}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#a3b4b4' }}>No plan yet</span>
              )}
            </div>

            <div style={{ width: 62, textAlign: 'center', fontSize: 13, fontWeight: 800, color: flags ? '#f97316' : '#a3b4b4' }}>
              {flags} flag{flags === 1 ? '' : 's'}
            </div>

            <div style={{ flex: 1, fontSize: 12, color: '#c3d0d0', textAlign: 'right' }}>{r.urgency_reason}</div>

            <ChevronRight className="h-4 w-4" style={{ color: '#a3b4b4', flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}
