'use client';

import React from 'react';
import { getValidIdToken } from '@/app/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { usePractitionerNotes, NoteCard, fmtNoteDate, shortPractitionerName } from '@/components/record/PractitionerNotes';
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
interface RecordLite { latest?: { bas: number | null; date: string | null; values: Record<string, number> } | null }

function NotesInner() {
  const { ask, busy } = useSectionAssistant();
  const { colors } = useTheme();
  const { notes, state } = usePractitionerNotes();
  const feed = (notes ?? []).filter((n) => n.kind !== 'plan');
  const plan = (notes ?? []).filter((n) => n.kind === 'plan');
  const author = feed[0]?.practitioner_name || plan[0]?.practitioner_name || null;
  const first = shortPractitionerName(author);
  const initial = (author || 'P').replace(/^(dr|prof)\.?\s+/i, '').slice(0, 1).toUpperCase();
  const since = (notes ?? []).length ? fmtNoteDate((notes ?? [])[(notes ?? []).length - 1].created_at) : null;

  // The same record the practitioner reads, for the "what they see" tiles.
  const [record, setRecord] = React.useState<RecordLite | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch('/api/readings', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setRecord(await res.json());
      } catch { /* tiles fall back to dashes */ }
    })();
  }, []);
  const bas = record?.latest?.bas;
  const age = record?.latest?.values?.Age;

  const tiles = [
    { k: 'Biological Age Score', v: bas != null ? bas.toFixed(1) : '—', s: age != null ? `target ${Math.round(age)}, your real age` : 'from your latest reading' },
    // Lines with a count first: a tile of dashes tells the patient less than "5/8".
    ...[...plan].sort((a, b) => Number((b.progress?.expected ?? null) != null && b.progress?.status !== 'no_data')
                              - Number((a.progress?.expected ?? null) != null && a.progress?.status !== 'no_data')).slice(0, 2).map((n) => {
      const p = n.progress;
      const counted = p && p.expected != null && !['no_data', 'too_early', 'not_measurable'].includes(p.status);
      return { k: n.body, v: counted ? `${p!.qualifying_days ?? 0}/${p!.expected}` : '—', s: counted ? `${n.target ?? ''} agreed`.trim() : 'nothing recorded yet' };
    }),
    { k: 'Plan lines', v: String(plan.length), s: 'checked by MeO, set by them' },
  ];

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title={author ? `From ${author}` : 'From your practitioner'}
        subtitle={author ? `Your practitioner${since ? ` since ${since}` : ''}` : "What they've written between appointments, in their words"}
        right={author ? (
          <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(164,214,94,0.2)', color: colors.primary, fontWeight: 700 }}>
            {initial}
          </div>
        ) : undefined}
      />
      <ScreenBody>
      {state === 'loading' && <p style={{ fontSize: 13.5, color: colors.mutedDim }}>Loading…</p>}
      {state === 'error' && <p style={{ fontSize: 13.5, color: colors.muted }}>Couldn&apos;t load your notes. Refresh to try again.</p>}

      {state === 'ready' && feed.length === 0 && (
        <section style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 22px', maxWidth: 560 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Nothing here yet</p>
          <p style={{ fontSize: 13.5, color: colors.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
            When a practitioner reviews your record between visits, what they write appears here, with their name on it.
          </p>
        </section>
      )}

      {/* The frame leads with who this is, then their words in their own box.
          A feed of anonymous advice is the thing we are trying not to be. */}
      {state === 'ready' && feed.length > 0 && (
        <section style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 24px' }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="flex items-center justify-center" style={{ width: 36, height: 36, flex: 'none', borderRadius: '50%', background: 'rgba(164,214,94,0.2)', color: colors.primary, fontWeight: 700 }}>
              {initial}
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700 }}>{author || 'Your practitioner'} reviewed your record</div>
              <div style={{ fontSize: 11.5, color: colors.mutedDim }}>{fmtNoteDate(feed[0].created_at)} · {feed.length} note{feed.length === 1 ? '' : 's'} on file</div>
            </div>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#ffffff', margin: '14px 0 0', padding: '14px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre-wrap' }}>
            &ldquo;{feed[0].body}&rdquo;
          </p>
          <div className="flex flex-wrap" style={{ gap: 10, marginTop: 14 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => ask(`Help me prepare questions for my next consultation with ${author || 'my practitioner'}`)}
              className="meo-press"
              style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer' }}
            >
              Ask MeO to prepare questions
            </button>
          </div>
        </section>
      )}

      {/* "What they see: the same data you do." Nothing is hidden in either direction. */}
      {state === 'ready' && (feed.length > 0 || plan.length > 0) && (
        <section style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '18px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.mutedDim, marginBottom: 12 }}>
            What {first} sees · the same data you do
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {tiles.map((m) => (
              <div key={m.k} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px' }}>
                <div className="truncate" style={{ fontSize: 11.5, color: colors.mutedDim }}>{m.k}</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 2 }}>{m.v}</div>
                <div className="truncate" style={{ fontSize: 11.5, color: colors.mutedDim }}>{m.s}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: colors.muted, margin: '12px 0 0' }}>
            MeO summarises. <b style={{ color: '#ffffff' }}>{first} decides.</b>
          </p>
        </section>
      )}

      {state === 'ready' && feed.length > 1 && (
        <ul className="space-y-3 p-0 m-0">
          {feed.slice(1).map((n) => <NoteCard key={n.id} note={n} />)}
        </ul>
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
