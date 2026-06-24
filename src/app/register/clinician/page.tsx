'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, ArrowLeft, Activity, Loader2, Stethoscope, MessageSquare, Mail } from 'lucide-react';
import { getIdToken, getEmailFromIdToken, storeIdToken, storeRefreshToken, apiFetch } from '@/app/lib/auth';

// ── Constants ──────────────────────────────────────────────────────────────
const PROF_BODIES = [
  'GMC (General Medical Council)', 'GPhC (General Pharmaceutical Council)',
  'HCPC (Health and Care Professions Council)', 'NMC (Nursing and Midwifery Council)',
  'BANT (British Association for Nutrition and Lifestyle Medicine)',
  'ANutr / RNutr (Association for Nutrition)', 'CNHC (Complementary and Natural Healthcare Council)',
  'BDA (British Dietetic Association)', 'IFMCP (Institute for Functional Medicine)',
  'BPS (British Psychological Society)', 'BACP (British Association for Counselling and Psychotherapy)', 'Other',
];

const SPECIALTIES = [
  'Metabolic Health', 'Insulin Resistance / Type 2 Diabetes', 'Cardiovascular Health',
  'Weight Management', 'Hormonal Health / PCOS', 'Gut Health & Microbiome',
  'Mental Health & Psychiatry', 'Longevity & Anti-ageing', 'Sports & Exercise Medicine',
  'Functional Medicine', 'Nutritional Therapy', 'Lifestyle Medicine',
  'Endocrinology', 'Neurology / Cognitive Health', 'Oncology', 'Other',
];

const STEPS = [
  { title: 'Tell us about yourself',       subtitle: 'Your basic professional information.' },
  { title: 'Your credentials',             subtitle: 'We verify all practitioners on the platform.' },
  { title: 'Your specialties',             subtitle: 'Select everything that applies to your practice.' },
  { title: 'Your practice',                subtitle: 'Where do you work?' },
  { title: 'Your profile',                 subtitle: 'Help patients find and trust the right clinician.' },
];
const TOTAL = STEPS.length;

interface Form {
  fullName: string; profBody: string; regNumber: string; specialties: string[];
  clinicName: string; clinicAddress: string; website: string; bio: string; reasonForJoining: string;
}
const EMPTY: Form = { fullName: '', profBody: '', regNumber: '', specialties: [], clinicName: '', clinicAddress: '', website: '', bio: '', reasonForJoining: '' };

// ── Shared input style ──────────────────────────────────────────────────────
const inputBase = "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none bg-white transition-colors";
const iS = { borderColor: '#e5e7eb', color: '#111827', fontSize: '16px' };
const onFocus = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = '#a4d65e');
const onBlur  = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = '#e5e7eb');

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
      {text}{required && <span style={{ color: '#a4d65e' }}> *</span>}
    </label>
  );
}

// ── App preview panel ───────────────────────────────────────────────────────
const CLINICIAN_TESTIMONIALS = [
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

function RightPanel() {
  const [tIdx, setTIdx] = React.useState(0);
  React.useEffect(() => {
    setTIdx(Math.floor(Math.random() * CLINICIAN_TESTIMONIALS.length));
  }, []);
  const t = CLINICIAN_TESTIMONIALS[tIdx];

  return (
    <div
      className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1a3a3a 0%, #264545 45%, #2a5555 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 70% 20%, rgba(164,214,94,0.08) 0%, transparent 50%),
                           radial-gradient(circle at 20% 80%, rgba(164,214,94,0.05) 0%, transparent 40%)`,
      }} />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full pointer-events-none" style={{ background: 'rgba(164,214,94,0.06)' }} />

      {/* Top: logo + headline + features */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'rgba(164,214,94,0.15)', border: '1px solid rgba(164,214,94,0.3)' }}>
            <Activity className="h-6 w-6" style={{ color: '#a4d65e' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#ffffff' }}>Meterbolic</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Clinician Platform</p>
          </div>
        </div>

        <div className="mt-10 max-w-md">
          <h2 className="text-3xl xl:text-4xl font-bold leading-snug" style={{ color: '#ffffff' }}>
            Join the clinicians<br />
            <span style={{ color: '#a4d65e' }}>shaping the future</span><br />
            of metabolic health.
          </h2>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Get verified, access real-time patient data, and deliver better outcomes with AI-powered clinical tools.
          </p>
        </div>
      </div>

      {/* Middle: features */}
      <div className="relative z-10 my-8 flex flex-col gap-3">
        {[
          { icon: '🩺', label: 'Verified clinician badge — trusted by patients' },
          { icon: '📊', label: 'Kraft curve & insulin resistance analytics' },
          { icon: '🤖', label: 'AI-generated between-session clinical briefs' },
          { icon: '🎯', label: 'Personalised metabolic protocol guidance' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-base">{icon}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom: testimonial */}
      <div className="relative z-10 rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
          &ldquo;{t.quote}&rdquo;
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0"
            style={{ background: '#a4d65e', color: '#1a3a3a' }}>
            {t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>{t.name}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ClinicianRegisterPage() {
  const router = useRouter();
  const [token, setToken]       = useState<string | null>(null);
  const [email, setEmail]       = useState('');
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState<Form>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError]       = useState('');

  // OTP auth state (used when not already signed in)
  const [authScreen, setAuthScreen] = useState<'email' | 'otp'>('email');
  const [authEmail, setAuthEmail]   = useState('');
  const [authOtp, setAuthOtp]       = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]   = useState('');

  useEffect(() => {
    const t = getIdToken();
    setToken(t);
    if (t) { const e = getEmailFromIdToken(t); if (e) setEmail(e); }
  }, []);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const trimmed = authEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { setAuthError('Please enter a valid email.'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setAuthError(d.detail || 'Failed to send code.'); return; }
      setAuthScreen('otp');
    } catch { setAuthError('Network error.'); }
    finally { setAuthLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authOtp.trim().length !== 6) { setAuthError('Enter the 6-digit code.'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim().toLowerCase(), otp: authOtp.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setAuthError(d.detail || 'Invalid code.'); return; }
      storeIdToken(d.idToken);
      if (d.refreshToken) storeRefreshToken(d.refreshToken);
      setToken(d.idToken);
      setEmail(authEmail.trim().toLowerCase());
    } catch { setAuthError('Network error.'); }
    finally { setAuthLoading(false); }
  };

  const set = (k: keyof Form, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSpec = (s: string) => set('specialties', form.specialties.includes(s) ? form.specialties.filter(x => x !== s) : [...form.specialties, s]);

  const validateStep = (): string | null => {
    if (step === 0 && !form.fullName.trim()) return 'Please enter your full name.';
    if (step === 1 && !form.profBody) return 'Please select your registration body.';
    if (step === 1 && !form.regNumber.trim()) return 'Please enter your registration number.';
    if (step === 2 && form.specialties.length === 0) return 'Please select at least one specialty.';
    if (step === 3 && !form.clinicName.trim()) return 'Please enter your clinic name.';
    if (step === 4 && form.bio.trim().length < 50) return 'Please write a bio of at least 50 characters.';
    if (step === 4 && !form.reasonForJoining.trim()) return 'Please tell us why you want to join.';
    return null;
  };

  const next = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    if (step < TOTAL - 1) { setStep(s => s + 1); return; }

    // Final step — submit + redirect to Stripe
    if (!token) { setError('Please sign in first.'); return; }
    setSubmitting(true);
    try {
      const profileRes = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.fullName, role: 'clinician_pending', clinician_application: { ...form, email, submittedAt: new Date().toISOString() } }),
      });
      if (!profileRes.ok) throw new Error();
      const checkoutRes = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'clinician' }),
      });
      if (!checkoutRes.ok) throw new Error();
      const { url } = await checkoutRes.json();
      setRedirecting(true);
      window.location.href = url;
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (redirecting) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-3">
        <Loader2 className="h-9 w-9 mx-auto animate-spin" style={{ color: '#1a3a3a' }} />
        <p className="text-sm font-medium" style={{ color: '#374151' }}>Redirecting to secure payment…</p>
        <p className="text-xs" style={{ color: '#9ca3af' }}>£99/month · Cancel any time</p>
      </div>
    </div>
  );

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: '#e5e7eb' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: '#a4d65e' }} />
      </div>

      <div className="flex flex-1">
        {/* ── Left: form ─────────────────────────────────────── */}
        <div className="flex flex-col w-full lg:w-[500px] xl:w-[540px] flex-shrink-0 bg-white px-8 sm:px-12 py-10 min-h-screen lg:min-h-0">
          {/* Logo — pinned top */}
          <div className="flex items-center gap-2 mb-auto pb-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: '#1a3a3a' }}>
              <Activity className="h-3.5 w-3.5" style={{ color: '#a4d65e' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#1a3a3a' }}>Meterbolic</span>
          </div>

          {/* Form — vertically centered */}
          <div className="flex-1 flex flex-col justify-center py-8">
          <div className="w-full max-w-sm mx-auto">

          {/* Step counter */}
          <p className="text-xs font-medium mb-3" style={{ color: '#9ca3af' }}>Step {step + 1} of {TOTAL}</p>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#111827' }}>{STEPS[step].title}</h1>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>{STEPS[step].subtitle}</p>

          {/* ── Inline OTP auth (shown instead of form when not signed in) ── */}
          {!token && (
            <div className="flex-1">
              {authScreen === 'email' ? (
                <form onSubmit={sendOtp} className="flex flex-col gap-4 max-w-sm">
                  <div>
                    <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
                      Create your account to continue your application. We'll send a verification code to your email.
                    </p>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email address</label>
                    <input
                      type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                      placeholder="you@example.com" autoFocus
                      className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                  {authError && <p className="text-xs" style={{ color: '#ef4444' }}>{authError}</p>}
                  <button type="submit" disabled={authLoading}
                    className="flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    style={{ background: '#1a3a3a', color: '#ffffff' }}>
                    {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send code <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOtp} className="flex flex-col gap-4 max-w-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full mb-1" style={{ background: '#f0fdf4' }}>
                    <Mail className="h-5 w-5" style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
                      Enter the 6-digit code sent to <span className="font-medium" style={{ color: '#111827' }}>{authEmail}</span>
                    </p>
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                      value={authOtp} onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000" autoFocus suppressHydrationWarning
                      className="w-full rounded-lg border px-3.5 py-3 text-2xl font-bold tracking-[0.4em] text-center outline-none transition-colors"
                      style={{ borderColor: '#e5e7eb', color: '#111827' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#a4d65e')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                  {authError && <p className="text-xs" style={{ color: '#ef4444' }}>{authError}</p>}
                  <button type="submit" disabled={authLoading || authOtp.length < 6}
                    className="flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    style={{ background: '#1a3a3a', color: '#ffffff' }}>
                    {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & continue <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <button type="button" onClick={() => { setAuthScreen('email'); setAuthOtp(''); setAuthError(''); }}
                    className="text-xs underline" style={{ color: '#9ca3af' }}>
                    ← Use a different email
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── Step content (only shown when signed in) ── */}
          {token && <><div className="flex-1 space-y-5">
            {step === 0 && (
              <>
                <div>
                  <Label text="Full name" required />
                  <input value={form.fullName} onChange={e => set('fullName', e.target.value)}
                    placeholder="Dr. Jane Smith" className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <Label text="Email" />
                  <input value={email} readOnly className={inputBase + ' opacity-50 cursor-not-allowed'} style={iS} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <Label text="Registration body" required />
                  <select value={form.profBody} onChange={e => set('profBody', e.target.value)}
                    className={inputBase + ' appearance-none'} style={{ ...iS, color: form.profBody ? '#111827' : '#9ca3af' }}
                    onFocus={onFocus} onBlur={onBlur}>
                    <option value="">Select your registration body…</option>
                    {PROF_BODIES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <Label text="Registration number" required />
                  <input value={form.regNumber} onChange={e => set('regNumber', e.target.value)}
                    placeholder="e.g. 1234567" className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </>
            )}

            {step === 2 && (
              <div>
                <Label text="Select your specialties" required />
                <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>Choose all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map(s => {
                    const active = form.specialties.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSpec(s)}
                        className="px-3 py-1.5 rounded-full text-xs transition-all font-medium"
                        style={{ background: active ? '#f0fdf4' : '#f9fafb', border: `1px solid ${active ? '#a4d65e' : '#e5e7eb'}`, color: active ? '#1a3a3a' : '#374151' }}>
                        {active && <Check className="inline h-3 w-3 mr-1" />}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label text="Clinic / practice name" required />
                  <input value={form.clinicName} onChange={e => set('clinicName', e.target.value)}
                    placeholder="The Metabolic Clinic" className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <Label text="Clinic address" />
                  <input value={form.clinicAddress} onChange={e => set('clinicAddress', e.target.value)}
                    placeholder="123 Medical St, London, W1A 1AA" className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div>
                  <Label text="Website (optional)" />
                  <input value={form.website} onChange={e => set('website', e.target.value)}
                    placeholder="https://yourclinic.co.uk" className={inputBase} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <Label text="Professional bio" required />
                  <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4}
                    placeholder="Tell patients about your background, approach, and specialisation…"
                    className={inputBase + ' resize-none'} style={iS} onFocus={onFocus} onBlur={onBlur} />
                  <p className="text-xs mt-1 text-right" style={{ color: form.bio.length >= 50 ? '#a4d65e' : '#9ca3af' }}>
                    {form.bio.length} / 50 min {form.bio.length >= 50 ? '✓' : ''}
                  </p>
                </div>
                <div>
                  <Label text="Why do you want to join Meterbolic?" required />
                  <textarea value={form.reasonForJoining} onChange={e => set('reasonForJoining', e.target.value)} rows={3}
                    placeholder="How do you plan to use the platform with your patients?"
                    className={inputBase + ' resize-none'} style={iS} onFocus={onFocus} onBlur={onBlur} />
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-lg px-4 py-3 flex items-start gap-2 text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => { setStep(s => s - 1); setError(''); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-colors hover:bg-gray-100"
                style={{ border: '1px solid #e5e7eb', color: '#374151' }}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button onClick={next} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#111827', color: '#ffffff' }}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : step === TOTAL - 1 ? <>Pay £99/month <ArrowRight className="h-4 w-4" /></> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>

          <p className="mt-4 text-xs" style={{ color: '#9ca3af' }}>
            {step === TOTAL - 1 ? 'Secure payment via Stripe. Cancel any time.' : `${TOTAL - step - 1} step${TOTAL - step - 1 !== 1 ? 's' : ''} remaining`}
          </p>
          </>}
          </div>{/* /max-w-sm */}
          </div>{/* /flex-1 centered */}
        </div>

        {/* ── Right panel ─────────────────────────────────────── */}
        <RightPanel />
      </div>
    </div>
  );
}
