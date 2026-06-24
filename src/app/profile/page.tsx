'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getIdToken } from '@/app/lib/auth';
import { getForgotPasswordUrl } from '@/app/lib/auth';
import { getBookings, cancelBooking, type BookingRecord } from '@/app/marketplace/bookings';
import { buildCalendarEvent, googleCalendarUrl, outlookCalendarUrl, downloadICS } from '@/app/marketplace/calendar';

interface ProfileData {
  cognito_sub: string;
  email: string;
  name: string | null;
  metabolic_goals: string[];
  role: string;
  vendor_id: string;
  meterbolic_userid?: string | null;
  organization_id?: number | null;
}

interface Measurement {
  time: string;
  name: string;
  unit: string;
  value: number;
}

export default function ProfilePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measLoading, setMeasLoading] = useState(false);
  const [subscription, setSubscription] = useState<{ plan: string; status: string; currentPeriodEnd?: number; cancelAtPeriodEnd?: boolean } | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);

  // Load bookings from localStorage on mount
  useEffect(() => { setBookings(getBookings()); }, []);

  // Single useEffect — no router dependency to prevent re-renders
  const hasLoaded = React.useRef(false);
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const token = getIdToken();
    if (!token) {
      router.replace('/');
      return;
    }

    // Fetch subscription status
    fetch('/api/stripe/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSubscription(data); })
      .catch(() => {});

    // Fetch profile
    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) { router.replace('/'); return null; }
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data: ProfileData | null) => {
        if (data) { setProfile(data); setName(data.name || data.email || ''); }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));

    // Fetch measurements (single call)
    setMeasLoading(true);
    fetch('/api/user-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { parseMeasurements(data); })
      .catch(() => {})
      .finally(() => setMeasLoading(false));
  }, []);

  // Parse, deduplicate, sort measurements
  const parseMeasurements = (data: any) => {
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
    // Sort newest first
    entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    // Deduplicate: same name + unit + time = keep only first
    const seen = new Set<string>();
    const unique = entries.filter(m => {
      const key = `${m.time}|${m.name}|${m.unit}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Show primary units only (mMol over mg/dl, µIU/ml over pMol)
    const preferred = unique.filter(m =>
      !(['mg/dl', 'pMol', 'pounds', 'inch'].includes(m.unit))
    );
    setMeasurements(preferred.slice(0, 30));
  };

  const refreshMeasurements = () => {
    const token = getIdToken();
    if (!token) return;
    setMeasLoading(true);
    setMeasurements([]);
    fetch('/api/user-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { parseMeasurements(data); })
      .catch(() => {})
      .finally(() => setMeasLoading(false));
  };

  const handleSave = () => {
    const token = getIdToken();
    if (!token || !profile) return;
    setSaving(true);
    setSaveSuccess(false);
    fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: name || undefined }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save');
        return res.json();
      })
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name || data.email || '');
        setSaveSuccess(true);
      })
      .catch(() => setError('Failed to save'))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'transparent' }}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full animate-spin" style={{ background: colors.primary }}>
              <span className="text-lg font-bold" style={{ color: colors.primaryForeground }}>M</span>
            </div>
            <p className="text-sm animate-pulse" style={{ color: colors.muted }}>Loading profile...</p>
          </div>
        </div>
      </AppShell>
    );
  }
  if (error && !profile) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <p style={{ color: colors.error }}>{error}</p>
          <Link href="/" className="underline" style={{ color: colors.primary }}>Back to home</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-auto" style={{ background: 'transparent' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="inline-block mb-6 text-sm underline" style={{ color: colors.primary }}>
            ← Back to MeO
          </Link>
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: colors.card,
            borderColor: colors.cardBorder,
          }}
        >
          <h1 className="text-xl font-bold mb-6" style={{ color: colors.foreground }}>
            Profile
          </h1>

          {/* Identity Details */}
          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm mb-1" style={{ color: colors.muted }}>Email</p>
              <p style={{ color: colors.foreground }}>{profile?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.muted }}>Cognito ID</p>
              <p className="text-xs font-mono" style={{ color: colors.foreground }}>{profile?.cognito_sub ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: colors.muted }}>Meterbolic User ID</p>
              <p className="font-mono" style={{ color: colors.foreground }}>{profile?.meterbolic_userid ?? 'Not provisioned'}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-sm mb-1" style={{ color: colors.muted }}>Role</p>
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: profile?.role === 'patient' ? `${colors.success}20` : `${colors.warning}20`,
                    color: profile?.role === 'patient' ? colors.success : colors.warning,
                  }}
                >
                  {profile?.role ?? 'demo'}
                </span>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: colors.muted }}>Vendor</p>
                <p style={{ color: colors.foreground }}>{profile?.vendor_id ?? 'meterbolic'}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: colors.muted }}>Organization</p>
                <p style={{ color: colors.foreground }}>{profile?.organization_id ?? '—'}</p>
              </div>
            </div>
            {profile?.metabolic_goals && profile.metabolic_goals.length > 0 && (
              <div>
                <p className="text-sm mb-1" style={{ color: colors.muted }}>Metabolic Goals</p>
                <div className="flex flex-wrap gap-2">
                  {profile.metabolic_goals.map((goal, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs border"
                      style={{ borderColor: colors.primary, color: colors.primary }}
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Editable Name */}
          <div className="pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
            <label className="block text-sm mb-1" style={{ color: colors.muted }}>Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg px-4 py-2 border mb-4"
              style={{
                background: colors.background,
                borderColor: colors.cardBorder,
                color: colors.foreground,
              }}
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg px-6 py-2 font-medium disabled:opacity-70"
                style={{ background: colors.primary, color: colors.primaryForeground }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saveSuccess && (
                <span className="py-2" style={{ color: colors.success }}>Saved.</span>
              )}
            </div>
          </div>

          {/* Measurements */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>Recent Measurements</h2>
              <button
                onClick={refreshMeasurements}
                disabled={measLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                {measLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {measLoading ? (
              <p className="text-sm animate-pulse" style={{ color: colors.muted }}>Loading measurements...</p>
            ) : measurements.length === 0 ? (
              <p className="text-sm" style={{ color: colors.muted }}>No measurements found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                      {['Date', 'Analyte', 'Value', 'Unit'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase" style={{ color: colors.muted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                        <td className="px-3 py-2 text-xs" style={{ color: colors.muted }}>
                          {new Date(m.time).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2" style={{ color: colors.foreground }}>{m.name}</td>
                        <td className="px-3 py-2 font-medium" style={{ color: colors.primary }}>
                          {typeof m.value === 'number' ? m.value.toFixed(2) : m.value}
                        </td>
                        <td className="px-3 py-2 text-xs" style={{ color: colors.muted }}>{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subscription */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>Subscription</h2>
              {subscription?.plan !== 'free' && subscription?.status === 'active' && (
                <button
                  onClick={async () => {
                    const token = getIdToken();
                    if (!token) return;
                    const res = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
                >
                  Manage Billing
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: colors.muted }}>Current Plan</p>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    background: subscription?.status === 'active' && subscription?.plan !== 'free'
                      ? `${colors.primary}20` : `${colors.muted}20`,
                    color: subscription?.status === 'active' && subscription?.plan !== 'free'
                      ? colors.primary : colors.muted,
                  }}
                >
                  {(subscription?.plan || 'free').charAt(0).toUpperCase() + (subscription?.plan || 'free').slice(1)}
                </span>
              </div>
              {subscription?.status === 'active' && subscription?.currentPeriodEnd && (
                <div>
                  <p className="text-sm mb-1" style={{ color: colors.muted }}>
                    {subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'}
                  </p>
                  <p style={{ color: colors.foreground }}>
                    {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {(!subscription || subscription.plan === 'free' || subscription.status !== 'active') && (
              <a
                href="/pricing"
                className="inline-block mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: colors.primary, color: colors.primaryForeground }}
              >
                Upgrade Plan
              </a>
            )}
          </div>

          {/* Therapy Sessions */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>Therapy Sessions</h2>
              <Link
                href="/marketplace"
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
              >
                Book a session
              </Link>
            </div>
            {bookings.length === 0 ? (
              <p className="text-sm" style={{ color: colors.muted }}>No sessions booked yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const ev = b.status === 'upcoming'
                    ? buildCalendarEvent(b.therapistName, b.day, b.slot, b.sessionLength, b.note || undefined)
                    : null;
                  return (
                    <div
                      key={b.id}
                      className="rounded-xl overflow-hidden"
                      style={{
                        border: `1px solid ${colors.cardBorder}`,
                        opacity: b.status === 'cancelled' ? 0.5 : 1,
                      }}
                    >
                      <div
                        className="p-4 flex items-center justify-between gap-3"
                        style={{ backgroundColor: colors.accent }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={b.therapistImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.therapistName)}&background=random`}
                            alt={b.therapistName}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: colors.foreground }}>{b.therapistName}</p>
                            <p className="text-xs" style={{ color: colors.muted }}>{b.day} · {b.slot} · {b.sessionLength} min · £{b.price}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: b.status === 'upcoming' ? colors.primary + '20' : '#ef444420',
                              color: b.status === 'upcoming' ? colors.primary : '#ef4444',
                            }}
                          >
                            {b.status === 'upcoming' ? 'Upcoming' : 'Cancelled'}
                          </span>
                          {b.status === 'upcoming' && (
                            <>
                              <button
                                onClick={() => setCalendarOpen(calendarOpen === b.id ? null : b.id)}
                                className="text-xs px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                                style={{ backgroundColor: colors.primary + '20', color: colors.primary, border: `1px solid ${colors.primary}30` }}
                              >
                                + Calendar
                              </button>
                              <button
                                onClick={() => {
                                  cancelBooking(b.id);
                                  setBookings(getBookings());
                                }}
                                className="text-xs px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                                style={{ backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {calendarOpen === b.id && ev && (
                        <div
                          className="px-4 py-3 flex flex-wrap gap-2"
                          style={{ backgroundColor: colors.background, borderTop: `1px solid ${colors.cardBorder}` }}
                        >
                          <a
                            href={googleCalendarUrl(ev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
                          >
                            Google Calendar
                          </a>
                          <button
                            onClick={() => downloadICS(ev)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
                          >
                            Apple Calendar (.ics)
                          </button>
                          <a
                            href={outlookCalendarUrl(ev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: colors.accent, color: colors.foreground, border: `1px solid ${colors.cardBorder}` }}
                          >
                            Outlook
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Password Reset */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
            <p className="text-sm mb-2" style={{ color: colors.muted }}>
              Password and account recovery are managed by AWS Cognito.
            </p>
            <a
              href={getForgotPasswordUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
              style={{ color: colors.primary }}
            >
              Forgot password? Reset it here
            </a>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  );
}
