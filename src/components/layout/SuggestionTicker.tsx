'use client';

import React, { useRef, useState } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

const SUGGESTIONS = [
  'What is a Biological Age Score?',
  'How can I determine my biological age?',
  'Why do I feel tired after eating?',
  'What does my glucose pattern mean?',
  'How can I improve my metabolic score?',
  'What is insulin resistance?',
  'What is the Kraft test?',
  'How does fasting affect my metabolic health?',
  'Which practitioners can help with gut health?',
  'What is hyperinsulinaemia?',
];

// Duplicate the list so the marquee loops seamlessly
const TICKER_ITEMS = [...SUGGESTIONS, ...SUGGESTIONS];

interface SuggestionTickerProps {
  onSelect: (question: string) => void;
}

export default function SuggestionTicker({ onSelect }: SuggestionTickerProps) {
  const { colors } = useTheme();
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

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
          animation: `meo-ticker 40s linear infinite`,
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
