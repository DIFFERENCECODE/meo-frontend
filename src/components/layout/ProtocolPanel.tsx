'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getValidIdToken } from '@/app/lib/auth';
import {
  X,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Droplets,
  Ruler,
  Activity,
  Copy,
  ArrowRight,
  Smartphone,
  GlassWater,
  Timer,
  ClipboardCheck,
  AlertTriangle,
  Pencil,
  Hourglass,
  Armchair,
  Bell,
  Check,
  CircleCheck

} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Droplet, Clock, ClipboardList, Info, Hand, TrendingDown, TrendingUp } from 'lucide-react';

// ── State constants (mirror protocol_state_machine.py) ───────────────────────

export const BAS_STATES = [
  'bas_fasting_confirmed',
  'bas_glucose_reading',
  'bas_lipid_reading',
  'bas_anthropometrics',
  'bas_complete',
] as const;

// Redesigned 7-step OGTT Kraft states
export const KRAFT_STATES = [
  'kraft_fasting_confirmed',
  'kraft_t0_reading',
  'kraft_drink_consumed',
  'kraft_t30_reading',
  'kraft_t60_reading',
  'kraft_t90_reading',
  'kraft_t120_reading',
  'kraft_complete',
] as const;

// Legacy states kept for in-progress sessions before redesign
export const KRAFT_LEGACY_STATES = [
  'fasting', 'drink_consumed', 'post_drink', 'complete',
] as const;

export type BASState = typeof BAS_STATES[number];
export type KraftState = typeof KRAFT_STATES[number];

const BAS_STEPS = [
  { id: 'bas_fasting_confirmed', label: 'Fast', icon: Droplets, timeLabel: null },
  { id: 'bas_glucose_reading', label: 'Glucose', icon: Droplets, timeLabel: null },
  { id: 'bas_lipid_reading', label: 'Lipids', icon: FlaskConical, timeLabel: null },
  { id: 'bas_anthropometrics', label: 'Body', icon: Ruler, timeLabel: null },
  { id: 'bas_complete', label: 'Score', icon: Activity, timeLabel: null },
];

const KRAFT_STEPS = [
  { id: 'kraft_fasting_confirmed', label: 'Fast', icon: Droplets, timeLabel: null },
  { id: 'kraft_t0_reading', label: 'T0', icon: Droplets, timeLabel: 'Fasting' },
  { id: 'kraft_drink_consumed', label: 'Drink', icon: FlaskConical, timeLabel: null },
  { id: 'kraft_t30_reading', label: 'T+30', icon: Activity, timeLabel: '+30 min' },
  { id: 'kraft_t60_reading', label: 'T+60', icon: Activity, timeLabel: '+60 min' },
  { id: 'kraft_t90_reading', label: 'T+90', icon: Activity, timeLabel: '+90 min' },
  { id: 'kraft_t120_reading', label: 'T+120', icon: Activity, timeLabel: '+120 min' },
  { id: 'kraft_complete', label: 'Done', icon: CheckCircle2, timeLabel: null },
];

function isNewKraftState(state: string): boolean {
  return (KRAFT_STATES as readonly string[]).includes(state);
}

function isLegacyKraftState(state: string): boolean {
  return (KRAFT_LEGACY_STATES as readonly string[]).includes(state);
}

function activeSteps(state: string) {
  if (isNewKraftState(state)) return KRAFT_STEPS;
  return BAS_STEPS;
}

function stepIndex(state: string): number {
  return activeSteps(state).findIndex((s) => s.id === state);
}

// ── Collected data ────────────────────────────────────────────────────────────

interface CollectedData {
  // BAS
  glucose?: string;
  glucoseUnit?: 'mmol' | 'mgdl';
  tc?: string;
  tg?: string;
  hdl?: string;
  ldl?: string;
  age?: string;           // years (for agent context)
  birthYear?: string;     // YYYY — used to compute DOB for bang makeindices
  sex?: string;
  weight?: string;
  height?: string;
  waist?: string;
  // Kraft OGTT timepoints
  kraft_t0_glucose?: string;
  kraft_t0_insulin?: string;
  kraft_t30_glucose?: string;
  kraft_t30_insulin?: string;
  kraft_t60_glucose?: string;
  kraft_t60_insulin?: string;
  kraft_t90_glucose?: string;
  kraft_t90_insulin?: string;
  kraft_t120_glucose?: string;
  kraft_t120_insulin?: string;
  // T0 ISO timestamp — anchors all derived Kraft timepoints
  kraft_t0_time?: string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const KRAFT_AMBER = '#f59e0b';
const KRAFT_AMBER_DIM = 'rgba(245,158,11,0.12)';
const KRAFT_AMBER_BORDER = 'rgba(245,158,11,0.25)';

// ── Shared input styles helper ────────────────────────────────────────────────

function inputStyle(colors: any): React.CSSProperties {
  return {
    borderColor: colors.cardBorder,
    color: colors.foreground,
    backgroundColor: `${colors.card}80`,
  };
}

// ── Glucose range helper ──────────────────────────────────────────────────────

function glucoseRangeLabel(value: string, unit: 'mmol' | 'mgdl'): { label: string; color: string } | null {
  const num = parseFloat(value);
  if (!num || isNaN(num)) return null;
  const v = unit === 'mgdl' ? num / 18 : num;
  if (v < 3.9) return { label: 'Low', color: '#60a5fa' };
  if (v <= 5.5) return { label: 'Normal', color: '#4ade80' };
  if (v <= 6.9) return { label: 'Elevated', color: '#fbbf24' };
  return { label: 'High', color: '#f87171' };
}


// ── Kraft countdown gate ──────────────────────────────────────────────────────
// Anchors on kraft_t0_time (already captured at T0) rather than a fresh local
// timer, so it survives screen navigation and tab refreshes correctly.

function useKraftCountdown(targetISO: string | null, onComplete?: () => void) {
  const [now, setNow] = useState(() => Date.now());
  const wasWaitingRef = useRef(false);
  const firedRef = useRef(false);

  const targetMs = targetISO ? new Date(targetISO).getTime() : null;
  const done = targetMs ? now >= targetMs : true;

  useEffect(() => {
    if (!targetMs || done) return;
    wasWaitingRef.current = true;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs, done]);

  useEffect(() => {
    // Only chime if we actually watched the countdown run — avoids playing
    // a sound just because someone loaded an already-elapsed step.
    if (done && wasWaitingRef.current && !firedRef.current) {
      firedRef.current = true;
      onComplete?.();
    }
  }, [done]);

  const msLeft = targetMs ? Math.max(0, targetMs - now) : 0;
  return { msLeft, done };
}

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    tone(880, 0, 0.18);
    tone(1108, 0.2, 0.22);
  } catch {
    // Silent fail — visual countdown still communicates the state
  }
}

// ── Kraft Measurement Step ────────────────────────────────────────────────────
// The core new component — captures glucose + insulin at each OGTT timepoint.

interface KraftMeasurementStepProps {
  timeLabel: string;          // e.g. "Fasting (T0)" or "+30 min"
  minuteOffset: number | null; // null = T0 (fasting), 30/60/90/120 = postprandial
  glucoseKey: keyof CollectedData;
  insulinKey: keyof CollectedData;
  isT0: boolean;
  onData: (patch: Partial<CollectedData>) => void;
  onSubmit: (msg: string) => void;
  colors: any;
}

interface KraftMeasurementStepProps {
  timeLabel: string;
  minuteOffset: number | null;
  glucoseKey: keyof CollectedData;
  insulinKey: keyof CollectedData;
  isT0: boolean;
  t0Time?: string;               // NEW — anchors the T+30/60/90/120 countdown
  onData: (patch: Partial<CollectedData>) => void;
  onSubmit: (msg: string) => void;
  colors: any;
}

function KraftMeasurementStep({
  timeLabel, minuteOffset, glucoseKey, insulinKey, isT0, t0Time,
  onData, onSubmit, colors,
}: KraftMeasurementStepProps) {
  const [glucose, setGlucose] = useState('');
  const [insulin, setInsulin] = useState('');
  const glucoseRef = useRef<HTMLInputElement>(null);

  const targetISO = (!isT0 && minuteOffset !== null && t0Time)
    ? new Date(new Date(t0Time).getTime() + minuteOffset * 60000).toISOString()
    : null;

  const { msLeft, done } = useKraftCountdown(targetISO, playChime);

  useEffect(() => { if (done) glucoseRef.current?.focus(); }, [done]);

  const ready = done && !!glucose && !!insulin && !isNaN(parseFloat(glucose)) && !isNaN(parseFloat(insulin));
  const range = glucoseRangeLabel(glucose, 'mmol');
  const subjectState = minuteOffset === null ? 'FASTING' : 'POSTPRANDIAL';

  function handleConfirm() {
    const t0TimeNow = isT0 ? new Date().toISOString() : undefined;
    const patch: Partial<CollectedData> = {
      [glucoseKey]: glucose,
      [insulinKey]: insulin,
      ...(t0TimeNow ? { kraft_t0_time: t0TimeNow } : {}),
    };
    onData(patch);
    const tLabel = minuteOffset === null ? 'fasting (T0)' : `+${minuteOffset} min`;
    onSubmit(`Kraft reading at ${tLabel}: Glucose ${glucose} mmol/L, Insulin ${insulin} uIU/mL.`);
  }

  const totalMs = minuteOffset ? minuteOffset * 60000 : 0;
  const pct = targetISO && totalMs ? Math.min(100, ((totalMs - msLeft) / totalMs) * 100) : 100;
  const cdMins = Math.floor(msLeft / 60000);
  const cdSecs = Math.floor((msLeft % 60000) / 1000);

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider"
          style={{ backgroundColor: KRAFT_AMBER_DIM, color: KRAFT_AMBER, border: `1px solid ${KRAFT_AMBER_BORDER}` }}
        >
          {timeLabel}
        </div>
        <span className="text-xs" style={{ color: colors.muted }}>
          {subjectState === 'FASTING' ? 'Fasting reading' : 'Postprandial reading'}
        </span>
      </div>

      {targetISO && !done && (
        <div
          className="flex flex-col items-center gap-3 py-6 rounded-2xl"
          style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}
        >
          <span className="text-xs font-medium" style={{ color: KRAFT_AMBER }}>Not yet — unlocks in</span>
          <span className="text-4xl font-bold tabular-nums" style={{ color: colors.foreground }}>
            {String(cdMins).padStart(2, '0')}:{String(cdSecs).padStart(2, '0')}
          </span>
          <div className="w-4/5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%`, backgroundColor: KRAFT_AMBER }}
            />
          </div>
          <span className="text-xs text-center px-4" style={{ color: colors.muted }}>
            Reading early throws off your Kraft curve — this unlocks automatically.
          </span>
        </div>
      )}

      <div style={{ opacity: done ? 1 : 0.4, pointerEvents: done ? 'auto' : 'none' }} className="flex flex-col gap-5">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: colors.muted }}>
            Blood Glucose <span style={{ color: `${colors.muted}80` }}>(mmol/L)</span>
          </label>
          <input
            ref={glucoseRef} type="number" step="0.1" inputMode="decimal" value={glucose}
            onChange={(e) => setGlucose(e.target.value)} placeholder="e.g. 5.2" disabled={!done}
            className="w-full px-4 py-3 rounded-xl text-lg font-semibold border focus:outline-none focus:ring-1 transition-all"
            style={inputStyle(colors)}
          />
          {range && (
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: range.color }} />
              <span className="text-xs font-medium" style={{ color: range.color }}>{range.label}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: colors.muted }}>
            Insulin <span style={{ color: `${colors.muted}80` }}>(uIU/mL)</span>
          </label>
          <input
            type="number" step="0.1" inputMode="decimal" value={insulin}
            onChange={(e) => setInsulin(e.target.value)} placeholder="e.g. 5.0" disabled={!done}
            className="w-full px-4 py-3 rounded-xl text-lg font-semibold border focus:outline-none transition-all"
            style={inputStyle(colors)}
          />
          <p className="text-xs mt-1.5" style={{ color: `${colors.foreground}70` }}>Fasting reference: 2–10 uIU/mL</p>
        </div>
      </div>

      <button
        disabled={!ready}
        onClick={handleConfirm}
        className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-35"
        style={{ backgroundColor: KRAFT_AMBER, color: '#0a0a0a' }}
      >
        {done ? <>Record &amp; Continue <ChevronRight className="h-4 w-4" /></> : 'Waiting for timer…'}
      </button>
    </div>
  );
}

// ── Kraft Drink Confirm ───────────────────────────────────────────────────────

function KraftDrinkConfirm({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
  const [confirmed, setConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setTimerRunning(false);
            setTimerFinished(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = ((300 - secondsLeft) / 300) * 100;

  return (
    <div className="flex flex-col gap-5 h-full">
      <div
        className="rounded-2xl p-5 flex flex-col gap-3"
        style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}
      >
        <p className="text-sm font-semibold" style={{ color: KRAFT_AMBER }}>Ready to drink?</p>
        <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>
          Consume the full 75 g glucose solution within 5 minutes. Note the exact time you finish — your 2-hour clock starts now.
        </p>

        {/* Countdown timer */}
        <div className="flex flex-col items-center gap-2 py-2">
          <span
            className="text-4xl font-bold tabular-nums tracking-wide"
            style={{ color: timerFinished ? '#f87171' : colors.foreground }}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>

          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.cardBorder}` }}>
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%`, backgroundColor: timerFinished ? '#f87171' : KRAFT_AMBER }}
            />
          </div>

          {!timerRunning && !timerFinished && secondsLeft === 300 && (
            <button
              onClick={() => setTimerRunning(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1 flex items-center justify-center gap-2"
              style={{ backgroundColor: KRAFT_AMBER, color: '#0a0a0a' }}
            >
              <Timer className="h-4 w-4" />
              Start timer — I'm drinking now
            </button>
          )}

          {timerRunning && (
            <p className="text-xs text-center mt-0.5" style={{ color: colors.muted }}>
              Finish drinking before this reaches 0:00
            </p>
          )}

          {timerFinished && (
            <div
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg mt-0.5"
              style={{ backgroundColor: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <span className="text-xs font-medium" style={{ color: '#f87171' }}>
                Time's up — confirm below once finished
              </span>
            </div>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2 text-xl leading-relaxed" style={{ color: colors.foreground }}>
        {[
          'Drink the full glucose solution within 5 minutes',
          'Stay seated or lightly active — no exercise',
          'Water only — nothing else to eat or drink',
          'Set a 30-minute timer for your first post-drink reading',
        ].map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: colors.muted }}>
            <span
              className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: KRAFT_AMBER_DIM, color: KRAFT_AMBER }}
            >
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>

      <label className="flex items-center gap-3 cursor-pointer mt-2">
        <div
          onClick={() => setConfirmed(v => !v)}
          className="w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all cursor-pointer"
          style={{
            backgroundColor: confirmed ? KRAFT_AMBER : 'transparent',
            borderColor: confirmed ? KRAFT_AMBER : colors.cardBorder,
          }}
        >
          {confirmed && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#0a0a0a' }} />}
        </div>
        <span className="text-xs leading-relaxed" style={{ color: colors.muted }}>
          I have finished the glucose drink
        </span>
      </label>

      <button
        disabled={!confirmed}
        onClick={() => onSubmit('I have finished the glucose drink. Starting the 120-minute clock now.')}
        className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-35"
        style={{ backgroundColor: KRAFT_AMBER, color: '#0a0a0a' }}
      >
        <Timer className="h-4 w-4" />
        Start the clock
      </button>
    </div>
  );
}

// ── Kraft Complete ────────────────────────────────────────────────────────────

function KraftComplete({ onExit, colors, data }: { onExit: () => void; colors: any; data: CollectedData }) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const autoSubmit = async () => {
      const token = await getValidIdToken();
      if (!token) return;

      const t0 = data.kraft_t0_time ? new Date(data.kraft_t0_time) : new Date();
      const t = (offsetMin: number) => new Date(t0.getTime() + offsetMin * 60000).toISOString();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const series = `${today}_protocol`;

      const rows: Array<{ date: string; measurementSeries: string; name: string; unit: string; value: number; source: string; recordType: string; subjectState: string; canontimeofglucose: string }> = [];

      const add = (name: string, unit: string, rawVal: string | undefined, dateISO: string, subjectState: string) => {
        const val = parseFloat(rawVal ?? '');
        if (!rawVal || isNaN(val)) return;
        rows.push({ date: dateISO, measurementSeries: series, name, unit, value: val, source: 'INCOMING', recordType: 'CLINICAL', subjectState, canontimeofglucose: t(0) });
      };

      // T0 fasting
      add('Glucose', 'mMol', data.kraft_t0_glucose, t(0), 'FASTING');
      add('Insulin', 'uIU/mL', data.kraft_t0_insulin, t(0), 'FASTING');
      // T30
      add('Glucose', 'mMol', data.kraft_t30_glucose, t(30), 'POSTPRANDIAL');
      add('Insulin', 'uIU/mL', data.kraft_t30_insulin, t(30), 'POSTPRANDIAL');
      // T60
      add('Glucose', 'mMol', data.kraft_t60_glucose, t(60), 'POSTPRANDIAL');
      add('Insulin', 'uIU/mL', data.kraft_t60_insulin, t(60), 'POSTPRANDIAL');
      // T90
      add('Glucose', 'mMol', data.kraft_t90_glucose, t(90), 'POSTPRANDIAL');
      add('Insulin', 'uIU/mL', data.kraft_t90_insulin, t(90), 'POSTPRANDIAL');
      // T120
      add('Glucose', 'mMol', data.kraft_t120_glucose, t(120), 'POSTPRANDIAL');
      add('Insulin', 'uIU/mL', data.kraft_t120_insulin, t(120), 'POSTPRANDIAL');

      if (rows.length === 0) return;

      setSubmitStatus('submitting');
      try {
        const res = await fetch('/api/personalize/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: rows }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          setSubmitError(json.error || `Server returned ${res.status}`);
          setSubmitStatus('error');
        } else {
          setSubmitStatus('success');
        }
      } catch (e: any) {
        setSubmitError(e.message || 'Network error');
        setSubmitStatus('error');
      }
    };
    autoSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [copied, setCopied] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const timepoints = [
    { label: 'T0', g: data.kraft_t0_glucose, i: data.kraft_t0_insulin },
    { label: 'T+30', g: data.kraft_t30_glucose, i: data.kraft_t30_insulin },
    { label: 'T+60', g: data.kraft_t60_glucose, i: data.kraft_t60_insulin },
    { label: 'T+90', g: data.kraft_t90_glucose, i: data.kraft_t90_insulin },
    { label: 'T+120', g: data.kraft_t120_glucose, i: data.kraft_t120_insulin },
  ].filter(tp => tp.g || tp.i);

  const formattedText = [
    `Date: ${today}`,
    '',
    'KRAFT OGTT',
    ...timepoints.map(tp =>
      `${tp.label.padEnd(6)} Glucose ${tp.g ?? '—'} mmol/L  Insulin ${tp.i ?? '—'} uIU/mL`
    ),
  ].join('\n');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(formattedText); }
    catch { const el = document.createElement('textarea'); el.value = formattedText; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}
        >
          <CheckCircle2 className="h-5 w-5" style={{ color: KRAFT_AMBER }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: colors.foreground }}>Kraft OGTT Complete</p>
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {submitStatus === 'submitting' && 'Saving your 5-point curve…'}
            {submitStatus === 'success' && '10 readings saved to your profile.'}
            {submitStatus === 'error' && 'Auto-save failed — copy and paste below.'}
            {submitStatus === 'idle' && 'All readings captured.'}
          </p>
        </div>
      </div>

      {submitStatus === 'success' && (
        <div
          className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ backgroundColor: KRAFT_AMBER_DIM, color: KRAFT_AMBER, border: `1px solid ${KRAFT_AMBER_BORDER}` }}
        >
          Your Kraft curve is saved. Go to Personalise to confirm your data, then start a new chat to discuss your insulin response pattern.
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          Auto-save failed: {submitError}. Copy the block below and submit via Personalise.
        </div>
      )}

      {/* Paste-ready summary — same pattern as BASComplete */}
      {timepoints.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.cardBorder }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: colors.cardBorder, backgroundColor: colors.card }}>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Paste-ready format</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{ color: copied ? KRAFT_AMBER : colors.muted, backgroundColor: copied ? KRAFT_AMBER_DIM : `${colors.cardBorder}40`, border: `1px solid ${copied ? KRAFT_AMBER_BORDER : 'transparent'}` }}
            >
              {copied ? <><CheckCircle2 className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <pre className="text-xs p-4 whitespace-pre font-mono leading-relaxed overflow-x-auto" style={{ backgroundColor: colors.background, color: colors.foreground }}>{formattedText}</pre>
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        <button
          onClick={onExit}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
          style={{ borderColor: colors.cardBorder, color: colors.muted }}
        >
          View chat
        </button>
        <Link
          href="/personalize"
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: KRAFT_AMBER, color: '#0a0a0a' }}
        >
          Go to Personalise <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Kraft Fasting Confirm ─────────────────────────────────────────────────────

function KraftFastingConfirm({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col gap-6 h-full">
      <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
        Have you fasted for at least 10 hours?
      </p>
      <p className="text-xs leading-relaxed -mt-3" style={{ color: colors.muted }}>
        Water is fine. Black coffee, food, and supplements all break the fast and invalidate the test.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => setConfirmed(true)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
          style={{
            backgroundColor: confirmed === true ? KRAFT_AMBER : 'transparent',
            borderColor: confirmed === true ? KRAFT_AMBER : colors.cardBorder,
            color: confirmed === true ? '#0a0a0a' : colors.foreground,
          }}
        >
          Yes, I'm fasted
        </button>
        <button
          onClick={() => setConfirmed(false)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
          style={{
            backgroundColor: confirmed === false ? `${colors.primary}20` : 'transparent',
            borderColor: colors.cardBorder,
            color: colors.foreground,
          }}
        >
          Not yet
        </button>
      </div>

      {confirmed === false && (
        <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}12`, color: colors.muted }}>
          Fast overnight (10–12 hours), then return and say "Start Kraft" to begin.
        </p>
      )}
      {confirmed === true && (
        <button
          onClick={() => onSubmit('I confirm I have fasted for at least 10 hours and am ready to begin the Kraft test.')}
          className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto"
          style={{ backgroundColor: KRAFT_AMBER, color: '#0a0a0a' }}
        >
          Begin Test <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── BAS sub-components ────────────────────────────────────────────────────────

function FastingConfirm({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col gap-6 h-full">
      <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
        Have you fasted for at least 10 hours?
      </p>
      <p className="text-xs leading-relaxed -mt-3" style={{ color: colors.muted }}>
        Water is fine. Coffee, even black, invalidates the test. If you haven't fasted yet, set a reminder and come back when ready.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirmed(true)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
          style={{
            backgroundColor: confirmed === true ? colors.primary : 'transparent',
            borderColor: confirmed === true ? colors.primary : colors.cardBorder,
            color: confirmed === true ? colors.primaryForeground : colors.foreground,
          }}
        >
          Yes, I'm fasted
        </button>
        <button
          onClick={() => setConfirmed(false)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border transition-all"
          style={{
            backgroundColor: confirmed === false ? `${colors.primary}20` : 'transparent',
            borderColor: colors.cardBorder,
            color: colors.foreground,
          }}
        >
          Not yet
        </button>
      </div>
      {confirmed === false && (
        <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: `${colors.primary}12`, color: colors.muted }}>
          Fast for 10–12 hours (overnight works well) then say "Start BAS" to begin.
        </p>
      )}
      {confirmed === true && (
        <button
          onClick={() => onSubmit('I confirm I have fasted for at least 10 hours and am ready to begin the BAS test.')}
          className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function GlucoseReading({ onSubmit, onData, colors }: { onSubmit: (msg: string) => void; onData: (p: Partial<CollectedData>) => void; colors: any }) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'mmol' | 'mgdl'>('mmol');
  const range = glucoseRangeLabel(value, unit);

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex gap-2">
        {(['mmol', 'mgdl'] as const).map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={{ backgroundColor: unit === u ? colors.primary : 'transparent', borderColor: unit === u ? colors.primary : colors.cardBorder, color: unit === u ? colors.primaryForeground : colors.muted }}>
            {u === 'mmol' ? 'mmol/L' : 'mg/dL'}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: colors.muted }}>Fasting Blood Glucose</label>
        <input type="number" step="0.1" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={unit === 'mmol' ? 'e.g. 5.2' : 'e.g. 95'}
          className="w-full px-4 py-3 rounded-xl text-lg font-semibold border bg-transparent focus:outline-none"
          style={inputStyle(colors)} />
        {range && (
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: range.color }} />
            <span className="text-xs font-medium" style={{ color: range.color }}>{range.label}</span>
            <span className="text-xs" style={{ color: colors.muted }}>{unit === 'mmol' ? '(normal: 3.9–5.5 mmol/L)' : '(normal: 70–99 mg/dL)'}</span>
          </div>
        )}
      </div>
      <button disabled={!value || isNaN(parseFloat(value))}
        onClick={() => { onData({ glucose: value, glucoseUnit: unit }); onSubmit(`My fasting blood glucose reading is ${value} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}.`); }}
        className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-35"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LipidReading({ onSubmit, onData, colors }: { onSubmit: (msg: string) => void; onData: (p: Partial<CollectedData>) => void; colors: any }) {
  const [tc, setTc] = useState('');
  const [tg, setTg] = useState('');
  const [hdl, setHdl] = useState('');
  const [ldl, setLdl] = useState('');
  const ready = tg && hdl && ldl;

  const fields = [
    { label: 'Total Cholesterol (TC)', hint: 'normal < 5.2 mmol/L', value: tc, set: setTc, optional: true },
    { label: 'Triglycerides (TG)', hint: 'normal < 1.7 mmol/L', value: tg, set: setTg, optional: false },
    { label: 'HDL Cholesterol', hint: 'men > 1.0, women > 1.3', value: hdl, set: setHdl, optional: false },
    { label: 'LDL Cholesterol', hint: 'normal < 3.0 mmol/L', value: ldl, set: setLdl, optional: false },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <p className="text-xs" style={{ color: colors.muted }}>All values in mmol/L</p>
      {fields.map((f) => (
        <div key={f.label}>
          <label className="text-xs font-large mb-1 block" style={{ color: colors.muted }}>
            {f.label}
            {f.optional && <span className="ml-1 opacity-60">(if available)</span>}
          </label>
          <input
            type="number"
            step="0.01"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder="0.00 mmol/L"
            className="w-full px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }}
          />
          <p className="text-xs mt-1" style={{ color: '#e8f1ef' }}>*{f.hint}</p>
        </div>
      ))}
      <button disabled={!ready}
        onClick={() => {
          onData({ tc: tc || undefined, tg, hdl, ldl });
          const parts = [tc ? `TC ${tc}` : '', `TG ${tg}`, `HDL ${hdl}`, `LDL ${ldl}`].filter(Boolean).join(', ');
          onSubmit(`My lipid panel: ${parts} mmol/L.`);
        }}
        className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-35"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Anthropometrics({ onSubmit, onData, colors }: { onSubmit: (msg: string) => void; onData: (p: Partial<CollectedData>) => void; colors: any }) {
  const [birthYear, setBirthYear] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [waist, setWaist] = useState('');
  // Imperial toggle — all conversions happen on submit; bang always receives metric
  const [imperial, setImperial] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearNum = parseInt(birthYear, 10);
  const age = birthYear && !isNaN(yearNum) ? (currentYear - yearNum).toString() : '';
  const ready = birthYear && !isNaN(yearNum) && yearNum > 1900 && yearNum <= currentYear && sex && weight && height && waist;

  const toMetric = () => {
    // Returns { weightKg, heightCm, waistCm } as strings, always metric for bang
    if (!imperial) return { weightKg: weight, heightCm: height, waistCm: waist };
    const wKg = weight ? (parseFloat(weight) * 0.453592).toFixed(1) : '';
    const hCm = height ? (parseFloat(height) * 2.54).toFixed(1) : '';
    const waCm = waist ? (parseFloat(waist) * 2.54).toFixed(1) : '';
    return { weightKg: wKg, heightCm: hCm, waistCm: waCm };
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Unit toggle */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs" style={{ color: colors.muted }}>Units:</span>
        {(['metric', 'imperial'] as const).map((u) => (
          <button key={u} onClick={() => { setImperial(u === 'imperial'); setWeight(''); setHeight(''); setWaist(''); }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize"
            style={{
              backgroundColor: (u === 'imperial') === imperial ? colors.primary : 'transparent',
              borderColor: (u === 'imperial') === imperial ? colors.primary : colors.cardBorder,
              color: (u === 'imperial') === imperial ? colors.primaryForeground : colors.muted,
            }}>
            {u === 'metric' ? 'Metric (cm/kg)' : 'Imperial (in/lbs)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Year of Birth</label>
          <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1986"
            min="1900" max={currentYear}
            className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={inputStyle(colors)} />
          {age && <p className="text-xs mt-0.5" style={{ color: `${colors.muted}80` }}>Age: {age} years</p>}
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Biological Sex</label>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((s) => (
              <button key={s} onClick={() => setSex(s)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize"
                style={{ backgroundColor: sex === s ? colors.primary : 'transparent', borderColor: sex === s ? colors.primary : colors.cardBorder, color: sex === s ? colors.primaryForeground : colors.foreground }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>
            Weight ({imperial ? 'lbs' : 'kg'})
          </label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
            placeholder={imperial ? 'e.g. 165' : 'e.g. 75'}
            className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={inputStyle(colors)} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>
            Height ({imperial ? 'inches' : 'cm'})
          </label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
            placeholder={imperial ? 'e.g. 69' : 'e.g. 175'}
            className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={inputStyle(colors)} />
          {imperial && <p className="text-xs mt-0.5" style={{ color: `${colors.muted}70` }}>Total inches (e.g. 5ft 9in = 69)</p>}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>
          Waist Circumference ({imperial ? 'inches' : 'cm'})
        </label>
        <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)}
          placeholder={imperial ? 'e.g. 32' : 'e.g. 81'}
          className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
          style={{ borderColor: colors.cardBorder, color: colors.foreground }} />
        <p className="text-xs mt-1" style={{ color: colors.foreground }}>
          Tape around bare abdomen at navel height. Don't pull tight.
        </p>
      </div>
      <button disabled={!ready}
        onClick={() => {
          const { weightKg, heightCm, waistCm } = toMetric();
          const unitLabel = imperial ? ` (converted from ${weight} lbs / ${height} in / ${waist} in)` : '';
          onData({ age, birthYear, sex, weight: weightKg, height: heightCm, waist: waistCm });
          onSubmit(`My measurements: Age ${age} years (born ${birthYear}), Sex ${sex}, Weight ${weightKg} kg, Height ${heightCm} cm, Waist ${waistCm} cm.${unitLabel}`);
        }}
        className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-35"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
        Calculate My Score <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BASComplete({ onViewResults, colors, data }: { onViewResults: () => void; colors: any; data: CollectedData }) {
  const [copied, setCopied] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const autoSubmit = async () => {
      const token = await getValidIdToken();
      if (!token) return;
      const nowISO = new Date().toISOString();
      const series = `${today.replace(/-/g, '')}_protocol`;
      const glucoseMmol = data.glucose ? (data.glucoseUnit === 'mgdl' ? parseFloat(data.glucose) / 18 : parseFloat(data.glucose)) : null;
      // DOB: bang makeindices requires a DOB analyte (not just Age) for age-adjusted score calculation.
      // We submit DOB as YYYY-01-01 derived from year of birth collected in Anthropometrics.
      const dobISO = data.birthYear ? `${data.birthYear}-01-01T00:00:00Z` : null;
      const items = [
        data.age ? { date: nowISO, measurementSeries: series, name: 'Age', unit: 'years', value: parseFloat(data.age), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        dobISO ? { date: dobISO, measurementSeries: series, name: 'DOB', unit: 'ISO', value: parseInt(data.birthYear!, 10), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.sex ? { date: nowISO, measurementSeries: series, name: 'Sex', unit: data.sex === 'male' ? 'M' : 'F', value: data.sex === 'male' ? 1 : 0, source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.weight ? { date: nowISO, measurementSeries: series, name: 'Weight', unit: 'kg', value: parseFloat(data.weight), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.height ? { date: nowISO, measurementSeries: series, name: 'Height', unit: 'cm', value: parseFloat(data.height), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.waist ? { date: nowISO, measurementSeries: series, name: 'Waist', unit: 'cm', value: parseFloat(data.waist), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        glucoseMmol !== null ? { date: nowISO, measurementSeries: series, name: 'Glucose', unit: 'mMol', value: glucoseMmol, source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.tc ? { date: nowISO, measurementSeries: series, name: 'Total Cholesterol', unit: 'mMol', value: parseFloat(data.tc), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.hdl ? { date: nowISO, measurementSeries: series, name: 'HDL', unit: 'mMol', value: parseFloat(data.hdl), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.ldl ? { date: nowISO, measurementSeries: series, name: 'LDL', unit: 'mMol', value: parseFloat(data.ldl), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
        data.tg ? { date: nowISO, measurementSeries: series, name: 'Triglyceride', unit: 'mMol', value: parseFloat(data.tg), source: 'INCOMING', recordType: 'CLINICAL', subjectState: 'FASTING', canontimeofglucose: nowISO } : null,
      ].filter(Boolean);
      if (items.length === 0) return;
      setSubmitStatus('submitting');
      try {
        const res = await fetch('/api/personalize/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ items }) });
        const json = await res.json();
        if (!res.ok || json.error) { setSubmitError(json.error || `Server returned ${res.status}`); setSubmitStatus('error'); }
        else { setSubmitStatus('success'); }
      } catch (e: any) { setSubmitError(e.message || 'Network error'); setSubmitStatus('error'); }
    };
    autoSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glucoseMmol = data.glucose ? (data.glucoseUnit === 'mgdl' ? (parseFloat(data.glucose) / 18).toFixed(1) : data.glucose) : '';
  const formattedText = [`Date: ${today}`, '', 'DEMOGRAPHICS', data.age ? `Age ${data.age} years` : '', data.birthYear ? `DOB ${data.birthYear}-01-01` : '', data.sex ? `Sex ${data.sex.charAt(0).toUpperCase() + data.sex.slice(1)}` : '', '', 'BIOMETRICS', data.weight ? `Weight ${data.weight} kg` : '', data.height ? `Height ${data.height} cm` : '', data.waist ? `Waist ${data.waist} cm` : '', '', 'FASTING', glucoseMmol ? `Glucose ${glucoseMmol}` : '', data.tc ? `Total Cholesterol ${data.tc}` : '', data.hdl ? `HDL ${data.hdl}` : '', data.ldl ? `LDL ${data.ldl}` : '', data.tg ? `Triglycerides ${data.tg}` : ''].filter((l) => l !== undefined && l !== '').join('\n');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(formattedText); } catch { const el = document.createElement('textarea'); el.value = formattedText; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
          <CheckCircle2 className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: colors.foreground }}>BAS Measurement Complete</p>
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {submitStatus === 'submitting' && 'Saving your results…'}
            {submitStatus === 'success' && 'Results saved to your profile.'}
            {submitStatus === 'error' && 'Auto-save failed — copy and paste below.'}
            {submitStatus === 'idle' && 'All readings captured.'}
          </p>
        </div>
      </div>
      {submitStatus === 'success' && (
        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: `${colors.primary}15`, color: colors.primary, border: `1px solid ${colors.primary}30` }}>
          Your measurements are saved. Your BAS score will update shortly — check the Analysis tab.
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          Auto-save failed: {submitError}. Copy the block below and submit via Personalise.
        </div>
      )}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.cardBorder }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: colors.cardBorder, backgroundColor: colors.card }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>Paste-ready format</span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all" style={{ color: copied ? colors.primary : colors.muted, backgroundColor: copied ? `${colors.primary}18` : `${colors.cardBorder}40`, border: `1px solid ${copied ? colors.primary + '50' : 'transparent'}` }}>
            {copied ? <><CheckCircle2 className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
        <pre className="text-xs p-4 whitespace-pre font-mono leading-relaxed overflow-x-auto" style={{ backgroundColor: colors.background, color: colors.foreground }}>{formattedText}</pre>
      </div>
      <div className="flex gap-3 mt-auto">
        <button onClick={onViewResults} className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all" style={{ borderColor: colors.cardBorder, color: colors.muted }}>View chat</button>
        <Link href="/personalize" className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
          Go to Personalise <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// Legacy Kraft step (in-progress sessions before redesign)
function KraftLegacyStep({ confirmLabel, onSubmit, colors }: { confirmLabel: string; onSubmit: (msg: string) => void; colors: any }) {
  return (
    <div className="flex flex-col gap-5 h-full">
      <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
        Follow the instructions on the left panel, then tap the button below when you're ready to continue.
      </p>
      <button onClick={() => onSubmit('done')} className="py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-auto" style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}>
        {confirmLabel} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Guidance copy ─────────────────────────────────────────────────────────────

const GUIDANCE: Record<string, { title: string; body: React.ReactNode }> = {
  // ── Kraft OGTT (redesigned) ──────────────────────────────────────────────
  kraft_fasting_confirmed: {
    title: 'Kraft OGTT — Before You Begin',
    body: (
      <>
        <p className="text-sm text-white/70 leading-relaxed">
          The Kraft Oral Glucose Tolerance Test is the gold-standard for detecting hyperinsulinaemia — elevated insulin that standard blood tests miss.
        </p>

        <p className="text-[13px] mt-3.5 mb-3.5">
          <strong>You will take 5 paired readings</strong> (glucose + insulin) over 2 hours
        </p>

        <div className="relative pl-1">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-white/10" />

          <div className="flex flex-col gap-1">
            {[
              { label: 'T0', text: 'Fasting baseline', active: true },
              { label: '30′', text: 'T+30 min' },
              { label: '60′', text: 'T+60 min' },
              { label: '90′', text: 'T+90 min' },
              { label: '120′', text: 'T+120 min' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${step.active
                    ? 'bg-amber-400/10 border-amber-400/40'
                    : 'bg-white/5 border-white/10'
                    }`}
                >
                  <span className={`text-[9px] font-semibold ${step.active ? 'text-amber-400' : 'text-white/60'}`}>
                    {step.label}
                  </span>
                </div>
                <span className={`text-[13px] ${step.active ? 'text-white' : 'text-white/60'}`}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-3 p-3 rounded-lg bg-white/5">
          <ClipboardCheck size={16} className="shrink-0 mt-0.5 text-white/60" />
          <p className="text-[13px] text-white/70 leading-relaxed">
            <strong className="text-white">Required:</strong> 10+ hour fast, glucose drink, BF-102 meter with glucose and insulin strips
          </p>
        </div>
      </>
    ),
  },


  kraft_t0_reading: {
    title: 'T0 — Fasting Baseline',
    body: (
      <>
        <div className="flex gap-2.5 p-3 rounded-lg mb-4" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: KRAFT_AMBER }} />
          <p className="text-[13px] leading-snug">
            Take this reading <strong>before</strong> consuming the glucose drink
          </p>
        </div>

        <p className="text-xs text-white/40 mb-2.5">Setup</p>

        <ol className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Wash and dry your hands thoroughly</span>
          </li>

          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Insert the glucose strip — take glucose reading</span>
          </li>

          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Switch to insulin strip — take insulin reading</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-3.5" />

        <p className="text-xs font-medium mb-2.5" style={{ color: KRAFT_AMBER }}>Your turn</p>

        <div className="flex gap-3 p-2.5 rounded-lg" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <Pencil size={13} style={{ color: KRAFT_AMBER }} />
          </span>
          <span className="text-[13px] pt-1">Record both values in the panel to the right</span>
        </div>

        <div className="mt-3.5 p-3 rounded-xl text-xs" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <strong style={{ color: KRAFT_AMBER }}>Reference ranges (fasting):</strong><br />
          Glucose: 3.9–5.5 mmol/L<br />
          Insulin: 2–10 uIU/mL
        </div>
      </>
    ),
  },



  kraft_drink_consumed: {
    title: 'Consume the Glucose Drink',
    body: (
      <>
        <p className="text-sm text-white/70 leading-relaxed">
          Your fasting readings are recorded. Now consume the 75g glucose solution to start the test.
        </p>

        <div className="mt-3.5 flex gap-3 p-3 rounded-xl" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Hourglass size={16} style={{ color: KRAFT_AMBER }} />
          </span>
          <p className="text-[13px] leading-relaxed pt-1.5">
            Drink the full solution within <strong style={{ color: KRAFT_AMBER }}>5 minutes</strong>. The 2-hour clock starts when you finish.
          </p>
        </div>

        <p className="text-xs text-white/40 mt-4 mb-2.5">During the test</p>

        <ul className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Armchair size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Stay seated or gently mobile — no exercise</span>
          </li>

          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <GlassWater size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Water only — no food, coffee, or supplements</span>
          </li>

          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Bell size={13} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Set a 30-minute reminder for your next reading</span>
          </li>
        </ul>
      </>
    ),
  },


  kraft_t30_reading: {
    title: 'T+30 min Reading',
    body: (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px]" style={{ backgroundColor: KRAFT_AMBER_DIM, borderColor: KRAFT_AMBER_BORDER }}>
            <span className="text-[9px] font-bold" style={{ color: KRAFT_AMBER }}>30</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">60</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">90</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">120</span>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          30 minutes after finishing the glucose drink — take your second paired reading.
        </p>

        <p className="text-xs text-white/40 mt-4 mb-2.5">Setup</p>
        <ol className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Wash and dry your hands</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take glucose reading with glucose strip</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take insulin reading with insulin strip</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-3.5" />

        <p className="text-xs font-medium mb-2.5" style={{ color: KRAFT_AMBER }}>Your turn</p>
        <div className="flex gap-3 p-2.5 rounded-lg" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center">
            <Pencil size={12} style={{ color: KRAFT_AMBER }} />
          </span>
          <span className="text-[13px] pt-1">Enter both values in the panel</span>
        </div>

        <div className="mt-3.5 p-3 rounded-xl text-xs" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <strong style={{ color: KRAFT_AMBER }}>Expected:</strong> Glucose rising. Insulin should be rising sharply — a healthy first-phase response peaks between T30 and T60.
        </div>
      </>
    ),
  },

  kraft_t60_reading: {
    title: 'T+60 min Reading',
    body: (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px]" style={{ backgroundColor: KRAFT_AMBER_DIM, borderColor: KRAFT_AMBER_BORDER }}>
            <span className="text-[9px] font-bold" style={{ color: KRAFT_AMBER }}>60</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">90</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">120</span>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          60 minutes since the drink. Most people see glucose at or near its peak here.
        </p>

        <p className="text-xs text-white/40 mt-4 mb-2.5">Setup</p>
        <ol className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Wash and dry your hands</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take glucose reading</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take insulin reading</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-3.5" />

        <p className="text-xs font-medium mb-2.5" style={{ color: KRAFT_AMBER }}>Your turn</p>
        <div className="flex gap-3 p-2.5 rounded-lg" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center">
            <Pencil size={12} style={{ color: KRAFT_AMBER }} />
          </span>
          <span className="text-[13px] pt-1">Enter both values in the panel</span>
        </div>

        <div className="mt-3.5 flex gap-2.5 p-3 rounded-xl text-[13px]" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <Bell size={14} className="shrink-0 mt-0.5" style={{ color: KRAFT_AMBER }} />
          <span>Set a reminder for your T+90 reading — 30 minutes from now.</span>
        </div>
      </>
    ),
  },

  kraft_t90_reading: {
    title: 'T+90 min Reading',
    body: (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px]" style={{ backgroundColor: KRAFT_AMBER_DIM, borderColor: KRAFT_AMBER_BORDER }}>
            <span className="text-[9px] font-bold" style={{ color: KRAFT_AMBER }}>90</span>
          </div>
          <div className="flex-1 h-0.5 bg-white/10" />
          <div className="w-5 h-5 rounded-full flex items-center justify-center border-[1.5px] border-white/10 bg-white/5">
            <span className="text-[8px] text-white/40">120</span>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          90 minutes since the drink. Glucose should be declining. Insulin patterns here help classify your response type.
        </p>

        <p className="text-xs text-white/40 mt-4 mb-2.5">Setup</p>
        <ol className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Wash and dry your hands</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take glucose reading</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take insulin reading</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-3.5" />

        <p className="text-xs font-medium mb-2.5" style={{ color: KRAFT_AMBER }}>Your turn</p>
        <div className="flex gap-3 p-2.5 rounded-lg" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center">
            <Pencil size={12} style={{ color: KRAFT_AMBER }} />
          </span>
          <span className="text-[13px] pt-1">Enter both values in the panel</span>
        </div>

        <div className="mt-3.5 p-3 rounded-xl text-xs" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          One more reading after this — at T+120 min. Almost done.
        </div>
      </>
    ),
  },

  kraft_t120_reading: {
    title: 'T+120 min — Final Reading',
    body: (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
            <Check size={12} className="text-emerald-400" />
          </div>
          <div className="flex-1 h-0.5 bg-emerald-400/40" />
          <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px]" style={{ backgroundColor: KRAFT_AMBER_DIM, borderColor: KRAFT_AMBER_BORDER }}>
            <span className="text-[9px] font-bold" style={{ color: KRAFT_AMBER }}>120</span>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          The final reading. 2 hours since your glucose drink — this is your last paired measurement.
        </p>

        <p className="text-xs text-white/40 mt-4 mb-2.5">Setup</p>
        <ol className="space-y-0.5">
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Wash and dry your hands</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take glucose reading</span>
          </li>
          <li className="flex gap-3 py-1">
            <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={12} className="text-white/60" />
            </span>
            <span className="text-[13px] text-white/70 pt-1">Take insulin reading</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-3.5" />

        <p className="text-xs font-medium mb-2.5" style={{ color: KRAFT_AMBER }}>Your turn</p>
        <div className="flex gap-3 p-2.5 rounded-lg" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center">
            <Pencil size={12} style={{ color: KRAFT_AMBER }} />
          </span>
          <span className="text-[13px] pt-1">Enter both values in the panel</span>
        </div>

        <div className="mt-3.5 p-3 rounded-xl text-xs" style={{ backgroundColor: KRAFT_AMBER_DIM, border: `1px solid ${KRAFT_AMBER_BORDER}` }}>
          <strong style={{ color: KRAFT_AMBER }}>After this:</strong> Your 5-point Kraft curve will be submitted automatically. You're done — you can eat normally.
        </div>
      </>
    ),
  },



  kraft_complete: {
    title: 'Test Complete',
    body: (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] border-emerald-400/40">
                <Check size={12} className="text-emerald-400" />
              </div>
              {i < 4 && <div className="flex-1 h-0.5 bg-emerald-400/40" />}
            </div>
          ))}
        </div>

        <div className="flex gap-3 p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20 mb-4">
          <CircleCheck size={20} className="text-emerald-400 shrink-0" />
          <p className="text-sm leading-relaxed">
            All 5 timepoints captured. Your Kraft curve is being submitted and will appear in the Analysis tab shortly.
          </p>
        </div>

        <p className="text-xs text-white/40 mb-2.5">Kraft patterns</p>

        <div className="space-y-0.5">
          {[
            { label: 'Pattern 0 — Normal response', color: '#4ade80' },
            { label: 'Pattern I — Mild hyperinsulinaemia', color: '#bef264' },
            { label: 'Pattern II — Moderate', color: '#fbbf24' },
            { label: 'Pattern III–IV — Significant insulin dysfunction', color: '#fb923c' },
            { label: 'Pattern V — Severe; T2D trajectory', color: '#f87171' },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-[12.5px] text-white/70">{p.label}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },


  // ── Legacy Kraft ─────────────────────────────────────────────────────────
  fasting: {
    title: 'Step 1 — Confirm Your Fast',
    body: <p>Confirm your 10-hour fast, then take your fasting glucose reading in the Meterbolic app.</p>,
  },
  drink_consumed: {
    title: 'Step 2 — Glucose Drink',
    body: <p>Drink the full glucose solution within 5 minutes. The 2-hour clock starts when you finish. Stay seated, water only.</p>,
  },
  post_drink: {
    title: 'Step 3 — Post-Drink Reading',
    body: <p>120 minutes have passed. Take your final glucose reading and log it.</p>,
  },
  complete: {
    title: 'Test Complete',
    body: <p>All readings captured. Check the Analysis tab for your Kraft curve.</p>,
  },
  // ── BAS ──────────────────────────────────────────────────────────────────
  bas_fasting_confirmed: {
    title: 'Step 0 — Confirm Your Fast',
    body: (
      <>
        <p>Your glucose and lipid readings are only meaningful in a fasted state. Eating raises blood sugar and triglycerides for hours, which would make your BAS inaccurate.</p>

        <div className="flex gap-3 p-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10">
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <Droplet size={15} className="text-emerald-400" />
          </span>
          <span className="text-sm pt-1.5">
            <strong>What counts as fasting:</strong> Water is fine. Plain medication is fine. Everything else — food, coffee, juice, supplements — breaks the fast.
          </span>
        </div>
      </>

    ),
  },
  bas_glucose_reading: {
    title: 'Step 1 — Fasting Blood Glucose',
    body: (
      <>
        <p className="text-xs text-white/40 mb-2">Setup</p>

        <ol className="space-y-1">
          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Hand size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Wash and dry your hands</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Layers size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Insert the glucose strip into your meter</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Prick the side of your fingertip with the lancet</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Apply a small drop of blood to the strip</span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-4" />

        <p className="text-xs font-medium text-emerald-400 mb-2">Your turn — read the result</p>

        <div className="flex gap-3 p-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10">
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <Clock size={15} className="text-emerald-400" />
          </span>
          <span className="text-sm pt-1.5">Wait for the reading — note the number before entering it</span>
        </div>

        <div className="mt-3 flex gap-2 p-3 rounded-lg text-xs text-white/60" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Info size={14} className="shrink-0 mt-0.5 text-white/40" />
          <span>
            <strong className="text-white/70">Normal fasting range:</strong> 3.9–5.5 mmol/L<br />
            Above 5.6 mmol/L suggests impaired fasting glucose.
          </span>
        </div>
      </>
    ),
  },
  bas_lipid_reading: {
    title: 'Step 2 — Lipid Panel',
    body: (
      <>
        <p className="text-xs text-white/40 mb-2">Setup</p>

        <ol className="space-y-1">
          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Layers size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Insert the lipid test strip into your meter</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplet size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Prick your finger again (or reuse the same drop within 30 seconds)</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Droplets size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">Apply blood to the strip</span>
          </li>

          <li className="flex gap-3 py-1.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
              <Clock size={15} className="text-white/60" />
            </span>
            <span className="text-sm text-white/70 pt-1.5">
              Do not move the meter — <b>wait 3 minutes</b>
            </span>
          </li>
        </ol>

        <div className="h-px bg-white/10 my-4" />

        <p className="text-xs font-medium text-emerald-400 mb-2">Your turn — enter the results</p>

        <div className="flex gap-3 p-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10">
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <ClipboardList size={15} className="text-emerald-400" />
          </span>
          <span className="text-sm pt-1.5">
            The meter will show TG, HDL, LDL in sequence — write all values down before entering
          </span>
        </div>

        <div className="mt-3 flex gap-2 p-3 rounded-lg text-xs text-white/60" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <Info size={14} className="shrink-0 mt-0.5 text-white/40" />
          <span>If your meter also shows Total Cholesterol (TC), enter it too — it improves accuracy.</span>
        </div>
      </>
    ),
  },
  bas_anthropometrics: {
    title: 'Step 3 — Body Measurements',
    body: (
      <>
        <div className="flex gap-3 p-3 rounded-xl bg-white/5">
          <span className="shrink-0 w-9 h-9 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <Ruler size={18} className="text-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-medium mb-1.5">How to measure your waist</p>
            <p className="text-sm text-white/70 leading-relaxed">
              Stand relaxed. Wrap a tape measure around your bare abdomen at navel height.
              Breathe out naturally — don't hold your breath or pull the tape tight. Read the number.
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2.5 pl-3 border-l-2 border-white/15">
          <Info size={14} className="shrink-0 mt-0.5 text-white/40" />
          <p className="text-xs text-white/60">
            Height and weight can be from a recent measurement if you don't have scales handy.
          </p>
        </div>
      </>
    ),
  },
  bas_complete: {
    title: 'Your Results',
    body: (
      <>
        <p className="text-sm text-white/70 leading-relaxed">
          Your BAS is a composite score combining fasting glucose, your lipid panel, and an estimate of visceral fat from your measurements.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
            <TrendingDown size={18} className="text-emerald-400" />
            <p className="text-[13px] font-medium mt-2 mb-1 text-emerald-400">BAS lower than your age</p>
            <p className="text-xs text-white/60">Metabolically younger than your years</p>
          </div>

          <div className="p-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <TrendingUp size={18} className="text-amber-400" />
            <p className="text-[13px] font-medium mt-2 mb-1 text-amber-400">BAS higher than your age</p>
            <p className="text-xs text-white/60">Room to improve — MeO will explain the levers</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3 p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
          <span className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Copy size={15} className="text-emerald-400" />
          </span>
          <span className="text-sm pt-1.5">
            Copy your data and paste it into Personalise to store it permanently and unlock your Analysis tab
          </span>
        </div>
      </>
    ),
  },
};

// ── Progress track ────────────────────────────────────────────────────────────

function ProgressTrack({ protocolState, colors }: { protocolState: string; colors: any }) {
  const steps = activeSteps(protocolState);
  const currentIdx = stepIndex(protocolState);
  const isKraft = isNewKraftState(protocolState);
  const accent = isKraft ? KRAFT_AMBER : colors.primary;
  const accentFg = isKraft ? '#0a0a0a' : colors.primaryForeground;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div className="flex-1 h-px min-w-[8px]" style={{ backgroundColor: done ? accent : colors.cardBorder }} />
            )}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <motion.div
                className="w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold"
                animate={{
                  backgroundColor: done || active ? accent : 'transparent',
                  borderColor: done || active ? accent : colors.cardBorder,
                  scale: active ? 1.15 : 1,
                }}
                transition={{ duration: 0.2 }}
                style={{ color: done || active ? accentFg : colors.muted }}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Icon className="h-3 w-3" /> : <span>{i + 1}</span>}
              </motion.div>
              <span className="text-[10px] font-medium" style={{ color: active ? (isKraft ? KRAFT_AMBER : colors.foreground) : colors.muted }}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function KraftElapsedBadge({ t0Time, colors }: { t0Time: string; colors: any }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedMin = Math.max(0, Math.floor((now - new Date(t0Time).getTime()) / 60000));
  const pct = Math.min(100, (elapsedMin / 120) * 100);

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="w-14 h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: KRAFT_AMBER }} />
      </div>
      <span className="text-[11px] font-medium tabular-nums" style={{ color: colors.muted }}>
        {elapsedMin}m / 120m
      </span>
    </div>
  );
}


// ── Protocol transition table (mirrors protocol_state_machine.py) ─────────────
// Used for optimistic local advance so the panel responds immediately to the
// user's button click — the backend confirms asynchronously and corrects if wrong.

const PROTOCOL_NEXT: Record<string, string> = {
  'bas_fasting_confirmed': 'bas_glucose_reading',
  'bas_glucose_reading': 'bas_lipid_reading',
  'bas_lipid_reading': 'bas_anthropometrics',
  'bas_anthropometrics': 'bas_complete',
  'kraft_fasting_confirmed': 'kraft_t0_reading',
  'kraft_t0_reading': 'kraft_drink_consumed',
  'kraft_drink_consumed': 'kraft_t30_reading',
  'kraft_t30_reading': 'kraft_t60_reading',
  'kraft_t60_reading': 'kraft_t90_reading',
  'kraft_t90_reading': 'kraft_t120_reading',
  'kraft_t120_reading': 'kraft_complete',
};

// Linear ordering of each protocol — used to decide whether the backend has
// caught up with our optimistic localState before clearing it.
const BAS_ORDER = [
  'bas_fasting_confirmed', 'bas_glucose_reading', 'bas_lipid_reading',
  'bas_anthropometrics', 'bas_complete',
];
const KRAFT_ORDER = [
  'kraft_fasting_confirmed', 'kraft_t0_reading', 'kraft_drink_consumed',
  'kraft_t30_reading', 'kraft_t60_reading', 'kraft_t90_reading',
  'kraft_t120_reading', 'kraft_complete',
];

// ── Main ──────────────────────────────────────────────────────────────────────

interface ProtocolPanelProps {
  protocolState: string;
  onSubmit: (message: string) => void;
  onExit: () => void;
}

export function ProtocolPanel({ protocolState, onSubmit, onExit }: ProtocolPanelProps) {
  const { colors } = useTheme();

  // Optimistic local state: advances immediately on button click.
  // Only cleared when the backend has caught up to or passed our optimistic
  // position — prevents snap-backs when a slow backend confirmation arrives
  // after the user has already moved ahead by one or more steps.
  const [localState, setLocalState] = useState<string | null>(null);
  useEffect(() => {
    if (!localState) return;
    const order = localState.startsWith('bas_') ? BAS_ORDER : KRAFT_ORDER;
    const backendPos = order.indexOf(protocolState);
    const localPos = order.indexOf(localState);
    // backendPos === -1 means backend is on a different protocol track — ignore.
    // Only clear when backend has reached or passed where we are locally.
    if (backendPos !== -1 && backendPos >= localPos) {
      setLocalState(null);
    }
  }, [protocolState, localState]);
  const effectiveState = localState ?? protocolState;

  const guidance = GUIDANCE[effectiveState];
  const isKraft = isNewKraftState(effectiveState);
  const accent = isKraft ? KRAFT_AMBER : colors.primary;

  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const mergeData = (patch: Partial<CollectedData>) => setCollectedData((prev) => ({ ...prev, ...patch }));

  // Wraps onSubmit with an optimistic panel advance so the user sees
  // the next step immediately rather than waiting ~25s for backend SSE.
  const handleSubmit = useCallback((msg: string) => {
    const next = PROTOCOL_NEXT[effectiveState];
    if (next) setLocalState(next);
    onSubmit(msg);
  }, [effectiveState, onSubmit]);

  function renderRightPane() {
    switch (effectiveState) {
      // BAS
      case 'bas_fasting_confirmed': return <FastingConfirm onSubmit={handleSubmit} colors={colors} />;
      case 'bas_glucose_reading': return <GlucoseReading onSubmit={handleSubmit} onData={mergeData} colors={colors} />;
      case 'bas_lipid_reading': return <LipidReading onSubmit={handleSubmit} onData={mergeData} colors={colors} />;
      case 'bas_anthropometrics': return <Anthropometrics onSubmit={handleSubmit} onData={mergeData} colors={colors} />;
      case 'bas_complete': return <BASComplete onViewResults={onExit} colors={colors} data={collectedData} />;
      // Kraft OGTT redesigned
      case 'kraft_fasting_confirmed': return <KraftFastingConfirm onSubmit={handleSubmit} colors={colors} />;
      // key per timepoint forces React to unmount+remount each step rather than
      // reusing the same KraftMeasurementStep instance (which would preserve stale
      // glucose/insulin values from the previous step in local state).
      case 'kraft_t0_reading': return <KraftMeasurementStep key="t0" timeLabel="T0 — Fasting" minuteOffset={null} glucoseKey="kraft_t0_glucose" insulinKey="kraft_t0_insulin" isT0 onData={mergeData} onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_drink_consumed': return <KraftDrinkConfirm onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_t30_reading': return <KraftMeasurementStep key="t30" timeLabel="+30 min" minuteOffset={30} glucoseKey="kraft_t30_glucose" insulinKey="kraft_t30_insulin" isT0={false} t0Time={collectedData.kraft_t0_time} onData={mergeData} onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_t60_reading': return <KraftMeasurementStep key="t60" timeLabel="+60 min" minuteOffset={60} glucoseKey="kraft_t60_glucose" insulinKey="kraft_t60_insulin" isT0={false} t0Time={collectedData.kraft_t0_time} onData={mergeData} onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_t90_reading': return <KraftMeasurementStep key="t90" timeLabel="+90 min" minuteOffset={90} glucoseKey="kraft_t90_glucose" insulinKey="kraft_t90_insulin" isT0={false} t0Time={collectedData.kraft_t0_time} onData={mergeData} onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_t120_reading': return <KraftMeasurementStep key="t120" timeLabel="+120 min" minuteOffset={120} glucoseKey="kraft_t120_glucose" insulinKey="kraft_t120_insulin" isT0={false} t0Time={collectedData.kraft_t0_time} onData={mergeData} onSubmit={handleSubmit} colors={colors} />;
      case 'kraft_complete': return <KraftComplete onExit={onExit} colors={colors} data={collectedData} />;
      // Legacy Kraft (in-progress sessions before redesign)
      case 'fasting': return <KraftLegacyStep confirmLabel="Fasting confirmed, taking reading now" onSubmit={handleSubmit} colors={colors} />;
      case 'drink_consumed': return <KraftLegacyStep confirmLabel="Glucose drink consumed" onSubmit={handleSubmit} colors={colors} />;
      case 'post_drink': return <KraftLegacyStep confirmLabel="Post-drink reading logged" onSubmit={handleSubmit} colors={colors} />;
      case 'complete': return (
        <div className="flex flex-col gap-5 h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
              <CheckCircle2 className="h-5 w-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: colors.foreground }}>Kraft Test Complete</p>
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>Your readings have been sent for analysis.</p>
            </div>
          </div>
          <button onClick={onExit} className="py-3 rounded-xl text-sm font-medium border mt-auto" style={{ borderColor: colors.cardBorder, color: colors.muted }}>Return to chat</button>
        </div>
      );
      default: return null;
    }
  }

  {isKraft && collectedData.kraft_t0_time && effectiveState !== 'kraft_fasting_confirmed' && effectiveState !== 'kraft_t0_reading' && (
  <KraftElapsedBadge t0Time={collectedData.kraft_t0_time} colors={colors} />
)}

  const testLabel = isKraft ? 'Kraft OGTT' : isLegacyKraftState(effectiveState) ? 'Kraft Test' : 'BAS Test';

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.2 }}
      style={{ backgroundColor: colors.background }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: colors.cardBorder }}
      >
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-70 flex-shrink-0"
          style={{ color: colors.muted }}
        >
          <X className="h-3.5 w-3.5" />
          Exit
        </button>

        {/* Step progress — centered, scrollable */}
        <div className="flex-1 px-4 overflow-x-auto">
          {(isNewKraftState(effectiveState) || !isLegacyKraftState(effectiveState)) && (
            <ProgressTrack protocolState={effectiveState} colors={colors} />
          )}
        </div>

        <div
          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: isKraft ? KRAFT_AMBER_DIM : `${colors.primary}20`, color: isKraft ? KRAFT_AMBER : colors.primary, border: `1px solid ${isKraft ? KRAFT_AMBER_BORDER : colors.primary + '30'}` }}
        >
          {testLabel}
        </div>
      </div>

      {/* Two-pane body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — guidance */}
        <div
          className="w-[38%] flex-shrink-0 border-r overflow-y-auto p-6 flex flex-col gap-4"
          style={{
            borderColor: colors.cardBorder,
            background: isKraft
              ? `linear-gradient(160deg, rgba(245,158,11,0.04) 0%, transparent 60%)`
              : `linear-gradient(160deg, rgba(${colors.primary},0.03) 0%, transparent 60%)`,
          }}
        >
          {/* Accent line */}
          <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: accent }} />

          {guidance && (
            <>
              <h2 className="font-bold text-sm leading-snug" style={{ color: colors.foreground }}>
                {guidance.title}
              </h2>
              <div className="text-xs leading-relaxed space-y-2" style={{ color: colors.muted }}>
                {guidance.body}
              </div>
            </>
          )}
        </div>

        {/* Right — interaction */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectiveState}
              className="h-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {renderRightPane()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default ProtocolPanel;
