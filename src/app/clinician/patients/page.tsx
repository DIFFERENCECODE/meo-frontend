'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken } from '@/app/lib/auth';
import { Search, Users, Sparkles, ChevronRight } from 'lucide-react';

interface Patient {
  session_id: string;
  name: string | null;
  metabolic_goals: string[];
  role: string;
  vendor_id: string;
}

interface PatientDetail {
  profile: any;
  chat_history: any[];
  metabolic_data: any;
  session_id: string;
}

function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { colors } = useTheme();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch(`/api/clinician?session_id=${patient.session_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patient.session_id]);

  const messages = detail?.chat_history ?? [];
  const lastMsg = messages[messages.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: colors.cardBorder }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: `${colors.primary}25`, color: colors.primary }}>
              {(patient.name || patient.session_id).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.foreground }}>{patient.name || 'Anonymous'}</p>
              <p className="text-xs font-mono" style={{ color: colors.muted }}>{patient.session_id.slice(0, 16)}…</p>
            </div>
          </div>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: colors.muted, background: 'rgba(255,255,255,0.07)' }}>
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${colors.primary} transparent` }} />
            </div>
          ) : (
            <>
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Role', value: patient.role },
                  { label: 'Vendor', value: patient.vendor_id },
                  { label: 'Goals', value: patient.metabolic_goals?.join(', ') || 'None set' },
                  { label: 'Last message', value: lastMsg ? new Date(lastMsg.created_at || Date.now()).toLocaleDateString('en-GB') : 'No messages' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-xs mb-1" style={{ color: colors.muted }}>{label}</p>
                    <p className="text-sm font-medium capitalize truncate" style={{ color: colors.foreground }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Chat history preview */}
              {messages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: colors.muted }}>Recent conversation</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {messages.slice(-6).map((m: any, i: number) => (
                      <div key={i} className={`flex ${m.type === 'human' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[80%] px-3 py-2 rounded-xl text-xs"
                          style={{
                            background: m.type === 'human' ? `${colors.primary}20` : 'rgba(255,255,255,0.07)',
                            color: colors.foreground,
                          }}
                        >
                          {typeof m.content === 'string' ? m.content.slice(0, 200) : JSON.stringify(m.content).slice(0, 200)}
                          {(typeof m.content === 'string' ? m.content : '').length > 200 && '…'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metabolic data preview */}
              {detail?.metabolic_data && (
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: colors.muted }}>Metabolic Data</p>
                  <pre className="text-xs overflow-x-auto" style={{ color: colors.muted }}>
                    {JSON.stringify(detail.metabolic_data, null, 2).slice(0, 400)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const { colors } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = getIdToken();
    if (!token) return;
    fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPatients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name ?? '').toLowerCase().includes(q) ||
      p.session_id.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.foreground }}>Patients</h1>
          <p className="text-sm" style={{ color: colors.muted }}>
            {loading ? 'Loading…' : `${patients.length} total`}
          </p>
        </div>
        {/* Search */}
        <div className="sm:ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: colors.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients…"
            className="pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none w-full sm:w-64"
            style={{
              background: colors.card,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.foreground,
              fontSize: '16px',
            }}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${colors.primary} transparent` }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-10 w-10 mx-auto opacity-30" style={{ color: colors.muted }} />
            <p className="text-sm" style={{ color: colors.muted }}>{search ? 'No patients match your search.' : 'No patients yet.'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: colors.cardBorder }}>
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_40px] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
              style={{ color: colors.muted }}>
              <span>Patient</span>
              <span>Role</span>
              <span>Vendor</span>
              <span />
            </div>
            {filtered.map((p) => {
              const initials = (p.name || p.session_id).slice(0, 2).toUpperCase();
              return (
                <Link
                  key={p.session_id}
                  href={`/clinician/patients/${p.session_id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-all hover:bg-white/5"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: `${colors.primary}25`, color: colors.primary }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: colors.foreground }}>
                      {p.name || 'Anonymous'}
                    </p>
                    <p className="text-xs font-mono truncate" style={{ color: colors.muted }}>
                      {p.metabolic_goals?.slice(0, 2).join(' · ') || p.session_id.slice(0, 20) + '…'}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${colors.primary}18`, color: colors.primary }}>
                    {p.role}
                  </span>
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 text-xs"
                    style={{ color: colors.muted }}>
                    <Sparkles className="h-3 w-3" />
                    Clinical AI
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: colors.muted }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
