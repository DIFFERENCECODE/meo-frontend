'use client';

/**
 * Needs review (storyboard p04).
 *
 * The flags table is computed in code against optimal ranges (the Truth
 * Engine's biomarker reference), not the lab's reference range and not a model.
 * The right column shows the one trend the record can draw honestly, and says
 * exactly what reaches the practitioner and when.
 */

import React from 'react';
import { Btn, Card, Label, Pill, Screen, State, T, useAuthed } from '../../../ui';
import { Columns, PatientAsk, PatientHeader, fmtDay, plans, useBetween, usePatientId } from '../shared';

interface Flag {
  biomarker_name: string;
  display_name: string;
  value: number;
  unit: string;
  optimal_low: number | null;
  optimal_high: number | null;
  status: 'high' | 'low' | 'optimal';
  delta: number | null;
  trend: string | null;
  source?: 'lab_panel' | 'guided_test';
  as_of?: string | null;
}
interface Flags { flags: Flag[]; all_results: Flag[]; test_dates: string[]; guided_as_of?: string | null }

const STATUS = { high: T.orange, low: T.orange, optimal: T.lime } as const;

function range(f: Flag) {
  if (f.optimal_low != null && f.optimal_high != null) return `${f.optimal_low} to ${f.optimal_high}`;
  if (f.optimal_high != null) return `under ${f.optimal_high}`;
  if (f.optimal_low != null) return `over ${f.optimal_low}`;
  return '—';
}

function change(f: Flag) {
  if (f.delta == null) return f.trend || 'first value';
  const sign = f.delta > 0 ? '+' : '';
  return `${f.trend ? `${f.trend} · ` : ''}${sign}${Number(f.delta.toFixed(2))}`;
}

/** A plain SVG line, scaled to its own range: the shape, not a chart. */
function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 340, h = 70, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 6 - ((v - lo) / span) * (h - 12)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function ReviewPage() {
  const id = usePatientId();
  const flags = useAuthed<Flags>(id ? `/api/patients/${encodeURIComponent(id)}/labs/flags` : null);
  const between = useBetween(id);
  const rows = flags.data?.all_results ?? [];
  const out = rows.filter((r) => r.status !== 'optimal').length;
  const scored = (between.data?.readings ?? []).filter((r) => r.bas != null && r.date).slice().reverse();
  const lastReading = between.data?.readings?.[0]?.date;
  const lines = plans(between.data);

  return (
    <Screen
      header={
        <PatientHeader
          id={id}
          title="Needs review"
          sub={(name) => `${name} · flagged against optimal ranges, not lab-normal ranges`}
          right={
            <>
              {lastReading && <Pill>Last reading {fmtDay(lastReading)}</Pill>}
              <Btn primary href={`/clinician/patients/${id}`}>Open brief</Btn>
            </>
          }
        />
      }
      ask={<PatientAsk id={id} example="which readings moved after the plan started?" />}
    >
      <Columns
        left={
          <>
            <State loading={flags.loading && !flags.data} error={flags.error}>
              <Card style={{ padding: '14px 20px' }}>
                {rows.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: T.muted }}>No biomarker values on file yet.</div>
                ) : (
                  <div className="mc-scroll-x"><table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Measure', 'Value', 'Optimal', 'Status', 'Source', 'Change'].map((h, i) => (
                          <th key={h} scope="col" style={{ textAlign: i === 5 ? 'right' : 'left', padding: '4px 8px 10px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.dim }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => (
                        <tr key={f.biomarker_name} style={{ borderTop: `1px solid ${T.rowBorder}` }}>
                          <td style={{ padding: '11px 8px 11px 0', fontSize: 13.5, fontWeight: 700 }}>{f.display_name}</td>
                          <td style={{ padding: '11px 8px 11px 0', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: STATUS[f.status] }}>{Number(f.value.toFixed(2))}</span>
                            <span style={{ fontSize: 11.5, color: T.dim, marginLeft: 4 }}>{f.unit}</span>
                          </td>
                          <td style={{ padding: '11px 8px 11px 0', fontSize: 13, color: T.muted, whiteSpace: 'nowrap' }}>{range(f)}</td>
                          <td style={{ padding: '11px 8px 11px 0' }}><Pill size={11} color={STATUS[f.status]}>{f.status}</Pill></td>
                          <td style={{ padding: '11px 8px 11px 0', fontSize: 12, color: f.source === 'lab_panel' ? T.blue : T.dim }}>
                            {f.source === 'lab_panel' ? 'lab' : 'meter'}{f.as_of ? ` · ${fmtDay(f.as_of)}` : ''}
                          </td>
                          <td style={{ padding: '11px 0', fontSize: 12.5, color: T.muted, textAlign: 'right' }}>{change(f)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                )}
                <div style={{ fontSize: 11.5, color: T.dim, marginTop: 10 }}>
                  Computed in code against optimal ranges: model-free, and not the lab&apos;s reference range.
                  {rows.length > 0 && ` ${out} of ${rows.length} outside range.`}
                </div>
              </Card>
            </State>

            <Card>
              <Label style={{ marginBottom: 6 }}>What MeO saw between sessions</Label>
              <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.6 }}>
                {lines.length
                  ? lines.map((l) => `${l.body}: ${l.progress?.summary ?? 'not checked'}.`).join(' ')
                  : 'No plan lines to check yet.'}{' '}
                {(between.data?.commitments?.length ?? 0) > 0 &&
                  `They made ${between.data!.commitments.length} commitment${between.data!.commitments.length === 1 ? '' : 's'} of their own with the coach. `}
                MeO gave no medical advice.
              </div>
            </Card>
          </>
        }
        right={
          <>
            <Card>
              <Label color={T.lime} style={{ marginBottom: 4 }}>Biological Age Score · {scored.length} readings</Label>
              {scored.length >= 2 ? (
                <>
                  <Spark values={scored.map((r) => r.bas as number)} color={T.orange} />
                  <div style={{ fontSize: 12.5, color: T.muted }}>
                    {Number((scored[0].bas as number).toFixed(1))} on {fmtDay(scored[0].date)} to{' '}
                    {Number((scored[scored.length - 1].bas as number).toFixed(1))} on {fmtDay(scored[scored.length - 1].date)}.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Two scored readings are needed to draw a line.</div>
              )}
            </Card>
            <Card>
              <Label style={{ marginBottom: 6 }}>What reaches you, and when</Label>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                A safety risk in conversation emails you straight away. A plan line well short over
                two weeks moves them up your panel and waits for your next look. Nothing else interrupts you.
              </div>
            </Card>
          </>
        }
      />
    </Screen>
  );
}
