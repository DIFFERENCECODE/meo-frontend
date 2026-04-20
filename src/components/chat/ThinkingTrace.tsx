'use client';

/**
 * ThinkingTrace — collapsible trail of what the agent did before
 * responding, mirroring Claude's "thinking / tool calls" UI.
 *
 * The chat endpoint returns a `steps` array; each step captures one
 * unit of work: reading measurements, classifying intent, retrieving
 * from the knowledge base, computing scores. We render this as a
 * collapsed row with a summary and an expand button. Users who want
 * to audit the reasoning open it; users who just want the answer
 * ignore it entirely.
 */
import React, { useState } from 'react';
import { ChevronRight, Activity, Search, Stethoscope, Sparkles, Database, Shield } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/LanguageContext';

export type TraceStep = {
  kind: 'tool_call' | 'retrieval' | 'analysis' | 'routing' | 'safety' | 'generation';
  title: string;
  details?: string;
  duration_ms?: number;
};

interface Props {
  steps: TraceStep[];
  /** When true, render as a live "Thinking..." shimmer. When false, the
      work is complete — user can still expand to review what happened. */
  live?: boolean;
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const KIND_ICON: Record<TraceStep['kind'], IconComponent> = {
  tool_call: Database as IconComponent,
  retrieval: Search as IconComponent,
  analysis: Activity as IconComponent,
  routing: Sparkles as IconComponent,
  safety: Shield as IconComponent,
  generation: Stethoscope as IconComponent,
};

export function ThinkingTrace({ steps, live = false }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  const totalMs = steps.reduce((sum, s) => sum + (s.duration_ms ?? 0), 0);
  const summary = live
    ? `${t('chat.thinking_live')} ${steps[steps.length - 1]?.title ?? ''}`
    : t('chat.thought_for', { seconds: (totalMs / 1000).toFixed(1), count: steps.length });

  return (
    <div
      className="mb-3 rounded-lg border overflow-hidden"
      style={{
        backgroundColor: `${colors.card}80`,
        borderColor: colors.cardBorder,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronRight className="h-3.5 w-3.5" style={{ color: colors.muted }} />
        </motion.div>
        {live ? (
          <div className="flex items-center gap-1.5">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: colors.primary, animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        ) : (
          <Sparkles className="h-3.5 w-3.5" style={{ color: colors.primary }} />
        )}
        <span className="text-xs flex-1 truncate" style={{ color: colors.muted }}>
          {summary}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className="border-t px-3 py-2 space-y-1.5"
              style={{ borderColor: colors.cardBorder }}
            >
              {steps.map((step, i) => {
                const Icon = KIND_ICON[step.kind] || Activity;
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Icon
                      className="h-3.5 w-3.5 mt-0.5 shrink-0"
                      style={{ color: colors.primary }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ color: colors.foreground }} className="font-medium">
                          {step.title}
                        </span>
                        {step.duration_ms !== undefined && (
                          <span style={{ color: colors.muted }} className="text-[10px]">
                            {step.duration_ms}ms
                          </span>
                        )}
                      </div>
                      {step.details && (
                        <div
                          className="mt-0.5 text-[11px] leading-snug font-mono"
                          style={{ color: `${colors.muted}e0` }}
                        >
                          {step.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThinkingTrace;
