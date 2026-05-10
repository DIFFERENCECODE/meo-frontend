'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, Stethoscope, AlertCircle, LogIn, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { getIdToken, getEmailFromIdToken, getLoginUrl, apiFetch } from '@/app/lib/auth';

// ─── Constants ─────────────────────────────────────────────────────────────

const PROF_BODIES = [
  'GMC (General Medical Council)',
  'GPhC (General Pharmaceutical Council)',
  'HCPC (Health and Care Professions Council)',
  'NMC (Nursing and Midwifery Council)',
  'BANT (British Association for Nutrition and Lifestyle Medicine)',
  'ANutr / RNutr (Association for Nutrition)',
  'CNHC (Complementary and Natural Healthcare Council)',
  'BDA (British Dietetic Association)',
  'IFMCP (Institute for Functional Medicine)',
  'BPS (British Psychological Society)',
  'BACP (British Association for Counselling and Psychotherapy)',
  'Other',
];

const SPECIALTIES = [
  'Metabolic Health', 'Insulin Resistance / Type 2 Diabetes', 'Cardiovascular Health',
  'Weight Management', 'Hormonal Health / PCOS', 'Gut Health & Microbiome',
  'Mental Health & Psychiatry', 'Longevity & Anti-ageing', 'Sports & Exercise Medicine',
  'Functional Medicine', 'Nutritional Therapy', 'Lifestyle Medicine',
  'Endocrinology', 'Neurology / Cognitive Health', 'Oncology', 'Other',
];

// ─── Form ──────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  profBody: string;
  regNumber: string;
  specialties: string[];
  clinicName: string;
  clinicAddress: string;
  bio: string;
  reasonForJoining: string;
  website: string;
}

const EMPTY: FormData = {
  fullName: '', profBody: '', regNumber: '', specialties: [],
  clinicName: '', clinicAddress: '', bio: '', reasonForJoining: '', website: '',
};

function inputStyle(colors: any) {
  return {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '16px',
  };
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#a4d65e' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{hint}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ClinicianRegisterPage() {
  const { colors, theme } = useTheme();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const t = getIdToken();
    setToken(t);
    if (t) {
      const e = getEmailFromIdToken(t);
      if (e) setEmail(e);
    }
  }, []);

  const set = (k: keyof FormData, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const toggleSpecialty = (s: string) => {
    set('specialties', form.specialties.includes(s)
      ? form.specialties.filter((x) => x !== s)
      : [...form.specialties, s]);
  };

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'Please enter your full name.';
    if (!form.profBody) return 'Please select your professional registration body.';
    if (!form.regNumber.trim()) return 'Please enter your registration number.';
    if (form.specialties.length === 0) return 'Please select at least one specialty.';
    if (!form.clinicName.trim()) return 'Please enter your clinic or practice name.';
    if (!form.bio.trim() || form.bio.trim().length < 50) return 'Please provide a professional bio (at least 50 characters).';
    if (!form.reasonForJoining.trim()) return 'Please tell us why you want to join Meterbolic.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!token) { setError('Please sign in before submitting your application.'); return; }

    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName,
          role: 'clinician_pending',
          clinician_application: {
            ...form,
            email,
            submittedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error('Profile update failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const bg = `linear-gradient(180deg, ${colors.backgroundGradientStart} 0%, ${colors.backgroundGradientMid} 40%, ${colors.backgroundGradientEnd} 100%)`;
  const iStyle = inputStyle(colors);

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: bg }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-2xl p-8 text-center space-y-5"
          style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full mx-auto" style={{ background: `${colors.primary}20` }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: colors.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.foreground }}>Application Submitted</h1>
            <p className="text-sm mt-2" style={{ color: colors.muted }}>
              Thank you, {form.fullName.split(' ')[0]}. We'll review your application and get back to you within 1–2 business days.
            </p>
          </div>
          <div className="rounded-xl p-4 text-left space-y-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-semibold" style={{ color: colors.muted }}>What happens next</p>
            {['Our team reviews your credentials', 'You receive an approval email', 'You gain access to the Clinician Portal'].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span className="flex-shrink-0 font-bold mt-0.5" style={{ color: colors.primary }}>{i + 1}.</span>
                {s}
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: colors.primary, color: colors.primaryForeground }}
          >
            Return to MeO
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 sm:px-6"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" style={{ color: colors.primary }} />
          <span className="text-base font-bold" style={{ color: colors.foreground }}>{theme.header}</span>
        </div>
        <button onClick={() => router.push('/')} className="text-xs" style={{ color: colors.muted }}>
          Back to app
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-4 sm:px-6">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Hero */}
          <div className="text-center py-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-3" style={{ background: `${colors.primary}18` }}>
              <Stethoscope className="h-7 w-7" style={{ color: colors.primary }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: colors.foreground }}>Register as a Clinician</h1>
            <p className="text-sm mt-1.5 max-w-sm mx-auto" style={{ color: colors.muted }}>
              Join the Meterbolic clinical network. Access patient metabolic data, manage bookings, and offer your services through the platform.
            </p>
          </div>

          {/* Not signed in banner */}
          {!token && (
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Sign in required</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  You need a Meterbolic account to submit your application.
                </p>
              </div>
              <button
                onClick={() => { if (typeof window !== 'undefined') window.location.href = getLoginUrl(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: '#f59e0b', color: '#1a1a1a' }}
              >
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </button>
            </div>
          )}

          {/* Form card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.cardBorder}` }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: colors.cardBorder }}>
              <h2 className="text-sm font-semibold" style={{ color: colors.foreground }}>Professional Details</h2>
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>All starred fields are required.</p>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Name + email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <input value={form.fullName} onChange={(e) => set('fullName', e.target.value)}
                    placeholder="Dr. Jane Smith" className="w-full px-3 py-3 rounded-lg outline-none" style={iStyle} />
                </Field>
                <Field label="Email">
                  <input value={email} readOnly
                    placeholder={token ? email : 'Sign in to pre-fill'}
                    className="w-full px-3 py-3 rounded-lg outline-none opacity-60 cursor-not-allowed" style={iStyle} />
                </Field>
              </div>

              {/* Professional body + reg number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Registration Body" required>
                  <select value={form.profBody} onChange={(e) => set('profBody', e.target.value)}
                    className="w-full px-3 py-3 rounded-lg outline-none appearance-none"
                    style={{ ...iStyle, color: form.profBody ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                    <option value="">Select…</option>
                    {PROF_BODIES.map((b) => <option key={b} value={b} style={{ background: '#1a3a3a' }}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Registration Number" required>
                  <input value={form.regNumber} onChange={(e) => set('regNumber', e.target.value)}
                    placeholder="e.g. 1234567" className="w-full px-3 py-3 rounded-lg outline-none" style={iStyle} />
                </Field>
              </div>

              {/* Specialties */}
              <Field label="Specialties" required hint="Select all that apply">
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => {
                    const active = form.specialties.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                        className="px-3 py-1.5 rounded-full text-sm transition-all"
                        style={{
                          background: active ? `${colors.primary}20` : 'rgba(255,255,255,0.07)',
                          border: `1px solid ${active ? `${colors.primary}60` : 'rgba(255,255,255,0.15)'}`,
                          color: active ? colors.primary : 'rgba(255,255,255,0.65)',
                        }}>
                        {active && <Check className="inline h-3 w-3 mr-1" />}{s}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Clinic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Clinic / Practice Name" required>
                  <input value={form.clinicName} onChange={(e) => set('clinicName', e.target.value)}
                    placeholder="e.g. The Metabolic Clinic" className="w-full px-3 py-3 rounded-lg outline-none" style={iStyle} />
                </Field>
                <Field label="Website (optional)">
                  <input value={form.website} onChange={(e) => set('website', e.target.value)}
                    placeholder="https://yourclinic.co.uk" className="w-full px-3 py-3 rounded-lg outline-none" style={iStyle} />
                </Field>
              </div>

              <Field label="Clinic Address">
                <input value={form.clinicAddress} onChange={(e) => set('clinicAddress', e.target.value)}
                  placeholder="123 Medical Street, London, W1A 1AA" className="w-full px-3 py-3 rounded-lg outline-none" style={iStyle} />
              </Field>

              <Field label="Professional Bio" required hint="Minimum 50 characters. This will be shown to patients on your profile.">
                <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={4} resize-none
                  placeholder="Tell us about your clinical background, approach, and what you specialise in…"
                  className="w-full px-3 py-3 rounded-lg outline-none resize-none" style={iStyle} />
                <p className="text-right text-xs" style={{ color: form.bio.length >= 50 ? colors.primary : colors.muted }}>
                  {form.bio.length} chars {form.bio.length >= 50 ? '✓' : `(${50 - form.bio.length} more needed)`}
                </p>
              </Field>

              <Field label="Why do you want to join Meterbolic?" required>
                <textarea value={form.reasonForJoining} onChange={(e) => set('reasonForJoining', e.target.value)} rows={3}
                  placeholder="How do you plan to use the platform with your patients?"
                  className="w-full px-3 py-3 rounded-lg outline-none resize-none" style={iStyle} />
              </Field>

              {error && (
                <div className="px-4 py-3 rounded-lg text-sm flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 pb-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || !token}
                className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: token ? colors.primary : 'rgba(255,255,255,0.1)',
                  color: token ? colors.primaryForeground : colors.muted,
                  opacity: submitting ? 0.7 : 1,
                  cursor: !token ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : <><ChevronRight className="h-4 w-4" /> Submit Application</>}
              </button>
              <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                By submitting you agree to our Terms of Service and confirm your credentials are accurate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
