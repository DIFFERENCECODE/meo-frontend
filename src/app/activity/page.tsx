'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Activity as ActivityIcon, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';
import {
  Measurement, SRC_META, classify, extractMeasurements, buildDayGroups,
  timeLabelOf, headlineOf,
} from './sessionUtils';

export default function ActivityPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = async () => {
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
      setMeasurements(extractMeasurements(data));
    } catch (e) {
      setError('Failed to load measurements');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const dayGroups = buildDayGroups(measurements);
  const sourceCount = new Set(measurements.map((m) => classify(m))).size;

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
              {dayGroups.map((day) => (
                <div key={day.dateKey}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 py-2" style={{ color: colors.muted }}>{day.dateLabel}</h2>
                  <div className="space-y-3">
                    {day.sessions.map((sess) => {
                      const meta = SRC_META[sess.type];
                      const SIcon = meta.Icon;
                      const timeText = sess.timeStart === sess.timeEnd ? timeLabelOf(sess.timeEnd) : `${timeLabelOf(sess.timeStart)} – ${timeLabelOf(sess.timeEnd)}`;
                      const head = headlineOf(sess);
                      return (
                        <Link
                          key={sess.id}
                          href={`/activity/${encodeURIComponent(sess.id)}`}
                          className="flex items-center gap-3 rounded-2xl border px-5 py-4 transition-colors hover:bg-white/5"
                          style={{ background: colors.card, borderColor: colors.cardBorder, borderLeft: `3px solid ${meta.color}` }}
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '22' }}>
                            <SIcon className="h-5 w-5" style={{ color: meta.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: colors.foreground }}>{meta.title}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: meta.color, background: meta.color + '22' }}>{meta.label}</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                              {timeText} · {sess.items.length} {sess.items.length === 1 ? 'reading' : 'readings'}
                            </p>
                          </div>
                          {head && (
                            <div className="text-right shrink-0 mr-1 hidden sm:block">
                              <p className="text-base font-semibold tabular-nums" style={{ color: colors.primary }}>{head.value}</p>
                              <p className="text-[11px]" style={{ color: colors.muted }}>{head.name}{head.unit ? ` · ${head.unit}` : ''}</p>
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 shrink-0" style={{ color: colors.muted }} />
                        </Link>
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
