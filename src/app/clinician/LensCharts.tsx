'use client';

/**
 * The lens view: what each kind of practitioner works on, drawn so it can be
 * taken in at a glance (dataviz skill: one series per chart, one axis, colour
 * by state against a target, never colour alone).
 *
 *   Physician               the Biological Age Score over time
 *   Nutritional therapist   dinner times against the plan, energy against target
 *   Coach                   steps against target, sleep with short nights marked
 *
 * Every mark is a stored or counted fact from lifestyle_summary / between; an
 * unlogged day is drawn as a gap, never as zero. Each chart has a table view.
 */

import React from 'react';
import { Card, Label, T, useAuthed } from './ui';
import type { Persona } from './persona';

const GOOD = 'var(--mc-accent)';
const SHORT = 'var(--mc-orange)';
const GRID = 'rgba(var(--mc-fg-rgb),0.12)';
const INK = 'var(--mc-text)';

interface DayN { date: string; dinner: string | null; kcal: number | null; protein: number | null }
interface DayA { date: string; steps: number | null; sleep_hours: number | null }
interface Lifestyle {
  nutrition: { status: string; daily?: DayN[]; kcal_target?: number | null; dinner_median?: string | null; days_logged?: number; window_days: number };
  activity: { status: string; daily?: DayA[]; step_target?: number | null; window_days: number };
}

const SAY: Record<string, string> = {
  no_data: 'Nothing recorded in the last 14 days.',
  not_shared: 'The patient has not shared lifestyle data.',
  unavailable: "Couldn't be read right now.",
};

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n; i >= 1; i--) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}
export const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

const W = 680, H = 190, L = 48, R = 12, TOP = 12, B = 26;

function Frame({ children, ticks, days }: { children: React.ReactNode; ticks: { y: number; label: string }[]; days: string[] }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((t) => (
        <g key={t.label}>
          <line x1={L} x2={W - R} y1={t.y} y2={t.y} stroke={GRID} strokeWidth={1} />
          <text x={L - 8} y={t.y + 4} textAnchor="end" fontSize={11} fill={INK}>{t.label}</text>
        </g>
      ))}
      <text x={L} y={H - 6} fontSize={11} fill={INK}>{dayLabel(days[0])}</text>
      <text x={W - R} y={H - 6} fontSize={11} fill={INK} textAnchor="end">{dayLabel(days[days.length - 1])}</text>
      {children}
    </svg>
  );
}

export function Legend({ items }: { items: { mark: React.ReactNode; label: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, marginTop: 6 }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" aria-hidden>{i.mark}</svg>{i.label}
        </span>
      ))}
    </div>
  );
}

export function TableView({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Show as a table</summary>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', marginTop: 6, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
          <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: 'left', padding: '3px 14px 3px 0', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '3px 14px 3px 0' }}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

/** Dinner times as dots against the plan's cut-off. Filled = in time, ring = late. */
export function DinnerTimes({ daily, cutoff }: { daily: DayN[]; cutoff: string | null }) {
  const days = lastNDays(14);
  const by = new Map(daily.map((d) => [d.date, d]));
  const lo = 17 * 60, hi = 23 * 60 + 30;
  const y = (m: number) => TOP + (1 - (Math.min(Math.max(m, lo), hi) - lo) / (hi - lo)) * (H - TOP - B);
  const x = (i: number) => L + (i + 0.5) * ((W - L - R) / days.length);
  const cut = cutoff ? toMin(cutoff) : null;
  const pts = days.map((d, i) => ({ d, i, t: by.get(d)?.dinner ?? null }));
  return (
    <>
      <Frame days={days} ticks={[18, 20, 22].map((h) => ({ y: y(h * 60), label: `${h}:00` }))}>
        {cut != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(cut)} y2={y(cut)} stroke={INK} strokeDasharray="4 4" strokeWidth={1.5} />
          </g>
        )}
        {pts.map(({ d, i, t }) => {
          if (!t) return null;
          const late = cut != null && toMin(t) >= cut;
          return (
            <g key={d}>
              <title>{`${dayLabel(d)}: dinner ${t}${cut != null ? (late ? ', late' : ', in time') : ''}`}</title>
              <rect x={x(i) - 12} y={TOP} width={24} height={H - TOP - B} fill="transparent" />
              {late
                ? <circle cx={x(i)} cy={y(toMin(t))} r={5} fill="none" stroke={SHORT} strokeWidth={2.5} />
                : <circle cx={x(i)} cy={y(toMin(t))} r={5.5} fill={GOOD} stroke="var(--mc-card-solid)" strokeWidth={2} />}
            </g>
          );
        })}
      </Frame>
      <Legend items={[
        { mark: <circle cx="6" cy="6" r="5" fill={GOOD} />, label: 'In time' },
        { mark: <circle cx="6" cy="6" r="4" fill="none" stroke={SHORT} strokeWidth="2" />, label: 'Late' },
        ...(cutoff ? [{ mark: <line x1="0" x2="12" y1="6" y2="6" stroke={INK} strokeDasharray="3 2" />, label: `Plan: before ${cutoff}` }] : []),
      ]} />
      <TableView head={['Day', 'Dinner logged']} rows={pts.map(({ d, t }) => [dayLabel(d), t ?? 'not logged'])} />
    </>
  );
}

/** One bar per day against a target line. A day with no record is a gap. */
export function DailyBars({ values, target, unit, format, belowLabel, aboveLabel }: {
  values: Map<string, number | null>; target: number | null; unit: string;
  format: (v: number) => string; belowLabel: string; aboveLabel: string;
}) {
  const days = lastNDays(14);
  const vals = days.map((d) => values.get(d) ?? null);
  const max = Math.max(target ?? 0, ...vals.map((v) => v ?? 0)) * 1.1 || 1;
  const plotH = H - TOP - B;
  const y = (v: number) => TOP + (1 - v / max) * plotH;
  const slot = (W - L - R) / days.length;
  const bw = Math.max(6, slot - 6);
  return (
    <>
      <Frame days={days} ticks={[0, max / 2, max].map((v) => ({ y: y(v), label: format(v) }))}>
        {vals.map((v, i) => {
          const x0 = L + i * slot + (slot - bw) / 2;
          if (v == null) {
            return <g key={days[i]}><title>{`${dayLabel(days[i])}: not recorded`}</title><line x1={x0 + bw / 2 - 3} x2={x0 + bw / 2 + 3} y1={y(0) - 2} y2={y(0) - 2} stroke={INK} strokeWidth={2} opacity={0.5} /></g>;
          }
          const ok = target == null || v >= target;
          const h = Math.max(2, y(0) - y(v));
          return (
            <g key={days[i]}>
              <title>{`${dayLabel(days[i])}: ${format(v)} ${unit}${target != null ? (ok ? `, ${aboveLabel}` : `, ${belowLabel}`) : ''}`}</title>
              {h >= 8
                ? <path d={`M${x0},${y(0)} v${-(h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z`} fill={ok ? GOOD : SHORT} />
                : <rect x={x0} y={y(0) - h} width={bw} height={h} fill={ok ? GOOD : SHORT} />}
            </g>
          );
        })}
        {target != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke={INK} strokeDasharray="4 4" strokeWidth={1.5} />
          </g>
        )}
      </Frame>
      <Legend items={[
        { mark: <rect width="12" height="12" rx="3" fill={GOOD} />, label: aboveLabel },
        { mark: <rect width="12" height="12" rx="3" fill={SHORT} />, label: belowLabel },
        ...(target != null ? [{ mark: <line x1="0" x2="12" y1="6" y2="6" stroke={INK} strokeDasharray="3 2" />, label: `Target ${format(target)}` }] : []),
      ]} />
      <TableView head={['Day', unit]} rows={days.map((d, i) => [dayLabel(d), vals[i] == null ? 'not recorded' : format(vals[i] as number)])} />
    </>
  );
}

/** The score over time, as a line with its points; the shape, not a forecast. */
export function ScoreLine({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) return <div style={{ fontSize: 13 }}>Two scored readings are needed to draw a line.</div>;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.2 || 1;
  const y = (v: number) => TOP + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - TOP - B);
  const x = (i: number) => L + (i / (points.length - 1)) * (W - L - R);
  const days = points.map((p) => p.date);
  return (
    <>
      <Frame days={days} ticks={[lo, hi].map((v) => ({ y: y(v), label: v.toFixed(1) }))}>
        <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke={GOOD} strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.date + i}>
            <title>{`${dayLabel(p.date)}: ${p.value.toFixed(1)}`}</title>
            <circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 6 : 4.5} fill={GOOD} stroke="var(--mc-card-solid)" strokeWidth={2} />
          </g>
        ))}
      </Frame>
      <TableView head={['Reading', 'Score']} rows={points.map((p) => [dayLabel(p.date), p.value.toFixed(1)])} />
    </>
  );
}

const TITLES: Record<Persona, string> = {
  physician: 'Your view: bloods',
  therapist: 'Your view: nutrition',
  coach: 'Your view: movement and sleep',
};

/** The card at the top of a patient's brief, shaped by the sidebar lens. */
export function LensPanel({ patientId, persona, basPoints, planCutoff }: {
  patientId: string; persona: Persona; basPoints: { date: string; value: number }[]; planCutoff: string | null;
}) {
  const life = useAuthed<Lifestyle>(persona === 'physician' ? null : `/api/clinician/${encodeURIComponent(patientId)}/lifestyle`);
  const n = life.data?.nutrition, a = life.data?.activity;

  return (
    <Card>
      <Label color={T.lime} style={{ marginBottom: 10 }}>{TITLES[persona]}</Label>
      {persona === 'physician' && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Biological Age Score</div>
          <ScoreLine points={basPoints} />
        </>
      )}
      {persona !== 'physician' && life.loading && !life.data && <div style={{ fontSize: 13 }}>Reading the last 14 days…</div>}
      {persona === 'therapist' && n && (
        n.status !== 'ok' ? <div style={{ fontSize: 13 }}>{SAY[n.status] ?? 'Not available.'}</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Dinner times{n.dinner_median ? `, median ${n.dinner_median}` : ''}</div>
              <DinnerTimes daily={n.daily ?? []} cutoff={planCutoff} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Energy on logged days</div>
              <DailyBars
                values={new Map((n.daily ?? []).map((d) => [d.date, d.kcal]))}
                target={n.kcal_target ?? null} unit="kcal" format={(v) => String(Math.round(v))}
                aboveLabel="At or over target" belowLabel="Under target"
              />
            </div>
          </div>
        )
      )}
      {persona === 'coach' && a && (
        a.status !== 'ok' ? <div style={{ fontSize: 13 }}>{SAY[a.status] ?? 'Not available.'}</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Steps</div>
              <DailyBars
                values={new Map((a.daily ?? []).map((d) => [d.date, d.steps]))}
                target={a.step_target ?? null} unit="steps" format={(v) => Math.round(v).toLocaleString('en-GB')}
                aboveLabel="At target" belowLabel="Under target"
              />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Sleep</div>
              <DailyBars
                values={new Map((a.daily ?? []).map((d) => [d.date, d.sleep_hours]))}
                target={6} unit="hours" format={(v) => `${v.toFixed(1)} h`}
                aboveLabel="6 h or more" belowLabel="Short night"
              />
            </div>
          </div>
        )
      )}
    </Card>
  );
}
