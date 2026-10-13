'use client';

/**
 * Pieces shared by the four views of one patient (brief, needs review, between
 * visits, after the session). Everything here renders stored or counted facts:
 * plan verdicts come from the Truth Engine (app/services/plan_progress.py), and
 * where the data cannot answer a question the card says so instead of guessing.
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { FlaskConical, Hospital, PencilLine, Utensils, Footprints, Moon } from 'lucide-react';
import { AskBar, Card, Label, PageHeader, PatientTabs, T, firstName, useAuthed, usePatient } from '../../ui';
import type { PlanProgress } from '@/components/record/PractitionerNotes';

export interface Note {
  id: number;
  kind: 'note' | 'plan' | string;
  body: string;
  target: string | null;
  source: string | null;
  practitioner_name: string | null;
  created_at: string;
  progress?: PlanProgress | null;
}
export interface Reading {
  date: string | null;
  kind: string | null;
  bas: number | null;
  has_score: boolean;
  captured_by: string | null;
  marker_count: number;
}
export interface Commitment {
  commitment?: string;
  category?: string;
  timeframe?: string;
  committed_at?: string;
  created_at?: string;
  followed_up?: boolean;
}
export interface MealEvent { at: string; meal: string; time: string; meets_line: boolean | null; line: string }
export interface Between {
  meal_log?: MealEvent[];
  readings: Reading[];
  commitments: Commitment[];
  notes: Note[];
  lifestyle_available: boolean;
  lifestyle_note: string;
}

export function usePatientId(): string {
  const p = useParams();
  const v = p?.session_id;
  return Array.isArray(v) ? v[0] : (v as string) || '';
}

export function useBetween(id: string) {
  return useAuthed<Between>(id ? `/api/clinician/${encodeURIComponent(id)}/between` : null);
}

export const VERDICT: Record<string, { label: string; color: string }> = {
  on_track: { label: 'On track', color: T.lime },
  partial: { label: 'Partly', color: T.amber },
  off_track: { label: 'Well short', color: T.orange },
  no_data: { label: 'Nothing recorded', color: T.dim },
  tracked: { label: 'Counted', color: T.blue },
  too_early: { label: 'Too early to tell', color: T.dim },
  not_measurable: { label: 'Not checked', color: T.dim },
  not_shared: { label: 'Not shared', color: T.dim },
  unavailable: { label: "Couldn't check", color: T.dim },
};

export const SOURCE_LABEL: Record<string, string> = {
  meals: 'checked from the food log',
  steps: 'checked from step data',
  sleep: 'checked from sleep data',
  readings: 'checked from the meter',
  none: 'not checked automatically',
};

export function fmtDay(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function plans(b?: Between | null): Note[] {
  return (b?.notes ?? []).filter((n) => n.kind === 'plan');
}

/** "5/8": qualifying of expected, or the verdict word when there is no count. */
export function fraction(n: Note): string | null {
  const p = n.progress;
  if (!p || p.expected == null || p.status === 'no_data' || p.status === 'too_early') return null;
  return `${p.qualifying_days ?? 0}/${p.expected}`;
}

/** Screen header for one patient: title, who and why, and the four views. */
export function PatientHeader({ id, title, sub, right }: { id: string; title: string; sub: (name: string) => string; right?: React.ReactNode }) {
  const { data } = usePatient(id);
  const name = data?.patient_name || '…';
  return (
    <>
      <PageHeader title={title} sub={sub(name)} right={right} />
      <div style={{ padding: '12px 28px 0' }}>
        <PatientTabs id={id} />
      </div>
    </>
  );
}

export function PatientAsk({ id, example }: { id: string; example: string }) {
  const { data } = usePatient(id);
  return <AskBar patientId={id} placeholder={`Ask MeO about ${firstName(data?.patient_name)}: "${example}"`} />;
}

// ─── Right-column cards ───────────────────────────────────────────────────────

/** Where the numbers came from. A source with nothing behind it reads as such. */
export function ProvenanceCard({ between }: { between: Between | null }) {
  const readings = between?.readings ?? [];
  const n = (k: string) => readings.filter((r) => r.kind === k).length;
  const lines = plans(between);
  const lifestyle = (src: string) => {
    const l = lines.find((x) => x.source === src && x.progress && !['not_shared', 'unavailable'].includes(x.progress.status));
    if (!l?.progress) return null;
    return l.progress.status === 'no_data' ? 'nothing in 14 days' : `${l.progress.qualifying_days ?? 0} of 14 days`;
  };
  const rows = [
    { label: 'Meter, at home', Icon: FlaskConical, value: n('panel') ? `${n('panel')} readings` : null },
    { label: 'Lab / clinic', Icon: Hospital, value: n('insulin') ? `${n('insulin')} panel${n('insulin') === 1 ? '' : 's'}` : null },
    { label: 'Typed by the patient', Icon: PencilLine, value: n('body') ? `${n('body')} entries` : null },
    { label: 'Food log', Icon: Utensils, value: lifestyle('meals') },
    { label: 'Steps', Icon: Footprints, value: lifestyle('steps') },
    { label: 'Sleep', Icon: Moon, value: lifestyle('sleep') },
  ];
  return (
    <Card>
      <Label style={{ marginBottom: 8 }}>Where these numbers came from</Label>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', opacity: r.value ? 1 : 0.55 }}>
          <r.Icon size={15} color={r.value ? T.lime : T.dim} aria-hidden />
          <div style={{ flex: 1, fontSize: 13, color: T.muted }}>{r.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: r.value ? T.text : T.dim }}>{r.value ?? 'not connected'}</div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: T.dim, marginTop: 8 }}>No value in this brief was inferred by a model.</div>
    </Card>
  );
}

/** What the practitioner agreed with them, and how each line has gone. */
export function CommittedCard({ between, title = 'What they committed to' }: { between: Between | null; title?: string }) {
  const lines = plans(between);
  if (!lines.length) {
    return (
      <Card>
        <Label style={{ marginBottom: 6 }}>{title}</Label>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
          No plan yet. Lines you write after the session are checked here from then on.
        </div>
      </Card>
    );
  }
  const first = lines[lines.length - 1];
  return (
    <Card>
      <Label color={T.lime} style={{ marginBottom: 6 }}>{title}</Label>
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginBottom: 12 }}>
        Agreed {fmtDay(first.created_at)} with {first.practitioner_name || 'you'}. MeO has checked each line since.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 14 }}>
        {lines.map((l) => {
          const v = VERDICT[l.progress?.status ?? ''] ?? VERDICT.unavailable;
          const f = fraction(l);
          return (
            <div key={l.id} title={l.progress?.summary}>
              <div style={{ fontSize: f ? 24 : 14, fontWeight: 800, letterSpacing: '-0.025em', color: v.color, lineHeight: 1.2 }}>
                {f ?? v.label}
              </div>
              <div style={{ fontSize: 11.5, color: T.dim, marginTop: 3, lineHeight: 1.35 }}>{l.body}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** The questions only the practitioner can ask, derived from what is missing. */
export function CantTellCard({ between, name }: { between: Between | null; name: string }) {
  const lines = plans(between);
  const silent = lines.filter((l) => l.progress?.status === 'no_data');
  const short = lines.filter((l) => l.progress && ['partial', 'off_track'].includes(l.progress.status));
  const said: string[] = [];
  if (short.length) {
    said.push(`Why "${short[0].body}" is landing ${short[0].progress?.status === 'partial' ? 'some nights but not others' : 'so rarely'}: the log shows when, not why.`);
  }
  if (silent.length) {
    said.push(`Whether "${silent[0].body}" is happening. Nothing was recorded, which is not the same as not done.`);
  }
  if (!said.length) said.push(`How ${name} feels about the plan. The record shows what happened, not how it felt.`);
  return (
    <Card>
      <Label style={{ marginBottom: 6 }}>What the data can&apos;t tell you</Label>
      {said.map((s) => (
        <div key={s} style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginTop: 4 }}>{s}</div>
      ))}
      <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginTop: 4 }}>MeO hasn&apos;t asked. That&apos;s yours.</div>
    </Card>
  );
}

export function JudgementCard() {
  return (
    <Card style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55 }}>
      MeO summarises and organises. <strong style={{ color: T.text }}>You make every clinical judgement.</strong> No
      diagnosis and no treatment suggestion anywhere in this view.
    </Card>
  );
}

/** Two columns as in the frames: the record on the left, context on the right. */
export function Columns({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>{left}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>{right}</div>
    </div>
  );
}
