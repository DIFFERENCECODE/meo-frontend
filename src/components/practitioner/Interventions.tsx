'use client';

import React from 'react';
import { Pill, Dumbbell, Apple, Clock, CheckCircle2, Circle, Activity } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

interface Intervention {
  type: 'lifestyle' | 'nutrition' | 'medication' | 'monitoring';
  title: string;
  description: string;
  status: 'active' | 'pending' | 'completed';
  progress?: number;
}

interface InterventionsProps {
  interventions?: Intervention[];
  className?: string;
}

const typeIcons = {
  lifestyle: Dumbbell,
  nutrition: Apple,
  medication: Pill,
  monitoring: Clock,
};

export function Interventions({ interventions = [], className }: InterventionsProps) {
  const { theme } = useTheme();

  const getStatusIcon = (status: string) => status === 'completed' ? CheckCircle2 : Circle;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'active': return theme.colors.primary;
      default: return theme.colors.muted;
    }
  };

  if (interventions.length === 0) {
    return (
      <div className={`rounded-xl border p-6 ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4" style={{ color: theme.colors.primary }} />
          <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>Active Interventions</h3>
        </div>
        <p className="text-sm" style={{ color: theme.colors.muted }}>No interventions recorded for this patient</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${className || ''}`} style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }}>
      <div className="p-4 border-b" style={{ borderColor: theme.colors.cardBorder }}>
        <h3 className="font-semibold" style={{ color: theme.colors.foreground }}>Active Interventions</h3>
        <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>Current treatment plan and recommendations</p>
      </div>

      <div className="p-4 space-y-3">
        {interventions.map((intervention, i) => {
          const StatusIcon = getStatusIcon(intervention.status);
          const statusColor = getStatusColor(intervention.status);
          const Icon = typeIcons[intervention.type] || Activity;

          return (
            <div
              key={i}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.cardBorder,
                opacity: intervention.status === 'completed' ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.accent }}>
                  <Icon className="h-4 w-4" style={{ color: theme.colors.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-medium text-sm truncate"
                      style={{ color: theme.colors.foreground, textDecoration: intervention.status === 'completed' ? 'line-through' : 'none' }}
                    >
                      {intervention.title}
                    </h4>
                    <StatusIcon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: statusColor, fill: intervention.status === 'completed' ? statusColor : 'transparent' }}
                    />
                  </div>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: theme.colors.muted }}>{intervention.description}</p>
                  {intervention.status === 'active' && intervention.progress !== undefined && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: theme.colors.muted }}>Progress</span>
                        <span style={{ color: theme.colors.primary }}>{intervention.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.colors.accent }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${intervention.progress}%`, backgroundColor: theme.colors.primary }} />
                      </div>
                    </div>
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

export default Interventions;
