'use client';

// ScoreGauges.tsx — two ECharts gauges that mirror the Grafana panels
// "🔴 Biological Age Score" and "🔴 KRAFT Deep Fat Score" 1:1.
//
// Source of truth for thresholds, min/max, units: the Grafana dashboard
// uid=v4tag11 panels [0] and [1] (production folder). Pulled verbatim via
// mcp-grafana:
//
//   BAS gauge:   min=21, max=85, decimals=1, unit='Age'
//                thresholds: 0→green, 57.6→#EAB839, 70→orange, 80→red
//   VAT gauge:   min=0, max=2400, unit='massg' (grams)
//                thresholds: 0→green, 1200→#EAB839
//
// Data flow:
//   GET /api/scores/sessions         → list of {measurementSeries, time}
//   GET /api/scores?series=<series>  → { bas:{value,time}|null, vat:{value,time}|null }
//
// Empty-state copy matches the Grafana `noValue` field:
//   "Please contact your therapist to capture data"

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@/theme/ThemeProvider';
import { getValidIdToken } from '@/app/lib/auth';

interface SessionRow {
  measurementSeries: string;
  time: number | null;
}

interface ScorePoint {
  value: number;
  time: number | null;
}

interface ScoresResponse {
  userid: string;
  measurementSeries: string;
  bas: ScorePoint | null;
  vat: ScorePoint | null;
}

// Grafana threshold stops (absolute mode). Each entry is [lowerBoundInclusive, color].
const BAS_STOPS: Array<[number, string]> = [
  [0, '#22c55e'],    // green
  [57.6, '#EAB839'], // yellow — exact hex from Grafana
  [70, '#f97316'],   // orange
  [80, '#ef4444'],   // red
];

const VAT_STOPS: Array<[number, string]> = [
  [0, '#22c55e'],
  [1200, '#EAB839'],
];

const BAS_MIN = 21;
const BAS_MAX = 85;
const VAT_MIN = 0;
const VAT_MAX = 2400;

const EMPTY_COPY = 'Please contact your therapist to capture data';

/**
 * Build the ECharts axisLine color segments.
 *
 * ECharts gauge color segments are `[[fractionFromMin, color], ...]` where
 * fraction is in [0,1] spanning (max - min). We convert Grafana's absolute
 * thresholds into fraction cut-points.
 */
function buildAxisColorSegments(
  stops: Array<[number, string]>,
  min: number,
  max: number,
): Array<[number, string]> {
  const range = max - min;
  if (range <= 0) return [[1, stops[0]?.[1] ?? '#22c55e']];
  const segments: Array<[number, string]> = [];
  for (let i = 0; i < stops.length; i++) {
    const nextBoundary = i + 1 < stops.length ? stops[i + 1][0] : max;
    const fraction = Math.max(0, Math.min(1, (nextBoundary - min) / range));
    segments.push([fraction, stops[i][1]]);
  }
  return segments;
}

function pickColorForValue(
  value: number,
  stops: Array<[number, string]>,
): string {
  let current = stops[0][1];
  for (const [threshold, color] of stops) {
    if (value >= threshold) current = color;
    else break;
  }
  return current;
}

interface GaugeCardProps {
  title: string;
  value: number | null;
  min: number;
  max: number;
  unitSuffix: string;
  stops: Array<[number, string]>;
  decimals: number;
  emptyCopy: string;
  dotColor: string;
}

function GaugeCard({
  title,
  value,
  min,
  max,
  unitSuffix,
  stops,
  decimals,
  emptyCopy,
  dotColor,
}: GaugeCardProps) {
  const { theme } = useTheme();

  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const axisColorSegments = useMemo(
    () => buildAxisColorSegments(stops, min, max),
    [stops, min, max],
  );
  const pointerColor = hasValue
    ? pickColorForValue(value as number, stops)
    : theme.colors.muted;

  const option: EChartsOption = useMemo(
    () => ({
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min,
          max,
          radius: '95%',
          center: ['50%', '62%'],
          splitNumber: stops.length,
          progress: { show: false },
          itemStyle: { color: pointerColor },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 18,
              color: axisColorSegments,
            },
          },
          axisTick: { show: false },
          splitLine: {
            distance: -22,
            length: 8,
            lineStyle: { color: '#9ca3af', width: 2 },
          },
          axisLabel: {
            distance: -42,
            color: '#d1d5db',
            fontSize: 11,
            formatter: (val: number) => {
              // Show min + every threshold + max, matching Grafana's layout
              if (val === min || val === max) return String(val);
              const t = stops.find((s) => Math.abs(s[0] - val) < 0.01);
              return t ? String(t[0]) : '';
            },
          },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '10%'],
            fontSize: 32,
            fontWeight: 'bold',
            color: pointerColor,
            formatter: (v: number) =>
              hasValue ? `${v.toFixed(decimals)} ${unitSuffix}` : '—',
          },
          data: hasValue ? [{ value: value as number }] : [{ value: min }],
        },
      ],
    }),
    [axisColorSegments, hasValue, value, min, max, decimals, unitSuffix, pointerColor, stops],
  );

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.cardBorder,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <h2 className="text-lg font-bold" style={{ color: theme.colors.foreground }}>
          {title}
        </h2>
      </div>

      {hasValue ? (
        <div className="h-[230px] w-full">
          <ReactECharts
            option={option}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge
          />
        </div>
      ) : (
        <div className="h-[230px] flex items-center justify-center px-6 text-center">
          <p className="text-sm" style={{ color: theme.colors.muted }}>
            {emptyCopy}
          </p>
        </div>
      )}
    </div>
  );
}

export function ScoreGauges() {
  const { theme } = useTheme();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's sessions on mount. Empty list is a valid state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionsLoading(true);
      setError(null);
      try {
        const token = await getValidIdToken();
        if (!token) {
          if (!cancelled) setSessionsLoading(false);
          return;
        }
        const res = await fetch('/api/scores/sessions', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setError(`Sessions fetch failed (${res.status})`);
          if (!cancelled) setSessionsLoading(false);
          return;
        }
        const data: { sessions: SessionRow[] } = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data?.sessions) ? data.sessions : [];
        setSessions(list);
        if (list.length > 0) setSelectedSeries(list[0].measurementSeries);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch scores whenever the selected session changes.
  const loadScores = useCallback(async (series: string) => {
    setScoresLoading(true);
    setError(null);
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch(`/api/scores?series=${encodeURIComponent(series)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setError(`Scores fetch failed (${res.status})`);
        setScores(null);
        return;
      }
      const data: ScoresResponse = await res.json();
      setScores(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
      setScores(null);
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSeries) {
      setScores(null);
      return;
    }
    loadScores(selectedSeries);
  }, [selectedSeries, loadScores]);

  const basValue = scores?.bas?.value ?? null;
  const vatValue = scores?.vat?.value ?? null;
  const sessionCount = sessions.length;

  return (
    <div className="space-y-4">
      {/* Session picker — matches Grafana's dashboard variable dropdown.
          Shown whenever sessions exist; hidden when user has none. */}
      {sessionCount > 0 && (
        <div className="flex items-center gap-3">
          <label
            htmlFor="score-session-picker"
            className="text-xs uppercase tracking-wide"
            style={{ color: theme.colors.muted }}
          >
            Session
          </label>
          <select
            id="score-session-picker"
            value={selectedSeries ?? ''}
            onChange={(e) => setSelectedSeries(e.target.value)}
            disabled={scoresLoading}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.cardBorder,
              color: theme.colors.foreground,
            }}
          >
            {sessions.map((s) => (
              <option key={s.measurementSeries} value={s.measurementSeries}>
                {s.measurementSeries}
              </option>
            ))}
          </select>
          {scoresLoading && (
            <span className="text-xs" style={{ color: theme.colors.muted }}>
              Loading scores…
            </span>
          )}
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border px-4 py-2 text-sm"
          style={{
            borderColor: '#ef4444',
            color: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          {error}
        </div>
      )}

      {/* Two gauges stacked — Bio Age on top, Deep Fat Score below,
          matching the PDF page 4 layout. */}
      <GaugeCard
        title={
          scores?.measurementSeries
            ? `Biological Age Score ${scores.measurementSeries}`
            : 'Biological Age Score'
        }
        value={sessionsLoading ? null : basValue}
        min={BAS_MIN}
        max={BAS_MAX}
        unitSuffix="Age"
        stops={BAS_STOPS}
        decimals={1}
        emptyCopy={
          sessionsLoading
            ? 'Loading…'
            : sessionCount === 0
            ? EMPTY_COPY
            : EMPTY_COPY
        }
        dotColor="#ef4444"
      />

      <GaugeCard
        title={
          scores?.measurementSeries
            ? `KRAFT Deep Fat Score ${scores.measurementSeries}`
            : 'KRAFT Deep Fat Score'
        }
        value={sessionsLoading ? null : vatValue}
        min={VAT_MIN}
        max={VAT_MAX}
        unitSuffix="g"
        stops={VAT_STOPS}
        decimals={1}
        emptyCopy={
          sessionsLoading
            ? 'Loading…'
            : sessionCount === 0
            ? EMPTY_COPY
            : EMPTY_COPY
        }
        dotColor="#ef4444"
      />
    </div>
  );
}

export default ScoreGauges;
