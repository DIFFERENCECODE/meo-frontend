'use client';

import React, { useState } from 'react';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { Mic, SendHorizontal } from 'lucide-react';
import useVoiceInput from '@/hooks/useVoiceInput';

interface AskBarProps {
  /** Placeholder, phrased for the screen it sits on. */
  placeholder?: string;
}

/**
 * The storyboard's ask bar: rgba(0,0,0,0.26) on a 0.13 white border, 14px
 * radius, a 34px voice button and a 34px lime send. Sends to the section
 * assistant without changing the page or its state. The voice button is the
 * chat's own speech input, so it is only shown where the browser supports it.
 */
export function AskBar({ placeholder = 'Ask MeO…' }: AskBarProps) {
  const { ask, busy } = useSectionAssistant();
  const [value, setValue] = useState('');
  const { listening, toggle, isSupported } = useVoiceInput({
    onResult: (text) => setValue(text),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q || busy) return;
    ask(q);
    setValue('');
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center"
      style={{
        gap: 10, background: 'rgba(0,0,0,0.26)', border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 14, padding: '11px 11px 11px 16px',
      }}
    >
      <label htmlFor="askbar-input" className="sr-only">{placeholder}</label>
      <input
        id="askbar-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none"
        style={{ color: '#ffffff', fontSize: 13.5 }}
      />
      {isSupported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? 'Stop listening' : 'Ask by voice'}
          aria-pressed={listening}
          className="meo-press flex items-center justify-center shrink-0"
          style={{
            width: 34, height: 34, borderRadius: 10, border: 0, cursor: 'pointer',
            background: listening ? 'rgba(164,214,94,0.25)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <Mic className="h-4 w-4" style={{ color: listening ? '#a4d65e' : '#c3d0d0' }} />
        </button>
      )}
      <button
        type="submit"
        aria-label="Ask MeO"
        disabled={busy || !value.trim()}
        className="meo-press flex items-center justify-center shrink-0 disabled:cursor-not-allowed"
        style={{ width: 34, height: 34, borderRadius: 10, border: 0, background: '#a4d65e', opacity: busy || !value.trim() ? 0.6 : 1, cursor: 'pointer' }}
      >
        <SendHorizontal className="h-4 w-4" style={{ color: '#1a3a3a' }} />
      </button>
    </form>
  );
}

export default AskBar;
