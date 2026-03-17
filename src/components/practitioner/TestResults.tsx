'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// Mock test results data
const mockResults = [
  {
    id: '1',
    name: 'HbA1c',
    value: 6.8,
    unit: '%',
    range: '4.0-5.6',
    status: 'high',
    trend: 'down',
    date: '2024-01-15',
  },
  {
    id: '2',
    name: 'Fasting Glucose',
    value: 112,
    unit: 'mg/dL',
    range: '70-99',
    status: 'high',
    trend: 'stable',
    date: '2024-01-15',
  },
  {
    id: '3',
    name: 'Fasting Insulin',
    value: 18.5,
    unit: 'μIU/mL',
    range: '2-25',
    status: 'normal',
    trend: 'down',
    date: '2024-01-15',
  },
  {
    id: '4',
    name: 'HOMA-IR',
    value: 5.1,
    unit: '',
    range: '<2.5',
    status: 'high',
    trend: 'down',
    date: '2024-01-15',
  },
];

interface TestResultsProps {
  className?: string;
}

export function TestResults({ className }: TestResultsProps) {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return theme.colors.error;
      case 'low':
        return theme.colors.warning;
      case 'normal':
        return theme.colors.success;
      default:
        return theme.colors.muted;
    }
  };

  const TrendIcon = ({
    trend,
  }: {
    trend: 'up' | 'down' | 'stable';
  }) => {
    const color =
      trend === 'down'
        ? theme.colors.success
        : trend === 'up'
        ? theme.colors.error
        : theme.colors.muted;
    
    if (trend === 'up') return <TrendingUp className="h-3 w-3" style={{ color }} />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" style={{ color }} />;
    return <Minus className="h-3 w-3" style={{ color }} />;
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden ${className || ''}`}
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.cardBorder,
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: theme.colors.cardBorder }}
      >
        <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>
          Recent Test Results
        </h3>
        <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
          Last updated: Jan 15, 2024
        </p>
      </div>

      {/* Results Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {mockResults.map((result) => (
          <div
            key={result.id}
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.cardBorder,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: theme.colors.muted }}>
                {result.name}
              </span>
              <TrendIcon trend={result.trend as 'up' | 'down' | 'stable'} />
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1">
              <span
                className="text-xl font-bold"
                style={{ color: getStatusColor(result.status) }}
              >
                {result.value}
              </span>
              <span className="text-xs" style={{ color: theme.colors.muted }}>
                {result.unit}
              </span>
            </div>

            {/* Reference Range */}
            <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
              Ref: {result.range}
            </p>
          </div>
        ))}
      </div>

      {/* Placeholder Chart Area */}
      <div
        className="mx-4 mb-4 p-4 rounded-lg border-2 border-dashed flex items-center justify-center"
        style={{ borderColor: theme.colors.cardBorder, height: '120px' }}
      >
        <p className="text-sm" style={{ color: theme.colors.muted }}>
          Trend chart placeholder
        </p>
      </div>
    </div>
  );
}

export default TestResults;
