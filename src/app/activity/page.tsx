'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Activity as ActivityIcon,
  ArrowLeft,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
  Sigma,
  Waves,
  FlaskConical,
  Droplet,
  ClipboardPen,
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';

interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
  source?: string | null;
  measurementSeries?: string | null;
  recordType?: string | null;
  subjectState?: string | null;
  sampleSource?: string | null;
  deviceClass?: string | null;
}

// Composite/derived metrics — shown in their own "Computed" group, never mixed
// in with raw device readings. (Fallback for rows whose source tag isn't set.)
const INDEX_ANALYTES = new Set([
  'BAS', 'VAT', 'BMI', 'WWI', 'LAP', 'HOMA_IR', 'HOMA-IR', 'MetsIR', 'MetsVF', 'TyG',
]);

type SrcType = 'computed' | 'integration' | 'manual' | 'lab' | 'recorded';

const COMMON_ANALYTES = [
  { name: 'Glucose', unit: 'mMol' },
  { name: 'Insulin', unit: 'uIU/mL' },
  { name: 'LDL', unit: 'mMol' },
  { name: 'HDL', unit: 'mMol' },
  { name: 'Total Cholesterol', unit: 'mMol' },
  { name: 'Triglycerides', unit: 'mMol' },
  { name: 'HbA1c', unit: 'pct' },
  { name: 'Weight', unit: 'kg' },
  { name: 'Height', unit: 'cm' },
  { name: 'Waist', unit: 'cm' },
  { name: 'Hip', unit: 'cm' },
];

interface Session {
  key: string;
  type: SrcType;
  label: string;
  series?: string | null;
  timeStart: string;
  timeEnd: string;
  items: Measurement[];
}

// Decide the source/device class of a reading. Uses the `source` tag when
// present, else falls back to the analyte name (computed metrics) / deviceClass.
function classify(m: Measurement): SrcType {
  const s = (m.source || '').toUpperCase();
  if (s === 'INDICES' || INDEX_ANALYTES.has(m.name)) return 'computed';
  if (s === 'INTEGRATION') return 'integration';
  const dc = (m.deviceClass || '').toUpperCase();
  if (dc === 'LABORATORY') return 'lab';
  if (s === 'INCOMING') return 'manual';
  return 'recorded';
}

const SRC_META: Record<SrcType, { label: string; color: string; Icon: any }> = {
  computed: { label: 'Computed', color: '#b79ce0', Icon: Sigma },
  integration: { label: 'Integration', color: '#6fb7d6', Icon: Waves },
  lab: { label: 'Lab', color: '#a4d65e', Icon: FlaskConical },
  manual: { label: 'Manual entry', color: '#8fa89c', Icon: ClipboardPen },
  recorded: { label: 'Recorded', color: '#8fa89c', Icon: Droplet },
};

export default function ActivityPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Measurement | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const measurementKey = (m: Measurement) => `${m.time}|${m.name}`;

  const startEdit = (m: Measurement) => {
    setEditingKey(measurementKey(m));
    setEditDraft({ ...m });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditDraft(null);
  };

  const saveEdit = async (original: Measurement) => {
    if (!editDraft) return;
    setBusyKey(measurementKey(original));
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          original_time: original.time,
          original_name: original.name,
          new_time: editDraft.time,
          new_name: editDraft.name,
          new_value: editDraft.value,
          new_unit: editDraft.unit,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || d.detail || 'Failed to update measurement');
        setBusyKey(null);
        return;
      }
      cancelEdit();
      await loadActivity();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
    setBusyKey(null);
  };

  const deleteMeasurement = async (m: Measurement) => {
    if (!confirm(`Delete ${m.name} (${m.value} ${m.unit}) from ${new Date(m.time).toLocaleString()}?`)) return;
    setBusyKey(measurementKey(m));
    try {
      const token = await getValidIdToken();
      if (!token) return;
      const res = await fetch('/api/personalize/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ time: m.time, name: m.name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || d.detail || 'Failed to delete measurement');
        setBusyKey(null);
        return;
      }
      await loadActivity();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
    setBusyKey(null);
  };

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidIdToken();
      if (!token) {
        router.replace('/');
        return;
      }
      const res = await fetch('/api/user-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      let entries: Measurement[] = [];
      if (data?.measurements?.length > 0) {
        entries = data.measurements;
      } else if (data?.bio_age_data?.records?.length > 0) {
        entries = data.bio_age_data.records.map((r: any) => ({
          time: new Date(r.time).toISOString(),
          name: r.analyte || 'BAS',
          unit: r.unit || '',
          value: r.value,
          source: 'INDICES',
        }));
      }
      entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      // Dedupe by (time + analyte) — bang-api stores both original and
      // auto-converted unit variants (e.g. Glucose in mMol AND mg/dl).
      const CANONICAL_UNITS: Record<string, string[]> = {
        Glucose: ['mMol', 'mmol/L'],
        Insulin: ['uIU/mL', 'µIU/ml', 'uIU/ml'],
        LDL: ['mMol'],
        HDL: ['mMol'],
        'Total Cholesterol': ['mMol'],
        Triglycerides: ['mMol'],
        HbA1c: ['pct', '%'],
        Weight: ['kg'],
        Height: ['cm'],
        Waist: ['cm'],
        Hip: ['cm'],
      };
      const byKey = new Map<string, Measurement>();
      for (const m of entries) {
        const key = `${m.time}|${m.name}`;
        const existing = byKey.get(key);
        const canonical = CANONICAL_UNITS[m.name];
        const isCanonical = canonical ? canonical.includes(m.unit) : true;
        if (!existing) {
          byKey.set(key, m);
        } else {
          const existingIsCanonical = canonical ? canonical.includes(existing.unit) : true;
          if (isCanonical && !existingIsCanonical) byKey.set(key, m);
        }
      }
      setMeasurements(Array.from(byKey.values()));
    } catch (e) {
      setError('Failed to load measurements');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const dateLabel = (t: string) =>
    new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const timeLabel = (t: string) =>
    new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // ---- Build date -> sessions ----------------------------------------------
  // Within a day: computed metrics collapse into one "Computed" card; raw
  // readings group by their test session (measurementSeries), each labelled by
  // the source/device it came from.
  const buildSessions = (items: Measurement[]): Session[] => {
    const computed = items.filter((m) => classify(m) === 'computed');
    const raw = items.filter((m) => classify(m) !== 'computed');
    const sessions: Session[] = [];

    if (computed.length) {
      const times = computed.map((m) => m.time).sort();
      sessions.push({
        key: 'computed',
        type: 'computed',
        label: 'Metabolic metrics',
        timeStart: times[0],
        timeEnd: times[times.length - 1],
        items: computed,
      });
    }

    // group raw by measurementSeries, else by minute bucket
    const groups = new Map<string, Measurement[]>();
    for (const m of raw) {
      const gk = m.measurementSeries || `t:${new Date(m.time).toISOString().slice(0, 16)}`;
      if (!groups.has(gk)) groups.set(gk, []);
      groups.get(gk)!.push(m);
    }
    for (const [gk, gitems] of groups) {
      const times = gitems.map((m) => m.time).sort();
      const type = classify(gitems[0]);
      sessions.push({
        key: gk,
        type,
        label: SRC_META[type].label,
        series: gitems[0].measurementSeries,
        timeStart: times[0],
        timeEnd: times[times.length - 1],
        items: gitems.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }

    // newest session first
    return sessions.sort((a, b) => new Date(b.timeEnd).getTime() - new Date(a.timeEnd).getTime());
  };

  const byDate = new Map<string, Measurement[]>();
  for (const m of measurements) {
    const d = dateLabel(m.time);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(m);
  }
  const dateGroups = Array.from(byDate.entries())
    .map(([date, items]) => ({ date, sessions: buildSessions(items) }))
    .sort(
      (a, b) =>
        new Date(b.sessions[0]?.timeEnd || 0).getTime() -
        new Date(a.sessions[0]?.timeEnd || 0).getTime(),
    );

  const sourceCount = new Set(measurements.map((m) => classify(m))).size;

  // ---- one analyte row (view + inline edit) --------------------------------
  const renderRow = (m: Measurement, isLast: boolean) => {
    const key = measurementKey(m);
    const isEditing = editingKey === key;
    const isBusy = busyKey === key;
    const inputStyle = {
      background: colors.background,
      color: colors.foreground,
      border: `1px solid ${colors.cardBorder}`,
    };
    return (
      <div
        key={key}
        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
        style={{ borderTop: `1px solid ${colors.cardBorder}` }}
      >
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
                className="col-span-4 rounded px-2 py-1 text-sm font-medium outline-none"
                style={inputStyle}
              >
                {COMMON_ANALYTES.map((a) => (
                  <option key={a.name} value={a.name}>{a.name}</option>
                ))}
                {!COMMON_ANALYTES.find((a) => a.name === editDraft.name) && (
                  <option value="__custom__">{editDraft.name}</option>
                )}
              </select>
              <input
                type="number" step="any" value={editDraft.value}
                onChange={(e) => setEditDraft({ ...editDraft, value: parseFloat(e.target.value) || 0 })}
                className="col-span-3 rounded px-2 py-1 text-sm font-semibold outline-none"
                style={{ ...inputStyle, color: colors.primary }}
              />
              <input
                type="text" value={editDraft.unit}
                onChange={(e) => setEditDraft({ ...editDraft, unit: e.target.value })}
                className="col-span-2 rounded px-2 py-1 text-sm outline-none" style={inputStyle}
              />
              <input
                type="datetime-local" value={editDraft.time.slice(0, 16)}
                onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value + ':00Z' })}
                className="col-span-3 rounded px-2 py-1 text-xs outline-none" style={inputStyle}
              />
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
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>{timeLabel(m.time)}</p>
            </div>
            <div className="text-right shrink-0 mr-2">
              <p className="text-base font-semibold tabular-nums" style={{ color: colors.primary }}>
                {typeof m.value === 'number' ? m.value.toFixed(2) : m.value}
              </p>
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
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-auto" style={{ background: colors.background }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 text-sm hover:underline" style={{ color: colors.muted }}>
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: colors.primary + '20' }}>
                  <ActivityIcon className="h-6 w-6" style={{ color: colors.primary }} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>Recent Activity</h1>
                  <p className="text-sm" style={{ color: colors.muted }}>Your measurement history, grouped by test</p>
                </div>
              </div>
              <button onClick={loadActivity} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: colors.card, color: colors.foreground, border: `1px solid ${colors.cardBorder}`, opacity: loading ? 0.6 : 1 }}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          {!loading && measurements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { k: 'Total readings', v: String(measurements.length) },
                { k: 'Sources', v: String(sourceCount) },
                { k: 'Latest', v: new Date(measurements[0].time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl p-5 border" style={{ background: colors.card, borderColor: colors.cardBorder }}>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>{s.k}</p>
                  <p className="text-2xl font-bold" style={{ color: colors.foreground }}>{s.v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-10 h-10 rounded-full animate-spin border-4" style={{ borderColor: colors.cardBorder, borderTopColor: colors.primary }} />
              <p className="mt-4 text-sm" style={{ color: colors.muted }}>Loading your measurements...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl p-12 text-center border" style={{ background: colors.card, borderColor: colors.cardBorder }}>
              <p className="text-sm" style={{ color: colors.error || '#ef4444' }}>{error}</p>
            </div>
          ) : measurements.length === 0 ? (
            <div className="rounded-2xl p-12 text-center border" style={{ background: colors.card, borderColor: colors.cardBorder }}>
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" style={{ color: colors.muted }} />
              <h2 className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>No measurements yet</h2>
              <p className="text-sm" style={{ color: colors.muted }}>Your measurement history will appear here once you start tracking.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {dateGroups.map(({ date, sessions }) => (
                <div key={date}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 py-2" style={{ color: colors.muted }}>{date}</h2>
                  <div className="space-y-3">
                    {sessions.map((sess) => {
                      const meta = SRC_META[sess.type];
                      const SIcon = meta.Icon;
                      const timeText =
                        sess.timeStart === sess.timeEnd
                          ? timeLabel(sess.timeEnd)
                          : `${timeLabel(sess.timeStart)} – ${timeLabel(sess.timeEnd)}`;
                      return (
                        <div key={sess.key} className="rounded-2xl border overflow-hidden" style={{ background: colors.card, borderColor: colors.cardBorder }}>
                          {/* session header */}
                          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderLeft: `3px solid ${meta.color}` }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '22' }}>
                              <SIcon className="h-4 w-4" style={{ color: meta.color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                                  {sess.type === 'computed' ? 'Metabolic metrics' : 'Panel'}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: meta.color, background: meta.color + '22' }}>
                                  {meta.label}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                                {timeText}
                                {sess.series ? ` · ${sess.series}` : ''}
                              </p>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ color: colors.muted, background: colors.background, border: `1px solid ${colors.cardBorder}` }}>
                              {sess.items.length} {sess.items.length === 1 ? 'reading' : 'readings'}
                            </span>
                          </div>
                          {/* rows */}
                          <div>{sess.items.map((m) => renderRow(m, false))}</div>
                          {sess.type === 'computed' && (
                            <div className="px-5 py-2 text-[11px]" style={{ color: colors.muted, borderTop: `1px dashed ${colors.cardBorder}` }}>
                              ↳ derived from your measurements — not a device reading
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
