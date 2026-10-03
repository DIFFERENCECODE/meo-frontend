'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { TrendChart, TrendPoint } from '@/components/analysis/TrendChart';

export interface Reading {
  series: string;
  date: string | null;
  time: string | null;
  fasted: boolean;
  values: Record<string, number>;
  bas: number | null;
  has_score: boolean;
  is_panel: boolean;
  /** What sort of sitting this was: panel | insulin | body | other. */
  kind?: string;
  /**
   * How the reading was captured: 'device', 'typed', 'lab', or 'mixed' when a
   * single sitting combined them. Null for every reading taken before we
   * started recording it, which is most of the existing record — so the UI
   * must treat absence as "not known", never as "typed".
   */
  capture?: Record<string, string>;
  captured_by?: string | null;
}

interface DeltaEntry {
  from: number;
  to: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
  improved: boolean | null;
}

export interface RecordResponse {
  readings: Reading[];
  reading_count: number;
  panel_count: number;
  latest: Reading | null;
  previous: Reading | null;
  delta: Record<string, DeltaEntry>;
  series: Record<string, TrendPoint[]>;
  readings_without_score: number;
}

/**
 * How a reading was captured, in words a patient reads rather than the
 * engine's vocabulary. Deliberately plain: "typed" is not an apology, it is
 * what happened, and a practitioner reading the brief later needs to know
 * the difference between a number a meter produced and one a person
 * transcribed — that transcription step is where unit slips live.
 */
export const CAPTURE_LABEL: Record<string, string> = {
  device: 'from your meter',
  typed: 'entered by hand',
  lab: 'from the lab',
  mixed: 'mixed sources',
};

export const LABELS: Record<string, { label: string; unit: string }> = {
  Triglyceride: { label: 'Triglycerides', unit: 'mmol/L' },
  HDL: { label: 'HDL', unit: 'mmol/L' },
  LDL: { label: 'LDL', unit: 'mmol/L' },
  Cholesterol: { label: 'Total cholesterol', unit: 'mmol/L' },
  Glucose: { label: 'Fasting glucose', unit: 'mmol/L' },
  Waist: { label: 'Waist', unit: 'cm' },
  Weight: { label: 'Weight', unit: 'kg' },
};

/** The order the storyboard lists them in. BAS is the headline, not a row. */
export const DELTA_ORDER = ['Triglyceride', 'HDL', 'Glucose', 'Waist', 'LDL', 'Cholesterol', 'Weight'];

export function fmtDate(d: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

/**
 * The patient's record — the app's home.
 *
 * The one thing this screen must do is answer "which way am I heading, and
 * what moved it". Everything else is secondary to that, including the chat.
 *
 * Proportional attribution — how much of the score change each input is
 * responsible for — needs bang's METS-IR/VF formula and lands with that work.
 * Until then this shows the honest version: each input's change, and which
 * direction is an improvement, without claiming a share it cannot compute.
 */
interface RecordHomeProps {
  record: RecordResponse | null;
  state: 'loading' | 'ready' | 'empty' | 'error';
}

export function RecordHome({ record, state }: RecordHomeProps) {
  const { colors } = useTheme();
  const loading = state === 'loading';
  const error = state === 'error' ? 'load-failed' : null;

  if (loading) {
    return (
      <div className="py-24 text-center text-sm" style={{ color: colors.muted }}>
        Loading your record…
      </div>
    );
  }

  // No readings yet is the normal state between signing up and the first test,
  // not an error. It gets the day-one screen: one job, book a reading.
  if (state === 'empty') return <DayOne />;

  if (error || !record || !record.latest) {
    return (
      <div
        className="rounded-xl p-5 flex items-start gap-3 max-w-2xl"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: colors.warning }} />
        <p className="text-sm" style={{ color: colors.foreground }}>
          Could not load your record just now.
        </p>
      </div>
    );
  }

  const latest = record.latest;
  const previous = record.previous;
  const basDelta = record.delta?.BAS;
  const basSeries = record.series?.BAS ?? [];

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      {/* ── Score, direction, trajectory ─────────────────────────────── */}
      <section
        className="rounded-2xl p-6"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: colors.primary }}
            >
              Biological Age Score
            </p>
            <div className="flex items-baseline gap-3 mt-1">
              <span
                className="text-6xl font-extrabold tracking-tight leading-none"
                style={{ color: colors.foreground }}
              >
                {latest.bas != null ? latest.bas.toFixed(1) : '—'}
              </span>
              {basDelta && (
                <span
                  className="text-lg font-bold"
                  style={{
                    color: basDelta.improved ? colors.success : colors.warning,
                  }}
                >
                  {basDelta.direction === 'down' ? '▼' : basDelta.direction === 'up' ? '▲' : '—'}{' '}
                  {Math.abs(basDelta.change).toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-sm mt-2" style={{ color: colors.muted }}>
              {latest.bas == null
                ? 'This reading has no score yet'
                : previous
                  ? `since ${fmtDate(previous.date)}`
                  : 'your first score'}
            </p>
          </div>

          {basSeries.length > 1 && (
            <div className="flex-1 min-w-[260px]">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em] mb-1"
                style={{ color: colors.muted }}
              >
                Last {basSeries.length} scores
              </p>
              <TrendChart points={basSeries} height={110} lowerIsBetter />
            </div>
          )}
        </div>
      </section>

      {/* ── What moved it ────────────────────────────────────────────── */}
      {previous && Object.keys(record.delta).length > 0 && (
        <section
          className="rounded-2xl p-6"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: colors.muted }}
            >
              What changed
            </p>
            <p className="text-xs" style={{ color: colors.muted }}>
              {fmtDate(previous.date)} → {fmtDate(latest.date)}
            </p>
          </div>

          {DELTA_ORDER.filter((k) => record.delta[k]).map((key, i, arr) => {
            const d = record.delta[key];
            const meta = LABELS[key] ?? { label: key, unit: '' };
            const Icon =
              d.direction === 'down' ? TrendingDown : d.direction === 'up' ? TrendingUp : Minus;
            const tone =
              d.improved === null
                ? colors.muted
                : d.improved
                  ? colors.success
                  : colors.warning;
            return (
              <div
                key={key}
                className="flex items-center gap-4 py-3"
                style={{
                  borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${colors.cardBorder}`,
                }}
              >
                <span className="flex-1 text-sm" style={{ color: colors.muted }}>
                  {meta.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {d.from} → {d.to}
                </span>
                <Icon className="h-4 w-4" style={{ color: tone }} />
                <span className="w-24 text-right text-xs" style={{ color: colors.muted }}>
                  {meta.unit}
                </span>
              </div>
            );
          })}

          <p className="text-[11px] mt-3" style={{ color: colors.muted }}>
            Compared with your own last reading, not a population range. The score itself is
            computed in deterministic code, never by the model.
          </p>
        </section>
      )}

      {/* ── Unscored readings: surfaced, not hidden ──────────────────── */}
      {record.readings_without_score > 0 && (
        <section
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.warning}` }}
        >
          <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: colors.warning }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
              {record.readings_without_score} of your {record.panel_count} readings have no score
            </p>
            <p className="text-xs mt-1" style={{ color: colors.muted }}>
              A score needs a full set of fasting values, and every value has to be plausible.
              A reading entered in the wrong units cannot be scored.
            </p>
          </div>
        </section>
      )}

      {/* ── Next actions ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/trends"
          className="rounded-xl p-4 flex items-center gap-3 transition-colors"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.accent }}
          >
            <TrendingDown className="h-5 w-5" style={{ color: colors.primary }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
              See your trend
            </p>
            <p className="text-xs" style={{ color: colors.muted }}>
              {record.panel_count} readings
            </p>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: colors.muted }} />
        </Link>

        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.accent }}
          >
            <Check className="h-5 w-5" style={{ color: colors.primary }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
              Last reading
            </p>
            <p className="text-xs" style={{ color: colors.muted }}>
              {fmtDate(latest.date)}
              {latest.fasted ? ' · fasted' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Day one: one reading, or none.
 *
 * Three of the four things the record shows are empty at N=1, so the screen
 * stops pretending to be a record and does the only useful thing — get the
 * patient to a second reading.
 */
function DayOne() {
  const { colors } = useTheme();
  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <section
        className="rounded-2xl p-6"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        <h2 className="text-xl font-bold" style={{ color: colors.foreground }}>
          One reading is a starting point
        </h2>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: colors.muted }}>
          Your second reading is when this number starts to mean something — it shows which
          way you are moving, and which of your numbers is moving it.
        </p>
      </section>

      <Link
        href="/?test=bas"
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.primary}` }}
      >
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: colors.accent }}
        >
          <Clock className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold" style={{ color: colors.foreground }}>
            Take a guided reading
          </p>
          <p className="text-sm" style={{ color: colors.muted }}>
            Fasted, before breakfast. About 8 minutes, one strip.
          </p>
        </div>
        <ArrowRight className="h-5 w-5" style={{ color: colors.primary }} />
      </Link>
    </div>
  );
}

export default RecordHome;

/**
 * The right column on the record: this reading's raw values.
 *
 * The main column answers "which way am I heading"; this one answers "what
 * were the actual numbers". Keeping them apart is what stops the score card
 * turning into a lab report — the patient sees the direction first and the
 * values only when they look across.
 */
export function ThisReadingPanel({ record }: { record: RecordResponse }) {
  const { colors } = useTheme();
  const latest = record.latest;
  if (!latest) return null;

  const rows = DELTA_ORDER.filter((k) => latest.values[k] != null);

  return (
    <div className="p-5 flex flex-col gap-4">
      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: colors.muted }}
        >
          This reading
        </p>
        <p className="text-sm mt-1" style={{ color: colors.foreground }}>
          {fmtDate(latest.date)}
          {latest.fasted ? ' · fasted' : ''}
          {latest.captured_by ? ` · ${CAPTURE_LABEL[latest.captured_by] ?? latest.captured_by}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((key) => {
          const meta = LABELS[key] ?? { label: key, unit: '' };
          return (
            <div
              key={key}
              className="rounded-xl p-3"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <p className="text-[11px]" style={{ color: colors.muted }}>
                {meta.label}
              </p>
              <p
                className="text-xl font-extrabold tracking-tight"
                style={{ color: colors.foreground }}
              >
                {latest.values[key]}
              </p>
              <p className="text-[10px]" style={{ color: colors.muted }}>
                {meta.unit}
              </p>
            </div>
          );
        })}
      </div>

      {!latest.has_score && (
        <div
          className="rounded-xl p-3"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: `1px solid ${colors.warning}`,
          }}
        >
          <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>
            This reading has no score. A score needs a full set of plausible fasting values.
          </p>
        </div>
      )}
    </div>
  );
}
