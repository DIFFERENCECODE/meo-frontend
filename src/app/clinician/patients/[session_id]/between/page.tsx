'use client';

/**
 * The weeks between sessions (storyboard p05).
 *
 * What a practitioner would otherwise open with "So, how's it been?". The
 * timeline is every stored event since the last session, newest first, and the
 * adherence card is the Truth Engine's count for each plan line. Nothing on this
 * screen is generated.
 */

import React, { useState } from 'react';
import { Card, Label, Pill, Screen, State, T, usePersona } from '../../../ui';
import { LensPanel } from '../../../LensCharts';
import {
  Between, CantTellCard, Columns, basPoints, planCutoff, PatientAsk, PatientHeader, VERDICT, fmtDay, fraction, plans,
  useBetween, usePatientId,
} from '../shared';

interface Event { date: string; title: string; sub: string; tag: string; dot: string }

const KIND: Record<string, string> = { panel: 'Lipid reading', insulin: 'Clinic insulin panel', body: 'Measurements', other: 'Entry' };

function events(b: Between): Event[] {
  const out: Event[] = [];
  for (const r of b.readings) {
    if (!r.date) continue;
    out.push({
      date: r.date,
      title: `${KIND[r.kind || 'other'] || 'Entry'}${r.bas != null ? ` · BAS ${r.bas.toFixed(1)}` : ''}`,
      sub: `${r.marker_count} marker${r.marker_count === 1 ? '' : 's'} · ${r.captured_by || 'source not recorded'}`,
      tag: 'reading',
      dot: r.has_score ? T.orange : T.dim,
    });
  }
  for (const m of b.meal_log ?? []) {
    const meal = m.meal.charAt(0).toUpperCase() + m.meal.slice(1);
    out.push({
      date: m.at,
      title: `${meal} logged ${m.time}`,
      sub: m.meets_line === null ? `for "${m.line}"` : `${m.meets_line ? 'in time for' : 'missed'} "${m.line}"`,
      tag: 'food log',
      dot: m.meets_line === false ? T.orange : T.lime,
    });
  }
  for (const c of b.commitments) {
    const when = c.committed_at || c.created_at;
    if (!when || !c.commitment) continue;
    out.push({
      date: when,
      title: `Told MeO: "${c.commitment}"`,
      sub: `${c.timeframe ? `${c.timeframe} · ` : ''}${c.followed_up ? 'followed up' : 'not yet followed up'}`,
      tag: 'chat',
      dot: T.dim,
    });
  }
  const lines = plans(b);
  if (lines.length) {
    const first = lines[lines.length - 1];
    out.push({
      date: first.created_at,
      title: 'Last session with you',
      sub: `agreed: ${lines.map((l) => l.body.toLowerCase()).join(', ')}`,
      tag: 'consult',
      dot: T.lime,
    });
  }
  return out.sort((a, z) => (a.date < z.date ? 1 : -1));
}

function Adherence({ b }: { b: Between | null }) {
  const lines = plans(b);
  return (
    <Card>
      <Label color={T.lime} style={{ marginBottom: 10 }}>Adherence since your last session</Label>
      {lines.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
          No plan lines yet, so there is nothing to hold them to. Write them in After the session.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {lines.map((l) => {
              const v = VERDICT[l.progress?.status ?? ''] ?? VERDICT.unavailable;
              const f = fraction(l);
              return (
                <div key={l.id} style={{ minWidth: 90, maxWidth: 140 }} title={l.progress?.summary}>
                  <div style={{ fontSize: f ? 26 : 14, fontWeight: 800, letterSpacing: '-0.025em', color: v.color, lineHeight: 1.15 }}>{f ?? v.label}</div>
                  <div style={{ fontSize: 11.5, color: T.dim, marginTop: 3, lineHeight: 1.35 }}>{l.body}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginTop: 12 }}>
            {lines.map((l) => l.progress?.summary && `${l.body}: ${l.progress.summary}.`).filter(Boolean).join(' ')}
          </div>
        </>
      )}
    </Card>
  );
}

export default function BetweenPage() {
  const id = usePatientId();
  const between = useBetween(id);
  const [persona] = usePersona();
  const all = between.data ? events(between.data) : [];
  // The frame is the weeks since the last session; older events fold away
  // behind one control rather than pushing the gap off the screen.
  const consult = all.find((e) => e.tag === 'consult');
  const list = consult ? all.filter((e) => e.date >= consult.date) : all;
  const earlier = consult ? all.filter((e) => e.date < consult.date) : [];
  const [showEarlier, setShowEarlier] = useState(false);

  return (
    <Screen
      header={
        <PatientHeader
          id={id}
          title="The weeks between sessions"
          sub={(name) => `${name} · what you'd otherwise open with "So, how's it been?"`}
        />
      }
      ask={<PatientAsk id={id} example="what changed after the last session?" />}
    >
      <Columns
        left={
          <State loading={between.loading && !between.data} error={between.error}>
            <Card style={{ padding: '10px 24px' }}>
              {list.length === 0 && (
                <div style={{ fontSize: 13.5, color: T.muted, padding: '12px 0' }}>
                  Nothing stored since the last session. A quiet record means MeO can&apos;t see the gap, not that nothing happened.
                </div>
              )}
              {[...list, ...(showEarlier ? earlier : [])].map((e, i) => (
                <div key={`${e.date}-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0', borderTop: i ? `1px solid ${T.rowBorder}` : undefined }}>
                  <div style={{ width: 52, flex: 'none', fontSize: 12.5, color: T.dim, paddingTop: 1 }}>{fmtDay(e.date)}</div>
                  <div style={{ width: 9, height: 9, flex: 'none', borderRadius: '50%', background: e.dot, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>{e.sub}</div>
                  </div>
                  <Pill size={11}>{e.tag}</Pill>
                </div>
              ))}
              {earlier.length > 0 && (
                <button className="mc-press" aria-expanded={showEarlier} onClick={() => setShowEarlier((v) => !v)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', borderTop: `1px solid ${T.rowBorder}`, background: 'transparent', borderLeft: 0, borderRight: 0, borderBottom: 0, color: T.lime, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {showEarlier ? 'Hide what came before your last session' : `Show ${earlier.length} event${earlier.length === 1 ? '' : 's'} before your last session`}
                </button>
              )}
            </Card>
            {between.data && !between.data.lifestyle_available && (
              <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5, padding: '0 4px' }}>{between.data.lifestyle_note}</div>
            )}
          </State>
        }
        right={
          <>
            <Adherence b={between.data} />
            <LensPanel patientId={id} persona={persona} basPoints={basPoints(between.data)} planCutoff={planCutoff(between.data)} />
            <CantTellCard between={between.data} name="they" />
          </>
        }
      />
    </Screen>
  );
}
