'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import {
  ArrowLeft, Sparkles, Send, FileText, TrendingUp,
  HelpCircle, AlertTriangle, Activity, Target,
  MessageSquare, ChevronDown, User, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDetail {
  session_id: string;
  patient_name: string;
  metabolic_goals: string[];
  vendor_id: string;
  turn_count: number;
  metabolic_data: Record<string, unknown> | null;
  grafana_error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: FileText,
    label: 'Pre-Session Brief',
    prompt: 'Generate a pre-consultation brief for this patient.',
    color: '#6ee7b7',
    bg: 'rgba(110,231,183,0.08)',
    border: 'rgba(110,231,183,0.2)',
  },
  {
    icon: TrendingUp,
    label: 'Adherence Summary',
    prompt: 'How has this patient been engaging with MeO? Give me an adherence and engagement summary.',
    color: '#93c5fd',
    bg: 'rgba(147,197,253,0.08)',
    border: 'rgba(147,197,253,0.2)',
  },
  {
    icon: HelpCircle,
    label: 'Outstanding Questions',
    prompt: 'What questions did this patient raise that MeO could not fully answer?',
    color: '#fcd34d',
    bg: 'rgba(252,211,77,0.08)',
    border: 'rgba(252,211,77,0.2)',
  },
  {
    icon: AlertTriangle,
    label: 'Risk Flags',
    prompt: 'Were there any safety concerns, distress signals, or risk flags in this patient\'s conversations with MeO?',
    color: '#fca5a5',
    bg: 'rgba(252,165,165,0.08)',
    border: 'rgba(252,165,165,0.2)',
  },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full animate-bounce"
          style={{
            background: color,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </div>
  );
}

function AssistantBubble({
  content,
  isLoading,
  colors,
}: {
  content: string;
  isLoading?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <div className="flex items-start gap-3 max-w-[88%]">
      {/* Avatar */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
        style={{ background: `${colors.primary}20` }}
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: colors.primary }} />
      </div>

      {/* Bubble */}
      <div
        className="flex-1 min-w-0 rounded-2xl rounded-tl-sm px-4 py-3 text-sm"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid rgba(255,255,255,0.1)`,
        }}
      >
        {isLoading ? (
          <LoadingDots color={colors.muted} />
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-base font-bold mt-4 mb-2 first:mt-0 pb-1.5 border-b"
                  style={{ color: colors.foreground, borderColor: 'rgba(255,255,255,0.1)' }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm font-bold mt-4 mb-2 first:mt-0"
                  style={{ color: colors.primary }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xs font-semibold uppercase tracking-wide mt-3 mb-1.5"
                  style={{ color: colors.muted }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-2 last:mb-0"
                  style={{ color: colors.foreground }}>
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="my-2 space-y-1 pl-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 space-y-1 pl-3 list-decimal">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm flex items-start gap-2" style={{ color: colors.foreground }}>
                  <span className="mt-2 h-1 w-1 rounded-full flex-shrink-0"
                    style={{ background: colors.primary }} />
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold" style={{ color: colors.foreground }}>
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="italic" style={{ color: colors.muted }}>{children}</em>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-lg border"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <table className="w-full text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th className="text-left py-2 px-3 font-semibold text-xs"
                  style={{ color: colors.muted }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="py-2 px-3 text-xs border-t"
                  style={{ color: colors.foreground, borderColor: 'rgba(255,255,255,0.06)' }}>
                  {children}
                </td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 pl-3 my-2 italic"
                  style={{ borderColor: colors.primary, color: colors.muted }}>
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = !!className;
                if (isBlock) {
                  return (
                    <code className="block my-2 p-3 rounded-lg text-xs font-mono overflow-x-auto"
                      style={{ background: 'rgba(0,0,0,0.3)', color: '#6ee7b7' }}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ background: 'rgba(0,0,0,0.25)', color: '#6ee7b7' }}>
                    {children}
                  </code>
                );
              },
              hr: () => (
                <hr className="my-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function UserBubble({ content, colors }: { content: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
        style={{ background: `${colors.primary}22`, color: colors.foreground }}
      >
        {content}
      </div>
    </div>
  );
}

// ─── Patient Data Panel ────────────────────────────────────────────────────────

function PatientPanel({
  patient,
  loading,
  colors,
}: {
  patient: PatientDetail | null;
  loading: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const initials = patient
    ? (patient.patient_name || patient.session_id).slice(0, 2).toUpperCase()
    : '??';

  return (
    <aside
      className="w-72 flex-shrink-0 flex flex-col border-r overflow-y-auto hidden md:flex"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Back nav */}
      <div
        className="px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Link
          href="/clinician/patients"
          className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: colors.muted }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All patients
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${colors.primary} transparent` }}
          />
        </div>
      ) : !patient ? (
        <div className="p-6 text-center text-sm" style={{ color: colors.muted }}>
          Patient not found.
        </div>
      ) : (
        <>
          {/* Identity */}
          <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                style={{ background: `${colors.primary}20`, color: colors.primary }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight mb-1"
                  style={{ color: colors.foreground }}>
                  {patient.patient_name || 'Anonymous'}
                </p>
                <span
                  className="inline-block text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${colors.primary}15`, color: colors.primary }}
                >
                  {patient.vendor_id}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="h-3 w-3" style={{ color: colors.muted }} />
                  <span className="text-xs" style={{ color: colors.muted }}>Turns</span>
                </div>
                <p className="text-base font-bold" style={{ color: colors.foreground }}>
                  {patient.turn_count}
                </p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="h-3 w-3" style={{ color: colors.muted }} />
                  <span className="text-xs" style={{ color: colors.muted }}>Status</span>
                </div>
                <p className="text-base font-bold" style={{ color: '#6ee7b7' }}>
                  Active
                </p>
              </div>
            </div>
          </div>

          {/* Goals */}
          {patient.metabolic_goals?.length > 0 && (
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Target className="h-3.5 w-3.5" style={{ color: colors.muted }} />
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.muted }}>
                  Goals
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {patient.metabolic_goals.map((g, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.07)', color: colors.foreground }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scores — shown if metabolic_data has anything useful */}
          {patient.metabolic_data && Object.keys(patient.metabolic_data).length > 0 && (
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: colors.muted }} />
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.muted }}>
                  Latest Scores
                </p>
              </div>
              <p className="text-xs italic" style={{ color: colors.muted }}>
                Available via Clinical AI brief
              </p>
            </div>
          )}

          {patient.grafana_error && (
            <div
              className="mx-4 mt-3 rounded-lg p-2.5 flex items-start gap-2"
              style={{
                background: 'rgba(252,165,165,0.06)',
                border: '1px solid rgba(252,165,165,0.15)',
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                style={{ color: '#fca5a5' }} />
              <p className="text-xs" style={{ color: '#fca5a5' }}>
                Scores unavailable
              </p>
            </div>
          )}

          {/* Session ID */}
          <div className="mt-auto p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: colors.muted }}>Session</p>
            <p className="text-xs font-mono break-all" style={{ color: `${colors.muted}80` }}>
              {patient.session_id}
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientSessionPage() {
  const { session_id } = useParams<{ session_id: string }>();
  const { colors } = useTheme();

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load patient detail
  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch(`/api/clinician?session_id=${session_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPatient)
      .catch(() => {})
      .finally(() => setPatientLoading(false));
  }, [session_id]);

  // Auto-scroll
  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }, []);

  // Send a message to the clinical ops agent
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const token = getIdToken();
      if (!token) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
      const loadingMsg: Message = {
        id: `l-${Date.now()}`,
        role: 'assistant',
        content: '',
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setSending(true);

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      try {
        const res = await fetch(`/api/clinician/${session_id}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmed }),
        });

        const data = await res.json();
        const reply: string = res.ok
          ? (data.response || 'No response received.')
          : `Error ${res.status}: ${data.detail || data.error || 'Unknown error'}`;

        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading ? { ...m, content: reply, isLoading: false } : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.isLoading
              ? { ...m, content: 'Could not reach the Clinical AI. Please try again.', isLoading: false }
              : m
          )
        );
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [session_id, sending]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const patientLabel = patient?.patient_name || 'this patient';

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: colors.background }}
    >
      {/* LEFT — Patient Data */}
      <PatientPanel patient={patient} loading={patientLoading} colors={colors} />

      {/* RIGHT — Clinical Ops Chat */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Chat header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile back */}
            <Link href="/clinician/patients" className="md:hidden mr-1" style={{ color: colors.muted }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `${colors.primary}18` }}
            >
              <Sparkles className="h-4 w-4" style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.foreground }}>
                Clinical AI
              </p>
              <p className="text-xs" style={{ color: colors.muted }}>
                {patientLoading ? 'Loading…' : `Reviewing ${patientLabel}`}
              </p>
            </div>
          </div>

          {/* Engagement chip */}
          {patient && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: 'rgba(110,231,183,0.08)',
                border: '1px solid rgba(110,231,183,0.2)',
                color: '#6ee7b7',
              }}
            >
              <MessageSquare className="h-3 w-3" />
              {patient.turn_count} turns
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-6 space-y-5"
        >
          {messages.length === 0 ? (
            /* ── Empty state ─────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 max-w-md mx-auto">
              <div>
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background: `${colors.primary}12`,
                    border: `1px solid ${colors.primary}25`,
                  }}
                >
                  <Sparkles className="h-8 w-8" style={{ color: colors.primary }} />
                </div>
                <p className="text-base font-semibold mb-1.5" style={{ color: colors.foreground }}>
                  {patientLoading
                    ? 'Loading patient…'
                    : `Ready to brief on ${patientLabel}`}
                </p>
                <p className="text-sm" style={{ color: colors.muted }}>
                  Generate a pre-consultation brief or ask a specific question about this patient.
                </p>
              </div>

              {/* Quick action grid */}
              <div className="w-full grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color, bg, border }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
                    disabled={sending || patientLoading}
                    className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all hover:opacity-80 disabled:opacity-40 active:scale-[0.98]"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color }} />
                    <span className="text-xs font-medium leading-snug"
                      style={{ color: colors.foreground }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message list ─────────────────────────────────────────── */
            messages.map((msg) =>
              msg.role === 'user' ? (
                <UserBubble key={msg.id} content={msg.content} colors={colors} />
              ) : (
                <AssistantBubble
                  key={msg.id}
                  content={msg.content}
                  isLoading={msg.isLoading}
                  colors={colors}
                />
              )
            )
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollDown && (
          <div className="relative">
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-2 right-4 flex h-8 w-8 items-center justify-center rounded-full shadow-lg z-10 transition-opacity hover:opacity-80"
              style={{
                background: colors.card,
                border: `1px solid rgba(255,255,255,0.12)`,
              }}
            >
              <ChevronDown className="h-4 w-4" style={{ color: colors.muted }} />
            </button>
          </div>
        )}

        {/* ── Input area ──────────────────────────────────────────────────── */}
        <div
          className="px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
        >
          {/* Quick-action chips — shown after first message */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {QUICK_ACTIONS.map(({ label, prompt, color }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  disabled={sending}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-80 disabled:opacity-40 whitespace-nowrap"
                  style={{
                    borderColor: `${color}30`,
                    color,
                    background: `${color}08`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this patient or request a brief…"
              rows={1}
              disabled={sending || patientLoading}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid rgba(255,255,255,0.12)`,
                color: colors.foreground,
                maxHeight: '120px',
                fontSize: '16px',
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending || patientLoading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40 active:scale-95"
              style={{ background: colors.primary }}
            >
              <Send className="h-4 w-4" style={{ color: colors.primaryForeground || '#1a3a3a' }} />
            </button>
          </div>

          <p className="text-xs mt-2 text-center" style={{ color: `${colors.muted}60` }}>
            Summarises data only · Not a clinical decision support tool · For informational use
          </p>
        </div>
      </div>
    </div>
  );
}
