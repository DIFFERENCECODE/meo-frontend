'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { Activity, ArrowRight, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { getGoogleLoginUrl } from '@/app/lib/auth';

const TESTIMONIALS = [
  {
    quote: "Meterbolic gives me a window into my patients' metabolic health between sessions — it's become central to how I manage insulin resistance cases.",
    name: 'Dr. Sarah Mitchell',
    role: 'Functional Medicine Practitioner, London',
  },
  {
    quote: "The Kraft curve visualisation has changed how I explain metabolic dysfunction to patients. A tool every BANT nutritionist should have.",
    name: "James O'Brien",
    role: 'Registered Nutritional Therapist, Manchester',
  },
  {
    quote: "I finally have the data to back up lifestyle prescriptions. Patients can see their own patterns and it drives engagement like nothing else.",
    name: 'Dr. Priya Nair',
    role: 'GP Partner, Birmingham',
  },
];

interface LandingPageProps {
  onAuthenticated: (idToken: string, refreshToken: string) => void;
  isExchanging?: boolean;
}

type Screen = 'email' | 'otp';

export default function LandingPage({ onAuthenticated, isExchanging = false }: LandingPageProps) {
  const [screen, setScreen]   = useState<Screen>('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tIdx, setTIdx] = useState(0);
  useEffect(() => {
    setTIdx(Math.floor(Math.random() * TESTIMONIALS.length));
  }, []);
  const t = TESTIMONIALS[tIdx];

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || 'Failed to send code. Please try again.');
        return;
      }
      setScreen('otp');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.detail || 'Invalid code. Please try again.');
        return;
      }
      onAuthenticated(d.idToken, d.refreshToken || '');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    borderColor: '#d1d5db', color: '#111827', fontSize: '16px',
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 bg-white px-8 sm:px-12 lg:px-14 py-10 justify-between min-h-screen lg:min-h-0">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#1a3a3a' }}>
            <Activity className="h-4 w-4" style={{ color: '#a4d65e' }} />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: '#1a3a3a' }}>Meterbolic</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center py-10 max-w-sm">
          {isExchanging ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#1a3a3a' }} />
              <p className="text-sm font-medium" style={{ color: '#374151' }}>Signing you in…</p>
            </div>

          ) : screen === 'email' ? (
            <>
              <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>
                Welcome to MeO
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                Sign in or create a free account to get started.
              </p>

              {/* Social buttons */}
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={() => { window.location.href = getGoogleLoginUrl(); }}
                  className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={{ border: '1px solid #d1d5db', color: '#111827', background: '#ffffff' }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </button>

              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
                <span className="text-xs" style={{ color: '#9ca3af' }}>or continue with email</span>
                <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
              </div>

              <form onSubmit={sendOtp} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#a4d65e')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ background: '#1a3a3a', color: '#ffffff' }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-5 text-xs text-center" style={{ color: '#9ca3af' }}>
                Are you a clinician?{' '}
                <a href="/register/clinician" className="underline hover:text-gray-600" style={{ color: '#6b7280' }}>
                  Register your practice
                </a>
              </p>
            </>

          ) : (
            <>
              <button
                onClick={() => { setScreen('email'); setOtp(''); setError(''); }}
                className="flex items-center gap-1.5 mb-8 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: '#6b7280' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-full mb-5" style={{ background: '#f0fdf4' }}>
                <Mail className="h-5 w-5" style={{ color: '#16a34a' }} />
              </div>

              <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>
                Check your email
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
                We sent a 6-digit code to <span className="font-medium" style={{ color: '#111827' }}>{email}</span>
              </p>

              <form onSubmit={verifyOtp} className="mt-8 flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  suppressHydrationWarning
                  className="w-full rounded-lg border px-3.5 py-3 text-2xl font-bold tracking-[0.4em] text-center outline-none transition-colors"
                  style={{ borderColor: '#d1d5db', color: '#111827' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#a4d65e')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ background: '#1a3a3a', color: '#ffffff' }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & sign in <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <p className="mt-4 text-xs text-center" style={{ color: '#9ca3af' }}>
                Didn't receive it?{' '}
                <button
                  onClick={() => { setOtp(''); setError(''); setScreen('email'); }}
                  className="underline hover:text-gray-600"
                  style={{ color: '#6b7280' }}
                >
                  Try again
                </button>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs" style={{ color: '#9ca3af' }}>
          <span>© {new Date().getFullYear()} Meterbolic</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:underline">Privacy</a>
            <a href="/terms" className="hover:underline">Terms</a>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a3a3a 0%, #264545 45%, #2a5555 100%)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 20%, rgba(164,214,94,0.08) 0%, transparent 50%),
                               radial-gradient(circle at 20% 80%, rgba(164,214,94,0.05) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full pointer-events-none" style={{ background: 'rgba(164,214,94,0.06)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'rgba(164,214,94,0.15)', border: '1px solid rgba(164,214,94,0.3)' }}
            >
              <Activity className="h-6 w-6" style={{ color: '#a4d65e' }} />
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: '#ffffff' }}>Meterbolic</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Metabolic Health Intelligence</p>
            </div>
          </div>

          <div className="mt-10 max-w-md">
            <h2 className="text-3xl xl:text-4xl font-bold leading-snug" style={{ color: '#ffffff' }}>
              Understand your<br />
              <span style={{ color: '#a4d65e' }}>metabolic health</span><br />
              like never before.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Kraft curves, insulin patterns, bio-age insights — powered by your data and guided by AI.
            </p>
          </div>
        </div>

        <div className="relative z-10 my-8 flex flex-col gap-3">
          {[
            { icon: '🧠', label: 'AI health coach available 24/7' },
            { icon: '📊', label: 'Kraft curve & insulin resistance analysis' },
            { icon: '🎯', label: 'Personalised metabolic protocol guidance' },
            { icon: '🩺', label: 'Clinician-reviewed insights' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-base">{icon}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div
          className="relative z-10 rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
              style={{ background: '#a4d65e', color: '#1a3a3a' }}
            >
              {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>{t.name}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
