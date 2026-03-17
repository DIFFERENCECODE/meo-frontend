'use client';

import React from 'react';
import { Pill, Dumbbell, Apple, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

// Mock interventions data
const mockInterventions = [
  {
    id: '1',
    type: 'lifestyle',
    title: 'Increase Physical Activity',
    description: 'Recommend 150 min/week moderate exercise. Focus on resistance training.',
    icon: Dumbbell,
    status: 'active',
    progress: 60,
  },
  {
    id: '2',
    type: 'nutrition',
    title: 'Low Glycemic Diet Plan',
    description: 'Implement carb-controlled meal plan with fiber-rich foods.',
    icon: Apple,
    status: 'active',
    progress: 45,
  },
  {
    id: '3',
    type: 'medication',
    title: 'Metformin 500mg',
    description: 'Once daily with evening meal. Monitor for GI side effects.',
    icon: Pill,
    status: 'pending',
    progress: 0,
  },
  {
    id: '4',
    type: 'monitoring',
    title: 'CGM Monitoring',
    description: 'Continuous glucose monitoring for 14 days to assess patterns.',
    icon: Clock,
    status: 'completed',
    progress: 100,
  },
];

interface InterventionsProps {
  className?: string;
}

export function Interventions({ className }: InterventionsProps) {
  const { theme } = useTheme();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'active':
        return Circle;
      default:
        return Circle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'active':
        return theme.colors.primary;
      default:
        return theme.colors.muted;
    }
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
          Active Interventions
        </h3>
        <p className="text-xs mt-1" style={{ color: theme.colors.muted }}>
          Current treatment plan and recommendations
        </p>
      </div>

      {/* Interventions List */}
      <div className="p-4 space-y-3">
        {mockInterventions.map((intervention) => {
          const StatusIcon = getStatusIcon(intervention.status);
          const statusColor = getStatusColor(intervention.status);
          const Icon = intervention.icon;

          return (
            <div
              key={intervention.id}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.cardBorder,
                opacity: intervention.status === 'completed' ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: theme.colors.accent }}
                >
                  <Icon className="h-4 w-4" style={{ color: theme.colors.primary }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-medium text-sm truncate"
                      style={{
                        color: theme.colors.foreground,
                        textDecoration:
                          intervention.status === 'completed'
                            ? 'line-through'
                            : 'none',
                      }}
                    >
                      {intervention.title}
                    </h4>
                    <StatusIcon
                      className="h-4 w-4 flex-shrink-0"
                      style={{
                        color: statusColor,
                        fill:
                          intervention.status === 'completed'
                            ? statusColor
                            : 'transparent',
                      }}
                    />
                  </div>
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: theme.colors.muted }}
                  >
                    {intervention.description}
                  </p>

                  {/* Progress Bar (for active interventions) */}
                  {intervention.status === 'active' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: theme.colors.muted }}>Progress</span>
                        <span style={{ color: theme.colors.primary }}>
                          {intervention.progress}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${intervention.progress}%`,
                            backgroundColor: theme.colors.primary,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Button */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-2 rounded-lg border-2 border-dashed text-sm font-medium transition-colors"
          style={{
            borderColor: theme.colors.cardBorder,
            color: theme.colors.muted,
          }}
        >
          + Add Intervention
        </button>
      </div>
    </div>
  );
}

export default Interventions;
