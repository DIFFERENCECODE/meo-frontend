'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Activity as ActivityIcon, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getValidIdToken } from '@/app/lib/auth';

interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
}

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
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
                          style={{
                            borderBottom:
                              i < items.length - 1
                                ? `1px solid ${colors.cardBorder}`
                                : 'none',
                          }}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: colors.primary + '15' }}
                            >
                              <ActivityIcon
                                className="h-4 w-4"
                                style={{ color: colors.primary }}
                              />
                            </div>
                            <div className="min-w-0">
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
                          </div>
                          <div className="text-right ml-4 shrink-0">
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
