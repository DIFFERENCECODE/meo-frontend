'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Pencil, Trash2, Check, X } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';
import {
  Measurement, Session, SRC_META, extractMeasurements, findSessionById,
  timeLabelOf, dateLabelOf,
} from '../sessionUtils';

const COMMON_ANALYTES = [
  { name: 'Glucose', unit: 'mMol' }, { name: 'Insulin', unit: 'uIU/mL' },
  { name: 'LDL', unit: 'mMol' }, { name: 'HDL', unit: 'mMol' },
  { name: 'Total Cholesterol', unit: 'mMol' }, { name: 'Triglycerides', unit: 'mMol' },
  { name: 'HbA1c', unit: 'pct' }, { name: 'Weight', unit: 'kg' },
  { name: 'Height', unit: 'cm' }, { name: 'Waist', unit: 'cm' }, { name: 'Hip', unit: 'cm' },
];

export default function MeasurementDetailPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useParams();
  const id = decodeURIComponent(String(params?.id ?? ''));

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Measurement | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const mKey = (m: Measurement) => `${m.time}|${m.name}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidIdToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await fetch('/api/user-data', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      if (!res.ok) {
        setError('Failed to load measurements');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const all = extractMeasurements(data);
      setSession(findSessionById(all, id));
    } catch (e) {
      setError('Failed to load measurements');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startEdit = (m: Measurement) => { setEditingKey(mKey(m)); setEditDraft({ ...m }); };
  const cancelEdit = () => { setEditingKey(null); setEditDraft(null); };

  const saveEdit = async (original: Measurement) => {
    if (!editDraft) return;
    setBusyKey(mKey(original));
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          original_time: original.time, original_name: original.name,
          new_time: editDraft.time, new_name: editDraft.name,
          new_value: editDraft.value, new_unit: editDraft.unit,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || d.detail || 'Failed to update measurement');
        setBusyKey(null);
        return;
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
    setBusyKey(null);
  };

  const deleteMeasurement = async (m: Measurement) => {
    if (!confirm(`Delete ${m.name} (${m.value} ${m.unit}) from ${new Date(m.time).toLocaleString()}?`)) return;
    setBusyKey(mKey(m));
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ time: m.time, name: m.name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || d.detail || 'Failed to delete measurement');
        setBusyKey(null);
        return;
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
    setBusyKey(null);
  };

  const meta = session ? SRC_META[session.type] : null;
  const SIcon = meta?.Icon;
  const timeText = session
    ? session.timeStart === session.timeEnd
      ? timeLabelOf(session.timeEnd)
      : `${timeLabelOf(session.timeStart)} – ${timeLabelOf(session.timeEnd)}`
    : '';

  return (
    <AppShell>
      <div className="flex-1 overflow-auto" style={{ background: colors.background }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link href="/activity" className="inline-flex items-center gap-2 mb-6 text-sm hover:underline" style={{ color: colors.muted }}>
            <ArrowLeft className="h-4 w-4" />
            Back to activity
          </Link>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 rounded-full animate-spin border-4" style={{ borderColor: colors.cardBorder, borderTopColor: colors.primary }} />
              <p className="mt-4 text-sm" style={{ color: colors.muted }}>Loading…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl p-12 text-center border" style={{ background: colors.card, borderColor: colors.cardBorder }}>
              <p className="text-sm" style={{ color: colors.error || '#ef4444' }}>{error}</p>
            </div>
          ) : !session || !meta ? (
            <div className="rounded-2xl p-12 text-center border" style={{ background: colors.card, borderColor: colors.cardBorder }}>
              <p className="text-sm" style={{ color: colors.muted }}>This measurement session was not found. It may have been edited or removed.</p>
              <Link href="/activity" className="inline-block mt-4 text-sm font-medium" style={{ color: colors.primary }}>Back to activity</Link>
            </div>
          ) : (
            <>
              {/* Session header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.color + '22' }}>
                  {SIcon ? <SIcon className="h-6 w-6" style={{ color: meta.color }} /> : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold" style={{ color: colors.foreground }}>{meta.title}</h1>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: meta.color, background: meta.color + '22' }}>{meta.label}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: colors.muted }}>
                    {dateLabelOf(session.timeEnd)} · {timeText} · {session.items.length} {session.items.length === 1 ? 'reading' : 'readings'}
                  </p>
                  {(session.series || session.items[0]?.measurementSeries) && (
                    <p className="text-xs mt-1.5 font-mono select-all" style={{ color: colors.muted, opacity: 0.85 }} title={session.series || session.items[0]?.measurementSeries || ''}>
                      Measurement ID · {session.series || session.items[0]?.measurementSeries}
                    </p>
                  )}
                </div>
              </div>

              {session.type === 'computed' && (
                <div className="rounded-xl px-4 py-3 mb-4 text-xs" style={{ color: colors.muted, background: colors.card, border: `1px dashed ${colors.cardBorder}` }}>
                  These are derived metabolic scores computed from your measurements — not direct device readings.
                </div>
              )}

              {/* readings */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: colors.card, borderColor: colors.cardBorder }}>
                {session.items.map((m, i) => {
                  const key = mKey(m);
                  const isEditing = editingKey === key;
                  const isBusy = busyKey === key;
                  const inputStyle = { background: colors.background, color: colors.foreground, border: `1px solid ${colors.cardBorder}` };
                  return (
                    <div key={key} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/5" style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.cardBorder}` }}>
                      {isEditing && editDraft ? (
                        <>
                          <div className="flex-1 grid grid-cols-12 gap-2">
                            <select
                              value={COMMON_ANALYTES.find((a) => a.name === editDraft.name) ? editDraft.name : '__custom__'}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') return;
                                const found = COMMON_ANALYTES.find((a) => a.name === e.target.value);
                                setEditDraft({ ...editDraft, name: e.target.value, unit: found?.unit || editDraft.unit });
                              }}
                              className="col-span-4 rounded px-2 py-1 text-sm font-medium outline-none" style={inputStyle}
                            >
                              {COMMON_ANALYTES.map((a) => (<option key={a.name} value={a.name}>{a.name}</option>))}
                              {!COMMON_ANALYTES.find((a) => a.name === editDraft.name) && (<option value="__custom__">{editDraft.name}</option>)}
                            </select>
                            <input type="number" step="any" value={editDraft.value} onChange={(e) => setEditDraft({ ...editDraft, value: parseFloat(e.target.value) || 0 })} className="col-span-3 rounded px-2 py-1 text-sm font-semibold outline-none" style={{ ...inputStyle, color: colors.primary }} />
                            <input type="text" value={editDraft.unit} onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })} className="col-span-2 rounded px-2 py-1 text-sm outline-none" style={inputStyle} />
                            <input type="datetime-local" value={editDraft.time.slice(0, 16)} onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value + ':00Z' })} className="col-span-3 rounded px-2 py-1 text-xs outline-none" style={inputStyle} />
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => saveEdit(m)} disabled={isBusy} className="p-2 rounded hover:bg-white/5" style={{ color: colors.primary }} aria-label="Save" title="Save">
                              {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                            <button onClick={cancelEdit} disabled={isBusy} className="p-2 rounded hover:bg-white/5" style={{ color: colors.muted }} aria-label="Cancel" title="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: colors.foreground }}>{m.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: colors.muted }}>{timeLabelOf(m.time)}</p>
                          </div>
                          <div className="text-right shrink-0 mr-2">
                            <p className="text-base font-semibold tabular-nums" style={{ color: colors.primary }}>{typeof m.value === 'number' ? m.value.toFixed(2) : m.value}</p>
                            <p className="text-xs" style={{ color: colors.muted }}>{m.unit}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(m)} disabled={isBusy} className="p-2 rounded hover:bg-white/5" style={{ color: colors.muted }} aria-label="Edit" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteMeasurement(m)} disabled={isBusy} className="p-2 rounded hover:bg-white/5" style={{ color: '#ef4444' }} aria-label="Delete" title="Delete">
                              {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
