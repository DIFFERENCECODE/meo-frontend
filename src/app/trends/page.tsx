'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { getValidIdToken } from '@/app/lib/auth';
import { TrendChart, TrendPoint } from '@/components/analysis/TrendChart';
import { RecordResponse, LABELS } from '@/components/record/RecordHome';

/**
 * Trends — frame 05.
 *
 * One metric at a time, picked from a row of tabs, with the right column
 * splitting sources: what came from the meter and what came from the phone.
 * The split is the point. A trend that silently blends a device reading with a
 * typed one reads as a single quality of evidence, and it isn't.
 *
 * The frame also overlays sleep on the same time axis as the lipid trend. We
 * cannot draw that yet — sleep lives on the phone and the web has no sight of
 * it — so the phone column says so rather than showing an empty chart.
 */

/** Ordered as the frame does: the composite first, then its inputs. */
const METRICS = ['BAS', 'Triglyceride', 'HDL', 'LDL', 'Cholesterol', 'Glucose', 'Waist', 'Weight'];

const TAB_LABEL: Record<string, string> = {
  BAS: 'Biological Age Score',
  Triglyceride: 'Triglycerides',
  Cholesterol: 'Total cholesterol',
  Glucose: 'Glucose',
};

/** HDL is the one marker here where up is the good direction. */
const LOWER_IS_BETTER: Record<string, boolean> = { HDL: false };

export default function TrendsPage() {
  const { colors } = useTheme();
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [metric, setMetric] = useState('BAS');

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setState('loading');
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return setState('error');
        const res = await fetch('/api/readings', { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 404) return setState('empty');
        if (!res.ok) return setState('error');
        const data: RecordResponse = await res.json();
        setRecord(data);
        setState(data.reading_count === 0 ? 'empty' : 'ready');
      } catch {
        setState('error');
      }
    })();
  }, [attempt]);

  const available = useMemo(
    () => METRICS.filter((m) => (record?.series?.[m]?.length ?? 0) > 0),
    [record],
  );

  useEffect(() => {
    if (available.length && !available.includes(metric)) setMetric(available[0]);
  }, [available, metric]);

  const points: TrendPoint[] = record?.series?.[metric] ?? [];
  const meta = LABELS[metric] ?? { label: TAB_LABEL[metric] ?? metric, unit: '' };
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  // Values arrive at full float precision ("28.903378058211047"); show what a
  // person reads, never more digits than the measurement can carry.
  const fmt = (v: number) => String(Number(v.toFixed(Math.abs(v) >= 100 ? 0 : 2)));

  return (
    <AppShell
      askPlaceholder="Ask MeO why a point moved…"
      askContext={JSON.stringify({ metric: meta.label, unit: meta.unit, points })}
      rightPanelLabel="Your measurements"
      rightPanel={state === 'ready' && record ? <TrendsRail record={record} metric={metric} onPick={setMetric} /> : undefined}
    >
      <div className="flex flex-col h-full min-w-0">
        <ScreenHeader
          title="Trends"
          subtitle="Every point compared with your own last one — not a population range"
          right={record ? <Chip>{record.panel_count} panels</Chip> : undefined}
        />

        <ScreenBody>
          {state === 'loading' && <p style={{ fontSize: 13, color: colors.muted }}>Loading your trends…</p>}
          {state === 'error' && <div role="alert">
            <p style={{ color: colors.muted }}>Your trends couldn&apos;t be loaded.</p>
            <button onClick={() => setAttempt((value) => value + 1)} className="mt-3 min-h-11 rounded-xl px-5 font-semibold" style={{ background: colors.primary, color: colors.primaryForeground }}>Try again</button>
          </div>}
          {state === 'empty' && (
            <section className="max-w-xl rounded-2xl p-6" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Your first reading starts here</h2>
              <p className="mt-2 text-sm" style={{ color: colors.muted }}>Add a guided test to start your record. Come back after your next reading to compare results.</p>
              <Link href="/test" className="mt-5 inline-flex min-h-11 items-center rounded-xl px-5 font-semibold" style={{ background: colors.primary, color: colors.primaryForeground }}>Start a guided test</Link>
            </section>
          )}

          {state === 'ready' && record && (
            <>
              {/* Metric tabs. */}
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {available.map((m) => {
                  const on = m === metric;
                  return (
                    <button
                      key={m}
                      className="meo-press min-h-9"
                      onClick={() => setMetric(m)}
                      aria-pressed={on}
                      style={{
                        fontSize: 12, fontWeight: on ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
                        borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
                        color: on ? 'var(--mc-on-accent)' : colors.muted,
                        background: on ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),0.07)',
                        border: `1px solid ${on ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),0.14)'}`,
                      }}
                    >
                      {TAB_LABEL[m] ?? LABELS[m]?.label ?? m}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col" style={{ gap: 18, minHeight: 0 }}>
                <section
                  className="w-full flex-1 min-w-0"
                  style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '20px 22px' }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>{meta.label}</div>
                  <div style={{ fontSize: 12.5, color: colors.mutedDim, marginTop: 2 }}>
                    {points.length} reading{points.length === 1 ? '' : 's'} · from your record
                  </div>

                  {first != null && last != null && points.length > 1 && (
                    <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.025em', color: colors.foreground, marginTop: 10 }}>
                      {fmt(first)} <span style={{ color: colors.mutedDim }}>→</span> {fmt(last)}
                      <span style={{ fontSize: 12.5, fontWeight: 400, color: colors.mutedDim }}> {meta.unit}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 14 }}>
                    <TrendChart
                      points={points}
                      unit={meta.unit}
                      height={260}
                      lowerIsBetter={LOWER_IS_BETTER[metric] ?? true}
                    />
                  </div>
                </section>


              </div>
            </>
          )}
        </ScreenBody>
      </div>
    </AppShell>
  );
}


/** A plain line in its own range: the shape of a series, not a chart. */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <svg width={80} height={26} aria-hidden />;
  const w = 80, h = 26, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - lo) / span) * (h - 6)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The frame's right rail: every measurement from the meter with its own
 * sparkline, then what the phone sends. Picking a row charts it.
 */
function TrendsRail({ record, metric, onPick }: { record: RecordResponse; metric: string; onPick: (m: string) => void }) {
  const rows = METRICS.filter((m) => m !== 'BAS' && (record.series?.[m]?.length ?? 0) > 0);
  const label = { fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'var(--mc-text)' };
  return (
    <div style={{ padding: '20px 20px 24px' }}>
      <div style={label}>From your meter</div>
      {rows.map((m) => {
        const sm = LABELS[m] ?? { label: m, unit: '' };
        const pts = record.series[m];
        const v = pts[pts.length - 1]?.value;
        return (
          <button
            key={m}
            onClick={() => onPick(m)}
            aria-pressed={m === metric}
            className="meo-row w-full flex items-center text-left"
            style={{ gap: 12, padding: '10px 4px', background: 'none', border: 'none', borderBottom: '1px solid rgba(var(--mc-fg-rgb),0.08)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 700, color: m === metric ? 'var(--mc-accent)' : 'var(--mc-text)' }}>{sm.label}</div>
              <div style={{ fontSize: 11, color: 'var(--mc-text)' }}>{pts.length} readings</div>
            </div>
            <Spark values={pts.map((p) => p.value)} color={(LOWER_IS_BETTER[m] ?? true) ? 'var(--mc-accent)' : 'var(--mc-blue)'} />
            <div style={{ width: 58, textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--mc-text)' }}>{v != null ? Number(v.toFixed(2)) : '—'}</div>
              <div style={{ fontSize: 10.5, color: 'var(--mc-text)' }}>{sm.unit}</div>
            </div>
          </button>
        );
      })}
      <div className="flex items-center justify-between" style={{ marginTop: 22 }}>
        <div style={label}>From your phone</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mc-blue)', background: 'rgba(124,197,216,0.12)', border: '1px solid rgba(124,197,216,0.3)', borderRadius: 999, padding: '3px 9px' }}>
          from the app
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--mc-text)', lineHeight: 1.55, marginTop: 10 }}>
        Sleep, steps, resting heart rate and meal timing are charted in the MeO app on your phone.
        A plan line that checks them shows its count on <a href="/plan" style={{ color: 'var(--mc-accent)' }}>My plan</a>.
      </p>
    </div>
  );
}
