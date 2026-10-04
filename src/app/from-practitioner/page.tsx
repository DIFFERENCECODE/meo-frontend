'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { usePractitionerNotes, NoteCard } from '@/components/record/PractitionerNotes';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';

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
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="From your practitioner"
        subtitle="What they've written between appointments, in their words"
        right={feed.length ? <Chip>{feed.length} notes</Chip> : undefined}
      />
      <ScreenBody>
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

      {/* The frame states the division of labour out loud. It is the whole
          safety argument for this screen in four words. */}
      {state === 'ready' && feed.length > 0 && (
        <p style={{ fontSize: 11.5, color: colors.mutedDim, lineHeight: 1.5, paddingTop: 4 }}>
          <b style={{ color: colors.foreground }}>MeO summarises. Your practitioner decides.</b>{' '}
          Nothing on this screen is written or reworded by the model.
        </p>
      )}
      </ScreenBody>
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
