'use client';

import React, { useState } from 'react';
import { FlaskConical, Droplets, Ruler, Circle, Hospital } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
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
  panel: { label: 'Lipid panel', Icon: FlaskConical, note: 'Triglycerides and HDL together — a sitting at the meter' },
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

function Row({ reading, colors }: { reading: Reading & { kind?: string }; colors: Record<string, string> }) {
  const kind = KINDS[reading.kind ?? 'other'] ?? KINDS.other;
  const { Icon } = kind;
  const capture = reading.captured_by ? CAPTURE_LABEL[reading.captured_by] : null;
  const markers = Object.keys(reading.values).length;

  return (
    <li className="flex gap-3 py-4" style={{ borderTop: `1px solid ${colors.cardBorder}` }}>
      <div
        className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'rgba(164,214,94,0.12)' }}
      >
        <Icon className="h-4 w-4" style={{ color: colors.primary }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold">{kind.label}</span>
          {reading.bas != null && (
            <span className="text-sm" style={{ color: colors.primary }}>
              BAS {reading.bas.toFixed(1)}
            </span>
          )}
          {reading.is_panel && reading.bas == null && (
            <span className="text-xs" style={{ color: '#f0a05a' }}>
              no score
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: colors.muted }}>
          {markers} value{markers === 1 ? '' : 's'}
          {reading.fasted ? ' · fasted' : ''}
          {capture ? ` · ${capture}` : ' · capture not recorded'}
        </p>
      </div>
      <time className="text-xs shrink-0 tabular-nums" style={{ color: colors.muted }}>
        {fmtDate(reading.date)}
      </time>
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
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: colors.muted }}>
          Where your data comes from
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{r.label}</p>
              <p className="text-xs" style={{ color: colors.muted }}>{r.detail}</p>
            </div>
            <span className="text-lg font-bold tabular-nums" style={{ color: r.n ? colors.primary : colors.muted }}>
              {r.n}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: colors.muted }}>
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
    <div className="w-full max-w-3xl mx-auto px-5 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Your timeline</h1>
        <p className="text-sm mt-1" style={{ color: colors.muted }}>
          Every reading in one order, each tagged with where it came from.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap mb-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const n = f.id === 'all' ? readings.length : readings.filter((r) => r.kind === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
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
        <p className="text-sm py-8" style={{ color: colors.muted }}>
          Nothing of that kind on your record yet.
        </p>
      ) : (
        <ul className="list-none p-0 m-0">
          {shown.map((r) => (
            <Row key={r.series} reading={r} colors={colors as unknown as Record<string, string>} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default Timeline;
