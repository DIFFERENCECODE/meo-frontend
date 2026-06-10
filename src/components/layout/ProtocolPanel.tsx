'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Circle, ChevronRight, FlaskConical, Droplets, Ruler, Activity } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';

// ── State constants (mirror protocol_state_machine.py) ────────────────────────
export const BAS_STATES = [
  'bas_fasting_confirmed',
  'bas_glucose_reading',
  'bas_lipid_reading',
  'bas_anthropometrics',
  'bas_complete',
] as const;

export type BASState = typeof BAS_STATES[number];

// Progress steps shown in the top bar (excludes fasting confirm — it's a gate)
const STEPS = [
  { id: 'bas_glucose_reading',   label: 'Glucose',      icon: Droplets },
  { id: 'bas_lipid_reading',     label: 'Lipids',       icon: FlaskConical },
  { id: 'bas_anthropometrics',   label: 'Measurements', icon: Ruler },
  { id: 'bas_complete',          label: 'Score',        icon: Activity },
];

function stepIndex(state: string): number {
  return STEPS.findIndex((s) => s.id === state);
}

// ── Sub-components per state ──────────────────────────────────────────────────

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

function GlucoseReading({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
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
        onClick={() => onSubmit(`My fasting blood glucose reading is ${value} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}.`)}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function LipidReading({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
  const [tg, setTg] = useState('');
  const [hdl, setHdl] = useState('');
  const [ldl, setLdl] = useState('');
  const ready = tg && hdl && ldl;

  const fields = [
    { label: 'Triglycerides (TG)', hint: 'normal < 1.7 mmol/L', value: tg, set: setTg },
    { label: 'HDL Cholesterol',    hint: 'men > 1.0, women > 1.3 mmol/L', value: hdl, set: setHdl },
    { label: 'LDL Cholesterol',    hint: 'normal < 3.0 mmol/L', value: ldl, set: setLdl },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <p className="text-xs" style={{ color: colors.muted }}>All values in mmol/L</p>

      {fields.map((f) => (
        <div key={f.label}>
          <label className="text-xs font-medium mb-1 block" style={{ color: colors.muted }}>{f.label}</label>
          <input
            type="number"
            step="0.01"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 rounded-xl text-sm border bg-transparent focus:outline-none"
            style={{ borderColor: colors.cardBorder, color: colors.foreground }}
          />
          <p className="text-xs mt-0.5" style={{ color: `${colors.muted}80` }}>{f.hint}</p>
        </div>
      ))}

      <button
        disabled={!ready}
        onClick={() => onSubmit(
          `My lipid panel results are: Triglycerides ${tg} mmol/L, HDL ${hdl} mmol/L, LDL ${ldl} mmol/L.`
        )}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Anthropometrics({ onSubmit, colors }: { onSubmit: (msg: string) => void; colors: any }) {
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
        <p className="text-xs mt-1" style={{ color: `${colors.muted}80` }}>
          Tape around bare abdomen at navel height. Don't pull tight.
        </p>
      </div>

      <button
        disabled={!ready}
        onClick={() => onSubmit(
          `My measurements: Age ${age} years, Sex ${sex}, Weight ${weight} kg, Height ${height} cm, Waist ${waist} cm.`
        )}
        className="py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 mt-auto disabled:opacity-40"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        Calculate My Score <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function BASComplete({ onViewResults, colors }: { onViewResults: () => void; colors: any }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${colors.primary}20` }}
      >
        <Activity className="h-10 w-10" style={{ color: colors.primary }} />
      </div>
      <div>
        <p className="font-semibold text-base" style={{ color: colors.foreground }}>Test complete</p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: colors.muted }}>
          Your Biological Age Score and Deep Fat Score have been calculated. Check the chat for your results and what they mean.
        </p>
      </div>
      <button
        onClick={onViewResults}
        className="px-6 py-3 rounded-xl text-sm font-medium"
        style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
      >
        View results in chat
      </button>
    </div>
  );
}

// ── Guidance copy per state ───────────────────────────────────────────────────

const GUIDANCE: Record<string, { title: string; body: React.ReactNode }> = {
  bas_fasting_confirmed: {
    title: 'Step 0 — Confirm Your Fast',
    body: (
      <>
        <p>Your glucose and lipid readings are only meaningful in a fasted state. Eating raises blood sugar and triglycerides for hours, which would make your BAS inaccurate.</p>
        <p className="mt-3"><strong>What counts as fasting:</strong> Water is fine. Plain medication is fine. Everything else — food, coffee, juice, supplements — breaks the fast.</p>
      </>
    ),
  },
  bas_glucose_reading: {
    title: 'Step 1 — Fasting Blood Glucose',
    body: (
      <>
        <ol className="space-y-2 list-decimal list-inside">
          <li>Wash and dry your hands</li>
          <li>Insert the glucose strip into your meter</li>
          <li>Prick the side of your fingertip with the lancet</li>
          <li>Apply a small drop of blood to the strip</li>
          <li>Wait for the reading — note the number</li>
        </ol>
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <strong>Normal fasting range:</strong> 3.9–5.5 mmol/L<br />
          Above 5.6 mmol/L suggests impaired fasting glucose.
        </div>
      </>
    ),
  },
  bas_lipid_reading: {
    title: 'Step 2 — Lipid Panel',
    body: (
      <>
        <ol className="space-y-2 list-decimal list-inside">
          <li>Insert the lipid test strip into your meter</li>
          <li>Prick your finger again (or reuse the same drop within 30 seconds)</li>
          <li>Apply blood to the strip</li>
          <li>Do not move the meter — wait 3 minutes</li>
          <li>The meter will show TG, HDL, then LDL in sequence — write all three down before entering</li>
        </ol>
      </>
    ),
  },
  bas_anthropometrics: {
    title: 'Step 3 — Body Measurements',
    body: (
      <>
        <p className="font-medium text-sm mb-2">How to measure your waist</p>
        <p>Stand relaxed. Wrap a tape measure around your bare abdomen at navel height. Breathe out naturally — don't hold your breath or pull the tape tight. Read the number.</p>
        <p className="mt-3">Height and weight can be from a recent measurement if you don't have scales handy.</p>
      </>
    ),
  },
  bas_complete: {
    title: 'Biological Age Score',
    body: (
      <>
        <p>Your BAS is a composite score combining fasting glucose, your lipid panel, and an estimate of visceral fat from your measurements.</p>
        <ul className="mt-3 space-y-2">
          <li><strong>BAS lower than your age</strong> — metabolically younger than your years</li>
          <li><strong>BAS higher than your age</strong> — room to improve; MeO will explain the levers</li>
        </ul>
        <p className="mt-3">The Target Score shows what's achievable with diet, exercise, and sleep changes — typically within 3–6 months.</p>
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

  function renderRightPane() {
    switch (protocolState) {
      case 'bas_fasting_confirmed':
        return <FastingConfirm onSubmit={onSubmit} colors={colors} />;
      case 'bas_glucose_reading':
        return <GlucoseReading onSubmit={onSubmit} colors={colors} />;
      case 'bas_lipid_reading':
        return <LipidReading onSubmit={onSubmit} colors={colors} />;
      case 'bas_anthropometrics':
        return <Anthropometrics onSubmit={onSubmit} colors={colors} />;
      case 'bas_complete':
        return <BASComplete onViewResults={onExit} colors={colors} />;
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
          {STEPS.map((step, i) => {
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

        <div className="w-20" />{/* spacer to balance the exit button */}
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
