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
import { useMyPractitioner } from '@/components/record/PractitionerNotes';
import { ScreenHeader, ScreenBody, Chip } from '@/components/layout/ScreenHeader';
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
  /**
   * Values kept on the record but not believed, with a plain reason: a waist
   * that is clearly inches, an HDL no home strip should read. They are left
   * out of every comparison, and the screen says so beside them.
   */
  held_back?: Record<string, string>;
  /** Set when a score was computed from a held-back value. */
  score_caveat?: string | null;
  /** Why a lipid panel has no score, in words the patient can act on. */
  no_score_reason?: string | null;
  /** A measurement entered more than once in one sitting, and which was used. */
  conflict_notes?: string[];
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
  onRetry?: () => void;
}

/**
 * The record, built to the storyboard frame rather than approximated.
 *
 * Geometry is taken from the exported frame and matched exactly: the 20/28
 * header gutter, the 18/28 body gutter, the 14px stack gap, 16px card radius,
 * the 68px score at weight 800 and -0.045em, the 96x6 bars at radius 3, and
 * the 24/96/104 column widths in the attribution rows.
 *
 * Two labelled departures, both for the same reason — the frame shows data we
 * do not hold, and drawing it anyway would be inventing clinical content:
 *
 * 1. The heading is "What changed most", not "What moved it", and the notes
 *    read "largest move" rather than "most of the drop". The bars are each
 *    marker's share of total *movement*, which is computable from the record.
 *    Share of the *score change* needs the METS-IR -> METS-VF decomposition,
 *    which runs in the measurement engine. When that lands, the heading and
 *    the notes become the causal ones and nothing else here changes.
 * 2. "Around it" renders its row exactly, but sleep, steps and dinner time are
 *    captured on the phone and the web cannot see them, so it says so instead
 *    of showing numbers.
 */
/** "Morning, Sarah": the frames greet the person before showing the record. */
function greeting(name: string | null) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  return name ? `${part}, ${name}` : 'My record';
}

export function RecordHome({ record, state, onRetry }: RecordHomeProps) {
  const { colors } = useTheme();
  const practitioner = useMyPractitioner();
  const [firstName, setFirstName] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        // The profile's name, not the login's: a Cognito username is often
        // an email handle ("alechenuiyoko"), which is not how to greet anyone.
        const { getValidIdToken } = await import('@/app/lib/auth');
        const token = await getValidIdToken();
        if (!token) return;
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const full: string | undefined = res.ok ? (await res.json())?.name : undefined;
        if (full && /\s/.test(full.trim())) setFirstName(full.trim().split(/\s+/)[0]);
      } catch {
        /* the greeting falls back to "My record" */
      }
    })();
  }, []);

  if (state === 'loading') {
    return (
      <div className="px-7 pt-5 space-y-3.5">
        <div className="h-[168px] animate-pulse" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16 }} />
        <div className="h-[300px] animate-pulse" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16 }} />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <><ScreenHeader title="My record" /><ScreenBody>
        <section role="alert" className="max-w-xl rounded-2xl p-6" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
          <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>Your record couldn&apos;t be loaded</h2>
          <p className="mt-2 text-sm" style={{ color: colors.muted }}>Try again to reconnect. Your saved readings haven&apos;t changed.</p>
          {onRetry && <button onClick={onRetry} className="mt-5 min-h-11 rounded-xl px-5 font-semibold" style={{ background: colors.primary, color: colors.primaryForeground }}>Try again</button>}
        </section>
      </ScreenBody></>
    );
  }
  if (!record || state === 'empty' || !record.latest) return <DayOne />;

  const latest = record.latest;
  const previous = record.previous;
  const bas = latest.bas;
  const basPrev = previous?.bas ?? null;
  const basDelta = bas != null && basPrev != null ? bas - basPrev : null;
  const age = latest.values.Age ?? null;

  // Share of total relative movement. A real quantity, and the one the bars
  // can honestly represent until the engine can attribute the score change.
  const keys = DELTA_ORDER.filter((k) => record.delta[k]);
  const rel = (k: string) => {
    const d = record.delta[k];
    return d.from ? Math.abs(d.change / d.from) : 0;
  };
  const total = keys.reduce((sum, k) => sum + rel(k), 0);
  const ranked = [...keys].sort((a, b) => rel(b) - rel(a));
  const NOTE = ['largest move', 'second largest', 'small move', 'small move'];

  const basSeries = (record.series?.BAS ?? []).slice(-4);

  return (
    <div className="flex flex-col h-full min-w-0">
      <ScreenHeader
        title={greeting(firstName)}
        subtitle={`Reading ${record.panel_count} · ${fmtDate(latest.date)}${latest.fasted ? ' · fasted' : ''}`}
        right={
          <Chip>
            {latest.captured_by ? CAPTURE_LABEL[latest.captured_by] : 'capture not recorded'}
          </Chip>
        }
      />
      <ScreenBody>
        {/* Score card. */}
        <section
          className="flex flex-col items-stretch gap-5 lg:flex-row lg:items-center"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '20px 24px' }}
        >
          <div>
            <div className="t-label" style={{ color: colors.primary }}>Biological Age Score</div>
            {bas != null ? (
              <>
                <div className="flex flex-wrap items-baseline" style={{ gap: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 68, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1, color: colors.foreground }}>
                    {bas.toFixed(1)}
                  </div>
                  {basDelta != null && (
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: basDelta <= 0 ? colors.primary : colors.warning }}>
                        {basDelta < 0 ? '▼' : basDelta > 0 ? '▲' : '—'} {Math.abs(basDelta).toFixed(1)}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted }}>since {fmtDate(previous?.date ?? null)}</div>
                    </div>
                  )}
                </div>
                {age != null && (
                  <div style={{ fontSize: 13, color: colors.muted, marginTop: 6 }}>
                    Target <b style={{ color: colors.primary }}>{age.toFixed(0)}</b>, your real age
                  </div>
                )}
                {latest.score_caveat && (
                  <div style={{ fontSize: 12.5, color: colors.warning, marginTop: 8, maxWidth: 420, lineHeight: 1.5 }}>
                    {latest.score_caveat}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: colors.warning, marginTop: 8, maxWidth: 420, lineHeight: 1.5 }}>
                {latest.no_score_reason ??
                  'This reading has no score. A score needs a full set of plausible fasting values.'}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col" style={{ gap: 6 }}>
            <div className="t-label" style={{ color: colors.mutedDim }}>
              Last {Math.max(basSeries.length, 1)} reading{basSeries.length === 1 ? '' : 's'}
            </div>
            <TrendChart points={basSeries} height={56} />
            <div className="flex justify-between" style={{ fontSize: 11, color: colors.mutedDim }}>
              <span>{basSeries.length ? fmtDate(basSeries[0].date) : '—'}</span>
              <span>{basSeries.length ? fmtDate(basSeries[basSeries.length - 1].date) : '—'}</span>
            </div>
          </div>
        </section>

        {/* Attribution. */}
        <section
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, padding: '20px 22px' }}
        >
          <div className="t-label" style={{ color: colors.mutedDim }}>What changed most</div>

          {ranked.map((key, i) => {
            const d = record.delta[key];
            const meta = LABELS[key] ?? { label: key, unit: '' };
            const share = total ? Math.round((rel(key) / total) * 100) : 0;
            const flat = d.direction === 'flat';
            const tone = flat ? colors.mutedDim : d.improved === false ? colors.warning : colors.primary;
            return (
              <div
                key={key}
                className="record-change-row"
                style={{
                  gap: 14, padding: '10px 0',
                  borderBottom: i === ranked.length - 1 ? undefined : '1px solid rgba(var(--mc-fg-rgb),0.08)',
                }}
              >
                <div className="record-change-label" style={{ fontSize: 13.5, color: colors.muted }}>{meta.label}</div>
                <div className="record-change-values" style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right', color: colors.foreground }}>
                  {d.from} → {d.to}
                </div>
                <div className="record-change-direction" style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 800, color: tone }}>
                  {d.direction === 'down' ? '▼' : d.direction === 'up' ? '▲' : '—'}
                </div>
                <div className="record-change-bar" aria-hidden="true" style={{ width: 96, height: 6, borderRadius: 3, background: 'rgba(var(--mc-fg-rgb),0.1)' }}>
                  <div style={{ width: `${flat ? 0 : share}%`, height: 6, borderRadius: 3, background: tone }} />
                </div>
                <div className="record-change-note" style={{ width: 104, fontSize: 11.5, color: colors.mutedDim, textAlign: 'right' }}>
                  {flat ? 'no real change' : NOTE[i] ?? 'small move'}
                </div>
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: colors.mutedDim, paddingTop: 10, lineHeight: 1.5 }}>
            These values are ranked by their relative change. This does not show
            how much each measurement contributed to your score.
          </div>

          {/* "Around it" — exact row, honest contents. */}
          <div
            className="flex flex-wrap items-center"
            style={{ gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(var(--mc-fg-rgb),0.1)' }}
          >
            <div className="t-label" style={{ color: colors.mutedDim }}>Around it</div>
            <div style={{ fontSize: 12.5, color: colors.muted }}>
              Sleep, steps and meal timing are not available in this web view yet.
            </div>
            <div className="flex-1" />
            <Link
              href="/connectors"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.device,
                background: 'rgba(124,197,216,0.12)', border: '1px solid rgba(124,197,216,0.3)',
                borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap',
              }}
            >
              Connection status
            </Link>
          </div>
        </section>

        {/* Two action cards. */}
        <div className="flex flex-col sm:flex-row" style={{ gap: 14, paddingBottom: 18 }}>
          <Link
            href="/test"
            className="flex items-center no-underline"
            style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, flex: 1, padding: '15px 18px', gap: 12, color: colors.foreground }}
          >
            <div className="flex items-center justify-center" style={{ width: 36, height: 36, flex: 'none', borderRadius: 11, background: 'rgba(var(--mc-accent-rgb),0.15)' }}>
              <Check className="h-4 w-4" style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.foreground }}>Take a reading</div>
              <div style={{ fontSize: 12, color: colors.muted }}>Last: {fmtDate(latest.date)}</div>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: colors.mutedDim }} />
          </Link>

          <Link
            href="/from-practitioner"
            className="flex items-center no-underline"
            style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 16, flex: 1, padding: '15px 18px', gap: 12, color: colors.foreground }}
          >
            <div className="flex items-center justify-center" style={{ width: 36, height: 36, flex: 'none', borderRadius: 11, background: 'rgba(var(--mc-accent-rgb),0.15)' }}>
              <Clock className="h-4 w-4" style={{ color: colors.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13.5, fontWeight: 700, color: colors.foreground }}>
                {practitioner?.name ? `From ${practitioner.name}` : 'From your practitioner'}
              </div>
              <div style={{ fontSize: 12, color: colors.muted }}>
                {practitioner?.name ? 'Their notes and your plan' : 'Notes and your plan appear after a consult'}
              </div>
            </div>
            <ArrowRight className="h-4 w-4" style={{ color: colors.mutedDim }} />
          </Link>
        </div>
      </ScreenBody>
    </div>
  );
}

function DayOne() {
  const { colors } = useTheme();
  return (
    <><ScreenHeader title="My record" subtitle="Your readings, together in one place" /><ScreenBody><div className="max-w-2xl flex flex-col gap-4">
      <section
        className="rounded-2xl p-6"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}
      >
        <h2 className="text-xl font-bold" style={{ color: colors.foreground }}>
          Start with your first reading
        </h2>
        <p className="t-lead mt-2 leading-relaxed" style={{ color: colors.muted }}>
          Take a guided test to add your first reading. As you add more, you can compare
          your results and see what has changed over time.
        </p>
      </section>

      <Link
        href="/test"
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.primary}` }}
      >
        <div
          className="h-11 w-11 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: colors.accent }}
        >
          <Clock className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold" style={{ color: colors.foreground }}>
            Start a guided test
          </p>
          <p className="t-lead" style={{ color: colors.muted }}>
            About 10 minutes. Check what you need before you begin.
          </p>
        </div>
        <ArrowRight className="h-5 w-5" style={{ color: colors.primary }} />
      </Link>
    </div></ScreenBody></>
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
          className="t-label"
          style={{ color: colors.mutedDim }}
        >
          This reading
        </p>
        <p className="t-lead mt-1" style={{ color: colors.foreground }}>
          {fmtDate(latest.date)}
          {latest.fasted ? ' · fasted' : ''}
          {latest.captured_by ? ` · ${CAPTURE_LABEL[latest.captured_by] ?? latest.captured_by}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((key) => {
          const meta = LABELS[key] ?? { label: key, unit: '' };
          const doubtful = latest.held_back?.[key];
          return (
            <div
              key={key}
              className="rounded-[10px] p-3"
              title={doubtful}
              style={{
                backgroundColor: 'rgba(var(--mc-fg-rgb),0.05)',
                border: `1px solid ${doubtful ? colors.warning : colors.cardBorder}`,
              }}
            >
              <p className="t-dense" style={{ color: colors.muted }}>
                {meta.label}
              </p>
              <p
                className="text-xl font-extrabold tracking-tight"
                style={{ color: colors.foreground }}
              >
                {latest.values[key]}
              </p>
              <p className="t-meta" style={{ color: doubtful ? colors.warning : colors.muted }}>
                {doubtful ? 'check this value' : meta.unit}
              </p>
            </div>
          );
        })}
      </div>

      {Object.values(latest.held_back ?? {}).length > 0 && (
        <div className="flex flex-col gap-1">
          {Object.values(latest.held_back ?? {}).map((why) => (
            <p key={why} className="t-dense leading-relaxed" style={{ color: colors.warning }}>
              {why}. Left out of your comparisons until it is confirmed.
            </p>
          ))}
        </div>
      )}

      {!latest.has_score && (
        <div
          className="rounded-[10px] p-3"
          style={{
            backgroundColor: 'rgba(var(--mc-fg-rgb),0.05)',
            border: `1px solid ${colors.warning}`,
          }}
        >
          <p className="t-body2 leading-relaxed" style={{ color: colors.muted }}>
            {latest.no_score_reason ??
              'This reading has no score. A score needs a full set of plausible fasting values.'}
          </p>
        </div>
      )}
    </div>
  );
}
