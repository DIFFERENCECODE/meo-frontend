'use client';

/**
 * SignInPanel — the actual sign-in/sign-up UI, extracted out of
 * LandingPage.tsx (which keeps only the surrounding marketing shell: logo,
 * footer, right-side testimonial panel). Rebuilt as a mode state machine
 * mirroring meo-mobile's LoginScreen.tsx exactly, replacing the old
 * passwordless 6-digit email-code flow with real email/password auth plus
 * an Apple button alongside the existing Google one -- matching mobile's
 * sign-in methods one for one.
 *
 * Deliberately plain English, not wired through useTranslation(): this
 * pre-auth landing page has never had i18n coverage (see translations.ts's
 * own module doc -- "high-visibility chrome" only, "deep corners... still
 * read in English for now"), and partially wiring just this one new
 * component while every surrounding string on the same page (headings,
 * footer, testimonials) stays hardcoded English would be inconsistent.
 * The post-auth onboarding wizard, by contrast, DOES use useTranslation()
 * since it lives inside the already-i18n'd authenticated app shell.
 */
import React, { useState, FormEvent } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import {
  getGoogleLoginUrl,
  getAppleLoginUrl,
  registerAccount,
  confirmSignup,
  resendConfirmationCode,
  loginWithPassword,
  requestPasswordReset,
  confirmPasswordReset,
  AuthRequestError,
} from '@/app/lib/auth';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'confirmReset';

interface Props {
  onAuthenticated: (idToken: string, refreshToken: string) => void;
}

/** Maps raw Cognito exception names to a plain-English message -- same
 * substring-free, exact-match table meo-mobile's friendlyErrorKey() uses,
 * just returning literal strings here instead of i18n keys (see module
 * doc for why). */
function authErrorMessage(err: unknown): string {
  const code = err instanceof AuthRequestError ? err.code : undefined;
  const raw = err instanceof Error ? err.message : 'Something went wrong.';
  switch (code) {
    case 'NotAuthorizedException':
      return 'Incorrect email or password.';
    case 'UserNotFoundException':
      return "We couldn't find an account with that email.";
    case 'UserNotConfirmedException':
      return 'Please verify your email first — we just sent you a new code.';
    case 'UsernameExistsException':
      return 'An account with that email already exists.';
    case 'InvalidPasswordException':
      return 'Password must be at least 8 characters.';
    case 'CodeMismatchException':
      return 'That code is incorrect.';
    case 'ExpiredCodeException':
      return 'That code has expired — request a new one.';
    case 'LimitExceededException':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'InvalidParameterException':
      return 'Please check the details you entered.';
    case 'TooManyRequestsException':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return raw;
  }
}

const inputStyle: React.CSSProperties = { borderColor: '#d1d5db', color: '#111827', fontSize: '16px' };
const inputClass = 'w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors';
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '#a4d65e'),
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '#d1d5db'),
};

export default function SignInPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const resetTransientFields = () => {
    setCode('');
    setNewPassword('');
    setError('');
    setInfo('');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      const tokens = await loginWithPassword(trimmed, password);
      onAuthenticated(tokens.id_token, tokens.refresh_token || '');
    } catch (err) {
      if (err instanceof AuthRequestError && err.code === 'UserNotConfirmedException') {
        setMode('verify');
        setInfo('Please verify your email — we just sent you a new code.');
        try { await resendConfirmationCode(trimmed); } catch {}
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await registerAccount(trimmed, password, name.trim() || undefined);
      resetTransientFields();
      setInfo('Check your email for a 6-digit verification code.');
      setMode('verify');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    try {
      await confirmSignup(email.trim().toLowerCase(), code.trim());
      resetTransientFields();
      setInfo('Your email is verified — you can sign in now.');
      setMode('login');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendConfirmationCode(email.trim().toLowerCase());
      setInfo('A new code is on its way.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await requestPasswordReset(trimmed);
      resetTransientFields();
      setInfo('If an account exists for that email, a reset code is on its way.');
      setMode('confirmReset');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) { setError('Please enter the 6-digit code.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(email.trim().toLowerCase(), code.trim(), newPassword);
      resetTransientFields();
      setPassword('');
      setInfo('Password reset — you can sign in with your new password now.');
      setMode('login');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  return (
    <>
      {/* Social buttons — shown on login and register, matching mobile's
          LoginScreen (both social buttons on its default screen). */}
      {(mode === 'login' || mode === 'register') && (
        <>
          <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>
            {mode === 'login' ? 'Welcome to MeO' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            {mode === 'login' ? 'Sign in or create a free account to get started.' : 'Takes less than a minute.'}
          </p>

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
            <button
              onClick={() => { window.location.href = getAppleLoginUrl(); }}
              className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ border: '1px solid #000000', color: '#ffffff', background: '#000000' }}
            >
              <svg width="16" height="16" viewBox="0 0 384 512" fill="#ffffff">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
            <span className="text-xs" style={{ color: '#9ca3af' }}>or continue with email</span>
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
          </div>
        </>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            autoComplete="email"
            className={inputClass}
            style={inputStyle}
            {...focusHandlers}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className={inputClass}
            style={inputStyle}
            {...focusHandlers}
          />
          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          {info && <p className="text-xs" style={{ color: '#16a34a' }}>{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: '#1a3a3a', color: '#ffffff' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
          <div className="flex items-center justify-between text-xs mt-1" style={{ color: '#6b7280' }}>
            <button type="button" onClick={() => switchMode('forgot')} className="underline hover:text-gray-600">Forgot password?</button>
            <button type="button" onClick={() => switchMode('register')} className="underline hover:text-gray-600">Create account</button>
          </div>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            autoComplete="email"
            className={inputClass}
            style={inputStyle}
            {...focusHandlers}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            autoComplete="name"
            className={inputClass}
            style={inputStyle}
            {...focusHandlers}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min. 8 characters)"
            autoComplete="new-password"
            className={inputClass}
            style={inputStyle}
            {...focusHandlers}
          />
          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          {info && <p className="text-xs" style={{ color: '#16a34a' }}>{info}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: '#1a3a3a', color: '#ffffff' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-xs text-center mt-1" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('login')} className="underline hover:text-gray-600">Sign in</button>
          </p>
        </form>
      )}

      {mode === 'verify' && (
        <>
          <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>Check your email</h1>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            We sent a 6-digit code to <span className="font-medium" style={{ color: '#111827' }}>{email}</span>
          </p>
          <form onSubmit={handleVerify} className="mt-8 flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              suppressHydrationWarning
              className="w-full rounded-lg border px-3.5 py-3 text-2xl font-bold tracking-[0.4em] text-center outline-none transition-colors"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              {...focusHandlers}
            />
            {error && <p className="text-xs text-center" style={{ color: '#ef4444' }}>{error}</p>}
            {info && <p className="text-xs text-center" style={{ color: '#16a34a' }}>{info}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: '#1a3a3a', color: '#ffffff' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify email <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-4 text-xs text-center" style={{ color: '#9ca3af' }}>
            Didn&apos;t receive it?{' '}
            <button onClick={handleResend} className="underline hover:text-gray-600" style={{ color: '#6b7280' }}>Resend code</button>
          </p>
        </>
      )}

      {mode === 'forgot' && (
        <>
          <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>Reset your password</h1>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>Enter your email and we&apos;ll send a reset code.</p>
          <form onSubmit={handleForgot} className="mt-8 flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              autoComplete="email"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
            {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
            {info && <p className="text-xs" style={{ color: '#16a34a' }}>{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: '#1a3a3a', color: '#ffffff' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send reset code <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
          <p className="mt-4 text-xs text-center" style={{ color: '#9ca3af' }}>
            <button onClick={() => switchMode('login')} className="underline hover:text-gray-600" style={{ color: '#6b7280' }}>Back to sign in</button>
          </p>
        </>
      )}

      {mode === 'confirmReset' && (
        <>
          <h1 className="text-[1.75rem] font-bold leading-tight" style={{ color: '#111827' }}>Enter your reset code</h1>
          <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
            Sent to <span className="font-medium" style={{ color: '#111827' }}>{email}</span>
          </p>
          <form onSubmit={handleConfirmReset} className="mt-8 flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              suppressHydrationWarning
              className="w-full rounded-lg border px-3.5 py-3 text-2xl font-bold tracking-[0.4em] text-center outline-none transition-colors"
              style={{ borderColor: '#d1d5db', color: '#111827' }}
              {...focusHandlers}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
            {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
            {info && <p className="text-xs" style={{ color: '#16a34a' }}>{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ background: '#1a3a3a', color: '#ffffff' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Reset password <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </>
      )}

      {mode === 'login' && (
        <p className="mt-5 text-xs text-center" style={{ color: '#9ca3af' }}>
          Are you a clinician?{' '}
          <a href="/register/clinician" className="underline hover:text-gray-600" style={{ color: '#6b7280' }}>
            Register your practice
          </a>
        </p>
      )}
    </>
  );
}
