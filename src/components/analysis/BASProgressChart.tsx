'use client';

// BASProgressChart.tsx — Biological Age Score over time, ECharts line chart.
//
// Mirrors the Grafana panel "Biological Age Score" (second dashboard URL).
// Data source: GET /api/scores/history → { points: [{time, bas, measurementSeries}] }
// Points are sorted ascending by time (session date).
//
// Visual spec (from Grafana screenshot):
//   • Lime-green line (#a3e635) with filled circle markers at each session
//   • Mean value annotation as a subtle dashed horizontal line
//   • Y-axis range: auto-fit ± 10% padding
//   • X-axis: formatted dates
//   • Tooltip shows series label + BAS value
//   • Empty state: "No session data yet"

import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '@/theme/ThemeProvider';
import { getValidIdToken } from '@/app/lib/auth';

interface HistoryPoint {
  measurementSeries: string;
  time: number;
  bas: number | null;
  vat: number | null;
}

const LINE_COLOR = '#a3e635';   // lime-green — matches Grafana panel
const MEAN_COLOR = '#facc15';   // yellow — mean reference line
const EMPTY_COPY = 'No session data yet — complete your first test to see your BAS trend.';

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
  });
}

export function BASProgressChart() {
  const { colors } = useTheme();
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) { setLoading(false); return; }
        const res = await fetch('/api/scores/history', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) { setError(`Fetch failed (${res.status})`); setLoading(false); return; }
        const data: { points: HistoryPoint[] } = await res.json();
        if (!cancelled) setPoints(Array.isArray(data?.points) ? data.points : []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const basPoints = useMemo(
    () => points.filter((p) => p.bas !== null),
    [points],
  );

  const mean = useMemo(() => {
    if (basPoints.length === 0) return null;
    return basPoints.reduce((s, p) => s + (p.bas as number), 0) / basPoints.length;
  }, [basPoints]);

  const option: EChartsOption = useMemo(() => {
    const xData = basPoints.map((p) => formatDate(p.time));
    const yData = basPoints.map((p) => Number((p.bas as number).toFixed(1)));
    const allY = yData.length > 0 ? yData : [21, 85];
    const yMin = Math.floor(Math.min(...allY) - 2);
    const yMax = Math.ceil(Math.max(...allY) + 2);

    const markLine = mean !== null
      ? {
          data: [{
            yAxis: Number(mean.toFixed(1)),
            name: `Mean: ${mean.toFixed(1)}`,
            label: {
              formatter: `Mean {c}`,
              color: MEAN_COLOR,
              fontSize: 11,
              position: 'insideEndTop' as const,
            },
            lineStyle: { color: MEAN_COLOR, type: 'dashed' as const, width: 1, opacity: 0.7 },
          }],
          symbol: 'none',
        }
      : undefined;

    return {
      backgroundColor: 'transparent',
      animation: true,
      grid: { top: 24, right: 20, bottom: 40, left: 48, containLabel: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        textStyle: { color: colors.foreground, fontSize: 12 },
        formatter: (params: unknown) => {
          const p = (params as Array<{ name: string; value: number }>)[0];
          if (!p) return '';
          return `${p.name}<br/><b style="color:${LINE_COLOR}">${p.value} Age</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLine: { lineStyle: { color: colors.cardBorder } },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        splitLine: { lineStyle: { color: colors.cardBorder, opacity: 0.4, type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
      },
      series: [
        {
          name: 'BAS',
          type: 'line',
          data: yData,
          smooth: 0.35,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 9,
          lineStyle: { color: LINE_COLOR, width: 2.5 },
          itemStyle: { color: LINE_COLOR, borderWidth: 2, borderColor: LINE_COLOR },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${LINE_COLOR}28` },
                { offset: 1, color: `${LINE_COLOR}00` },
              ],
            },
          },
          ...(markLine ? { markLine } : {}),
        },
      ],
    };
  }, [basPoints, mean, colors]);

  return (
    <div
      className="rounded-xl border p-6"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LINE_COLOR }} />
        <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>
          Biological Age Score — Progress
        </h2>
        {basPoints.length > 0 && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${LINE_COLOR}20`,
              color: LINE_COLOR,
              border: `1px solid ${LINE_COLOR}40`,
            }}
          >
            {basPoints.length} session{basPoints.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-[260px] flex items-center justify-center">
          <span className="text-sm" style={{ color: colors.muted }}>Loading…</span>
        </div>
      ) : error ? (
        <div className="h-[260px] flex items-center justify-center">
          <span className="text-sm" style={{ color: '#ef4444' }}>{error}</span>
        </div>
      ) : basPoints.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center px-6 text-center">
          <p className="text-sm" style={{ color: colors.muted }}>{EMPTY_COPY}</p>
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ReactECharts
            option={option}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge
          />
        </div>
      )}
    </div>
  );
}

export default BASProgressChart;
