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
} from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';

interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
}

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
        body: JSON.stringify({
          time: m.time,
          name: m.name,
        }),
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
        }));
      }
      entries.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );
      // Dedupe
      const seen = new Set<string>();
      const unique = entries.filter((m) => {
        const key = `${m.time}|${m.name}|${m.unit}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setMeasurements(unique);
    } catch (e) {
      setError('Failed to load measurements');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadActivity();
  }, []);

  // Group measurements by date
  const grouped: Record<string, Measurement[]> = {};
  measurements.forEach((m) => {
    const date = new Date(m.time).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(m);
  });

  return (
    <AppShell>
      <div
        className="flex-1 overflow-auto"
        style={{ background: colors.background }}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 text-sm hover:underline"
              style={{ color: colors.muted }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: colors.primary + '20' }}
                >
                  <ActivityIcon
                    className="h-6 w-6"
                    style={{ color: colors.primary }}
                  />
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold"
                    style={{ color: colors.foreground }}
                  >
                    Recent Activity
                  </h1>
                  <p className="text-sm" style={{ color: colors.muted }}>
                    Your measurement history
                  </p>
                </div>
              </div>
              <button
                onClick={loadActivity}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: colors.card,
                  color: colors.foreground,
                  border: `1px solid ${colors.cardBorder}`,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats summary */}
          {!loading && measurements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div
                className="rounded-2xl p-5 border"
                style={{
                  background: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Total Measurements
                </p>
                <p className="text-2xl font-bold" style={{ color: colors.foreground }}>
                  {measurements.length}
                </p>
              </div>
              <div
                className="rounded-2xl p-5 border"
                style={{
                  background: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Unique Metrics
                </p>
                <p className="text-2xl font-bold" style={{ color: colors.foreground }}>
                  {new Set(measurements.map((m) => m.name)).size}
                </p>
              </div>
              <div
                className="rounded-2xl p-5 border"
                style={{
                  background: colors.card,
                  borderColor: colors.cardBorder,
                }}
              >
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: colors.muted }}>
                  Latest
                </p>
                <p className="text-2xl font-bold" style={{ color: colors.foreground }}>
                  {new Date(measurements[0].time).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div
                className="w-10 h-10 rounded-full animate-spin border-4"
                style={{
                  borderColor: colors.cardBorder,
                  borderTopColor: colors.primary,
                }}
              />
              <p className="mt-4 text-sm" style={{ color: colors.muted }}>
                Loading your measurements...
              </p>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl p-12 text-center border"
              style={{
                background: colors.card,
                borderColor: colors.cardBorder,
              }}
            >
              <p className="text-sm" style={{ color: colors.error || '#ef4444' }}>
                {error}
              </p>
            </div>
          ) : measurements.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center border"
              style={{
                background: colors.card,
                borderColor: colors.cardBorder,
              }}
            >
              <Clock
                className="h-16 w-16 mx-auto mb-4 opacity-30"
                style={{ color: colors.muted }}
              />
              <h2 className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
                No measurements yet
              </h2>
              <p className="text-sm" style={{ color: colors.muted }}>
                Your measurement history will appear here once you start tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <h2
                    className="text-xs font-semibold uppercase tracking-wider mb-3 sticky top-0 py-2"
                    style={{ color: colors.muted, background: colors.background }}
                  >
                    {date}
                  </h2>
                  <div
                    className="rounded-2xl border overflow-hidden"
                    style={{
                      background: colors.card,
                      borderColor: colors.cardBorder,
                    }}
                  >
                    {items.map((m, i) => {
                      const time = new Date(m.time).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
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
                          key={i}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
                          style={{
                            borderBottom:
                              i < items.length - 1
                                ? `1px solid ${colors.cardBorder}`
                                : 'none',
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: colors.primary + '15' }}
                          >
                            <ActivityIcon
                              className="h-4 w-4"
                              style={{ color: colors.primary }}
                            />
                          </div>

                          {isEditing && editDraft ? (
                            <>
                              <div className="flex-1 grid grid-cols-12 gap-2">
                                <select
                                  value={
                                    COMMON_ANALYTES.find((a) => a.name === editDraft.name)
                                      ? editDraft.name
                                      : '__custom__'
                                  }
                                  onChange={(e) => {
                                    if (e.target.value === '__custom__') return;
                                    const found = COMMON_ANALYTES.find((a) => a.name === e.target.value);
                                    setEditDraft({
                                      ...editDraft,
                                      name: e.target.value,
                                      unit: found?.unit || editDraft.unit,
                                    });
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
                                  type="number"
                                  step="any"
                                  value={editDraft.value}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      value: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="col-span-3 rounded px-2 py-1 text-sm font-semibold outline-none"
                                  style={{ ...inputStyle, color: colors.primary }}
                                />
                                <input
                                  type="text"
                                  value={editDraft.unit}
                                  onChange={(e) =>
                                    setEditDraft({ ...editDraft, unit: e.target.value })
                                  }
                                  className="col-span-2 rounded px-2 py-1 text-sm outline-none"
                                  style={inputStyle}
                                />
                                <input
                                  type="datetime-local"
                                  value={editDraft.time.slice(0, 16)}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      time: e.target.value + ':00Z',
                                    })
                                  }
                                  className="col-span-3 rounded px-2 py-1 text-xs outline-none"
                                  style={inputStyle}
                                />
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => saveEdit(m)}
                                  disabled={isBusy}
                                  className="p-2 rounded transition-colors hover:bg-white/5"
                                  style={{ color: colors.primary }}
                                  aria-label="Save"
                                  title="Save"
                                >
                                  {isBusy ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={isBusy}
                                  className="p-2 rounded transition-colors hover:bg-white/5"
                                  style={{ color: colors.muted }}
                                  aria-label="Cancel"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: colors.foreground }}
                                >
                                  {m.name}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                                  {time}
                                </p>
                              </div>
                              <div className="text-right shrink-0 mr-2">
                                <p
                                  className="text-base font-semibold"
                                  style={{ color: colors.primary }}
                                >
                                  {typeof m.value === 'number' ? m.value.toFixed(2) : m.value}
                                </p>
                                <p className="text-xs" style={{ color: colors.muted }}>
                                  {m.unit}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEdit(m)}
                                  disabled={isBusy}
                                  className="p-2 rounded transition-colors hover:bg-white/5"
                                  style={{ color: colors.muted }}
                                  aria-label="Edit"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteMeasurement(m)}
                                  disabled={isBusy}
                                  className="p-2 rounded transition-colors hover:bg-white/5"
                                  style={{ color: '#ef4444' }}
                                  aria-label="Delete"
                                  title="Delete"
                                >
                                  {isBusy ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </>
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
