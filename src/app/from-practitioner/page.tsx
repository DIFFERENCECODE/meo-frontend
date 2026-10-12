'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { usePractitionerNotes, NoteCard, fmtNoteDate } from '@/components/record/PractitionerNotes';
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
  const { ask, busy } = useSectionAssistant();
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

      {/* The frame leads with who this is, not with the notes. A feed of
          anonymous advice is the thing we are trying not to be. */}
      {state === 'ready' && feed.length > 0 && (
        <section
          className="flex items-start"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 22px', gap: 14 }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: 'rgba(164,214,94,0.2)', color: colors.primary, fontWeight: 700, fontSize: 16 }}
          >
            {(feed[0].practitioner_name || 'P').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.foreground }}>
              {feed[0].practitioner_name || 'Your practitioner'} reviewed your record
            </div>
            <div style={{ fontSize: 12.5, color: colors.mutedDim, marginTop: 2 }}>
              {fmtNoteDate(feed[0].created_at)} · {feed.length} note{feed.length === 1 ? '' : 's'} on file
            </div>
            <p style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.6, marginTop: 10 }}>
              “{feed[0].body}”
            </p>
            <div className="flex" style={{ gap: 8, marginTop: 12 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => ask('Help me prepare questions for my next consultation')}
                className="no-underline"
                style={{
                  fontSize: 12, fontWeight: 700, color: colors.primary,
                  background: 'rgba(164,214,94,0.12)', border: '1px solid rgba(164,214,94,0.3)',
                  borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap',
                }}
              >
                Ask MeO to prepare questions
              </button>
            </div>
          </div>
        </section>
      )}

      {/* "What they see — the same data you do." The frame's point is that
          nothing is hidden in either direction. */}
      {state === 'ready' && feed.length > 0 && (
        <section
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 22px' }}
        >
          <div className="t-label" style={{ color: colors.mutedDim, marginBottom: 12 }}>
            What they see — the same data you do
          </div>
          <div className="flex flex-wrap" style={{ gap: 28 }}>
            {[
              { k: 'Your readings', v: 'all of them', s: 'every panel on your record' },
              { k: 'Your plan', v: `${(notes ?? []).filter((n) => n.kind === 'plan').length} lines`, s: 'with what happened beside each' },
              { k: 'Flags', v: 'their thresholds', s: 'not a population range' },
            ].map((m) => (
              <div key={m.k}>
                <div style={{ fontSize: 11.5, color: colors.mutedDim }}>{m.k}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: colors.foreground, letterSpacing: '-0.025em', marginTop: 2 }}>{m.v}</div>
                <div style={{ fontSize: 11.5, color: colors.mutedDim }}>{m.s}</div>
              </div>
            ))}
          </div>
        </section>
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
