'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
}

export default function ProfilePage() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const token = getIdToken();
    if (!token) {
      setError('Not signed in');
      setLoading(false);
      return;
    }
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile');
        return res.json();
      })
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name || data.email || '');
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="flex-1 flex items-center justify-center p-6">
          <p style={{ color: colors.muted }}>Loading profile...</p>
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
          <p className="text-sm mb-1" style={{ color: colors.muted }}>Email (from Cognito)</p>
          <p className="mb-6" style={{ color: colors.foreground }}>{profile?.email ?? '—'}</p>

          <label className="block text-sm mb-1" style={{ color: colors.muted }}>Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg px-4 py-2 border mb-6"
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

          <div className="mt-8 pt-6 border-t" style={{ borderColor: colors.cardBorder }}>
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
