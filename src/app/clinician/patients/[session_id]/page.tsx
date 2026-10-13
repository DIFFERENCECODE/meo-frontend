'use client';

/**
 * Pre-consultation brief (storyboard p01-p03).
 *
 * The backend assembles the brief as a workflow: every section is gathered in
 * code and ordered by the lens, and one bounded model call writes the opening
 * bullets. This screen splits that markdown back into the frame's cards: the
 * sections on the left in the lens's order, and on the right where the numbers
 * came from, what was agreed and how it went, and what the data cannot say.
 */

import React, { useMemo } from 'react';
import { Card, Label, Markdown, Pill, Screen, State, T, useAuthed, usePersona } from '../../ui';
import { PERSONAS } from '../../persona';
import {
  CantTellCard, Columns, CommittedCard, JudgementCard, PatientAsk, PatientHeader, ProvenanceCard,
  useBetween, usePatientId,
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

export default function BriefPage() {
  const id = usePatientId();
  const [persona, setPersona] = usePersona();
  const brief = useAuthed<{ response: string }>(id ? `/api/clinician/${encodeURIComponent(id)}/brief?persona=${persona}` : null);
  const between = useBetween(id);
  const generatedAt = useMemo(
    () => (brief.data ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null),
    [brief.data],
  );
  const { glance, sections } = useMemo(() => splitBrief(brief.data?.response || ''), [brief.data]);
  const minutes = Math.max(1, Math.round((brief.data?.response || '').split(/\s+/).length / 220));

  return (
    <Screen
      header={
        <PatientHeader
          id={id}
          title="Pre-consultation brief"
          sub={(name) => `${name}${brief.data ? ` · ${minutes} minute${minutes === 1 ? '' : 's'} to read` : ''}`}
          right={generatedAt ? <Pill color={T.lime}>Generated {generatedAt}</Pill> : brief.loading ? <Pill>Preparing…</Pill> : null}
        />
      }
      ask={<PatientAsk id={id} example="show me every reading after a late dinner" />}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Label style={{ marginRight: 4 }}>Written for</Label>
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className="mc-press"
            aria-pressed={p.id === persona}
            onClick={() => setPersona(p.id)}
            style={{
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '5px 12px',
              color: p.id === persona ? T.ink : T.muted, background: p.id === persona ? T.lime : T.chip,
              border: `1px solid ${p.id === persona ? T.lime : T.chipBorder}`,
            }}
          >
            {p.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: T.dim }}>Same data · different order and vocabulary</span>
      </div>

      <Columns
        left={
          <State loading={brief.loading && !brief.data} error={brief.error}>
            {sections.map((s) => (
              <Card key={s.title} style={{ padding: '14px 18px' }}>
                <Label color={T.lime} style={{ marginBottom: 6 }}>{s.title}</Label>
                <Markdown text={s.body || 'Nothing on file.'} />
              </Card>
            ))}
            {glance && (
              <Card accent="rgba(164,214,94,0.35)" style={{ padding: '14px 18px' }}>
                <Label color={T.lime} style={{ marginBottom: 6 }}>Suggested focus</Label>
                <Markdown text={glance} />
              </Card>
            )}
          </State>
        }
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
