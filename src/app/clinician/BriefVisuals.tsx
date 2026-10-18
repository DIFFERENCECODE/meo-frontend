'use client';

/**
 * The brief, drawn. Each section that used to be a paragraph is the visual it
 * describes: the plan as progress rows, bloods as one small chart per marker
 * (Meterbolic kept apart from other labs), bloods and lifestyle on one date
 * axis, and the KRAFT curve as a curve.
 *
 * dataviz rules held throughout: one y-axis per chart (glucose and insulin
 * are two charts on a shared time axis, never a dual axis), state shown with
 * a label as well as colour, text in text tokens, a hover title on every mark,
 * and a table view for every chart. Every value is stored or counted; a day
 * with nothing logged is a gap, never a zero.
 */

import React, { useMemo, useState } from 'react';
import { Card, Label, Pill, T, useAuthed } from './ui';
import { LabUpload } from './LabUpload';
import { Legend, TableView, dayLabel } from './LensCharts';
import { VERDICT, fmtDay, type Commitment, type Note } from './patients/[session_id]/shared';

const GOOD = 'var(--mc-accent)';
const SHORT = 'var(--mc-orange)';
const WARN = 'var(--mc-amber)';
const INK = 'var(--mc-text)';
const GRID = 'rgba(var(--mc-fg-rgb),0.12)';
const BAND = 'rgba(var(--mc-accent-rgb),0.14)';
const RING = 'var(--mc-card-solid)';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Pt { date: string; value: number; held_back?: boolean; captured_by?: string | null; source?: string }
export interface Series {
  name: string; display_name: string; unit: string;
  optimal_low: number | null; optimal_high: number | null;
  lower_is_better?: boolean; category?: string; points: Pt[];
}
export interface KraftPt { minute: number | null; Glucose?: number | null; Insulin?: number | null }
export interface PractitionerRecord {
  meterbolic: Series[]; other_labs: Series[];
  kraft: { points: KraftPt[]; date: string | null };
  scores: { date: string; value: number }[];
}
interface DayN { date: string; dinner: string | null }
interface DayA { date: string; steps: number | null; sleep_hours: number | null }
export interface Lifestyle {
  nutrition: { status: string; daily?: DayN[] };
  activity: { status: string; daily?: DayA[]; step_target?: number | null };
}

export function useRecord(id: string) {
  return useAuthed<PractitionerRecord>(id ? `/api/clinician/${encodeURIComponent(id)}/record` : null);
}
export function useLifestyle(id: string) {
  return useAuthed<Lifestyle>(id ? `/api/clinician/${encodeURIComponent(id)}/lifestyle` : null);
}

const num = (v: number) => String(Number(v.toFixed(Math.abs(v) >= 100 ? 0 : 2)));
const CAPTURE: Record<string, string> = { device: 'meter', typed: 'typed', lab: 'lab', guided_test: 'guided test' };

function status(s: Series): { word: string; color: string } {
  const last = s.points[s.points.length - 1];
  if (!last) return { word: 'no value', color: INK };
  if (last.held_back) return { word: 'to confirm', color: WARN };
  if (s.optimal_high != null && last.value > s.optimal_high) return { word: 'high', color: SHORT };
  if (s.optimal_low != null && last.value < s.optimal_low) return { word: 'low', color: SHORT };
  if (s.optimal_low == null && s.optimal_high == null) return { word: 'no range', color: INK };
  return { word: 'optimal', color: GOOD };
}

function range(s: Series) {
  if (s.optimal_low != null && s.optimal_high != null) return `${s.optimal_low} to ${s.optimal_high}`;
  if (s.optimal_high != null) return `under ${s.optimal_high}`;
  if (s.optimal_low != null) return `over ${s.optimal_low}`;
  return 'no optimal range';
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

/** Your plan since last time: one row per line, a bar for counted lines. */
export function PlanRows({ lines }: { lines: Note[] }) {
  if (!lines.length) {
    return <div style={{ fontSize: 13.5 }}>No plan set yet. Lines you write after the session are counted here from then on.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {lines.map((l, i) => {
        const p = l.progress;
        const v = VERDICT[p?.status ?? ''] ?? VERDICT.unavailable;
        const counted = p && p.expected != null && !['no_data', 'too_early', 'not_measurable'].includes(p.status);
        const share = counted ? Math.min(1, (p!.qualifying_days ?? 0) / Math.max(1, p!.expected as number)) : 0;
        return (
          <div key={l.id} title={p?.summary} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(90px,1fr) 64px 118px', gap: 14, alignItems: 'center', padding: '10px 0', borderTop: i ? `1px solid ${T.rowBorder}` : undefined }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.body}</div>
              <div style={{ fontSize: 11.5 }}>{l.target ?? 'no frequency set'} · set {fmtDay(l.created_at)}</div>
            </div>
            <div aria-hidden style={{ height: 8, borderRadius: 4, background: 'rgba(var(--mc-fg-rgb),0.1)' }}>
              {counted && <div style={{ width: `${share * 100}%`, height: 8, borderRadius: 4, background: v.color }} />}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {counted ? `${p!.qualifying_days ?? 0}/${p!.expected}` : '—'}
            </div>
            <div style={{ textAlign: 'right' }}><Pill size={11} color={v.color}>{v.label}</Pill></div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bloods ───────────────────────────────────────────────────────────────────

function Spark({ s, w = 200, h = 46 }: { s: Series; w?: number; h?: number }) {
  const vals = s.points.map((p) => p.value);
  const bounds = [...vals, s.optimal_low ?? vals[0], s.optimal_high ?? vals[0]].filter((v) => v != null) as number[];
  const lo = Math.min(...bounds), hi = Math.max(...bounds), pad = (hi - lo) * 0.15 || 0.5;
  const y = (v: number) => 4 + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (h - 8);
  const x = (i: number) => (s.points.length === 1 ? w / 2 : 6 + (i / (s.points.length - 1)) * (w - 12));
  const bandTop = s.optimal_high != null ? y(s.optimal_high) : 0;
  const bandBot = s.optimal_low != null ? y(s.optimal_low) : h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden style={{ display: 'block' }}>
      {(s.optimal_low != null || s.optimal_high != null) && (
        <rect x={0} width={w} y={Math.max(0, bandTop)} height={Math.max(0, Math.min(h, bandBot) - Math.max(0, bandTop))} fill={BAND} rx={3} />
      )}
      {s.points.length > 1 && (
        <polyline points={s.points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} strokeLinejoin="round" />
      )}
      {s.points.map((p, i) => {
        const out = (s.optimal_high != null && p.value > s.optimal_high) || (s.optimal_low != null && p.value < s.optimal_low);
        return (
          <g key={p.date + i}>
            <title>{`${dayLabel(p.date.slice(0, 10))}: ${num(p.value)} ${s.unit}${p.held_back ? ', held back to confirm' : ''}${p.captured_by ? `, ${CAPTURE[p.captured_by] ?? p.captured_by}` : p.source ? `, ${p.source}` : ''}`}</title>
            {p.held_back
              ? <circle cx={x(i)} cy={y(p.value)} r={4} fill="none" stroke={WARN} strokeWidth={2} />
              : <circle cx={x(i)} cy={y(p.value)} r={i === s.points.length - 1 ? 4.5 : 3.5} fill={out ? SHORT : GOOD} stroke={RING} strokeWidth={1.5} />}
          </g>
        );
      })}
    </svg>
  );
}

function MarkerTile({ s, selected, onSelect }: { s: Series; selected: boolean; onSelect: () => void }) {
  const last = s.points[s.points.length - 1];
  const prev = s.points.length > 1 ? s.points[s.points.length - 2] : null;
  const st = status(s);
  const diff = prev && last ? last.value - prev.value : null;
  const better = diff == null || diff === 0 ? null : (s.lower_is_better ?? true) ? diff < 0 : diff > 0;
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="mc-press"
      style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: INK, minWidth: 0,
        background: selected ? 'rgba(var(--mc-accent-rgb),0.1)' : 'rgba(var(--mc-fg-rgb),0.04)',
        border: `1px solid ${selected ? 'rgba(var(--mc-accent-rgb),0.45)' : T.rowBorder}`, borderRadius: 12, padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{s.display_name}</span>
        <Pill size={11} color={st.color}>{st.word}</Pill>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>{last ? num(last.value) : '—'}</span>
        <span style={{ fontSize: 11.5 }}>{s.unit}</span>
        {diff != null && diff !== 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}>
            <span style={{ color: better ? GOOD : SHORT }}>{diff < 0 ? '▼' : '▲'}</span> {num(Math.abs(diff))}
          </span>
        )}
      </div>
      <Spark s={s} />
      <div style={{ fontSize: 11, marginTop: 2 }}>
        {s.points.length} reading{s.points.length === 1 ? '' : 's'} · optimal {range(s)}{last ? ` · ${fmtDay(last.date)}` : ''}
      </div>
    </button>
  );
}

/** Bloods, Meterbolic and other labs kept apart, one small chart per marker. */
export function BloodsCard({ record, patientId, selected, onSelect, onLabsSaved }: {
  record: PractitionerRecord | null; patientId: string; selected: string | null; onSelect: (name: string) => void;
  onLabsSaved?: () => void;
}) {
  const [tab, setTab] = useState<'meterbolic' | 'other'>('meterbolic');
  const [adding, setAdding] = useState(false);
  const list = (tab === 'meterbolic' ? record?.meterbolic : record?.other_labs) ?? [];
  const tabBtn = (id: 'meterbolic' | 'other', label: string, n: number) => (
    <button
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className="mc-press"
      style={{
        fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '5px 12px',
        color: tab === id ? T.ink : INK, background: tab === id ? T.lime : T.chip,
        border: `1px solid ${tab === id ? T.lime : T.chipBorder}`,
      }}
    >
      {label} · {n}
    </button>
  );
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <Label color={T.lime} style={{ marginRight: 'auto' }}>Bloods</Label>
        <div role="tablist" aria-label="Blood source" style={{ display: 'flex', gap: 6 }}>
          {tabBtn('meterbolic', 'Meterbolic', record?.meterbolic.length ?? 0)}
          {tabBtn('other', 'Other labs', record?.other_labs.length ?? 0)}
        </div>
      </div>
      <div style={{ fontSize: 12, marginBottom: 10 }}>
        {tab === 'meterbolic'
          ? 'From the Meterbolic Lipid Meter and guided tests at home, fasted. Pick a marker to see it beside lifestyle below.'
          : 'Panels from other labs, read from the reports you add and checked by you before saving.'}
      </div>
      {tab === 'other' && record && (list.length === 0 || adding) && (
        <LabUpload patientId={patientId} onSaved={() => { setAdding(false); onLabsSaved?.(); }} />
      )}
      {tab === 'other' && record && list.length > 0 && !adding && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setAdding(true)} className="mc-press"
            style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: T.lime, background: 'transparent', border: 0, padding: 0 }}>
            Add lab results
          </button>
        </div>
      )}
      {!record ? (
        <div style={{ fontSize: 13 }}>Loading the record…</div>
      ) : list.length === 0 ? (
        tab === 'meterbolic' ? <div style={{ fontSize: 13 }}>No meter readings on the record yet.</div> : null
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {list.map((s) => <MarkerTile key={s.name} s={s} selected={selected === s.name} onSelect={() => onSelect(s.name)} />)}
        </div>
      )}
      {list.length > 0 && (
        <>
          <Legend items={[
            { mark: <rect width="12" height="12" rx="3" fill={BAND} />, label: 'Optimal range (Truth Engine, not lab-normal)' },
            { mark: <circle cx="6" cy="6" r="4.5" fill={SHORT} />, label: 'Outside optimal' },
            { mark: <circle cx="6" cy="6" r="4" fill="none" stroke={WARN} strokeWidth="2" />, label: 'Held back to confirm' },
          ]} />
          <TableView
            head={['Marker', 'Latest', 'Unit', 'Optimal', 'Status', 'Date', 'Readings']}
            rows={list.map((s) => {
              const last = s.points[s.points.length - 1];
              return [s.display_name, last ? num(last.value) : '—', s.unit, range(s), status(s).word, last ? fmtDay(last.date) : '—', s.points.length];
            })}
          />
        </>
      )}
    </Card>
  );
}

// ─── Moving together ──────────────────────────────────────────────────────────

const LANE_W = 680, LBL = 104, RPAD = 10;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/**
 * One blood marker above the lifestyle lanes, on one date axis. Each lane has
 * its own scale (one axis per lane), so nothing is implied about units. Shown
 * side by side, never as cause.
 */
export function MovingTogether({ record, lifestyle, selected, onSelect, planDate, dinnerCutoff }: {
  record: PractitionerRecord | null; lifestyle: Lifestyle | null; selected: string | null;
  onSelect: (name: string) => void; planDate: string | null; dinnerCutoff: string | null;
}) {
  const all = [...(record?.meterbolic ?? []), ...(record?.other_labs ?? [])];
  const s = all.find((x) => x.name === selected) ?? all[0] ?? null;
  const nd = lifestyle?.nutrition?.daily ?? [];
  const ad = lifestyle?.activity?.daily ?? [];
  const stepTarget = lifestyle?.activity?.step_target ?? null;

  // Two views of time. "Since the plan" keeps the 14 days of lifestyle readable;
  // "All readings" shows the bloods' long view, where lifestyle is a sliver.
  const [range, setRange] = useState<'plan' | 'all'>('plan');
  const { start, end, days } = useMemo(() => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const lifeStart = new Date(today.getTime() - 14 * 86400000);
    let st: Date;
    if (range === 'plan') {
      const plan = planDate ? new Date(`${planDate.slice(0, 10)}T12:00:00`) : null;
      const anchor = plan && plan < lifeStart ? plan : lifeStart;
      st = new Date(anchor.getTime() - 3 * 86400000);
    } else {
      const horizon = new Date(today.getTime() - 365 * 86400000);
      const firstBlood = s?.points.map((p) => new Date(`${p.date.slice(0, 10)}T12:00:00`)).filter((d) => d >= horizon).sort((a, b) => +a - +b)[0];
      st = firstBlood && firstBlood < lifeStart ? firstBlood : lifeStart;
    }
    const out: string[] = [];
    for (let t = st.getTime(); t <= today.getTime(); t += 86400000) out.push(isoDay(new Date(t)));
    return { start: st, end: today, days: out };
  }, [s, range, planDate]);

  const span = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
  const x = (iso: string) => LBL + ((new Date(`${iso.slice(0, 10)}T12:00:00`).getTime() - start.getTime()) / 86400000 / span) * (LANE_W - LBL - RPAD);
  const slot = (LANE_W - LBL - RPAD) / days.length;

  const lanes: { key: string; label: string; h: number; body: (top: number, h: number) => React.ReactNode }[] = [];
  if (s) {
    const pts = s.points.filter((p) => new Date(`${p.date.slice(0, 10)}T12:00:00`) >= start);
    const vals = [...pts.map((p) => p.value), s.optimal_low, s.optimal_high].filter((v) => v != null) as number[];
    const lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1, pad = (hi - lo) * 0.2 || 0.5;
    lanes.push({
      key: 'blood', label: s.display_name, h: 86,
      body: (top, h) => {
        const y = (v: number) => top + 6 + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (h - 12);
        return (
          <g>
            {pts.length > 0 && (s.optimal_low != null || s.optimal_high != null) && (() => {
              const t = s.optimal_high != null ? y(s.optimal_high) : top;
              const b = s.optimal_low != null ? y(s.optimal_low) : top + h;
              return <rect x={LBL} width={LANE_W - LBL - RPAD} y={Math.max(top, t)} height={Math.max(0, Math.min(top + h, b) - Math.max(top, t))} fill={BAND} rx={3} />;
            })()}
            {pts.length > 1 && <polyline points={pts.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} fill="none" stroke={INK} strokeOpacity={0.55} strokeWidth={1.6} />}
            {pts.map((p, i) => (
              <g key={p.date + i}>
                <title>{`${dayLabel(p.date.slice(0, 10))}: ${num(p.value)} ${s.unit}`}</title>
                <circle cx={x(p.date)} cy={y(p.value)} r={5} fill={(s.optimal_high != null && p.value > s.optimal_high) || (s.optimal_low != null && p.value < s.optimal_low) ? SHORT : GOOD} stroke={RING} strokeWidth={2} />
              </g>
            ))}
            {pts.length === 0 && (() => {
              const before = s.points.filter((p) => new Date(`${p.date.slice(0, 10)}T12:00:00`) < start).pop();
              return (
                <text x={LBL + 6} y={top + h / 2 + 4} fontSize={11.5} fill={INK}>
                  {before
                    ? `No reading in this window. Last: ${num(before.value)} ${s.unit} on ${dayLabel(before.date.slice(0, 10))}`
                    : `No ${s.display_name.toLowerCase()} reading in this window`}
                </text>
              );
            })()}
          </g>
        );
      },
    });
  }
  const dinnerByDay = new Map(nd.map((d) => [d.date, d.dinner]));
  lanes.push({
    key: 'dinner', label: 'Dinner time', h: 40,
    body: (top, h) => (
      <g>
        {days.map((d) => {
          const t = dinnerByDay.get(d);
          if (!t) return null;
          const late = dinnerCutoff ? toMin(t) >= toMin(dinnerCutoff) : false;
          const cx = x(d);
          return (
            <g key={d}>
              <title>{`${dayLabel(d)}: dinner ${t}${dinnerCutoff ? (late ? ', late' : ', in time') : ''}`}</title>
              {late
                ? <circle cx={cx} cy={top + h / 2} r={4.5} fill="none" stroke={SHORT} strokeWidth={2.2} />
                : <circle cx={cx} cy={top + h / 2} r={5} fill={GOOD} stroke={RING} strokeWidth={1.5} />}
            </g>
          );
        })}
        {nd.length === 0 && <text x={LBL + 6} y={top + h / 2 + 4} fontSize={11.5} fill={INK}>Not shared or not logged</text>}
      </g>
    ),
  });
  const stepsMax = Math.max(stepTarget ?? 0, ...ad.map((d) => d.steps ?? 0)) || 1;
  lanes.push({
    key: 'steps', label: 'Steps', h: 44,
    body: (top, h) => (
      <g>
        {ad.map((d) => {
          if (d.steps == null) return null;
          const bh = Math.max(2, (d.steps / stepsMax) * (h - 6));
          const ok = stepTarget == null || d.steps >= stepTarget;
          return <g key={d.date}><title>{`${dayLabel(d.date)}: ${d.steps.toLocaleString()} steps`}</title><rect x={x(d.date) - Math.max(2, slot / 2 - 1)} width={Math.max(3, slot - 2)} y={top + h - bh} height={bh} rx={2} fill={ok ? GOOD : SHORT} /></g>;
        })}
        {ad.every((d) => d.steps == null) && <text x={LBL + 6} y={top + h / 2 + 4} fontSize={11.5} fill={INK}>Not shared or not logged</text>}
      </g>
    ),
  });
  lanes.push({
    key: 'sleep', label: 'Sleep', h: 44,
    body: (top, h) => (
      <g>
        {ad.map((d) => {
          if (d.sleep_hours == null) return null;
          const bh = Math.max(2, (Math.min(d.sleep_hours, 10) / 10) * (h - 6));
          return <g key={d.date}><title>{`${dayLabel(d.date)}: ${d.sleep_hours.toFixed(1)} h sleep`}</title><rect x={x(d.date) - Math.max(2, slot / 2 - 1)} width={Math.max(3, slot - 2)} y={top + h - bh} height={bh} rx={2} fill={d.sleep_hours < 6 ? SHORT : GOOD} /></g>;
        })}
        {ad.every((d) => d.sleep_hours == null) && <text x={LBL + 6} y={top + h / 2 + 4} fontSize={11.5} fill={INK}>Not shared or not logged</text>}
      </g>
    ),
  });
  lanes.push({
    key: 'cgm', label: 'Glucose sensor', h: 26,
    body: (top, h) => <text x={LBL + 6} y={top + h / 2 + 4} fontSize={11.5} fill={INK} opacity={0.75}>Not connected. Continuous glucose will draw here, on the same days.</text>,
  });

  const GAP = 10;
  let acc = 4;
  const placed = lanes.map((l) => { const top = acc; acc += l.h + GAP; return { ...l, top }; });
  const totalH = acc + 18;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <Label color={T.lime} style={{ marginRight: 'auto' }}>Moving together</Label>
        <div role="radiogroup" aria-label="Time range" style={{ display: 'flex', gap: 6 }}>
          {([['plan', 'Since the plan'], ['all', 'All readings']] as const).map(([k, lbl]) => (
            <button key={k} role="radio" aria-checked={range === k} onClick={() => setRange(k)} className="mc-press"
              style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', borderRadius: 999, padding: '4px 11px',
                color: range === k ? T.ink : INK, background: range === k ? T.lime : T.chip, border: `1px solid ${range === k ? T.lime : T.chipBorder}` }}>
              {lbl}
            </button>
          ))}
        </div>
        {all.length > 0 && (
          <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Marker
            <select
              id="moving-together-marker"
              value={s?.name ?? ''}
              onChange={(e) => onSelect(e.target.value)}
              style={{ fontFamily: 'inherit', fontSize: 12.5, color: INK, background: T.chip, border: `1px solid ${T.chipBorder}`, borderRadius: 8, padding: '4px 8px' }}
            >
              {all.map((m) => <option key={m.name} value={m.name}>{m.display_name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        Bloods and what was logged, on the same days. Side by side, never cause and effect. Lifestyle covers the last 14 days.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${LANE_W} ${totalH}`} width="100%" role="img" aria-label="Blood marker and lifestyle lanes on one date axis" style={{ display: 'block', minWidth: 520 }}>
          {placed.map((l) => (
            <g key={l.key}>
              <text x={0} y={l.top + l.h / 2 + 4} fontSize={11.5} fontWeight={700} fill={INK}>{l.label}</text>
              <line x1={LBL} x2={LANE_W - RPAD} y1={l.top + l.h} y2={l.top + l.h} stroke={GRID} />
              {l.body(l.top, l.h)}
            </g>
          ))}
          {planDate && new Date(`${planDate.slice(0, 10)}T12:00:00`) >= start && (
            <g>
              <line x1={x(planDate)} x2={x(planDate)} y1={0} y2={acc - GAP} stroke={INK} strokeDasharray="4 4" strokeWidth={1.2} />
              <text x={x(planDate) + 4} y={10} fontSize={10.5} fill={INK}>plan set</text>
            </g>
          )}
          <text x={LBL} y={totalH - 4} fontSize={11} fill={INK}>{dayLabel(days[0])}</text>
          <text x={LANE_W - RPAD} y={totalH - 4} fontSize={11} fill={INK} textAnchor="end">{dayLabel(days[days.length - 1])}</text>
        </svg>
      </div>
      <Legend items={[
        { mark: <circle cx="6" cy="6" r="5" fill={GOOD} />, label: 'In range, in time, at target' },
        { mark: <circle cx="6" cy="6" r="4.5" fill={SHORT} />, label: 'Outside range, late or short' },
        { mark: <line x1="0" x2="12" y1="6" y2="6" stroke={INK} strokeDasharray="3 2" />, label: 'Plan set' },
      ]} />
      <TableView
        head={['Day', s ? `${s.display_name} (${s.unit})` : 'Marker', 'Dinner', 'Steps', 'Sleep (h)']}
        rows={days
          .map((d) => {
            const b = s?.points.find((p) => p.date.slice(0, 10) === d);
            const a = ad.find((z) => z.date === d);
            return [dayLabel(d), b ? num(b.value) : '', dinnerByDay.get(d) ?? '', a?.steps != null ? a.steps.toLocaleString() : '', a?.sleep_hours != null ? a.sleep_hours.toFixed(1) : ''];
          })
          .filter((r) => r.slice(1).some((c) => c !== ''))}
      />
    </Card>
  );
}

// ─── KRAFT curve ──────────────────────────────────────────────────────────────

function CurveChart({ pts, field, unit, label }: { pts: KraftPt[]; field: 'Glucose' | 'Insulin'; unit: string; label: string }) {
  const W = 330, H = 150, Lm = 40, Rm = 10, Tm = 10, Bm = 24;
  const ok = pts.filter((p) => p.minute != null && p[field] != null) as { minute: number; Glucose?: number; Insulin?: number }[];
  if (ok.length === 0) return <div style={{ fontSize: 12.5 }}>No {label.toLowerCase()} values on this curve.</div>;
  const vals = ok.map((p) => p[field] as number);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.2 || 1;
  const y = (v: number) => Tm + (1 - (v - Math.max(0, lo - pad)) / (hi + pad - Math.max(0, lo - pad))) * (H - Tm - Bm);
  const x = (m: number) => Lm + (Math.min(m, 120) / 120) * (W - Lm - Rm);
  const ticks = [Math.max(0, lo - pad), (lo + hi) / 2, hi + pad];
  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <figcaption style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>{label} <span style={{ fontWeight: 500 }}>({unit})</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${label} over 120 minutes`} style={{ display: 'block' }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={Lm} x2={W - Rm} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={Lm - 6} y={y(t) + 4} fontSize={10.5} textAnchor="end" fill={INK}>{num(t)}</text>
          </g>
        ))}
        {[0, 30, 60, 90, 120].map((m) => <text key={m} x={x(m)} y={H - 6} fontSize={10.5} textAnchor="middle" fill={INK}>{m}</text>)}
        <polyline points={ok.map((p) => `${x(p.minute)},${y(p[field] as number)}`).join(' ')} fill="none" stroke={GOOD} strokeWidth={2} strokeLinejoin="round" />
        {ok.map((p) => (
          <g key={p.minute}>
            <title>{`${p.minute} min: ${num(p[field] as number)} ${unit}`}</title>
            <circle cx={x(p.minute)} cy={y(p[field] as number)} r={4.5} fill={GOOD} stroke={RING} strokeWidth={2} />
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** The latest KRAFT curve: glucose and insulin over two hours, two charts on one time axis. */
export function KraftCurve({ kraft }: { kraft: PractitionerRecord['kraft'] | null }) {
  const pts = kraft?.points ?? [];
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <Label color={T.lime}>KRAFT curve</Label>
        {kraft?.date && <span style={{ fontSize: 12 }}>{fmtDay(kraft.date)} · clinic test · minutes after the glucose drink</span>}
      </div>
      {pts.length === 0 ? (
        <div style={{ fontSize: 13 }}>No KRAFT curve on the record. KRAFT is a clinic test.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <CurveChart pts={pts} field="Glucose" unit="mmol/L" label="Glucose" />
            <CurveChart pts={pts} field="Insulin" unit="µIU/mL" label="Insulin" />
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Drawn from the stored points. The pattern is yours to read; MeO does not classify curves.</div>
          <TableView head={['Minute', 'Glucose (mmol/L)', 'Insulin (µIU/mL)']}
            rows={pts.map((p) => [p.minute ?? '—', p.Glucose ?? '—', p.Insulin ?? '—'])} />
        </>
      )}
    </Card>
  );
}

// ─── Their own commitments ────────────────────────────────────────────────────

export function CommitmentChips({ commitments }: { commitments: Commitment[] }) {
  if (!commitments.length) return <div style={{ fontSize: 13 }}>None made with the coach since the last session.</div>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {commitments.map((c, i) => (
        <span key={i} title={c.timeframe || undefined} style={{ fontSize: 12.5, borderRadius: 10, padding: '7px 12px', background: 'rgba(var(--mc-fg-rgb),0.05)', border: `1px solid ${T.rowBorder}` }}>
          {c.commitment}
          <span style={{ fontWeight: 700, marginLeft: 8, color: c.followed_up ? GOOD : SHORT }}>{c.followed_up ? 'followed up' : 'open'}</span>
        </span>
      ))}
    </div>
  );
}
