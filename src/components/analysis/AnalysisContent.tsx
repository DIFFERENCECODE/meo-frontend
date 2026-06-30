'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, Loader2 } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { getValidIdToken } from '@/app/lib/auth';
import { ScoreGauges } from './ScoreGauges';
import { BASProgressChart } from './BASProgressChart';
import type { ReportProfile, ReportScores, ReportMeasurement, ReportHistoryPoint } from '@/lib/report';

// Types
interface GraphDataPoint {
  time: string;
  glucose: number;
  insulin: number;
}

interface AnalysisContentProps {
  // Kept as an optional prop for back-compat with any caller still passing
  // chat-driven graph data. The component now self-fetches /api/user-data
  // as the primary source; this prop is only a fallback.
  graphData?: GraphDataPoint[];
}

// Canonical unit map: bang-api stores both original and unit-converted
// twins (e.g. Glucose in mMol AND mg/dL). We keep only the canonical row
// per (time, analyte) so peak calculations aren't polluted by conversions.
//
// IMPORTANT for Insulin: bang-api takes the user-submitted value in
// 'uIU/mL' (capital L) and ALSO writes a converted twin labeled 'µIU/ml'
// (lowercase l) whose value is value/6.945 — i.e. the pmol/L conversion
// mislabeled with the wrong micro-unit. The 'µIU/ml' rows are NOT real
// readings, so we must treat only 'uIU/mL' as canonical and exclude the
// lowercase variant entirely. Otherwise the dedupe picks whichever row
// happens to come first and you get a chart with values like 0.21, 1.37
// instead of the actual 26.9 µIU/mL the user entered.
const CANONICAL_UNITS: Record<string, string[]> = {
  Glucose: ['mMol', 'mmol/L'],
  Insulin: ['uIU/mL'],
};

// Default data
const defaultKraftData: GraphDataPoint[] = [
  { time: '0hr', glucose: 85, insulin: 5 },
  { time: '0.5hr', glucose: 145, insulin: 55 },
  { time: '1hr', glucose: 160, insulin: 95 },
  { time: '1.5hr', glucose: 150, insulin: 120 },
  { time: '2hr', glucose: 135, insulin: 95 },
  { time: '2.5hr', glucose: 115, insulin: 65 },
  { time: '3hr', glucose: 100, insulin: 40 },
  { time: '3.5hr', glucose: 92, insulin: 28 },
  { time: '4hr', glucose: 88, insulin: 18 },
  { time: '4.5hr', glucose: 85, insulin: 12 },
  { time: '5hr', glucose: 83, insulin: 8 },
];

// Risk Score Gauge Component
function RiskScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : '#22c55e';

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '90%',
        center: ['50%', '50%'],
        progress: {
          show: true,
          width: 8,
          roundCap: true,
          itemStyle: { color },
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 8,
            color: [[1, 'rgba(255, 255, 255, 0.1)']],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { show: false },
        data: [{ value: score }],
      },
    ],
  };

  return (
    <div className="relative w-20 h-20">
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-orange-500" />
      </div>
    </div>
  );
}

export function AnalysisContent({ graphData: graphDataProp }: AnalysisContentProps) {
  const { theme } = useTheme();
  const [fetchedGraphData, setFetchedGraphData] = useState<GraphDataPoint[] | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Self-fetch user data so the page is always correct, regardless of
  // whether a chat-driven graph_data payload populated MeOApp state.
  // The chat path was unreliable: kraft_curve_data has unit-converted
  // duplicates whose Map-based merge produced swapped peaks (insulin
  // values landing in the glucose field, etc).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch('/api/user-data', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || cancelled) return;
        const data = await res.json();

        // Build a deduped (time, analyte, series) → value map preferring canonical units.
        type Row = { time: string; name: string; unit: string; value: number; measurementSeries?: string };
        const rawMeasurements: Row[] = Array.isArray(data?.measurements) ? data.measurements : [];
        const byKey = new Map<string, Row>();
        for (const m of rawMeasurements) {
          // Dedupe key includes series so rows from different series with the
          // same timestamp don't clobber each other.
          const key = `${m.measurementSeries ?? ''}|${m.time}|${m.name}`;
          const existing = byKey.get(key);
          const canonical = CANONICAL_UNITS[m.name];
          const isCanonical = canonical ? canonical.includes(m.unit) : true;
          if (!existing) {
            byKey.set(key, m);
          } else {
            const existingIsCanonical = canonical ? canonical.includes(existing.unit) : true;
            if (isCanonical && !existingIsCanonical) byKey.set(key, m);
          }
        }
        const deduped = Array.from(byKey.values());

        // Group by measurementSeries so we can find the best OGTT series.
        // A "real" Kraft series has BOTH Glucose and Insulin at 3+ timepoints
        // that are within 10 minutes of each other — i.e. it's a proper OGTT,
        // not a one-off fasting BAS reading.
        const bySeries = new Map<string, Row[]>();
        for (const m of deduped) {
          if (m.name !== 'Glucose' && m.name !== 'Insulin') continue;
          const s = m.measurementSeries ?? '__none__';
          if (!bySeries.has(s)) bySeries.set(s, []);
          bySeries.get(s)!.push(m);
        }

        let bestSeries: string | null = null;
        let bestPairs = 0;
        for (const [series, rows] of bySeries) {
          const gRows = rows.filter((r) => r.name === 'Glucose').sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          const iRows = rows.filter((r) => r.name === 'Insulin').sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          // Count timepoints that have both glucose and insulin within 10 min.
          let pairs = 0;
          for (const g of gRows) {
            const gt = new Date(g.time).getTime();
            const hasInsulin = iRows.some((i) => Math.abs(new Date(i.time).getTime() - gt) <= 10 * 60000);
            if (hasInsulin) pairs++;
          }
          if (pairs > bestPairs) { bestPairs = pairs; bestSeries = series; }
        }

        // Fall back to any series with the most glucose points if no paired series found.
        if (!bestSeries) {
          let mostG = 0;
          for (const [series, rows] of bySeries) {
            const gCount = rows.filter((r) => r.name === 'Glucose').length;
            if (gCount > mostG) { mostG = gCount; bestSeries = series; }
          }
        }

        const rawSeriesRows = bestSeries ? (bySeries.get(bestSeries) ?? []) : deduped.filter((m) => m.name === 'Glucose' || m.name === 'Insulin');

        // Clamp to first 130-minute OGTT window from the earliest reading in
        // the series. This strips out BAS fasting readings done hours later on
        // the same day that would otherwise appear as "+733m" etc. on the chart.
        const seriesT0 = rawSeriesRows.length > 0
          ? Math.min(...rawSeriesRows.map((r) => new Date(r.time).getTime()))
          : 0;
        const OGTT_WINDOW_MS = 130 * 60 * 1000; // 130 min — 10 min buffer past T120
        const seriesRows = rawSeriesRows.filter((r) => new Date(r.time).getTime() - seriesT0 <= OGTT_WINDOW_MS);

        const glucoseRows = seriesRows.filter((m) => m.name === 'Glucose').sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        const insulinRows = seriesRows.filter((m) => m.name === 'Insulin').sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // Use whichever series has more timepoints as the axis; pair the other by nearest timestamp.
        const baseRows = glucoseRows.length >= insulinRows.length ? glucoseRows : insulinRows;
        const otherRows = baseRows === glucoseRows ? insulinRows : glucoseRows;
        const baseIsGlucose = baseRows === glucoseRows;
        const t0ms = baseRows.length > 0 ? new Date(baseRows[0].time).getTime() : 0;

        const points: GraphDataPoint[] = baseRows.map((r) => {
          const tMs = new Date(r.time).getTime();
          const minutesFromT0 = Math.round((tMs - t0ms) / 60000);
          const label = minutesFromT0 === 0 ? '0' : `+${minutesFromT0}`;
          const matched = otherRows.reduce<{ row: Row | null; diff: number }>(
            (best, candidate) => {
              const diff = Math.abs(new Date(candidate.time).getTime() - tMs);
              return !best.row || diff < best.diff ? { row: candidate, diff } : best;
            },
            { row: null, diff: Infinity },
          );
          return {
            time: label,
            glucose: baseIsGlucose ? r.value : matched.row?.value ?? 0,
            insulin: baseIsGlucose ? matched.row?.value ?? 0 : r.value,
          };
        });
        if (points.length > 0) setFetchedGraphData(points);
      } catch {
        // Silent fail — fall back to props or default chart
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefer self-fetched data over props; fall back to default chart only
  // when nothing else is available.
  const effectiveGraphData = fetchedGraphData ?? graphDataProp ?? [];
  const hasRealData = effectiveGraphData.length > 0;
  const data = hasRealData ? effectiveGraphData : defaultKraftData;

  // Compute Kraft curve summary metrics from actual data
  const peakGlucose = hasRealData
    ? Number(Math.max(...data.map((d) => d.glucose)).toFixed(1))
    : Math.round(Math.max(...data.map((d) => d.glucose)));
  const peakInsulin = hasRealData
    ? Number(Math.max(...data.map((d) => d.insulin)).toFixed(1))
    : Math.round(Math.max(...data.map((d) => d.insulin)));
  // Recovery time: last timepoint where glucose is still above baseline (first reading)
  const baselineGlucose = data[0]?.glucose ?? 0;
  const recoveryIndex = data.findLastIndex((d) => d.glucose > baselineGlucose * 1.05);
  const recoveryTime =
    recoveryIndex >= 0 ? data[recoveryIndex]?.time ?? '—' : hasRealData ? '—' : data[data.length - 1]?.time ?? '—';
  // Risk score: clinical heuristic for Kraft test interpretation.
  //   Peak insulin: <40 µIU/mL is healthy, 40–100 elevated, >100 high risk.
  //   Recovery: glucose returning to baseline within 2hr is healthy.
  // Maps to a 0–100 scale where ~30 = low, ~60 = elevated, ~80+ = high.
  const insulinComponent = Math.min(60, (peakInsulin / 100) * 60);
  const recoveryComponent = Math.min(40, (Math.max(recoveryIndex, 0) / Math.max(data.length - 1, 1)) * 40);
  const riskScore = hasRealData
    ? Math.min(100, Math.max(0, Math.round(insulinComponent + recoveryComponent)))
    : 0;

  const handleDownloadReport = useCallback(async () => {
    setDownloading(true);
    try {
      const token = await getValidIdToken();
      if (!token) return;

      const [profileRes, userDataRes, sessionsRes, historyRes] = await Promise.all([
        fetch('/api/profile',    { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user-data',  { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/scores/sessions', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch('/api/scores/history',  { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
      ]);

      const profileData  = profileRes.ok  ? await profileRes.json()  : null;
      const userData     = userDataRes.ok ? await userDataRes.json()  : null;
      const sessionsData = sessionsRes.ok ? await sessionsRes.json()  : null;
      const historyData  = historyRes.ok  ? await historyRes.json()   : null;

      // Build report profile
      const reportProfile: ReportProfile = {
        name:             profileData?.name ?? null,
        email:            profileData?.email ?? '',
        metabolic_goals:  profileData?.metabolic_goals ?? [],
      };

      // Build deduplicated measurements (same logic as profile page)
      type RawMeasurement = { time: string; name: string; unit: string; value: number };
      const rawMeasurements: RawMeasurement[] = Array.isArray(userData?.measurements)
        ? userData.measurements
        : [];
      const seen = new Set<string>();
      const reportMeasurements: ReportMeasurement[] = rawMeasurements
        .filter((m) => !(['mg/dl', 'pMol', 'pounds', 'inch', 'µIU/ml'].includes(m.unit)))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .filter((m) => {
          const k = `${m.time}|${m.name}|${m.unit}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

      // Fetch scores for the most recent session
      let reportScores: ReportScores | null = null;
      const sessions: Array<{ measurementSeries: string }> = Array.isArray(sessionsData?.sessions)
        ? sessionsData.sessions
        : [];
      if (sessions.length > 0) {
        const latestSeries = sessions[0].measurementSeries;
        const scoresRes = await fetch(
          `/api/scores?series=${encodeURIComponent(latestSeries)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        if (scoresRes.ok) {
          const sd = await scoresRes.json();
          reportScores = {
            measurementSeries: sd.measurementSeries ?? null,
            bas: sd.bas?.value ?? null,
            vat: sd.vat?.value ?? null,
          };
        }
      }

      const reportHistory: ReportHistoryPoint[] = (historyData?.points ?? [])
        .filter((p: { bas: number | null }) => p.bas !== null)
        .map((p: { time: number; bas: number }) => ({ time: p.time, bas: p.bas }));

      // Dynamic import keeps jsPDF out of the initial bundle
      const { generateMetabolicReportPDF } = await import('@/lib/report');
      generateMetabolicReportPDF(reportProfile, reportMeasurements, reportScores, {
        peakGlucose,
        peakInsulin,
        recoveryTime,
        riskScore,
        hasRealData,
      }, reportHistory);
    } catch (err) {
      console.error('[report] PDF generation failed', err);
    } finally {
      setDownloading(false);
    }
  }, [peakGlucose, peakInsulin, recoveryTime, riskScore, hasRealData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.colors.foreground }}>
            Metabolic Analysis
          </h1>
          <p className="text-sm" style={{ color: theme.colors.muted }}>
            Based on your latest data
          </p>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.primaryForeground,
            }}
          >
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {downloading ? 'Generating…' : 'Download Report'}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs" style={{ color: theme.colors.muted }}>
              Risk Score
            </p>
            <p className="text-3xl font-bold text-orange-500">{hasRealData ? riskScore : '—'}</p>
          </div>
          <RiskScoreGauge score={hasRealData ? riskScore : 0} />
        </div>
      </div>

      {/* Grafana-parity score gauges (BAS + KRAFT Deep Fat Score).
          Self-contained: fetches sessions + scores from /api/scores/*
          and mirrors the exact Grafana panel thresholds, colors, ranges. */}
      <ScoreGauges />

      {/* BAS progress over time — mirrors Grafana's second BAS dashboard.
          Fetches all sessions and plots each BAS value chronologically. */}
      <BASProgressChart />


      {/* Kraft Curve Card */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.cardBorder,
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.colors.foreground }}>
              Kraft Curve Analysis
            </h2>
            <p className="text-sm" style={{ color: theme.colors.muted }}>
              5-Hour Glucose Tolerance Test
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${theme.colors.warning}20`,
              color: theme.colors.warning,
              border: `1px solid ${theme.colors.warning}40`,
            }}
          >
            At Risk
          </span>
        </div>

        <div className="h-[350px] w-full">
          <ReactECharts
            option={{
              animation: true,
              grid: { top: 60, right: 80, bottom: 80, left: 60, containLabel: false },
              xAxis: {
                type: 'category',
                data: data.map((d) => d.time),
                boundaryGap: false,
                axisLine: { lineStyle: { color: '#374151' } },
                axisLabel: { color: '#9ca3af', fontSize: 12 },
              },
              yAxis: [
                {
                  type: 'value',
                  // Real data is in mMol; default mock data is in mg/dL
                  name: hasRealData ? 'Glucose (mMol)' : 'Glucose (mg/dL)',
                  min: 0,
                  max: hasRealData ? Math.ceil(Math.max(peakGlucose * 1.2, 15)) : 200,
                  position: 'left',
                  axisLine: { show: true, lineStyle: { color: '#3b82f6' } },
                  axisLabel: { color: '#3b82f6', fontSize: 12 },
                  splitLine: { lineStyle: { color: '#374151', opacity: 0.3, type: 'dashed' } },
                },
                {
                  type: 'value',
                  name: 'Insulin (μIU/mL)',
                  min: 0,
                  max: hasRealData ? Math.ceil(Math.max(peakInsulin * 1.3, 30)) : 150,
                  position: 'right',
                  axisLine: { show: true, lineStyle: { color: '#f97316' } },
                  axisLabel: { color: '#f97316', fontSize: 12 },
                  splitLine: { show: false },
                },
              ],
              tooltip: {
                trigger: 'axis',
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                textStyle: { color: '#fff' },
              },
              legend: { data: ['glucose', 'insulin'], bottom: 10, textStyle: { color: '#9ca3af' }, icon: 'circle' },
              dataset: { source: data },
              series: [
                {
                  name: 'glucose',
                  type: 'line',
                  yAxisIndex: 0,
                  encode: { x: 'time', y: 'glucose' },
                  smooth: 0.3,
                  showSymbol: true,
                  lineStyle: { color: '#3b82f6', width: 3 },
                  itemStyle: { color: '#3b82f6' },
                  symbol: 'circle',
                  symbolSize: 10,
                },
                {
                  name: 'insulin',
                  type: 'line',
                  yAxisIndex: 1,
                  encode: { x: 'time', y: 'insulin' },
                  smooth: 0.3,
                  showSymbol: true,
                  lineStyle: { color: '#f97316', width: 3 },
                  itemStyle: { color: '#f97316' },
                  symbol: 'circle',
                  symbolSize: 10,
                },
              ],
            } as EChartsOption}
            style={{ width: '100%', height: '100%' }}
            notMerge
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { value: String(peakGlucose), label: 'Peak Glucose', color: '#3b82f6' },
            { value: String(peakInsulin), label: 'Peak Insulin', color: '#f97316' },
            { value: recoveryTime, label: 'Recovery Time', color: theme.colors.primary },
          ].map((metric, i) => (
            <div
              key={i}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.cardBorder,
              }}
            >
              <p className="text-3xl font-bold" style={{ color: metric.color }}>
                {metric.value}
              </p>
              <p className="text-xs" style={{ color: theme.colors.muted }}>
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalysisContent;
