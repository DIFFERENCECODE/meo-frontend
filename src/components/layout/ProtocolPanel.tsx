'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Droplet, Clock, ClipboardList, Info, Hand, TrendingDown, TrendingUp} from 'lucide-react';

// ── State constants (mirror protocol_state_machine.py) ────────────────────────
export const BAS_STATES = [
  'bas_fasting_confirmed',
  'bas_glucose_reading',
  'bas_lipid_reading',
  'bas_anthropometrics',
  'bas_complete',
] as const;

export const KRAFT_STATES = [
  'fasting',
  'drink_consumed',
  'post_drink',
  'complete',
] as const;

export type BASState = typeof BAS_STATES[number];
export type KraftState = typeof KRAFT_STATES[number];

const BAS_STEPS = [
  { id: 'bas_glucose_reading', label: 'Glucose', icon: Droplets },
  { id: 'bas_lipid_reading', label: 'Lipids', icon: FlaskConical },
  { id: 'bas_anthropometrics', label: 'Measurements', icon: Ruler },
  { id: 'bas_complete', label: 'Score', icon: Activity },
];

const KRAFT_STEPS = [
  { id: 'fasting', label: 'Fasting', icon: Droplets },
  { id: 'drink_consumed', label: 'Glucose drink', icon: FlaskConical },
  { id: 'post_drink', label: 'Post-drink', icon: Activity },
  { id: 'complete', label: 'Complete', icon: CheckCircle2 },
];

function isKraftState(state: string): boolean {
  return (KRAFT_STATES as readonly string[]).includes(state);
}

function activeSteps(state: string) {
  return isKraftState(state) ? KRAFT_STEPS : BAS_STEPS;
}

function stepIndex(state: string): number {
  return activeSteps(state).findIndex((s) => s.id === state);
}

// ── Collected data shape ───────────────────────────────────────────────────────
interface CollectedData {
  glucose?: string;
  glucoseUnit?: 'mmol' | 'mgdl';
  tc?: string;
  tg?: string;
  hdl?: string;
  ldl?: string;
  age?: string;
  sex?: string;
  weight?: string;
  height?: string;
  waist?: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FastingConfirm({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: colors.foreground }}>Have you fasted for at least 10 hours?</p>
        <p className="text-xs leading-relaxed" style={{ color: colors.muted }}>
          Water is fine. Coffee, even black, invalidates the test. If you haven't fasted yet, set a reminder and come back when ready.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirmed(true)}
          className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all"
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
          className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all"
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
        <p className="text-xs p-3 rounded-lg" style={{ backgroundColor: `${colors.primary}12`, color: colors.muted }}>
          No problem — fast for 10–12 hours (overnight works well) then come back and say "Start BAS" to begin.
        </p>
      )}
      {confirmed === true && (
        <button
          onClick={() => onSubmit('I confirm I have fasted for at least 10 hours and am ready to begin the BAS test.')}
          className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function GlucoseReading({
  onSubmit,
  onData,
  colors,
}: {
  onSubmit: (msg: string) => void;
  onData: (patch: Partial<CollectedData>) => void;
  colors: any;
}) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'mmol' | 'mgdl'>('mmol');
  const num = parseFloat(value);

  function rangeLabel(): { label: string; color: string } {
    if (!num || isNaN(num)) return { label: '', color: 'transparent' };
    const v = unit === 'mgdl' ? num / 18 : num;
    if (v < 3.9) return { label: 'Low', color: '#60a5fa' };
    if (v <= 5.5) return { label: 'Normal', color: '#4ade80' };
    if (v <= 6.9) return { label: 'Elevated', color: '#fbbf24' };
    return { label: 'High', color: '#f87171' };
  }

  const range = rangeLabel();

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex gap-2">
        {(['mmol', 'mgdl'] as const).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={{
              backgroundColor: unit === u ? colors.primary : 'transparent',
              borderColor: unit === u ? colors.primary : colors.cardBorder,
              color: unit === u ? colors.primaryForeground : colors.muted,
            }}
          >
            {u === 'mmol' ? 'mmol/L' : 'mg/dL'}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: colors.muted }}>
          Fasting Blood Glucose
        </label>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={unit === 'mmol' ? 'e.g. 5.2' : 'e.g. 95'}
          className="w-full px-4 py-3 rounded-xl text-base border bg-transparent focus:outline-none"
          style={{ borderColor: colors.cardBorder, color: colors.foreground }}
        />
        {range.label && (
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: range.color }} />
            <span className="text-xs font-medium" style={{ color: range.color }}>{range.label}</span>
            <span className="text-xs" style={{ color: colors.muted }}>
              {unit === 'mmol' ? '(normal: 3.9–5.5 mmol/L)' : '(normal: 70–99 mg/dL)'}
            </span>
          </div>
        )}
      </div>

      <button
        disabled={!value || isNaN(num)}
        onClick={() => {
          onData({ glucose: value, glucoseUnit: unit });
          onSubmit(`My fasting blood glucose reading is ${value} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}.`);
        }}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LipidReading({
  onSubmit,
  onData,
  colors,
}: {
  onSubmit: (msg: string) => void;
  onData: (patch: Partial<CollectedData>) => void;
  colors: any;
}) {
  const [tc, setTc] = useState('');
  const [tg, setTg] = useState('');
  const [hdl, setHdl] = useState('');
  const [ldl, setLdl] = useState('');
  const ready = tg && hdl && ldl;

  const fields = [
    { label: 'Total Cholesterol (TC)', hint: 'normal < 5.2 mmol/L', value: tc, set: setTc, optional: true },
    { label: 'Triglycerides (TG)', hint: 'normal < 1.7 mmol/L', value: tg, set: setTg, optional: false },
    { label: 'HDL Cholesterol', hint: 'men > 1.0, women > 1.3 mmol/L', value: hdl, set: setHdl, optional: false },
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

      <button
        disabled={!ready}
        onClick={() => {
          onData({ tc: tc || undefined, tg, hdl, ldl });
          const parts = [
            tc ? `Total Cholesterol ${tc} mmol/L` : '',
            `Triglycerides ${tg} mmol/L`,
            `HDL ${hdl} mmol/L`,
            `LDL ${ldl} mmol/L`,
          ].filter(Boolean).join(', ');
          onSubmit(`My lipid panel results are: ${parts}.`);
        }}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Anthropometrics({
  onSubmit,
  onData,
  colors,
}: {
  onSubmit: (msg: string) => void;
  onData: (patch: Partial<CollectedData>) => void;
  colors: any;
}) {
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [waist, setWaist] = useState('');
  const ready = age && sex && weight && height && waist;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Age (years)</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 38" className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Biological Sex</label>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((s) => (
              <button key={s} onClick={() => setSex(s)}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all capitalize"
                style={{
                  backgroundColor: sex === s ? colors.primary : 'transparent',
                  borderColor: sex === s ? colors.primary : colors.cardBorder,
                  color: sex === s ? colors.primaryForeground : colors.foreground,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Weight (kg)</label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 75" className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Height (cm)</label>
          <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
            placeholder="e.g. 175" className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>Waist Circumference (cm)</label>
        <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)}
          placeholder="Measure at navel level, breathe out naturally"
          className="w-full px-3 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
          style={{ borderColor: colors.cardBorder, color: colors.foreground }} />
        <p className="text-xs mt-1" style={{ color: colors.foreground }}>
          Tape around bare abdomen at navel height. Don't pull tight.
        </p>
      </div>

      <button
        disabled={!ready}
        onClick={() => {
          onData({ age, sex, weight, height, waist });
          onSubmit(`My measurements: Age ${age} years, Sex ${sex}, Weight ${weight} kg, Height ${height} cm, Waist ${waist} cm.`);
        }}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Calculate My Score <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BASComplete({
  onViewResults,
  colors,
  data,
}: {
  onViewResults: () => void;
  colors: any;
  data: CollectedData;
}) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Convert glucose to mmol if entered in mg/dL
  const glucoseMmol = data.glucose
    ? data.glucoseUnit === 'mgdl'
      ? (parseFloat(data.glucose) / 18).toFixed(1)
      : data.glucose
    : '';

  const formattedText = [
    `Date: ${today}`,
    '',
    'DEMOGRAPHICS',
    data.age ? `Age ${data.age} years` : '',
    data.sex ? `Sex ${data.sex.charAt(0).toUpperCase() + data.sex.slice(1)}` : '',
    '',
    'BIOMETRICS',
    data.weight ? `Weight ${data.weight} kg` : '',
    data.height ? `Height ${data.height} cm` : '',
    data.waist ? `Waist ${data.waist} cm` : '',
    '',
    'FASTING',
    glucoseMmol ? `Glucose ${glucoseMmol}` : '',
    data.tc ? `Total Cholesterol ${data.tc}` : '',
    data.hdl ? `HDL ${data.hdl}` : '',
    data.ldl ? `LDL ${data.ldl}` : '',
    data.tg ? `Triglycerides ${data.tg}` : '',
  ].filter((l) => l !== undefined).join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = formattedText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          <CheckCircle2 className="h-5 w-5" style={{ color: colors.primary }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: colors.foreground }}>
            BAS Measurement Complete
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: colors.muted }}>
            Copy your data and paste it into Personalise to save your results.
          </p>
        </div>
      </div>

      {/* Paste-ready block */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: colors.cardBorder }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: colors.cardBorder, backgroundColor: colors.card }}
        >
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: colors.muted }}>
            Paste-ready format
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{
              color: copied ? colors.primary : colors.muted,
              backgroundColor: copied ? `${colors.primary}18` : `${colors.cardBorder}40`,
              border: `1px solid ${copied ? colors.primary + '50' : 'transparent'}`,
            }}
          >
            {copied ? (
              <><CheckCircle2 className="h-3 w-3" /> Copied!</>
            ) : (
              <><Copy className="h-3 w-3" /> Copy</>
            )}
          </button>
        </div>
        <pre
          className="text-xs p-4 whitespace-pre font-mono leading-relaxed overflow-x-auto"
          style={{ backgroundColor: colors.background, color: colors.foreground }}
        >
          {formattedText}
        </pre>
      </div>

      {/* Instructions */}
      <div
        className="rounded-xl p-3 text-xs leading-relaxed"
        style={{ backgroundColor: `${colors.primary}10`, color: colors.muted }}
      >
        <strong style={{ color: colors.foreground }}>Next step:</strong> Click "Go to Personalise", select "Paste / Free text", paste the copied text, then click "Parse with AI" to store your results permanently.
      </div>

      {/* CTAs */}
      <div className="flex gap-3 mt-auto">
        <button
          onClick={onViewResults}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
          style={{ borderColor: colors.cardBorder, color: colors.muted }}
        >
          View chat
        </button>
        <Link
          href="/personalize"
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
        >
          Go to Personalise <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Kraft step component — instruction card + single confirm button ───────────
function KraftStep({
  confirmLabel,
  onSubmit,
  colors,
}: {
  confirmLabel: string;
  onSubmit: (msg: string) => void;
  colors: any;
}) {
  return (
    <div className="flex flex-col gap-5 h-full">
      <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
        Follow the instructions on the left panel, then tap the button below when you're ready to continue.
      </p>
      <button
        onClick={() => onSubmit('done')}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        {confirmLabel} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function KraftComplete({ onExit, colors }: { onExit: () => void; colors: any }) {
  return (
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
      <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: `${colors.primary}10`, color: colors.muted }}>
        <strong style={{ color: colors.foreground }}>Next step:</strong> MeO will fetch your results from the Meterbolic platform. Check the Analysis tab for your Kraft curve and metabolic score.
      </div>
      <button
        onClick={onExit}
        className="py-3 rounded-xl text-sm font-medium border mt-auto"
        style={{ borderColor: colors.cardBorder, color: colors.muted }}
      >
        Return to chat
      </button>
    </div>
  );
}

// ── Guidance copy per state ───────────────────────────────────────────────────

const GUIDANCE: Record<string, { title: string; body: React.ReactNode }> = {
  // Kraft states
  fasting: {
    title: 'Step 1 — Confirm Your Fast',
    body: (
      <>
        <p>The Kraft Metabolic Test measures how your body handles glucose over 2 hours. Fasting is essential for an accurate baseline.</p>
        <p className="mt-3"><strong>You'll need:</strong></p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>A 3-hour window with no food or strenuous exercise</li>
          <li>Your Meterbolic glucose drink, ready to consume</li>
          <li>The Meterbolic app open to log readings</li>
        </ul>
        <p className="mt-3">Once confirmed, take your fasting glucose reading in the Meterbolic app.</p>
      </>
    ),
  },
  drink_consumed: {
    title: 'Step 2 — Consume the Glucose Drink',
    body: (
      <>
        <p>After logging your fasting reading:</p>
        <ol className="mt-3 space-y-2 list-decimal list-inside">
          <li>Drink the entire glucose solution within 5 minutes</li>
          <li>Note the exact time you finished drinking</li>
          <li>Stay seated or lightly active — no strenuous exercise</li>
          <li>Do not eat or drink anything other than water</li>
        </ol>
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          The 2-hour clock starts when you finish the drink.
        </div>
      </>
    ),
  },
  post_drink: {
    title: 'Step 3 — Post-Drink Reading (120 min)',
    body: (
      <>
        <p>It has been 120 minutes since your glucose drink. Now take your post-drink glucose reading.</p>
        <ol className="mt-3 space-y-2 list-decimal list-inside">
          <li>Wash and dry your hands</li>
          <li>Prick the side of your fingertip</li>
          <li>Log the reading in the Meterbolic app</li>
        </ol>
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          This is the final reading. Once logged, your test is complete.
        </div>
      </>
    ),
  },
  complete: {
    title: 'Test Complete',
    body: (
      <>
        <p>All readings have been captured. Your Kraft curve is being generated from your fasting and post-drink glucose values.</p>
        <ul className="mt-3 space-y-2">
          <li><strong>Pattern 0</strong> — Normal insulin response</li>
          <li><strong>Pattern I–IV</strong> — Varying degrees of hyperinsulinaemia</li>
          <li><strong>Pattern V</strong> — Severe insulin dysfunction</li>
        </ul>
        <p className="mt-3">Results will appear in your Analysis tab once the platform processes them.</p>
      </>
    ),
  },
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

// ── Main ProtocolPanel ────────────────────────────────────────────────────────

interface ProtocolPanelProps {
  protocolState: string;
  onSubmit: (message: string) => void;
  onExit: () => void;
}

export function ProtocolPanel({ protocolState, onSubmit, onExit }: ProtocolPanelProps) {
  const { colors } = useTheme();
  const guidance = GUIDANCE[protocolState];
  const activeStep = stepIndex(protocolState);

  // Accumulate readings as the user progresses through the protocol.
  const [collectedData, setCollectedData] = useState<CollectedData>({});
  const mergeData = (patch: Partial<CollectedData>) =>
    setCollectedData((prev) => ({ ...prev, ...patch }));

  function renderRightPane() {
    switch (protocolState) {
      // BAS states
      case 'bas_fasting_confirmed':
        return <FastingConfirm onSubmit={onSubmit} colors={colors} />;
      case 'bas_glucose_reading':
        return <GlucoseReading onSubmit={onSubmit} onData={mergeData} colors={colors} />;
      case 'bas_lipid_reading':
        return <LipidReading onSubmit={onSubmit} onData={mergeData} colors={colors} />;
      case 'bas_anthropometrics':
        return <Anthropometrics onSubmit={onSubmit} onData={mergeData} colors={colors} />;
      case 'bas_complete':
        return <BASComplete onViewResults={onExit} colors={colors} data={collectedData} />;
      // Kraft states — simple confirm-and-advance
      case 'fasting':
        return <KraftStep confirmLabel="Fasting confirmed, taking reading now" onSubmit={onSubmit} colors={colors} />;
      case 'drink_consumed':
        return <KraftStep confirmLabel="Glucose drink consumed" onSubmit={onSubmit} colors={colors} />;
      case 'post_drink':
        return <KraftStep confirmLabel="Post-drink reading logged" onSubmit={onSubmit} colors={colors} />;
      case 'complete':
        return <KraftComplete onExit={onExit} colors={colors} />;
      default:
        return null;
    }
  }

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
        className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: colors.cardBorder }}
      >
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-70"
          style={{ color: colors.muted }}
        >
          <X className="h-3.5 w-3.5" />
          Exit Protocol
        </button>

        {/* Step progress */}
        <div className="flex items-center gap-1">
          {activeSteps(protocolState).map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <React.Fragment key={step.id}>
                {i > 0 && (
                  <div
                    className="w-6 h-px"
                    style={{ backgroundColor: done ? colors.primary : colors.cardBorder }}
                  />
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center border text-xs transition-all"
                    style={{
                      backgroundColor: done || active ? colors.primary : 'transparent',
                      borderColor: done || active ? colors.primary : colors.cardBorder,
                      color: done || active ? colors.primaryForeground : colors.muted,
                    }}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="text-xs hidden sm:block" style={{ color: active ? colors.foreground : colors.muted }}>
                    {step.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-20" />
      </div>

      {/* Two-pane body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — guidance */}
        <div
          className="w-[38%] flex-shrink-0 border-r overflow-y-auto p-6 flex flex-col gap-4"
          style={{ borderColor: colors.cardBorder }}
        >
          {guidance && (
            <>
              <h2 className="font-semibold text-base" style={{ color: colors.foreground }}>
                {guidance.title}
              </h2>
              <div className="text-sm leading-relaxed space-y-2" style={{ color: colors.muted }}>
                {guidance.body}
              </div>
            </>
          )}
        </div>

        {/* Right — interaction */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={protocolState}
              className="h-full"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
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
