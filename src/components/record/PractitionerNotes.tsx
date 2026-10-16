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
  /** Plan lines only: the Truth Engine's count, computed server-side. */
  progress?: PlanProgress | null;
}

export interface PlanProgress {
  status: string;
  summary: string;
  qualifying_days?: number;
  expected?: number | null;
  window_days?: number;
}

/**
 * The verdict words, fixed here so the patient, the practitioner and the
 * coach all say the same thing. "Nothing recorded" is deliberately not red:
 * not logging something is not the same as not doing it.
 */
export const PROGRESS_META: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On track', color: 'var(--mc-accent)' },
  partial: { label: 'Partly there', color: 'var(--mc-amber)' },
  off_track: { label: 'Behind', color: 'var(--mc-orange)' },
  no_data: { label: 'Nothing recorded yet', color: 'var(--mc-text)' },
  tracked: { label: 'Counting', color: 'var(--mc-blue)' },
  too_early: { label: 'Too early to tell', color: 'var(--mc-text)' },
  not_measurable: { label: 'Not checked automatically', color: 'var(--mc-text)' },
  not_shared: { label: 'Data not shared', color: 'var(--mc-text)' },
  unavailable: { label: "Couldn't check", color: 'var(--mc-text)' },
};

export function ProgressBadge({ progress }: { progress?: PlanProgress | null }) {
  const { colors } = useTheme();
  if (!progress) return null;
  const meta = PROGRESS_META[progress.status] ?? PROGRESS_META.unavailable;
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
      <span
        style={{
          fontSize: 11, fontWeight: 700, color: meta.color, whiteSpace: 'nowrap',
          border: `1px solid ${meta.color}`, borderRadius: 999, padding: '2px 9px',
          background: 'rgba(var(--mc-fg-rgb),0.04)',
        }}
      >
        {meta.label}
      </span>
      {progress.summary && progress.status !== 'not_measurable' && (
        <span style={{ fontSize: 12, color: colors.muted }}>{progress.summary}</span>
      )}
    </div>
  );
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
    <div className="flex items-center gap-2 t-body2" style={{ color: colors.muted }}>
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
          className="h-9 w-9 shrink-0 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(var(--mc-accent-rgb),0.12)' }}
        >
          <Icon className="h-4 w-4" style={{ color: unchecked ? colors.muted : colors.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="t-lead font-semibold">{note.body}</p>
          {note.target && (
            <p className="t-lead mt-0.5" style={{ color: colors.primary }}>{note.target}</p>
          )}
          <p className="t-body2 mt-2" style={{ color: colors.muted }}>{meta.label}</p>
          {note.progress && (
            <div className="mt-2">
              <ProgressBadge progress={note.progress} />
            </div>
          )}
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
      <p className="t-lead mt-2 leading-relaxed whitespace-pre-wrap">{note.body}</p>
      {note.reading_series && (
        <p className="t-body2 mt-2" style={{ color: colors.muted }}>
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


/**
 * The patient's practitioner, when they have one. Drives the "Dr X's
 * assistant" identity in chat: the assistant works for a named human and
 * says so, which is both honest and the reason a plan gets followed.
 */
export function useMyPractitioner() {
  const [practitioner, setPractitioner] = React.useState<{ id: string; name: string | null } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { getValidIdToken } = await import('@/app/lib/auth');
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch('/api/me/practitioner', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setPractitioner(data?.practitioner ?? null);
      } catch {
        /* no practitioner shown; chat works unchanged */
      }
    })();
  }, []);

  return practitioner;
}


/**
 * How the patient refers to their practitioner in a sentence: "Dr Sen" when
 * the name carries a title (a consultant is not "Arup" to his patients), the
 * first name otherwise, as a nutritional therapist usually is.
 */
export function shortPractitionerName(full?: string | null): string {
  const name = (full || '').trim();
  if (!name) return 'your practitioner';
  const m = name.match(/^(dr|prof)\.?\s+(.+)$/i);
  if (m) {
    const parts = m[2].trim().split(/\s+/);
    return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${parts[parts.length - 1]}`;
  }
  return name.split(/\s+/)[0];
}
