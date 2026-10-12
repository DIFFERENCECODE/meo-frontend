'use client';

import React, { useState } from 'react';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

interface AskBarProps {
  /** Placeholder, phrased for the screen it sits on. */
  placeholder?: string;

}

/** Sends to the section assistant without changing the page or its state. */
export function AskBar({ placeholder = 'Ask MeO…' }: AskBarProps) {
  const { colors } = useTheme();
  const { ask, busy } = useSectionAssistant();
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (busy) return;
    ask(q);
    setValue('');
  };

  return (
    <form
      onSubmit={submit}
      className="meo-floating-bar flex items-center gap-2 rounded-2xl px-4 py-2"
      style={{
        '--meo-bar-background': colors.background,
        color: colors.foreground,
        border: `1px solid ${colors.cardBorder}`,
      } as React.CSSProperties}
    >
      <label htmlFor="askbar-input" className="sr-only">
        {placeholder}
      </label>
      <input
        id="askbar-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base md:text-sm outline-none py-2"
        style={{ color: colors.foreground }}
      />
      <button
        type="submit"
        aria-label="Ask MeO"
        title="Ask MeO here"
        disabled={busy || !value.trim()}
        className="min-h-11 px-3 shrink-0 gap-2 rounded-[10px] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: colors.primary }}
      >
        <span className="text-sm font-semibold" style={{ color: colors.primaryForeground }}>Ask</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" style={{ color: colors.primaryForeground }} />
      </button>
    </form>
  );
}

export default AskBar;
