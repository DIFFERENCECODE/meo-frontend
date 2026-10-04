'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { usePractitionerNotes, NoteCard } from '@/components/record/PractitionerNotes';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The half of the loop that was missing.
 *
 * Until this existed, everything flowed one way: the patient produced readings
 * and conversations and the practitioner read them. Nothing came back except at
 * the next appointment. This is where a practitioner's words land between
 * visits — attributed, verbatim, and never rewritten by the model.
 */
function NotesInner() {
  const { colors } = useTheme();
  const { notes, state } = usePractitionerNotes();
  const feed = (notes ?? []).filter((n) => n.kind !== 'plan');

  return (
    <div className="w-full px-7 py-8">
      <header className="mb-6">
        <h1 className="t-head font-bold">From your practitioner</h1>
        <p className="t-lead mt-1" style={{ color: colors.muted }}>
          What they&apos;ve written between appointments, in their words.
        </p>
      </header>

      {state === 'loading' && <p className="t-lead opacity-70">Loading…</p>}
      {state === 'error' && <p className="t-lead opacity-70">Couldn&apos;t load your notes.</p>}

      {state === 'ready' && feed.length === 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <p className="t-lead font-medium">Nothing here yet.</p>
          <p className="t-lead mt-1" style={{ color: colors.muted }}>
            When a practitioner reviews your record between visits, what they
            write appears here — with their name on it.
          </p>
        </div>
      )}

      {state === 'ready' && feed.length > 0 && (
        <ul className="space-y-3 p-0 m-0">
          {feed.map((n) => <NoteCard key={n.id} note={n} />)}
        </ul>
      )}
    </div>
  );
}

export default function FromPractitionerPage() {
  return (
    <AppShell askPlaceholder="Ask MeO about this…">
      <NotesInner />
    </AppShell>
  );
}
