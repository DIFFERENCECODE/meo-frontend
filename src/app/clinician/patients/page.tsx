'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearchParams } from 'next/navigation';
import { getIdToken } from '@/app/lib/auth';

// Design tokens matching the clinician portal handoff
const COLORS = {
  background: '#1a3a3a',
  card: 'rgba(40,70,70,0.8)',
  cardBorder: 'rgba(255,255,255,0.1)',
  foreground: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  primary: '#a4d65e',
  primaryForeground: '#123030',
  inset: 'rgba(20,45,45,0.7)',
};

import {
  Search, Users, Sparkles, Send, FileText, TrendingUp,
  HelpCircle, AlertTriangle, ChevronDown, X, Clock,
  MessageSquare, Plus, AlertCircle, RefreshCw,
  Layers, CheckCircle2,
} from 'lucide-react';

// Adapter so child components can keep using `colors.X` without change
const useColors = () => COLORS;

// ─── Types ───────────────────────────────────────────────────────────────────

interface TriagePatient {
  session_id: string;
  name: string;
  role: string;
  vendor_id: string;
  metabolic_goals: string[];
  last_message_at: string | null;
  days_since_last_message: number | null;
  unfollowed_commitments: number;
  recent_activity_7d: number;
  urgency_level: 'high' | 'medium' | 'low';
  urgency_reason: string;
  signal_tags: string[];
  tags: string[];
}

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

interface BiomarkerFlagItem {
  biomarker_name: string;
  display_name: string;
  category: string;
  value: number;
  unit: string;
  optimal_low: number | null;
  optimal_high: number | null;
  status: 'high' | 'low' | 'optimal';
  delta: number | null;
  trend: string | null;
  note: string;
}

interface LabFlagsResponse {
  test_dates: string[];
  flags: BiomarkerFlagItem[];
  all_results: BiomarkerFlagItem[];
}

interface BiomarkerRefItem {
  name: string;
  display_name: string;
  category: string;
  unit: string;
  optimal_low: number | null;
  optimal_high: number | null;
  note: string;
}

interface ProtocolConfig {
  monitorSleep: boolean;
  monitorSleepFreq: string;
  monitorBASFlag: boolean;
  monitorNoContact: boolean;
  coachingInstructions: string;
  escalateMeds: boolean;
  escalateSymptoms: boolean;
  escalateDistress: boolean;
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

type Urgency = 'red' | 'orange' | 'none';

function getUrgency(p: TriagePatient): Urgency {
  const level = p.urgency_level ?? (p.tags?.includes('no_contact_14d') ? 'high' : p.tags?.length ? 'medium' : 'low');
  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'none';
}

const URGENCY_BORDER: Record<Urgency, string> = {
  red: '#f87171',
  orange: '#f5b942',
  none: 'rgba(255,255,255,0.07)',
};

const URGENCY_BG: Record<Urgency, string> = {
  red: 'rgba(248,113,113,0.07)',
  orange: 'rgba(245,158,11,0.05)',
  none: 'transparent',
};

function signalSummary(p: TriagePatient): { text: string; color: string } {
  const level = p.urgency_level ?? (p.tags?.length ? 'medium' : 'low');
  const text = p.urgency_reason || (p.days_since_last_message != null ? `${p.days_since_last_message}d ago` : 'No activity');
  const color = level === 'high' ? '#ef4444' : level === 'medium' ? '#f97316' : 'rgba(255,255,255,0.4)';
  return { text, color };
}

// ─── Brief parsing ────────────────────────────────────────────────────────────

function parseBriefSections(text: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() });
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() });
  return sections;
}

const BRIEF_LABELS: Record<string, string> = {
  'Patient Overview': 'Patient Overview',
  'Metabolic Snapshot': 'What Changed',
  'Lifestyle & Habits': 'Lifestyle & Habits',
  'Conversation Digest': "What They've Been Asking MeO",
  'Protocol Status': 'Protocol Status',
  'Suggested Focus': 'Suggested Focus',
  'Flags': 'Flags',
};

// Sections that span full width
const FULL_WIDTH_SECTIONS = new Set(['Suggested Focus', 'Flags', 'Conversation Digest']);

function rangeStr(low: number | null, high: number | null, unit: string): string {
  if (low !== null && high !== null) return `${low}–${high} ${unit}`;
  if (low !== null) return `>${low} ${unit}`;
  if (high !== null) return `<${high} ${unit}`;
  return '—';
}

// ─── Protocol config ──────────────────────────────────────────────────────────

const PROTOCOL_KEY = (id: string) => `meo_protocol_v1_${id}`;

function loadProtocol(sessionId: string): ProtocolConfig {
  try {
    const raw = localStorage.getItem(PROTOCOL_KEY(sessionId));
    if (raw) return JSON.parse(raw) as ProtocolConfig;
  } catch { /* ignore */ }
  return {
    monitorSleep: true, monitorSleepFreq: '2 weeks', monitorBASFlag: true,
    monitorNoContact: false, coachingInstructions: '',
    escalateMeds: true, escalateSymptoms: true, escalateDistress: false,
  };
}

function saveProtocol(sessionId: string, config: ProtocolConfig) {
  try { localStorage.setItem(PROTOCOL_KEY(sessionId), JSON.stringify(config)); } catch { /* ignore */ }
}

const QUICK_ACTIONS = [
  { icon: FileText, label: 'Pre-Session Brief', prompt: 'Generate a pre-consultation brief for this patient.', color: '#6ee7b7' },
  { icon: TrendingUp, label: 'Adherence Summary', prompt: 'How has this patient been engaging with MeO? Give me an adherence and engagement summary.', color: '#93c5fd' },
  { icon: HelpCircle, label: 'Outstanding Questions', prompt: 'What questions did this patient raise that MeO could not fully answer?', color: '#fcd34d' },
  { icon: AlertTriangle, label: 'Risk Flags', prompt: "Were there any safety concerns, distress signals, or risk flags in this patient's conversations with MeO?", color: '#fca5a5' },
] as const;

// ─── BriefCard ────────────────────────────────────────────────────────────────

function BriefSkeleton({ colors }: { colors: typeof COLORS }) {
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
        <Sparkles className="h-3.5 w-3.5" style={{ color: colors.primary }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.foreground }}>Pre-Session Brief</span>
        <span style={{ fontSize: 11, color: colors.muted }}>generating…</span>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[80, 60, 90, 50].map((w, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="animate-pulse" style={{ height: 9, width: `${w * 0.6}%`, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
            <div className="animate-pulse" style={{ height: 11, width: `${w}%`, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            <div className="animate-pulse" style={{ height: 11, width: `${w * 0.75}%`, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefCard({
  content, isLoading, onRegenerate, colors, stats,
}: {
  content: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
  colors: typeof COLORS;
  stats?: { turnCount: number | null; daysSinceLastMessage: number | null; unfollowedCommitments: number };
}) {
  if (isLoading) return <BriefSkeleton colors={colors} />;
  if (!content) return null;

  const allSections = parseBriefSections(content);
  // Biomarker Flags live in their own card below
  const sections = allSections.filter((s) => s.title !== 'Biomarker Flags');

  const mdComponents = {
    p: ({ children }: { children: React.ReactNode }) => (
      <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.72)', marginBottom: '0.35rem' }}>{children}</p>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul style={{ marginTop: 4, marginBottom: 4, paddingLeft: 14 }}>{children}</ul>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', marginBottom: 3 }}>{children}</li>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong style={{ fontWeight: 600, color: colors.foreground }}>{children}</strong>
    ),
  };

  const hasStats = stats && (stats.turnCount != null || stats.daysSinceLastMessage != null || stats.unfollowedCommitments > 0);

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: `${colors.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: colors.primary }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.foreground, letterSpacing: '-0.01em' }}>Pre-Session Brief</span>
          <span style={{ fontSize: 11, color: colors.muted }}>auto-generated just now</span>
        </div>
        <button
          onClick={onRegenerate}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RefreshCw className="h-3 w-3" /> Regenerate
        </button>
      </div>

      {/* Real, code-computed stat strip (not LLM-narrated) — same numbers as the header bar */}
      {hasStats && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderBottom: `1px solid ${colors.cardBorder}`, background: 'rgba(255,255,255,0.015)' }}>
          {stats!.turnCount != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare className="h-3 w-3" style={{ color: colors.muted }} />
              <span style={{ fontSize: 12, color: colors.muted }}>{stats!.turnCount} turns logged</span>
            </div>
          )}
          {stats!.daysSinceLastMessage != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock className="h-3 w-3" style={{ color: stats!.daysSinceLastMessage >= 14 ? '#ef4444' : colors.muted }} />
              <span style={{ fontSize: 12, color: stats!.daysSinceLastMessage >= 14 ? '#ef4444' : colors.muted, fontWeight: stats!.daysSinceLastMessage >= 14 ? 600 : 400 }}>
                {stats!.daysSinceLastMessage === 0 ? 'Active today' : `${stats!.daysSinceLastMessage}d since last contact`}
              </span>
            </div>
          )}
          {stats!.unfollowedCommitments > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle className="h-3 w-3" style={{ color: '#f97316' }} />
              <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>
                {stats!.unfollowedCommitments} commitment{stats!.unfollowedCommitments > 1 ? 's' : ''} pending follow-up
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sections — 2-col grid; some sections span full width */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {sections.map((section) => {
          const label = BRIEF_LABELS[section.title] || section.title;
          const isFull = FULL_WIDTH_SECTIONS.has(section.title);
          const isFocus = section.title === 'Suggested Focus';
          return (
            <div
              key={section.title}
              style={{
                gridColumn: isFull ? '1 / -1' : 'auto',
                padding: '11px 13px',
                borderRadius: 9,
                background: isFocus ? `${colors.primary}0d` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isFocus ? `${colors.primary}28` : 'rgba(255,255,255,0.07)'}`,
                borderLeft: isFocus ? `2px solid ${colors.primary}` : `1px solid rgba(255,255,255,0.07)`,
              }}
            >
              <p style={{ fontSize: 10, fontWeight: 700, color: isFocus ? colors.primary : 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 7 }}>
                {label}
              </p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as Record<string, unknown>}>
                {section.content || 'No data available.'}
              </ReactMarkdown>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BiomarkerFlagsCard ───────────────────────────────────────────────────────

function BiomarkerFlagsCard({
  data, loading, onAddClick, colors,
}: {
  data: LabFlagsResponse | null;
  loading: boolean;
  onAddClick: () => void;
  colors: typeof COLORS;
}) {
  const [expanded, setExpanded] = useState(true);

  const flags = data?.flags ?? [];
  const allResults = data?.all_results ?? [];
  const hasAnyResults = allResults.length > 0;
  const hasFlags = flags.length > 0;

  const byCategory: Record<string, BiomarkerFlagItem[]> = {};
  for (const f of flags) {
    byCategory[f.category] = byCategory[f.category] || [];
    byCategory[f.category].push(f);
  }

  const AddButton = (
    <button
      onClick={onAddClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${colors.primary}10`, border: `1px solid ${colors.primary}25`, color: colors.primary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      <Plus className="h-3 w-3" /> Add Lab Results
    </button>
  );

  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: expanded ? `1px solid ${colors.cardBorder}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: hasFlags ? '#f97316' : colors.muted }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.foreground }}>Biomarker Flags</span>
          <span style={{ fontSize: 11, color: colors.muted }}>
            {loading ? 'Loading…' : hasAnyResults ? 'Values outside optimal range' : 'No lab results on file'}
          </span>
          {!loading && hasFlags && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
              {flags.length} flagged
            </span>
          )}
          {!loading && hasAnyResults && !hasFlags && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 100, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              all optimal
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {AddButton}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronDown className="h-3.5 w-3.5" style={{ color: colors.muted, transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 34, borderRadius: 7, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : !hasAnyResults ? (
            <div style={{ textAlign: 'center', padding: '18px 8px' }}>
              <p style={{ fontSize: 12, color: colors.muted, marginBottom: 10 }}>
                No lab panel has been entered for this patient yet.
              </p>
              {AddButton}
            </div>
          ) : !hasFlags ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px' }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e', flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: colors.muted }}>
                All {allResults.length} tested biomarkers are within optimal range
                {data?.test_dates?.[0] ? ` (as of ${data.test_dates[0]})` : ''}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
                    {cat} · {items.length} flagged
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {items.map((f) => (
                      <div
                        key={f.biomarker_name}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <span style={{ flex: 1, fontSize: 13, color: colors.foreground, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.display_name}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.foreground, flexShrink: 0 }}>
                          {f.value}&thinsp;<span style={{ fontSize: 11, color: colors.muted, fontWeight: 400 }}>{f.unit}</span>
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                          background: f.status === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
                          color: f.status === 'high' ? '#ef4444' : '#f97316',
                        }}>
                          {f.status === 'high' ? '↑ HIGH' : '↓ LOW'}
                        </span>
                        <span style={{ fontSize: 11, color: colors.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>
                          Optimal {rangeStr(f.optimal_low, f.optimal_high, f.unit)}
                        </span>
                        {f.trend && f.trend !== 'stable' && (
                          <span style={{ fontSize: 11, flexShrink: 0, color: f.trend === 'worsening' ? '#ef4444' : '#22c55e', whiteSpace: 'nowrap' }}>
                            {f.trend === 'worsening' ? '↑' : '↓'} {f.trend}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AddLabResultsModal ───────────────────────────────────────────────────────

function AddLabResultsModal({
  sessionId, patientName, colors, onClose, onSaved,
}: {
  sessionId: string;
  patientName: string;
  colors: typeof COLORS;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reference, setReference] = useState<BiomarkerRefItem[] | null>(null);
  const [refLoading, setRefLoading] = useState(true);
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceLab, setSourceLab] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/biomarkers/reference', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setReference(Array.isArray(data?.biomarkers) ? data.biomarkers : []))
      .catch(() => setReference([]))
      .finally(() => setRefLoading(false));
  }, []);

  const byCategory: Record<string, BiomarkerRefItem[]> = {};
  for (const b of reference ?? []) {
    byCategory[b.category] = byCategory[b.category] || [];
    byCategory[b.category].push(b);
  }

  const filledCount = Object.values(values).filter((v) => v.trim() !== '').length;

  const handleSubmit = async () => {
    const token = getIdToken();
    if (!token || !reference) return;
    const results = reference
      .filter((b) => values[b.name]?.trim())
      .map((b) => ({ biomarker_name: b.name, value: parseFloat(values[b.name]), unit: b.unit }))
      .filter((r) => !Number.isNaN(r.value));

    if (results.length === 0) {
      setError('Enter at least one biomarker value.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${sessionId}/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ test_date: testDate, results, source_lab: sourceLab || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to save results');
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div
        style={{ width: 560, maxHeight: '85vh', background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.foreground, letterSpacing: '-0.02em' }}>Add Lab Results</h2>
            <p style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{patientName} · compared against the Truth Engine optimal ranges</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.cardBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X className="h-3.5 w-3.5" style={{ color: colors.muted }} />
          </button>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', gap: 10, borderBottom: `1px solid ${colors.cardBorder}`, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Test date</p>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.foreground, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Source lab (optional)</p>
            <input
              value={sourceLab}
              onChange={(e) => setSourceLab(e.target.value)}
              placeholder="e.g. Thriva"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.foreground, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {refLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : (
            Object.entries(byCategory).map(([cat, items]) => (
              <div key={cat}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{cat}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.map((b) => (
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 12, color: colors.foreground, minWidth: 0 }}>{b.display_name}</span>
                      <span style={{ fontSize: 10, color: colors.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        opt. {rangeStr(b.optimal_low, b.optimal_high, b.unit)}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={values[b.name] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [b.name]: e.target.value }))}
                        placeholder="—"
                        style={{ width: 84, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.foreground, fontSize: 12, outline: 'none', textAlign: 'right', fontFamily: 'inherit' }}
                      />
                      <span style={{ fontSize: 10, color: colors.muted, width: 56, flexShrink: 0 }}>{b.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: colors.muted, flex: 1 }}>
            {error ? <span style={{ color: '#ef4444' }}>{error}</span> : `${filledCount} value${filledCount === 1 ? '' : 's'} entered`}
          </span>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.cardBorder}`, color: colors.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || refLoading || filledCount === 0}
            style={{ padding: '9px 18px', borderRadius: 8, background: colors.primary, border: 'none', color: colors.primaryForeground ?? '#1a3a3a', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || refLoading || filledCount === 0) ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Save results'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat sub-components ──────────────────────────────────────────────────────

function LoadingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="block h-1.5 w-1.5 rounded-full animate-bounce"
          style={{ background: color, animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
      ))}
    </div>
  );
}

function AssistantBubble({ content, isLoading, colors }: {
  content: string; isLoading?: boolean;
  colors: typeof COLORS;
}) {
  return (
    <div className="flex items-start gap-3 max-w-[90%]">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md mt-0.5"
        style={{ background: `${colors.primary}20` }}>
        <Sparkles className="h-3 w-3" style={{ color: colors.primary }} />
      </div>
      <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm px-4 py-3 text-sm"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {isLoading ? <LoadingDots color={colors.muted} /> : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: colors.foreground }}>{children}</p>,
            h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1.5" style={{ color: colors.primary }}>{children}</h2>,
            ul: ({ children }) => <ul className="my-2 space-y-1 pl-3">{children}</ul>,
            ol: ({ children }) => <ol className="my-2 space-y-1 pl-3 list-decimal">{children}</ol>,
            li: ({ children }) => <li className="text-sm flex items-start gap-2" style={{ color: colors.foreground }}><span className="mt-2 h-1 w-1 rounded-full flex-shrink-0" style={{ background: colors.primary }} /><span>{children}</span></li>,
            strong: ({ children }) => <strong className="font-semibold" style={{ color: colors.foreground }}>{children}</strong>,
            hr: () => <hr className="my-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />,
          }}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function UserBubble({ content, colors }: { content: string; colors: typeof COLORS }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
        style={{ background: `${colors.primary}22`, color: colors.foreground }}>
        {content}
      </div>
    </div>
  );
}

// ─── Protocol Config Sheet ─────────────────────────────────────────────────────

function ProtocolConfigSheet({
  sessionId, patientName, colors, onClose,
}: { sessionId: string; patientName: string; colors: typeof COLORS; onClose: () => void }) {
  const [config, setConfig] = useState<ProtocolConfig>(() => loadProtocol(sessionId));
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<ProtocolConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const handleSave = () => {
    saveProtocol(sessionId, config);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const ToggleRow = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ padding: '10px 14px', borderRadius: 9, background: checked ? `${colors.primary}08` : 'rgba(255,255,255,0.03)', border: `1px solid ${checked ? `${colors.primary}20` : 'rgba(255,255,255,0.07)'}`, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
      <button
        onClick={() => onChange(!checked)}
        style={{ width: 32, height: 18, borderRadius: 9, background: checked ? colors.primary : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, marginTop: 2, transition: 'background 0.2s' }}
      >
        <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2.5, left: checked ? 17 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', display: 'block' }} />
      </button>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: checked ? colors.foreground : 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div
        style={{ width: 440, background: colors.card, borderLeft: `1px solid ${colors.cardBorder}`, display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-20px 0 60px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers className="h-4 w-4" style={{ color: colors.primary }} />
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: colors.foreground, letterSpacing: '-0.02em' }}>MeO Instructions</h2>
              <p style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{patientName} · how MeO behaves per session</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.cardBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X className="h-3.5 w-3.5" style={{ color: colors.muted }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Monitoring</p>
            <ToggleRow label="Check in on sleep quality" sub={`Every ${config.monitorSleepFreq} if not mentioned`} checked={config.monitorSleep} onChange={(v) => update({ monitorSleep: v })} />
            <ToggleRow label="Flag if BAS increases more than 3 points between tests" sub="Sends you an email notification immediately" checked={config.monitorBASFlag} onChange={(v) => update({ monitorBASFlag: v })} />
            <ToggleRow label="Alert if no patient engagement for 14 days" checked={config.monitorNoContact} onChange={(v) => update({ monitorNoContact: v })} />
          </div>
          <div style={{ height: 1, background: colors.cardBorder }} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Coaching Focus</p>
            <p style={{ fontSize: 11, color: colors.muted, marginBottom: 10, lineHeight: 1.5 }}>Instructions MeO follows in every conversation with this patient.</p>
            <textarea
              value={config.coachingInstructions}
              onChange={(e) => update({ coachingInstructions: e.target.value })}
              placeholder="e.g. This patient is on a low-carb protocol. Reinforce adherence. Prioritise sleep and stress patterns."
              style={{ width: '100%', height: 96, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.foreground, fontSize: 12, fontFamily: 'inherit', lineHeight: 1.6, resize: 'none', outline: 'none' }}
            />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 5 }}>Applied from the next conversation onwards.</p>
          </div>
          <div style={{ height: 1, background: colors.cardBorder }} />
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Escalation</p>
            <ToggleRow label="Patient mentions a medication or supplement change" sub="Email notification to you" checked={config.escalateMeds} onChange={(v) => update({ escalateMeds: v })} />
            <ToggleRow label="Patient mentions pain, dizziness, or clinical symptoms" sub="Urgent email — MeO also routes to safety fallback" checked={config.escalateSymptoms} onChange={(v) => update({ escalateSymptoms: v })} />
            <ToggleRow label="Patient expresses emotional distress" checked={config.escalateDistress} onChange={(v) => update({ escalateDistress: v })} />
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.cardBorder}`, display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.cardBorder}`, color: colors.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: '9px', borderRadius: 8, background: saved ? '#22c55e' : colors.primary, border: 'none', color: colors.primaryForeground ?? '#1a3a3a', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.2s' }}>
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : 'Save instructions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Patient Workspace ────────────────────────────────────────────────────────

function PatientWorkspace({
  patient, detail, detailLoading,
  briefContent, briefLoading, onRegenerate,
  labFlagsData, labFlagsLoading, onAddLabResults,
  messages, sending, onSendMessage,
  input, setInput,
  protocolOpen, setProtocolOpen, colors,
}: {
  patient: TriagePatient;
  detail: PatientDetail | null;
  detailLoading: boolean;
  briefContent: string | null;
  briefLoading: boolean;
  onRegenerate: () => void;
  labFlagsData: LabFlagsResponse | null;
  labFlagsLoading: boolean;
  onAddLabResults: () => void;
  messages: Message[];
  sending: boolean;
  onSendMessage: (text: string) => void;
  input: string;
  setInput: (v: string) => void;
  protocolOpen: boolean;
  setProtocolOpen: (v: boolean) => void;
  colors: typeof COLORS;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, briefContent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(input); }
  };

  const initials = (patient.name || patient.session_id).slice(0, 2).toUpperCase();
  const patientLabel = detail?.patient_name || patient.name || 'this patient';
  const turnCount = detail?.turn_count ?? '—';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Patient header bar */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${colors.cardBorder}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${colors.primary}20`, border: `1.5px solid ${colors.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: colors.primary, flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: colors.foreground, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{patient.name || 'Anonymous'}</p>
            <p style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>{patient.vendor_id} · {patient.metabolic_goals.slice(0, 2).join(', ') || 'No goals set'}</p>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: colors.cardBorder }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare className="h-3.5 w-3.5" style={{ color: colors.muted }} />
          <span style={{ fontSize: 12, color: colors.muted }}>{turnCount} turns</span>
        </div>
        {patient.days_since_last_message != null && (
          <>
            <div style={{ width: 1, height: 28, background: colors.cardBorder }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock className="h-3.5 w-3.5" style={{ color: colors.muted }} />
              <span style={{ fontSize: 12, color: patient.days_since_last_message >= 14 ? '#ef4444' : colors.muted }}>
                {patient.days_since_last_message === 0 ? 'Active today' : `${patient.days_since_last_message}d since last message`}
              </span>
            </div>
          </>
        )}
        {patient.unfollowed_commitments > 0 && (
          <>
            <div style={{ width: 1, height: 28, background: colors.cardBorder }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 100, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <AlertCircle className="h-3 w-3" style={{ color: '#f97316' }} />
              <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>{patient.unfollowed_commitments} commitment{patient.unfollowed_commitments > 1 ? 's' : ''} pending</span>
            </div>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setProtocolOpen(true)}
          style={{ padding: '6px 12px', borderRadius: 8, background: `${colors.primary}10`, border: `1px solid ${colors.primary}25`, color: colors.primary, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          <Layers className="h-3.5 w-3.5" />
          MeO Instructions
        </button>
      </div>

      {/* Scrollable content — brief card, biomarker card, Q&A */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <BriefCard
          content={briefContent}
          isLoading={briefLoading}
          onRegenerate={onRegenerate}
          colors={colors}
          stats={{
            turnCount: detail?.turn_count ?? null,
            daysSinceLastMessage: patient.days_since_last_message,
            unfollowedCommitments: patient.unfollowed_commitments,
          }}
        />

        <BiomarkerFlagsCard
          data={labFlagsData}
          loading={labFlagsLoading}
          onAddClick={onAddLabResults}
          colors={colors}
        />

        {messages.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
              <span style={{ fontSize: 11, color: colors.muted, flexShrink: 0 }}>Follow-up Q&A</span>
              <div style={{ flex: 1, height: 1, background: colors.cardBorder }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg) =>
                msg.role === 'user'
                  ? <UserBubble key={msg.id} content={msg.content} colors={colors} />
                  : <AssistantBubble key={msg.id} content={msg.content} isLoading={msg.isLoading} colors={colors} />
              )}
            </div>
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '10px 20px 12px', borderTop: `1px solid ${colors.cardBorder}`, flexShrink: 0, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          {QUICK_ACTIONS.map(({ label, prompt, color }) => (
            <button
              key={label}
              onClick={() => onSendMessage(prompt)}
              disabled={sending || detailLoading || briefLoading}
              style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px', borderRadius: 100, border: `1px solid ${color}30`, color, background: `${color}08`, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (sending || detailLoading || briefLoading) ? 0.4 : 1, fontFamily: 'inherit' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask MeO about ${patientLabel}…`}
            rows={1}
            disabled={sending || detailLoading}
            style={{ flex: 1, resize: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: colors.foreground, outline: 'none', maxHeight: 100, fontFamily: 'inherit', opacity: (sending || detailLoading) ? 0.5 : 1 }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
            }}
          />
          <button
            onClick={() => onSendMessage(input)}
            disabled={!input.trim() || sending || detailLoading}
            style={{ width: 40, height: 40, borderRadius: 10, background: colors.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!input.trim() || sending || detailLoading) ? 0.4 : 1, transition: 'opacity 0.15s' }}
          >
            <Send className="h-4 w-4" style={{ color: colors.primaryForeground ?? '#1a3a3a' }} />
          </button>
        </div>
        <p style={{ fontSize: 11, marginTop: 8, textAlign: 'center', color: `${colors.muted}60` }}>
          Summarises data only · Not a clinical decision tool · For informational use
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const colors = useColors();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('selected'));
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Brief — separate from Q&A messages
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  // Biomarker flags
  const [labFlagsData, setLabFlagsData] = useState<LabFlagsResponse | null>(null);
  const [labFlagsLoading, setLabFlagsLoading] = useState(false);
  const [addLabOpen, setAddLabOpen] = useState(false);

  // Q&A chat (does not include the auto-brief)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [protocolOpen, setProtocolOpen] = useState(false);

  // Load triage feed
  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/patients/panel', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) { setPatients(data); return; }
        return fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : []))
          .then((raw: Omit<TriagePatient, 'last_message_at' | 'days_since_last_message' | 'unfollowed_commitments' | 'tags' | 'urgency_level' | 'urgency_reason' | 'signal_tags' | 'recent_activity_7d'>[]) =>
            setPatients(raw.map((p) => ({ ...p, last_message_at: null, days_since_last_message: null, unfollowed_commitments: 0, recent_activity_7d: 0, urgency_level: 'low' as const, urgency_reason: 'No data', signal_tags: [], tags: [] })))
          );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch brief for a given patient
  const fetchBrief = useCallback((sessionId: string) => {
    const token = getIdToken();
    if (!token) return;
    setBriefContent(null);
    setBriefLoading(true);
    fetch(`/api/clinician/${sessionId}/brief`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setBriefContent(data?.response || 'Unable to generate brief — try asking manually below.'))
      .catch(() => setBriefContent('Brief unavailable. Ask a question below.'))
      .finally(() => setBriefLoading(false));
  }, []);

  // Fetch biomarker flags for a given patient. The backend returns
  // {test_dates, flags, all_results} — not a bare array — so this must be
  // stored as that shape, not unwrapped, for the card to ever render.
  const fetchLabFlags = useCallback((sessionId: string) => {
    const token = getIdToken();
    if (!token) return;
    setLabFlagsLoading(true);
    fetch(`/api/patients/${sessionId}/labs/flags`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LabFlagsResponse | null) => setLabFlagsData(data))
      .catch(() => setLabFlagsData(null))
      .finally(() => setLabFlagsLoading(false));
  }, []);

  // Load all patient data when selection changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setBriefContent(null);
      setBriefLoading(false);
      setLabFlagsData(null);
      setMessages([]);
      return;
    }

    const token = getIdToken();
    if (!token) return;

    setMessages([]);
    setLabFlagsData(null);
    setDetailLoading(true);

    fetch(`/api/clinician?session_id=${selectedId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail)
      .catch(() => {})
      .finally(() => setDetailLoading(false));

    fetchBrief(selectedId);
    fetchLabFlags(selectedId);
  }, [selectedId, fetchBrief, fetchLabFlags]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !selectedId) return;
    const token = getIdToken();
    if (!token) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const loadingMsg: Message = { id: `l-${Date.now()}`, role: 'assistant', content: '', isLoading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/clinician/${selectedId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      const reply = res.ok ? (data.response || 'No response received.') : `Error ${res.status}: ${data.detail || 'Unknown error'}`;
      setMessages((prev) => prev.map((m) => m.isLoading ? { ...m, content: reply, isLoading: false } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.isLoading ? { ...m, content: 'Could not reach the Clinical AI. Please try again.', isLoading: false } : m));
    } finally {
      setSending(false);
    }
  }, [selectedId, sending]);

  const selectedPatient = patients.find((p) => p.session_id === selectedId);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (p.name ?? '').toLowerCase().includes(q) || p.session_id.toLowerCase().includes(q);
  });

  // Use urgency_level (not tags.length) to split the triage feed
  const needsAttention = filtered.filter((p) => (p.urgency_level ?? 'low') !== 'low');
  const onTrack = filtered.filter((p) => (p.urgency_level ?? 'low') === 'low');

  const initials = (name: string, id: string) => (name || id).slice(0, 2).toUpperCase();

  const PatientRow = ({ p }: { p: TriagePatient }) => {
    const urg = getUrgency(p);
    const sig = signalSummary(p);
    const isSelected = p.session_id === selectedId;
    const urgColor = URGENCY_BORDER[urg];
    return (
      <div
        onClick={() => setSelectedId(p.session_id)}
        style={{
          padding: '10px', borderRadius: 9, marginBottom: 3, cursor: 'pointer',
          borderLeft: `2px solid ${isSelected ? colors.primary : urgColor}`,
          background: isSelected ? `${colors.primary}10` : URGENCY_BG[urg],
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {urg !== 'none' && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: urgColor, flexShrink: 0 }} />
            )}
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: isSelected ? `${colors.primary}25` : `${urgColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: isSelected ? colors.primary : urg !== 'none' ? urgColor : colors.muted, flexShrink: 0 }}>
              {initials(p.name, p.session_id)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? colors.foreground : urg !== 'none' ? colors.foreground : 'rgba(255,255,255,0.65)' }}>
              {p.name || 'Anonymous'}
            </span>
          </div>
          {p.days_since_last_message != null && (
            <span style={{ fontSize: 10, color: p.days_since_last_message >= 14 ? '#ef4444' : 'rgba(255,255,255,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock style={{ width: 10, height: 10 }} />
              {p.days_since_last_message === 0 ? 'today' : `${p.days_since_last_message}d`}
            </span>
          )}
        </div>
        <p style={{ fontSize: 11, color: sig.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: urg !== 'none' ? 39 : 32 }}>
          {sig.text}
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ position: 'relative' }}>

      {/* ── Triage sidebar ── */}
      <div style={{ width: 272, borderRight: `1px solid ${colors.cardBorder}`, display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(0,0,0,0.15)', height: '100%' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${colors.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Patients</span>
            {needsAttention.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 100, padding: '2px 8px' }}>
                <div style={{ width: 5, height: 5, background: '#ef4444', borderRadius: '50%' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>{needsAttention.length} need attention</span>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <Search className="h-3 w-3" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients…"
              style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.cardBorder}`, color: colors.foreground, fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="inline-block h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${colors.primary} transparent` }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <Users className="h-8 w-8 mx-auto mb-2 opacity-20" style={{ color: colors.muted }} />
              <p style={{ fontSize: 12, color: colors.muted }}>{search ? 'No patients match your search.' : 'No patients yet.'}</p>
            </div>
          ) : (
            <>
              {needsAttention.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 4px 4px' }}>Ranked by attention</p>
                  {needsAttention.map((p) => <PatientRow key={p.session_id} p={p} />)}
                </>
              )}
              {onTrack.length > 0 && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 4px 4px' }}>On track</p>
                  {onTrack.map((p) => <PatientRow key={p.session_id} p={p} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {selectedPatient ? (
        <PatientWorkspace
          patient={selectedPatient}
          detail={detail}
          detailLoading={detailLoading}
          briefContent={briefContent}
          briefLoading={briefLoading}
          onRegenerate={() => selectedId && fetchBrief(selectedId)}
          labFlagsData={labFlagsData}
          labFlagsLoading={labFlagsLoading}
          onAddLabResults={() => setAddLabOpen(true)}
          messages={messages}
          sending={sending}
          onSendMessage={sendMessage}
          input={input}
          setInput={setInput}
          protocolOpen={protocolOpen}
          setProtocolOpen={setProtocolOpen}
          colors={colors}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${colors.primary}10`, border: `1px solid ${colors.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            <Users className="h-5 w-5" style={{ color: colors.primary }} />
          </div>
          <div style={{ textAlign: 'center', maxWidth: 260 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.01em' }}>Select a patient to open their workspace</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.17)', marginTop: 6, lineHeight: 1.5 }}>MeO will prepare a pre-session brief automatically</p>
          </div>
        </div>
      )}

      {/* ── Protocol config sheet ── */}
      {protocolOpen && selectedPatient && (
        <ProtocolConfigSheet
          sessionId={selectedPatient.session_id}
          patientName={selectedPatient.name || 'this patient'}
          colors={colors}
          onClose={() => setProtocolOpen(false)}
        />
      )}

      {/* ── Add lab results modal ── */}
      {addLabOpen && selectedPatient && (
        <AddLabResultsModal
          sessionId={selectedPatient.session_id}
          patientName={selectedPatient.name || 'this patient'}
          colors={colors}
          onClose={() => setAddLabOpen(false)}
          onSaved={() => {
            setAddLabOpen(false);
            fetchLabFlags(selectedPatient.session_id);
          }}
        />
      )}
    </div>
  );
}
