'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { usePractitionerNotes, PlanLine, fmtNoteDate } from '@/components/record/PractitionerNotes';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';

/**
 * My plan — the practitioner's plan, not a generated one.
 *
 * The distinction matters and is the reason this screen is worth building.
 * The mobile app has a *calculated* plan: targets derived from onboarding by
 * planCalculator.ts. This is the other thing — what a named human told this
 * patient to do, with a check attached where one is possible.
 *
 * MeO's job here is narrow on purpose: it holds the lines and says what each
 * one is measured against. It does not write them, rank them, or soften them.
 */
function PlanInner() {
  const { colors } = useTheme();
  const { notes, state } = usePractitionerNotes();
  const plan = (notes ?? []).filter((n) => n.kind === 'plan');

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="My plan"
        subtitle={plan.length ? 'Set by your practitioner · reviewed at every consult' : 'Written by your practitioner after a consultation'}
        right={plan.length ? <Chip>{plan.length} lines</Chip> : undefined}
      />
      <ScreenBody>
      {state === 'loading' && <p className="t-lead opacity-70">Loading your plan…</p>}
      {state === 'error' && <p className="t-lead opacity-70">Couldn&apos;t load your plan.</p>}

      {state === 'ready' && plan.length === 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <p className="t-lead font-medium">No plan yet.</p>
          <p className="t-lead mt-1" style={{ color: colors.muted }}>
            A plan appears here after a consultation, written by the practitioner
            you book with. Nothing on this screen is generated.
          </p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 px-4 py-2.5 rounded-[10px] t-lead font-semibold"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Find a practitioner
          </Link>
        </div>
      )}

      {/* The frame opens with who wrote the plan and why, in their words. A
          plan with no author is advice from nobody. */}
      {state === 'ready' && plan.length > 0 && (
        <section
          className="flex items-start"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 22px', gap: 14 }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: 'rgba(164,214,94,0.2)', color: colors.primary, fontWeight: 700, fontSize: 16 }}
          >
            {(plan[0].practitioner_name || 'P').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>
              {plan[0].practitioner_name || 'Your practitioner'}
            </div>
            <div style={{ fontSize: 12.5, color: colors.mutedDim, marginTop: 2 }}>
              wrote this plan on {fmtNoteDate(plan[plan.length - 1].created_at)}
            </div>
          </div>
          <span
            style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: colors.device, background: 'rgba(124,197,216,0.12)',
              border: '1px solid rgba(124,197,216,0.3)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
            }}
          >
            your practitioner
          </span>
        </section>
      )}

      {state === 'ready' && plan.length > 0 && (
        <div className="flex items-baseline" style={{ gap: 10 }}>
          <div className="t-label" style={{ color: colors.mutedDim }}>What they asked for</div>
          <div style={{ fontSize: 11.5, color: colors.mutedDim }}>MeO checks each one</div>
        </div>
      )}

      {state === 'ready' && plan.length > 0 && (
        <ul className="space-y-3 p-0 m-0">
          {plan.map((n) => <PlanLine key={n.id} note={n} />)}
        </ul>
      )}

      {/* The frame's closing line, and the rule it states is the real one:
          the practitioner sets the plan, MeO only checks it. */}
      {state === 'ready' && plan.length > 0 && (
        <p style={{ fontSize: 11.5, color: colors.mutedDim, lineHeight: 1.5, paddingTop: 4 }}>
          Your practitioner sets the plan. MeO only checks it against what your
          meter and phone already record — it never writes or changes a line.
        </p>
      )}
      </ScreenBody>
    </div>
  );
}

export default function PlanPage() {
  return (
    <AppShell askPlaceholder="Ask MeO about your plan…">
      <PlanInner />
    </AppShell>
  );
}
