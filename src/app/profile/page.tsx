'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { getIdToken } from '@/app/lib/auth';
import { getForgotPasswordUrl } from '@/app/lib/auth';

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

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      router.replace('/');
      return;
    }
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/');
          return null;
        }
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data: ProfileData | null) => {
        if (data) {
          setProfile(data);
          setName(data.name || data.email || '');
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));

    // Fetch user measurements via meo/user-data
    setMeasLoading(true);
    fetch('/api/user-data', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.measurements?.length > 0) {
          setMeasurements(data.measurements.slice(0, 30));
        } else if (data?.bio_age_data?.records?.length > 0) {
          // Convert BAS records to measurement format
          setMeasurements(data.bio_age_data.records.map((r: any) => ({
            time: new Date(r.time).toLocaleDateString(),
            name: r.analyte || 'BAS',
            unit: r.unit || '',
            value: r.value,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setMeasLoading(false));
  }, [router]);

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
        <div className="flex-1 flex items-center justify-center p-6" style={{ background: colors.background }}>
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
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-lg mx-auto">
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
            <h2 className="text-lg font-bold mb-4" style={{ color: colors.foreground }}>Recent Measurements</h2>
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
