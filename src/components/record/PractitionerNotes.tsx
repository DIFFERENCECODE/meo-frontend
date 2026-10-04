'use client';

import React from 'react';
import { Utensils, Activity, Moon, FlaskConical, CircleDashed, UserRound } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * What a practitioner has written, on the patient's own screen.
 *
 * Two rules are visible in this file rather than left to a comment elsewhere:
 *
 * 1. **Attribution is non-negotiable.** Every note carries a name and a date.
 *    A patient must always be able to tell a human's instruction from the
 *    assistant's, because the two carry different authority and a plan line
 *    that looks like it came from MeO is advice nobody actually gave.
 * 2. **Nothing here is model output.** These strings are stored and rendered
 *    verbatim. The safety guard scans what the model writes; a practitioner's
 *    words are not model output, so summarising them would launder un-scanned
 *    clinical text through a path that looks checked.
 */

export interface PractitionerNote {
  id: number;
  practitioner_id: string;
  practitioner_name: string | null;
  kind: 'note' | 'plan' | string;
  body: string;
  target: string | null;
  source: string | null;
  reading_series: string | null;
  created_at: string;
}

/** What a plan line is checked against. "none" is honest, not a failure. */
export const SOURCE_META: Record<string, { label: string; Icon: typeof Utensils }> = {
  meals: { label: 'checked against your meal log', Icon: Utensils },
  readings: { label: 'checked against your readings', Icon: FlaskConical },
  steps: { label: 'checked against your steps', Icon: Activity },
  sleep: { label: 'checked against your sleep', Icon: Moon },
  none: { label: 'not automatically checked', Icon: CircleDashed },
};

export function fmtNoteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Attribution({ note }: { note: PractitionerNote }) {
  const { colors } = useTheme();
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: colors.muted }}>
      <UserRound className="h-3.5 w-3.5" />
      <span style={{ color: colors.foreground }}>{note.practitioner_name || 'Your practitioner'}</span>
      <span>·</span>
      <time>{fmtNoteDate(note.created_at)}</time>
    </div>
  );
}

export function PlanLine({ note }: { note: PractitionerNote }) {
  const { colors } = useTheme();
  const meta = SOURCE_META[note.source ?? 'none'] ?? SOURCE_META.none;
  const { Icon } = meta;
  const unchecked = (note.source ?? 'none') === 'none';

  return (
    <li
      className="rounded-2xl p-4 list-none"
      style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(164,214,94,0.12)' }}
        >
          <Icon className="h-4 w-4" style={{ color: unchecked ? colors.muted : colors.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{note.body}</p>
          {note.target && (
            <p className="text-sm mt-0.5" style={{ color: colors.primary }}>{note.target}</p>
          )}
          <p className="text-xs mt-2" style={{ color: colors.muted }}>{meta.label}</p>
          <div className="mt-2">
            <Attribution note={note} />
          </div>
        </div>
      </div>
    </li>
  );
}

export function NoteCard({ note }: { note: PractitionerNote }) {
  const { colors } = useTheme();
  return (
    <li
      className="rounded-2xl p-4 list-none"
      style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
    >
      <Attribution note={note} />
      {/* whitespace-pre-wrap: stored verbatim, so rendered verbatim. */}
      <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap">{note.body}</p>
      {note.reading_series && (
        <p className="text-xs mt-2" style={{ color: colors.muted }}>
          About the reading on {note.reading_series.slice(0, 4)}-
          {note.reading_series.slice(4, 6)}-{note.reading_series.slice(6, 8)}
        </p>
      )}
    </li>
  );
}

/** Shared loader so /plan and /from-practitioner never disagree. */
export function usePractitionerNotes() {
  const [notes, setNotes] = React.useState<PractitionerNote[] | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'error'>('loading');

  React.useEffect(() => {
    (async () => {
      try {
        const { getValidIdToken } = await import('@/app/lib/auth');
        const token = await getValidIdToken();
        if (!token) return setState('error');
        const res = await fetch('/api/me/practitioner-notes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return setState('error');
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
        setState('ready');
      } catch {
        setState('error');
      }
    })();
  }, []);

  return { notes, state };
}
