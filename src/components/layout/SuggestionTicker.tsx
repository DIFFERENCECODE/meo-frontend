'use client';

import React, { useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

// ── Induction prompts — shown to new/demo users during onboarding phase ──────
// These map directly to the four induction content items:
//   1. What is BAS          2. How to Measure BAS
//   3. Thin Guide to Fat    4. CTA to Buy the Meter
const INDUCTION_SUGGESTIONS = [
  'What is the Biological Age Score?',
  'How do I measure my Biological Age Score at home?',
  'What is the Thin Guide to Fat?',
  'How do I get the Meterbolic Meter?',
  'What is the Deep Fat Score?',
  'How does MeO calculate my biological age?',
];

// ── General prompts — shown to all users regardless of phase ─────────────────
const GENERAL_SUGGESTIONS = [
  'How can I improve my metabolic score?',
  'What is insulin resistance?',
  'What is the Kraft test?',
];

interface SuggestionTickerProps {
  onSelect: (question: string) => void;
  /** 'induction' shows onboarding prompts first; 'general' shows standard prompts. */
  phase?: 'induction' | 'general';
}

export default function SuggestionTicker({ onSelect, phase = 'general' }: SuggestionTickerProps) {
  const { colors } = useTheme();
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Induction phase: lead with induction prompts, tail with general
  // General phase: general prompts only
  const base = phase === 'induction'
    ? [...INDUCTION_SUGGESTIONS, ...GENERAL_SUGGESTIONS]
    : GENERAL_SUGGESTIONS;

  // Duplicate so the marquee loops seamlessly
  const TICKER_ITEMS = [...base, ...base];

  return (
    <div
      className="relative w-full overflow-hidden mb-2"
      style={{
        height: 36,
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="flex items-center gap-2 absolute whitespace-nowrap"
        style={{
          animation: `meo-ticker 35s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {TICKER_ITEMS.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(q)}
            className="flex-shrink-0 rounded-full border px-3 py-1 text-xs transition-colors hover:opacity-90 active:scale-95"
            style={{
              borderColor: colors.cardBorder,
              backgroundColor: colors.card,
              color: colors.muted,
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes meo-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
