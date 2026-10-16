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
import { LensPanel } from '../../LensCharts';
import {
  CantTellCard, basPoints, planCutoff, Columns, CommittedCard, JudgementCard, PatientAsk, PatientHeader, ProvenanceCard,
  useBetween, usePatientId,
} from './shared';

interface Section { title: string; body: string }

const slug = (t: string) => `sec-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

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
  const [persona] = usePersona();
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
      {/* Jump to a section. The lens is chosen in the sidebar and shapes the
          order; these buttons are the brief's own table of contents. */}
      {sections.length > 0 && (
        <nav aria-label="Brief sections" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {[...sections.map((x) => x.title), ...(glance ? ['Suggested focus'] : [])].map((t) => (
            <button
              key={t}
              className="mc-press"
              onClick={() => document.getElementById(slug(t))?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start',
              })}
              style={{
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '5px 12px',
                color: T.text, background: T.chip, border: `1px solid ${T.chipBorder}`,
              }}
            >
              {t.replace(/\s*\(.*\)\s*$/, '')}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5 }}>Written for: <strong>{PERSONAS.find((p) => p.id === persona)?.label}</strong></span>
        </nav>
      )}

      <Columns
        left={
          <>
          {/* The lens view leads: what this practitioner works on, drawn. */}
          <LensPanel patientId={id} persona={persona} basPoints={basPoints(between.data)} planCutoff={planCutoff(between.data)} />
          <State loading={brief.loading && !brief.data} error={brief.error}>
            {sections.map((s) => (
              <Card key={s.title} style={{ padding: '14px 18px', scrollMarginTop: 12 }}>
                <span id={slug(s.title)} />
                <Label color={T.lime} style={{ marginBottom: 6 }}>{s.title}</Label>
                <Markdown text={s.body || 'Nothing on file.'} />
              </Card>
            ))}
            {glance && (
              <Card accent="rgba(164,214,94,0.35)" style={{ padding: '14px 18px' }}>
                <span id={slug('Suggested focus')} />
                <Label color={T.lime} style={{ marginBottom: 6 }}>Suggested focus</Label>
                <Markdown text={glance} />
              </Card>
            )}
          </State>
          </>
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
