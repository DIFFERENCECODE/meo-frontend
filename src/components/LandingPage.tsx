'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import SignInPanel from '@/components/auth/SignInPanel';

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

export default function LandingPage({ onAuthenticated, isExchanging = false }: LandingPageProps) {
  const [tIdx, setTIdx] = useState(0);
  useEffect(() => {
    setTIdx(Math.floor(Math.random() * TESTIMONIALS.length));
  }, []);
  const t = TESTIMONIALS[tIdx];

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

        {/* Form area — the actual sign-in/sign-up state machine lives in
            SignInPanel.tsx now; this file only keeps the marketing shell
            around it (logo, footer, right-side testimonial panel). */}
        <div className="flex-1 flex flex-col justify-center py-10 max-w-sm">
          {isExchanging ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#1a3a3a' }} />
              <p className="text-sm font-medium" style={{ color: '#374151' }}>Signing you in…</p>
            </div>
          ) : (
            <SignInPanel onAuthenticated={onAuthenticated} />
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
