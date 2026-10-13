'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronUp, Square } from 'lucide-react';
import { getValidIdToken } from '@/app/lib/auth';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/theme/ThemeProvider';

type Turn = { question: string; answer: string };
type Assistant = { ask: (question: string) => void; busy: boolean };
const AssistantContext = createContext<Assistant | null>(null);

export function useSectionAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error('Section questions must be inside AppShell');
  return value;
}

const SECTIONS: Record<string, string> = {
  '/': 'My record', '/trends': 'Trends', '/timeline': 'Timeline', '/reading': 'This reading',
  '/library': 'Library', '/test': 'Guided test', '/from-practitioner': 'From your practitioner',
  '/plan': 'My plan', '/connectors': 'Connectors', '/marketplace': 'Marketplace',
};

/** Answers stay beside the current screen; each mounted section owns its thread. */
export function SectionAssistant({ children, composer, context }: {
  children: React.ReactNode;
  composer: React.ReactNode;
  context?: string;
}) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const pathname = usePathname();
  const section = SECTIONS[pathname] ?? 'this page';
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState('');
  const session = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ question: string; message: string } | null>(null);
  const output = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (expanded && followOutput.current && output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [turns, expanded]);

  const send = async (question: string, message: string, retry = false) => {
    if (pending.current || !question.trim()) return;
    const controller = new AbortController();
    pending.current = controller;
    lastRequest.current = { question, message };
    followOutput.current = true;
    setBusy(true);
    setError('');
    setExpanded(true);
    setTurns(previous => retry
      ? previous.map((turn, index) => index === previous.length - 1 ? { question, answer: '' } : turn)
      : [...previous, { question, answer: '' }]);
    let answer = '';
    try {
      const token = await getValidIdToken();
      if (!token) throw new Error('Sign in to ask MeO, then try again.');
      if (controller.signal.aborted) throw new DOMException('Stopped', 'AbortError');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      if (!session.current) {
        const response = await fetch('/api/chats', { method: 'POST', headers, signal: controller.signal });
        if (!response.ok) throw new Error('MeO could not start a conversation. Please try again.');
        const created = await response.json();
        if (typeof created.id !== 'string' || !created.id) throw new Error('MeO could not start a conversation. Please try again.');
        session.current = created.id;
      }
      const response = await fetch('/api/chat/stream', {
        method: 'POST', headers: { ...headers, Accept: 'text/event-stream' }, signal: controller.signal,
        body: JSON.stringify({ message, session_id: session.current, user_language: language }),
      });
      if (!response.ok || !response.body) throw new Error('MeO could not connect. Please try again.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let complete = false;
      const consume = (frame: string) => {
        const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) return;
        const event = JSON.parse(data) as { phase?: string; delta?: string };
        if (event.phase === 'error') throw new Error('MeO’s response was interrupted. Please try again.');
        if (event.phase === 'done') complete = true;
        if (event.phase === 'content' && typeof event.delta === 'string') {
          answer += event.delta;
          if (mounted.current) setTurns(previous => previous.map((turn, index) => index === previous.length - 1 ? { ...turn, answer } : turn));
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          buffer = (buffer + decoder.decode(value, { stream: !done })).replace(/\r\n/g, '\n');
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          frames.forEach(consume);
          if (done) { if (buffer.trim()) consume(buffer); break; }
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      if (!complete || !answer.trim()) throw new Error('MeO did not finish its response. Please try again.');
    } catch (failure) {
      if (mounted.current) setError(controller.signal.aborted ? 'Response stopped.' : failure instanceof Error ? failure.message : 'MeO could not answer. Please try again.');
    } finally {
      pending.current = null;
      if (mounted.current) setBusy(false);
    }
  };

  const ask = (question: string) => {
    const message = `${question.trim()}\n\nViewing section: ${section}.${context ? `\nScreen context: ${context}` : ''}`;
    void send(question.trim(), message);
  };

  return (
    <AssistantContext.Provider value={{ ask, busy }}>
      {children}
      {/* The frames' gutter: 12px 28px 20px, full width of the column. */}
      <div className="shrink-0 px-4 md:px-7 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div>
          {turns.length > 0 && (
            <section aria-label={`MeO answers in ${section}`} className="mb-2 overflow-hidden rounded-2xl" style={{ background: 'rgba(22,48,48,0.9)', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)', border: '1px solid rgba(255,255,255,0.14)', color: colors.foreground, boxShadow: '0 -18px 40px rgba(0,0,0,0.25)' }}>
              <div className="flex items-center justify-between gap-2 px-4">
                <button type="button" className="flex min-h-11 flex-1 items-center justify-between gap-3 text-left text-sm font-semibold" aria-expanded={expanded} aria-controls="section-answers" onClick={() => setExpanded(value => !value)}>
                  <span>MeO <span className="font-normal" style={{ color: colors.muted }}>· {section}</span></span>
                  {expanded ? <ChevronDown aria-hidden="true" className="h-4 w-4" /> : <ChevronUp aria-hidden="true" className="h-4 w-4" />}
                </button>
                {busy && <button type="button" onClick={() => pending.current?.abort()} className="min-h-11 px-3 text-sm flex items-center gap-2"><Square aria-hidden="true" className="h-3 w-3" />Stop</button>}
              </div>
              <div id="section-answers" hidden={!expanded}>
                <div ref={output} className="max-h-[35dvh] overflow-y-auto px-4 pb-4 space-y-4" onScroll={event => { const node = event.currentTarget; followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48; }}>
                  {turns.map((turn, index) => (
                    <div key={index} className="space-y-2 text-sm leading-relaxed break-words">
                      <p className="font-semibold" style={{ color: colors.primary }}>{turn.question}</p>
                      <div className="space-y-2 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_pre]:overflow-auto [&_table]:block [&_table]:overflow-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.answer}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  <p role="status" className="text-sm" style={{ color: colors.muted }}>{busy ? 'MeO is responding…' : error ? '' : 'Response complete.'}</p>
                  {error && <div role="alert" className="text-sm"><p>{error}</p><button type="button" disabled={busy} className="mt-2 min-h-11 rounded-lg border px-4 font-semibold disabled:opacity-50" onClick={() => { const request = lastRequest.current; if (request) void send(request.question, request.message, true); }}>Try again</button></div>}
                </div>
              </div>
            </section>
          )}
          {composer}
        </div>
      </div>
    </AssistantContext.Provider>
  );
}
