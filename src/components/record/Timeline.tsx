'use client';

import React, { useState } from 'react';
import { FlaskConical, Droplets, Ruler, Circle, Hospital } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
import { RecordResponse, Reading, CAPTURE_LABEL, fmtDate } from '@/components/record/RecordHome';

/**
 * The record in one chronological order.
 *
 * The point of this screen is not the list — it is the last line on it:
 * nothing here is inferred. Every row is something a device measured, the
 * patient entered, or a lab reported. A metabolic record that quietly mixes
 * measured and estimated values is worth less than one that is smaller and
 * honest about where each number came from, because a practitioner reading it
 * has to know which numbers they can lean on.
 *
 * So each row carries its kind and, where we recorded it, how it was captured.
 * Where capture was never recorded — which is every reading taken before we
 * started writing that field — the row says nothing rather than guessing.
 */

const KINDS: Record<string, { label: string; Icon: typeof FlaskConical; note: string }> = {
  panel: { label: 'Lipid panel', Icon: FlaskConical, note: 'Triglycerides and HDL together: a sitting at the meter' },
  insulin: { label: 'Insulin panel', Icon: Hospital, note: 'Insulin comes back from a lab, not an at-home meter' },
  body: { label: 'Measurements', Icon: Ruler, note: 'Weight, waist or height' },
  other: { label: 'Entry', Icon: Circle, note: '' },
};

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'panel', label: 'Lipid panels' },
  { id: 'insulin', label: 'Clinic' },
  { id: 'body', label: 'Measurements' },
];

const SOURCE_CHIP: Record<string, { label: string; color: string; bg: string; bd: string }> = {
  panel:   { label: 'meter',  color: '#a4d65e', bg: 'rgba(164,214,94,0.12)', bd: 'rgba(164,214,94,0.3)' },
  insulin: { label: 'clinic', color: '#7cc5d8', bg: 'rgba(124,197,216,0.12)', bd: 'rgba(124,197,216,0.3)' },
  body:    { label: 'typed',  color: '#c3d0d0', bg: 'rgba(255,255,255,0.07)', bd: 'rgba(255,255,255,0.14)' },
  other:   { label: 'entry',  color: '#a3b4b4', bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.12)' },
};

function Row({ reading, colors }: { reading: Reading & { kind?: string }; colors: Record<string, string> }) {
  const kind = KINDS[reading.kind ?? 'other'] ?? KINDS.other;
  const { Icon } = kind;
  const chip = SOURCE_CHIP[reading.kind ?? 'other'] ?? SOURCE_CHIP.other;
  const capture = reading.captured_by ? CAPTURE_LABEL[reading.captured_by] : null;
  const markers = Object.keys(reading.values).length;
  const time = reading.time ? reading.time.slice(11, 16) : null;

  return (
    <li className="flex items-center" style={{ gap: 14, padding: '14px 0', borderTop: `1px solid ${colors.cardBorder}` }}>
      {/* Date column, as the frame has it: the day over the time. */}
      <div style={{ width: 86, flex: 'none' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.foreground }}>{fmtDate(reading.date)}</div>
        {time && <div style={{ fontSize: 11.5, color: colors.mutedDim }}>{time}</div>}
      </div>

      <div
        className="flex items-center justify-center"
        style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'rgba(255,255,255,0.06)' }}
      >
        <Icon className="h-4 w-4" style={{ color: colors.primary }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: colors.foreground }}>{kind.label}</span>
          {reading.bas != null && (
            <span style={{ fontSize: 13.5, color: colors.primary }}>BAS {reading.bas.toFixed(1)}</span>
          )}
          {reading.bas != null && reading.score_caveat && (
            <span style={{ fontSize: 11.5, color: colors.warning }} title={reading.score_caveat}>provisional</span>
          )}
          {reading.is_panel && reading.bas == null && (
            <span style={{ fontSize: 11.5, color: colors.warning }}>no score</span>
          )}
        </div>
        {reading.is_panel && reading.bas == null && reading.no_score_reason && (
          <div style={{ fontSize: 11.5, color: colors.warning, marginTop: 2 }}>{reading.no_score_reason}</div>
        )}
        {reading.bas != null && reading.score_caveat && (
          <div style={{ fontSize: 11.5, color: colors.warning, marginTop: 2 }}>{reading.score_caveat}</div>
        )}
        <div style={{ fontSize: 11.5, color: colors.mutedDim, marginTop: 2 }}>
          {markers} value{markers === 1 ? '' : 's'}
          {reading.fasted ? ' · fasted' : ''}
          {capture ? ` · ${capture}` : ' · capture not recorded'}
        </div>
      </div>

      <span
        style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: chip.color, background: chip.bg, border: `1px solid ${chip.bd}`,
          borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap', flex: 'none',
        }}
      >
        {chip.label}
      </span>
    </li>
  );
}

/** Real counts per source — including the ones that are zero, which is itself information. */
export function DataSources({ record }: { record: RecordResponse }) {
  const { colors } = useTheme();
  const readings = record.readings as (Reading & { kind?: string })[];
  const count = (k: string) => readings.filter((r) => r.kind === k).length;

  const rows = [
    { label: 'Your meter', detail: 'lipid panels', n: count('panel') },
    { label: 'Clinic', detail: 'insulin panels', n: count('insulin') },
    { label: 'Measurements', detail: 'weight, waist, height', n: count('body') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="t-label" style={{ color: colors.mutedDim }}>
          Where your data comes from
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="min-w-0 flex-1">
              <p className="t-lead font-medium truncate">{r.label}</p>
              <p className="t-body2" style={{ color: colors.muted }}>{r.detail}</p>
            </div>
            <span className="t-lg font-extrabold tabular-nums" style={{ color: r.n ? colors.primary : colors.muted }}>
              {r.n}
            </span>
          </div>
        ))}
      </div>

      <p className="t-dense leading-relaxed" style={{ color: colors.muted }}>
        Nothing here is inferred. Every row is something a device measured, you
        entered, or a lab reported.
      </p>
    </div>
  );
}

export function Timeline({ record }: { record: RecordResponse }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
  const readings = record.readings as (Reading & { kind?: string })[];
  const shown = filter === 'all' ? readings : readings.filter((r) => r.kind === filter);

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title="Your timeline"
        subtitle="Every reading, every import, every score, in one order"
        right={<Chip>{readings.length} entries</Chip>}
      />
      <ScreenBody gap={10}>
      <div className="flex gap-2 flex-wrap mb-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const n = f.id === 'all' ? readings.length : readings.filter((r) => r.kind === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className="px-3 py-1.5 rounded-full t-body2 font-medium transition-colors"
              style={{
                color: active ? colors.primary : colors.muted,
                backgroundColor: active ? 'rgba(164,214,94,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(164,214,94,0.45)' : colors.cardBorder}`,
              }}
            >
              {f.label} <span style={{ opacity: 0.7 }}>{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="t-lead py-8" style={{ color: colors.muted }}>
          Nothing of that kind on your record yet.
        </p>
      ) : (
        <ul className="list-none p-0 m-0">
          {shown.map((r) => (
            <Row key={r.series} reading={r} colors={colors as unknown as Record<string, string>} />
          ))}
        </ul>
      )}
      </ScreenBody>
    </div>
  );
}

export default Timeline;
