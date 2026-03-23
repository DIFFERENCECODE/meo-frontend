'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

interface TestResult {
  name: string;
  value: number;
  unit: string;
  range?: string;
  status: 'high' | 'low' | 'normal';
  trend?: 'up' | 'down' | 'stable';
}

interface TestResultsProps {
  results?: TestResult[];
  lastUpdated?: string;
  className?: string;
}

export function TestResults({ results = [], lastUpdated, className }: TestResultsProps) {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return theme.colors.error;
      case 'low': return theme.colors.warning;
      case 'normal': return theme.colors.success;
      default: return theme.colors.muted;
    }
  };

  const TrendIcon = ({ trend }: { trend?: string }) => {
    const color = trend === 'down' ? theme.colors.success : trend === 'up' ? theme.colors.error : theme.colors.muted;
    if (trend === 'up') return <TrendingUp className="h-3 w-3" style={{ color }} />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" style={{ color }} />;
    return <Minus className="h-3 w-3" style={{ color }} />;
  };

  if (results.length === 0) {
    return (
      <div className={`rounded-xl border p-6 ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
        <h3 className="font-semibold mb-2" style={{ color: theme.colors.foreground }}>Recent Test Results</h3>
        <p className="text-sm" style={{ color: theme.colors.muted }}>Select a patient to view results</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
      <div className="p-4 border-b" style={{ borderColor: theme.colors.cardBorder }}>
        <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>Recent Test Results</h3>
        {lastUpdated && <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>Last updated: {lastUpdated}</p>}
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {results.map((result, i) => (
          <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: theme.colors.muted }}>{result.name}</span>
              <TrendIcon trend={result.trend} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold" style={{ color: getStatusColor(result.status) }}>{result.value}</span>
              <span className="text-xs" style={{ color: theme.colors.muted }}>{result.unit}</span>
            </div>
            {result.range && <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>Ref: {result.range}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestResults;
