'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, SendHorizontal } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';

interface AskBarProps {
  /** Placeholder, phrased for the screen it sits on. */
  placeholder?: string;
  /**
   * What the patient was looking at. Carried into the conversation so the
   * answer starts from the same place the question did.
   */
  context?: string;
}

/**
 * The ask bar, pinned at the foot of every patient screen.
 *
 * This is the structural move that stops MeO reading as a chatbot with health
 * features attached. Chat is not the room you stand in; it is something you
 * pull up from wherever you already are — a reading, a trend, a protocol step.
 * Putting the bar on every screen rather than making chat a destination is what
 * makes that true in the product rather than just in the pitch.
 *
 * The bar carries context. Asking "why did this move?" from the trends screen
 * should not require re-explaining which number you meant — the screen already
 * knows, so it says so when it hands the question over.
 */
export function AskBar({ placeholder = 'Ask MeO…', context }: AskBarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const params = new URLSearchParams({ q });
    if (context) params.set('context', context);
    router.push(`/chat?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-2xl px-4 py-2"
      style={{
        backgroundColor: 'rgba(0,0,0,0.26)',
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <label htmlFor="askbar-input" className="sr-only">
        {placeholder}
      </label>
      <input
        id="askbar-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none py-2"
        style={{ color: colors.foreground }}
      />
      <button
        type="button"
        aria-label="Voice mode"
        className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: colors.accent }}
      >
        <Mic className="h-4 w-4" style={{ color: colors.foreground }} />
      </button>
      <button
        type="submit"
        aria-label="Send"
        className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: colors.primary }}
      >
        <SendHorizontal className="h-4 w-4" style={{ color: colors.primaryForeground }} />
      </button>
    </form>
  );
}

export default AskBar;
