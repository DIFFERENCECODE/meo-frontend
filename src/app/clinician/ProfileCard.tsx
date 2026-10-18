'use client';

/**
 * The top of a patient's Profile: who they are, in their own words. Goals
 * first, then the facts they entered at sign-up, then what the coach has
 * learned about working with them. Everything comes from the record, curated
 * in code (GET /clinician/{id}/profile); the full onboarding record stays one
 * click away for anything not shown.
 */

import React from 'react';
import { Card, Label, Pill, T, useAuthed } from './ui';

interface Fact { label: string; value: string }

interface Profile {
  name: string | null;
  goals: string[];
  primary_goal: string | null;
  facts: Fact[];
  coaching: { change_stage: string | null; concerns: string[]; barriers: string[]; what_works: string[]; style: string | null } | null;
  entered: Fact[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Lines({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.45 }}>
        {items.map((x) => <li key={x} style={{ margin: '2px 0' }}>{x}</li>)}
      </ul>
    </div>
  );
}

export function ProfileCard({ patientId }: { patientId: string }) {
  const { data, loading, error } = useAuthed<Profile>(patientId ? `/api/clinician/${encodeURIComponent(patientId)}/profile` : null);

  if (error) return <Card><div style={{ fontSize: 13.5 }}>{error}</div></Card>;
  if (loading || !data) return <Card><div style={{ fontSize: 13 }}>Reading the record…</div></Card>;

  const goal = data.primary_goal ? cap(data.primary_goal) : null;
  const goals = data.goals.join(', ');
  const c = data.coaching;

  return (
    <Card>
      <Label color={T.lime} style={{ marginBottom: 8 }}>In their words, at sign-up</Label>

      {goal || goals ? (
        <div style={{ marginBottom: 14 }}>
          {goal && <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{goal}</div>}
          {goals && <div style={{ fontSize: 13.5, marginTop: 3, lineHeight: 1.45 }}>{goals}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 13, marginBottom: 14 }}>No goals entered.</div>
      )}

      {data.facts.length > 0 && (
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px 18px', margin: 0 }}>
          {data.facts.map((f) => (
            <div key={f.label} style={{ minWidth: 0 }}>
              <dt style={{ fontSize: 11.5 }}>{f.label}</dt>
              <dd style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600 }}>{cap(f.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {c && (
        <div style={{ borderTop: `1px solid ${T.rowBorder}`, marginTop: 16, paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>What the coach has learned</div>
            {c.change_stage && <Pill size={11}>Stage: {c.change_stage}</Pill>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Lines title="Concerns" items={c.concerns} />
            <Lines title="Barriers" items={c.barriers} />
            <Lines title="What works" items={c.what_works} />
          </div>
          {c.style && <p style={{ fontSize: 13, lineHeight: 1.5, margin: '12px 0 0', maxWidth: '72ch' }}>{c.style}</p>}
        </div>
      )}

      {data.entered.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: T.lime }}>Everything they entered at sign-up</summary>
          <table style={{ borderCollapse: 'collapse', marginTop: 8, fontSize: 12.5 }}>
            <tbody>
              {data.entered.map((e) => (
                <tr key={e.label} style={{ borderTop: `1px solid ${T.rowBorder}` }}>
                  <td style={{ padding: '4px 16px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{e.label}</td>
                  <td style={{ padding: '4px 0', fontWeight: 600 }}>{e.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </Card>
  );
}
