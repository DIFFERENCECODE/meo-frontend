'use client';

import React, { useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n/LanguageContext';

// ── Induction prompts — shown to new/demo users during onboarding phase ──────
// These map directly to the four induction content items:
//   1. What is BAS          2. How to Measure BAS
//   3. Thin Guide to Fat    4. CTA to Buy the Meter
const INDUCTION_SUGGESTIONS = ['suggest.ind1','suggest.ind2','suggest.ind3','suggest.ind4','suggest.ind5','suggest.ind6'];

// ── General prompts — shown to all users regardless of phase ─────────────────
const GENERAL_SUGGESTIONS = ['suggest.gen1','suggest.gen2','suggest.gen3','suggest.gen4','suggest.gen5','suggest.gen6','suggest.gen7','suggest.gen8'];

interface SuggestionTickerProps {
  onSelect: (question: string) => void;
  /** 'induction' shows onboarding prompts first; 'general' shows standard prompts. */
  phase?: 'induction' | 'general';
}

export default function SuggestionTicker({ onSelect, phase = 'general' }: SuggestionTickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Induction phase: lead with induction prompts, tail with general
  // General phase: general prompts only
  const base = (phase === 'induction'
    ? [...INDUCTION_SUGGESTIONS, ...GENERAL_SUGGESTIONS]
    : GENERAL_SUGGESTIONS).map((k) => t(k));

  // Duplicate so the marquee loops seamlessly
  const TICKER_ITEMS = [...base, ...base];

  return (
    <div
      className="relative w-full overflow-hidden mb-2"
      style={{ height: 36 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left fade mask */}
      <div
        className="absolute left-0 top-0 h-full w-10 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to right, ${colors.background}, transparent)`,
        }}
      />

      {/* Right fade mask */}
      <div
        className="absolute right-0 top-0 h-full w-10 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to left, ${colors.background}, transparent)`,
        }}
      />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="flex items-center gap-2 absolute whitespace-nowrap"
        style={{
          animation: `meo-ticker 70s linear infinite`,
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
