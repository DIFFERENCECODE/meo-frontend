'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';
import { TrendChart, TrendPoint } from '@/components/analysis/TrendChart';

interface Reading {
  series: string;
  date: string | null;
  time: string | null;
  fasted: boolean;
  values: Record<string, number>;
  bas: number | null;
  has_score: boolean;
  is_panel: boolean;
}

interface DeltaEntry {
  from: number;
  to: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
  improved: boolean | null;
}

interface RecordResponse {
  readings: Reading[];
  reading_count: number;
  panel_count: number;
  latest: Reading | null;
  previous: Reading | null;
  delta: Record<string, DeltaEntry>;
  series: Record<string, TrendPoint[]>;
  readings_without_score: number;
}

/** Display metadata per biomarker. Order here is the order of the tabs. */
const BIOMARKERS: {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}[] = [
  { key: 'BAS', label: 'Biological Age Score', unit: '', lowerIsBetter: true },
  { key: 'Triglyceride', label: 'Triglycerides', unit: 'mmol/L', lowerIsBetter: true },
  { key: 'HDL', label: 'HDL', unit: 'mmol/L', lowerIsBetter: false },
  { key: 'LDL', label: 'LDL', unit: 'mmol/L', lowerIsBetter: true },
  { key: 'Cholesterol', label: 'Total cholesterol', unit: 'mmol/L', lowerIsBetter: true },
  { key: 'Glucose', label: 'Fasting glucose', unit: 'mmol/L', lowerIsBetter: true },
  { key: 'Waist', label: 'Waist', unit: 'cm', lowerIsBetter: true },
  { key: 'Weight', label: 'Weight', unit: 'kg', lowerIsBetter: true },
];

export default function TrendsPage() {
  const { colors } = useTheme();
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string>('BAS');

  useEffect(() => {
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) {
          setError('Please sign in to see your trends.');
          return;
        }
        const res = await fetch('/api/readings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.detail || data?.error || 'Could not load your readings.');
          return;
        }
        setRecord(data);
      } catch {
        setError('Could not load your readings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only offer a tab for a biomarker the patient actually has readings for —
  // an empty tab is a dead end that implies missing data rather than absent
  // measurement.
  const available = useMemo(
    () => BIOMARKERS.filter((b) => (record?.series?.[b.key]?.length ?? 0) > 0),
    [record],
  );

  useEffect(() => {
    if (available.length > 0 && !available.some((b) => b.key === active)) {
      setActive(available[0].key);
    }
  }, [available, active]);

  const current = available.find((b) => b.key === active);
  const points = record?.series?.[active] ?? [];
  const delta = record?.delta?.[active];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-5 py-8 w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-3"
            style={{ color: colors.muted }}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Trends
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.muted }}>
            Every reading compared with your own last one — not a population range.
          </p>
        </div>

        {loading && (
          <div className="py-16 text-center text-sm" style={{ color: colors.muted }}>
            Loading your readings…
          </div>
        )}

        {error && !loading && (
          <div
            className="rounded-xl p-5 flex items-start gap-3"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: colors.warning }} />
            <p className="text-sm" style={{ color: colors.foreground }}>{error}</p>
          </div>
        )}

        {record && !loading && !error && (
          <>
            {record.panel_count === 0 && (
              <div
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
              >
                <TrendingUp className="h-8 w-8 mx-auto mb-3" style={{ color: colors.primary }} />
                <p className="font-semibold" style={{ color: colors.foreground }}>
                  No readings yet
                </p>
                <p className="text-sm mt-1" style={{ color: colors.muted }}>
                  Take a guided test and your first point appears here.
                </p>
              </div>
            )}

            {record.panel_count > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {available.map((b) => {
                    const on = b.key === active;
                    return (
                      <button
                        key={b.key}
                        onClick={() => setActive(b.key)}
                        className="text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                        style={{
                          backgroundColor: on ? colors.primary : colors.accent,
                          color: on ? colors.primaryForeground : colors.muted,
                          border: `1px solid ${on ? colors.primary : colors.cardBorder}`,
                        }}
                        aria-pressed={on}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="rounded-2xl p-5 mb-5"
                  style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-semibold" style={{ color: colors.foreground }}>
                        {current?.label}
                      </h2>
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {points.length} reading{points.length === 1 ? '' : 's'}
                        {current?.unit ? ` · ${current.unit}` : ''}
                      </p>
                    </div>
                    {delta && (
                      <div className="text-right">
                        <div
                          className="text-lg font-bold"
                          style={{
                            color:
                              delta.improved === null
                                ? colors.muted
                                : delta.improved
                                  ? colors.success
                                  : colors.warning,
                          }}
                        >
                          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '—'}{' '}
                          {Math.abs(delta.change).toFixed(2)}
                        </div>
                        <div className="text-xs" style={{ color: colors.muted }}>
                          {delta.from} → {delta.to} since last reading
                        </div>
                      </div>
                    )}
                  </div>

                  <TrendChart
                    points={points}
                    unit={current?.unit}
                    lowerIsBetter={current?.lowerIsBetter ?? true}
                  />
                </div>

                {record.readings_without_score > 0 && (
                  <div
                    className="rounded-xl p-4 flex items-start gap-3"
                    style={{
                      backgroundColor: colors.card,
                      border: `1px solid ${colors.warning}`,
                    }}
                  >
                    <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: colors.warning }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
                        {record.readings_without_score} of your {record.panel_count} readings
                        have no Biological Age Score
                      </p>
                      <p className="text-xs mt-1" style={{ color: colors.muted }}>
                        A score needs a full set of fasting values — triglycerides, HDL,
                        glucose and waist — and every value has to be plausible. A reading
                        entered in the wrong units cannot be scored.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
