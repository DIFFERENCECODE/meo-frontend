'use client';

import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

interface Insight {
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface InsightsProps {
  insights?: Insight[];
  className?: string;
}

export function Insights({ insights = [], className }: InsightsProps) {
  const { theme } = useTheme();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Lightbulb;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'warning': return { bg: `${theme.colors.warning}15`, border: `${theme.colors.warning}40`, icon: theme.colors.warning };
      case 'success': return { bg: `${theme.colors.success}15`, border: `${theme.colors.success}40`, icon: theme.colors.success };
      default: return { bg: `${theme.colors.primary}15`, border: `${theme.colors.primary}40`, icon: theme.colors.primary };
    }
  };

  if (insights.length === 0) {
    return (
      <div className={`rounded-xl border p-6 ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4" style={{ color: theme.colors.primary }} />
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>AI Insights</h3>
        </div>
        <p className="text-sm" style={{ color: theme.colors.muted }}>Select a patient to view insights</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
      <div className="p-4 border-b" style={{ borderColor: theme.colors.cardBorder }}>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: theme.colors.primary }} />
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>AI Insights</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {insights.map((insight, i) => {
          const Icon = getInsightIcon(insight.type);
          const colors = getInsightColors(insight.type);
          return (
            <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${colors.icon}20` }}>
                  <Icon className="h-4 w-4" style={{ color: colors.icon }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm" style={{ color: theme.colors.foreground }}>{insight.title}</h4>
                    {insight.priority === 'high' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase" style={{ backgroundColor: `${theme.colors.error}20`, color: theme.colors.error }}>
                        High Priority
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.colors.muted }}>{insight.description}</p>
                  {insight.actionable && (
                    <button className="flex items-center gap-1 text-xs font-medium mt-2 hover:underline" style={{ color: theme.colors.primary }}>
                      Take Action <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Insights;
