'use client';

/**
 * Profile (storyboard p01-p03): the person as a whole, drawn rather than written.
 *
 * Who they are in their own words first, then the facts as visuals: the plan
 * as progress rows, bloods as small charts with Meterbolic kept apart from
 * other labs, bloods and lifestyle on one date axis, and the KRAFT curve as a
 * curve.
 *
 * The written brief is still assembled by the backend as a workflow (every
 * section gathered in code, one bounded model call for the opening bullets).
 * Its suggested focus, recent conversations and full text are chips on the ask
 * bar: one tap puts that section into the thread, so nothing it says is lost
 * and follow-up questions land in the same place.
 *
 * The sidebar lens orders the screen: the physician starts from bloods, the
 * therapist from meals, the coach from movement and sleep.
 */

import React, { useMemo, useState } from 'react';
import { Card, Label, Pill, Screen, State, T, scrollPaneTo, useAuthed, usePersona, type AskChip } from '../../ui';
import { PERSONAS, type Persona } from '../../persona';
import { LensPanel } from '../../LensCharts';
import { ProfileCard } from '../../ProfileCard';
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

type Key = 'about' | 'plan' | 'lens' | 'bloods' | 'together' | 'kraft' | 'commitments';

const ORDER: Record<Persona, Key[]> = {
  physician: ['about', 'plan', 'bloods', 'together', 'kraft', 'commitments'],
  therapist: ['about', 'plan', 'lens', 'together', 'bloods', 'commitments', 'kraft'],
  coach: ['about', 'plan', 'lens', 'together', 'commitments', 'bloods', 'kraft'],
};

const NAV_LABEL: Record<Key, string> = {
  about: 'In their words', plan: 'Plan since last time', lens: 'Your view', bloods: 'Bloods',
  together: 'Moving together', kraft: 'KRAFT curve', commitments: 'Their commitments',
};

const secId = (k: Key) => `sec-${k}`;

export default function ProfilePage() {
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
  const conversations = find('conversation');

  const lines = plans(between.data);
  const planDate = lines.length ? lines[lines.length - 1].created_at : null;
  const selected = marker
    ?? record.data?.meterbolic.find((m) => m.name === 'Triglyceride')?.name
    ?? record.data?.meterbolic[0]?.name
    ?? null;

  // The brief's sections, one tap away on the ask bar. null = still preparing.
  const ready = !!brief.data;
  const chips: AskChip[] = [
    { label: 'Suggested focus', text: ready ? glance : null },
    { label: 'Recent conversations', text: ready ? (conversations?.body ?? '') : null },
    {
      label: 'Full written brief',
      text: ready ? sections.map((sec) => `**${sec.title}**\n\n${sec.body || 'Nothing on file.'}`).join('\n\n') : null,
    },
  ];

  const blocks: Record<Key, React.ReactNode> = {
    about: <ProfileCard patientId={pid} />,
    plan: (
      <Card>
        <Label color={T.lime} style={{ marginBottom: 6 }}>Your plan since last time</Label>
        <State loading={between.loading && !between.data} error={between.error}><PlanRows lines={lines} /></State>
      </Card>
    ),
    lens: <LensPanel patientId={pid} persona={persona} basPoints={basPoints(between.data)} planCutoff={planCutoff(between.data)} />,
    bloods: <BloodsCard record={record.data} patientId={pid} selected={selected} onSelect={setMarker} onLabsSaved={record.reload} />,
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
  };

  const order = ORDER[persona].filter((k) => blocks[k] != null);

  return (
    <Screen
      header={
        <PatientHeader
          id={pid}
          title="Profile"
          sub={(name) => `${name} · ordered for ${(PERSONAS.find((p) => p.id === persona)?.label ?? '').toLowerCase()}`}
          right={generatedAt ? <Pill color={T.lime}>Brief ready {generatedAt}</Pill> : brief.loading ? <Pill>Preparing the brief…</Pill> : null}
        />
      }
      ask={<PatientAsk id={pid} example="show me every reading after a late dinner" chips={chips} />}
    >
      <nav aria-label="Profile sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
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
