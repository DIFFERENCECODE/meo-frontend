'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { usePractitionerNotes, PlanLine } from '@/components/record/PractitionerNotes';
import { useTheme } from '@/theme/ThemeProvider';

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
    <div className="w-full max-w-3xl mx-auto px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My plan</h1>
        <p className="text-sm mt-1" style={{ color: colors.muted }}>
          Written by your practitioner. MeO checks each line against your own
          data where it can, and says so where it can&apos;t.
        </p>
      </header>

      {state === 'loading' && <p className="text-sm opacity-70">Loading your plan…</p>}
      {state === 'error' && <p className="text-sm opacity-70">Couldn&apos;t load your plan.</p>}

      {state === 'ready' && plan.length === 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <p className="text-sm font-medium">No plan yet.</p>
          <p className="text-sm mt-1" style={{ color: colors.muted }}>
            A plan appears here after a consultation, written by the practitioner
            you book with. Nothing on this screen is generated.
          </p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
          >
            Find a practitioner
          </Link>
        </div>
      )}

      {state === 'ready' && plan.length > 0 && (
        <ul className="space-y-3 p-0 m-0">
          {plan.map((n) => <PlanLine key={n.id} note={n} />)}
        </ul>
      )}
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
