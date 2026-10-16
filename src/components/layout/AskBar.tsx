'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSectionAssistant } from '@/components/assistant/SectionAssistant';
import { Mic, Paperclip, SendHorizontal } from 'lucide-react';
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

  // Upload results the patient already has (a lab PDF, a photo of a report).
  // The file is read into text, then opened on the review screen, where every
  // value is checked before anything is saved.
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setReading(file.name);
    try {
      const { getValidIdToken } = await import('@/app/lib/auth');
      const token = await getValidIdToken();
      if (!token) throw new Error('Sign in again to upload.');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/personalize/extract-file', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || "We couldn't read that file.");
      try { sessionStorage.setItem('meo_import', JSON.stringify({ text: d.text, filename: file.name })); } catch { /* fall through */ }
      router.push('/personalize?from=upload');
    } catch (e: any) {
      setUploadError(e.message || "We couldn't read that file.");
    } finally {
      setReading(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.pdf,.jpg,.jpeg,.png,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={!!reading}
        aria-label="Upload results you already have"
        title="Upload results you already have (PDF or photo)"
        className="meo-press flex items-center justify-center shrink-0"
        style={{ width: 34, height: 34, borderRadius: 10, border: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}
      >
        <Paperclip className="h-4 w-4" style={{ color: '#ffffff' }} />
      </button>
      <span role="status" aria-live="polite" className="sr-only">{reading ? `Reading ${reading}` : uploadError ?? ''}</span>
      <label htmlFor="askbar-input" className="sr-only">{placeholder}</label>
      <input
        id="askbar-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={reading ? `Reading ${reading}…` : uploadError ?? placeholder}
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
