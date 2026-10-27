'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Download, FileText, FlaskConical, Lock, Smartphone, Utensils } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody } from '@/components/layout/ScreenHeader';
import { RecordResponse, Reading, CAPTURE_LABEL } from '@/components/record/RecordHome';
import { usePractitionerNotes, shortPractitionerName, type PractitionerNote } from '@/components/record/PractitionerNotes';
import { fmtHours, type Lifestyle } from '@/components/record/lifestyle';

/**
 * The record in one chronological order (storyboard frame 06).
 *
 * The point of this screen is the last line of its sources sheet: nothing here
 * is inferred. Every row is something a device measured, the phone or food log
 * sent, the patient typed, a lab reported, or the practitioner wrote, and each
 * row carries a chip saying which. Rows are built from what the record holds;
 * a day nobody logged is simply absent, never filled in.
 */

type Source = 'meter' | 'app' | 'typed' | 'clinic' | 'practitioner';

interface Event {
  key: string;
  date: string;          // YYYY-MM-DD, London
  time: string | null;   // HH:MM, when the source recorded one
  title: string;
  sub: string;
  source: Source;
  dot: string;
  kind: 'reading' | 'app' | 'typed' | 'clinic' | 'practitioner';
}

const FILTERS: { id: 'all' | Event['kind']; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'reading', label: 'Readings' },
  { id: 'app', label: 'From the app' },
  { id: 'typed', label: 'Typed' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'practitioner', label: 'Practitioner' },
];

const CHIP: Record<Source, { label: string; upper?: boolean; color: string; bg: string; bd: string }> = {
  meter:        { label: 'meter', color: 'var(--mc-accent)', bg: 'rgba(var(--mc-accent-rgb),0.12)', bd: 'rgba(var(--mc-accent-rgb),0.35)' },
  app:          { label: 'from the app', upper: true, color: 'var(--mc-blue)', bg: 'rgba(124,197,216,0.12)', bd: 'rgba(124,197,216,0.35)' },
  typed:        { label: 'typed', color: 'var(--mc-text)', bg: 'rgba(var(--mc-fg-rgb),0.07)', bd: 'rgba(var(--mc-fg-rgb),0.16)' },
  clinic:       { label: 'clinic', color: 'var(--mc-text)', bg: 'rgba(var(--mc-fg-rgb),0.07)', bd: 'rgba(var(--mc-fg-rgb),0.16)' },
  practitioner: { label: 'practitioner', color: 'var(--mc-text)', bg: 'rgba(var(--mc-fg-rgb),0.07)', bd: 'rgba(var(--mc-fg-rgb),0.16)' },
};

const londonDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
const londonTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });

/** "Today", "Yesterday", "Tue 9 Sep", or "1 Apr 2025" for another year. */
function dayLabel(date: string): string {
  const today = londonDate(new Date().toISOString());
  const yesterday = londonDate(new Date(Date.now() - 86400000).toISOString());
  if (date === today) return 'Today';
  if (date === yesterday) return 'Yesterday';
  const d = new Date(`${date}T12:00:00`);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', sameYear
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

const n1 = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

function readingEvents(readings: Reading[]): Event[] {
  // Oldest first, so a panel's number and its BAS change read in the order
  // they happened; the list is re-sorted newest first afterwards.
  const chrono = [...readings].sort((a, b) => (a.time ?? a.date ?? '').localeCompare(b.time ?? b.date ?? ''));
  let panelNo = 0;
  let lastBas: number | null = null;
  return chrono.map((r) => {
    const time = r.time ? r.time.slice(11, 16) : null;
    const base = { key: `r-${r.series}`, date: r.date ?? '', time };
    const capture = r.captured_by ? CAPTURE_LABEL[r.captured_by] : null;

    if (r.kind === 'insulin') {
      const n = Object.keys(r.values).length;
      return { ...base, title: 'Insulin panel · clinic', sub: `${n} value${n === 1 ? '' : 's'}, lab-analysed`, source: 'clinic', dot: 'var(--mc-blue)', kind: 'clinic' };
    }
    if (r.kind === 'body') {
      const parts = [
        r.values.Waist != null && `Waist ${n1(r.values.Waist)} cm`,
        r.values.Weight != null && `weight ${n1(r.values.Weight)} kg`,
        r.values.Height != null && `height ${n1(r.values.Height)} cm`,
      ].filter(Boolean) as string[];
      return { ...base, title: parts.join(' · ') || 'Measurements', sub: capture === 'entered by hand' || !capture ? 'typed by you' : capture, source: 'typed', dot: 'rgba(var(--mc-fg-rgb),0.45)', kind: 'typed' };
    }
    if (r.kind === 'panel') {
      panelNo += 1;
      let title = `Reading ${panelNo}`;
      if (r.bas != null) {
        title += ` · BAS ${r.bas.toFixed(1)}`;
        if (lastBas != null) {
          const d = r.bas - lastBas;
          title += ` ${d < 0 ? '▼' : d > 0 ? '▲' : ''}${Math.abs(d).toFixed(1)}`;
        }
        lastBas = r.bas;
      }
      const sub = [
        capture ?? 'capture not recorded',
        r.fasted ? 'fasted' : null,
        r.bas != null && r.score_caveat ? 'score provisional' : null,
        r.bas == null ? 'no score' : null,
      ].filter(Boolean).join(' · ');
      const typed = r.captured_by === 'typed';
      return { ...base, title, sub, source: typed ? 'typed' : 'meter', dot: 'var(--mc-accent)', kind: 'reading' };
    }
    const n = Object.keys(r.values).length;
    return { ...base, title: 'Entry', sub: `${n} value${n === 1 ? '' : 's'}`, source: 'typed', dot: 'rgba(var(--mc-fg-rgb),0.45)', kind: 'typed' };
  }) as Event[];
}

function appEvents(lifestyle: Lifestyle | null): Event[] {
  if (!lifestyle) return [];
  const out: Event[] = [];
  for (const d of lifestyle.nutrition.daily ?? []) {
    if (!d.meals) continue;
    const title = `${d.meals} meal${d.meals === 1 ? '' : 's'} logged${d.kcal ? ` · ${d.kcal.toLocaleString()} kcal` : ''}`;
    const sub = [d.dinner && `dinner at ${d.dinner}`, d.protein && `${d.protein}g protein`].filter(Boolean).join(' · ') || 'food log';
    out.push({ key: `m-${d.date}`, date: d.date, time: d.last, title, sub, source: 'app', dot: 'var(--mc-orange)', kind: 'app' });
  }
  for (const d of lifestyle.activity.daily ?? []) {
    if (d.sleep_hours != null) {
      const short = d.sleep_hours < 6;
      out.push({
        key: `s-${d.date}`, date: d.date, time: null, title: `${fmtHours(d.sleep_hours)} sleep`,
        sub: short ? 'a short night, under 6 hours' : 'from your phone', source: 'app',
        dot: short ? '#f2b134' : 'var(--mc-blue)', kind: 'app',
      });
    }
    if (d.steps != null) {
      out.push({ key: `a-${d.date}`, date: d.date, time: null, title: `${d.steps.toLocaleString()} steps`, sub: 'from your phone', source: 'app', dot: 'var(--mc-accent)', kind: 'app' });
    }
  }
  return out;
}

/** One row per sitting: a plan written together is one event, not eight. */
function practitionerEvents(notes: PractitionerNote[] | null): Event[] {
  if (!notes) return [];
  const groups = new Map<string, PractitionerNote[]>();
  for (const n of notes) {
    const k = `${n.kind === 'plan' ? 'plan' : 'note'}-${n.created_at.slice(0, 16)}`;
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }
  return [...groups.entries()].map(([k, g]) => {
    const short = shortPractitionerName(g[0].practitioner_name);
    const who = short.charAt(0).toUpperCase() + short.slice(1);
    const plan = k.startsWith('plan');
    const body = g[0].body.length > 70 ? `${g[0].body.slice(0, 68)}…` : g[0].body;
    return {
      key: `p-${k}`, date: londonDate(g[0].created_at), time: londonTime(g[0].created_at),
      title: plan ? `${who} wrote your plan · ${g.length} line${g.length === 1 ? '' : 's'}` : `${who} left you a note`,
      sub: `“${body}”`, source: 'practitioner', dot: 'var(--mc-accent)', kind: 'practitioner',
    } as Event;
  });
}

function exportCsv(rows: Event[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ['date,time,source,what,detail', ...rows.map((e) =>
    [e.date, e.time ?? '', CHIP[e.source].label, e.title, e.sub].map(esc).join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `meo-timeline-${londonDate(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Row({ e, last }: { e: Event; last: boolean }) {
  const { colors } = useTheme();
  const chip = CHIP[e.source];
  return (
    <li className="flex items-center" style={{ gap: 16, padding: '13px 22px', borderBottom: last ? undefined : `1px solid ${colors.cardBorder}` }}>
      <div style={{ width: 92, flex: 'none' }}>
        <div style={{ fontSize: 15, color: colors.muted }}>{dayLabel(e.date)}</div>
        {e.time && <div style={{ fontSize: 13.5, color: colors.mutedDim }}>{e.time}</div>}
      </div>
      {/* Dot and its stem, as the frame draws them. */}
      <div aria-hidden className="flex flex-col items-center self-stretch" style={{ width: 10, flex: 'none', paddingTop: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: e.dot }} />
        <span style={{ width: 2, flex: 1, minHeight: 14, marginTop: 4, borderRadius: 1, background: 'rgba(var(--mc-fg-rgb),0.12)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.foreground }}>{e.title}</div>
        <div style={{ fontSize: 14, color: colors.mutedDim, marginTop: 2 }}>{e.sub}</div>
      </div>
      <span
        style={{
          fontSize: chip.upper ? 12 : 13, fontWeight: 700, letterSpacing: chip.upper ? '0.08em' : 0,
          textTransform: chip.upper ? 'uppercase' : 'none', color: chip.color, background: chip.bg,
          border: `1px solid ${chip.bd}`, borderRadius: 999, padding: '6px 11px', whiteSpace: 'nowrap', flex: 'none',
        }}
      >
        {chip.label}
      </span>
    </li>
  );
}

/** Real counts per source, including the ones that are zero, which is itself information. */
export function DataSources({ record, lifestyle }: { record: RecordResponse; lifestyle: Lifestyle | null }) {
  const { colors } = useTheme();
  const readings = record.readings as Reading[];
  const count = (k: string) => readings.filter((r) => r.kind === k).length;
  const fasted = readings.filter((r) => r.kind === 'panel' && r.fasted).length;
  const phoneDays = (lifestyle?.activity.daily ?? []).filter((d) => d.steps != null || d.sleep_hours != null).length;
  const meals = (lifestyle?.nutrition.daily ?? []).reduce((s, d) => s + (d.meals || 0), 0);

  const rows = [
    { label: 'Your meter', detail: `lipid panels${fasted ? ` · ${fasted} fasted` : ''}`, n: String(count('panel')), Icon: FlaskConical, tone: 'var(--mc-accent)' },
    { label: 'Your phone', detail: 'sleep and steps · last 30 days', n: phoneDays ? `${phoneDays}d` : '0', Icon: Smartphone, tone: 'var(--mc-blue)' },
    { label: 'Food log', detail: 'photo meals from the app · last 30 days', n: String(meals), Icon: Utensils, tone: 'var(--mc-orange)' },
    { label: 'Typed by you', detail: 'waist, weight, height', n: String(count('body')), Icon: FileText, tone: 'var(--mc-text)' },
    { label: 'Clinic', detail: 'insulin panels', n: String(count('insulin')), Icon: CalendarDays, tone: 'var(--mc-blue)' },
  ];

  return (
    <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p className="t-label" style={{ color: colors.mutedDim, margin: '0 0 4px' }}>Where your data comes from</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ label, detail, n, Icon, tone }) => (
          <div key={label} className="flex items-center" style={{ gap: 12, background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '13px 16px' }}>
            <Icon className="h-4 w-4" style={{ color: tone, flex: 'none' }} />
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 15.5, fontWeight: 600, color: colors.foreground }}>{label}</div>
              <div style={{ fontSize: 13.5, color: colors.mutedDim }}>{detail}</div>
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: n === '0' ? colors.mutedDim : tone }}>{n}</span>
          </div>
        ))}
      </div>
      <p className="flex items-start" style={{ gap: 8, margin: 0, fontSize: 14, lineHeight: 1.5, color: colors.muted, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, padding: '11px 16px' }}>
        <Lock className="h-3.5 w-3.5" style={{ marginTop: 3, flex: 'none' }} />
        Nothing here is inferred. Every row is something a device measured, you entered, or a lab reported.
      </p>
    </div>
  );
}

export function Timeline({ record, lifestyle }: { record: RecordResponse; lifestyle: Lifestyle | null }) {
  const { colors } = useTheme();
  const { notes } = usePractitionerNotes();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  const events = useMemo(() => {
    const all = [...readingEvents(record.readings), ...appEvents(lifestyle), ...practitionerEvents(notes)];
    // Newest first; within a day, timed rows by time, untimed ones after.
    return all.sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''));
  }, [record, lifestyle, notes]);
  const shown = filter === 'all' ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="Your timeline"
        subtitle="Every reading, every import, every score, in one order"
        right={
          <button
            type="button"
            onClick={() => exportCsv(shown)}
            className="meo-press inline-flex items-center"
            style={{ gap: 6, fontSize: 14, fontWeight: 600, color: colors.foreground, cursor: 'pointer', background: 'rgba(var(--mc-fg-rgb),0.07)', border: '1px solid rgba(var(--mc-fg-rgb),0.14)', borderRadius: 999, padding: '6px 13px' }}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        }
      />
      <ScreenBody gap={12}>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className="meo-press"
                style={{
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '6px 14px',
                  color: active ? 'var(--mc-on-accent)' : colors.muted,
                  background: active ? 'var(--mc-accent)' : 'rgba(var(--mc-fg-rgb),0.06)',
                  border: `1px solid ${active ? 'var(--mc-accent)' : colors.cardBorder}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, overflow: 'hidden' }}>
          {shown.length === 0 ? (
            <p style={{ fontSize: 15.5, color: colors.muted, padding: '22px', margin: 0 }}>
              {filter === 'app' ? 'Nothing from the app yet. Meals, sleep and steps appear here once your phone sends them.' : 'Nothing of that kind on your record yet.'}
            </p>
          ) : (
            <ul data-tour="timeline-list" className="list-none p-0 m-0">
              {shown.map((e, i) => <Row key={e.key} e={e} last={i === shown.length - 1} />)}
            </ul>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default Timeline;
