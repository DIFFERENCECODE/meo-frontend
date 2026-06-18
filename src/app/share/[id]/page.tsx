'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Public, read-only view of a shared MeO chat. Reached via a shareable
// link (/share/<chat-id>) that the chat owner generates from the Share
// button in the chat header. No auth required — the chat id is the
// share secret. Styling mirrors the in-app chat (Meterbolic deep-teal
// palette) but is self-contained because this page renders outside the
// ThemeProvider so unauthenticated visitors get a consistent look.

type ShareMessage = { sender: string; text: string };
type SharedChat = { id: string; title: string; messages: ShareMessage[] };

const C = {
  primary: '#a4d65e',
  bgStart: '#0e2020',
  bgMid: '#122828',
  bgEnd: '#163030',
  card: 'rgba(40, 70, 70, 0.8)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  foreground: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.6)',
};

// Strip the internal [PHASE] routing tag the agent prepends to some
// replies — same cleanup the in-app ChatPanel applies before render.
const stripPhaseTag = (s: string) => s.replace(/^\[[A-Z_]+\]\s*\n?/, '');

export default function SharedChatPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${id}`, { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 404) { setStatus('notfound'); return; }
        if (!res.ok) { setStatus('error'); return; }
        const data: SharedChat = await res.json();
        if (cancelled) return;
        setChat(data);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgMid} 40%, ${C.bgEnd} 100%)`,
        color: C.foreground,
      }}
    >
      {/* Header */}
      <header
        className="px-4 py-4 border-b flex items-center justify-between"
        style={{ borderColor: C.cardBorder }}
      >
        <a href="https://app.meterbolic.com" className="flex items-center gap-1 no-underline">
          <span className="text-xl font-bold" style={{ color: C.foreground }}>Meo</span>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" style={{ color: C.primary }}>
            <path d="M12 2C12 2 5 10 5 15C5 19.4183 8.13401 23 12 23C15.866 23 19 19.4183 19 15C19 10 12 2 12 2Z" />
          </svg>
        </a>
        <span className="text-xs px-3 py-1.5 rounded-full" style={{ color: C.muted, border: `1px solid ${C.cardBorder}` }}>
          Shared chat
        </span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 w-full">
          {status === 'loading' && (
            <p className="text-center mt-16" style={{ color: C.muted }}>Loading shared chat…</p>
          )}

          {status === 'notfound' && (
            <div className="text-center mt-16">
              <p className="text-lg font-semibold">This shared chat isn’t available</p>
              <p className="mt-2 text-sm" style={{ color: C.muted }}>
                The link may be incorrect or the conversation may have been removed.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center mt-16">
              <p className="text-lg font-semibold">Couldn’t load this chat</p>
              <p className="mt-2 text-sm" style={{ color: C.muted }}>Please try again later.</p>
            </div>
          )}

          {status === 'ready' && chat && (
            <>
              <h1 className="text-2xl font-bold mb-1">{chat.title}</h1>
              <p className="text-sm mb-8" style={{ color: C.muted }}>
                A conversation shared from MeO, your metabolic health AI assistant.
              </p>

              <div className="space-y-6">
                {chat.messages.map((msg, i) => (
                  <div key={i} className={msg.sender === 'user' ? 'flex justify-end' : ''}>
                    {msg.sender === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl px-4 py-3" style={{ backgroundColor: C.card }}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    ) : (
                      <div
                        className="prose prose-sm prose-invert max-w-none leading-relaxed"
                        style={{ color: `${C.foreground}e6` }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {stripPhaseTag(msg.text)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
                {chat.messages.length === 0 && (
                  <p className="text-center" style={{ color: C.muted }}>This conversation is empty.</p>
                )}
              </div>

              {/* CTA to try MeO */}
              <div
                className="mt-12 rounded-2xl border p-6 text-center"
                style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
              >
                <p className="font-semibold">Want answers like this for your own metabolic health?</p>
                <p className="text-sm mt-1.5" style={{ color: C.muted }}>
                  MeO is your personal AI assistant for understanding insulin resistance, biological age, and more.
                </p>
                <a
                  href="https://app.meterbolic.com"
                  className="inline-block mt-4 px-5 py-2.5 rounded-lg text-sm font-medium no-underline"
                  style={{ backgroundColor: C.primary, color: '#0e2020' }}
                >
                  Try MeO
                </a>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
