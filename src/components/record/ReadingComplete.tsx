'use client';

import React from 'react';
import Link from 'next/link';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { ArrowDown, ArrowUp, Minus, TrendingUp, MessageSquare, Lock } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody } from '@/components/layout/ScreenHeader';
import {
  RecordResponse,
  LABELS,
  DELTA_ORDER,
  CAPTURE_LABEL,
  fmtDate,
} from '@/components/record/RecordHome';

/**
 * The moment a reading lands.
 *
 * The storyboard calls this frame "completion = attribution": the score moved,
 * and here is what moved it. We can honour half of that today and must not fake
 * the other half — see WhatChanged below.
 */

function Arrow({ direction, improved }: { direction: string; improved: boolean | null }) {
  const { colors } = useTheme();
  // Direction is geometry, colour is judgement. HDL falling is a down arrow and
  // a bad thing; triglycerides falling is a down arrow and a good one, so the
  // two are deliberately separated rather than inferred from each other.
  const tone = improved === null ? colors.muted : improved ? colors.primary : '#f97316';
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  return <Icon className="h-4 w-4 shrink-0" style={{ color: tone }} />;
}

/**
 * What changed, ranked by how far each biomarker moved.
 *
 * The storyboard frame says "What moved it" and annotates each row with its
 * share of the score change — "most of the drop", "helped a little". We cannot
 * say that yet and will not pretend to: a proportional attribution needs the
 * METS-IR → METS-VF decomposition, which lives in bang, and inventing a ranking
 * here would be the same mistake as the brief inventing "(device)" on values
 * whose capture method was never recorded.
 *
 * So this ranks by magnitude of change, which is true and computable from the
 * record we already have, and says plainly what it is not. When bang can
 * attribute, this section gains the share column and the heading becomes the
 * causal one.
 */
function WhatChanged({ record }: { record: RecordResponse }) {
  const { colors } = useTheme();
  const keys = DELTA_ORDER.filter((k) => record.delta[k]);
  if (keys.length === 0) return null;

  const ranked = [...keys].sort((a, b) => {
    const pct = (k: string) => {
      const d = record.delta[k];
      return d.from ? Math.abs(d.change / d.from) : 0;
    };
    return pct(b) - pct(a);
  });

  return (
    <section
      className="rounded-2xl p-5"
      style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      <h2 className="t-label mb-4" style={{ color: colors.mutedDim }}>
        What changed most
      </h2>

      <div className="space-y-0">
        {ranked.map((key, i) => {
          const d = record.delta[key];
          const meta = LABELS[key] ?? { label: key, unit: '' };
          const pct = d.from ? Math.abs(d.change / d.from) * 100 : 0;
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 py-3"
              style={{ borderTop: i === 0 ? undefined : `1px solid ${colors.cardBorder}` }}
            >
              <span className="t-lead w-full sm:w-auto sm:flex-1">{meta.label}</span>
              <span className="t-lead tabular-nums" style={{ color: colors.foreground }}>
                {d.from} <span style={{ color: colors.muted }}>→</span>{' '}
                <span className="font-semibold">{d.to}</span>
              </span>
              <Arrow direction={d.direction} improved={d.improved} />
              <span className="t-body2 w-20 text-right tabular-nums" style={{ color: colors.muted }}>
                {d.direction === 'flat' ? 'no change' : `${pct.toFixed(0)}%`}
              </span>
            </div>
          );
        })}
      </div>

      <p className="t-dense mt-4 leading-relaxed" style={{ color: colors.muted }}>
        Ranked by how far each value moved. This comparison does not show how
        much each measurement contributed to your score.
      </p>
    </section>
  );
}

export function ReadingComplete({ record }: { record: RecordResponse }) {
  const { ask, busy } = useSectionAssistant();
  const { colors } = useTheme();
  const latest = record.latest;
  if (!latest) return null;

  const previous = record.previous;
  const basNow = latest.bas;
  const basPrev = previous?.bas ?? null;
  const basDelta = basNow != null && basPrev != null ? basNow - basPrev : null;
  const capture = latest.captured_by ? CAPTURE_LABEL[latest.captured_by] : null;

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title={`Reading ${record.panel_count} saved`}
        subtitle={[fmtDate(latest.date), latest.fasted ? 'fasted' : null, capture]
          .filter(Boolean)
          .join(' · ')}
      />
      <ScreenBody>
      {/* Score. A reading with no score is the common case, not an error state —
          the engine refuses rather than guessing when inputs fall outside the
          range the score is valid over, and saying so is the honest screen. */}
      <section
        className="rounded-2xl p-5"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        <h2 className="t-dense font-bold uppercase tracking-[0.14em] mb-3" style={{ color: colors.muted }}>
          {basDelta != null ? 'Score recomputed' : 'Biological Age Score'}
        </h2>

        {basNow != null ? (
          <div className="flex items-end gap-4 flex-wrap">
            {basPrev != null && (
              <span className="t-head font-semibold line-through" style={{ color: colors.muted }}>
                {basPrev.toFixed(1)}
              </span>
            )}
            <span className="t-metric-xl" style={{ color: colors.primary }}>
              {basNow.toFixed(1)}
            </span>
            {basDelta != null && (
              <span
                className="t-lead font-medium pb-2"
                style={{ color: basDelta < 0 ? colors.primary : '#f97316' }}
              >
                {basDelta < 0 ? '▼' : '▲'} {Math.abs(basDelta).toFixed(1)}
              </span>
            )}
          </div>
        ) : (
          <div className="flex gap-2 items-start">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#f97316' }} />
            <p className="t-lead" style={{ color: '#f97316' }}>
              This reading has no score. A score needs a full set of plausible
              fasting values — the engine returns nothing rather than a number it
              can&apos;t stand behind.
            </p>
          </div>
        )}

        {basDelta != null && (
          <p className="t-lead mt-3" style={{ color: colors.muted }}>
            {record.panel_count < 3
              ? 'Two points make a line. A few more make a direction.'
              : 'Compared with your own last reading, not a population range.'}
          </p>
        )}
      </section>

      <WhatChanged record={record} />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/trends"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] t-lead font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          <TrendingUp className="h-4 w-4" /> See my trend
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => ask('What does my latest reading mean?')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] t-lead transition-colors hover:bg-transparent/5"
          style={{ color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
        >
          <MessageSquare className="h-4 w-4" /> Ask MeO what this means
        </button>
      </div>
      </ScreenBody>
    </div>
  );
}

export default ReadingComplete;
