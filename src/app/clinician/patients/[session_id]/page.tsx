'use client';

/**
 * Pre-consultation brief (storyboard p01-p03), drawn rather than written.
 *
 * The backend still assembles the brief as a workflow (every section gathered
 * in code, one bounded model call for the opening bullets). This screen shows
 * the facts behind it as visuals: the plan as progress rows, bloods as small
 * charts with Meterbolic kept apart from other labs, bloods and lifestyle on
 * one date axis, and the KRAFT curve as a curve. The written brief stays one
 * click away, folded, so nothing it says is lost.
 *
 * The sidebar lens orders the screen: the physician starts from bloods, the
 * therapist from meals, the coach from movement and sleep.
 */

import React, { useMemo, useState } from 'react';
import { Card, Label, Markdown, Pill, Screen, State, T, scrollPaneTo, useAuthed, usePersona } from '../../ui';
import { PERSONAS, type Persona } from '../../persona';
import { LensPanel } from '../../LensCharts';
import {
  BloodsCard, CommitmentChips, KraftCurve, MovingTogether, PlanRows, useLifestyle, useRecord,
} from '../../BriefVisuals';
import {
  CantTellCard, basPoints, planCutoff, plans, Columns, CommittedCard, JudgementCard, PatientAsk, PatientHeader,
  ProvenanceCard, useBetween, usePatientId,
} from './shared';

interface Section { title: string; body: string }

function splitBrief(md: string): { glance: string; sections: Section[] } {
  const withoutHead = md.replace(/^##\s.*\n?/, '');
  const parts = withoutHead.split(/^###\s+/m);
  const glance = (parts.shift() || '').trim();
  const sections = parts.map((p) => {
    const nl = p.indexOf('\n');
    return { title: (nl < 0 ? p : p.slice(0, nl)).trim(), body: (nl < 0 ? '' : p.slice(nl + 1)).trim() };
  });
  return { glance, sections };
}

type Key = 'focus' | 'plan' | 'lens' | 'bloods' | 'together' | 'kraft' | 'commitments' | 'profile' | 'conversations' | 'written';

const ORDER: Record<Persona, Key[]> = {
  physician: ['focus', 'plan', 'bloods', 'together', 'kraft', 'commitments', 'profile', 'conversations', 'written'],
  therapist: ['focus', 'plan', 'lens', 'together', 'bloods', 'commitments', 'kraft', 'profile', 'conversations', 'written'],
  coach: ['focus', 'plan', 'lens', 'together', 'commitments', 'bloods', 'kraft', 'profile', 'conversations', 'written'],
};

const NAV_LABEL: Record<Key, string> = {
  focus: 'Suggested focus', plan: 'Plan since last time', lens: 'Your view', bloods: 'Bloods',
  together: 'Moving together', kraft: 'KRAFT curve', commitments: 'Their commitments',
  profile: 'Profile', conversations: 'Conversations', written: 'Written brief',
};

const secId = (k: Key) => `sec-${k}`;

function Folded({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <details style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '12px 20px' }}>
      <summary style={{ cursor: 'pointer' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.lime }}>{title}</span>
        {note && <span style={{ fontSize: 12, marginLeft: 10 }}>{note}</span>}
      </summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  );
}

export default function BriefPage() {
  const pid = usePatientId();
  const [persona] = usePersona();
  const brief = useAuthed<{ response: string }>(pid ? `/api/clinician/${encodeURIComponent(pid)}/brief?persona=${persona}` : null);
  const between = useBetween(pid);
  const record = useRecord(pid);
  const lifestyle = useLifestyle(pid);
  const [marker, setMarker] = useState<string | null>(null);

  const generatedAt = useMemo(
    () => (brief.data ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null),
    [brief.data],
  );
  const { glance, sections } = useMemo(() => splitBrief(brief.data?.response || ''), [brief.data]);
  const find = (word: string) => sections.find((s) => s.title.toLowerCase().includes(word));
  const profile = find('profile');
  const conversations = find('conversation');

  const lines = plans(between.data);
  const planDate = lines.length ? lines[lines.length - 1].created_at : null;
  const selected = marker
    ?? record.data?.meterbolic.find((m) => m.name === 'Triglyceride')?.name
    ?? record.data?.meterbolic[0]?.name
    ?? null;

  const blocks: Record<Key, React.ReactNode> = {
    focus: glance ? (
      <Card accent="rgba(var(--mc-accent-rgb),0.35)" style={{ padding: '14px 20px' }}>
        <Label color={T.lime} style={{ marginBottom: 6 }}>Suggested focus</Label>
        <Markdown text={glance} />
      </Card>
    ) : brief.loading ? (
      <Card style={{ padding: '14px 20px' }}>
        <Label style={{ marginBottom: 6 }}>Suggested focus</Label>
        <div style={{ fontSize: 13 }}>Preparing the brief…</div>
      </Card>
    ) : null,
    plan: (
      <Card>
        <Label color={T.lime} style={{ marginBottom: 6 }}>Your plan since last time</Label>
        <State loading={between.loading && !between.data} error={between.error}><PlanRows lines={lines} /></State>
      </Card>
    ),
    lens: <LensPanel patientId={pid} persona={persona} basPoints={basPoints(between.data)} planCutoff={planCutoff(between.data)} />,
    bloods: <BloodsCard record={record.data} patientId={pid} selected={selected} onSelect={setMarker} />,
    together: (
      <MovingTogether record={record.data} lifestyle={lifestyle.data} selected={selected} onSelect={setMarker}
        planDate={planDate} dinnerCutoff={planCutoff(between.data)} />
    ),
    kraft: <KraftCurve kraft={record.data?.kraft ?? null} />,
    commitments: (
      <Card>
        <Label color={T.lime} style={{ marginBottom: 8 }}>Their own commitments, made with the coach</Label>
        <CommitmentChips commitments={between.data?.commitments ?? []} />
      </Card>
    ),
    profile: profile ? (
      <Folded title="Profile" note="patient-reported at sign-up"><Markdown text={profile.body || 'Nothing on file.'} /></Folded>
    ) : null,
    conversations: conversations ? (
      <Folded title="Recent conversations" note="summaries of their chats with the coach"><Markdown text={conversations.body || 'Nothing on file.'} /></Folded>
    ) : null,
    written: sections.length ? (
      <Folded title="Read the full written brief" note={`${sections.length} sections, as written from the record`}>
        {sections.map((s) => (
          <div key={s.title} style={{ padding: '10px 0', borderTop: `1px solid ${T.rowBorder}` }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
            <Markdown text={s.body || 'Nothing on file.'} />
          </div>
        ))}
      </Folded>
    ) : null,
  };

  const order = ORDER[persona].filter((k) => blocks[k] != null);

  return (
    <Screen
      header={
        <PatientHeader
          id={pid}
          title="Pre-consultation brief"
          sub={(name) => `${name} · written for ${(PERSONAS.find((p) => p.id === persona)?.label ?? '').toLowerCase()}`}
          right={generatedAt ? <Pill color={T.lime}>Generated {generatedAt}</Pill> : brief.loading ? <Pill>Preparing…</Pill> : null}
        />
      }
      ask={<PatientAsk id={pid} example="show me every reading after a late dinner" />}
    >
      <nav aria-label="Brief sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {order.map((k) => (
          <button
            key={k}
            className="mc-press"
            onClick={() => scrollPaneTo(secId(k))}
            style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '5px 12px', color: T.text, background: T.chip, border: `1px solid ${T.chipBorder}` }}
          >
            {NAV_LABEL[k]}
          </button>
        ))}
      </nav>

      <Columns
        left={order.map((k) => (
          <div key={k} id={secId(k)} style={{ minWidth: 0 }}>{blocks[k]}</div>
        ))}
        right={
          <>
            <ProvenanceCard between={between.data} />
            <CommittedCard between={between.data} />
            <CantTellCard between={between.data} name="they" />
            <JudgementCard />
          </>
        }
      />
    </Screen>
  );
}
