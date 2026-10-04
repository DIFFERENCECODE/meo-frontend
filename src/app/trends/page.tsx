'use client';

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

  useEffect(() => {
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
  }, []);

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

  return (
    <AppShell askPlaceholder="Ask MeO why a point moved…">
      <div className="flex flex-col h-full min-w-0">
        <ScreenHeader
          title="Trends"
          subtitle="Every point compared with your own last one — not a population range"
          right={record ? <Chip>{record.panel_count} panels</Chip> : undefined}
        />

        <ScreenBody>
          {state === 'loading' && <p style={{ fontSize: 13, color: colors.muted }}>Loading your trends…</p>}
          {state === 'error' && <p style={{ fontSize: 13, color: colors.muted }}>Couldn&apos;t load your trends.</p>}
          {state === 'empty' && (
            <p style={{ fontSize: 13, color: colors.muted }}>
              Nothing to chart yet. Your first guided test starts the line.
            </p>
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
                      onClick={() => setMetric(m)}
                      aria-pressed={on}
                      style={{
                        fontSize: 12, fontWeight: on ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
                        borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
                        color: on ? colors.primary : colors.muted,
                        background: on ? 'rgba(164,214,94,0.12)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${on ? 'rgba(164,214,94,0.3)' : 'rgba(255,255,255,0.14)'}`,
                      }}
                    >
                      {TAB_LABEL[m] ?? LABELS[m]?.label ?? m}
                    </button>
                  );
                })}
              </div>

              <div className="flex" style={{ gap: 18, alignItems: 'flex-start', minHeight: 0 }}>
                <section
                  className="flex-1 min-w-0"
                  style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '20px 22px' }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>{meta.label}</div>
                  <div style={{ fontSize: 12.5, color: colors.mutedDim, marginTop: 2 }}>
                    {points.length} reading{points.length === 1 ? '' : 's'} · fasted · your meter
                  </div>

                  {first != null && last != null && points.length > 1 && (
                    <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.025em', color: colors.foreground, marginTop: 10 }}>
                      {first} <span style={{ color: colors.mutedDim }}>→</span> {last}
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

                <aside style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 20px' }}>
                    <div className="t-label" style={{ color: colors.mutedDim, marginBottom: 10 }}>From your meter</div>
                    {METRICS.filter((m) => m !== 'BAS' && (record.series?.[m]?.length ?? 0) > 0).map((m, i, arr) => {
                      const sm = LABELS[m] ?? { label: m, unit: '' };
                      const pts = record.series[m];
                      const v = pts[pts.length - 1]?.value;
                      return (
                        <button
                          key={m}
                          onClick={() => setMetric(m)}
                          className="w-full flex items-center text-left"
                          style={{
                            gap: 12, padding: '9px 0', cursor: 'pointer', background: 'none', fontFamily: 'inherit',
                            border: 'none',
                            borderBottom: i === arr.length - 1 ? undefined : '1px solid rgba(255,255,255,0.07)',
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div style={{ fontSize: 13, color: colors.foreground }}>{sm.label}</div>
                            <div style={{ fontSize: 11.5, color: colors.mutedDim }}>{pts.length} readings</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>
                            {v}
                            <span style={{ fontSize: 11, fontWeight: 400, color: colors.mutedDim }}> {sm.unit}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* The frame puts phone data beside meter data on the same
                      axis. We hold none of it, so this says that rather than
                      drawing an empty chart. */}
                  <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 20px' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                      <div className="t-label" style={{ color: colors.mutedDim }}>From your phone</div>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: colors.device, background: 'rgba(124,197,216,0.12)',
                          border: '1px solid rgba(124,197,216,0.3)', borderRadius: 999, padding: '3px 9px',
                        }}
                      >
                        from the app
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: colors.muted, lineHeight: 1.55 }}>
                      Sleep, steps, resting heart rate and meal timing are
                      captured on your phone. Once connected they chart on the
                      same time axis as this trend — so you can see the lipid
                      move against the sleep that produced it.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </ScreenBody>
      </div>
    </AppShell>
  );
}
