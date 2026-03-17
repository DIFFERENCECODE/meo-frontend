'use client';

import React, { useState } from 'react';
import { BarChart3, FlipHorizontal } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// Types
interface BioAgeMetrics {
  baseline: number | null;
  target: number | null;
  improvement: number | null;
  baselineDate: string | null;
  targetDate: string | null;
}

interface GraphDataPoint {
  time: string;
  glucose: number;
  insulin: number;
}

interface AnalysisContentProps {
  graphData: GraphDataPoint[];
  bioAgeMetrics: BioAgeMetrics;
}

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

// Biological Age Gauge
function BiologicalAgeGauge({
  biologicalAge,
  targetAge,
}: {
  biologicalAge: number;
  chronologicalAge: number;
  targetAge: number;
}) {
  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '70%'],
        radius: '100%',
        min: 21,
        max: 85,
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#22c55e'],
              [0.55, '#84cc16'],
              [0.7, '#eab308'],
              [0.85, '#f97316'],
              [1, '#ef4444'],
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '60%',
          width: 12,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: 'white',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowBlur: 8,
            shadowOffsetY: 3,
          },
        },
        axisTick: { length: 8, lineStyle: { color: 'auto', width: 2 } },
        splitLine: { length: 15, lineStyle: { color: 'auto', width: 3 } },
        axisLabel: {
          color: '#9ca3af',
          fontSize: 12,
          distance: -45,
          rotate: 'tangential',
          formatter: (value: number) => {
            if (value === 21 || value === 85) return value.toString();
            if (Math.abs(value - 57.6) < 5) return '57.6';
            if (value === 70 || value === 80) return value.toString();
            return '';
          },
        },
        title: { show: false },
        detail: {
          fontSize: 28,
          fontWeight: 'bold',
          color: '#ffffff',
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: (value: number) => `${value.toFixed(1)}\nAge`,
          lineHeight: 32,
        },
        data: [{ value: biologicalAge }],
      },
    ],
  };

  return (
    <div className="relative flex flex-col items-center" style={{ width: 320, height: 200 }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
}

export function AnalysisContent({ graphData, bioAgeMetrics }: AnalysisContentProps) {
  const { theme } = useTheme();
  const [isBioAgeFlipped, setIsBioAgeFlipped] = useState(false);

  const data = graphData.length > 0 ? graphData : defaultKraftData;
  const metrics = {
    baseline: bioAgeMetrics.baseline ?? 41.9,
    target: bioAgeMetrics.target ?? 41.5,
    improvement: bioAgeMetrics.improvement ?? 0.4,
  };

  // Generate bio age trajectory
  const bioAgeTrajectory = Array.from({ length: 18 }, (_, i) => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    startDate.setDate(startDate.getDate() + i * 5);
    const stepValue = (metrics.baseline - metrics.target) / 17;
    return {
      date: `${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getDate().toString().padStart(2, '0')}`,
      you: metrics.baseline - stepValue * i,
      target: metrics.target,
    };
  });

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
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs" style={{ color: theme.colors.muted }}>
              Risk Score
            </p>
            <p className="text-3xl font-bold text-orange-500">65</p>
          </div>
          <RiskScoreGauge score={65} />
        </div>
      </div>

      {/* Biological Age Card (Flippable) */}
      <div className="perspective-1000">
        <div
          className="relative cursor-pointer transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: isBioAgeFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
          onClick={() => setIsBioAgeFlipped(!isBioAgeFlipped)}
        >
          {/* Front - Gauge */}
          <div
            className="rounded-xl border p-6"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.cardBorder,
              backfaceVisibility: 'hidden',
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <h2 className="text-xl font-bold" style={{ color: theme.colors.foreground }}>
                  Biological Age Analysis
                </h2>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBioAgeFlipped(!isBioAgeFlipped);
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <FlipHorizontal className="h-5 w-5" style={{ color: theme.colors.muted }} />
              </button>
            </div>
            <div className="flex flex-col items-center py-4">
              <BiologicalAgeGauge biologicalAge={metrics.baseline} chronologicalAge={42} targetAge={metrics.target} />
              <div className="text-center mt-4">
                <p className="text-sm" style={{ color: theme.colors.muted }}>
                  Improvement: <span style={{ color: theme.colors.primary }} className="font-bold">{metrics.improvement.toFixed(2)} years</span>
                </p>
                <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
                  Target Age: {metrics.target.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Back - Chart */}
          <div
            className="absolute inset-0 rounded-xl border p-6"
            style={{
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.cardBorder,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <h2 className="text-xl font-bold" style={{ color: theme.colors.foreground }}>
                    Your Age Journey
                  </h2>
                </div>
                <p className="text-sm mt-1" style={{ color: theme.colors.muted }}>
                  Clinical progress vs target over time
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBioAgeFlipped(!isBioAgeFlipped);
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <FlipHorizontal className="h-5 w-5" style={{ color: theme.colors.muted }} />
              </button>
            </div>
            <div className="h-[300px] w-full">
              <ReactECharts
                option={{
                  grid: { top: 40, right: 30, bottom: 60, left: 50 },
                  xAxis: {
                    type: 'category',
                    data: bioAgeTrajectory.map((d) => d.date),
                    axisLine: { lineStyle: { color: '#374151' } },
                    axisLabel: { color: '#9ca3af', fontSize: 10, interval: 2 },
                  },
                  yAxis: {
                    type: 'value',
                    min: metrics.target - 0.1,
                    max: metrics.baseline + 0.05,
                    axisLine: { lineStyle: { color: '#374151' } },
                    axisLabel: { color: '#9ca3af', fontSize: 12, formatter: (v: number) => v.toFixed(2) },
                    splitLine: { lineStyle: { color: '#374151', opacity: 0.3, type: 'dashed' } },
                  },
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#1f2937',
                    borderColor: '#374151',
                    textStyle: { color: '#fff' },
                  },
                  legend: { data: ['YOU', 'OUR TARGET'], bottom: 10, textStyle: { color: '#9ca3af' } },
                  series: [
                    {
                      name: 'YOU',
                      type: 'line',
                      data: bioAgeTrajectory.map((d) => d.you),
                      smooth: true,
                      lineStyle: { color: '#f97316', width: 3 },
                      itemStyle: { color: '#f97316' },
                      symbol: 'circle',
                      symbolSize: 8,
                    },
                    {
                      name: 'OUR TARGET',
                      type: 'line',
                      data: bioAgeTrajectory.map((d) => d.target),
                      smooth: true,
                      lineStyle: { color: theme.colors.primary, width: 3 },
                      itemStyle: { color: theme.colors.primary },
                      symbol: 'circle',
                      symbolSize: 8,
                    },
                  ],
                } as EChartsOption}
                style={{ width: '100%', height: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </div>
        </div>
      </div>

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
                  name: 'Glucose (mg/dL)',
                  min: 0,
                  max: 200,
                  position: 'left',
                  axisLine: { show: true, lineStyle: { color: '#3b82f6' } },
                  axisLabel: { color: '#3b82f6', fontSize: 12 },
                  splitLine: { lineStyle: { color: '#374151', opacity: 0.3, type: 'dashed' } },
                },
                {
                  type: 'value',
                  name: 'Insulin (μIU/mL)',
                  min: 0,
                  max: 150,
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
            { value: '160', label: 'Peak Glucose', color: '#3b82f6' },
            { value: '120', label: 'Peak Insulin', color: '#f97316' },
            { value: '5hr', label: 'Recovery Time', color: theme.colors.primary },
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
